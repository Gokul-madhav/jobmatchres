import { useState, useCallback } from 'react'
import { useGapDetection } from '../hooks/useGapDetection'
import type { GapItem, GapReport, GapType, Severity } from '../hooks/useGapDetection'

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

const GAP_TYPE_ICONS: Record<GapType, string> = {
  missing_skill: '🔴',
  weak_section: '🟡',
  experience_gap: '⏱',
}

const GAP_TYPE_LABELS: Record<GapType, string> = {
  missing_skill: 'Missing Skill',
  weak_section: 'Weak Section',
  experience_gap: 'Experience Gap',
}

const SEVERITY_BADGE: Record<Severity, { label: string; cls: string }> = {
  high: {
    label: 'HIGH',
    cls: 'bg-red-900 border-red-700 text-red-300',
  },
  medium: {
    label: 'MEDIUM',
    cls: 'bg-amber-900 border-amber-700 text-amber-300',
  },
  low: {
    label: 'LOW',
    cls: 'bg-blue-900 border-blue-700 text-blue-300',
  },
}

// ---------------------------------------------------------------------------
// Chip input (shared pattern)
// ---------------------------------------------------------------------------

function ChipInput({
  label,
  chips,
  onChange,
  placeholder,
}: {
  label: string
  chips: string[]
  onChange: (chips: string[]) => void
  placeholder?: string
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
          placeholder={chips.length === 0 ? (placeholder ?? 'Type skills, press Enter or comma…') : ''}
          className="flex-1 min-w-[120px] bg-transparent text-gray-100 text-xs outline-none placeholder-gray-600"
        />
      </div>
      <p className="text-xs text-gray-600">Press Enter or comma to add · click × to remove</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section toggle
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
      <label className="text-xs text-gray-400 font-medium">Detected Sections (resume)</label>
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
// Gap summary counter row
// ---------------------------------------------------------------------------

function GapSummaryRow({ gaps }: { gaps: GapItem[] }) {
  const total = gaps.length
  const high = gaps.filter((g) => g.severity === 'high').length
  const medium = gaps.filter((g) => g.severity === 'medium').length
  const low = gaps.filter((g) => g.severity === 'low').length

  return (
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: 'Total Gaps', value: total, cls: 'text-white' },
        { label: 'High', value: high, cls: 'text-red-400' },
        { label: 'Medium', value: medium, cls: 'text-amber-400' },
        { label: 'Low', value: low, cls: 'text-blue-400' },
      ].map(({ label, value, cls }) => (
        <div
          key={label}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-center"
        >
          <p className={`text-xl font-bold ${cls}`}>{value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single gap item row
// ---------------------------------------------------------------------------

function GapItemRow({ gap }: { gap: GapItem }) {
  const badge = SEVERITY_BADGE[gap.severity]
  const icon = GAP_TYPE_ICONS[gap.gap_type]
  const typeLabel = GAP_TYPE_LABELS[gap.gap_type]

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-base flex-shrink-0" title={typeLabel}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-gray-100 truncate">{gap.item}</p>
          <p className="text-xs text-gray-500">{typeLabel}</p>
        </div>
      </div>
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-bold flex-shrink-0 ${badge.cls}`}
      >
        {badge.label}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Grouped gap list
// ---------------------------------------------------------------------------

function GapGroupSection({
  title,
  icon,
  gaps,
}: {
  title: string
  icon: string
  gaps: GapItem[]
}) {
  if (gaps.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
        <span>{icon}</span>
        <span>
          {title} ({gaps.length})
        </span>
      </p>
      <div className="space-y-1.5">
        {gaps.map((gap, i) => (
          <GapItemRow key={i} gap={gap} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filter pill toggle
// ---------------------------------------------------------------------------

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
        active
          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40'
          : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
      }`}
    >
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Gap report results view
// ---------------------------------------------------------------------------

function GapReportView({
  data,
  latencyMs,
}: {
  data: GapReport
  latencyMs: number | null
}) {
  const [highPriorityOnly, setHighPriorityOnly] = useState(false)

  const visibleGaps = highPriorityOnly
    ? data.gaps.filter((g) => g.severity === 'high')
    : data.gaps

  const missingSkills = visibleGaps.filter((g) => g.gap_type === 'missing_skill')
  const weakSections = visibleGaps.filter((g) => g.gap_type === 'weak_section')
  const experienceGaps = visibleGaps.filter((g) => g.gap_type === 'experience_gap')

  return (
    <div className="space-y-5">
      {latencyMs !== null && (
        <p className="text-xs text-gray-500 text-right">{latencyMs} ms</p>
      )}

      {/* No gaps banner */}
      {!data.has_gaps && (
        <div className="w-full rounded-xl border border-green-700 bg-green-950 px-5 py-4 text-center">
          <p className="text-green-300 font-semibold text-sm">
            ✓ No gaps detected — resume fully matches JD
          </p>
        </div>
      )}

      {data.has_gaps && (
        <>
          {/* Summary counters */}
          <GapSummaryRow gaps={data.gaps} />

          {/* Filter pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">View:</span>
            <FilterPill
              active={!highPriorityOnly}
              label="All Gaps"
              onClick={() => setHighPriorityOnly(false)}
            />
            <FilterPill
              active={highPriorityOnly}
              label="High Priority Only"
              onClick={() => setHighPriorityOnly(true)}
            />
          </div>

          {/* Grouped gap sections */}
          <div className="space-y-5">
            <GapGroupSection
              title="Missing Skills"
              icon="🔴"
              gaps={missingSkills}
            />
            <GapGroupSection
              title="Weak Sections"
              icon="🟡"
              gaps={weakSections}
            />
            <GapGroupSection
              title="Experience Gap"
              icon="⏱"
              gaps={experienceGaps}
            />
          </div>

          {/* Empty state when filter hides everything */}
          {visibleGaps.length === 0 && highPriorityOnly && (
            <div className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-center text-sm text-gray-400">
              No high-priority gaps found.
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export default function GapDetectionCard() {
  const [open, setOpen] = useState(true)
  const { state, detect, reset } = useGapDetection()

  // Resume inputs
  const [resumeSkills, setResumeSkills] = useState<string[]>([])
  const [detectedSections, setDetectedSections] = useState<string[]>([
    'summary', 'skills', 'experience', 'education',
  ])
  const [resumeYears, setResumeYears] = useState<number>(2)
  const [experienceCount, setExperienceCount] = useState<number>(2)
  const [educationCount, setEducationCount] = useState<number>(1)
  const [projectsCount, setProjectsCount] = useState<number>(1)

  // JD inputs
  const [jdRequiredSkills, setJdRequiredSkills] = useState<string[]>([])
  const [jdPreferredSkills, setJdPreferredSkills] = useState<string[]>([])
  const [minYears, setMinYears] = useState<string>('')
  const [maxYears, setMaxYears] = useState<string>('')

  const canDetect = state.status !== 'loading'

  const handleDetect = useCallback(() => {
    detect({
      resume_skills: resumeSkills,
      detected_sections: detectedSections,
      total_experience_years: resumeYears,
      experience_count: experienceCount,
      education_count: educationCount,
      projects_count: projectsCount,
      jd_required_skills: jdRequiredSkills,
      jd_preferred_skills: jdPreferredSkills,
      min_experience_years: minYears !== '' ? Number(minYears) : null,
      max_experience_years: maxYears !== '' ? Number(maxYears) : null,
    })
  }, [
    detect,
    resumeSkills,
    detectedSections,
    resumeYears,
    experienceCount,
    educationCount,
    projectsCount,
    jdRequiredSkills,
    jdPreferredSkills,
    minYears,
    maxYears,
  ])

  const handleReset = useCallback(() => {
    setResumeSkills([])
    setDetectedSections(['summary', 'skills', 'experience', 'education'])
    setResumeYears(2)
    setExperienceCount(2)
    setEducationCount(1)
    setProjectsCount(1)
    setJdRequiredSkills([])
    setJdPreferredSkills([])
    setMinYears('')
    setMaxYears('')
    reset()
  }, [reset])

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800 transition-colors"
      >
        <span className="font-semibold text-white text-sm tracking-wide">
          EPIC 7 — Gap Detection
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-700 pt-4">
          {/* Resume inputs */}
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
            Resume
          </p>

          <ChipInput
            label="Resume Skills"
            chips={resumeSkills}
            onChange={setResumeSkills}
          />

          <SectionToggle selected={detectedSections} onChange={setDetectedSections} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">
                Total Experience (yrs)
              </label>
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
              <label className="text-xs text-gray-400 font-medium">
                Experience Entries
              </label>
              <input
                type="number"
                min={0}
                value={experienceCount}
                onChange={(e) => setExperienceCount(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">
                Education Entries
              </label>
              <input
                type="number"
                min={0}
                value={educationCount}
                onChange={(e) => setEducationCount(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">
                Projects Entries
              </label>
              <input
                type="number"
                min={0}
                value={projectsCount}
                onChange={(e) => setProjectsCount(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* JD inputs */}
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider pt-2">
            Job Description
          </p>

          <div className="grid grid-cols-2 gap-4">
            <ChipInput
              label="Required Skills"
              chips={jdRequiredSkills}
              onChange={setJdRequiredSkills}
              placeholder="e.g. Python, Docker…"
            />
            <ChipInput
              label="Preferred Skills"
              chips={jdPreferredSkills}
              onChange={setJdPreferredSkills}
              placeholder="e.g. Kubernetes, Rust…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              onClick={handleDetect}
              disabled={!canDetect}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
            >
              {state.status === 'loading' ? 'Detecting…' : 'Detect Gaps'}
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
            <GapReportView data={state.data} latencyMs={state.latencyMs} />
          )}
        </div>
      )}
    </div>
  )
}
