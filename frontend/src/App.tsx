import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatHeader } from "@/components/chat/chat-header"
import { ChatContainer } from "@/components/chat/chat-container"
import { ChatInput } from "@/components/chat/chat-input"
import { SettingsDialog } from "@/components/chat/settings-dialog"
import { ConfigPage } from "@/components/chat/config-page"
import { INITIAL_SESSIONS, AVAILABLE_MODELS } from "@/lib/mock-chat-data"
import type { ChatSession, ChatMessage, MessageAttachment, ReasoningEffort, AIModel } from "@/types/chat"

export function App() {
  const [sessions, setSessions] = React.useState<ChatSession[]>(INITIAL_SESSIONS)
  const [activeSessionId, setActiveSessionId] = React.useState<string>(INITIAL_SESSIONS[0].id)
  const [availableModels, setAvailableModels] = React.useState<AIModel[]>(AVAILABLE_MODELS)
  const [currentModelId, setCurrentModelId] = React.useState<string>("qwen-3.8-max")
  const [reasoningEffort, setReasoningEffort] = React.useState<ReasoningEffort>("medium")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [activePrompt, setActivePrompt] = React.useState("")
  const [activeView, setActiveView] = React.useState<"chat" | "config">("chat")
  const [isDark, setIsDark] = React.useState(() => {
    return document.documentElement.classList.contains("dark")
  })

  // Synchronize with backend on mount
  React.useEffect(() => {
    // 1. Fetch active config (model & effort default from .env)
    fetch("/api/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.data?.model) {
          if (data.data.model.default) setCurrentModelId(data.data.model.default)
          if (data.data.model.effort) setReasoningEffort(data.data.model.effort)
        }
      })
      .catch(() => {})

    // 2. Fetch models from backend
    fetch("/api/chat/models")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
          setAvailableModels(data.data)
        }
      })
      .catch(() => {})

    // 3. Fetch sessions from backend
    fetch("/api/chat/sessions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
          setSessions(data.data)
          setActiveSessionId(data.data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  // Dark mode effect
  const toggleTheme = React.useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      return next
    })
  }, [])

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable

      if (e.key === "d" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        toggleTheme()
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault()
        handleNewChat()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleTheme])

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0]

  const activeModel =
    availableModels.find((m) => m.id === currentModelId) ?? availableModels[0]

  // Create new session purely via backend
  const handleNewChat = () => {
    fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Percakapan Baru Qwen",
        model: currentModelId,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.data) {
          setSessions((prev) => [data.data, ...prev])
          setActiveSessionId(data.data.id)
          setActivePrompt("")
          setActiveView("chat")
        } else {
          const fallbackId = `session-${Date.now()}`
          const fallback: ChatSession = {
            id: fallbackId,
            title: "Percakapan Baru Qwen",
            timestamp: "Baru saja",
            period: "Today",
            model: currentModelId,
            messages: [],
          }
          setSessions((prev) => [fallback, ...prev])
          setActiveSessionId(fallbackId)
          setActivePrompt("")
        }
      })
      .catch(() => {
        const fallbackId = `session-${Date.now()}`
        const fallback: ChatSession = {
          id: fallbackId,
          title: "Percakapan Baru",
          timestamp: "Baru saja",
          period: "Today",
          model: currentModelId,
          messages: [],
        }
        setSessions((prev) => [fallback, ...prev])
        setActiveSessionId(fallbackId)
        setActivePrompt("")
      })
  }

  // Delete session via backend
  const handleDeleteSession = (id: string) => {
    fetch(`/api/chat/sessions/${id}`, { method: "DELETE" }).catch(() => {})
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id)
      if (updated.length === 0) {
        handleNewChat()
        return []
      }
      if (activeSessionId === id) {
        setActiveSessionId(updated[0].id)
      }
      return updated
    })
  }

  // Clear messages via backend
  const handleClearChat = () => {
    fetch(`/api/chat/sessions/${activeSessionId}/messages`, { method: "DELETE" }).catch(() => {})
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [] } : s))
    )
  }

  // Toggle reaction via backend
  const handleReactionToggle = (messageId: string, emoji: string) => {
    fetch(`/api/chat/messages/${messageId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.reactions) {
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== activeSessionId) return s
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === messageId ? { ...m, reactions: data.reactions } : m
                ),
              }
            })
          )
        }
      })
      .catch(() => {})
  }

  // Purely send user input to backend (NO template chat in frontend)
  const handleSendMessage = (
    content: string,
    attachments?: MessageAttachment[],
    options?: { deepReasoning?: boolean; webSearch?: boolean }
  ) => {
    const userMessageId = `msg-${Date.now()}`
    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content,
      attachments,
      timestamp: nowTime,
    }

    // Immediately reflect user message in UI
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s
        const isDefaultTitle = s.title === "Percakapan Baru"
        const nextTitle = isDefaultTitle
          ? content.slice(0, 32).trim() + (content.length > 32 ? "..." : "")
          : s.title
        return {
          ...s,
          title: nextTitle || "Percakapan Baru",
          messages: [...s.messages, userMessage],
        }
      })
    )

    setIsGenerating(true)

    // Send strictly to backend
    fetch("/api/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: activeSessionId,
        model: currentModelId,
        effort: reasoningEffort,
        content,
        attachments,
        options,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (data && data.success && data.assistantMessage) {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? {
                    ...s,
                    title:
                      s.title === "Percakapan Baru" && content
                        ? content.slice(0, 32).trim() + (content.length > 32 ? "..." : "")
                        : s.title,
                    messages: [
                      ...s.messages.filter((m) => m.id !== userMessageId),
                      data.userMessage,
                      data.assistantMessage,
                    ],
                  }
                : s
            )
          )
        }
      })
      .catch((err) => {
        const errorMessage: ChatMessage = {
          id: `msg-err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ Gagal terhubung ke backend Express: ${err.message}. Pastikan server backend sedang aktif di port 3000.`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          model: activeModel.name,
          status: "error",
        }
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, errorMessage] }
              : s
          )
        )
      })
      .finally(() => {
        setIsGenerating(false)
      })
  }

  // Regenerate last assistant turn by calling backend
  const handleRegenerate = (messageId: string) => {
    const session = sessions.find((s) => s.id === activeSessionId)
    if (!session) return
    const msgIdx = session.messages.findIndex((m) => m.id === messageId)
    const prevUserMsg = session.messages
      .slice(0, msgIdx)
      .reverse()
      .find((m) => m.role === "user")
    if (prevUserMsg) {
      handleSendMessage(prevUserMsg.content, prevUserMsg.attachments)
    }
  }

  const handleShareChat = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        alert("Tautan percakapan berhasil disalin ke papan klip!")
      })
      .catch(() => {})
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-svh w-full overflow-hidden bg-background text-foreground">
        {/* Left Navigation Sidebar */}
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => {
            setActiveSessionId(id)
            setActiveView("chat")
          }}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenConfig={() => setActiveView("config")}
          onSelectChatView={() => setActiveView("chat")}
          activeView={activeView}
        />

        {/* Main Workspace */}
        <SidebarInset className="flex flex-col h-full min-w-0 overflow-hidden bg-background">
          {/* Top Bar Header */}
          <ChatHeader
            currentModelId={currentModelId}
            onModelChange={setCurrentModelId}
            reasoningEffort={reasoningEffort}
            onEffortChange={setReasoningEffort}
            chatTitle={activeSession.title}
            onClearChat={handleClearChat}
            onOpenSettings={() => setSettingsOpen(true)}
            onShareChat={handleShareChat}
            onOpenConfig={() => setActiveView((prev) => (prev === "config" ? "chat" : "config"))}
            activeView={activeView}
          />

          {activeView === "config" ? (
            <ConfigPage onBackToChat={() => setActiveView("chat")} />
          ) : (
            <>
              {/* Central Scrollable Message Thread */}
              <ChatContainer
                messages={activeSession.messages}
                isGenerating={isGenerating}
                currentModelName={activeModel.name}
                reasoningEffort={reasoningEffort}
                onSelectPrompt={(prompt) => {
                  setActivePrompt(prompt)
                }}
                onReactionToggle={handleReactionToggle}
                onRegenerate={handleRegenerate}
              />

              {/* Bottom Chat Prompt Composer */}
              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isGenerating}
                initialPrompt={activePrompt}
              />
            </>
          )}
        </SidebarInset>

        {/* Settings Dialog */}
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          reasoningEffort={reasoningEffort}
          onEffortChange={setReasoningEffort}
        />
      </div>
    </SidebarProvider>
  )
}

export default App
