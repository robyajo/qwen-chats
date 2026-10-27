import * as React from "react"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message"
import { Bubble, BubbleContent, BubbleReactions } from "@/components/ui/bubble"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CodeDisplay } from "@/components/chat/code-display"
import type { ChatMessage } from "@/types/chat"
import {
  BotIcon,
  UserIcon,
  CopyIcon,
  CheckIcon,
  DownloadIcon,
  FileTextIcon,
  FileArchiveIcon,
  ImageIcon,
  SparklesIcon,
  RotateCcwIcon,
} from "lucide-react"

interface ChatMessageItemProps {
  message: ChatMessage
  onReactionToggle?: (messageId: string, emoji: string) => void
  onRegenerate?: (messageId: string) => void
}

type ContentSegment =
  | { type: "text"; text: string }
  | { type: "code"; language: string; code: string; filename?: string }

/**
 * Parses markdown into text segments and code block segments.
 */
function parseMessageSegments(content: string): ContentSegment[] {
  if (!content) return []

  const segments: ContentSegment[] = []
  const codeBlockRegex = /```\s*([a-zA-Z0-9_\-\.]*)\s*\r?\n([\s\S]*?)(?:```|$)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let snippetIndex = 1

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text preceding the code block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index)
      if (text.trim().length > 0) {
        segments.push({ type: "text", text })
      }
    }

    let rawLang = (match[1] || "").toLowerCase().trim()
    const code = match[2].trim()
    if (!rawLang) {
      if (code.startsWith("<!DOCTYPE") || code.includes("<html")) rawLang = "html"
      else if (code.startsWith("{") && code.endsWith("}")) rawLang = "json"
      else rawLang = "typescript"
    }
    const lang = rawLang
    const ext =
      lang === "typescript" || lang === "ts"
        ? "ts"
        : lang === "javascript" || lang === "js"
          ? "js"
          : lang === "python" || lang === "py"
            ? "py"
            : lang === "json"
              ? "json"
              : lang === "bash" || lang === "sh" || lang === "shell"
                ? "sh"
                : lang === "sql"
                  ? "sql"
                  : lang === "html"
                    ? "html"
                    : lang === "css"
                      ? "css"
                      : "txt"

    segments.push({
      type: "code",
      language: lang,
      code,
      filename: `snippet-${snippetIndex}.${ext}`,
    })
    snippetIndex++
    lastIndex = match.index + match[0].length
  }

  // Add remaining trailing text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex)
    if (text.trim().length > 0) {
      segments.push({ type: "text", text })
    }
  }

  // Fallback: If no code block found, treat entire content as single text segment
  if (segments.length === 0 && content.trim().length > 0) {
    segments.push({ type: "text", text: content })
  }

  return segments
}

/**
 * Parses inline formatting: inline code (`code`), bold (**text**), links ([text](url))
 */
function renderInlineFormatting(line: string): React.ReactNode {
  // Regex to split by inline code `code`, bold **text**, and links [text](url)
  const tokens = line.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)

  return tokens.map((token, i) => {
    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      return (
        <code
          key={i}
          className="rounded px-1.5 py-0.5 font-mono text-[12px] bg-muted/80 text-foreground border border-border/50"
        >
          {token.slice(1, -1)}
        </code>
      )
    }

    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      )
    }

    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline hover:opacity-80"
        >
          {linkMatch[1]}
        </a>
      )
    }

    return token
  })
}

/**
 * Renders paragraphs, headings, blockquotes, and lists cleanly as standard AI chat UI.
 */
function renderParagraphs(text: string): React.ReactNode {
  const blocks = text.split("\n\n")

  return blocks.map((block, bIdx) => {
    const trimmed = block.trim()
    if (!trimmed) return null

    // Horizontal Rule
    if (trimmed === "---" || trimmed === "***") {
      return <hr key={bIdx} className="my-2 border-border/60" />
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      return (
        <h4 key={bIdx} className="font-bold text-sm text-foreground mt-2 mb-1">
          {renderInlineFormatting(trimmed.slice(4))}
        </h4>
      )
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={bIdx} className="font-bold text-base text-foreground mt-3 mb-1.5 pb-1 border-b border-border/40">
          {renderInlineFormatting(trimmed.slice(3))}
        </h3>
      )
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h2 key={bIdx} className="font-bold text-lg text-foreground mt-3 mb-1.5 pb-1 border-b border-border/40">
          {renderInlineFormatting(trimmed.slice(2))}
        </h2>
      )
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      return (
        <blockquote
          key={bIdx}
          className="border-l-2 border-primary/60 pl-3 my-1.5 italic text-muted-foreground text-xs"
        >
          {renderInlineFormatting(trimmed.slice(2))}
        </blockquote>
      )
    }

    // Lists (Ordered or Unordered)
    const lines = block.split("\n")
    const isList = lines.some(
      (l) =>
        /^\s*[-*•]\s+/.test(l) ||
        /^\s*\d+\.\s+/.test(l)
    )

    if (isList) {
      return (
        <div key={bIdx} className="flex flex-col gap-1.5 my-1">
          {lines.map((line, lIdx) => {
            const trimmedLine = line.trim()
            if (!trimmedLine) return null

            const isBullet = /^\s*[-*•]\s+/.test(trimmedLine)
            const isNumbered = /^\s*\d+\.\s+/.test(trimmedLine)

            if (isBullet) {
              const content = trimmedLine.replace(/^\s*[-*•]\s+/, "")
              return (
                <div key={lIdx} className="flex items-start gap-2 leading-relaxed">
                  <span className="size-1.5 rounded-full bg-primary/70 shrink-0 mt-2" />
                  <div className="flex-1 min-w-0">{renderInlineFormatting(content)}</div>
                </div>
              )
            }

            if (isNumbered) {
              const numMatch = trimmedLine.match(/^\s*(\d+)\.\s+(.*)/)
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 leading-relaxed">
                    <span className="font-mono text-xs font-semibold text-primary shrink-0 mt-0.5">
                      {numMatch[1]}.
                    </span>
                    <div className="flex-1 min-w-0">{renderInlineFormatting(numMatch[2])}</div>
                  </div>
                )
              }
            }

            return (
              <p key={lIdx} className="leading-relaxed">
                {renderInlineFormatting(line)}
              </p>
            )
          })}
        </div>
      )
    }

    // Regular Paragraph
    return (
      <p key={bIdx} className="leading-relaxed">
        {renderInlineFormatting(block)}
      </p>
    )
  })
}

