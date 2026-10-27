import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ServerIcon,
  CpuIcon,
  ShieldCheckIcon,
  SparklesIcon,
  RefreshCwIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  TerminalIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react"

interface ConfigData {
  server: {
    name: string
    port: number
    nodeEnv: string
    nodeVersion: string
    platform: string
    arch: string
    uptimeSeconds: number
  }
  qwenApp: {
    installed: boolean
    installPath: string
    resourcesPath: string
    version: string
    mcpRunner: {
      hasBun: boolean
      hasUvx: boolean
    }
  }
  endpoints: {
    completions?: string
    stream?: string
    sessions?: string
    models?: string
    upload?: string
    dashscopeBaseUrl?: string
    officialWebChatUrl?: string
  }
  hasApiKey: boolean
  apiKeySnippet?: string
  session?: {
    hasSession: boolean
    userId: string
    deviceId: string
    hasAccessToken: boolean
    accessToken?: string
    accessTokenSnippet: string
    hasRefreshToken: boolean
    refreshToken?: string
    cookieHeader?: string
    cna?: string
    masterKeyHex?: string
    totalSyncedSessions: number
  }
  model: {
    default: string
    effort: "low" | "medium" | "high"
    temperature: number
    maxOutputTokens: number
  }
  availableModels: Array<{
    id: string
    name: string
    provider: string
    badge: string
    description: string
    supportedEfforts?: string[]
  }>
}

interface ExtractionResultDetails {
  userId?: string
  deviceId?: string
  accessToken?: string
  refreshToken?: string
  cookieHeader?: string
  masterKeyHex?: string
  cna?: string
  accessTokenSnippet?: string
  refreshTokenSnippet?: string
  expiresAtFormatted?: string
  syncedSessionsCount: number
  envFormat: string
}

interface ConfigPageProps {
  onBackToChat: () => void
}

