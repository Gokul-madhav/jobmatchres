import { useState, useCallback } from 'react'
import { useATSScoring } from '../hooks/useATSScoring'
import type { ATSResult, ATSSubScore } from '../hooks/useATSScoring'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STANDARD_SECTIONS = ['summary', 'skills', 'experience', 'education', 'projects'] as const
type StandardSection = (typeof STANDARD_SECTIONS)[number]

const SECTION_LABELS: Record<StandardSection, string> = {
  summary: 'Summary',
  skills: 'Skills',
  experience: 'Work Experience',
  education: 'Education',
  projects: 'Projects',
}

const SUB_SCORE_LABELS: Record<string, string> = {
  keyword: 'Keyword Match',
  semantic: 'Semantic Similarity',
  section_completeness: 'Section Completeness',
  formatting: 'Formatting',
  experience_match: 'Experience Match',
}

const FORMATTING_ISSUE_LABELS: Record<string, string> = {
  table_detected: 'Table detected',
  image_detected: 'Image detected',
  multi_column_detected: 'Multi-column layout',
  non_standard_font: 'Non-standard font',
}

const FORMATTING_DEDUCTIONS: Record<string, number> = {
  table_detected: 25,
  image_detected: 20,
  multi_column_detected: 20,
  non_standard_font: 15,
}

// ---------------------------------------------------------------------------
// Speedometer gauge
// ---------------------------------------------------------------------------

function SpeedometerGauge({ score }: { score: number }) {
  // Semi-circle arc from 180° to 0° (left to right)
  const cx = 90
  const cy = 90
  const r = 70
  const startAngle = 180
  const endAngle = 0

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const arcX = (deg: number) => cx + r * Math.cos(toRad(deg))
  const arcY = (deg: number) => cy + r * Math.sin(toRad(deg))

  // Track arc (full semi-circle)
  const trackD = `M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 0 1 ${arcX(endAngle)} ${arcY(endAngle)}`

  // Fill arc based on score
  const pct = Math.min(Math.max(score, 0), 100) / 100
  const fillAngle = startAngle - pct * 180 // goes from 180 → 0
  const largeArc = fillAngle < 90 ? 1 : 0
  const fillD =
    pct === 0
      ? ''
      : pct >= 1
        ? trackD
        : `M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(fillAngle)} ${arcY(fillAngle)}`

  // Color zones
  let strokeColor = '#ef4444' // red  0–40
  if (score > 70) strokeColor = '#22c55e' // green 71–100
  else if (score > 40) strokeColor = '#f59e0b' // amber 41–70

  // Needle
  const needleAngle = startAngle - pct * 180
  const needleLen = 58
  const nx = cx + needleLen * Math.cos(toRad(needleAngle))
  const ny = cy + needleLen * Math.sin(toRad(needleAngle))

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="180" height="100" viewBox="0 0 180 100">
        {/* Track */}
        <path d={trackD} fill="none" stroke="#374151" strokeWidth="12" strokeLinecap="round" />
        {/* Fill */}
        {pct > 0 && (
          <path
            d={fillD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="12"
            strokeLinecap="round"
            style={{ transition: 'all 0.7s ease' }}
          />
        )}
        {/* Zone labels */}
        <text x="14" y="96" fontSize="9" fill="#ef4444" fontWeight="600">0</text>
        <text x="82" y="18" fontSize="9" fill="#f59e0b" fontWeight="600" textAnchor="middle">50</text>
        <text x="158" y="96" fontSize="9" fill="#22c55e" fontWeight="600">100</text>
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: 'all 0.7s ease' }}
        />
        <circle cx={cx} cy={cy} r="5" fill="white" />
        {/* Score */}
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize="22" fontWeight="bold" fill="white">
          {Math.round(score)}
        </text>
        <text x={cx} y={cy + 34} textAnchor="middle" fontSize="9" fill="#9ca3af">
          / 100
        </text>
      </svg>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">ATS Score</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stacked sub-score breakdown bar
// ---------------------------------------------------------------------------