export function ChatMessageItem({
  message,
  onReactionToggle,
  onRegenerate,
}: ChatMessageItemProps) {
  const isUser = message.role === "user"
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard
      .writeText(message.content)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon />
      case "archive":
        return <FileArchiveIcon />
      default:
        return <FileTextIcon />
    }
  }

  // Parse message into text and code segments
  const segments = React.useMemo(() => {
    return parseMessageSegments(message.content)
  }, [message.content])

  return (
    <Message align={isUser ? "end" : "start"} className="group/item">
      <MessageAvatar>
        <Avatar size="default" className="border border-border">
          <AvatarFallback
            className={
              isUser
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
            }
          >
            {isUser ? <UserIcon /> : <BotIcon />}
          </AvatarFallback>
        </Avatar>
      </MessageAvatar>

      <MessageContent>
        <MessageHeader className="gap-2">
          <span className="font-semibold text-foreground">
            {isUser ? "Anda" : (message.model ?? "Qwen AI")}
          </span>
          {!isUser && (
            <>
              <Badge variant="outline" className="text-[10px] py-0 h-4 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                Qwen Response
              </Badge>
              {message.effort && (
                <Badge
                  variant="secondary"
                  className="text-[10px] py-0 h-4 capitalize border border-border"
                >
                  Mode: {message.effort}
                </Badge>
              )}
            </>
          )}
          <span className="text-muted-foreground">{message.timestamp}</span>
        </MessageHeader>

        {/* Attachments if any */}
        {message.attachments && message.attachments.length > 0 && (
          <AttachmentGroup className="mb-1">
            {message.attachments.map((att) => (
              <Attachment
                key={att.id}
                state={att.state ?? "done"}
                size="default"
                orientation="horizontal"
              >
                <AttachmentMedia variant="icon">
                  {getAttachmentIcon(att.type)}
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{att.name}</AttachmentTitle>
                  <AttachmentDescription>{att.size}</AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction title="Download" aria-label="Download attachment">
                    <DownloadIcon />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            ))}
          </AttachmentGroup>
        )}

        {/* Bubble Surface */}
        <div className="relative">
          <Bubble
            variant={isUser ? "default" : "secondary"}
            align={isUser ? "end" : "start"}
            className="w-full"
          >
            <BubbleContent className="flex flex-col gap-2.5">
              {message.thinking && (
                <div className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground italic mb-1 border border-border/40">
                  <SparklesIcon className="size-3.5 text-primary shrink-0" />
                  <span>{message.thinking}</span>
                </div>
              )}

              {/* Seamless Inline Text & Code Segments */}
              {segments.map((seg, sIdx) => {
                if (seg.type === "code") {
                  return (
                    <CodeDisplay
                      key={sIdx}
                      code={seg.code}
                      language={seg.language}
                      filename={seg.filename}
                      lineNumbers={true}
                    />
                  )
                }
                return (
                  <div key={sIdx} className="flex flex-col gap-2 text-sm">
                    {renderParagraphs(seg.text)}
                  </div>
                )
              })}

              {message.status === "streaming" && (
                <span className="inline-block size-2 animate-pulse rounded-full bg-primary" />
              )}
            </BubbleContent>

            {/* Reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <BubbleReactions
                side="bottom"
                align={isUser ? "end" : "start"}
                className="gap-1 cursor-pointer"
              >
                {message.reactions.map((reaction, rIdx) => (
                  <button
                    key={rIdx}
                    type="button"
                    onClick={() => onReactionToggle?.(message.id, reaction.emoji)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors hover:bg-accent ${
                      reaction.reacted
                        ? "bg-primary/15 text-primary font-medium"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                ))}
              </BubbleReactions>
            )}
          </Bubble>
        </div>

        {/* Footer Actions on hover */}
        {!isUser && (
          <div className="flex items-center gap-1.5 mt-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleCopy}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                  />
                }
              >
                {copied ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
              </TooltipTrigger>
              <TooltipContent>{copied ? "Tersalin!" : "Salin seluruh teks"}</TooltipContent>
            </Tooltip>

            {onRegenerate && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onRegenerate(message.id)}
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                    />
                  }
                >
                  <RotateCcwIcon className="size-3" />
                </TooltipTrigger>
                <TooltipContent>Buat ulang balasan</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </MessageContent>
    </Message>
  )
}