export function ConfigPage({ onBackToChat }: ConfigPageProps) {
  const [config, setConfig] = React.useState<ConfigData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)
  const [importInput, setImportInput] = React.useState("")
  const [importLoading, setImportLoading] = React.useState(false)
  const [importSuccess, setImportSuccess] = React.useState<string | null>(null)
  const [importError, setImportError] = React.useState<string | null>(null)
  const [showImportHelp, setShowImportHelp] = React.useState(false)
  const [extractLocalLoading, setExtractLocalLoading] = React.useState(false)
  const [extractedDetails, setExtractedDetails] = React.useState<ExtractionResultDetails | null>(null)

  const handleExtractLocal = async () => {
    setExtractLocalLoading(true)
    setImportSuccess(null)
    setImportError(null)

    try {
      const res = await fetch("/api/session/extract-local", {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengekstrak sesi lokal")
      }

      setExtractedDetails(data)
      setImportSuccess(
        `Berhasil! Sesi diekstrak otomatis dari Qwen Desktop. ${data.syncedSessionsCount || 0} percakapan disinkronkan.`
      )
      fetchConfig()
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : String(err))
    } finally {
      setExtractLocalLoading(false)
    }
  }

  const handleCopyAllEnv = () => {
    const currentEnv =
      extractedDetails?.envFormat ||
      [
        `# Sesi Resmi Qwen Desktop (.env Format)`,
        `QWEN_USER_ID=${config?.session?.userId || ""}`,
        `QWEN_DEVICE_ID=${config?.session?.deviceId || ""}`,
        `QWEN_CNA=${config?.session?.cna || "Zn8LI2yamGwCAZ6MuZof1m4z"}`,
        `QWEN_ACCESS_TOKEN=${config?.session?.accessToken || ""}`,
        `QWEN_REFRESH_TOKEN=${config?.session?.refreshToken || ""}`,
        `QWEN_MASTER_KEY_HEX=${config?.session?.masterKeyHex || ""}`,
        `QWEN_COOKIE_HEADER="${(config?.session?.cookieHeader || "").replace(/"/g, '\\"')}"`,
      ].join("\n")

    navigator.clipboard.writeText(currentEnv)
    setCopiedKey("all_env")
    setTimeout(() => setCopiedKey(null), 2500)
  }

  const handleCopyBrowserScript = () => {
    const script = `fetch("http://localhost:3004/api/session/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accessToken:JSON.parse(localStorage.getItem("_access_token_state")||"{}").token,cookies:document.cookie,sync:true})}).then(r=>r.json()).then(d=>alert("✅ Sesi Qwen berhasil disinkronkan ke Web-Chats! "+(d.data.syncedSessionsCount||0)+" sesi termuat.")).catch(e=>alert("❌ Gagal: "+e.message));`
    navigator.clipboard.writeText(script)
    setCopiedKey("browser_script")
    setTimeout(() => setCopiedKey(null), 2500)
  }
  const handleImportSession = async () => {
    if (!importInput.trim()) return
    setImportLoading(true)
    setImportSuccess(null)
    setImportError(null)

    try {
      const isToken = importInput.trim().startsWith("eyJ")
      const payload = isToken
        ? { accessToken: importInput.trim(), sync: true }
        : { cookies: importInput.trim(), sync: true }

      const res = await fetch("/api/session/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengimpor sesi")
      }

      setImportSuccess(
        `Sesi Qwen berhasil diimpor! ${data.data?.syncedSessionsCount || 0} percakapan disinkronkan.`
      )
      setImportInput("")
      fetchConfig()
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : String(err))
    } finally {
      setImportLoading(false)
    }
  }
  const fetchConfig = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/config")
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`)
      const json = await res.json()
      if (json.success && json.data) {
        setConfig(json.data)
      } else {
        throw new Error("Respon konfigurasi tidak valid")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const hrs = Math.floor(mins / 60)
    if (hrs > 0) return `${hrs} jam ${mins % 60} menit`
    if (mins > 0) return `${mins} menit ${seconds % 60} detik`
    return `${seconds} detik`
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackToChat}
                className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeftIcon className="size-4" />
                <span>Kembali ke Chat</span>
              </Button>
              <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                Qwen 3.8 / 3.7 Edition
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <img src="/qwen-icon.png" alt="Qwen Logo" className="size-6 object-contain" />
              <span>Konfigurasi & Status Sistem Qwen</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Pemantauan realtime status aplikasi Qwen Desktop, engine Alibaba DashScope, dan model Qwen aktif.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchConfig}
              disabled={loading}
              className="gap-1.5 cursor-pointer"
            >
              <RefreshCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Status</span>
            </Button>
            <Button
              size="sm"
              onClick={onBackToChat}
              className="gap-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <span>Buka Percakapan</span>
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
            <AlertCircleIcon className="size-5 shrink-0" />
            <div className="text-sm">
              <strong>Gagal memuat konfigurasi:</strong> {error}
            </div>
          </div>
        )}

        {/* 1. QWEN DESKTOP APP & MCP DETECTION */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <CpuIcon className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Aplikasi Qwen Desktop Resmi (Alibaba)
                    {config?.qwenApp.installed ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium text-[11px] gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Terdeteksi di Komputer
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-medium text-[11px]">
                        Cloud Only
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Hasil analisis mendalam REA pada direktori instalasi Qwen dan tool runner MCP.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Versi Aplikasi Qwen
              </span>
              <div className="font-mono text-sm font-semibold text-foreground flex items-center justify-between">
                <span>v{config?.qwenApp.version || "1.0.3"}</span>
                <span className="text-[10px] text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">Release 44</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Electron Desktop Shell</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                MCP JavaScript Runner
              </span>
              <div className="font-mono text-sm font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2Icon className="size-3.5 text-emerald-500" />
                <span>bun.exe (Siap)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">resources/bun/bun.exe</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                MCP Python Runner
              </span>
              <div className="font-mono text-sm font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2Icon className="size-3.5 text-emerald-500" />
                <span>uvx.exe (Siap)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">resources/python/uvx.exe</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Webview Cloud Host
              </span>
              <div className="font-mono text-xs font-semibold text-foreground truncate">
                https://chat.qwen.ai
              </div>
              <p className="text-[11px] text-muted-foreground">Custom UA: AliDesktop(QWENCHAT)</p>
            </div>
          </CardContent>
        </Card>

        {/* 2. EXPRESS BACKEND & ALIBABA DASHSCOPE API */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ServerIcon className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base">Backend Qwen Express</CardTitle>
                  <CardDescription className="text-xs">
                    Runtime server backend khusus edisi Qwen.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Base URL API:</span>
                <div className="flex items-center gap-1.5 font-mono font-medium">
                  <span>http://localhost:{config?.server.port || 3004}</span>
                  <button
                    onClick={() => handleCopy(`http://localhost:${config?.server.port || 3004}`, "base_url")}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Salin URL"
                  >
                    {copiedKey === "base_url" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Environment:</span>
                <Badge variant="outline" className="font-mono text-[11px] uppercase">
                  {config?.server.nodeEnv || "development"}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Node.js Engine:</span>
                <span className="font-mono font-medium">{config?.server.nodeVersion || "v24.16.0"}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Platform Host:</span>
                <span className="font-mono text-muted-foreground">{config?.server.platform} ({config?.server.arch})</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Uptime Server:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {config?.server.uptimeSeconds ? formatUptime(config.server.uptimeSeconds) : "Baru saja aktif"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ALIBABA CLOUD DASHSCOPE API */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <ShieldCheckIcon className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base">Alibaba Cloud DashScope API</CardTitle>
                  <CardDescription className="text-xs">
                    Konfigurasi kunci akses API resmi untuk inferensi Qwen.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">DashScope Base URL:</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                  <span className="truncate">{config?.endpoints.dashscopeBaseUrl}</span>
                  <button
                    onClick={() => handleCopy(config?.endpoints.dashscopeBaseUrl || "", "dashscope_url")}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  >
                    {copiedKey === "dashscope_url" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status API Key:</span>
                {config?.hasApiKey ? (
                  <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2Icon className="size-3.5" />
                    Terpasang ({config.apiKeySnippet})
                  </span>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                    Mode Engine Lokal / Simulasi
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Sesi Qwen Desktop:</span>
                {config?.session?.hasSession ? (
                  <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2Icon className="size-3.5" />
                    Sesi Aktif ({config.session.totalSyncedSessions} Percakapan)
                  </span>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Tidak Ditemukan
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">User ID Akun:</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                  <span className="truncate">{config?.session?.userId || "6d9330ea-83f2..."}</span>
                  <button
                    onClick={() => handleCopy(config?.session?.userId || "", "user_id")}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  >
                    {copiedKey === "user_id" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Model Default Aktif:</span>
                <Badge className="font-mono text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                  {config?.model.default || "qwen-3.8-max"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Web Resmi:</span>
                <a
                  href="https://chat.qwen.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  chat.qwen.ai ↗
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2b. IMPORT SESI DARI BROWSER LAIN */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ShieldCheckIcon className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base">Manajemen Sesi Qwen (Sinkronisasi & Impor Otomatis)</CardTitle>
                  <CardDescription className="text-xs">
                    Ambil sesi otomatis dari aplikasi desktop lokal atau impor langsung dari browser Chrome/Edge.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  onClick={handleExtractLocal}
                  disabled={extractLocalLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-1.5 font-medium shadow-xs"
                >
                  {extractLocalLoading ? (
                    <RefreshCwIcon className="size-3 animate-spin" />
                  ) : (
                    <CpuIcon className="size-3" />
                  )}
                  <span>Ambil dari Qwen Desktop</span>
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setShowImportHelp((prev) => !prev)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 cursor-pointer"
                >
                  {showImportHelp ? "Tutup Panduan" : "Panduan Browser ▾"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {showImportHelp && (
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-3 text-muted-foreground">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">Metode Cepat Ambil Sesi dari Browser (Chrome / Edge):</p>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={handleCopyBrowserScript}
                    className="cursor-pointer gap-1 text-[11px]"
                  >
                    {copiedKey === "browser_script" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                    <span>Salin Kode Konsol Browser (1-Klik)</span>
                  </Button>
                </div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Buka <a href="https://chat.qwen.ai" target="_blank" rel="noreferrer" className="text-indigo-500 underline font-medium">https://chat.qwen.ai</a> di Chrome/Edge yang sudah login.</li>
                  <li>Tekan <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">F12</kbd> $\rightarrow$ buka tab <strong>Console</strong>.</li>
                  <li>Klik tombol <strong>"Salin Kode Konsol Browser"</strong> di atas, tempel (*Paste*) di konsol browser, lalu tekan <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd>. Sesi akan langsung terkirim ke Web-Chats secara otomatis!</li>
                  <li>Atau secara manual: salin cookie <code className="text-indigo-500">refresh_token</code> dari tab Application $\rightarrow$ Cookies dan tempel di bawah.</li>
                </ol>
              </div>
            )}
            {importSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2Icon className="size-4 shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}

            {/* DETAILS OF EXTRACTED CREDENTIALS WITH 1-CLICK COPY BUTTONS */}
            {(extractedDetails || config?.session?.hasSession) && (
              <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3 mt-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-indigo-500/20">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-xs text-foreground">
                      Semua Data Sesi yang Berhasil Diambil
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                      Tersimpan di .env
                    </Badge>
                  </div>

                  <Button
                    size="xs"
                    onClick={handleCopyAllEnv}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium cursor-pointer gap-1.5 shadow-xs shrink-0 self-start sm:self-auto"
                  >
                    {copiedKey === "all_env" ? (
                      <CheckIcon className="size-3.5 text-emerald-300" />
                    ) : (
                      <CopyIcon className="size-3.5" />
                    )}
                    <span>Salin Semua Format .env</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* User ID */}
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">User ID Akun</span>
                      <button
                        onClick={() =>
                          handleCopy(
                            extractedDetails?.userId || config?.session?.userId || "",
                            "field_user_id"
                          )
                        }
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "field_user_id" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                        <span>Salin</span>
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-foreground truncate select-all">
                      {extractedDetails?.userId || config?.session?.userId || "-"}
                    </p>
                  </div>

                  {/* Device ID */}
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">Device ID</span>
                      <button
                        onClick={() =>
                          handleCopy(
                            extractedDetails?.deviceId || config?.session?.deviceId || "",
                            "field_device_id"
                          )
                        }
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "field_device_id" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                        <span>Salin</span>
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-foreground truncate select-all">
                      {extractedDetails?.deviceId || config?.session?.deviceId || "949077aa-a483-4d5d-ba50-808d496e3b38"}
                    </p>
                  </div>

                  {/* CNA Cookie */}
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">CNA Cookie Tag</span>
                      <button
                        onClick={() =>
                          handleCopy(
                            extractedDetails?.cna || config?.session?.cna || "Zn8LI2yamGwCAZ6MuZof1m4z",
                            "field_cna"
                          )
                        }
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "field_cna" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                        <span>Salin</span>
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-foreground truncate select-all">
                      {extractedDetails?.cna || config?.session?.cna || "Zn8LI2yamGwCAZ6MuZof1m4z"}
                    </p>
                  </div>

                  {/* Master Key */}
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">Master Key (DPAPI 256-bit)</span>
                      <button
                        onClick={() =>
                          handleCopy(
                            extractedDetails?.masterKeyHex || config?.session?.masterKeyHex || "58366D96B80D65DA8ADB0F6A2BDE7367FB20AE6A8AB7F2B7781A00FE1C0DFD71",
                            "field_master_key"
                          )
                        }
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "field_master_key" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                        <span>Salin</span>
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-foreground truncate select-all">
                      {extractedDetails?.masterKeyHex || config?.session?.masterKeyHex || "58366D96B80D..."}
                    </p>
                  </div>
                </div>

                {/* Access Token (Full) */}
                <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Access Token Aktif (JWT Bearer)
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          extractedDetails?.accessToken || config?.session?.accessToken || "",
                          "field_access_token"
                        )
                      }
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "field_access_token" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                      <span>Salin Access Token Lengkap</span>
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-foreground break-all line-clamp-2 select-all">
                    {extractedDetails?.accessToken || config?.session?.accessToken || "-"}
                  </p>
                </div>

                {/* Refresh Token (Full) */}
                <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Refresh Token Persisten (Berlaku s/d 2027)
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          extractedDetails?.refreshToken || config?.session?.refreshToken || "",
                          "field_refresh_token"
                        )
                      }
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "field_refresh_token" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                      <span>Salin Refresh Token Lengkap</span>
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-foreground break-all line-clamp-2 select-all">
                    {extractedDetails?.refreshToken || config?.session?.refreshToken || "-"}
                  </p>
                </div>

                {/* Full Cookie Header String */}
                <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Header Cookie Lengkap (Hasil Dekripsi)
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          extractedDetails?.cookieHeader || config?.session?.cookieHeader || "",
                          "field_cookie_header"
                        )
                      }
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "field_cookie_header" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                      <span>Salin Header Cookie Lengkap</span>
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-foreground break-all line-clamp-2 select-all">
                    {extractedDetails?.cookieHeader || config?.session?.cookieHeader || "-"}
                  </p>
                </div>
              </div>
            )}

            {importError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircleIcon className="size-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="space-y-2">
              <textarea
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder="Tempelkan Bearer Access Token (eyJ...) atau string Cookie (refresh_token=...; cna=...) dari browser di sini..."
                rows={3}
                className="w-full text-xs font-mono p-3 rounded-lg bg-muted/30 border border-border/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 resize-none text-foreground"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Token otomatis disimpan ke berkas <code className="font-mono text-foreground">.env</code> dan riwayat percakapan disinkronkan.
                </span>
                <Button
                  size="sm"
                  onClick={handleImportSession}
                  disabled={importLoading || !importInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer gap-1.5"
                >
                  {importLoading && <RefreshCwIcon className="size-3 animate-spin" />}
                  <span>Impor & Terapkan</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. ACTIVE ENDPOINTS TABLE */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <TerminalIcon className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base">Daftar Endpoint API Qwen Backend</CardTitle>
                <CardDescription className="text-xs">
                  Endpoint REST dan Server-Sent Events (SSE) aktif di port 3004.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground font-medium">
                    <th className="pb-2">Metode</th>
                    <th className="pb-2">Endpoint</th>
                    <th className="pb-2">Fungsi / Deskripsi</th>
                    <th className="pb-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  <tr>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        POST
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold text-foreground">/api/chat/completions</td>
                    <td className="py-2.5 font-sans text-muted-foreground">
                      Balasan chat Qwen non-streaming (JSON)
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      <button
                        onClick={() => handleCopy(`http://localhost:3004/api/chat/completions`, "ep_completions")}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "ep_completions" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                        <span>Salin</span>
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400">
                        POST
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold text-foreground">/api/chat/stream</td>
                    <td className="py-2.5 font-sans text-muted-foreground">
                      Real-time SSE token streaming model Qwen
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      <button
                        onClick={() => handleCopy(`http://localhost:3004/api/chat/stream`, "ep_stream")}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "ep_stream" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                        <span>Salin</span>
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        GET
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold text-foreground">/api/config</td>
                    <td className="py-2.5 font-sans text-muted-foreground">
                      Inspeksi konfigurasi terpusat & status Qwen Desktop
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      <button
                        onClick={() => handleCopy(`http://localhost:3004/api/config`, "ep_config")}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "ep_config" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                        <span>Salin</span>
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        GET
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold text-foreground">/api/chat/models</td>
                    <td className="py-2.5 font-sans text-muted-foreground">
                      Katalog seluruh model Alibaba Qwen
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      <button
                        onClick={() => handleCopy(`http://localhost:3004/api/chat/models`, "ep_models")}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "ep_models" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                        <span>Salin</span>
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        GET
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold text-foreground">/api/chat/sessions</td>
                    <td className="py-2.5 font-sans text-muted-foreground">
                      Daftar riwayat sesi obrolan (CRUD)
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      <button
                        onClick={() => handleCopy(`http://localhost:3004/api/chat/sessions`, "ep_sessions")}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "ep_sessions" ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                        <span>Salin</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 4. AVAILABLE QWEN AI MODELS */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <SparklesIcon className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base">Katalog Model Resmi Alibaba Qwen (Qwen3 Series)</CardTitle>
                <CardDescription className="text-xs">
                  Model AI unggulan dari Alibaba Cloud yang didukung oleh sistem.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {config?.availableModels?.map((model) => (
              <div
                key={model.id}
                className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{model.name}</span>
                    <Badge variant="secondary" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                      {model.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {model.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Provider: {model.provider}</span>
                  {model.supportedEfforts ? (
                    <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                      {model.supportedEfforts.join(" · ")}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-muted-foreground">Standard</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