function SubScoreBreakdown({ subScores }: { subScores: ATSSubScore[] }) {
  const total = subScores.reduce((s, ss) => s + ss.weighted_contribution, 0)

  const colors: Record<string, string> = {
    keyword: '#6366f1',
    semantic: '#8b5cf6',
    section_completeness: '#06b6d4',
    formatting: '#f59e0b',
    experience_match: '#10b981',
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
        Sub-Score Breakdown
      </p>

      {/* Stacked bar */}
      <div className="w-full h-5 rounded-full bg-gray-700 overflow-hidden flex">
        {subScores.map((ss) => {
          const widthPct = total > 0 ? (ss.weighted_contribution / 100) * 100 : 0
          return (
            <div
              key={ss.name}
              title={`${SUB_SCORE_LABELS[ss.name] ?? ss.name}: ${ss.weighted_contribution.toFixed(1)}`}
              className="h-full transition-all duration-700"
              style={{
                width: `${widthPct}%`,
                backgroundColor: colors[ss.name] ?? '#6b7280',
              }}
            />
          )
        })}
      </div>

      {/* Legend rows */}
      <div className="space-y-2">
        {subScores.map((ss) => (
          <div key={ss.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: colors[ss.name] ?? '#6b7280' }}
              />
              <span className="text-gray-300">{SUB_SCORE_LABELS[ss.name] ?? ss.name}</span>
              <span className="text-gray-600">({Math.round(ss.weight * 100)}%)</span>
            </div>
            <span>
              <span className="text-white font-semibold">{ss.raw_score.toFixed(1)}</span>
              <span className="text-gray-500"> raw · </span>
              <span className="font-semibold" style={{ color: colors[ss.name] ?? '#9ca3af' }}>
                {ss.weighted_contribution.toFixed(1)}
              </span>
              <span className="text-gray-500"> pts</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section completeness grid
// ---------------------------------------------------------------------------

function SectionCompletenessGrid({
  detectedSections,
  subScores,
}: {
  detectedSections: string[]
  subScores: ATSSubScore[]
}) {
  const detected = new Set(detectedSections.map((s) => s.toLowerCase()))
  const sectionSub = subScores.find((s) => s.name === 'section_completeness')
  // Each of the 5 standard sections contributes raw_score/5 points.
  // raw_score itself is already the sum of present sections × 20, so
  // dividing by 5 gives the per-section contribution (20 when all present).
  const pointsEach = sectionSub ? sectionSub.raw_score / STANDARD_SECTIONS.length : 0

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
        Section Completeness
      </p>
      <div className="grid grid-cols-5 gap-2">
        {STANDARD_SECTIONS.map((section) => {
          const present = detected.has(section)
          return (
            <div
              key={section}
              className={`rounded-lg border p-2 text-center space-y-1 ${
                present
                  ? 'border-green-700 bg-green-950'
                  : 'border-gray-700 bg-gray-800'
              }`}
            >
              <div className="text-lg">{present ? '✓' : '✗'}</div>
              <div className={`text-xs font-medium ${present ? 'text-green-300' : 'text-gray-500'}`}>
                {SECTION_LABELS[section]}
              </div>
              {present && (
                <div className="text-xs text-green-500">+{pointsEach.toFixed(0)} pts</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formatting issues list
// ---------------------------------------------------------------------------

function FormattingIssuesList({ issues }: { issues: string[] }) {
  if (issues.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
          Formatting Issues
        </p>
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <span>✓</span>
          <span>No ATS-unfriendly formatting detected</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
        Formatting Issues
      </p>
      <div className="space-y-1.5">
        {issues.map((issue, i) => {
          const label = FORMATTING_ISSUE_LABELS[issue.toLowerCase()] ?? issue
          const deduction = FORMATTING_DEDUCTIONS[issue.toLowerCase()] ?? 10
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-amber-700 bg-amber-950 px-3 py-2"
            >
              <div className="flex items-center gap-2 text-amber-300 text-xs">
                <span>⚠</span>
                <span>{label}</span>
              </div>
              <span className="text-xs font-semibold text-red-400">−{deduction} pts</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Experience match indicator
// ---------------------------------------------------------------------------

function ExperienceMatchIndicator({
  resumeYears,
  minYears,
  maxYears,
}: {
  resumeYears: number
  minYears: number | null
  maxYears: number | null
}) {
  let badge: { label: string; cls: string }
  let rangeLabel: string

  if (minYears === null && maxYears === null) {
    badge = { label: 'No requirement', cls: 'bg-gray-700 text-gray-300 border-gray-600' }
    rangeLabel = 'No experience requirement specified'
  } else if (minYears !== null && maxYears !== null) {
    rangeLabel = `${minYears} – ${maxYears} years required`
    if (resumeYears >= minYears && resumeYears <= maxYears) {
      badge = { label: 'In range ✓', cls: 'bg-green-900 text-green-300 border-green-700' }
    } else if (resumeYears < minYears) {
      badge = { label: 'Under ✗', cls: 'bg-red-900 text-red-300 border-red-700' }
    } else {
      badge = { label: 'Over ✓', cls: 'bg-blue-900 text-blue-300 border-blue-700' }
    }
  } else if (minYears !== null) {
    rangeLabel = `${minYears}+ years required`
    badge =
      resumeYears >= minYears
        ? { label: 'Meets minimum ✓', cls: 'bg-green-900 text-green-300 border-green-700' }
        : { label: 'Under ✗', cls: 'bg-red-900 text-red-300 border-red-700' }
  } else {
    rangeLabel = `Up to ${maxYears} years`
    badge = { label: 'In range ✓', cls: 'bg-green-900 text-green-300 border-green-700' }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
        Experience Match
      </p>
      <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-sm text-white font-medium">
            Resume: <span className="text-indigo-300">{resumeYears.toFixed(1)} yrs</span>
          </p>
          <p className="text-xs text-gray-400">{rangeLabel}</p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Results view
// ---------------------------------------------------------------------------

function ATSResults({
  data,
  latencyMs,
  detectedSections,
  formattingIssues,
  resumeYears,
  minYears,
  maxYears,
}: {
  data: ATSResult
  latencyMs: number | null
  detectedSections: string[]
  formattingIssues: string[]
  resumeYears: number
  minYears: number | null
  maxYears: number | null
}) {
  return (
    <div className="space-y-6">
      {latencyMs !== null && (
        <p className="text-xs text-gray-500 text-right">{latencyMs} ms</p>
      )}

      {/* Gauge + stacked bar */}
      <div className="flex items-start gap-8">
        <SpeedometerGauge score={data.overall_score} />
        <div className="flex-1 pt-2">
          <SubScoreBreakdown subScores={data.sub_scores} />
        </div>
      </div>

      {/* Section completeness grid */}
      <SectionCompletenessGrid
        detectedSections={detectedSections}
        subScores={data.sub_scores}
      />

      {/* Formatting issues */}
      <FormattingIssuesList issues={formattingIssues} />

      {/* Experience match */}
      <ExperienceMatchIndicator
        resumeYears={resumeYears}
        minYears={minYears}
        maxYears={maxYears}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chip input (reused pattern from MatchScoringCard)
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
// Section toggle grid
// ---------------------------------------------------------------------------

function SectionToggle({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (sections: string[]) => void
}) {
  const toggle = (section: string) => {
    if (selected.includes(section)) {
      onChange(selected.filter((s) => s !== section))
    } else {
      onChange([...selected, section])
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-gray-400 font-medium">Detected Sections</label>
      <div className="flex flex-wrap gap-2">
        {STANDARD_SECTIONS.map((section) => {
          const active = selected.includes(section)
          return (
            <button
              key={section}
              onClick={() => toggle(section)}
              className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                active
                  ? 'bg-cyan-900 border-cyan-600 text-cyan-200'
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              {SECTION_LABELS[section]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formatting issue toggle
// ---------------------------------------------------------------------------

const FORMATTING_ISSUE_KEYS = [
  'table_detected',
  'image_detected',
  'multi_column_detected',
  'non_standard_font',
] as const

function FormattingToggle({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (issues: string[]) => void
}) {
  const toggle = (issue: string) => {
    if (selected.includes(issue)) {
      onChange(selected.filter((s) => s !== issue))
    } else {
      onChange([...selected, issue])
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-gray-400 font-medium">Formatting Issues (simulate)</label>
      <div className="flex flex-wrap gap-2">
        {FORMATTING_ISSUE_KEYS.map((issue) => {
          const active = selected.includes(issue)
          return (
            <button
              key={issue}
              onClick={() => toggle(issue)}
              className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                active
                  ? 'bg-amber-900 border-amber-600 text-amber-200'
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              {FORMATTING_ISSUE_LABELS[issue]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export default function ATSScoringCard() {
  const [open, setOpen] = useState(true)
  const { state, compute, reset } = useATSScoring()

  // Inputs
  const [resumeSkills, setResumeSkills] = useState<string[]>([])
  const [jdSkills, setJdSkills] = useState<string[]>([])
  const [detectedSections, setDetectedSections] = useState<string[]>([
    'summary', 'skills', 'experience', 'education',
  ])
  const [formattingIssues, setFormattingIssues] = useState<string[]>([])
  const [resumeYears, setResumeYears] = useState<number>(2)
  const [minYears, setMinYears] = useState<string>('2')
  const [maxYears, setMaxYears] = useState<string>('5')

  const canCompute = state.status !== 'loading'

  const handleCompute = useCallback(() => {
    compute({
      resume_skills: resumeSkills,
      detected_sections: detectedSections,
      formatting_issues: formattingIssues,
      total_experience_years: resumeYears,
      jd_required_skills: jdSkills,
      min_experience_years: minYears !== '' ? Number(minYears) : null,
      max_experience_years: maxYears !== '' ? Number(maxYears) : null,
    })
  }, [compute, resumeSkills, jdSkills, detectedSections, formattingIssues, resumeYears, minYears, maxYears])

  const handleReset = useCallback(() => {
    setResumeSkills([])
    setJdSkills([])
    setDetectedSections(['summary', 'skills', 'experience', 'education'])
    setFormattingIssues([])
    setResumeYears(2)
    setMinYears('2')
    setMaxYears('5')
    reset()
  }, [reset])

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800 transition-colors"
      >
        <span className="font-semibold text-white text-sm tracking-wide">
          EPIC 6 — ATS Scoring
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

          {/* Section toggles */}
          <SectionToggle selected={detectedSections} onChange={setDetectedSections} />

          {/* Formatting issue toggles */}
          <FormattingToggle selected={formattingIssues} onChange={setFormattingIssues} />

          {/* Experience inputs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Resume Experience (yrs)</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={resumeYears}
                onChange={(e) => setResumeYears(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">JD Min Years</label>
              <input
                type="number"
                min={0}
                value={minYears}
                onChange={(e) => setMinYears(e.target.value)}
                placeholder="none"
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">JD Max Years</label>
              <input
                type="number"
                min={0}
                value={maxYears}
                onChange={(e) => setMaxYears(e.target.value)}
                placeholder="none"
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCompute}
              disabled={!canCompute}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
            >
              {state.status === 'loading' ? 'Computing…' : 'Compute ATS Score'}
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

          {/* Error */}
          {state.status === 'error' && (
            <div className="flex items-center gap-3 rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
              <span>✗</span>
              <span>{state.errorMessage}</span>
            </div>
          )}

          {/* Results */}
          {state.status === 'success' && state.data && (
            <ATSResults
              data={state.data}
              latencyMs={state.latencyMs}
              detectedSections={detectedSections}
              formattingIssues={formattingIssues}
              resumeYears={resumeYears}
              minYears={minYears !== '' ? Number(minYears) : null}
              maxYears={maxYears !== '' ? Number(maxYears) : null}
            />
          )}
        </div>
      )}
    </div>
  )
}
