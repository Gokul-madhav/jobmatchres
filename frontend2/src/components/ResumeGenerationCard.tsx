/**
 * ResumeGenerationCard — EPIC 10 smoke-test panel.
 *
 * Sections:
 *  1. Session ID input (auto-populated from URL params if available)
 *  2. Template Selector (clean / modern)
 *  3. Approved Suggestions note + list
 *  4. Generate Resume button
 *  5. PDF Preview iframe
 *  6. Approved Suggestions Applied checklist
 *  7. Download button with countdown timer
 *  8. Content Preservation check (sections not targeted by any suggestion)
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useResumeGeneration } from '../hooks/useResumeGeneration'
import type { SuggestionItem } from '../hooks/useSessionManager'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_SECTIONS = ['Summary', 'Skills', 'Experience', 'Education', 'Projects'] as const
type ResumeSection = (typeof ALL_SECTIONS)[number]

// ---------------------------------------------------------------------------
// Template preview thumbnails (ASCII/SVG mockups)
// ---------------------------------------------------------------------------

function CleanPreview() {
  return (
    <svg viewBox="0 0 80 100" className="w-full h-full" aria-hidden="true">
      <rect width="80" height="100" fill="#1f2937" rx="2" />
      {/* Name */}
      <rect x="15" y="8" width="50" height="5" rx="1" fill="#e5e7eb" />
      {/* Contact */}
      <rect x="20" y="16" width="40" height="2.5" rx="1" fill="#6b7280" />
      {/* HR */}
      <line x1="5" y1="23" x2="75" y2="23" stroke="#9ca3af" strokeWidth="0.5" />
      {/* Section header */}
      <rect x="5" y="27" width="20" height="3" rx="1" fill="#e5e7eb" />
      <line x1="5" y1="32" x2="75" y2="32" stroke="#9ca3af" strokeWidth="0.5" />
      {/* Body lines */}
      <rect x="5" y="35" width="65" height="2" rx="1" fill="#4b5563" />
      <rect x="5" y="39" width="55" height="2" rx="1" fill="#4b5563" />
      {/* Section header 2 */}
      <rect x="5" y="46" width="25" height="3" rx="1" fill="#e5e7eb" />
      <line x1="5" y1="51" x2="75" y2="51" stroke="#9ca3af" strokeWidth="0.5" />
      <rect x="5" y="54" width="60" height="2" rx="1" fill="#4b5563" />
      <rect x="5" y="58" width="50" height="2" rx="1" fill="#4b5563" />
      <rect x="5" y="62" width="45" height="2" rx="1" fill="#4b5563" />
      {/* Section header 3 */}
      <rect x="5" y="69" width="30" height="3" rx="1" fill="#e5e7eb" />
      <line x1="5" y1="74" x2="75" y2="74" stroke="#9ca3af" strokeWidth="0.5" />
      <rect x="5" y="77" width="55" height="2" rx="1" fill="#4b5563" />
      <rect x="5" y="81" width="40" height="2" rx="1" fill="#4b5563" />
    </svg>
  )
}

function ModernPreview() {
  return (
    <svg viewBox="0 0 80 100" className="w-full h-full" aria-hidden="true">
      <rect width="80" height="100" fill="#1f2937" rx="2" />
      {/* Name */}
      <rect x="15" y="8" width="50" height="5" rx="1" fill="#e5e7eb" />
      {/* Contact */}
      <rect x="20" y="16" width="40" height="2.5" rx="1" fill="#6b7280" />
      {/* Accent HR */}
      <line x1="5" y1="23" x2="75" y2="23" stroke="#2C3E50" strokeWidth="1.5" />
      {/* Section header */}
      <rect x="5" y="27" width="20" height="3" rx="1" fill="#93c5fd" />
      <line x1="5" y1="32" x2="75" y2="32" stroke="#2C3E50" strokeWidth="1.5" />
      {/* Body lines */}
      <rect x="5" y="36" width="65" height="2" rx="1" fill="#4b5563" />
      <rect x="5" y="40" width="55" height="2" rx="1" fill="#4b5563" />
      {/* Section header 2 */}
      <rect x="5" y="48" width="25" height="3" rx="1" fill="#93c5fd" />
      <line x1="5" y1="53" x2="75" y2="53" stroke="#2C3E50" strokeWidth="1.5" />
      <rect x="5" y="57" width="60" height="2" rx="1" fill="#4b5563" />
      <rect x="5" y="61" width="50" height="2" rx="1" fill="#4b5563" />
      <rect x="5" y="65" width="45" height="2" rx="1" fill="#4b5563" />
      {/* Section header 3 */}
      <rect x="5" y="73" width="30" height="3" rx="1" fill="#93c5fd" />
      <line x1="5" y1="78" x2="75" y2="78" stroke="#2C3E50" strokeWidth="1.5" />
      <rect x="5" y="82" width="55" height="2" rx="1" fill="#4b5563" />
      <rect x="5" y="86" width="40" height="2" rx="1" fill="#4b5563" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Template card
// ---------------------------------------------------------------------------

function TemplateCard({
  id,
  label,
  description,
  selected,
  onSelect,
  preview,
}: {
  id: string
  label: string
  description: string
  selected: boolean
  onSelect: () => void
  preview: React.ReactNode
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex-1 rounded-lg border-2 p-3 text-left transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-950/40'
          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
      }`}
    >
      <div className="w-full aspect-[4/5] mb-2 rounded overflow-hidden">
        {preview}
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
            selected ? 'border-indigo-400 bg-indigo-400' : 'border-gray-500'
          }`}
        />
        <span className="text-sm font-medium text-gray-100">{label}</span>
      </div>
      <p className="text-xs text-gray-500 mt-1 ml-5">{description}</p>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Countdown timer
// ---------------------------------------------------------------------------

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!expiresAt) {
      setRemaining('')
      return
    }

    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('expired')
        return
      }
      const totalMinutes = Math.floor(diff / 60000)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      setRemaining(`${hours}h ${minutes}m`)
    }

    update()
    const interval = setInterval(update, 30000) // update every 30s
    return () => clearInterval(interval)
  }, [expiresAt])

  return remaining
}

