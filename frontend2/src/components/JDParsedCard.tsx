import { useState, useCallback } from 'react'
import { useJDParser } from '../hooks/useJDParser'
import type { ParsedJD } from '../hooks/useJDParser'

const JD_MIN_LENGTH = 50

// ---------------------------------------------------------------------------
// Skill chips
// ---------------------------------------------------------------------------

function SkillChip({ label, variant }: { label: string; variant: 'required' | 'preferred' }) {
  const cls =
    variant === 'required'
      ? 'bg-red-950 border-red-700 text-red-300'
      : 'bg-blue-950 border-blue-700 text-blue-300'
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Keyword tag cloud
// ---------------------------------------------------------------------------

function KeywordCloud({ keywords }: { keywords: string[] }) {
  if (!keywords.length) return <p className="text-gray-500 text-xs italic">No keywords extracted.</p>

  // Parse "keyword:weight" format
  const parsed = keywords.map((kw) => {
    const idx = kw.lastIndexOf(':')
    if (idx === -1) return { word: kw, weight: 0 }
    return { word: kw.slice(0, idx), weight: parseFloat(kw.slice(idx + 1)) || 0 }
  })

  const maxWeight = Math.max(...parsed.map((k) => k.weight), 0.001)

  return (
    <div className="flex flex-wrap gap-2">
      {parsed.map(({ word, weight }) => {
        const opacity = 0.4 + 0.6 * (weight / maxWeight)
        const size = weight / maxWeight > 0.6 ? 'text-sm' : 'text-xs'
        return (
          <span
            key={word}
            title={`TF-IDF weight: ${weight.toFixed(4)}`}
            className={`px-2 py-0.5 rounded bg-gray-700 text-gray-200 font-medium cursor-default ${size}`}
            style={{ opacity }}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Experience range display
// ---------------------------------------------------------------------------

function ExperienceRange({ min, max }: { min: number | null; max: number | null }) {
  if (min === null && max === null) {
    return <p className="text-gray-500 text-xs italic">Not specified</p>
  }

  const minVal = min ?? 0
  const maxVal = max ?? minVal + 3
  const rangeMax = Math.max(maxVal + 2, 10)
  const leftPct = (minVal / rangeMax) * 100
  const widthPct = ((maxVal - minVal) / rangeMax) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>0 yrs</span>
        <span className="font-semibold text-white">
          {min !== null && max !== null
            ? `${min} – ${max} years`
            : min !== null
            ? `${min}+ years`
            : `Up to ${max} years`}
        </span>
        <span>{rangeMax} yrs</span>
      </div>
      <div className="relative w-full h-3 rounded-full bg-gray-700 overflow-hidden">
        <div
          className="absolute h-full rounded-full bg-indigo-500"
          style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 4)}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ParsedJD viewer
// ---------------------------------------------------------------------------

function ParsedJDViewer({ data, latencyMs }: { data: ParsedJD; latencyMs: number | null }) {
  return (
    <div className="space-y-5">
      {latencyMs !== null && (
        <p className="text-xs text-gray-500 text-right">{latencyMs} ms</p>
      )}

      {/* Skills — two columns */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
            Required Skills
          </p>
          {data.required_skills.length === 0 ? (
            <p className="text-gray-500 text-xs italic">None detected</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {data.required_skills.map((s) => (
                <SkillChip key={s} label={s} variant="required" />
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
            Preferred Skills
          </p>
          {data.preferred_skills.length === 0 ? (
            <p className="text-gray-500 text-xs italic">None detected</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {data.preferred_skills.map((s) => (
                <SkillChip key={s} label={s} variant="preferred" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Keywords tag cloud */}
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
          Keywords <span className="text-gray-600 normal-case">(hover for TF-IDF weight)</span>
        </p>
        <KeywordCloud keywords={data.keywords} />
      </div>

      {/* Experience range */}
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
          Experience Range
        </p>
        <ExperienceRange min={data.min_experience_years} max={data.max_experience_years} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export default function JDParsedCard() {
  const [open, setOpen] = useState(true)
  const [text, setText] = useState('')
  const { state, parseJD, reset } = useJDParser()

  const charCount = text.length
  const tooShort = charCount > 0 && charCount < JD_MIN_LENGTH
  const canSubmit = charCount >= JD_MIN_LENGTH && state.status !== 'loading'

  const handleSubmit = useCallback(() => {
    if (canSubmit) parseJD(text)
  }, [canSubmit, parseJD, text])

  const handleReset = useCallback(() => {
    setText('')
    reset()
  }, [reset])

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800 transition-colors"
      >
        <span className="font-semibold text-white text-sm tracking-wide">
          EPIC 3 — JD Parsing
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-700 pt-4">
          {/* Textarea + char counter */}
          {state.status !== 'success' && (
            <div className="space-y-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste a job description here…"
                rows={6}
                className="w-full resize-y rounded-lg border border-gray-600 bg-gray-800 text-gray-100 text-sm px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <div className="flex items-center justify-between text-xs">
                <span
                  className={
                    tooShort
                      ? 'text-amber-400 font-medium'
                      : charCount >= JD_MIN_LENGTH
                      ? 'text-green-400'
                      : 'text-gray-500'
                  }
                >
                  {tooShort
                    ? `⚠ Minimum ${JD_MIN_LENGTH} characters required (${JD_MIN_LENGTH - charCount} more needed)`
                    : charCount >= JD_MIN_LENGTH
                    ? `✓ ${charCount} characters`
                    : `${charCount} / ${JD_MIN_LENGTH} characters`}
                </span>
                {charCount > 0 && (
                  <button onClick={handleReset} className="text-gray-500 hover:text-gray-300">
                    Clear
                  </button>
                )}
              </div>

              {/* Inline JD_TOO_SHORT validation — no API call */}
              {tooShort && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-700 bg-amber-950 px-3 py-2 text-xs text-amber-300">
                  <span>⚠</span>
                  <span>
                    <strong>JD_TOO_SHORT</strong> — The job description must be at least {JD_MIN_LENGTH} characters.
                    No request will be sent until this is resolved.
                  </span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="mt-1 w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium py-2 transition-colors"
              >
                {state.status === 'loading' ? 'Parsing…' : 'Parse JD'}
              </button>
            </div>
          )}

          {/* Loading */}
          {state.status === 'loading' && (
            <p className="text-sm text-indigo-400 animate-pulse text-center">Parsing job description…</p>
          )}

          {/* Error */}
          {state.status === 'error' && (
            <div className="flex items-start gap-3 rounded-lg border border-red-700 bg-red-950 px-4 py-3">
              <span className="text-red-400 text-lg mt-0.5">✗</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-300">{state.errorCode}</p>
                <p className="text-xs text-red-400 mt-0.5">{state.errorMessage}</p>
              </div>
              <button onClick={handleReset} className="text-red-500 hover:text-red-300 text-sm ml-2">✕</button>
            </div>
          )}

          {/* Success */}
          {state.status === 'success' && state.data && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-400 font-medium">✓ JD parsed successfully</span>
                <button onClick={handleReset} className="text-xs text-gray-500 hover:text-gray-300 underline">
                  Parse another
                </button>
              </div>
              <ParsedJDViewer data={state.data} latencyMs={state.latencyMs} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
