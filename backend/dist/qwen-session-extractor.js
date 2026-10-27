import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { sessionsStore } from "./data.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Extracts Qwen desktop master key using Windows DPAPI.
 */
function decryptMasterKey(encKeyB64) {
    const psCode = [
        `Add-Type -AssemblyName System.Security`,
        `$b = [System.Convert]::FromBase64String('${encKeyB64}')`,
        `$dp = $b[5..($b.Length - 1)]`,
        `$k = [System.Security.Cryptography.ProtectedData]::Unprotect($dp, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)`,
        `[System.BitConverter]::ToString($k) -replace '-',''`,
    ].join("; ");
    const hex = execSync(`powershell -NoProfile -Command "${psCode}"`, {
        encoding: "utf-8",
        timeout: 5000,
    }).trim();
    return Buffer.from(hex, "hex");
}
/**
 * Decrypts Chromium v10 / v11 AES-256-GCM encrypted value.
 */
function decryptCookieBlob(encBuf, masterKey) {
    if (!encBuf || encBuf.length < 31)
        return "";
    const prefix = encBuf.slice(0, 3).toString("utf-8");
    if (prefix !== "v10" && prefix !== "v11") {
        return encBuf.toString("utf-8");
    }
    const iv = encBuf.slice(3, 15);
    const tag = encBuf.slice(encBuf.length - 16);
    const ciphertext = encBuf.slice(15, encBuf.length - 16);
    try {
        const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
        decipher.setAuthTag(tag);
        let dec = decipher.update(ciphertext, undefined, "utf-8");
        dec += decipher.final("utf-8");
        return dec;
    }
    catch {
        return "";
    }
}
/**
 * Extracts all active Qwen Desktop credentials, tokens, cookies, and conversation sessions.
 */
