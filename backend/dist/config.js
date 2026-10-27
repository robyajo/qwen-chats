import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
const appData = process.env.LOCALAPPDATA ||
    path.join(process.env.USERPROFILE || "C:\\Users\\robyk", "AppData", "Local");
const qwenInstallPath = process.env.QWEN_APP_PATH || path.join(appData, "Programs", "Qwen", "Qwen.exe");
const qwenResourcesPath = process.env.QWEN_DATA_PATH || path.join(appData, "Programs", "Qwen", "resources");
const isQwenAppInstalled = Boolean(qwenInstallPath && fs.existsSync(qwenInstallPath));
export const config = {
    port: Number(process.env.PORT) || 3004,
    nodeEnv: process.env.NODE_ENV || "development",
    endpoints: {
        dashscopeBaseUrl: process.env.QWEN_API_BASE_URL ||
            "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        officialWebChatUrl: process.env.QWEN_OFFICIAL_WEB_URL || "https://chat.qwen.ai",
        webChatApiUrl: process.env.QWEN_WEB_CHAT_API_URL || "https://chat.qwen.ai/api",
    },
    apiKey: process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || "",
    session: {
        userId: process.env.QWEN_USER_ID || "",
        deviceId: process.env.QWEN_DEVICE_ID || "",
        accessToken: process.env.QWEN_ACCESS_TOKEN || "",
        refreshToken: process.env.QWEN_REFRESH_TOKEN || "",
        hasSession: Boolean(process.env.QWEN_ACCESS_TOKEN || process.env.QWEN_REFRESH_TOKEN),
        cookieHeader: process.env.QWEN_COOKIE_HEADER || "",
    },
    model: {
        default: process.env.DEFAULT_QWEN_MODEL || "qwen-3.8-max",
        effort: (process.env.QWEN_REASONING_EFFORT ||
            "medium"),
        thinkingMode: (process.env.QWEN_THINKING_MODE ||
            "Auto"),
        temperature: Number(process.env.QWEN_TEMPERATURE) || 0.7,
        maxOutputTokens: Number(process.env.QWEN_MAX_OUTPUT_TOKENS) || 8192,
    },
    localQwenApp: {
        installed: isQwenAppInstalled,
        installPath: qwenInstallPath,
        resourcesPath: qwenResourcesPath,
        version: "1.0.3",
        mcpRunner: {
            hasBun: fs.existsSync(path.join(qwenResourcesPath, "bun", "bun.exe")),
            hasUvx: fs.existsSync(path.join(qwenResourcesPath, "python", "uvx.exe")),
        },
    },
};
