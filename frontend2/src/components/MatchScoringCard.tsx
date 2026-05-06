import { useState, useCallback } from 'react'
import { useMatchScoring } from '../hooks/useMatchScoring'
import type { MatchResult } from '../hooks/useMatchScoring'

// ---------------------------------------------------------------------------
// Circular progress ring
// ---------------------------------------------------------------------------

function ScoreRing({ score }: { score: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max(score, 0), 100) / 100
  const offset = circumference * (1 - pct)
  const hue = Math.round(pct * 120) // 0=red, 120=green
  const color = `hsl(${hue}, 75%, 55%)`

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="130" height="130" viewBox="0 0 130 130">
        {/* Track */}
        <circle cx="65" cy="65" r={radius} fill="none" stroke="#374151" strokeWidth="10" />
        {/* Fill */}
        <circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 0.7s ease, stroke 0.7s ease' }}
        />
        {/* Score label */}
        <text x="65" y="60" textAnchor="middle" fontSize="26" fontWeight="bold" fill="white">
          {Math.round(score)}
        </text>
        <text x="65" y="78" textAnchor="middle" fontSize="11" fill="#9ca3af">
          / 100
        </text>
      </svg>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Match Score</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Score breakdown bar
// ---------------------------------------------------------------------------

function ScoreBar({
  label,
  rawScore,
  weight,
}: {
  label: string
  rawScore: number
  weight: number
}) {
  const weighted = rawScore * weight
  const pct = Math.min(rawScore, 100)
  const hue = Math.round((pct / 100) * 120)
  const color = `hsl(${hue}, 70%, 50%)`

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="font-medium text-gray-200">{label}</span>
        <span>
          <span className="text-white font-semibold">{rawScore.toFixed(1)}</span>
          <span className="text-gray-500"> raw · </span>
          <span className="text-indigo-300 font-semibold">{weighted.toFixed(1)}</span>
          <span className="text-gray-500"> weighted ({Math.round(weight * 100)}%)</span>
        </span>
      </div>
      <div className="w-full h-3 rounded-full bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skill diff view
// ---------------------------------------------------------------------------

function SkillDiff({ matched, missing }: { matched: string[]; missing: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
          ✓ Matched Skills
        </p>
        {matched.length === 0 ? (
          <p className="text-gray-600 text-xs italic">None matched</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {matched.map((s) => (
              <span
                key={s}
                className="inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium bg-green-950 border-green-700 text-green-300"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
          ✗ Missing Required Skills
        </p>
        {missing.length === 0 ? (
          <p className="text-gray-600 text-xs italic">None missing</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {missing.map((s) => (
              <span
                key={s}
                className="inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium bg-red-950 border-red-700 text-red-300"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Results view
// ---------------------------------------------------------------------------

function MatchResults({ data, latencyMs }: { data: MatchResult; latencyMs: number | null }) {
  return (
    <div className="space-y-6">
      {latencyMs !== null && (
        <p className="text-xs text-gray-500 text-right">{latencyMs} ms</p>
      )}

      {/* Ring + breakdown side by side */}
      <div className="flex items-start gap-8">
        <ScoreRing score={data.overall_score} />
        <div className="flex-1 space-y-3 pt-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            Score Breakdown
          </p>
          <ScoreBar
            label="Keyword Score"
            rawScore={data.keyword_score}
            weight={data.keyword_weight}
          />
          <ScoreBar
            label="Semantic Score"
            rawScore={data.semantic_score}
            weight={data.semantic_weight}
          />
        </div>
      </div>

      {/* Skill diff */}
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
          Skill Diff
        </p>
        <SkillDiff matched={data.matched_skills} missing={data.missing_skills} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chip input helper
// ---------------------------------------------------------------------------

function ChipInput({
  label,
  chips,
  onChange,
}: {
  label: string
  chips: string[]
  onChange: (chips: string[]) => void
}) {
  const [raw, setRaw] = useState('')

  const commit = useCallback(() => {
    const newChips = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (newChips.length) {
      onChange([...chips, ...newChips])
      setRaw('')
    }
  }, [raw, chips, onChange])

  const remove = useCallback(
    (idx: number) => onChange(chips.filter((_, i) => i !== idx)),
    [chips, onChange],
  )

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-gray-400 font-medium">{label}</label>
      <div className="flex flex-wrap gap-1.5 min-h-[2rem] rounded-lg border border-gray-600 bg-gray-800 px-2 py-1.5">
        {chips.map((c, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-900 border border-indigo-700 text-indigo-200 text-xs"
          >
            {c}
            <button
              onClick={() => remove(i)}
              className="text-indigo-400 hover:text-white leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              commit()
            }
          }}
          placeholder={chips.length === 0 ? 'Type skills, press Enter or comma…' : ''}
          className="flex-1 min-w-[120px] bg-transparent text-gray-100 text-xs outline-none placeholder-gray-600"
        />
      </div>
      <p className="text-xs text-gray-600">Press Enter or comma to add · click × to remove</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export default function MatchScoringCard() {
  const [open, setOpen] = useState(true)
  const [resumeSkills, setResumeSkills] = useState<string[]>([])
  const [jdSkills, setJdSkills] = useState<string[]>([])
  const { state, compute, reset } = useMatchScoring()

  const canCompute =
    (resumeSkills.length > 0 || jdSkills.length > 0) && state.status !== 'loading'

  const handleCompute = useCallback(() => {
    if (canCompute) compute(resumeSkills, jdSkills)
  }, [canCompute, compute, resumeSkills, jdSkills])

  const handleReset = useCallback(() => {
    setResumeSkills([])
    setJdSkills([])
    reset()
  }, [reset])

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800 transition-colors"
      >
        <span className="font-semibold text-white text-sm tracking-wide">
          EPIC 5 — Match Scoring
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-700 pt-4">
          {/* Skill inputs */}
          <div className="grid grid-cols-2 gap-4">
            <ChipInput
              label="Resume Skills"
              chips={resumeSkills}
              onChange={setResumeSkills}
            />
            <ChipInput
              label="JD Required Skills"
              chips={jdSkills}
              onChange={setJdSkills}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCompute}
              disabled={!canCompute}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
            >
              {state.status === 'loading' ? 'Computing…' : 'Compute Match Score'}
            </button>
            {state.status !== 'idle' && (
              <button onClick={handleReset} className="text-xs text-gray-500 hover:text-gray-300 underline">
                Reset
              </button>
            )}
          </div>

          {/* Error */}
          {state.status === 'error' && (
            <div className="flex items-center gap-3 rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
              <span>✗</span>
              <span>{state.errorMessage}</span>
            </div>
          )}

          {/* Results */}
          {state.status === 'success' && state.data && (
            <MatchResults data={state.data} latencyMs={state.latencyMs} />
          )}
        </div>
      )}
    </div>
  )
}