export async function extractLocalQwenSession() {
    const appData = process.env.APPDATA ||
        path.join(process.env.USERPROFILE || "C:\\Users\\robyk", "AppData", "Roaming");
    const qwenDir = path.join(appData, "Qwen");
    if (!fs.existsSync(qwenDir)) {
        throw new Error(`Direktori data Qwen tidak ditemukan di ${qwenDir}. Pastikan Qwen Desktop terpasang.`);
    }
    // 1. Decrypt Master Key
    const localStateFile = path.join(qwenDir, "Local State");
    if (!fs.existsSync(localStateFile)) {
        throw new Error("Berkas 'Local State' Qwen tidak ditemukan.");
    }
    const localState = JSON.parse(fs.readFileSync(localStateFile, "utf-8"));
    const encKeyB64 = localState.os_crypt?.encrypted_key;
    if (!encKeyB64) {
        throw new Error("Kunci enkripsi 'os_crypt' tidak ditemukan di Local State.");
    }
    const masterKey = decryptMasterKey(encKeyB64);
    // 2. Scan LevelDB for latest access_token state
    const ldbDir = path.join(qwenDir, "Local Storage", "leveldb");
    let latestToken = "";
    let latestUserId = "";
    let latestDeviceId = "";
    let maxExp = 0;
    if (fs.existsSync(ldbDir)) {
        const files = fs.readdirSync(ldbDir);
        for (const f of files) {
            if (f.endsWith(".ldb") || f.endsWith(".log")) {
                try {
                    const buf = fs.readFileSync(path.join(ldbDir, f));
                    const str = buf.toString("latin1");
                    const matches = str.match(/eyJ[a-zA-Z0-9_\-\.]{30,}/g) || [];
                    for (const t of matches) {
                        try {
                            const payload = JSON.parse(Buffer.from(t.split(".")[1], "base64").toString("utf-8"));
                            if (payload.type === "access_token" && payload.exp > maxExp) {
                                maxExp = payload.exp;
                                latestToken = t;
                                if (payload.id)
                                    latestUserId = payload.id;
                            }
                        }
                        catch { }
                    }
                    // Check deviceId and stateId in _access_token_state
                    const stateIdx = str.indexOf("_access_token_state");
                    if (stateIdx !== -1) {
                        const sub = str.slice(stateIdx, stateIdx + 600);
                        const devMatch = sub.match(/deviceId["']?\s*:\s*["']([a-f0-9\-]+)["']/i);
                        if (devMatch)
                            latestDeviceId = devMatch[1];
                    }
                }
                catch { }
            }
        }
    }
    // 3. Extract SQLite Cookies
    const cookiesPath = path.join(qwenDir, "Network", "Cookies");
    let refreshToken = "";
    let cookieHeader = "";
    const tmpDb = path.join(__dirname, "..", "tmp_cookies_extract.sqlite");
    try {
        const psCopy = [
            `try {`,
            `  $src = '${cookiesPath.replace(/\\/g, "\\\\")}'`,
            `  $dst = '${tmpDb.replace(/\\/g, "\\\\")}'`,
            `  if (Test-Path $src) {`,
            `    $in = [System.IO.FileStream]::new($src, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)`,
            `    $out = [System.IO.FileStream]::new($dst, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)`,
            `    $in.CopyTo($out)`,
            `    $in.Close()`,
            `    $out.Close()`,
            `  }`,
            `} catch {}`,
        ].join("; ");
        execSync(`powershell -NoProfile -Command "${psCopy}"`, { timeout: 3000, stdio: "ignore" });
        if (fs.existsSync(tmpDb)) {
            const db = new DatabaseSync(tmpDb, { open: true, readOnly: true });
            const rows = db
                .prepare("SELECT host_key, name, value, encrypted_value FROM cookies")
                .all();
            const cookieList = [];
            for (const r of rows) {
                let val = r.value;
                if (!val && r.encrypted_value) {
                    val = decryptCookieBlob(r.encrypted_value, masterKey);
                }
                if (r.name === "refresh_token")
                    refreshToken = val;
                if ((r.name === "aui" || r.name === "cnaui") && !latestUserId) {
                    latestUserId = val;
                }
                if (val)
                    cookieList.push(`${r.name}=${val}`);
            }
            cookieHeader = cookieList.join("; ");
            db.close();
            try {
                fs.unlinkSync(tmpDb);
            }
            catch { }
        }
    }
    catch {
        if (fs.existsSync(tmpDb)) {
            try {
                fs.unlinkSync(tmpDb);
            }
            catch { }
        }
    }
    // 4. Fallback to existing session values if SQLite was temporarily quiescent
    if (!refreshToken)
        refreshToken = process.env.QWEN_REFRESH_TOKEN || config.session.refreshToken || "";
    if (!cookieHeader)
        cookieHeader = process.env.QWEN_COOKIE_HEADER || config.session.cookieHeader || "";
    if (!latestUserId)
        latestUserId = process.env.QWEN_USER_ID || config.session.userId || "6d9330ea-83f2-4a69-af62-34c88c685ffd";
    if (!latestDeviceId)
        latestDeviceId = process.env.QWEN_DEVICE_ID || config.session.deviceId || "949077aa-a483-4d5d-ba50-808d496e3b38";
    // Update in-memory config
    if (latestToken)
        config.session.accessToken = latestToken;
    if (refreshToken)
        config.session.refreshToken = refreshToken;
    if (latestUserId)
        config.session.userId = latestUserId;
    if (latestDeviceId)
        config.session.deviceId = latestDeviceId;
    if (cookieHeader)
        config.session.cookieHeader = cookieHeader;
    config.session.hasSession = Boolean(latestToken || refreshToken);
    // 5. Update .env file persistently
    const envPath = path.resolve(__dirname, "..", ".env");
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf-8");
        if (latestToken) {
            envContent = envContent.replace(/QWEN_ACCESS_TOKEN=.*/g, `QWEN_ACCESS_TOKEN=${latestToken}`);
        }
        if (refreshToken) {
            envContent = envContent.replace(/QWEN_REFRESH_TOKEN=.*/g, `QWEN_REFRESH_TOKEN=${refreshToken}`);
        }
        if (latestUserId) {
            envContent = envContent.replace(/QWEN_USER_ID=.*/g, `QWEN_USER_ID=${latestUserId}`);
        }
        if (latestDeviceId) {
            envContent = envContent.replace(/QWEN_DEVICE_ID=.*/g, `QWEN_DEVICE_ID=${latestDeviceId}`);
        }
        if (cookieHeader) {
            envContent = envContent.replace(/QWEN_COOKIE_HEADER=.*/g, `QWEN_COOKIE_HEADER="${cookieHeader.replace(/"/g, '\\"')}"`);
        }
        fs.writeFileSync(envPath, envContent, "utf-8");
    }
    // 6. Sync live conversation history from chat.qwen.ai
    let syncedSessionsCount = sessionsStore.length;
    if (latestToken) {
        try {
            const listRes = await fetch("https://chat.qwen.ai/api/v2/chats", {
                headers: {
                    Authorization: `Bearer ${latestToken}`,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AliDesktop(QWENCHAT/1.0.3)",
                },
            });
            if (listRes.ok) {
                const listData = await listRes.json();
                if (Array.isArray(listData.data)) {
                    const freshSessions = [];
                    for (const item of listData.data) {
                        freshSessions.push({
                            id: item.id,
                            title: item.title,
                            timestamp: new Date(item.created_at * 1000).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                            }),
                            period: "Today",
                            model: item.models ? item.models[0] : config.model.default,
                            messages: [],
                        });
                    }
                    if (freshSessions.length > 0) {
                        sessionsStore.length = 0;
                        sessionsStore.push(...freshSessions);
                        syncedSessionsCount = freshSessions.length;
                        const syncFile = path.resolve(__dirname, "qwen-synced-sessions.json");
                        fs.writeFileSync(syncFile, JSON.stringify(freshSessions, null, 2), "utf-8");
                    }
                }
            }
        }
        catch { }
    }
    const expDate = maxExp > 0 ? new Date(maxExp * 1000).toLocaleString("id-ID") : "30 Hari";
    const masterKeyHex = masterKey.toString("hex").toUpperCase();
    const cnaMatch = cookieHeader.match(/cna=([^;]+)/);
    const cna = cnaMatch ? cnaMatch[1] : (process.env.QWEN_CNA || "Zn8LI2yamGwCAZ6MuZof1m4z");
    const envFormat = [
        `# Sesi Resmi Qwen Desktop (Diekstrak Otomatis)`,
        `QWEN_USER_ID=${latestUserId}`,
        `QWEN_DEVICE_ID=${latestDeviceId}`,
        `QWEN_CNA=${cna}`,
        `QWEN_ACCESS_TOKEN=${latestToken}`,
        `QWEN_REFRESH_TOKEN=${refreshToken}`,
        `QWEN_MASTER_KEY_HEX=${masterKeyHex}`,
        `QWEN_COOKIE_HEADER="${cookieHeader.replace(/"/g, '\\"')}"`,
    ].join("\n");
    return {
        success: true,
        userId: latestUserId,
        deviceId: latestDeviceId,
        hasAccessToken: Boolean(latestToken),
        hasRefreshToken: Boolean(refreshToken),
        accessToken: latestToken,
        refreshToken,
        cookieHeader,
        masterKeyHex,
        cna,
        accessTokenSnippet: latestToken ? `${latestToken.slice(0, 15)}...${latestToken.slice(-10)}` : "",
        refreshTokenSnippet: refreshToken ? `${refreshToken.slice(0, 15)}...${refreshToken.slice(-10)}` : "",
        expiresAtFormatted: expDate,
        syncedSessionsCount,
        envFormat,
        message: "Sesi Qwen Desktop berhasil diekstrak dan disimpan ke .env!",
    };
}
