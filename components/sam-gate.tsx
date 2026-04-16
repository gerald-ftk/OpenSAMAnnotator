'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { OpenSAMAnnotatorLogo } from '@/components/ui/opensamannotator-logo'
import {
  KeyRound, Loader2, Eye, EyeOff, AlertCircle, Download, CheckCircle2, Zap,
} from 'lucide-react'

const HF_TOKEN_KEY = 'opensamannotator.hf_token'

interface SamStatus {
  ready: boolean
  gpu_available: boolean
  downloading: boolean
  progress: number
  error: string | null
  env_token_present: boolean
}

/**
 * Full-screen gate shown until SAM is ready OR the user opts to run
 * without it. Three paths forward:
 *
 *   1. HF_TOKEN is already in the backend's environment → one-click
 *      "Start download" using the env var (no token needs to be typed).
 *   2. Paste a HuggingFace access token manually. It's saved to
 *      localStorage so the rest of the app (e.g. Settings) can reuse it.
 *   3. "Use without SAM" → dismiss the gate. All auto-annotate features
 *      stay disabled until the user pastes a token in Settings. The
 *      choice persists in sessionStorage so the gate doesn't re-appear
 *      on every view change.
 */
export function SamGate({
  apiUrl,
  onReady,
  onDismiss,
}: {
  apiUrl: string
  onReady: () => void
  onDismiss: () => void
}) {
  const [status, setStatus] = useState<SamStatus>({
    ready: false,
    downloading: false,
    progress: 0,
    error: null,
    env_token_present: false,
  })
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  // Hydrate any saved token so re-prompts come pre-filled.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HF_TOKEN_KEY)
      if (saved) setToken(saved)
    } catch {}
  }, [])

  // Poll /api/models/sam-status until ready.
  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const r = await fetch(`${apiUrl}/api/models/sam-status`)
        if (!cancelled && r.ok) {
          const data: SamStatus = await r.json()
          setStatus(data)
          setInitialLoad(false)
          if (data.ready) {
            onReady()
            return
          }
          // No GPU — skip the download gate entirely.
          if (data.gpu_available === false) {
            onDismiss()
            return
          }
        }
      } catch {}
      if (!cancelled) setTimeout(tick, 1500)
    }
    tick()
    return () => { cancelled = true }
  }, [apiUrl, onReady])

  /**
   * Start the background download. If `withToken` is provided it's sent
   * in the body; otherwise the backend falls back to HF_TOKEN from the
   * env (only usable when `status.env_token_present` is true).
   */
  const startDownload = async (withToken?: string) => {
    setSubmitting(true)
    setStatus(s => ({ ...s, error: null }))
    try {
      const fd = new FormData()
      fd.append('model_type', 'sam3')
      fd.append('pretrained', 'sam')
      if (withToken) {
        fd.append('hf_token', withToken)
        try { localStorage.setItem(HF_TOKEN_KEY, withToken) } catch {}
      }
      const resp = await fetch(`${apiUrl}/api/models/download`, { method: 'POST', body: fd })
      if (!resp.ok) throw new Error('Failed to start download')
      setStatus(s => ({ ...s, downloading: true, progress: 5 }))
    } catch (err) {
      setStatus(s => ({ ...s, error: err instanceof Error ? err.message : String(err) }))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasteSubmit = () => {
    const t = token.trim()
    if (!t) return
    startDownload(t)
  }

  if (initialLoad) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-6">
      <div className="ambient-orb w-96 h-96 bg-primary/20 absolute top-[-100px] left-[-100px]" />
      <div className="ambient-orb w-96 h-96 bg-primary/10 absolute bottom-[-100px] right-[-100px]" />
      <div className="relative w-full max-w-lg space-y-5">
        <div className="flex flex-col items-center gap-3">
          <OpenSAMAnnotatorLogo size={120} showText={true} />
          <p className="text-xs text-muted-foreground text-center">
            Before you start, set up SAM — or skip and add it later.
          </p>
        </div>

        {status.downloading ? (
          <DownloadingCard status={status} />
        ) : (
          <SetupCard
            status={status}
            token={token}
            showToken={showToken}
            submitting={submitting}
            onTokenChange={setToken}
            onToggleShow={() => setShowToken(v => !v)}
            onUseEnv={() => startDownload()}
            onPasteSubmit={handlePasteSubmit}
            onDismiss={onDismiss}
          />
        )}
      </div>
    </div>
  )
}

function DownloadingCard({ status }: { status: SamStatus }) {
  return (
    <div className="space-y-4 p-6 rounded-xl border border-border/60 bg-card/60 backdrop-blur">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Downloading SAM checkpoints</p>
          <p className="text-xs text-muted-foreground">
            Fetching <code className="font-mono">sam3.pt</code> and{' '}
            <code className="font-mono">sam3.1_multiplex.pt</code> from HuggingFace.
            This may take a few minutes on first run.
          </p>
        </div>
      </div>
      <Progress value={Math.max(5, status.progress)} className="h-1.5" />
      {status.error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Download failed</p>
            <p className="opacity-80">{status.error}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function SetupCard({
  status,
  token,
  showToken,
  submitting,
  onTokenChange,
  onToggleShow,
  onUseEnv,
  onPasteSubmit,
  onDismiss,
}: {
  status: SamStatus
  token: string
  showToken: boolean
  submitting: boolean
  onTokenChange: (v: string) => void
  onToggleShow: () => void
  onUseEnv: () => void
  onPasteSubmit: () => void
  onDismiss: () => void
}) {
  return (
    <div className="space-y-4 p-6 rounded-xl border border-border/60 bg-card/60 backdrop-blur">
      {status.env_token_present && (
        <div className="space-y-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                <code className="font-mono">HF_TOKEN</code> detected in environment
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Click below to download SAM using the env var — no need to paste anything.
              </p>
            </div>
          </div>
          <Button
            onClick={onUseEnv}
            disabled={submitting}
            className="w-full gap-2"
            size="sm"
          >
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            Download SAM using HF_TOKEN
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">
            {status.env_token_present ? 'Or paste a different token' : 'Paste HuggingFace access token'}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => onTokenChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && token.trim()) onPasteSubmit() }}
              placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="pr-9 font-mono text-xs"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={onToggleShow}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button
            onClick={onPasteSubmit}
            disabled={!token.trim() || submitting}
            variant="outline"
            className="gap-2"
          >
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            Download
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          First request access to{' '}
          <a
            href="https://huggingface.co/facebook/sam3"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-primary"
          >
            facebook/sam3
          </a>{' '}
          and{' '}
          <a
            href="https://huggingface.co/facebook/sam3.1"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-primary"
          >
            facebook/sam3.1
          </a>
          , then generate a token at{' '}
          <a
            href="https://huggingface.co/settings/tokens"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-primary"
          >
            hf.co/settings/tokens
          </a>
          .
        </p>
      </div>

      {status.error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Download failed</p>
            <p className="opacity-80">{status.error}</p>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-border/60">
        <button
          onClick={onDismiss}
          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Use without SAM — all auto-annotate features will stay disabled until you add a token in Settings.
        </button>
      </div>
    </div>
  )
}
