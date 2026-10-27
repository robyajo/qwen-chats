# Changelog - Antigravity Web-Chats Backend

Semua perubahan penting pada backend service Express.js didokumentasikan dalam berkas ini. Format mengacu pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] - 2026-10-27

### Added
- **Express.js & TypeScript Server Architecture**:
  - Inisialisasi service backend menggunakan Express 4.21, TypeScript ESM (NodeNext), dan middleware CORS.
  - Dukungan streaming Server-Sent Events (SSE) berlatensi rendah untuk balasan AI secara real-time.
- **Konfigurasi Terpusat (`.env`)**:
  - Pembuatan berkas `.env` dan template `.env.example` untuk memusatkan seluruh konfigurasi port, URL Google Gemini, token OAuth, dan parameter model.
  - Modul pemuat konfigurasi (`src/config.ts`) dengan integrasi `dotenv`.
  - Endpoint inspeksi konfigurasi publik: `GET /api/config`.
- **Integrasi Model Google Gemini 3.8 Flash**:
  - Penetapan model utama default: **`gemini-3.8-flash`** (*Next-Gen Flash*).
  - Dukungan tingkat penalaran (*Reasoning Effort*): **`low`**, **`medium`**, dan **`high`**.
  - Katalog model AI terdaftar pada endpoint `GET /api/chat/models`.
- **AI Credential Management**:
  - Dukungan token autentikasi dan integrasi API key.
  - Dokumentasi teknis integrasi: `QWEN_INTEGRATION.md`.
- **REST API Endpoints**:
  - `POST /api/chat/stream` - Streaming balasan chat dan penalaran via SSE.
  - `POST /api/chat/completions` - Balasan obrolan non-streaming terstruktur (teks dan kode).
  - `GET /api/chat/sessions` - Pengambilan seluruh sesi obrolan dengan filter pencarian dan periode.
  - `POST /api/chat/sessions` - Pembuatan sesi percakapan baru.
  - `DELETE /api/chat/sessions/:id` - Penghapusan sesi obrolan.
  - `DELETE /api/chat/sessions/:id/messages` - Pengosongan pesan dalam sesi aktif.
  - `POST /api/chat/upload` - Penanganan unggahan berkas lampiran (PDF, PNG, dokumen, kode) dengan `multer`.
  - `POST /api/chat/messages/:id/reactions` - Pengelolaan reaksi emoji interaktif pada balon pesan.
- **Koleksi Postman**:
  - Berkas koleksi lengkap `antigravity-web-chats-postman-collection.json` untuk pengujian seluruh endpoint.

### Changed
- **Pengalihan Port Default**:
  - Port backend dialihkan dari 3000 menjadi **`3003`** sesuai konfigurasi terpusat di `.env`.
- **Pengelompokan Direktori**:
  - Server dipindahkan ke dalam subdirektori monorepo `apps-chats/backend`.
- **Pembersihan Data Sesi Awal**:
  - Store sesi dibersihkan dari template percakapan dummy lama (`messages: []`).
