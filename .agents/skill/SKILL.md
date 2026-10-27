---
name: qwen-chats-skill
description: Pengetahuan utama sistem Antigravity Qwen-Chats untuk AI coding agent yang bekerja pada backend Express (Local Bridge CDP 9222) dan frontend React 19.
---

# Antigravity Qwen-Chats Agent Skill

Skill terpadu ini merangkum arsitektur, standar kode, dan prosedur operasional repositori **Antigravity Qwen-Chats**.

---

## 📌 Indeks Pengetahuan Khusus

Dokumentasi dan skill terinci dibagi ke dalam tiga spesialisasi:
1. **Backend & CDP Bridge**: Lihat panduan lengkap di `.agents/skills/qwen-bridge-backend/SKILL.md` atau `backend/QWEN_INTEGRATION.md`.
2. **Frontend React 19**: Lihat panduan lengkap di `.agents/skills/qwen-chat-frontend/SKILL.md`.
3. **Integrasi Full-Stack & Runbook E2E**: Lihat panduan lengkap di `.agents/skills/fullstack-integration/SKILL.md`.
4. **Pedoman Teknik Menyeluruh**: Lihat file utama `AGENTS.md` pada root repositori.

---

## ⚡ Ringkasan Cepat Endpoint & Port

- **Backend Server**: `http://localhost:3004`
- **Frontend App**: `http://localhost:5174`
- **Qwen Desktop CDP**: `http://127.0.0.1:9222`
- **OpenAI Compatible Base URL**: `http://localhost:3004/v1`
  - Chat Completion: `POST /v1/chat/completions` (JSON & SSE stream)
  - Models Catalog: `GET /v1/models`
- **Web Dashboard**: `http://localhost:3004/bridge`
