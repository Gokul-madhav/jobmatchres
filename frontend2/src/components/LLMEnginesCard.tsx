import { useState, useCallback } from 'react'
import { useQuestions } from '../hooks/useQuestions'
import { useSuggestions } from '../hooks/useSuggestions'
import type { Question } from '../hooks/useQuestions'
import type { Suggestion, QuestionAnswer } from '../hooks/useSuggestions'
import type { GapItem, Severity } from '../hooks/useGapDetection'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY_BADGE: Record<Severity, { label: string; cls: string }> = {
  high: { label: 'HIGH', cls: 'bg-red-900 border-red-700 text-red-300' },
  medium: { label: 'MED', cls: 'bg-amber-900 border-amber-700 text-amber-300' },
  low: { label: 'LOW', cls: 'bg-blue-900 border-blue-700 text-blue-300' },
}

const SECTION_COLORS: Record<string, string> = {
  Skills: 'bg-cyan-900 border-cyan-700 text-cyan-200',
  Experience: 'bg-violet-900 border-violet-700 text-violet-200',
  Summary: 'bg-emerald-900 border-emerald-700 text-emerald-200',
  Education: 'bg-orange-900 border-orange-700 text-orange-200',
  Projects: 'bg-pink-900 border-pink-700 text-pink-200',
}

function sectionBadgeCls(section: string): string {
  return (
    SECTION_COLORS[section] ??
    'bg-gray-800 border-gray-600 text-gray-300'
  )
}

// ---------------------------------------------------------------------------
// Chip input (reused pattern)
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
    const newChips = raw.split(',').map((s) => s.trim()).filter(Boolean)
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
            <button onClick={() => remove(i)} className="text-indigo-400 hover:text-white leading-none">×</button>
          </span>
        ))}
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
          }}
          placeholder={chips.length === 0 ? (placeholder ?? 'Type and press Enter…') : ''}
          className="flex-1 min-w-[120px] bg-transparent text-gray-100 text-xs outline-none placeholder-gray-600"
        />
      </div>
      <p className="text-xs text-gray-600">Press Enter or comma to add · click × to remove</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gap builder (inline, for the EPIC 8 panel)
// ---------------------------------------------------------------------------

