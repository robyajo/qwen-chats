import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SUGGESTED_PROMPTS } from "@/lib/mock-chat-data"
import {
  BotIcon,
  SparklesIcon,
  LayoutIcon,
  PaletteIcon,
  CodeIcon,
  BrainIcon,
  ArrowRightIcon,
} from "lucide-react"

interface ChatEmptyStateProps {
  onSelectPrompt: (prompt: string) => void
  currentModelName: string
}

export function ChatEmptyState({
  onSelectPrompt,
  currentModelName,
}: ChatEmptyStateProps) {
  const getPromptIcon = (iconName: string) => {
    switch (iconName) {
      case "Layout":
        return <LayoutIcon className="text-primary" />
      case "Palette":
        return <PaletteIcon className="text-primary" />
      case "Code":
        return <CodeIcon className="text-primary" />
      case "Brain":
        return <BrainIcon className="text-primary" />
      default:
        return <SparklesIcon className="text-primary" />
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 my-auto max-w-3xl mx-auto w-full">
      <Empty className="border-0">
        <EmptyHeader className="max-w-md">
          <EmptyMedia variant="icon" className="size-12 rounded-2xl bg-primary/10 text-primary mb-3">
            <BotIcon />
          </EmptyMedia>
          <div className="flex items-center gap-2 justify-center">
            <EmptyTitle className="text-xl font-bold tracking-tight">
              Antigravity Web-Chats
            </EmptyTitle>
            <Badge variant="secondary" className="gap-1">
              <SparklesIcon />
              <span>{currentModelName}</span>
            </Badge>
          </div>
          <EmptyDescription className="mt-1 text-sm text-muted-foreground">
            Asisten cerdas multimodal dengan fondasi shadcn/ui base-nova. Mulai diskusi arsitektur sistem, review kode, atau eksplorasi ide.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent className="max-w-2xl w-full mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {SUGGESTED_PROMPTS.map((item, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="h-auto w-full flex flex-col items-start p-3.5 text-left border-border/80 hover:border-primary/50 hover:bg-accent/40 transition-all rounded-xl group"
                onClick={() => onSelectPrompt(item.prompt)}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {getPromptIcon(item.icon)}
                    </div>
                    <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <ArrowRightIcon className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </Button>
            ))}
          </div>
        </EmptyContent>
      </Empty>
    </div>
  )
}
