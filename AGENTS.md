# Antigravity Qwen-Chats & Local Bridge — Engineering Guidelines (AGENTS.md)

Dokumen ini adalah referensi teknik utama (*canonical engineering manual*) bagi AI agent atau pengembang yang bekerja pada repositori full-stack **Antigravity Qwen-Chats** (Backend Express.js + Frontend React 19).

---

## 📑 Daftar Isi

1. [Ikhtisar Proyek & Arsitektur Monorepo](#1-ikhtisar-proyek--arsitektur-monorepo)
2. [Aturan Environment & Alokasi Port](#2-aturan-environment--alokasi-port)
3. [Standar & Spesifikasi Backend](#3-standar--spesifikasi-backend)
   - [Chrome DevTools Protocol (CDP) Bridge](#31-chrome-devtools-protocol-cdp-bridge)
   - [Spesifikasi Rute OpenAI-Compatible (/v1)](#32-spesifikasi-rute-openai-compatible-v1)
   - [Rute Internal Web-Chats & Dashboard](#33-rute-internal-web-chats--dashboard)
   - [Ekstraksi Sesi DPAPI & SQLite Cookies](#34-ekstraksi-sesi-dpapi--sqlite-cookies)
4. [Standar & Spesifikasi Frontend](#4-standar--spesifikasi-frontend)
   - [Teknologi & Desain Sistem](#41-teknologi--desain-sistem)
   - [Komponen Utama & Aliran Data](#42-komponen-utama--aliran-data)
   - [Konsumsi Streaming SSE](#43-konsumsi-streaming-sse)
5. [Prosedur Pengujian & Verifikasi (Runbook)](#5-prosedur-pengujian--verifikasi-runbook)
6. [Anti-Patterns & Pitfalls Wajib Dihindari](#6-anti-patterns--pitfalls-wajib-dihindari)

---

## 1. Ikhtisar Proyek & Arsitektur Monorepo

Repositori ini menggabungkan dua kapabilitas utama:
1. **Local Bridge Server (OpenAI-Compatible)**: Server lokal pada backend (`:3004`) yang menyediakan endpoint `/v1/chat/completions` dan `/v1/models` agar aplikasi klien pihak ketiga (**Cursor, Cline, Roo Code, Continue.dev, Open WebUI, Python `openai`, LangChain, cURL**) dapat menggunakan model AI Qwen resmi secara gratis tanpa WAF Captcha.
2. **Antigravity Web-Chats**: Aplikasi obrolan web interaktif berbasis React 19 + shadcn/ui + Tailwind CSS v4 yang terhubung langsung ke backend server.

### Struktur Direktori:

```
qwen-chats/
├── AGENTS.md                          # Panduan arsitektur & aturan teknis ini
├── package.json                       # Script monorepo root (dev:backend, dev:frontend, build)
├── antigravity-web-chats-postman-...  # Koleksi Postman lengkap untuk pengujian API
├── get_master_key.ps1                 # Utilitas PowerShell dekripsi DPAPI
├── .agents/
│   ├── skills/
│   │   ├── qwen-bridge-backend/SKILL.md  # Skill backend, CDP bridge, & OpenAI API
│   │   ├── qwen-chat-frontend/SKILL.md   # Skill frontend React 19, UI, & SSE streaming
│   │   └── fullstack-integration/SKILL.md# Skill pengujian E2E & integrasi cross-service
│   └── skill/
│       └── SKILL.md                      # Entrypoint skill fallback
├── backend/
│   ├── .env                           # Konfigurasi kredensial, port, token sesi, & master key
│   ├── package.json                   # Dependencies: express, cors, multer, dotenv
│   ├── tsconfig.json                  # Konfigurasi TypeScript ESM (NodeNext)
│   ├── README.md & QWEN_INTEGRATION.md# Dokumentasi teknis integrasi Qwen
│   ├── src/
│   │   ├── index.ts                   # Express server, rute OpenAI /v1, SSE stream, & dashboard
│   │   ├── qwen-bridge.ts             # Handler OpenAI format, model catalog, & dashboard HTML
│   │   ├── qwen-engine.ts             # CDP bridge WebSocket, model selector, & token streaming
│   │   ├── qwen-session-extractor.ts  # Ekstraktor token DPAPI & SQLite cookies
│   │   ├── config.ts                  # Pemuat konfigurasi terpusat dari .env
│   │   ├── data.ts                    # Katalog model resmi & store percakapan in-memory
│   │   ├── types.ts                   # Interface TypeScript ChatMessage, Session, AIModel
│   │   └── qwen-synced-sessions.json  # Cache riwayat sesi yang disinkronkan dari Qwen
│   └── uploads/                       # Direktori penyimpanan lampiran berkas fisik
└── frontend/
    ├── package.json                   # React 19, Base UI, Tailwind v4, Shiki, Lucide
    ├── vite.config.ts                 # Proxy Vite ke backend (:3004) untuk /api, /uploads, /v1
    ├── index.html                     # Entrypoint HTML Vite
    └── src/
        ├── App.tsx                    # Komponen root & state manager obrolan
        ├── main.tsx                   # Mount React 19 root
        ├── index.css                  # Tema Tailwind CSS v4 & custom variables
        ├── components/
        │   ├── chat/                  # ChatContainer, MessageItem, Input, Sidebar, Header
        │   └── ui/                    # shadcn / Base UI primitives (button, dialog, scroll-area)
        ├── lib/                       # mock-chat-data.ts, utils.ts, highlighter.tsx (Shiki)
        └── types/chat.ts              # Definisi tipe TypeScript antarmuka chat
```

---

## 2. Aturan Environment & Alokasi Port

| Service | Port Default | Protokol | Variabel Environment Terkait | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Express** | `3004` | HTTP/1.1 | `PORT=3004` | Melayani `/v1/*`, `/api/*`, `/bridge`, dan `/` |
| **Frontend Vite** | `5174` | HTTP/1.1 | `BACKEND_PORT=3004` | Antarmuka pengguna React 19 |
| **Qwen Desktop CDP** | `9222` | WebSocket | `--remote-debugging-port=9222` | Port remote debugging Chromium Qwen.exe |

### Variabel Inti `.env` (Backend):
- `PORT`: Port server backend (default `3004`).
- `DEFAULT_QWEN_MODEL`: Model default, misal `qwen-3.8-max`.
- `QWEN_APP_PATH`: Lokasi file `Qwen.exe` (misal `C:\Users\<user>\AppData\Local\Programs\Qwen\Qwen.exe`).
- `QWEN_ACCESS_TOKEN`: JWT Bearer token sesi aktif.
- `QWEN_REFRESH_TOKEN`: Refresh token persisten.
- `QWEN_COOKIE_HEADER`: Header cookies terdekripsi untuk request HTTP.
- `DASHSCOPE_API_KEY`: *(Opsional)* API key cloud DashScope Alibaba Cloud.

---

## 3. Standar & Spesifikasi Backend

Backend berjalan di **Node.js 22+ ESM** dengan native TypeScript stripping (`node --experimental-strip-types src/index.ts`). Kompilasi `tsc` digunakan untuk validasi tipe (`npm run build`).

### 3.1. Chrome DevTools Protocol (CDP) Bridge

Komunikasi ke Qwen Desktop dilakukan via WebSocket CDP (`ws://127.0.0.1:9222/devtools/page/...`):

1. **Resolusi Target Webview**:
   - Query `http://127.0.0.1:9222/json/list`.
   - Temukan target dengan kriteria `t.type === "webview" && t.url.includes("chat.qwen.ai")`.
   - Jika port 9222 mati, panggil `launchQwenDesktopWithCDP()` untuk meluncurkan `Qwen.exe --remote-debugging-port=9222` via PowerShell secara detached, lalu polling kesiapan target.

2. **DOM Selectors Resmi Qwen Webview**:
   - Textarea input: `.message-input-textarea`
     - Harus menggunakan prototype setter:
       ```javascript
       const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
       setter.call(textarea, promptText);
       textarea.dispatchEvent(new Event('input', { bubbles: true }));
       textarea.dispatchEvent(new Event('change', { bubbles: true }));
       ```
   - Tombol Kirim: `button.send-button`
   - Tombol Stop / Indikator Generating: `button.stop-button, button[aria-label='Stop']`
   - Model Trigger: `.wms-trigger__text` & parent-nya `.wms-trigger__content`
   - Model Items: `.wms-list__item`
   - Thinking Mode Selector: `.qwen-thinking-selector` (pilihan: `Fast`, `Auto`, `Thinking`)
   - Pesan Asisten: `.qwen-chat-message-assistant`
   - Konten Jawaban Bersih: `.response-message-content.phase-answer`
   - Kartu Proses Berpikir: `.qwen-chat-thinking-tool-status-card-wraper` (harus disingkirkan dari teks jawaban).

3. **Message Count Fence (Pencegah Kontaminasi Pesan Lama)**:
   - Sebelum mengklik tombol kirim, hitung jumlah pesan asisten saat ini:
     ```javascript
     const initialCount = Number(await evalPromise("document.querySelectorAll('.qwen-chat-message-assistant').length")) || 0;
     ```
   - Dalam loop observasi, pastikan `msgs.length > initialCount`. Jangan pernah membaca pesan asisten indeks lama saat pesan baru belum mulai dibuat.

4. **Pemisahan Fase Berpikir vs Jawaban**:
   - Jika `.response-message-content.phase-answer` belum ada dan `isGenerating === true`, maka model masih dalam fase *thinking*. Jangan kirimkan teks thinking sebagai teks jawaban obrolan.

### 3.2. Spesifikasi Rute OpenAI-Compatible (`/v1`)

- **`GET /v1/models` & `GET /models`**:
  - Mengembalikan struktur standar OpenAI:
    ```json
    {
      "object": "list",
      "data": [
        {
          "id": "qwen-3.8-max",
          "object": "model",
          "created": 1740000000,
          "owned_by": "qwen"
        }
      ]
    }
    ```
- **`GET /v1/models/:model`**: Mengembalikan objek model tunggal atau 404 jika tidak terdaftar.
- **`POST /v1/chat/completions` & `POST /chat/completions`**:
  - Input: `{ model: string, messages: Array<{role: string, content: string}>, stream?: boolean, temperature?: number, reasoning_effort?: string }`
  - **Streaming SSE (`stream: true`)**:
    - Header: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
    - Initial chunk: `{ delta: { role: "assistant", content: "" } }`.
    - Token chunks: `{ delta: { content: "..." } }`.
    - Finish chunk: `{ delta: {}, finish_reason: "stop" }`.
    - Penutup: `data: [DONE]\n\n` lalu `res.end()`.
  - **Non-Streaming (`stream: false`)**:
    - Mengembalikan format penuh `{ id, object: "chat.completion", choices: [{ message: { role: "assistant", content: "..." }, finish_reason: "stop" }], usage: { ... } }`.

### 3.3. Rute Internal Web-Chats & Dashboard

- **`GET /bridge`** atau **`GET /` (via Browser/HTML)**: Menampilkan antarmuka dasbor interaktif, badge status CDP, playground pengujian, dan instruksi salin konfigurasi.
- **`GET /api/bridge/status`**: Mengembalikan status JSON: `{ cdpConnected, cdpPort, currentModel, thinkingMode, appFound, hasSessionTokens }`.
- **`POST /api/bridge/launch`**: Memulai Qwen Desktop dengan flag remote debugging.
- **`GET /api/chat/sessions`**: Mengambil daftar sesi obrolan.
- **`POST /api/chat/stream`**: Endpoint streaming khusus untuk UI frontend internal.

### 3.4. Ekstraksi Sesi DPAPI & SQLite Cookies

Fungsi `extractLocalQwenSession()` di `src/qwen-session-extractor.ts`:
1. Membaca DPAPI master key dari `C:\Users\<user>\AppData\Roaming\Qwen\Local State`.
2. Mendekripsi DPAPI key menggunakan Windows PowerShell `System.Security.Cryptography.ProtectedData`.
3. Membuka salinan sementara SQLite cookies dari `Network\Cookies`.
4. Mendekripsi cookie `refresh_token`, `cna`, `cnaui`, dan `aui` menggunakan AES-256-GCM.
5. Menyimpan kredensial baru secara persisten ke `.env`.

---

## 4. Standar & Spesifikasi Frontend

Frontend dibangun dengan **React 19**, **Vite 8**, dan **Tailwind CSS v4** menggunakan sistem komponen **Base UI + shadcn**.

### 4.1. Teknologi & Desain Sistem

- **CSS Engine**: `@tailwindcss/vite` (Tailwind v4 murni, import via `@import "tailwindcss";` di `index.css`).
- **Komponen UI**: `@base-ui/react` dan template shadcn terpasang di `src/components/ui/`.
- **Ikon**: `lucide-react`.
- **Code Syntax Highlighter**: `shiki` (Dual theme dark/light terpasang di `src/lib/highlighter.tsx`).
- **Tema**: Mendukung tema Dark/Light otomatis melalui class `.dark` pada `<html>`.

### 4.2. Komponen Utama & Aliran Data

- **`App.tsx`**: State sentral obrolan (`sessions`, `activeSessionId`, `currentModelId`, `reasoningEffort`, `isGenerating`).
- **`ChatContainer`**: Menampilkan daftar pesan percakapan, auto-scroll, dan animasi pengetikan.
- **`ChatMessageItem`**: Render gelembung pesan user/asisten, tombol salin kode, reaksi emoji, dan status reasoning.
- **`CodeDisplay`**: Merender blok kode dengan tombol salin dan syntax highlighting dari Shiki.
- **`ChatInput`**: Textarea adaptif dengan dukungan lampiran berkas, tombol kirim, dan pemilih mode reasoning (*Low / Medium / High / Auto*).
- **`ChatSidebar`**: Navigasi riwayat sesi percakapan, pencarian sesi, dan tombol buat obrolan baru.
- **`ConfigPage`**: Dasbor inspeksi status backend, kredensial Qwen, dan import token browser.

### 4.3. Konsumsi Streaming SSE

Pola streaming pada frontend:
```typescript
const response = await fetch("/api/chat/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId, model, message: { content } })
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (reader) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Parsing SSE baris demi baris (data: {...})
}
```

---

## 5. Prosedur Pengujian & Verifikasi (Runbook)

Saat memodifikasi backend atau frontend, jalankan prosedur berikut:

### 1. Build Typecheck Backend & Frontend:
```bash
# Validasi tipe backend
cd backend && npm run build

# Validasi tipe frontend
cd ../frontend && npm run typecheck
```

### 2. Memastikan Qwen Desktop Terhubung ke CDP:
Pastikan proses Qwen berjalan dengan flag `--remote-debugging-port=9222`.
Verifikasi dengan memanggil:
```bash
curl http://localhost:3004/api/bridge/status
```
Pastikan `cdpConnected` bernilai `true`.

### 3. Uji Coba Chat Completion Non-Streaming:
```bash
curl -X POST http://localhost:3004/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen-3.8-max","messages":[{"role":"user","content":"Tes 1+1"}]}'
```

### 4. Uji Coba Chat Completion Streaming:
```bash
curl -N -X POST http://localhost:3004/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen-3.8-max","messages":[{"role":"user","content":"Hitung 1 sampai 3"}],"stream":true}'
```
Harus menerima delta chunk real-time dan diakhiri dengan `data: [DONE]`.

---

## 6. Anti-Patterns & Pitfalls Wajib Dihindari

1. **`res.on("close")` vs `req.on("close")` pada SSE**:
   - ❌ **JANGAN**: `req.on("close", () => isClientClosed = true)`. Event `close` pada `req` akan terpicu segera setelah body request POST selesai dikirim oleh client, mematikan streaming sebelum asisten mulai membalas.
   - ✅ **GUNAKAN**: `res.on("close", () => { if (!res.writableEnded) isClientClosed = true })`.
2. **Escaping String di Dalam CDP `Runtime.evaluate`**:
   - ❌ **JANGAN**: Menyisipkan kutip ganda bersarang tanpa escaping yang rapi (misal `button[aria-label=\"Stop\"]` di dalam template literal yang diapit kutip ganda).
   - ✅ **GUNAKAN**: Tanda kutip tunggal di dalam query selector (misal `button[aria-label='Stop']`).
3. **Mengabaikan Initial Assistant Count**:
   - ❌ **JANGAN**: Membaca `msgs[msgs.length - 1]` tanpa memeriksa apakah pesan baru sudah muncul. Dalam percakapan yang sudah memiliki riwayat, `msgs[msgs.length - 1]` adalah pesan lama dari putaran sebelumnya.
   - ✅ **GUNAKAN**: Catat `initialCount` sebelum menekan tombol kirim, dan hanya proses jawaban saat `msgs.length > initialCount`.
4. **Memanggil API Eksternal `chat.qwen.ai` secara Langsung dari Node.js**:
   - ❌ **JANGAN**: Melakukan `fetch("https://chat.qwen.ai/api/v2/chat/completions")` langsung dari Node.js. Permintaan tersebut akan dicegat oleh Alibaba Cloud WAF/Baxia (`RGV587_ERROR` / SecToken Captcha).
   - ✅ **GUNAKAN**: Otomasi CDP melalui sesi Qwen Desktop resmi yang sudah memiliki TLS fingerprint browser dan sesi autentik.
