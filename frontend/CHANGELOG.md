# Changelog - Antigravity Web-Chats Frontend

Semua perubahan penting pada aplikasi antarmuka pengguna (Frontend React 19 + shadcn/ui) didokumentasikan dalam berkas ini. Format mengacu pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] - 2026-10-27

### Added
- **Arsitektur Antarmuka Percakapan shadcn/ui (`base-nova`)**:
  - Pemanfaatan komponen primitif resmi `@base-ui/react` dan Tailwind CSS v4 dengan gamut warna OKLCH.
  - Komposisi chat modular:
    - `MessageScroller`, `MessageScrollerViewport`, `MessageScrollerContent`, `MessageScrollerItem`, `MessageScrollerButton` untuk penanganan *auto-scrolling*, *scroll anchoring*, dan navigasi cepat ke baris terbaru.
    - `Message`, `MessageAvatar`, `MessageContent`, `MessageHeader`, `MessageFooter` untuk penataan baris pesan semantik (`align="end"` untuk pengguna, `align="start"` untuk asisten).
    - `Bubble`, `BubbleContent`, `BubbleReactions` untuk permukaan balon obrolan dan chip reaksi emoji interaktif (👍, ❤️, 🚀).
    - `AttachmentGroup`, `Attachment`, `AttachmentMedia`, `AttachmentContent`, `AttachmentTitle`, `AttachmentDescription`, `AttachmentActions` untuk pratinjau lampiran berkas fisik sebelum dan sesudah dikirim.
    - `Marker`, `MarkerIcon`, `MarkerContent` untuk penanda pembatas tanggal dan status sesi sistem.
    - `CodeBlock`, `CodeBlockHeader`, `CodeBlockTitle`, `CodeBlockActions`, `CodeBlockCopyButton`, `CodeBlockContent`, `CodeBlockLine` dengan penomoran baris dan tombol salin satu-klik.
- **Model Selector & Google Gemini Series**:
  - Dropdown pemilihan model terstruktur di Header atas obrolan.
  - Model unggulan default: **`Gemini 3.8 Flash`** (*Next-Gen Flash*).
  - Pengelompokan kategori model: *Google Gemini Series* dan *Model Alternatif*.
- **Reasoning Effort Selector (Tingkat Penalaran)**:
  - Tombol kontrol dropdown interaktif di Header: **`Effort: Low | Medium | High`**.
  - Komponen `ToggleGroup` pada dialog pengaturan (Tab Parameter) untuk memilih intensitas penalaran.
  - Tampilan indikator berpikir: `Gemini 3.8 Flash [Effort: HIGH] sedang merumuskan jawaban...`.
  - Badge semantik pada balon asisten: `Gemini 3.8 Flash • Effort: high`.
- **Indikator & Inspector Kredensial AI**:
  - Badge status otorisasi di Header obrolan.
  - Dialog pengaturan komprehensif dengan tab kredensial, parameter, dan preferensi umum.
  - Inspector token dan API Keys dengan toggle sembunyikan/tampilkan dan tombol salin.
- **Komposer Pesan Interaktif (`chat-input.tsx`)**:
  - Berbasis `InputGroup`, `InputGroupTextarea`, `InputGroupAddon`, dan `InputGroupButton`.
  - Textarea multi-baris auto-expanding menyesuaikan isi ketikan.
  - Pilihan pelampiran berkas via file picker lokal.
  - Toggle cepat untuk fitur *Web Search* dan *Deep Think*.
- **Pintasan Keyboard (*Keyboard Shortcuts*)**:
  - `Enter`: Mengirim pesan.
  - `Shift + Enter`: Membuat baris baru di textarea.
  - `⌘N` / `Ctrl + N`: Membuat sesi obrolan baru.
  - `d`: Beralih antara mode gelap (*Dark mode*) dan mode terang (*Light mode*).
- **Vite Proxy Terpadu**:
  - Konfigurasi `vite.config.ts` untuk mem-proxy rute `/api` dan `/uploads` secara otomatis ke backend Express port `3003`.
  - Dukungan variabel dinamis `process.env.BACKEND_PORT`.

### Removed
- **Pembersihan Total Data Dummy / Mock Chat**:
  - Menghapus seluruh percakapan hardcoded lama (*design-spec.pdf*, *dump_trace.bin*, dll.) dari `INITIAL_SESSIONS`.
  - Menghapus fungsi simulasi balasan lokal (`runLocalSimulation`) dan string template hardcoded.
  - Frontend beralih murni sebagai *Presentation Layer* yang hanya menerima input dari pengguna dan mendelegasikan pemrosesan ke backend Express port `3003`.

### Changed
- **Pengelompokan Direktori**:
  - Kode antarmuka dipindahkan ke dalam subdirektori monorepo `apps-chats/frontend`.
