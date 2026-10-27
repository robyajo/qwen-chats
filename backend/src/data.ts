import type { AIModel, ChatSession, QwenThinkingMode } from "./types.ts"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadInitialSessions(): ChatSession[] {
  const syncedFile = path.join(__dirname, "qwen-synced-sessions.json")
  if (fs.existsSync(syncedFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(syncedFile, "utf-8"))
      if (Array.isArray(data) && data.length > 0) {
        return data
      }
    } catch {}
  }

  return [
    {
      id: "session-1",
      title: "Percakapan Baru Qwen3.8",
      timestamp: "Baru saja",
      period: "Today",
      model: "qwen-3.8-max",
      messages: [],
    },
  ]
}

const DEFAULT_THINKING_MODES: QwenThinkingMode[] = ["Auto", "Fast", "Thinking"]

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: "qwen-3.8-max",
    name: "Qwen3.8-Max",
    provider: "Alibaba Cloud (Qwen)",
    badge: "Flagship 3.8",
    description: "The flagship of Qwen3.8 model delivering state-of-the-art performance.",
    supportedEfforts: ["low", "medium", "high"],
    supportedThinkingModes: DEFAULT_THINKING_MODES,
  },
  {
    id: "qwen-3.8-omni-flash",
    name: "Qwen3.8-Omni-Flash",
    provider: "Alibaba Cloud (Qwen)",
    badge: "Omni Multimodal 3.8",
    description: "The latest native multimodal large language model in the Qwen3.8 series, supporting text, images, audio, and audiovisual input.",
    supportedEfforts: ["low", "medium"],
    supportedThinkingModes: DEFAULT_THINKING_MODES,
  },
  {
    id: "qwen-3.7-max",
    name: "Qwen3.7-Max",
    provider: "Alibaba Cloud (Qwen)",
    badge: "Flagship 3.7",
    description: "The flagship Qwen3.7 model delivering state-of-the-art performance. Currently text-only (no vision capabilities).",
    supportedEfforts: ["low", "medium", "high"],
    supportedThinkingModes: DEFAULT_THINKING_MODES,
  },
  {
    id: "qwen-3.7-plus",
    name: "Qwen3.7-Plus",
    provider: "Alibaba Cloud (Qwen)",
    badge: "High-Performance 3.7",
    description: "The high-performance large language model in the Qwen3.7 series, supporting text and multimodal tasks.",
    supportedEfforts: ["low", "medium", "high"],
    supportedThinkingModes: DEFAULT_THINKING_MODES,
  },
  {
    id: "qwen-3.6-plus",
    name: "Qwen3.6-Plus",
    provider: "Alibaba Cloud (Qwen)",
    badge: "Multimodal 3.6",
    description: "The latest large language model in the Qwen3.6 series, supporting text and multimodal tasks.",
    supportedEfforts: ["medium"],
    supportedThinkingModes: DEFAULT_THINKING_MODES,
  },
  {
    id: "qwen-3.5-plus",
    name: "Qwen3.5-Plus",
    provider: "Alibaba Cloud (Qwen)",
    badge: "Multimodal 3.5",
    description: "The latest large language model in the Qwen3.5 series, supporting text and multimodal tasks.",
    supportedEfforts: ["medium"],
    supportedThinkingModes: DEFAULT_THINKING_MODES,
  },
  {
    id: "qwen-3.5-omni-plus",
    name: "Qwen3.5-Omni-Plus",
    provider: "Alibaba Cloud (Qwen)",
    badge: "Omni Multimodal 3.5",
    description: "The most powerful native multimodal large language model in the Qwen3.5 series.",
    supportedEfforts: ["medium", "high"],
    supportedThinkingModes: DEFAULT_THINKING_MODES,
  },
]

export const sessionsStore: ChatSession[] = loadInitialSessions()
