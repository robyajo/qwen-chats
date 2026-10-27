import * as React from "react"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarInput,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { ChatSession } from "@/types/chat"
import {
  PlusIcon,
  MessageSquareIcon,
  SearchIcon,
  Trash2Icon,
  SunIcon,
  MoonIcon,
  SettingsIcon,
  SparklesIcon,
  UserIcon,
  SlidersIcon,
} from "lucide-react"

interface ChatSidebarProps {
  sessions: ChatSession[]
  activeSessionId: string
  onSelectSession: (id: string) => void
  onNewChat: () => void
  onDeleteSession: (id: string) => void
  isDark: boolean
  onToggleTheme: () => void
  onOpenSettings: () => void
  onOpenConfig?: () => void
  onSelectChatView?: () => void
  activeView?: "chat" | "config"
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isDark,
  onToggleTheme,
  onOpenSettings,
  onOpenConfig,
  onSelectChatView,
  activeView = "chat",
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const todaySessions = filteredSessions.filter((s) => s.period === "Today")
  const yesterdaySessions = filteredSessions.filter((s) => s.period === "Yesterday")
  const olderSessions = filteredSessions.filter((s) => s.period === "Previous 7 Days")

  return (
    <Sidebar variant="inset" collapsible="offcanvas" className="border-r border-sidebar-border">
      {/* Header with App Branding & New Chat */}
      <SidebarHeader className="flex flex-col gap-3 p-3 border-b border-sidebar-border/60">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl overflow-hidden shadow-xs flex items-center justify-center bg-indigo-500/10">
              <img src="/qwen-icon.png" alt="Qwen Logo" className="size-7 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight text-sidebar-foreground">
                Qwen Chats
              </span>
              <span className="text-[11px] text-sidebar-foreground/70">
                Alibaba Cloud AI
              </span>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
            Qwen 3.8
          </Badge>
        </div>

        {/* New Chat Button */}
        <Button
          onClick={onNewChat}
          variant="default"
          className="w-full justify-start gap-2 shadow-xs cursor-pointer font-medium"
        >
          <PlusIcon data-icon="inline-start" />
          <span>Percakapan Baru</span>
          <kbd className="ml-auto font-mono text-[10px] bg-primary-foreground/20 px-1 rounded text-primary-foreground">
            ⌘N
          </kbd>
        </Button>

        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-sidebar-foreground/50 pointer-events-none" />
          <SidebarInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari riwayat percakapan..."
            className="pl-8 text-xs h-8 bg-sidebar-accent/50 border-sidebar-border/80 focus-visible:ring-1"
          />
        </div>
      </SidebarHeader>

      {/* Main Content: Grouped Sessions */}
      <SidebarContent className="p-2 gap-3">
        <SidebarGroup className="p-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeView === "chat"}
                onClick={onSelectChatView}
                className="cursor-pointer text-xs justify-between font-medium"
              >
                <div className="flex items-center gap-2">
                  <MessageSquareIcon className="size-3.5 text-primary" />
                  <span>Percakapan Chat</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeView === "config"}
                onClick={onOpenConfig}
                className="cursor-pointer text-xs justify-between font-medium"
              >
                <div className="flex items-center gap-2">
                  <SlidersIcon className="size-3.5 text-emerald-500" />
                  <span>Konfigurasi Sistem</span>
                </div>
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <div className="h-px bg-sidebar-border/60 mx-1 my-0.5" />

        {/* Today */}
        {todaySessions.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider uppercase text-sidebar-foreground/60 px-2">
              Hari Ini
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {todaySessions.map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <SidebarMenuButton
                      isActive={session.id === activeSessionId}
                      onClick={() => onSelectSession(session.id)}
                      className="cursor-pointer text-xs justify-between group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquareIcon className="size-3.5 shrink-0 text-sidebar-foreground/70" />
                        <span className="truncate">{session.title}</span>
                      </div>
                    </SidebarMenuButton>

                    <SidebarMenuAction
                      showOnHover
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteSession(session.id)
                      }}
                      className="hover:text-destructive cursor-pointer"
                      title="Hapus sesi"
                    >
                      <Trash2Icon className="size-3.5" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Yesterday */}
        {yesterdaySessions.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider uppercase text-sidebar-foreground/60 px-2">
              Kemarin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {yesterdaySessions.map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <SidebarMenuButton
                      isActive={session.id === activeSessionId}
                      onClick={() => onSelectSession(session.id)}
                      className="cursor-pointer text-xs justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquareIcon className="size-3.5 shrink-0 text-sidebar-foreground/70" />
                        <span className="truncate">{session.title}</span>
                      </div>
                    </SidebarMenuButton>

                    <SidebarMenuAction
                      showOnHover
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteSession(session.id)
                      }}
                      className="hover:text-destructive cursor-pointer"
                      title="Hapus sesi"
                    >
                      <Trash2Icon className="size-3.5" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Previous 7 Days */}
        {olderSessions.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider uppercase text-sidebar-foreground/60 px-2">
              7 Hari Terakhir
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {olderSessions.map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <SidebarMenuButton
                      isActive={session.id === activeSessionId}
                      onClick={() => onSelectSession(session.id)}
                      className="cursor-pointer text-xs justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquareIcon className="size-3.5 shrink-0 text-sidebar-foreground/70" />
                        <span className="truncate">{session.title}</span>
                      </div>
                    </SidebarMenuButton>

                    <SidebarMenuAction
                      showOnHover
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteSession(session.id)
                      }}
                      className="hover:text-destructive cursor-pointer"
                      title="Hapus sesi"
                    >
                      <Trash2Icon className="size-3.5" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredSessions.length === 0 && (
          <div className="p-4 text-center text-xs text-sidebar-foreground/50">
            Tidak ada riwayat percakapan yang cocok.
          </div>
        )}
      </SidebarContent>

      {/* Footer: User profile and quick settings */}
      <SidebarFooter className="p-3 border-t border-sidebar-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="cursor-pointer hover:bg-sidebar-accent/70 transition-colors"
                  />
                }
              >
                <div className="flex items-center gap-3 w-full">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
                      <UserIcon />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-left min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-sidebar-foreground truncate">
                        Developer
                      </span>
                      <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" title="OAuth Active" />
                    </div>
                    <span className="text-[10px] text-sidebar-foreground/60 truncate font-mono">
                      developer@qwen.local
                    </span>
                  </div>
                  <SparklesIcon className="size-3.5 text-primary shrink-0 ml-auto" />
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" side="top" className="w-56 mb-2">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onToggleTheme} className="cursor-pointer">
                    {isDark ? (
                      <>
                        <SunIcon className="size-4" />
                        <span>Mode Terang</span>
                      </>
                    ) : (
                      <>
                        <MoonIcon className="size-4" />
                        <span>Mode Gelap</span>
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenConfig} className="cursor-pointer">
                    <SlidersIcon className="size-4" />
                    <span>Konfigurasi Sistem</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenSettings} className="cursor-pointer">
                    <SettingsIcon className="size-4" />
                    <span>Pengaturan Chat</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
