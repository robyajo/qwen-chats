---
name: qwen-chat-frontend
description: Kembangkan, perbaiki, dan kelola antarmuka obrolan Antigravity Web-Chats (React 19, Vite, Tailwind CSS v4, Base UI, shadcn, Shiki code highlighter, dan streaming SSE).
---

# Qwen Chat Frontend Skill

Skill ini memuat panduan teknis dan standar rekayasa untuk mengelola dan mengembangkan antarmuka pengguna **Antigravity Web-Chats** (`frontend/`).

---

## 🎯 Lingkup Keahlian

- **Framework**: React 19 dengan Hooks fungsional (`useState`, `useEffect`, `useCallback`, `useMemo`).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` (konfigurasi di `src/index.css`).
- **Komponen UI**: `@base-ui/react` + primitives shadcn (`src/components/ui/`).
- **Syntax Highlighting**: Shiki dual-theme (Dark/Light) terintegrasi pada `src/lib/highlighter.tsx`.
- **Streaming Client**: Konsumsi chunk Server-Sent Events (SSE) secara asinkron dari backend `/api/chat/stream`.
- **Integrasi Backend**: Reverse proxy Vite ke `http://localhost:3004` untuk path `/api`, `/uploads`, dan `/v1`.

---

## 🏗️ Struktur & Hirarki Komponen

```
App.tsx (State Central)
├── SidebarProvider
│   ├── ChatSidebar (Daftar sesi, pencarian, tombol New Chat)
│   └── SidebarInset
│       ├── ChatHeader (Judul sesi aktif, indikator model, toggle tema & settings)
│       └── Main Content
│           ├── ChatContainer (Daftar pesan, scrolling, typing animation)
│           │   └── ChatMessageItem (Gelembung pesan, avatar, reaksi, status reasoning)
│           │       └── CodeDisplay (Shiki syntax highlighted blocks + copy button)
│           ├── ChatInput (Textarea dinamis, attachment file picker, reasoning effort selector)
│           ├── SettingsDialog (Konfigurasi model, reasoning effort, & tema)
│           └── ConfigPage (Halaman inspeksi status server, DPAPI token, & browser cookie)
```

---

## 💡 Pola Konsumsi Streaming SSE

Saat mengirim pesan obrolan di `App.tsx`, konsumsi stream dari endpoint backend menggunakan `fetch` dan `ReadableStream`:

```typescript
const response = await fetch("/api/chat/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId: activeSessionId,
    model: currentModelId,
    message: { content: promptText, attachments },
    options: { effort: reasoningEffort }
  }),
});

if (!response.ok || !response.body) {
  throw new Error("Gagal memulai streaming dari backend");
}

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const rawChunk = decoder.decode(value, { stream: true });
  const lines = rawChunk.split("\n").filter((line) => line.startsWith("data: "));

  for (const line of lines) {
    const jsonStr = line.slice(6).trim();
    if (!jsonStr) continue;

    try {
      const payload = JSON.parse(jsonStr);
      if (payload.type === "content") {
        // Tambahkan delta teks ke pesan asisten aktif
        updateAssistantMessage(payload.delta);
      } else if (payload.type === "thinking") {
        // Tampilkan fase reasoning
        setThinkingStatus(payload.delta);
      } else if (payload.type === "done") {
        setIsGenerating(false);
      }
    } catch (e) {
      console.warn("Gagal parse chunk SSE:", e);
    }
  }
}
```

---

## 🎨 Konvensi Desain & Tailwind CSS v4

1. **Variabel Warna Tema**:
   - Selalu gunakan semantic variables: `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, `bg-primary`.
   - Hindari hardcoded color hex (`#111827`) di dalam komponen UI; manfaatkan class Tailwind.
2. **Dukungan Dark Mode**:
   - Pastikan dark mode bekerja sempurna melalui selector `.dark`.
   - Gunakan `dark:bg-...` dan `dark:text-...` pada elemen khusus bila diperlukan.
3. **Responsivitas**:
   - Manfaatkan hook `useIsMobile()` dari `@/hooks/use-mobile.ts` untuk menampilkan tampilan mobile sheet pada sidebar di layar sempit (`< 768px`).

---

## 🧪 Verifikasi & Build Frontend

```bash
cd frontend

# 1. Pengecekan tipe TypeScript (tanpa emit)
npm run typecheck

# 2. Linting
npm run lint

# 3. Build bundle produksi
npm run build
```
Pastikan `npm run build` menyelesaikan bundling tanpa error.
