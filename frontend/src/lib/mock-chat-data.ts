import type { AIModel, ChatSession } from "@/types/chat"

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: "qwen-3.8-max",
    name: "Qwen3.8-Max",
    provider: "Alibaba Cloud (Qwen)",
    badge: "Flagship 3.8",
    description: "The flagship of Qwen3.8 model delivering state-of-the-art performance.",
    supportedEfforts: ["low", "medium", "high"],
  },
  {
    id: "qwen-3.8-omni-flash",
    name: "Qwen3.8-Omni-Flash",
    provider: "Alibaba Cloud (Qwen)",
    badge: "Omni Multimodal 3.8",
    description: "The latest native multimodal large language model in the Qwen3.8 series, supporting text, images, audio, and audiovisual input.",
    supportedEfforts: ["low", "medium"],
  },
  {
    id: "qwen-3.7-max",
    name: "Qwen3.7-Max",
    provider: "Alibaba Cloud (Qwen)",
    badge: "Flagship 3.7",
    description: "The flagship Qwen3.7 model delivering state-of-the-art performance. Currently text-only (no vision capabilities).",
    supportedEfforts: ["low", "medium", "high"],
  },
  {
    id: "qwen-3.7-plus",
    name: "Qwen3.7-Plus",
    provider: "Alibaba Cloud (Qwen)",
    badge: "High-Performance 3.7",
    description: "The high-performance large language model in the Qwen3.7 series, supporting text and multimodal tasks.",
    supportedEfforts: ["low", "medium", "high"],
  },
  {
    id: "qwen-3.6-plus",
    name: "Qwen3.6-Plus",
    provider: "Alibaba Cloud (Qwen)",
    badge: "Multimodal 3.6",
    description: "The latest large language model in the Qwen3.6 series, supporting text and multimodal tasks.",
    supportedEfforts: ["medium"],
  },
  {
    id: "qwen-3.5-plus",
    name: "Qwen3.5-Plus",
    provider: "Alibaba Cloud (Qwen)",
    badge: "Multimodal 3.5",
    description: "The latest large language model in the Qwen3.5 series, supporting text and multimodal tasks.",
    supportedEfforts: ["medium"],
  },
  {
    id: "qwen-3.5-omni-plus",
    name: "Qwen3.5-Omni-Plus",
    provider: "Alibaba Cloud (Qwen)",
    badge: "Omni Multimodal 3.5",
    description: "The most powerful native multimodal large language model in the Qwen3.5 series.",
    supportedEfforts: ["medium", "high"],
  },
]

export const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "session-1",
    title: "Percakapan Baru Qwen3.8",
    timestamp: "Baru saja",
    period: "Today",
    model: "qwen-3.8-max",
    messages: [],
  },
]

export const SUGGESTED_PROMPTS = [
  {
    title: "State-of-the-Art Performance",
    description: "Eksplorasi flagship Qwen3.8-Max untuk penalaran tingkat tinggi",
    icon: "Brain",
    prompt: "Jelaskan arsitektur dan keunggulan utama model flagship Qwen3.8-Max dibanding generasi sebelumnya.",
  },
  {
    title: "Native Omni Multimodal",
    description: "Kemampuan audiovisual, audio, gambar, dan teks Qwen3.8-Omni-Flash",
    icon: "Layout",
    prompt: "Bagaimana cara kerja input multimodal audiovisual dan audio secara real-time pada Qwen3.8-Omni-Flash?",
  },
  {
    title: "High-Performance Qwen3.7-Plus",
    description: "Model multimodal efisien untuk tugas coding dan analisis",
    icon: "Code",
    prompt: "Buatkan contoh fungsi TypeScript React 19 untuk menangani streaming SSE dengan reconnect otomatis.",
  },
  {
    title: "Integrasi MCP Qwen Desktop",
    description: "Penggunaan bun dan uvx untuk eksekusi perkakas lokal",
    icon: "Palette",
    prompt: "Jelaskan bagaimana aplikasi desktop Qwen mengintegrasikan bun.exe dan uvx.exe untuk menjalankan tool MCP.",
  },
]
