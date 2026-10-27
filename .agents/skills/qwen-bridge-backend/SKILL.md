---
name: qwen-bridge-backend
description: Operasikan, kembangkan, dan debug Qwen Local Bridge Server (Express.js, Chrome DevTools Protocol port 9222, OpenAI-compatible /v1/chat/completions, SSE streaming, dan DPAPI session extraction).
---

# Qwen Bridge Backend Skill

Skill ini memuat pengetahuan operasional dan prosedur teknis untuk mengembangkan, memelihara, dan memperbaiki layanan **Qwen Local Bridge Server** (`backend/`).

---

## 🎯 Lingkup Keahlian

- **Server Runtime**: Node.js 22+ ESM (`--experimental-strip-types`) dengan Express.js.
- **CDP Automation (`qwen-engine.ts`)**: Komunikasi WebSocket langsung ke port remote debugging Chromium `9222` pada `Qwen.exe` webview.
- **OpenAI-Compatible Protocols (`qwen-bridge.ts`)**:
  - `POST /v1/chat/completions` (SSE streaming & JSON completion).
  - `GET /v1/models` & `GET /v1/models/:model` (katalog resmi Qwen).
- **Windows Session & Credential Extraction (`qwen-session-extractor.ts`)**:
  - Dekripsi DPAPI master key Chromium.
  - Dekripsi cookies SQLite menggunakan AES-256-GCM.
- **Interactive Dashboard (`/bridge` & `GET /`)**: Monitoring status dan playground uji coba.

---

## ⚙️ Prosedur CDP Automation & Kontrak DOM

Saat berinteraksi dengan Qwen Desktop webview (`chat.qwen.ai`), patuhi kontrak berikut:

### 1. Injeksi Teks & Event Triggering
Teks prompt tidak boleh diset hanya melalui `.value = ...`, melainkan harus memanggil prototype descriptor setter dan memicu event `input` dan `change`:
```typescript
const textarea = document.querySelector(".message-input-textarea") as HTMLTextAreaElement;
const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
setter?.call(textarea, promptText);
textarea.dispatchEvent(new Event("input", { bubbles: true }));
textarea.dispatchEvent(new Event("change", { bubbles: true }));
```

### 2. Message Count Fence
Sebelum mengklik tombol kirim (`button.send-button`), selalu hitung jumlah pesan asisten saat ini:
```typescript
const initialCount = Number(await evalPromise("document.querySelectorAll('.qwen-chat-message-assistant').length")) || 0;
```
Ketika melakukan polling, abaikan pesan jika `msgs.length <= initialCount`. Ini mencegah sistem membaca respons dari giliran (*turn*) obrolan sebelumnya.

### 3. Isolasi Jawaban dari Kartu Thinking
Model reasoning (seperti `Qwen3.8-Max` dan `Qwen3.7-Plus`) menghasilkan dua blok:
- Kartu proses berpikir: `.qwen-chat-thinking-tool-status-card-wraper`
- Konten jawaban akhir: `.response-message-content.phase-answer`

Saat mengekstrak teks balasan:
```javascript
const answerEl = last.querySelector('.response-message-content.phase-answer');
if (!answerEl && isGenerating) {
  // Masih dalam fase berpikir, jangan return teks kosong sebagai selesai
  return { isGenerating: true, text: "" };
}

const targetNode = answerEl || last;
const clone = targetNode.cloneNode(true);
// Hapus kartu thinking dan tombol kontrol
clone.querySelectorAll('.qwen-chat-thinking-tool-status-card-wraper, [class*="thinking-status"], [class*="action-control"]').forEach(e => e.remove());
```

---

## 📡 Protokol Streaming SSE OpenAI (/v1/chat/completions)

### Header Respon:
```typescript
res.writeHead(200, {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
});
```

### Urutan Payload Chunk:
1. **Initial Role Chunk**:
   ```json
   data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":1740000000,"model":"qwen-3.8-max","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}
   ```
2. **Delta Chunks (Tiap Token Terdeteksi)**:
   ```json
   data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":1740000000,"model":"qwen-3.8-max","choices":[{"index":0,"delta":{"content":"Halo"},"finish_reason":null}]}
   ```
3. **Stop Chunk**:
   ```json
   data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":1740000000,"model":"qwen-3.8-max","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}
   ```
4. **End of Stream**:
   ```
   data: [DONE]
   ```
   Lalu panggil `res.end()`.

### Penanganan Disconnect:
Gunakan listener `res.on("close")`, **BUKAN** `req.on("close")`:
```typescript
let isClientClosed = false;
res.on("close", () => {
  if (!res.writableEnded) isClientClosed = true;
});
```

---

## 🔍 Diagnostik & Verifikasi

### 1. Pengecekan Status CDP Port 9222
```bash
curl http://localhost:3004/api/bridge/status
```
Target valid: `cdpConnected: true`, `appFound: true`.

### 2. Meluncurkan Qwen Desktop Otomatis
```bash
curl -X POST http://localhost:3004/api/bridge/launch
```

### 3. Pengujian Streaming SSE
```bash
curl -N -X POST http://localhost:3004/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen-3.8-max","messages":[{"role":"user","content":"Tes 1 2 3"}],"stream":true}'
```
Harus mengalirkan chunk secara berurutan dan berakhir dengan `data: [DONE]`.
