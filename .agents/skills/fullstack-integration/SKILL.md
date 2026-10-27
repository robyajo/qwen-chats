---
name: fullstack-integration
description: Panduan orkestrasi full-stack E2E, integrasi cross-service antara backend Express, frontend React 19, dan sesi CDP Qwen Desktop port 9222.
---

# Full-Stack Integration Skill

Skill ini memuat prosedur orkestrasi terpadu untuk menjalankan, menguji, dan mendebug sistem **Antigravity Qwen-Chats** secara menyeluruh (Frontend + Backend + Native Qwen Desktop).

---

## 🚀 Prosedur Menjalankan Sistem Lokal

### Langkah 1: Memastikan Qwen Desktop Aktif dengan CDP (Port 9222)
Pastikan Qwen Desktop berjalan dengan remote debugging port `9222`:
```powershell
Start-Process "C:\Users\$env:USERNAME\AppData\Local\Programs\Qwen\Qwen.exe" -ArgumentList "--remote-debugging-port=9222"
```
Verifikasi port aktif:
```bash
curl http://127.0.0.1:9222/json/list
```

### Langkah 2: Menjalankan Backend Express (Port 3004)
```bash
cd backend
npm run dev
# Atau untuk mode produksi:
npm start
```
Akses status bridge di: `http://localhost:3004/api/bridge/status`

### Langkah 3: Menjalankan Frontend Vite (Port 5174)
```bash
cd frontend
npm run dev
```
Buka browser di: `http://localhost:5174`

---

## 🧪 Matriks Verifikasi Pengujian E2E (Checklist)

| Skenario Pengujian | Perintah / Uji Coba | Hasil yang Diharapkan |
| :--- | :--- | :--- |
| **Konektivitas CDP** | `GET /api/bridge/status` | `cdpConnected: true`, `targetsCount > 0` |
| **Katalog Model OpenAI** | `GET /v1/models` | Mengembalikan 7 model Qwen dalam format `list` OpenAI |
| **Chat Non-Streaming** | `POST /v1/chat/completions` (`stream: false`) | Mengembalikan objek `chat.completion` dengan jawaban valid |
| **Chat Streaming SSE** | `POST /v1/chat/completions` (`stream: true`) | Mengalirkan token per token secara berkala dan diakhiri `[DONE]` |
| **Web Dashboard** | Buka `http://localhost:3004/bridge` di browser | Menampilkan status badge hijau, daftar model, playground, dan panduan klien |
| **Sinkronisasi Sesi Web** | `POST /api/session/extract-local` | Mengekstrak token DPAPI dan menyinkronkan daftar sesi obrolan |

---

## 🔧 Panduan Troubleshooting Masalah Umum

### 1. Masalah: "Port CDP 9222 tidak aktif"
- **Penyebab**: Aplikasi Qwen ditutup atau berjalan tanpa parameter `--remote-debugging-port=9222`.
- **Solusi**:
  1. Jalankan endpoint peluncur: `curl -X POST http://localhost:3004/api/bridge/launch`.
  2. Atau jalankan perintah PowerShell:
     ```powershell
     Stop-Process -Name "Qwen" -Force -ErrorAction SilentlyContinue
     Start-Process "$env:LOCALAPPDATA\Programs\Qwen\Qwen.exe" -ArgumentList "--remote-debugging-port=9222"
     ```

### 2. Masalah: Client OpenAI Mengalami Timeout saat Streaming
- **Penyebab**: Event listener request close salah (`req.on("close")`), menyebabkan koneksi ditutup sebelum asisten selesai menghasilkan token.
- **Solusi**: Pastikan `res.on("close", ...)` yang digunakan, dan `res.write("data: [DONE]\n\n")` dipanggil sebelum `res.end()`.

### 3. Masalah: Error RGV587 / SecToken TMD Captcha
- **Penyebab**: Memanggil API `chat.qwen.ai` secara langsung melalui `fetch()` Node.js tanpa lingkungan peramban asli.
- **Solusi**: Selalu gunakan jembatan CDP `chatViaQwenDesktopCDP` atau `streamViaQwenDesktopCDP` yang beroperasi di dalam konteks webview Electron otentik.
