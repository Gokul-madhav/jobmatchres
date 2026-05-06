/**
 * SessionManagerCard — EPIC 9 smoke-test panel.
 *
 * Sections:
 *  1. Session Lifecycle stepper (Upload → Score → Questions → Answers → Suggestions → Approve)
 *  2. Session Inspector (fetch full session JSON by ID, collapsible tree viewer)
 *  3. Error Simulation (trigger specific error codes and inspect response)
 *  4. Request Log (last 10 API calls, auto-refreshes every 5 seconds)
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useSessionManager } from '../hooks/useSessionManager'
import type { LifecycleStep, RequestLogEntry } from '../hooks/useSessionManager'
import { highlightJson } from '../utils/jsonHighlight'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ERROR_CODES = [
  'SESSION_NOT_FOUND',
  'JD_TOO_SHORT',
  'UNSUPPORTED_FORMAT',
  'FILE_TOO_LARGE',
  'PARSE_FAILURE',
  'LLM_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const

type ErrorCode = (typeof ERROR_CODES)[number]

const ERROR_CODE_DESCRIPTIONS: Record<ErrorCode, string> = {
  SESSION_NOT_FOUND: 'GET /sessions/nonexistent-id/questions → 404',
  JD_TOO_SHORT: 'POST /sessions with jd_text="short" → 400',
  UNSUPPORTED_FORMAT: 'POST /sessions with .txt file → 400',
  FILE_TOO_LARGE: 'POST /sessions with 6MB file → 400',
  PARSE_FAILURE: 'POST /sessions with empty PDF → 422',
  LLM_UNAVAILABLE: 'POST /dev/suggestions (no API key) → 206',
  INTERNAL_ERROR: 'GET /sessions/trigger-500/questions → 404',
}

// ---------------------------------------------------------------------------
// Step status badge
// ---------------------------------------------------------------------------

function StepBadge({ status }: { status: LifecycleStep['status'] }) {
  const map = {
    pending: 'bg-gray-700 border-gray-600 text-gray-400',
    active: 'bg-blue-900 border-blue-700 text-blue-300 animate-pulse',
    complete: 'bg-green-900 border-green-700 text-green-300',
    error: 'bg-red-900 border-red-700 text-red-300',
  }
  const icons = { pending: '○', active: '◉', complete: '✓', error: '✗' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-bold ${map[status]}`}>
      {icons[status]}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Lifecycle Stepper
// ---------------------------------------------------------------------------

function LifecycleStepper({ steps }: { steps: LifecycleStep[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <div
          key={step.id}
          className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
            step.status === 'complete'
              ? 'border-green-800 bg-green-950/30'
              : step.status === 'active'
              ? 'border-blue-800 bg-blue-950/30'
              : step.status === 'error'
              ? 'border-red-800 bg-red-950/30'
              : 'border-gray-700 bg-gray-800/50'
          }`}
        >
          <span className="text-xs text-gray-500 w-4 text-right flex-shrink-0">{idx + 1}</span>
          <StepBadge status={step.status} />
          <span className="text-sm text-gray-200 font-medium flex-1">{step.label}</span>
          {step.timestamp && (
            <span className="text-xs text-gray-500 font-mono flex-shrink-0">
              {new Date(step.timestamp).toLocaleTimeString()}
            </span>
          )}
          {step.errorMessage && (
            <span className="text-xs text-red-400 truncate max-w-[200px]" title={step.errorMessage}>
              {step.errorMessage}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Session Inspector
// ---------------------------------------------------------------------------

function SessionInspector({
  onFetch,
}: {
  onFetch: (id: string) => Promise<unknown>
}) {
  const [inputId, setInputId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const handleFetch = useCallback(async () => {
    if (!inputId.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await onFetch(inputId.trim())
      if (!data) {
        setError('Session not found or expired.')
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [inputId, onFetch])

  const handleCopy = useCallback(() => {
    if (!result) return
    navigator.clipboard.writeText(JSON.stringify(result, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [result])

  const html = result ? highlightJson(result) : ''

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
          placeholder="Enter session ID…"
          className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600 font-mono"
        />
        <button
          onClick={handleFetch}
          disabled={loading || !inputId.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
        >
          {loading ? 'Fetching…' : 'Fetch'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-700 bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-gray-700 bg-gray-950 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="text-xs text-gray-400 font-mono hover:text-gray-200 transition-colors"
            >
              {collapsed ? '▶ session JSON' : '▼ session JSON'}
            </button>
            <button
              onClick={handleCopy}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          {!collapsed && (
            <pre
              className="p-3 text-xs font-mono leading-relaxed overflow-x-auto max-h-96"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error Simulation
// ---------------------------------------------------------------------------

function ErrorSimulation({
  onSimulate,
}: {
  onSimulate: (code: string) => Promise<{ status: number; data: unknown }>
}) {
  const [selected, setSelected] = useState<ErrorCode>('SESSION_NOT_FOUND')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ status: number; data: unknown } | null>(null)

  const handleTrigger = useCallback(async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await onSimulate(selected)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }, [selected, onSimulate])

  const statusColor = (status: number) => {
    if (status === 0) return 'text-gray-400'
    if (status < 300) return 'text-green-400'
    if (status < 400) return 'text-blue-400'
    if (status < 500) return 'text-amber-400'
    return 'text-red-400'
  }

  const html = result ? highlightJson(result.data) : ''

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value as ErrorCode)}
          className="flex-1 min-w-[200px] rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          {ERROR_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <button
          onClick={handleTrigger}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
        >
          {loading ? 'Triggering…' : 'Trigger'}
        </button>
      </div>

      <p className="text-xs text-gray-500 font-mono">{ERROR_CODE_DESCRIPTIONS[selected]}</p>

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">HTTP Status:</span>
            <span className={`text-sm font-bold font-mono ${statusColor(result.status)}`}>
              {result.status || 'ERR'}
            </span>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-950 overflow-hidden">
            <div className="px-3 py-1.5 bg-gray-800 border-b border-gray-700 text-xs text-gray-400 font-mono">
              response body
            </div>
            <pre
              className="p-3 text-xs font-mono leading-relaxed overflow-x-auto max-h-48"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Request Log
// ---------------------------------------------------------------------------

function RequestLog({ entries }: { entries: RequestLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-gray-600 italic">No API calls recorded yet.</p>
    )
  }

  const statusColor = (code: number) => {
    if (code === 0) return 'text-gray-400'
    if (code < 300) return 'text-green-400'
    if (code === 206) return 'text-amber-400'
    if (code < 400) return 'text-blue-400'
    if (code < 500) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-800">
            <th className="text-left px-3 py-2 text-gray-400 font-medium">Endpoint</th>
            <th className="text-center px-2 py-2 text-gray-400 font-medium w-12">Method</th>
            <th className="text-center px-2 py-2 text-gray-400 font-medium w-14">Status</th>
            <th className="text-right px-2 py-2 text-gray-400 font-medium w-16">Duration</th>
            <th className="text-left px-2 py-2 text-gray-400 font-medium w-28">Request ID</th>
            <th className="text-right px-2 py-2 text-gray-400 font-medium w-20">Time</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-gray-700 last:border-0 hover:bg-gray-800/50">
              <td className="px-3 py-1.5 text-gray-300 font-mono truncate max-w-[200px]" title={entry.endpoint}>
                {entry.endpoint.replace('/api/v1', '')}
              </td>
              <td className="px-2 py-1.5 text-center">
                <span className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 font-mono text-xs">
                  {entry.method}
                </span>
              </td>
              <td className={`px-2 py-1.5 text-center font-bold font-mono ${statusColor(entry.statusCode)}`}>
                {entry.statusCode || 'ERR'}
              </td>
              <td className="px-2 py-1.5 text-right text-gray-400 font-mono">
                {entry.durationMs}ms
              </td>
              <td className="px-2 py-1.5 text-gray-500 font-mono truncate max-w-[100px]" title={entry.requestId ?? ''}>
                {entry.requestId ? entry.requestId.slice(0, 8) + '…' : '—'}
              </td>
              <td className="px-2 py-1.5 text-right text-gray-500 font-mono">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Upload Form (for lifecycle stepper demo)
// ---------------------------------------------------------------------------

function UploadForm({
  onSubmit,
  loading,
}: {
  onSubmit: (file: File, jdText: string) => void
  loading: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const [jdText, setJdText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }, [])

  const handleSubmit = () => {
    if (!file || jdText.trim().length < 50) return
    onSubmit(file, jdText)
  }

  return (
    <div className="space-y-3">
      {/* File drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-lg border-2 border-dashed border-gray-600 bg-gray-800 px-4 py-6 text-center cursor-pointer hover:border-indigo-500 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="space-y-1">
            <p className="text-sm text-green-400 font-medium">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-gray-400">Drop PDF or DOCX here, or click to browse</p>
            <p className="text-xs text-gray-600">Max 5 MB</p>
          </div>
        )}
      </div>

      {/* JD textarea */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-400 font-medium">Job Description</label>
          <span className={`text-xs font-mono ${jdText.length < 50 ? 'text-amber-500' : 'text-green-500'}`}>
            {jdText.length} chars {jdText.length < 50 ? `(need ${50 - jdText.length} more)` : '✓'}
          </span>
        </div>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste job description here (min 50 characters)…"
          rows={4}
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500 placeholder-gray-600 resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !file || jdText.trim().length < 50}
        className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold transition-colors"
      >
        {loading ? 'Creating session…' : 'Create Session'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export default function SessionManagerCard() {
  const [open, setOpen] = useState(true)
  const {
    state,
    createSession,
    generateQuestions,
    fetchSession,
    simulateError,
    reset,
  } = useSessionManager()

  // Auto-refresh request log every 5 seconds when a session ID is set
  const [inspectorId, setInspectorId] = useState('')
  const [autoRefreshData, setAutoRefreshData] = useState<unknown>(null)
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (state.sessionId) {
      setInspectorId(state.sessionId)
    }
  }, [state.sessionId])

  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current)
    if (inspectorId) {
      autoRefreshRef.current = setInterval(async () => {
        const data = await fetchSession(inspectorId)
        if (data) setAutoRefreshData(data)
      }, 5000)
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current)
    }
  }, [inspectorId, fetchSession])

  const handleCreateSession = useCallback(
    async (file: File, jdText: string) => {
      const sessionId = await createSession(file, jdText)
      if (sessionId) {
        // Auto-generate questions after session creation
        await generateQuestions(sessionId)
      }
    },
    [createSession, generateQuestions],
  )

  const handleFetchSession = useCallback(
    async (id: string) => {
      setInspectorId(id)
      return fetchSession(id)
    },
    [fetchSession],
  )

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white text-sm tracking-wide">
            EPIC 9 — API &amp; Session Management
          </span>
          {state.sessionId && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-900 border border-indigo-700 text-indigo-300 text-xs font-mono">
              {state.sessionId.slice(0, 8)}…
            </span>
          )}
        </div>
        <span className="text-gray-400 text-xs">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-6 border-t border-gray-700 pt-4">

          {/* ── Session Lifecycle Stepper ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Session Lifecycle
              </p>
              {(state.sessionId || state.status === 'error') && (
                <button
                  onClick={reset}
                  className="text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  Reset
                </button>
              )}
            </div>

            <LifecycleStepper steps={state.steps} />

            {/* Upload form — shown when no session yet */}
            {!state.sessionId && (
              <UploadForm
                onSubmit={handleCreateSession}
                loading={state.status === 'loading'}
              />
            )}

            {/* Session created — show session ID */}
            {state.sessionId && (
              <div className="rounded-lg border border-green-800 bg-green-950/30 px-4 py-3 space-y-1">
                <p className="text-xs text-green-400 font-semibold">Session created</p>
                <p className="text-xs text-gray-400 font-mono break-all">{state.sessionId}</p>
              </div>
            )}

            {/* LLM fallback banner */}
            {state.fallbackMode && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-700 bg-amber-950 px-4 py-3 text-sm text-amber-300">
                <span>⚠</span>
                <span>
                  <strong>Fallback mode</strong> — LLM unavailable.
                  {state.llmError && <span className="text-xs text-amber-400 ml-1 font-mono">{state.llmError}</span>}
                </span>
              </div>
            )}

            {/* Error banner */}
            {state.status === 'error' && state.errorMessage && (
              <div className="flex items-center gap-3 rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
                <span>✗</span>
                <span>{state.errorMessage}</span>
              </div>
            )}
          </section>

          {/* ── Session Inspector ── */}
          <section className="space-y-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              Session Inspector
            </p>
            <SessionInspector onFetch={handleFetchSession} />
            {autoRefreshData && inspectorId && (
              <p className="text-xs text-gray-600">
                Auto-refreshing every 5s for session <span className="font-mono">{inspectorId.slice(0, 8)}…</span>
              </p>
            )}
          </section>

          {/* ── Error Simulation ── */}
          <section className="space-y-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              Error Simulation
            </p>
            <ErrorSimulation onSimulate={simulateError} />
          </section>

          {/* ── Request Log ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Request Log
                <span className="ml-2 text-gray-600 normal-case font-normal">
                  (last {state.requestLog.length} of 10)
                </span>
              </p>
              <span className="text-xs text-gray-600">auto-refreshes every 5s</span>
            </div>
            <RequestLog entries={state.requestLog} />
          </section>

        </div>
      )}
    </div>
  )
}
