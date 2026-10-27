export type MessageRole = "user" | "assistant" | "system"
export type QwenThinkingMode = "Auto" | "Fast" | "Thinking"
export type ReasoningEffort = "low" | "medium" | "high" | QwenThinkingMode

export interface MessageAttachment {
  id: string
  name: string
  size: string
  type: "image" | "code" | "document" | "archive"
  url?: string
  state?: "idle" | "uploading" | "processing" | "error" | "done"
}

export interface ChatReaction {
  emoji: string
  count: number
  reacted?: boolean
}

export interface CodeSnippet {
  language: string
  code: string
  filename?: string
  lineNumbers?: boolean
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  codeSnippets?: CodeSnippet[]
  attachments?: MessageAttachment[]
  timestamp: string
  reactions?: ChatReaction[]
  model?: string
  effort?: ReasoningEffort
  thinkingMode?: QwenThinkingMode
  status?: "streaming" | "complete" | "error"
  thinking?: string
}

export interface ChatSession {
  id: string
  title: string
  timestamp: string
  period: "Today" | "Yesterday" | "Previous 7 Days"
  model: string
  unreadCount?: number
  messages: ChatMessage[]
}

export interface AIModel {
  id: string
  name: string
  provider: string
  badge: string
  description: string
  icon?: string
  supportedEfforts?: ReasoningEffort[]
  supportedThinkingModes?: QwenThinkingMode[]
}
