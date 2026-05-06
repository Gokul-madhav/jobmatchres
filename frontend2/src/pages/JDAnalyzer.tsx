import { useState, useCallback } from 'react'
import { useJDAgent } from '../hooks/useJDAgent'
import type { JDAgentResult } from '../hooks/useJDAgent'

const MIN_LENGTH = 50

// ---------------------------------------------------------------------------
// Input Area
// ---------------------------------------------------------------------------

function JDInput({ onAnalyze, disabled }: { onAnalyze: (text: string) => void; disabled: boolean }) {
  const [text, setText] = useState('')
  const charCount = text.length
  const tooShort = charCount > 0 && charCount < MIN_LENGTH
  const canSubmit = charCount >= MIN_LENGTH && !disabled

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the job description here..."
        rows={12}
        disabled={disabled}
        className="w-full resize-y rounded-xl border border-gray-600 bg-gray-900/80 text-gray-100 px-4 py-3 placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <div className="flex items-center justify-between">
        <span className={`text-xs ${tooShort ? 'text-amber-400' : charCount >= MIN_LENGTH ? 'text-green-400' : 'text-gray-500'}`}>
          {tooShort
            ? `⚠ Minimum ${MIN_LENGTH} characters required (${MIN_LENGTH - charCount} more)`
            : charCount >= MIN_LENGTH
            ? `✓ ${charCount} characters`
            : `${charCount} / ${MIN_LENGTH} characters`}
        </span>
        {text && (
          <button onClick={() => setText('')} className="text-xs text-gray-500 hover:text-gray-300 underline">
            Clear
          </button>
        )}
      </div>
      <button
        onClick={() => canSubmit && onAnalyze(text)}
        disabled={!canSubmit}
        className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold transition-colors"
      >
        {disabled ? 'Analyzing...' : 'Analyze Job Description'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-20">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-violet-900 border-t-violet-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-white font-bold text-xl">Analyzing job description…</p>
        <p className="text-gray-500 text-sm">GPT-4o-mini is extracting structured data</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, icon, count, children }: {
  title: string
  icon: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-700/60 bg-gray-900/80 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-700/40">
        <span className="text-xl">{icon}</span>
        <h3 className="font-semibold text-white">{title}</h3>
        {count !== undefined && (
          <span className="ml-auto text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Job Header
// ---------------------------------------------------------------------------

function JobHeader({ data }: { data: JDAgentResult }) {
  return (
    <div className="rounded-2xl border border-gray-700/60 bg-gradient-to-br from-gray-900 to-gray-900/80 p-6">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-2xl flex-shrink-0 shadow-lg">
          💼
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white">{data.job_title || 'Job Title Not Found'}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
            {data.company && <span className="text-violet-400">🏢 {data.company}</span>}
            {data.location && <span className="text-gray-400">📍 {data.location}</span>}
            {data.job_type && <span className="text-gray-400">💼 {data.job_type}</span>}
            {data.experience_required && <span className="text-gray-400">⏱ {data.experience_required}</span>}
          </div>
          {data.salary_range && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-900/30 border border-green-700/40 text-green-300 text-sm">
              💰 {data.salary_range}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

function SkillsSection({ required, preferred, tools }: {
  required: string[]
  preferred: string[]
  tools: string[]
}) {
  const total = required.length + preferred.length + tools.length
  if (!total) return (
    <Section title="Skills & Tools" icon="⚡" count={0}>
      <p className="text-gray-500 text-sm italic">No skills extracted.</p>
    </Section>
  )

  return (
    <Section title="Skills & Tools" icon="⚡" count={total}>
      {required.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-red-400 uppercase tracking-wider mb-2">Required Skills</p>
          <div className="flex flex-wrap gap-2">
            {required.map((s) => (
              <span key={s} className="px-3 py-1 rounded-full bg-red-900/40 border border-red-700/50 text-red-200 text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {preferred.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-blue-400 uppercase tracking-wider mb-2">Preferred Skills</p>
          <div className="flex flex-wrap gap-2">
            {preferred.map((s) => (
              <span key={s} className="px-3 py-1 rounded-full bg-blue-900/40 border border-blue-700/50 text-blue-200 text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {tools.length > 0 && (
        <div>
          <p className="text-xs text-violet-400 uppercase tracking-wider mb-2">Tools & Platforms</p>
          <div className="flex flex-wrap gap-2">
            {tools.map((t) => (
              <span key={t} className="px-3 py-1 rounded-full bg-violet-900/40 border border-violet-700/50 text-violet-200 text-xs font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Responsibilities
// ---------------------------------------------------------------------------

function ResponsibilitiesSection({ responsibilities }: { responsibilities: string[] }) {
  if (!responsibilities.length) return null

  return (
    <Section title="Responsibilities" icon="📋" count={responsibilities.length}>
      <ul className="space-y-2">
        {responsibilities.map((r, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <span className="text-violet-500 flex-shrink-0 mt-0.5">•</span>
            <span className="leading-relaxed">{r}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Qualifications
// ---------------------------------------------------------------------------

function QualificationsSection({ qualifications }: { qualifications: string[] }) {
  if (!qualifications.length) return null

  return (
    <Section title="Qualifications" icon="✓" count={qualifications.length}>
      <ul className="space-y-2">
        {qualifications.map((q, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
            <span className="leading-relaxed">{q}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Keywords & Benefits
// ---------------------------------------------------------------------------

function KeywordsSection({ keywords }: { keywords: string[] }) {
  if (!keywords.length) return null

  return (
    <Section title="Keywords" icon="🔑" count={keywords.length}>
      <div className="flex flex-wrap gap-2">
        {keywords.map((k, i) => (
          <span key={i} className="px-3 py-1 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm">
            {k}
          </span>
        ))}
      </div>
    </Section>
  )
}

function BenefitsSection({ benefits }: { benefits: string[] }) {
  if (!benefits.length) return null

  return (
    <Section title="Benefits" icon="🎁" count={benefits.length}>
      <div className="flex flex-wrap gap-2">
        {benefits.map((b, i) => (
          <span key={i} className="px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-700/40 text-green-300 text-sm">
            {b}
          </span>
        ))}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

function StatsBar({ data }: { data: JDAgentResult }) {
  const stats = [
    { label: 'Required Skills', value: data.required_skills.length, color: 'text-red-400' },
    { label: 'Preferred Skills', value: data.preferred_skills.length, color: 'text-blue-400' },
    { label: 'Tools', value: data.tools.length, color: 'text-violet-400' },
    { label: 'Responsibilities', value: data.responsibilities.length, color: 'text-green-400' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="rounded-xl bg-gray-900/80 border border-gray-700/60 p-3 text-center">
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
          <div className="text-xs text-gray-500 mt-1">{label}</div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function JDAnalyzer() {
  const { state, analyze, reset } = useJDAgent()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-base shadow-lg">
              💼
            </div>
            <div>
              <h1 className="font-bold text-white leading-tight">JD Analyzer</h1>
              <p className="text-gray-500 text-xs">Powered by GPT-4o-mini</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-xs text-gray-400 hover:text-violet-300 border border-gray-700 hover:border-violet-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              ✨ Resume Analyzer
            </a>
            {state.status === 'success' && (
              <button
                onClick={reset}
                className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                ↑ New JD
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* Idle */}
        {state.status === 'idle' && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-900/30 border border-violet-700/40 text-violet-300 text-sm">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                AI-powered JD extraction
              </div>
              <h2 className="text-4xl font-bold text-white leading-tight">
                Analyze job descriptions<br />
                <span className="text-violet-400">instantly</span>
              </h2>
              <p className="text-gray-400 max-w-lg mx-auto text-lg">
                Paste any job description and GPT-4o-mini will extract skills,
                requirements, responsibilities, and more.
              </p>
            </div>
            <JDInput onAnalyze={analyze} disabled={false} />
          </div>
        )}

        {/* Loading */}
        {state.status === 'loading' && <LoadingState />}

        {/* Error */}
        {state.status === 'error' && (
          <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-8 text-center space-y-4">
            <div className="text-5xl">⚠️</div>
            <p className="font-bold text-red-300 text-xl">{state.errorCode}</p>
            <p className="text-red-400">{state.errorMessage}</p>
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-xl bg-red-900/60 hover:bg-red-800/60 text-red-200 text-sm border border-red-700/40 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Success */}
        {state.status === 'success' && state.data && (
          <div className="space-y-5">
            {/* Top bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-green-400 font-medium text-sm">✓ Analysis complete</span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-900/30 border border-violet-700/40 text-xs text-violet-300">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                GPT-4o-mini extraction
                {state.latencyMs !== null && (
                  <span className="text-violet-500">· {(state.latencyMs / 1000).toFixed(1)}s</span>
                )}
              </div>
            </div>

            {/* Stats */}
            <StatsBar data={state.data} />

            {/* Job Header */}
            <JobHeader data={state.data} />

            {/* Skills */}
            <SkillsSection
              required={state.data.required_skills}
              preferred={state.data.preferred_skills}
              tools={state.data.tools}
            />

            {/* Responsibilities */}
            <ResponsibilitiesSection responsibilities={state.data.responsibilities} />

            {/* Qualifications */}
            <QualificationsSection qualifications={state.data.qualifications} />

            {/* Keywords */}
            <KeywordsSection keywords={state.data.keywords} />

            {/* Benefits */}
            <BenefitsSection benefits={state.data.benefits} />
          </div>
        )}
      </main>
    </div>
  )
}