function GapBuilder({
  gaps,
  onChange,
}: {
  gaps: GapItem[]
  onChange: (gaps: GapItem[]) => void
}) {
  const [item, setItem] = useState('')
  const [gapType, setGapType] = useState<GapItem['gap_type']>('missing_skill')
  const [severity, setSeverity] = useState<Severity>('high')

  const add = () => {
    if (!item.trim()) return
    onChange([...gaps, { gap_type: gapType, item: item.trim(), severity }])
    setItem('')
  }

  const remove = (idx: number) => onChange(gaps.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      <label className="text-xs text-gray-400 font-medium">Gap Items</label>

      {/* Existing gaps */}
      {gaps.length > 0 && (
        <div className="space-y-1.5">
          {gaps.map((g, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`px-2 py-0.5 rounded-full border text-xs font-bold flex-shrink-0 ${SEVERITY_BADGE[g.severity].cls}`}>
                  {SEVERITY_BADGE[g.severity].label}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">{g.gap_type}</span>
                <span className="text-sm text-gray-100 truncate">{g.item}</span>
              </div>
              <button onClick={() => remove(i)} className="text-gray-500 hover:text-red-400 text-xs flex-shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Add new gap */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={item}
          onChange={(e) => setItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Gap item (e.g. Kubernetes)"
          className="flex-1 min-w-[140px] rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-gray-600"
        />
        <select
          value={gapType}
          onChange={(e) => setGapType(e.target.value as GapItem['gap_type'])}
          className="rounded-lg border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-indigo-500"
        >
          <option value="missing_skill">missing_skill</option>
          <option value="weak_section">weak_section</option>
          <option value="experience_gap">experience_gap</option>
        </select>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as Severity)}
          className="rounded-lg border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-indigo-500"
        >
          <option value="high">HIGH</option>
          <option value="medium">MEDIUM</option>
          <option value="low">LOW</option>
        </select>
        <button
          onClick={add}
          className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Question card
// ---------------------------------------------------------------------------

function QuestionCard({
  question,
  index,
  answer,
  onAnswerChange,
}: {
  question: Question
  index: number
  answer: string
  onAnswerChange: (id: string, text: string) => void
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-900 border border-indigo-700 text-indigo-300 text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-100 leading-relaxed">{question.text}</p>
          {question.target_gap && (
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-gray-700 border border-gray-600 text-gray-400 text-xs">
              ↳ {question.target_gap}
            </span>
          )}
        </div>
      </div>
      <textarea
        value={answer}
        onChange={(e) => onAnswerChange(question.id, e.target.value)}
        placeholder="Type your answer here…"
        rows={2}
        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500 placeholder-gray-600 resize-none"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Suggestion card
// ---------------------------------------------------------------------------

function SuggestionCard({
  suggestion,
  index,
  decision,
  onDecision,
}: {
  suggestion: Suggestion
  index: number
  decision: boolean | null
  onDecision: (id: string, approved: boolean) => void
}) {
  const [rationaleOpen, setRationaleOpen] = useState(false)
  const sectionCls = sectionBadgeCls(suggestion.target_section)

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 transition-colors ${
        decision === true
          ? 'border-green-700 bg-green-950'
          : decision === false
          ? 'border-red-900 bg-red-950/30'
          : 'border-gray-700 bg-gray-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 border border-gray-600 text-gray-400 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${sectionCls}`}>
            {suggestion.target_section}
          </span>
          {suggestion.gap_reference && (
            <span className="px-2 py-0.5 rounded-full bg-gray-700 border border-gray-600 text-gray-400 text-xs">
              ↳ {suggestion.gap_reference}
            </span>
          )}
        </div>
        {/* Approve / Reject buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onDecision(suggestion.id, true)}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${
              decision === true
                ? 'bg-green-700 border-green-600 text-white'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-green-900 hover:border-green-700 hover:text-green-200'
            }`}
          >
            ✓ Approve
          </button>
          <button
            onClick={() => onDecision(suggestion.id, false)}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${
              decision === false
                ? 'bg-red-800 border-red-700 text-white'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-red-950 hover:border-red-800 hover:text-red-300'
            }`}
          >
            ✕ Reject
          </button>
        </div>
      </div>

      {/* Suggested change */}
      <p className="text-sm text-gray-100 leading-relaxed">{suggestion.suggested_change}</p>

      {/* Rationale accordion */}
      <div>
        <button
          onClick={() => setRationaleOpen((o) => !o)}
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
        >
          <span>{rationaleOpen ? '▲' : '▼'}</span>
          <span>Rationale</span>
        </button>
        {rationaleOpen && (
          <p className="mt-2 text-xs text-gray-400 leading-relaxed border-l-2 border-gray-600 pl-3">
            {suggestion.rationale}
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Coverage check table
// ---------------------------------------------------------------------------

function CoverageCheck({
  gaps,
  suggestions,
}: {
  gaps: GapItem[]
  suggestions: Suggestion[]
}) {
  const highGaps = gaps.filter((g) => g.severity === 'high')
  if (highGaps.length === 0) return null

  const coveredItems = new Set<string>()
  for (const s of suggestions) {
    if (s.gap_reference) coveredItems.add(s.gap_reference.toLowerCase().trim())
    for (const g of highGaps) {
      if (s.suggested_change.toLowerCase().includes(g.item.toLowerCase())) {
        coveredItems.add(g.item.toLowerCase().trim())
      }
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
        High-Severity Gap Coverage
      </p>
      <div className="rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800">
              <th className="text-left px-3 py-2 text-gray-400 font-medium">Gap Item</th>
              <th className="text-center px-3 py-2 text-gray-400 font-medium w-20">Covered</th>
            </tr>
          </thead>
          <tbody>
            {highGaps.map((g, i) => {
              const covered = coveredItems.has(g.item.toLowerCase().trim())
              return (
                <tr key={i} className={`border-b border-gray-700 last:border-0 ${covered ? 'bg-green-950/30' : 'bg-red-950/20'}`}>
                  <td className="px-3 py-2 text-gray-200">{g.item}</td>
                  <td className="px-3 py-2 text-center">
                    {covered ? (
                      <span className="text-green-400 font-bold">✓</span>
                    ) : (
                      <span className="text-red-400 font-bold">✗</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export default function LLMEnginesCard() {
  const [open, setOpen] = useState(true)

  // --- Shared inputs ---
  const [gaps, setGaps] = useState<GapItem[]>([])
  const [resumeSections, setResumeSections] = useState<Record<string, string>>({
    Skills: '',
    Experience: '',
    Summary: '',
  })

  // --- Questions state ---
  const { state: qState, generate: generateQuestions, reset: resetQuestions } = useQuestions()
  const [answers, setAnswers] = useState<Record<string, string>>({})

  // --- Suggestions state ---
  const { state: sState, generate: generateSuggestions, reset: resetSuggestions } = useSuggestions()
  const [decisions, setDecisions] = useState<Record<string, boolean | null>>({})

  // --- Handlers ---
  const handleGenerateQuestions = useCallback(() => {
    generateQuestions({ gaps })
  }, [generateQuestions, gaps])

  const handleAnswerChange = useCallback((id: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [id]: text }))
  }, [])

  const handleSubmitAnswers = useCallback(() => {
    if (!qState.data) return
    const answerList = qState.data.questions.map((q) => ({
      question_id: q.id,
      answer_text: answers[q.id] ?? '',
    }))
    generateSuggestions({
      gaps,
      answers: answerList,
      resume_sections: resumeSections,
    })
  }, [qState.data, answers, gaps, resumeSections, generateSuggestions])

  const handleDecision = useCallback((id: string, approved: boolean) => {
    setDecisions((prev) => ({ ...prev, [id]: approved }))
  }, [])

  const handleReset = useCallback(() => {
    setGaps([])
    setAnswers({})
    setDecisions({})
    resetQuestions()
    resetSuggestions()
  }, [resetQuestions, resetSuggestions])

  const hasAnswers = qState.data
    ? qState.data.questions.some((q) => (answers[q.id] ?? '').trim().length > 0)
    : false

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800 transition-colors"
      >
        <span className="font-semibold text-white text-sm tracking-wide">
          EPIC 8 — LLM Question &amp; Suggestion Engines
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-6 border-t border-gray-700 pt-4">

          {/* ── Shared inputs ── */}
          <section className="space-y-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              Inputs
            </p>

            <GapBuilder gaps={gaps} onChange={setGaps} />

            {/* Resume section content */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium">
                Resume Section Content (optional — for richer suggestions)
              </label>
              {Object.keys(resumeSections).map((section) => (
                <div key={section} className="space-y-1">
                  <p className="text-xs text-gray-500">{section}</p>
                  <textarea
                    value={resumeSections[section]}
                    onChange={(e) =>
                      setResumeSections((prev) => ({ ...prev, [section]: e.target.value }))
                    }
                    placeholder={`Paste ${section} section content…`}
                    rows={2}
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-xs text-gray-100 outline-none focus:border-indigo-500 placeholder-gray-600 resize-none"
                  />
                </div>
              ))}
            </div>

            {/* Actions row */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleGenerateQuestions}
                disabled={qState.status === 'loading' || gaps.length === 0}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
              >
                {qState.status === 'loading' ? 'Generating…' : 'Generate Questions'}
              </button>
              {(qState.status !== 'idle' || sState.status !== 'idle') && (
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  Reset all
                </button>
              )}
            </div>

            {gaps.length === 0 && (
              <p className="text-xs text-amber-500">Add at least one gap item to generate questions.</p>
            )}
          </section>

          {/* ── Questions sub-panel ── */}
          {(qState.status === 'success' || qState.status === 'loading') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  Questions
                  {qState.data && (
                    <span className="ml-2 text-gray-600 normal-case font-normal">
                      ({qState.data.question_count} generated · {qState.latencyMs} ms)
                    </span>
                  )}
                </p>
              </div>

              {/* Fallback mode banner */}
              {qState.data?.fallback_mode && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-700 bg-amber-950 px-4 py-3 text-sm text-amber-300">
                  <span>⚠</span>
                  <span>
                    <strong>Fallback mode</strong> — LLM was unavailable. Questions were generated
                    from gap templates.
                  </span>
                </div>
              )}

              {qState.status === 'loading' && (
                <div className="text-sm text-gray-400 animate-pulse">Generating questions…</div>
              )}

              {qState.data && (
                <div className="space-y-3">
                  {qState.data.questions.map((q, i) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      index={i}
                      answer={answers[q.id] ?? ''}
                      onAnswerChange={handleAnswerChange}
                    />
                  ))}

                  <button
                    onClick={handleSubmitAnswers}
                    disabled={sState.status === 'loading'}
                    className="w-full py-2.5 rounded-lg bg-violet-700 hover:bg-violet-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold transition-colors"
                  >
                    {sState.status === 'loading'
                      ? 'Generating suggestions…'
                      : hasAnswers
                      ? 'Submit Answers & Generate Suggestions'
                      : 'Generate Suggestions (no answers)'}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Questions error */}
          {qState.status === 'error' && (
            <div className="flex items-center gap-3 rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
              <span>✗</span>
              <span>{qState.errorMessage}</span>
            </div>
          )}

          {/* ── Suggestions sub-panel ── */}
          {(sState.status === 'success' ||
            sState.status === 'partial' ||
            sState.status === 'loading') && (
            <section className="space-y-4">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Suggestions
                {sState.data && (
                  <span className="ml-2 text-gray-600 normal-case font-normal">
                    ({sState.data.suggestion_count} generated · {sState.latencyMs} ms)
                  </span>
                )}
              </p>

              {/* LLM_UNAVAILABLE 206 banner */}
              {sState.status === 'partial' && sState.data && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-700 bg-amber-950 px-4 py-3 text-sm text-amber-300">
                  <span className="flex-shrink-0 mt-0.5">⚠</span>
                  <div>
                    <p className="font-semibold">LLM_UNAVAILABLE — Partial Result (HTTP 206)</p>
                    <p className="text-xs text-amber-400 mt-1">
                      Scores and gaps are available. Suggestions were generated from fallback
                      templates.
                    </p>
                    {sState.data.llm_error && (
                      <p className="text-xs text-amber-500 mt-1 font-mono">
                        {sState.data.llm_error}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {sState.status === 'loading' && (
                <div className="text-sm text-gray-400 animate-pulse">Generating suggestions…</div>
              )}

              {sState.data && (
                <div className="space-y-4">
                  {/* Suggestion cards */}
                  <div className="space-y-3">
                    {sState.data.suggestions.map((s, i) => (
                      <SuggestionCard
                        key={s.id}
                        suggestion={s}
                        index={i}
                        decision={decisions[s.id] ?? null}
                        onDecision={handleDecision}
                      />
                    ))}
                  </div>

                  {/* Coverage check */}
                  <CoverageCheck gaps={gaps} suggestions={sState.data.suggestions} />

                  {/* Approval summary */}
                  {Object.keys(decisions).length > 0 && (
                    <div className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3">
                      <p className="text-xs text-gray-400 font-medium mb-2">Approval Summary</p>
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-400">
                          ✓ {Object.values(decisions).filter((d) => d === true).length} approved
                        </span>
                        <span className="text-red-400">
                          ✕ {Object.values(decisions).filter((d) => d === false).length} rejected
                        </span>
                        <span className="text-gray-500">
                          ○{' '}
                          {sState.data.suggestions.length - Object.keys(decisions).length} pending
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Suggestions error */}
          {sState.status === 'error' && (
            <div className="flex items-center gap-3 rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
              <span>✗</span>
              <span>{sState.errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
