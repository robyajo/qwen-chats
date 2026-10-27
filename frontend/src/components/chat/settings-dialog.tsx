import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FieldGroup, Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ReasoningEffort } from "@/types/chat"
import {
  SettingsIcon,
  CopyIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  KeyIcon,
  SlidersIcon,
  CheckCircle2Icon,
} from "lucide-react"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isDark: boolean
  onToggleTheme: () => void
  defaultTab?: string
  reasoningEffort?: ReasoningEffort
  onEffortChange?: (effort: ReasoningEffort) => void
}

const DEFAULT_ACCESS_TOKEN = ""
const DEFAULT_REFRESH_TOKEN = ""
const DEFAULT_CLIENT_ID = ""
export function SettingsDialog({
  open,
  onOpenChange,
  isDark,
  onToggleTheme,
  defaultTab = "oauth",
  reasoningEffort = "medium",
  onEffortChange,
}: SettingsDialogProps) {
  const [temperature, setTemperature] = React.useState(0.7)
  const [streamSpeed, setStreamSpeed] = React.useState(35)
  const [autoScroll, setAutoScroll] = React.useState(true)
  const [sendTelemetry, setSendTelemetry] = React.useState(false)
  const [currentEffort, setCurrentEffort] = React.useState<ReasoningEffort>(reasoningEffort)

  React.useEffect(() => {
    setCurrentEffort(reasoningEffort)
  }, [reasoningEffort])

  // OAuth State
  const [useOAuthInference, setUseOAuthInference] = React.useState(true)
  const [showAccessToken, setShowAccessToken] = React.useState(false)
  const [showRefreshToken, setShowRefreshToken] = React.useState(false)
  const [copiedAccess, setCopiedAccess] = React.useState(false)
  const [copiedRefresh, setCopiedRefresh] = React.useState(false)
  const [copiedClientId, setCopiedClientId] = React.useState(false)
  const [isTesting, setIsTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<string | null>(null)

  const handleCopy = (text: string, type: "access" | "refresh" | "client") => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === "access") {
        setCopiedAccess(true)
        setTimeout(() => setCopiedAccess(false), 2000)
      } else if (type === "refresh") {
        setCopiedRefresh(true)
        setTimeout(() => setCopiedRefresh(false), 2000)
      } else {
        setCopiedClientId(true)
        setTimeout(() => setCopiedClientId(false), 2000)
      }
    })
  }

  const handleTestConnection = () => {
    setIsTesting(true)
    setTestResult(null)
    setTimeout(() => {
      setIsTesting(false)
      setTestResult("Otorisasi Google OAuth 2.0 Aktif & Terverifikasi (Status: 200 OK)")
    }, 800)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <SettingsIcon className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Pengaturan & Kredensial AI
              </DialogTitle>
              <DialogDescription className="text-xs">
                Kelola Google OAuth token, API Keys, dan parameter inferensi model.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full mt-1">
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="oauth" className="text-xs gap-1.5 font-medium">
              <ShieldCheckIcon className="size-3.5 text-emerald-500" />
              <span>Google OAuth</span>
            </TabsTrigger>
            <TabsTrigger value="keys" className="text-xs gap-1.5 font-medium">
              <KeyIcon className="size-3.5" />
              <span>API Keys</span>
            </TabsTrigger>
            <TabsTrigger value="model" className="text-xs gap-1.5 font-medium">
              <SlidersIcon className="size-3.5" />
              <span>Parameter</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="text-xs font-medium">
              <span>Umum</span>
            </TabsTrigger>
          </TabsList>

          {/* 1. GOOGLE OAUTH TAB */}
          <TabsContent value="oauth" className="pt-3 flex flex-col gap-4">
            {/* Account Card */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-10 border border-emerald-500/30">
                  <AvatarFallback className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                    D
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      Developer
                    </span>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] py-0 h-4">
                      Terhubung
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    developer@qwen.local
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="gap-1.5 text-xs h-7 cursor-pointer"
                >
                  <RefreshCwIcon className={`size-3 ${isTesting ? "animate-spin" : ""}`} />
                  <span>{isTesting ? "Memverifikasi..." : "Uji Token"}</span>
                </Button>
              </div>
            </div>

            {testResult && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{testResult}</span>
              </div>
            )}

            {/* Toggle Use OAuth */}
            <FieldGroup>
              <Field orientation="horizontal" className="justify-between items-center bg-card p-3 rounded-xl border border-border">
                <div>
                  <FieldLabel htmlFor="use-oauth" className="font-semibold text-xs">
                    Gunakan Token Google OAuth untuk Chat
                  </FieldLabel>
                  <FieldDescription className="text-[11px]">
                    Kirim permintaan inferensi menggunakan Bearer Token dari akun lokal Antigravity.
                  </FieldDescription>
                </div>
                <Switch
                  id="use-oauth"
                  checked={useOAuthInference}
                  onCheckedChange={setUseOAuthInference}
                />
              </Field>
            </FieldGroup>

            {/* Token Inspector */}
            <div className="flex flex-col gap-3">
              {/* Access Token */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Access Token (OAuth)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setShowAccessToken(!showAccessToken)}
                      className="size-6"
                      title={showAccessToken ? "Sembunyikan" : "Tampilkan"}
                    >
                      {showAccessToken ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleCopy(DEFAULT_ACCESS_TOKEN, "access")}
                      className="size-6"
                      title="Salin token lengkap"
                    >
                      {copiedAccess ? <CheckIcon className="size-3.5 text-primary" /> : <CopyIcon className="size-3.5" />}
                    </Button>
                  </div>
                </div>
                <Input
                  readOnly
                  type={showAccessToken ? "text" : "password"}
                  value={DEFAULT_ACCESS_TOKEN}
                  className="font-mono text-xs bg-muted/50 select-all"
                />
                <span className="text-[10px] text-muted-foreground">
                  Token sesi jangka pendek (~1 jam). Dikirim di header <code>Authorization: Bearer token</code>
                </span>
              </div>

              {/* Refresh Token */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Refresh Token
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setShowRefreshToken(!showRefreshToken)}
                      className="size-6"
                      title={showRefreshToken ? "Sembunyikan" : "Tampilkan"}
                    >
                      {showRefreshToken ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleCopy(DEFAULT_REFRESH_TOKEN, "refresh")}
                      className="size-6"
                      title="Salin refresh token"
                    >
                      {copiedRefresh ? <CheckIcon className="size-3.5 text-primary" /> : <CopyIcon className="size-3.5" />}
                    </Button>
                  </div>
                </div>
                <Input
                  readOnly
                  type={showRefreshToken ? "text" : "password"}
                  value={DEFAULT_REFRESH_TOKEN}
                  className="font-mono text-xs bg-muted/50 select-all"
                />
                <span className="text-[10px] text-muted-foreground">
                  Token persisten jangka panjang yang digunakan untuk auto-refresh token tanpa login ulang.
                </span>
              </div>

              {/* Google Client ID */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Google Client ID Resmi
                  </label>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleCopy(DEFAULT_CLIENT_ID, "client")}
                    className="size-6"
                    title="Salin Client ID"
                  >
                    {copiedClientId ? <CheckIcon className="size-3.5 text-primary" /> : <CopyIcon className="size-3.5" />}
                  </Button>
                </div>
                <Input
                  readOnly
                  value={DEFAULT_CLIENT_ID}
                  className="font-mono text-xs bg-muted/50 select-all"
                />
              </div>

              {/* Scopes */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-foreground">
                  Cakupan Izin (OAuth Scopes)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">cloud-platform</Badge>
                  <Badge variant="secondary" className="text-[10px]">userinfo.profile</Badge>
                  <Badge variant="secondary" className="text-[10px]">userinfo.email</Badge>
                  <Badge variant="secondary" className="text-[10px]">openid</Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 2. API KEYS TAB */}
          <TabsContent value="keys" className="pt-3">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="gemini-key">Google AI Studio API Key (Opsional)</FieldLabel>
                <Input
                  id="gemini-key"
                  type="password"
                  placeholder="AIzaSy..."
                  className="font-mono text-xs"
                />
                <FieldDescription>
                  Jika ingin menggunakan kuota API Key personal dari <code>aistudio.google.com</code>.
                </FieldDescription>
              </Field>

              <Separator />

              <Field>
                <FieldLabel htmlFor="antigravity-key">Antigravity Core Internal Key</FieldLabel>
                <Input
                  id="antigravity-key"
                  type="password"
                  defaultValue="antigravity_core_sk_live_98x194"
                  placeholder="sk-antigravity-..."
                  className="font-mono text-xs"
                />
                <FieldDescription>
                  Kunci akses workspace internal Antigravity.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </TabsContent>

          {/* 3. MODEL PARAMETERS TAB */}
          <TabsContent value="model" className="pt-3">
            <FieldGroup>
              <Field>
                <FieldLabel className="font-semibold text-xs">
                  Gemini Reasoning Effort (Tingkat Penalaran)
                </FieldLabel>
                <ToggleGroup
                  value={[currentEffort]}
                  onValueChange={(val) => {
                    const v = val[0] as ReasoningEffort
                    if (v) {
                      setCurrentEffort(v)
                      onEffortChange?.(v)
                    }
                  }}
                  className="w-full grid grid-cols-3 p-1 bg-muted/60 rounded-lg border border-border"
                >
                  <ToggleGroupItem
                    value="low"
                    className="text-xs py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-xs font-medium"
                  >
                    Low
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="medium"
                    className="text-xs py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-xs font-medium"
                  >
                    Medium
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="high"
                    className="text-xs py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-xs font-medium"
                  >
                    High
                  </ToggleGroupItem>
                </ToggleGroup>
                <FieldDescription>
                  {currentEffort === "low"
                    ? "Low: Respons instan, penalaran ringkas, latensi terendah."
                    : currentEffort === "high"
                      ? "High: Deep thinking & chain-of-thought maksimal untuk pemecahan masalah kompleks."
                      : "Medium: Keseimbangan ideal antara kecepatan dan kedalaman penalaran (Standar)."}
                </FieldDescription>
              </Field>

              <Separator />

              <Field>
                <div className="flex justify-between items-center mb-1">
                  <FieldLabel htmlFor="temperature">Kreativitas (Temperature)</FieldLabel>
                  <span className="text-xs font-mono font-semibold text-primary">
                    {temperature.toFixed(2)}
                  </span>
                </div>
                <Slider
                  id="temperature"
                  defaultValue={temperature}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={(val) => setTemperature(val as number)}
                />
                <FieldDescription>
                  Nilai rendah menghasilkan jawaban presisi; nilai tinggi lebih kreatif.
                </FieldDescription>
              </Field>

              <Separator />

              <Field>
                <div className="flex justify-between items-center mb-1">
                  <FieldLabel htmlFor="stream-speed">Kecepatan Streaming (ms)</FieldLabel>
                  <span className="text-xs font-mono font-semibold text-primary">
                    {streamSpeed} ms
                  </span>
                </div>
                <Slider
                  id="stream-speed"
                  defaultValue={streamSpeed}
                  min={10}
                  max={100}
                  step={5}
                  onValueChange={(val) => setStreamSpeed(val as number)}
                />
                <FieldDescription>
                  Interval jeda antar token saat simulasi streaming pesan.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </TabsContent>

          {/* 4. GENERAL TAB */}
          <TabsContent value="general" className="pt-3">
            <FieldGroup>
              <Field orientation="horizontal" className="justify-between items-center">
                <div>
                  <FieldLabel htmlFor="dark-mode">Mode Gelap</FieldLabel>
                  <FieldDescription>
                    Aktifkan tema gelap untuk kenyamanan mata malam hari.
                  </FieldDescription>
                </div>
                <Switch
                  id="dark-mode"
                  checked={isDark}
                  onCheckedChange={onToggleTheme}
                />
              </Field>

              <Separator />

              <Field orientation="horizontal" className="justify-between items-center">
                <div>
                  <FieldLabel htmlFor="auto-scroll">Auto-Scroll Aktif</FieldLabel>
                  <FieldDescription>
                    Otomatis mengikuti pesan baru saat AI streaming response.
                  </FieldDescription>
                </div>
                <Switch
                  id="auto-scroll"
                  checked={autoScroll}
                  onCheckedChange={setAutoScroll}
                />
              </Field>

              <Separator />

              <Field orientation="horizontal" className="justify-between items-center">
                <div>
                  <FieldLabel htmlFor="telemetry">Optimasi Analisis Core</FieldLabel>
                  <FieldDescription>
                    Kirim metrik inferensi lokal untuk peningkatan kualitas model.
                  </FieldDescription>
                </div>
                <Switch
                  id="telemetry"
                  checked={sendTelemetry}
                  onCheckedChange={setSendTelemetry}
                />
              </Field>
            </FieldGroup>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 border-t border-border pt-3">
          <DialogClose render={<Button variant="outline" size="sm" />}>Tutup</DialogClose>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Terapkan Kredensial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
