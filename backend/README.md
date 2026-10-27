# Qwen Web-Chats Backend API (Express.js)

Backend service berbasis **Express.js & TypeScript** untuk aplikasi **Qwen Web-Chats**, menyediakan REST API dan real-time Server-Sent Events (SSE) streaming yang terintegrasi dengan model **Alibaba Cloud Qwen** (Qwen 2.5 72B, Qwen 2.5 Coder 32B, Qwen 2.5 Max, Qwen Plus, Qwen Turbo, dan Qwen VL).

---

## 🚀 Fitur Utama

- **Integrasi Qwen AI Models**: Katalog lengkap model Qwen 2.5 (Flagship, Coder, Max, Plus, Turbo, VL).
- **Real-time SSE Streaming (`/api/chat/stream`)**: Streaming token respons AI dengan fase *thinking*.
- **Chat Completions (`/api/chat/completions`)**: Pemrosesan pesan non-streaming terstruktur.
- **Deteksi Qwen Desktop**: Mendeteksi instalasi aplikasi desktop Qwen resmi dan runtime MCP (`bun.exe` / `uvx.exe`) di komputer lokal.
- **Session Management**: CRUD sesi obrolan (list, create, delete, clear).
- **Attachment Upload**: Penanganan berkas unggahan dengan `multer`.
- **Inspeksi Konfigurasi Terpusat (`/api/config`)**: Memantau port server, environment, dan status integrasi.

---

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
