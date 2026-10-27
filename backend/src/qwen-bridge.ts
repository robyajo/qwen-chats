import type { Request, Response } from "express"
import crypto from "node:crypto"
import { AVAILABLE_MODELS } from "./data.ts"
import { config } from "./config.ts"
import {
  chatWithQwen,
  streamChatWithQwen,
  getQwenBridgeDiagnostic,
  launchQwenDesktopWithCDP,
  type QwenChatOptions,
} from "./qwen-engine.ts"

export interface OpenAIChatMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string | Array<{ type: string; text?: string }>
  name?: string
}

export interface OpenAIChatCompletionRequest {
  model?: string
  messages: OpenAIChatMessage[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
  reasoning_effort?: "low" | "medium" | "high" | "Auto" | "Fast" | "Thinking"
  user?: string
}

/**
 * Returns the list of available models in OpenAI API format.
 */
export function getOpenAIModelsList() {
  const models = AVAILABLE_MODELS.map((m) => ({
    id: m.id,
    object: "model",
    created: 1740000000,
    owned_by: "qwen",
    permission: [
      {
        id: `modelperm-${m.id}`,
        object: "model_permission",
        created: 1740000000,
        allow_create_engine: false,
        allow_sampling: true,
        allow_logprobs: true,
        allow_search_indices: false,
        allow_view: true,
        allow_fine_tuning: false,
        organization: "*",
        group: null,
        is_blocking: false,
      },
    ],
    root: m.id,
    parent: null,
    details: {
      name: m.name,
      badge: m.badge,
      provider: m.provider,
      description: m.description,
    },
  }))

  return {
    object: "list",
    data: models,
  }
}

/**
 * Converts OpenAI message history into a clear prompt for Qwen.
 */
export function formatMessagesToPrompt(messages: OpenAIChatMessage[]): string {
  if (!messages || messages.length === 0) return ""

  // If there's only 1 user message, return its content directly
  if (messages.length === 1 && messages[0].role === "user") {
    const content = messages[0].content
    return typeof content === "string" ? content : JSON.stringify(content)
  }

  const parts: string[] = []
  let systemPrompt = ""

  for (const msg of messages) {
    const rawContent = msg.content
    const textContent =
      typeof rawContent === "string"
        ? rawContent
        : Array.isArray(rawContent)
          ? rawContent.map((c) => c.text || "").join("\n")
          : String(rawContent || "")

    if (msg.role === "system") {
      systemPrompt = textContent.trim()
    } else if (msg.role === "user") {
      parts.push(`User: ${textContent.trim()}`)
    } else if (msg.role === "assistant") {
      parts.push(`Assistant: ${textContent.trim()}`)
    }
  }

  if (systemPrompt) {
    return `[Instruksi Sistem: ${systemPrompt}]\n\n${parts.join("\n\n")}\n\nAssistant:`
  }

  return parts.join("\n\n") + "\n\nAssistant:"
}

/**
 * Handles OpenAI Chat Completion requests (/v1/chat/completions & /chat/completions).
 * Supports both Server-Sent Events (SSE) streaming and standard JSON completion.
 */
export async function handleOpenAIChatCompletion(req: Request, res: Response): Promise<void> {
  const body = req.body as OpenAIChatCompletionRequest
  const messages = body.messages
  const model = body.model || config.model.default
  const stream = Boolean(body.stream)
  const temperature = body.temperature ?? config.model.temperature
  const reasoningEffort = body.reasoning_effort

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({
      error: {
        message: "Field 'messages' is required and must be a non-empty array of message objects.",
        type: "invalid_request_error",
        param: "messages",
        code: "missing_required_parameter",
      },
    })
    return
  }

  const prompt = formatMessagesToPrompt(messages)
  const completionId = `chatcmpl-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`
  const createdTimestamp = Math.floor(Date.now() / 1000)

