import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { AVAILABLE_MODELS, sessionsStore } from "./data.js";
import { chatWithQwen, streamChatWithQwen, getQwenBridgeDiagnostic, launchQwenDesktopWithCDP } from "./qwen-engine.js";
import { extractLocalQwenSession } from "./qwen-session-extractor.js";
import { getOpenAIModelsList, handleOpenAIChatCompletion, renderBridgeDashboardHTML } from "./qwen-bridge.js";
// Process error safety guards to prevent unexpected service termination
process.on("unhandledRejection", (reason, promise) => {
    console.warn("⚠️ Unhandled Promise Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
    console.error("⚠️ Uncaught Exception:", error);
});
function extractCodeSnippets(text) {
    const snippets = [];
    const codeBlockRegex = /```([a-zA-Z0-9_\-\.]*)\n([\s\S]*?)```/g;
    let match;
    let index = 1;
    while ((match = codeBlockRegex.exec(text)) !== null) {
        const lang = match[1] || "text";
        const code = match[2].trim();
        const ext = lang === "typescript" || lang === "ts"
            ? "ts"
            : lang === "javascript" || lang === "js"
                ? "js"
                : lang === "json"
                    ? "json"
                    : lang === "python" || lang === "py"
                        ? "py"
                        : lang === "tsx"
                            ? "tsx"
                            : lang === "jsx"
                                ? "jsx"
                                : lang === "html"
                                    ? "html"
                                    : lang === "css"
                                        ? "css"
                                        : "txt";
        snippets.push({
            language: lang,
            filename: `snippet-${index}.${ext}`,
            code,
        });
        index++;
    }
    return snippets.length > 0 ? snippets : undefined;
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = config.port;
// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext);
        cb(null, `${base}-${Date.now()}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});
// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadDir));
// 1. Health check & Welcome (Interactive Bridge Dashboard or JSON)
app.get("/", (req, res) => {
    if (req.accepts("html") && !req.xhr && !req.path.endsWith(".json")) {
        const hostUrl = `${req.protocol}://${req.get("host") || "localhost:" + PORT}`;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(renderBridgeDashboardHTML(hostUrl));
        return;
    }
    res.json({
        status: "ok",
        app: "Qwen Local Bridge Server & Web-Chats Backend",
        version: "1.0.4",
        openAiCompatibleBaseUrl: `http://localhost:${PORT}/v1`,
        endpoints: {
            openAiChatCompletions: "/v1/chat/completions",
            openAiModels: "/v1/models",
            bridgeStatus: "/api/bridge/status",
            bridgeLaunch: "/api/bridge/launch",
            bridgeDashboard: "/bridge",
            sessions: "/api/chat/sessions",
            completions: "/api/chat/completions",
            stream: "/api/chat/stream",
            models: "/api/chat/models",
            upload: "/api/chat/upload",
            config: "/api/config",
        },
    });
});
// Dedicated Bridge Dashboard Route
app.get("/bridge", (req, res) => {
    const hostUrl = `${req.protocol}://${req.get("host") || "localhost:" + PORT}`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderBridgeDashboardHTML(hostUrl));
});
// ============================================================================
// OPENAI-COMPATIBLE LOCAL BRIDGE API ENDPOINTS
// ============================================================================
// 1. OpenAI Models list (/v1/models and /models)
app.get(["/v1/models", "/models"], (_req, res) => {
    res.json(getOpenAIModelsList());
});
// 2. OpenAI Model detail (/v1/models/:model and /models/:model)
app.get(["/v1/models/:model", "/models/:model"], (req, res) => {
    const modelId = String(req.params.model);
    const list = getOpenAIModelsList();
    const found = list.data.find((m) => m.id === modelId || m.id.toLowerCase() === modelId.toLowerCase());
    if (!found) {
        res.status(404).json({
            error: {
                message: `Model '${modelId}' does not exist`,
                type: "invalid_request_error",
                param: "model",
                code: "model_not_found",
            },
        });
        return;
    }
    res.json(found);
});
// 3. OpenAI Chat Completions (/v1/chat/completions and /chat/completions)
app.post(["/v1/chat/completions", "/chat/completions"], async (req, res) => {
    await handleOpenAIChatCompletion(req, res);
});
// 4. Bridge Diagnostics & Status
app.get("/api/bridge/status", async (_req, res) => {
    try {
        const diagnostic = await getQwenBridgeDiagnostic();
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...diagnostic,
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : String(err),
        });
    }
});
// 5. Bridge Launch Qwen Desktop
app.post("/api/bridge/launch", async (_req, res) => {
    try {
        const launched = await launchQwenDesktopWithCDP();
        res.json({
            success: launched,
            message: launched
                ? "Qwen Desktop berhasil diluncurkan dengan flag --remote-debugging-port=9222!"
                : "Gagal meluncurkan Qwen Desktop. Pastikan Qwen.exe terpasang di komputer.",
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : String(err),
        });
    }
});
// 1b. Centralized Configuration Inspection
app.get("/api/config", (_req, res) => {
    res.json({
        success: true,
        data: {
            server: {
                name: "Qwen Web-Chats Backend",
                port: config.port,
                nodeEnv: config.nodeEnv,
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                uptimeSeconds: Math.floor(process.uptime()),
            },
            qwenApp: config.localQwenApp,
            endpoints: {
                ...config.endpoints,
                completions: `http://localhost:${config.port}/api/chat/completions`,
                stream: `http://localhost:${config.port}/api/chat/stream`,
                sessions: `http://localhost:${config.port}/api/chat/sessions`,
                models: `http://localhost:${config.port}/api/chat/models`,
                upload: `http://localhost:${config.port}/api/chat/upload`,
            },
            hasApiKey: Boolean(config.apiKey),
            apiKeySnippet: config.apiKey
                ? `${config.apiKey.slice(0, 7)}...${config.apiKey.slice(-4)}`
                : "",
            session: {
                hasSession: config.session.hasSession,
                userId: config.session.userId,
                deviceId: config.session.deviceId,
                hasAccessToken: Boolean(config.session.accessToken),
                accessToken: config.session.accessToken,
                accessTokenSnippet: config.session.accessToken
                    ? `${config.session.accessToken.slice(0, 15)}...${config.session.accessToken.slice(-10)}`
                    : "",
                hasRefreshToken: Boolean(config.session.refreshToken),
                refreshToken: config.session.refreshToken,
                refreshTokenSnippet: config.session.refreshToken
                    ? `${config.session.refreshToken.slice(0, 15)}...${config.session.refreshToken.slice(-10)}`
                    : "",
                cookieHeader: config.session.cookieHeader,
                cna: process.env.QWEN_CNA || "Zn8LI2yamGwCAZ6MuZof1m4z",
                masterKeyHex: process.env.QWEN_MASTER_KEY_HEX || "",
                totalSyncedSessions: sessionsStore.length,
            },
            model: config.model,
            availableModels: AVAILABLE_MODELS,
        },
    });
});
// 1c. Import Qwen Session from external browser / token
app.post("/api/session/import", async (req, res) => {
    const { accessToken, refreshToken, cookies, sync = true } = req.body;
    if (!accessToken && !refreshToken && !cookies) {
        res.status(400).json({
            success: false,
            message: "Harap masukkan 'accessToken', 'refreshToken', atau 'cookies' dari browser.",
        });
        return;
    }
    let finalAccessToken = (accessToken || "").trim();
    let finalRefreshToken = (refreshToken || "").trim();
    let finalCookies = (cookies || "").trim();
    let extractedUserId = "";
    // Parse raw cookies if provided
    if (finalCookies) {
        const parts = finalCookies.split(";").map((p) => p.trim());
        for (const part of parts) {
            const [k, ...vParts] = part.split("=");
            const v = vParts.join("=");
            if (k === "refresh_token" && !finalRefreshToken)
                finalRefreshToken = v;
            if ((k === "aui" || k === "cnaui") && !extractedUserId)
                extractedUserId = v;
        }
    }
    // Parse access token payload if available
    if (finalAccessToken && finalAccessToken.includes(".")) {
        try {
            const payload = JSON.parse(Buffer.from(finalAccessToken.split(".")[1], "base64").toString("utf-8"));
            if (payload.id && !extractedUserId)
                extractedUserId = payload.id;
        }
        catch { }
    }
    // Update in-memory config
    if (finalAccessToken)
        config.session.accessToken = finalAccessToken;
    if (finalRefreshToken)
        config.session.refreshToken = finalRefreshToken;
    if (extractedUserId)
        config.session.userId = extractedUserId;
    if (finalCookies)
        config.session.cookieHeader = finalCookies;
    config.session.hasSession = Boolean(finalAccessToken || finalRefreshToken);
    // Update .env file persistently
    const envPath = path.resolve(__dirname, "..", ".env");
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf-8");
        if (finalAccessToken) {
            envContent = envContent.replace(/QWEN_ACCESS_TOKEN=.*/g, `QWEN_ACCESS_TOKEN=${finalAccessToken}`);
        }
        if (finalRefreshToken) {
            envContent = envContent.replace(/QWEN_REFRESH_TOKEN=.*/g, `QWEN_REFRESH_TOKEN=${finalRefreshToken}`);
        }
        if (extractedUserId) {
            envContent = envContent.replace(/QWEN_USER_ID=.*/g, `QWEN_USER_ID=${extractedUserId}`);
        }
        if (finalCookies) {
            envContent = envContent.replace(/QWEN_COOKIE_HEADER=.*/g, `QWEN_COOKIE_HEADER="${finalCookies.replace(/"/g, '\\"')}"`);
        }
        fs.writeFileSync(envPath, envContent, "utf-8");
    }
    // Optionally sync real conversation history from chat.qwen.ai
    let syncedCount = 0;
    if (sync && finalAccessToken) {
        try {
            const listRes = await fetch("https://chat.qwen.ai/api/v2/chats", {
                headers: {
                    Authorization: `Bearer ${finalAccessToken}`,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AliDesktop(QWENCHAT/1.0.3)",
                },
            });
            if (listRes.ok) {
                const listData = await listRes.json();
                if (Array.isArray(listData.data)) {
                    const freshSessions = [];
                    for (const item of listData.data.slice(0, 15)) {
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
                        syncedCount = freshSessions.length;
                        const syncFile = path.resolve(__dirname, "qwen-synced-sessions.json");
                        fs.writeFileSync(syncFile, JSON.stringify(freshSessions, null, 2), "utf-8");
                    }
                }
            }
        }
        catch (err) {
            console.warn("Sync chats error during import:", err);
        }
    }
    res.json({
        success: true,
        message: "Sesi Qwen berhasil diimpor dan disimpan ke .env",
        data: {
            userId: config.session.userId,
            hasAccessToken: Boolean(config.session.accessToken),
            hasRefreshToken: Boolean(config.session.refreshToken),
            syncedSessionsCount: syncedCount || sessionsStore.length,
        },
    });
});
// 1d. Extract Qwen Session automatically from local desktop app
app.post("/api/session/extract-local", async (_req, res) => {
    try {
        const result = await extractLocalQwenSession();
        res.json(result);
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("Extract local session error:", errorMsg);
        res.status(500).json({
            success: false,
            message: `Gagal mengekstrak sesi Qwen lokal: ${errorMsg}`,
        });
    }
});
// 2. Get Available AI Models
app.get("/api/chat/models", (_req, res) => {
    res.json({
        success: true,
        data: AVAILABLE_MODELS,
    });
});
// 3. Get All Chat Sessions
app.get("/api/chat/sessions", (req, res) => {
    const { search, period } = req.query;
    let filtered = [...sessionsStore];
    if (typeof search === "string" && search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter((s) => s.title.toLowerCase().includes(q));
    }
    if (typeof period === "string" && period.trim()) {
        filtered = filtered.filter((s) => s.period === period);
    }
    res.json({
        success: true,
        count: filtered.length,
        data: filtered,
    });
});
// 4. Create New Session
app.post("/api/chat/sessions", (req, res) => {
    const { title = "Percakapan Baru Qwen", model = config.model.default } = req.body;
    const newSession = {
        id: `session-${Date.now()}`,
        title,
        timestamp: "Baru saja",
        period: "Today",
        model,
        messages: [],
    };
    sessionsStore.unshift(newSession);
    res.status(201).json({
        success: true,
        message: "Sesi percakapan Qwen berhasil dibuat",
        data: newSession,
    });
});
// 5. Delete Session by ID
app.delete("/api/chat/sessions/:id", (req, res) => {
    const { id } = req.params;
    const index = sessionsStore.findIndex((s) => s.id === id);
    if (index === -1) {
        res.status(404).json({
            success: false,
            message: `Sesi dengan ID '${id}' tidak ditemukan`,
        });
        return;
    }
    sessionsStore.splice(index, 1);
    res.json({
        success: true,
        message: `Sesi '${id}' berhasil dihapus`,
    });
});
// 6. Clear Messages in Session
app.delete("/api/chat/sessions/:id/messages", (req, res) => {
    const { id } = req.params;
    const session = sessionsStore.find((s) => s.id === id);
    if (!session) {
        res.status(404).json({
            success: false,
            message: `Sesi dengan ID '${id}' tidak ditemukan`,
        });
        return;
    }
    session.messages = [];
    res.json({
        success: true,
        message: `Semua pesan pada sesi '${id}' berhasil dikosongkan`,
        data: session,
    });
});
// 7. Upload File Attachment
app.post("/api/chat/upload", upload.single("file"), (req, res) => {
    const file = req.file;
    if (!file) {
        res.status(400).json({
            success: false,
            message: "Tidak ada berkas yang diunggah (field 'file' diperlukan)",
        });
        return;
    }
    const isImage = file.mimetype.startsWith("image/");
    const isArchive = file.mimetype.includes("zip") ||
        file.mimetype.includes("tar") ||
        file.originalname.endsWith(".bin");
    const isCode = file.mimetype.includes("json") ||
        file.originalname.endsWith(".ts") ||
        file.originalname.endsWith(".tsx") ||
        file.originalname.endsWith(".js") ||
        file.originalname.endsWith(".py");
    const attachmentType = isImage
        ? "image"
        : isArchive
            ? "archive"
            : isCode
                ? "code"
                : "document";
    const attachment = {
        id: `att-${Date.now()}`,
        name: file.originalname,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: attachmentType,
        url: `/uploads/${file.filename}`,
    };
    res.status(201).json({
        success: true,
        message: "Berkas berhasil diunggah",
        data: attachment,
    });
});
// 8. Toggle Message Reaction
app.post("/api/chat/messages/:id/reactions", (req, res) => {
    const { id } = req.params;
    const { emoji = "👍" } = req.body;
    let targetMessage;
    for (const session of sessionsStore) {
        const msg = session.messages.find((m) => m.id === id);
        if (msg) {
            targetMessage = msg;
            break;
        }
    }
    if (!targetMessage) {
        res.status(404).json({
            success: false,
            message: `Pesan dengan ID '${id}' tidak ditemukan`,
        });
        return;
    }
    if (!targetMessage.reactions) {
        targetMessage.reactions = [];
    }
    const existingReaction = targetMessage.reactions.find((r) => r.emoji === emoji);
    if (existingReaction) {
        if (existingReaction.reacted) {
            existingReaction.count = Math.max(0, existingReaction.count - 1);
            existingReaction.reacted = false;
        }
        else {
            existingReaction.count += 1;
            existingReaction.reacted = true;
        }
    }
    else {
        targetMessage.reactions.push({
            emoji,
            count: 1,
            reacted: true,
        });
    }
    res.json({
        success: true,
        messageId: id,
        reactions: targetMessage.reactions,
    });
});
// 9. Send Message (Non-Streaming Completion)
app.post("/api/chat/completions", async (req, res) => {
    const { sessionId = "session-1", model = config.model.default, effort = config.model.effort, content, attachments, } = req.body;
    if (!content && (!attachments || attachments.length === 0)) {
        res.status(400).json({
            success: false,
            message: "Field 'content' or 'attachments' is required",
        });
        return;
    }
    const session = sessionsStore.find((s) => s.id === sessionId) ?? sessionsStore[0];
    const nowTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
    // User Message
    const userMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: content || "Mengirim lampiran berkas",
        attachments,
        timestamp: nowTime,
    };
    // Update session title if still default
    if (session.title === "Percakapan Baru Qwen" && content) {
        session.title = content.slice(0, 32).trim() + (content.length > 32 ? "..." : "");
    }
    session.messages.push(userMessage);
    // Generate Assistant Reply via Qwen Engine
    const activeModel = AVAILABLE_MODELS.find((m) => m.id === model) ?? AVAILABLE_MODELS[0];
    let replyText = "";
    try {
        replyText = await chatWithQwen(content, {
            model,
            effort: effort || "medium",
            attachments,
        });
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("Qwen Engine Error:", errorMsg);
        replyText = `⚠️ Gagal memproses permintaan melalui engine Qwen: ${errorMsg}`;
    }
    const snippets = extractCodeSnippets(replyText);
    const assistantMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: replyText,
        codeSnippets: snippets,
        timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
        model: activeModel.name,
        effort: effort || "medium",
        reactions: [{ emoji: "👍", count: 1, reacted: false }],
    };
    session.messages.push(assistantMessage);
    res.json({
        success: true,
        sessionId: session.id,
        userMessage,
        assistantMessage,
    });
});
// 10. Send Message (Server-Sent Events / SSE Streaming)
app.post("/api/chat/stream", async (req, res) => {
    const { sessionId = "session-1", model = config.model.default, message, options, } = req.body;
    const effort = options?.effort || options?.reasoningEffort || config.model.effort || "medium";
    const session = sessionsStore.find((s) => s.id === sessionId) ?? sessionsStore[0];
    const content = message?.content || "";
    const attachments = message?.attachments;
    const nowTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
    // Append user message
    const userMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: content || "Lampiran dikirim",
        attachments,
        timestamp: nowTime,
    };
    if (session.title === "Percakapan Baru Qwen" && content) {
        session.title = content.slice(0, 32).trim() + (content.length > 32 ? "..." : "");
    }
    session.messages.push(userMessage);
    // Configure SSE Headers
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    const sendSSE = (eventData) => {
        res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    };
    const assistantMsgId = `msg-${Date.now() + 1}`;
    const activeModel = AVAILABLE_MODELS.find((m) => m.id === model) ?? AVAILABLE_MODELS[0];
    sendSSE({
        type: "start",
        messageId: assistantMsgId,
        model: activeModel.name,
        effort,
    });
    let fullResponse = "";
    try {
        await streamChatWithQwen(content, {
            model,
            effort: effort || "medium",
            attachments,
        }, {
            onThinking: (text) => {
                sendSSE({ type: "thinking", delta: text });
            },
            onToken: (delta) => {
                fullResponse += delta;
                sendSSE({ type: "content", delta });
            },
            onError: (err) => {
                sendSSE({ type: "error", error: err.message });
            },
        });
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("Qwen Stream Error:", errorMsg);
        fullResponse = `⚠️ Gagal streaming melalui Qwen Engine: ${errorMsg}`;
        sendSSE({ type: "content", delta: fullResponse });
    }
    const snippets = extractCodeSnippets(fullResponse);
    if (snippets && snippets.length > 0) {
        for (const snip of snippets) {
            sendSSE({
                type: "code",
                delta: snip,
            });
        }
    }
    const assistantMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: fullResponse,
        codeSnippets: snippets,
        timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
        model: activeModel.name,
        effort: effort || "medium",
        reactions: [{ emoji: "👍", count: 1, reacted: false }],
    };
    session.messages.push(assistantMessage);
    sendSSE({ type: "done", messageId: assistantMsgId });
    res.end();
});
// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Qwen Web-Chats Backend listening on http://localhost:${PORT}`);
    console.log(`📡 Ready for testing at http://localhost:${PORT}/api/chat/sessions`);
});
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
// Prevent event loop from prematurely exiting
setInterval(() => { }, 1000 * 60 * 60);
