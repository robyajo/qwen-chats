# Qwen Web-Chats Backend API (Express.js)

Backend service berbasis **Express.js & TypeScript** untuk aplikasi **Qwen Web-Chats**, menyediakan REST API dan real-time Server-Sent Events (SSE) streaming yang terintegrasi dengan model **Alibaba Cloud Qwen** (Qwen 2.5 72B, Qwen 2.5 Coder 32B, Qwen 2.5 Max, Qwen Plus, Qwen Turbo, dan Qwen VL).

---

## 🚀 Fitur Utama

- **OpenAI-Compatible Local Bridge API**:
  - `POST /v1/chat/completions` (mendukung streaming SSE dan non-streaming JSON).
  - `GET /v1/models` & `GET /v1/models/:model` (katalog model resmi Qwen).
  - Kompatibel langsung dengan **Cursor, Cline, Roo Code, Continue.dev, Open WebUI, LangChain, dan skrip Python/Node.js**.
- **Native Qwen Desktop CDP Bridge**: Menghubungkan otomasi Chrome DevTools Protocol (`--remote-debugging-port=9222`) ke webview Qwen Desktop resmi tanpa WAF Captcha / RGV587 error.
- **Interactive Bridge Dashboard (`/bridge` atau `http://localhost:3004`)**: UI dasbor web modern untuk memantau status CDP, memilih model, melakukan uji coba chat langsung, dan menyalin panduan konfigurasi.
- **Deteksi & Auto-Launcher Qwen Desktop**: Mendeteksi biner `Qwen.exe` dan meluncurkannya secara otomatis jika belum berjalan.
- **Real-time SSE Streaming (`/api/chat/stream`)**: Streaming token respons AI dengan isolasi proses *thinking*.
- **CRUD Sesi & Ekstraksi Kredensial**: Ekstraksi token DPAPI dan SQLite cookies dari aplikasi desktop.

## 📁 Struktur Direktori

```
qwen-chats/backend/
├── src/
│   ├── index.ts              # Entry point Express, rute REST API, SSE stream, & Multer
│   ├── qwen-engine.ts        # Engine komunikasi ke Alibaba Cloud DashScope API
│   ├── config.ts             # Pemuat konfigurasi terpusat (.env) & deteksi Qwen Desktop
│   ├── data.ts               # In-memory store sesi dan katalog model AI Qwen
│   └── types.ts              # Interface TypeScript (ChatMessage, Session, Attachment)
├── uploads/                  # Direktori penyimpanan berkas upload fisik
├── dist/                     # Hasil kompilasi build produksi TypeScript
├── package.json              # Dependencies (express, cors, multer, dotenv)
├── tsconfig.json             # Konfigurasi TypeScript ESM (NodeNext)
├── README.md                 # Dokumentasi umum backend
└── QWEN_INTEGRATION.md       # Panduan teknis & integrasi resmi Alibaba Qwen API
```

---

## 🛠️ Menjalankan Backend

### 1. Masuk ke direktori
```bash
cd qwen-chats/backend
```

### 2. Jalankan Mode Development
```bash
npm run dev
```
Server akan berjalan di **`http://localhost:3004`**.

### 3. Build Produksi
```bash
npm run build
npm start
```

---

## 🌐 Local Bridge Server (OpenAI Compatible)

Bridge server ini bertindak sebagai jembatan lokal (*local bridge proxy*) sehingga aplikasi pihak ketiga (seperti Cursor, Cline, Python, dll.) dapat menggunakan model AI Qwen resmi secara gratis melalui sesi login Qwen Desktop Anda.

### 1. Endpoint OpenAI Standar

| Endpoint | Metode | Format | Deskripsi |
| :--- | :--- | :--- | :--- |
| `/v1/chat/completions` | `POST` | JSON / SSE | Chat completion standar OpenAI |
| `/v1/models` | `GET` | JSON | Mengambil daftar model Qwen |
| `/v1/models/:model` | `GET` | JSON | Detail metadata spesifik model |
| `/api/bridge/status` | `GET` | JSON | Status diagnostik port CDP 9222 & model aktif |
| `/api/bridge/launch` | `POST` | JSON | Meluncurkan Qwen Desktop dengan remote debugging |
| `/bridge` | `GET` | HTML | Dashboard interaktif & Playground uji coba |

### 2. Cara Menghubungkan ke Cursor / Cline / Roo Code

Di pengaturan extension / client AI:
- **API Provider**: `OpenAI Compatible`
- **Base URL**: `http://localhost:3004/v1`
- **API Key**: `qwen-local` (bebas/sembarang)
- **Model ID**: `qwen-3.8-max` atau `qwen-3.7-plus`

### 3. Contoh Penggunaan Python (`openai` library)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3004/v1",
    api_key="qwen-local"
)

# Streaming chat completion
stream = client.chat.completions.create(
    model="qwen-3.8-max",
    messages=[
        {"role": "user", "content": "Halo Qwen, buatkan fungsi regex email di Python!"}
    ],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()
```

### 4. Contoh Penggunaan cURL

```bash
curl -X POST http://localhost:3004/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-3.8-max",
    "messages": [{"role": "user", "content": "Jelaskan apa itu REST API!"}],
    "stream": false
  }'
```