  // Map reasoning effort to Qwen thinking mode
  let thinkingMode: "Auto" | "Fast" | "Thinking" = "Auto"
  if (reasoningEffort === "high" || reasoningEffort === "Thinking") {
    thinkingMode = "Thinking"
  } else if (reasoningEffort === "low" || reasoningEffort === "Fast") {
    thinkingMode = "Fast"
  }

  const chatOptions: QwenChatOptions = {
    model,
    temperature,
    effort: (reasoningEffort as "low" | "medium" | "high") || "medium",
    thinkingMode,
  }

  // --------------------------------------------------------------------------
  // STREAMING RESPONSE (SSE)
  // --------------------------------------------------------------------------
  if (stream) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    })

    // 1. Initial role chunk
    const initialChunk = {
      id: completionId,
      object: "chat.completion.chunk",
      created: createdTimestamp,
      model,
      system_fingerprint: "fp_qwen_desktop_bridge",
      choices: [
        {
          index: 0,
          delta: { role: "assistant", content: "" },
          finish_reason: null,
        },
      ],
    }
    res.write(`data: ${JSON.stringify(initialChunk)}\n\n`)

    let isClientClosed = false
    let hasSentDone = false
    res.on("close", () => {
      if (!res.writableEnded) {
        isClientClosed = true
      }
    })

    const sendDone = () => {
      if (hasSentDone || res.writableEnded) return
      hasSentDone = true
      const finishChunk = {
        id: completionId,
        object: "chat.completion.chunk",
        created: createdTimestamp,
        model,
        system_fingerprint: "fp_qwen_desktop_bridge",
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: "stop",
          },
        ],
      }
      res.write(`data: ${JSON.stringify(finishChunk)}\n\n`)
      res.write("data: [DONE]\n\n")
      res.end()
    }

    try {
      await streamChatWithQwen(prompt, chatOptions, {
        onToken: (tokenDelta: string) => {
          if (isClientClosed || hasSentDone) return
          const chunk = {
            id: completionId,
            object: "chat.completion.chunk",
            created: createdTimestamp,
            model,
            system_fingerprint: "fp_qwen_desktop_bridge",
            choices: [
              {
                index: 0,
                delta: { content: tokenDelta },
                finish_reason: null,
              },
            ],
          }
          res.write(`data: ${JSON.stringify(chunk)}\n\n`)
        },
        onDone: () => {
          sendDone()
        },
        onError: (err: Error) => {
          if (isClientClosed) return
          res.write(
            `data: ${JSON.stringify({
              error: { message: err.message, type: "server_error", code: "qwen_stream_error" },
            })}\n\n`
          )
          sendDone()
        },
      })
      sendDone()
    } catch (err: unknown) {
      if (!isClientClosed) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        res.write(
          `data: ${JSON.stringify({ error: { message: errorMsg, type: "bridge_error" } })}\n\n`
        )
        sendDone()
      }
    }
    return
  }

  // --------------------------------------------------------------------------
  // NON-STREAMING RESPONSE (JSON)
  // --------------------------------------------------------------------------
  try {
    const replyText = await chatWithQwen(prompt, chatOptions)

    const promptTokens = Math.max(1, Math.round(prompt.length / 3.5))
    const completionTokens = Math.max(1, Math.round(replyText.length / 3.5))

    const responsePayload = {
      id: completionId,
      object: "chat.completion",
      created: createdTimestamp,
      model,
      system_fingerprint: "fp_qwen_desktop_bridge",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: replyText,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    }

    res.json(responsePayload)
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    res.status(500).json({
      error: {
        message: `Qwen Bridge Error: ${errorMsg}`,
        type: "api_error",
        code: "qwen_completion_failed",
      },
    })
  }
}

/**
 * Renders the modern, responsive Web Dashboard for the Local Qwen Bridge Server.
 */
