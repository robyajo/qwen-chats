import * as React from "react"
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group"
import {
  AttachmentGroup,
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { MessageAttachment } from "@/types/chat"
import {
  ArrowUpIcon,
  PaperclipIcon,
  GlobeIcon,
  SparklesIcon,
  XIcon,
  FileTextIcon,
  ImageIcon,
} from "lucide-react"

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: MessageAttachment[], options?: { deepReasoning?: boolean; webSearch?: boolean }) => void
  disabled?: boolean
  initialPrompt?: string
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  initialPrompt = "",
}: ChatInputProps) {
  const [text, setText] = React.useState("")
  const [attachments, setAttachments] = React.useState<MessageAttachment[]>([])
  const [isWebSearch, setIsWebSearch] = React.useState(false)
  const [isDeepReasoning, setIsDeepReasoning] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (initialPrompt) {
      setText(initialPrompt)
      textareaRef.current?.focus()
    }
  }, [initialPrompt])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed && attachments.length === 0) return
    if (disabled) return

    onSendMessage(trimmed, attachments.length > 0 ? attachments : undefined, {
      webSearch: isWebSearch,
      deepReasoning: isDeepReasoning,
    })

    setText("")
    setAttachments([])
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newAttachments: MessageAttachment[] = Array.from(files).map((file, idx) => ({
      id: `upload-${Date.now()}-${idx}`,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      type: file.type.startsWith("image/") ? "image" : "document",
      state: "done",
    }))

    setAttachments((prev) => [...prev, ...newAttachments])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Pending Attachments preview */}
      {attachments.length > 0 && (
        <AttachmentGroup className="mb-2 px-1">
          {attachments.map((att) => (
            <Attachment key={att.id} size="sm" state="done">
              <AttachmentMedia variant="icon">
                {att.type === "image" ? <ImageIcon /> : <FileTextIcon />}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{att.name}</AttachmentTitle>
                <AttachmentDescription>{att.size}</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction
                  onClick={() => handleRemoveAttachment(att.id)}
                  aria-label="Remove attachment"
                >
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />

      <form onSubmit={handleSubmit} className="relative">
        <InputGroup className="h-auto flex-col rounded-2xl bg-card border-border/80 shadow-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 transition-all p-2.5">
          <InputGroupTextarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              // Auto-expand textarea
              e.target.style.height = "auto"
              e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`
            }}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan apa saja, lampirkan dokumen, atau beri instruksi..."
            rows={1}
            disabled={disabled}
            className="min-h-11 max-h-48 text-sm px-2 py-1.5 focus-visible:ring-0"
          />

          <InputGroupAddon
            align="block-end"
            className="flex items-center justify-between gap-2 border-t border-border/50 pt-2.5 mt-1"
          >
            {/* Feature Toggles */}
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <InputGroupButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={disabled}
                      aria-label="Attach file"
                    />
                  }
                >
                  <PaperclipIcon />
                </TooltipTrigger>
                <TooltipContent>Lampirkan file atau gambar</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <InputGroupButton
                      variant={isWebSearch ? "secondary" : "ghost"}
                      size="xs"
                      onClick={() => setIsWebSearch(!isWebSearch)}
                      className={`gap-1 px-2 ${isWebSearch ? "bg-primary/10 text-primary border border-primary/20" : ""}`}
                      aria-label="Toggle web search"
                    />
                  }
                >
                  <GlobeIcon data-icon="inline-start" />
                  <span>Web Search</span>
                  {isWebSearch && (
                    <Badge variant="default" className="size-1.5 p-0 rounded-full" />
                  )}
                </TooltipTrigger>
                <TooltipContent>Cari informasi terbaru dari web</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <InputGroupButton
                      variant={isDeepReasoning ? "secondary" : "ghost"}
                      size="xs"
                      onClick={() => setIsDeepReasoning(!isDeepReasoning)}
                      className={`gap-1 px-2 ${isDeepReasoning ? "bg-primary/10 text-primary border border-primary/20" : ""}`}
                      aria-label="Toggle deep reasoning"
                    />
                  }
                >
                  <SparklesIcon data-icon="inline-start" />
                  <span>Deep Think</span>
                  {isDeepReasoning && (
                    <Badge variant="default" className="size-1.5 p-0 rounded-full" />
                  )}
                </TooltipTrigger>
                <TooltipContent>Analisis mendalam langkah demi langkah</TooltipContent>
              </Tooltip>
            </div>

            {/* Submit Action */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] text-muted-foreground select-none">
                <kbd className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">Enter</kbd> kirim
              </span>

              <InputGroupButton
                type="submit"
                variant="default"
                size="icon-sm"
                disabled={disabled || (!text.trim() && attachments.length === 0)}
                className="rounded-lg shadow-sm"
                aria-label="Send message"
              >
                <ArrowUpIcon />
              </InputGroupButton>
            </div>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </div>
  )
}
