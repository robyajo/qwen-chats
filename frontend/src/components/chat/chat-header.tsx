import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { AVAILABLE_MODELS } from "@/lib/mock-chat-data"
import type { AIModel, ReasoningEffort } from "@/types/chat"
import {
  ChevronDownIcon,
  Trash2Icon,
  Share2Icon,
  SettingsIcon,
  CheckIcon,
  BotIcon,
  SparklesIcon,
  SlidersIcon,
} from "lucide-react"

interface ChatHeaderProps {
  currentModelId: string
  onModelChange: (modelId: string) => void
  reasoningEffort: ReasoningEffort
  onEffortChange: (effort: ReasoningEffort) => void
  chatTitle: string
  onClearChat?: () => void
  onOpenSettings?: () => void
  onShareChat?: () => void
  onOpenConfig?: () => void
  activeView?: "chat" | "config"
}
export function ChatHeader({
  currentModelId,
  onModelChange,
  reasoningEffort,
  onEffortChange,
  chatTitle,
  onClearChat,
  onOpenSettings,
  onShareChat,
  onOpenConfig,
  activeView = "chat",
}: ChatHeaderProps) {
  const currentModel: AIModel =
    AVAILABLE_MODELS.find((m) => m.id === currentModelId) ?? AVAILABLE_MODELS[0]

  return (
    <header className="sticky top-0 z-10 flex h-14 w-full shrink-0 items-center justify-between border-b border-border/80 bg-background/80 px-4 backdrop-blur-md">
      {/* Left side: Sidebar Toggle & Model Picker */}
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

        <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 font-medium text-foreground hover:bg-accent/60"
              />
            }
          >
            <BotIcon data-icon="inline-start" className="text-primary" />
            <span className="truncate">{currentModel.name}</span>
            <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] py-0 h-4">
              {currentModel.badge}
            </Badge>
            <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-80">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <SparklesIcon className="size-3.5" />
                <span>Alibaba Qwen 3.8 / 3.7 Series</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {AVAILABLE_MODELS.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => onModelChange(model.id)}
                  className="flex items-start justify-between py-2 cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 font-medium text-xs">
                      <span>{model.name}</span>
                      <Badge variant="outline" className="text-[9px] py-0 h-3.5 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                        {model.badge}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">
                      {model.description}
                    </span>
                  </div>
                  {model.id === currentModelId && (
                    <CheckIcon className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 ml-2" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Reasoning Effort Dropdown Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="xs"
                className="gap-1.5 h-7 text-xs font-semibold px-2 cursor-pointer border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-colors"
              />
            }
          >
            <SlidersIcon className="size-3" />
            <span>
              Thinking:{" "}
              {reasoningEffort === "high" || reasoningEffort === "Thinking"
                ? "Thinking"
                : reasoningEffort === "low" || reasoningEffort === "Fast"
                  ? "Fast"
                  : "Auto"}
            </span>
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-bold text-foreground">
                Qwen Thinking Mode
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onEffortChange("Auto")}
                className="flex items-center justify-between py-1.5 cursor-pointer text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">Auto</span>
                  <span className="text-[10px] text-muted-foreground">
                    Otomatis tentukan kedalaman berpikir
                  </span>
                </div>
                {(reasoningEffort === "Auto" || reasoningEffort === "medium") && (
                  <CheckIcon className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEffortChange("Fast")}
                className="flex items-center justify-between py-1.5 cursor-pointer text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">Fast</span>
                  <span className="text-[10px] text-muted-foreground">
                    Respons kilat instan & hemat token
                  </span>
                </div>
                {(reasoningEffort === "Fast" || reasoningEffort === "low") && (
                  <CheckIcon className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEffortChange("Thinking")}
                className="flex items-center justify-between py-1.5 cursor-pointer text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">Thinking</span>
                  <span className="text-[10px] text-muted-foreground">
                    Penalaran mendalam langkah demi langkah
                  </span>
                </div>
                {(reasoningEffort === "Thinking" || reasoningEffort === "high") && (
                  <CheckIcon className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-xs text-muted-foreground hidden lg:inline truncate max-w-xs">
          • {chatTitle}
        </span>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={onOpenConfig}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                  activeView === "config"
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                }`}
              />
            }
          >
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Qwen Engine:</span>
            <span>Aktif (:3004)</span>
          </TooltipTrigger>
          <TooltipContent>Lihat seluruh konfigurasi Qwen & status engine</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={onOpenSettings}
                className="hidden xl:flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              />
            }
          >
            <span className="size-1.5 rounded-full bg-blue-500" />
            <span>developer@qwen.local</span>
          </TooltipTrigger>
          <TooltipContent>Kredensial Akun Google</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onShareChat}
                aria-label="Bagikan Chat"
              />
            }
          >
            <Share2Icon />
          </TooltipTrigger>
          <TooltipContent>Bagikan percakapan</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClearChat}
                aria-label="Bersihkan Chat"
              />
            }
          >
            <Trash2Icon />
          </TooltipTrigger>
          <TooltipContent>Bersihkan riwayat sesi</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onOpenSettings}
                aria-label="Pengaturan"
              />
            }
          >
            <SettingsIcon />
          </TooltipTrigger>
          <TooltipContent>Pengaturan Web-Chats</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