export function renderBridgeDashboardHTML(hostUrl: string): string {
  const modelsList = AVAILABLE_MODELS.map(
    (m) =>
      `<li><code>${m.id}</code> &mdash; <strong>${m.name}</strong> <span class="badge">${m.badge}</span></li>`
  ).join("\n")

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Qwen Chat - Local API Bridge Server</title>
  <link rel="icon" type="image/png" href="/uploads/qwen-icon.png">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f2937;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --success: #10b981;
      --warning: #f59e0b;
      --error: #ef4444;
      --code-bg: #030712;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2rem 1rem;
    }
    .container { max-width: 1040px; margin: 0 auto; }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 1.5rem;
    }
    .brand { display: flex; align-items: center; gap: 1rem; }
    .brand img { width: 44px; height: 44px; border-radius: 10px; }
    .brand h1 { font-size: 1.5rem; font-weight: 700; }
    .brand p { font-size: 0.875rem; color: var(--text-muted); }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
    }
    .card h2 { font-size: 1.15rem; margin-bottom: 1rem; color: #fff; display: flex; align-items: center; gap: 0.5rem; }
    .endpoints-list { list-style: none; }
    .endpoints-list li {
      padding: 0.6rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
    }
    .method-badge {
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 700;
      font-size: 0.75rem;
    }
    .get { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .post { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .models-list { list-style: none; font-size: 0.85rem; }
    .models-list li { margin-bottom: 0.5rem; }
    .models-list code { background: var(--code-bg); padding: 0.2rem 0.4rem; border-radius: 4px; color: #a5b4fc; font-family: monospace; }
    .badge { font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 9999px; background: rgba(99, 102, 241, 0.2); color: #818cf8; margin-left: 0.3rem; }
    .playground-area { margin-top: 1.5rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.875rem; margin-bottom: 0.4rem; color: var(--text-muted); }
    select, textarea, input {
      width: 100%;
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 0.75rem;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.875rem;
    }
    textarea { min-height: 90px; resize: vertical; }
    .btn {
      background: var(--primary);
      color: #fff;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn:hover { background: var(--primary-hover); }
    .response-box {
      margin-top: 1rem;
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1rem;
      font-family: monospace;
      font-size: 0.85rem;
      white-space: pre-wrap;
      max-height: 300px;
      overflow-y: auto;
      color: #38bdf8;
    }
    .code-block {
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1rem;
      position: relative;
      margin-top: 0.75rem;
    }
    .code-block pre {
      overflow-x: auto;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8rem;
    }
    .copy-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: #fff;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .copy-btn:hover { background: rgba(255,255,255,0.2); }
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.5rem; }
    .tab-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-weight: 600;
      padding: 0.4rem 0.8rem;
      cursor: pointer;
      border-radius: 6px;
      font-size: 0.875rem;
    }
    .tab-btn.active { color: #fff; background: rgba(99, 102, 241, 0.2); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">
        <img src="/uploads/qwen-icon.png" alt="Qwen" onerror="this.src='https://chat.qwen.ai/static/favicon.png'">
        <div>
          <h1>Qwen Chat Local Bridge Server</h1>
          <p>OpenAI-Compatible Local API Server &middot; Port ${config.port}</p>
        </div>
      </div>
      <div id="statusBadge" class="status-badge">
        <span class="status-dot"></span>
        <span id="statusText">Bridge Online (:9222 Connected)</span>
      </div>
    </div>

    <div class="grid">
      <!-- Card 1: API Endpoints -->
      <div class="card">
        <h2>🌐 OpenAI-Compatible Endpoints</h2>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">
          Gunakan endpoint ini di Cursor, Cline, Open WebUI, Continue.dev, LangChain, atau skrip Python/Node.js Anda.
        </p>
        <ul class="endpoints-list">
          <li>
            <span><span class="method-badge post">POST</span> <code>/v1/chat/completions</code></span>
            <span style="color:var(--text-muted);">Chat Completion (SSE & JSON)</span>
          </li>
          <li>
            <span><span class="method-badge get">GET</span> <code>/v1/models</code></span>
            <span style="color:var(--text-muted);">Daftar Model Qwen</span>
          </li>
          <li>
            <span><span class="method-badge get">GET</span> <code>/v1/models/:model</code></span>
            <span style="color:var(--text-muted);">Spesifikasi Model</span>
          </li>
          <li>
            <span><span class="method-badge get">GET</span> <code>/api/bridge/status</code></span>
            <span style="color:var(--text-muted);">Status Diagnostik CDP</span>
          </li>
          <li>
            <span><span class="method-badge post">POST</span> <code>/api/bridge/launch</code></span>
            <span style="color:var(--text-muted);">Jalankan Qwen Desktop</span>
          </li>
        </ul>
        <div style="margin-top:1.25rem;">
          <button class="btn" style="background:#2563eb;" onclick="checkDiagnostic()">
            🔄 Cek Status Diagnostik
          </button>
          <button class="btn" style="background:#059669; margin-left:0.5rem;" onclick="launchQwen()">
            🚀 Luncurkan Qwen Desktop
          </button>
        </div>
      </div>

      <!-- Card 2: Model Catalog -->
      <div class="card">
        <h2>🤖 Model Qwen yang Didukung</h2>
        <ul class="models-list">
          ${modelsList}
        </ul>
        <div style="margin-top:1rem; padding:0.75rem; background:rgba(99,102,241,0.1); border-radius:8px; font-size:0.8rem; color:#c7d2fe;">
          💡 <strong>Tips:</strong> Model <code>qwen-3.8-max</code> dan <code>qwen-3.7-plus</code> mendukung reasoning/thinking token serta pemrograman kode tingkat lanjut.
        </div>
      </div>
    </div>

    <!-- Playground Test -->
    <div class="card" style="margin-bottom: 2rem;">
      <h2>⚡ Uji Coba Cepat (Bridge Playground)</h2>
      <div class="playground-area">
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:1rem; margin-bottom:1rem;">
          <div>
            <label style="font-size:0.85rem; color:var(--text-muted);">Prompt Pesan</label>
            <input type="text" id="playPrompt" value="Halo Qwen! Berikan 3 tips singkat optimasi performa web." placeholder="Tulis prompt...">
          </div>
          <div>
            <label style="font-size:0.85rem; color:var(--text-muted);">Pilih Model</label>
            <select id="playModel">
              <option value="qwen-3.8-max">qwen-3.8-max (Flagship 3.8)</option>
              <option value="qwen-3.7-plus">qwen-3.7-plus (High-Performance)</option>
              <option value="qwen-3.8-omni-flash">qwen-3.8-omni-flash (Multimodal)</option>
              <option value="qwen-3.7-max">qwen-3.7-max (Flagship Text)</option>
            </select>
          </div>
        </div>
        <button class="btn" id="sendBtn" onclick="runPlayground()">Kirim via /v1/chat/completions (Stream)</button>
        <div class="response-box" id="playResponse">Respons akan muncul di sini secara real-time...</div>
      </div>
    </div>

    <!-- Configuration Guides -->
    <div class="card">
      <h2>🛠️ Panduan Integrasi Klien</h2>
      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('cursor')">Cursor / Cline / Roo Code</button>
        <button class="tab-btn" onclick="switchTab('python')">Python (openai)</button>
        <button class="tab-btn" onclick="switchTab('curl')">cURL</button>
        <button class="tab-btn" onclick="switchTab('node')">Node.js</button>
      </div>

      <div id="tab-cursor" class="tab-content">
        <p style="font-size:0.85rem; color:var(--text-muted);">
          Masukkan konfigurasi berikut di pengaturan <strong>Custom OpenAI</strong>:
        </p>
        <div class="code-block">
          <button class="copy-btn" onclick="copyCode('cursor-code')">Salin</button>
          <pre id="cursor-code">Base URL: http://localhost:${config.port}/v1
API Key:  qwen-local (atau sembarang teks)
Model:    qwen-3.8-max (atau qwen-3.7-plus)</pre>
        </div>
      </div>

      <div id="tab-python" class="tab-content" style="display:none;">
        <p style="font-size:0.85rem; color:var(--text-muted);">Skrip Python menggunakan library resmi <code>openai</code>:</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copyCode('python-code')">Salin</button>
          <pre id="python-code">from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:${config.port}/v1",
    api_key="qwen-local"
)

response = client.chat.completions.create(
    model="qwen-3.8-max",
    messages=[
        {"role": "user", "content": "Halo! Jelaskan arsitektur event-driven dalam 2 kalimat."}
    ],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()</pre>
        </div>
      </div>

      <div id="tab-curl" class="tab-content" style="display:none;">
        <p style="font-size:0.85rem; color:var(--text-muted);">Perintah cURL langsung:</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copyCode('curl-code')">Salin</button>
          <pre id="curl-code">curl -X POST http://localhost:${config.port}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "qwen-3.8-max",
    "messages": [{"role": "user", "content": "Halo Qwen!"}],
    "stream": false
  }'</pre>
        </div>
      </div>

      <div id="tab-node" class="tab-content" style="display:none;">
        <p style="font-size:0.85rem; color:var(--text-muted);">Node.js menggunakan package <code>openai</code>:</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copyCode('node-code')">Salin</button>
          <pre id="node-code">import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "http://localhost:${config.port}/v1",
  apiKey: "qwen-local",
});

const completion = await openai.chat.completions.create({
  model: "qwen-3.8-max",
  messages: [{ role: "user", content: "Halo dari Node.js!" }],
});

console.log(completion.choices[0].message.content);</pre>
        </div>
      </div>
    </div>
  </div>

  <script>
    async function checkDiagnostic() {
      try {
        const res = await fetch('/api/bridge/status');
        const data = await res.json();
        const badge = document.getElementById('statusBadge');
        const txt = document.getElementById('statusText');
        if (data.cdpConnected) {
          badge.style.background = 'rgba(16, 185, 129, 0.15)';
          badge.style.color = '#34d399';
          txt.textContent = 'Bridge Online (CDP :9222 Terhubung · ' + (data.currentModel || 'Qwen') + ')';
        } else {
          badge.style.background = 'rgba(239, 68, 68, 0.15)';
          badge.style.color = '#f87171';
          txt.textContent = 'Port 9222 Offline (Klik Luncurkan Qwen)';
        }
        alert("Status Diagnostik:\\n" + JSON.stringify(data, null, 2));
      } catch (e) {
        alert("Gagal menghubungi server bridge: " + e.message);
      }
    }

    async function launchQwen() {
      try {
        const res = await fetch('/api/bridge/launch', { method: 'POST' });
        const data = await res.json();
        alert(data.message || "Permintaan peluncuran dikirim.");
        setTimeout(checkDiagnostic, 3000);
      } catch (e) {
        alert("Gagal meluncurkan Qwen: " + e.message);
      }
    }

    async function runPlayground() {
      const prompt = document.getElementById('playPrompt').value.trim();
      const model = document.getElementById('playModel').value;
      const box = document.getElementById('playResponse');
      const btn = document.getElementById('sendBtn');
      if (!prompt) return;

      btn.disabled = true;
      box.textContent = "Mengalirkan respons dari Qwen...";

      try {
        const res = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            stream: true
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          box.textContent = "Error: " + errText;
          btn.disabled = false;
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') break;
            try {
              const d = JSON.parse(raw);
              const delta = d.choices?.[0]?.delta?.content || "";
              if (delta) {
                full += delta;
                box.textContent = full;
              }
            } catch {}
          }
        }
      } catch (e) {
        box.textContent = "Koneksi terputus: " + e.message;
      } finally {
        btn.disabled = false;
      }
    }

    function switchTab(name) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      event.target.classList.add('active');
      document.getElementById('tab-' + name).style.display = 'block';
    }

    function copyCode(id) {
      const text = document.getElementById(id).textContent;
      navigator.clipboard.writeText(text);
      event.target.textContent = "Tersalin!";
      setTimeout(() => event.target.textContent = "Salin", 1500);
    }

    // Auto-check on load
    window.addEventListener('DOMContentLoaded', checkDiagnostic);
  </script>
</body>
</html>`
}
