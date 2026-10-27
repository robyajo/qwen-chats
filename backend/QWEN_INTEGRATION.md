# Panduan Teknis & Integrasi Qwen Web-Chats (Alibaba Cloud)

Dokumen ini menjelaskan arsitektur sistem, model-model Qwen yang didukung, cara interaksi, integrasi API Alibaba Cloud DashScope, serta hasil analisis aplikasi **Qwen Desktop (Electron)** yang ditemukan di komputer Anda.

---

## 📋 Daftar Isi

1. [Ikhtisar Arsitektur](#1-ikhtisar-arsitektur)
2. [Hasil Analisis Qwen Desktop via MCP REA](#2-hasil-analisis-qwen-desktop-via-mcp-rea)
3. [Daftar Model Qwen yang Didukung](#3-daftar-model-qwen-yang-didukung)
4. [Konfigurasi Environment (.env)](#4-konfigurasi-environment-env)
5. [Integrasi Alibaba Cloud DashScope API](#5-integrasi-alibaba-cloud-dashscope-api)
6. [Daftar Endpoint API Backend](#6-daftar-endpoint-api-backend)
7. [Spesifikasi MCP (Model Context Protocol) di Qwen](#7-spesifikasi-mcp-model-context-protocol-di-qwen)

---

## 1. Ikhtisar Arsitektur

Backend **Qwen Web-Chats** berbasis Express.js & TypeScript yang melayani antarmuka frontend (shadcn/ui & React) dengan dua metode:
1. **REST API Non-Streaming (`/api/chat/completions`)**: Pemrosesan obrolan cepat dengan payload terstruktur.
2. **Server-Sent Events Streaming (`/api/chat/stream`)**: Streaming balasan token demi token secara berkala dengan status *thinking/reasoning*.

```
[ Frontend Qwen-Chats (:5174) ]
       │
       ▼ (1) POST /api/chat/stream
[ Backend Express.js (:3004) ]
       │
       ▼ (2) OpenAI-Compatible Request (Bearer Token)
[ Alibaba Cloud DashScope API (dashscope-intl.aliyuncs.com) ]
       │
       ▼ (3) Stream SSE Tokens
[ Frontend Qwen-Chats ] (Efek mengetik real-time)
```

---

## 2. Hasil Analisis Qwen Desktop via MCP REA

Melalui inspeksi MCP REA terhadap direktori program dan biner `C:\Users\robyk\AppData\Local\Programs\Qwen\`:

- **Identitas**: `Qwen.exe` (Versi 1.0.3.44) oleh Alibaba (`qwen.ai`).
- **Mekanisme**: Membungkus situs web resmi **`https://chat.qwen.ai`** di dalam komponen Electron `<webview>`.
- **User Agent Khusus**: `Mozilla/5.0 ... AliDesktop(QWENCHAT/1.0.3)`.
- **Integrasi MCP**: Dilengkapi dengan runtime pendukung:
  - `resources/bun/bun.exe`: Runner untuk tool MCP berbasis JavaScript/TypeScript.
  - `resources/python/uvx.exe`: Runner untuk tool MCP berbasis Python.
- **Deep Linking**: Mendaftarkan handler Windows `qwen://open?token=...`.

---

## 3. Daftar Model Resmi Qwen Chats yang Didukung

| ID Model | Nama Model | Kategori / Badge | Deskripsi Resmi Qwen Chats |
| :--- | :--- | :--- | :--- |
| **`qwen-3.8-max`** *(Default)* | **Qwen3.8-Max** | Flagship 3.8 | The flagship of Qwen3.8 model delivering state-of-the-art performance. |
| **`qwen-3.8-omni-flash`** | **Qwen3.8-Omni-Flash** | Omni Multimodal 3.8 | The latest native multimodal large language model in the Qwen3.8 series, supporting text, images, audio, and audiovisual input. |
| **`qwen-3.7-max`** | **Qwen3.7-Max** | Flagship 3.7 | The flagship Qwen3.7 model delivering state-of-the-art performance. Currently text-only (no vision capabilities). |
| **`qwen-3.7-plus`** | **Qwen3.7-Plus** | High-Performance 3.7 | The high-performance large language model in the Qwen3.7 series, supporting text and multimodal tasks. |
| **`qwen-3.6-plus`** | **Qwen3.6-Plus** | Multimodal 3.6 | The latest large language model in the Qwen3.6 series, supporting text and multimodal tasks. |
| **`qwen-3.5-plus`** | **Qwen3.5-Plus** | Multimodal 3.5 | The latest large language model in the Qwen3.5 series, supporting text and multimodal tasks. |
| **`qwen-3.5-omni-plus`** | **Qwen3.5-Omni-Plus** | Omni Multimodal 3.5 | The most powerful native multimodal large language model in the Qwen3.5 series. |
---

## 4. Konfigurasi Environment (`.env`)

```env
PORT=3004
NODE_ENV=development

# Endpoint Alibaba Cloud DashScope (Internasional)
QWEN_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1

# Kunci API Alibaba Cloud DashScope
DASHSCOPE_API_KEY=sk-your_api_key_here

# Default Model
DEFAULT_QWEN_MODEL=qwen-2.5-72b-instruct
QWEN_REASONING_EFFORT=medium
QWEN_TEMPERATURE=0.7
QWEN_MAX_OUTPUT_TOKENS=8192
```

---

## 5. Integrasi Alibaba Cloud DashScope API

DashScope mendukung antarmuka **OpenAI-Compatible**, sehingga backend dapat berkomunikasi dengan mudah menggunakan `fetch` native:

```typescript
const response = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.DASHSCOPE_API_KEY}`,
  },
  body: JSON.stringify({
    model: "qwen-2.5-72b-instruct",
    messages: [
      { role: "system", content: "Anda adalah Qwen, asisten AI dari Alibaba Cloud." },
      { role: "user", content: "Jelaskan konsep React 19." }
    ],
    stream: true,
  }),
});
```

---

## 6. Daftar Endpoint API Backend

| Endpoint | Metode | Fungsi |
| :--- | :--- | :--- |
| `POST /api/chat/completions` | POST | Mengirim pesan obrolan (non-streaming) |
| `POST /api/chat/stream` | POST | Mengalirkan balasan model AI via SSE (streaming) |
| `GET /api/config` | GET | Memeriksa konfigurasi backend & deteksi instalasi Qwen desktop |
| `GET /api/chat/models` | GET | Mengambil daftar katalog model Qwen |
| `GET /api/chat/sessions` | GET | Mengambil seluruh sesi percakapan |
| `POST /api/chat/sessions` | POST | Membuat sesi percakapan baru |
| `DELETE /api/chat/sessions/:id` | DELETE | Menghapus sesi percakapan |
| `POST /api/chat/upload` | POST | Mengunggah lampiran berkas via Multer |
| `POST /api/chat/messages/:id/reactions` | POST | Toggle reaksi emoji pada pesan |

---

## 7. Spesifikasi MCP (Model Context Protocol) di Qwen

Aplikasi Qwen Desktop memfasilitasi integrasi MCP melalui jembatan IPC:
- **`mcp_client_tool_list`**: Membaca perkakas sistem lokal.
- **`mcp_client_tool_call`**: Memanggil fungsi lokal yang diminta oleh model Qwen.
- **`bun.exe`** & **`uvx.exe`**: Terpasang di `resources/` untuk menjalankan script MCP lokal secara instan tanpa perlu instalasi runtime global tambahan.