// ---------------------------------------------------------------------------
// Suggestion item row
// ---------------------------------------------------------------------------

function SuggestionRow({
  suggestion,
  applied,
}: {
  suggestion: SuggestionItem
  applied: boolean
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
      {applied ? (
        <span className="text-green-400 text-sm flex-shrink-0 mt-0.5">✓</span>
      ) : (
        <span className="text-gray-500 text-sm flex-shrink-0 mt-0.5">○</span>
      )}
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium">{suggestion.target_section}</p>
        <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
          {suggestion.suggested_change}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export default function ResumeGenerationCard() {
  const [open, setOpen] = useState(true)
  const { state, generate, reset } = useResumeGeneration()

  // Session ID — auto-populate from URL params if available
  const [sessionId, setSessionId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('session_id') ?? ''
    } catch {
      return ''
    }
  })

  const [templateId, setTemplateId] = useState<'clean' | 'modern'>('clean')

  // Approved suggestions — fetched from session or entered manually
  const [approvedSuggestions, setApprovedSuggestions] = useState<SuggestionItem[]>([])
  const [sessionFetchError, setSessionFetchError] = useState('')
  const [fetchingSession, setFetchingSession] = useState(false)

  const countdown = useCountdown(state.expiresAt)

  // Derive download URL for the iframe — use the /download endpoint
  const downloadEndpoint = sessionId
    ? `/api/v1/sessions/${sessionId}/download`
    : null

  // Sections NOT targeted by any approved suggestion
  const targetedSections = new Set(
    approvedSuggestions.map((s) => s.target_section),
  )
  const preservedSections = ALL_SECTIONS.filter(
    (s) => !targetedSections.has(s),
  )

  // ---------------------------------------------------------------------------
  // Fetch session to get approved suggestions
  // ---------------------------------------------------------------------------

  const fetchSessionSuggestions = useCallback(async () => {
    if (!sessionId.trim()) return
    setFetchingSession(true)
    setSessionFetchError('')
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId.trim()}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setSessionFetchError(
          (json.message as string) ?? `HTTP ${res.status} — session not found`,
        )
        setApprovedSuggestions([])
        return
      }
      const data = await res.json()
      const suggestions: SuggestionItem[] = (data.suggestions ?? []) as SuggestionItem[]
      const approved = suggestions.filter((s) => s.approved === true)
      setApprovedSuggestions(approved)
      if (approved.length === 0) {
        setSessionFetchError(
          'No approved suggestions found. Approve suggestions in the EPIC 9 panel first.',
        )
      }
    } catch (err) {
      setSessionFetchError(
        err instanceof Error ? err.message : 'Network error fetching session',
      )
    } finally {
      setFetchingSession(false)
    }
  }, [sessionId])

  // ---------------------------------------------------------------------------
  // Generate handler
  // ---------------------------------------------------------------------------

  const handleGenerate = useCallback(async () => {
    if (!sessionId.trim()) return
    await generate(sessionId.trim(), templateId, approvedSuggestions)
  }, [generate, sessionId, templateId, approvedSuggestions])

  // ---------------------------------------------------------------------------
  // Reset handler
  // ---------------------------------------------------------------------------

  const handleReset = useCallback(() => {
    reset()
    setApprovedSuggestions([])
    setSessionFetchError('')
  }, [reset])

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white text-sm tracking-wide">
            EPIC 10 — Resume Generation
          </span>
          {state.status === 'success' && (
            <span className="px-2 py-0.5 rounded-full bg-green-900 border border-green-700 text-green-300 text-xs">
              PDF ready
            </span>
          )}
        </div>
        <span className="text-gray-400 text-xs">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-6 border-t border-gray-700 pt-4">

          {/* ── 1. Session ID input ── */}
          <section className="space-y-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              Session
            </p>
            <p className="text-xs text-gray-500">
              Enter a session ID that has approved suggestions. Use the EPIC 9 panel to create a
              session and approve suggestions first.
            </p>
            <div className="flex gap-2">
              <input
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchSessionSuggestions()}
                placeholder="Enter session ID…"
                className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600 font-mono"
              />
              <button
                onClick={fetchSessionSuggestions}
                disabled={fetchingSession || !sessionId.trim()}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium transition-colors"
              >
                {fetchingSession ? 'Loading…' : 'Load'}
              </button>
            </div>

            {sessionFetchError && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-700 bg-amber-950/40 px-3 py-2 text-xs text-amber-300">
                <span className="flex-shrink-0">⚠</span>
                <span>{sessionFetchError}</span>
              </div>
            )}
          </section>

          {/* ── 2. Template Selector ── */}
          <section className="space-y-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              Template
            </p>
            <div className="flex gap-3">
              <TemplateCard
                id="clean"
                label="Clean"
                description="Minimal layout, black text, thin dividers"
                selected={templateId === 'clean'}
                onSelect={() => setTemplateId('clean')}
                preview={<CleanPreview />}
              />
              <TemplateCard
                id="modern"
                label="Modern"
                description="Dark-gray headers, accent lines, more spacing"
                selected={templateId === 'modern'}
                onSelect={() => setTemplateId('modern')}
                preview={<ModernPreview />}
              />
            </div>
          </section>

          {/* ── 3. Approved Suggestions ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Approved Suggestions
              </p>
              {approvedSuggestions.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-green-900 border border-green-700 text-green-300 text-xs">
                  {approvedSuggestions.length} approved
                </span>
              )}
            </div>

            {approvedSuggestions.length === 0 ? (
              <p className="text-xs text-gray-600 italic">
                Load a session above to see its approved suggestions, or approve suggestions in the
                EPIC 9 panel first.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {approvedSuggestions.map((s) => (
                  <SuggestionRow key={s.id} suggestion={s} applied={false} />
                ))}
              </div>
            )}
          </section>

          {/* ── 4. Generate button ── */}
          <section className="space-y-3">
            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={state.status === 'loading' || !sessionId.trim()}
                className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold transition-colors"
              >
                {state.status === 'loading' ? 'Generating…' : 'Generate Resume PDF'}
              </button>
              {state.status !== 'idle' && (
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  Reset
                </button>
              )}
            </div>

            {state.latencyMs !== null && state.status === 'success' && (
              <p className="text-xs text-gray-500">{state.latencyMs} ms</p>
            )}

            {/* Error */}
            {state.status === 'error' && (
              <div className="flex items-center gap-3 rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
                <span>✗</span>
                <span>{state.errorMessage}</span>
              </div>
            )}
          </section>

          {/* ── 5–8. Post-generation panels ── */}
          {state.status === 'success' && state.downloadUrl && (
            <>
              {/* ── 5. PDF Preview ── */}
              <section className="space-y-3">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  PDF Preview
                </p>
                {downloadEndpoint && (
                  <div className="rounded-lg border border-gray-700 overflow-hidden">
                    <iframe
                      src={downloadEndpoint}
                      title="Generated Resume PDF"
                      className="w-full"
                      style={{ height: '500px', border: 'none' }}
                    />
                  </div>
                )}
              </section>

              {/* ── 6. Approved Suggestions Applied checklist ── */}
              {approvedSuggestions.length > 0 && (
                <section className="space-y-3">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    Suggestions Applied
                  </p>
                  <div className="space-y-1.5">
                    {approvedSuggestions.map((s) => (
                      <SuggestionRow key={s.id} suggestion={s} applied={true} />
                    ))}
                  </div>
                </section>
              )}

              {/* ── 7. Download button with countdown ── */}
              <section className="space-y-3">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  Download
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  <a
                    href={downloadEndpoint ?? state.downloadUrl}
                    download={`resume_${sessionId}.pdf`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
                  >
                    ↓ Download PDF
                  </a>
                  {countdown && (
                    <p className="text-xs text-gray-500">
                      Link valid for 24h —{' '}
                      {countdown === 'expired' ? (
                        <span className="text-red-400">expired</span>
                      ) : (
                        <>
                          expires in{' '}
                          <span className="text-gray-300 font-mono">{countdown}</span>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </section>

              {/* ── 8. Content Preservation check ── */}
              <section className="space-y-3">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  Content Preservation
                </p>
                {preservedSections.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">
                    All sections had approved suggestions applied.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500">
                      These sections were preserved unchanged (no approved suggestions targeted them):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {preservedSections.map((section) => (
                        <span
                          key={section}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-600 bg-gray-800 text-xs text-gray-300"
                        >
                          <span className="text-green-400">✓</span>
                          {section}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </>
          )}

        </div>
      )}
    </div>
  )
}
