import * as React from "react"
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller"
import { Marker, MarkerIcon, MarkerContent } from "@/components/ui/marker"
import { ChatMessageItem } from "@/components/chat/chat-message-item"
import { ChatEmptyState } from "@/components/chat/chat-empty-state"
import { Spinner } from "@/components/ui/spinner"
import type { ChatMessage, ReasoningEffort } from "@/types/chat"
import { SparklesIcon } from "lucide-react"

interface ChatContainerProps {
  messages: ChatMessage[]
  isGenerating?: boolean
  currentModelName: string
  reasoningEffort?: ReasoningEffort
  onSelectPrompt: (prompt: string) => void
  onReactionToggle?: (messageId: string, emoji: string) => void
  onRegenerate?: (messageId: string) => void
}

export function ChatContainer({
  messages,
  isGenerating = false,
  currentModelName,
  reasoningEffort = "medium",
  onSelectPrompt,
  onReactionToggle,
  onRegenerate,
}: ChatContainerProps) {
  const bottomAnchorRef = React.useRef<HTMLDivElement>(null)

  // Scroll smoothly to bottom on every new message or generating update
  React.useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isGenerating])

  // Instant scroll on initial load or session switch
  React.useLayoutEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "instant", block: "end" })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <ChatEmptyState
        onSelectPrompt={onSelectPrompt}
        currentModelName={currentModelName}
      />
    )
  }

  return (
    <div className="relative flex-1 min-h-0 w-full overflow-hidden">
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="size-full">
          <MessageScrollerViewport className="p-4 sm:p-6 scroll-smooth">
            <MessageScrollerContent className="max-w-4xl mx-auto w-full flex flex-col gap-6">
              {/* Start Session Marker */}
              <MessageScrollerItem messageId="marker-start">
                <Marker variant="separator" className="my-2">
                  <MarkerContent className="text-xs">Sesi Percakapan Aktif</MarkerContent>
                </Marker>
                <Marker variant="default" className="justify-center mt-1">
                  <MarkerIcon>
                    <SparklesIcon className="text-primary size-3.5" />
                  </MarkerIcon>
                  <MarkerContent className="text-xs text-muted-foreground">
                    Tersambung ke engine <strong>{currentModelName}</strong>
                  </MarkerContent>
                </Marker>
              </MessageScrollerItem>

              {/* Message List */}
              {messages.map((message, idx) => (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={idx === messages.length - 1}
                >
                  <ChatMessageItem
                    message={message}
                    onReactionToggle={onReactionToggle}
                    onRegenerate={onRegenerate}
                  />
                </MessageScrollerItem>
              ))}

              {/* Generating / Thinking indicator item */}
              {isGenerating && (
                <MessageScrollerItem messageId="generating-indicator" scrollAnchor>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/50 border border-border/40 w-fit text-xs text-muted-foreground shadow-xs">
                    <Spinner className="text-primary size-3.5" />
                    <span className="font-medium animate-pulse">
                      {currentModelName} [{reasoningEffort}] sedang merumuskan jawaban...
                    </span>
                  </div>
                </MessageScrollerItem>
              )}

              {/* Invisible Bottom Anchor for guaranteed scroll-to-bottom */}
              <div ref={bottomAnchorRef} className="h-6 w-full shrink-0" aria-hidden="true" />
            </MessageScrollerContent>
          </MessageScrollerViewport>

          {/* Jump to bottom button */}
          <MessageScrollerButton direction="end" />
        </MessageScroller>
      </MessageScrollerProvider>
    </div>
  )
}
