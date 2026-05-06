import { useState, useCallback, useRef } from 'react'
import { useResumeAgent } from '../hooks/useResumeAgent'
import type { AgentResumeResult, AgentExperience, AgentEducation, AgentProject } from '../hooks/useResumeAgent'

// ---------------------------------------------------------------------------
// Upload Zone
// ---------------------------------------------------------------------------

const MAX_SIZE = 5 * 1024 * 1024

function UploadZone({ onFile, disabled }: { onFile: (f: File) => void; disabled: boolean }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handle = useCallback(
    (file: File) => {
      if (file.size > MAX_SIZE) return
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext !== 'pdf' && ext !== 'docx') return
      onFile(file)
    },
    [onFile],
  )

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) handle(f)
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed py-20 px-8 cursor-pointer transition-all duration-200 ${
        dragging
          ? 'border-violet-400 bg-violet-950/30 scale-[1.01]'
          : disabled
          ? 'border-gray-700 bg-gray-900/50 cursor-not-allowed opacity-50'
          : 'border-gray-600 bg-gray-900/50 hover:border-violet-500 hover:bg-violet-950/20'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handle(f)
          e.target.value = ''
        }}
      />
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-900/60 to-indigo-900/60 border border-violet-700/40 flex items-center justify-center text-4xl shadow-lg">
        📄
      </div>
      <div className="text-center space-y-1">
        <p className="text-white font-semibold text-xl">Drop your resume here</p>
        <p className="text-gray-400 text-sm">
          or <span className="text-violet-400 underline">browse files</span>
        </p>
        <p className="text-gray-600 text-xs mt-2">PDF or DOCX · max 5 MB</p>
      </div>
      <div className="flex gap-3 text-xs text-gray-600">
        <span className="px-2 py-1 rounded-full bg-gray-800 border border-gray-700">✓ AI-powered</span>
        <span className="px-2 py-1 rounded-full bg-gray-800 border border-gray-700">✓ GPT-4o-mini</span>
        <span className="px-2 py-1 rounded-full bg-gray-800 border border-gray-700">✓ Instant results</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

function LoadingState({ fileName }: { fileName: string | null }) {
  const steps = ['Reading file', 'Extracting text', 'AI analysis', 'Structuring data']
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-24">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-violet-900 border-t-violet-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-white font-bold text-xl">Analyzing your resume…</p>
        {fileName && <p className="text-gray-400 text-sm">{fileName}</p>}
        <p className="text-gray-500 text-xs">GPT-4o-mini is extracting all your data</p>
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {steps.map((step, i) => (
          <span
            key={step}
            className="px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-400 animate-pulse"
            style={{ animationDelay: `${i * 0.4}s` }}
          >
            {step}
          </span>
        ))}
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
// Contact
// ---------------------------------------------------------------------------

function ContactSection({ data }: { data: AgentResumeResult }) {
  const { contact, summary, total_experience_years } = data
  const initials = contact.name
    ? contact.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const links = [
    contact.email && { label: contact.email, href: `mailto:${contact.email}`, icon: '✉️' },
    contact.phone && { label: contact.phone, href: `tel:${contact.phone}`, icon: '📞' },
    contact.location && { label: contact.location, href: null, icon: '📍' },
    contact.linkedin && {
      label: 'LinkedIn',
      href: contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`,
      icon: '🔗',
    },
    contact.github && {
      label: 'GitHub',
      href: contact.github.startsWith('http') ? contact.github : `https://${contact.github}`,
      icon: '💻',
    },
    contact.website && {
      label: 'Website',
      href: contact.website.startsWith('http') ? contact.website : `https://${contact.website}`,
      icon: '🌐',
    },
  ].filter(Boolean) as { label: string; href: string | null; icon: string }[]

  return (
    <div className="rounded-2xl border border-gray-700/60 bg-gradient-to-br from-gray-900 to-gray-900/80 p-6">
      <div className="flex items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white">{contact.name || 'Unknown'}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
            {links.map(({ label, href, icon }) =>
              href ? (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-violet-300 transition-colors">
                  <span>{icon}</span>{label}
                </a>
              ) : (
                <span key={label} className="flex items-center gap-1.5 text-sm text-gray-400">
                  <span>{icon}</span>{label}
                </span>
              )
            )}
          </div>
        </div>
        {total_experience_years > 0 && (
          <div className="flex-shrink-0 text-center bg-violet-900/30 border border-violet-700/40 rounded-xl px-4 py-3">
            <div className="text-2xl font-bold text-violet-300">{total_experience_years}</div>
            <div className="text-xs text-gray-500 mt-0.5">yrs exp</div>
          </div>
        )}
      </div>
      {summary && (
        <p className="mt-5 text-sm text-gray-300 leading-relaxed border-l-2 border-violet-600 pl-4 bg-violet-950/10 py-2 rounded-r-lg">
          {summary}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

function SkillsSection({ skills }: { skills: string[] }) {
  if (!skills.length) return (
    <Section title="Skills" icon="⚡" count={0}>
      <p className="text-gray-500 text-sm italic">No skills extracted.</p>
    </Section>
  )

  // Categorize skills
  const techPattern = /python|java(?:script)?|typescript|react|angular|vue|node|django|flask|fastapi|spring|express|next|svelte|laravel|tensorflow|pytorch|keras|pandas|numpy|scikit|tableau|power\s*bi|excel|spark|hadoop|kafka|aws|azure|gcp|docker|kubernetes|terraform|ansible|jenkins|github|gitlab|postgresql|mysql|mongodb|redis|elasticsearch|sqlite|oracle|cassandra|git|linux|bash|html|css|php|c\+\+|c#|go|rust|ruby|swift|kotlin|scala|matlab|simulink|arduino|opencv|yolo|efficientnet|resnet|bert|longformer|trt|tensorrt|cuda/i

  const tech = skills.filter((s) => techPattern.test(s))
  const other = skills.filter((s) => !techPattern.test(s))

  return (
    <Section title="Skills" icon="⚡" count={skills.length}>
      {tech.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Technical</p>
          <div className="flex flex-wrap gap-2">
            {tech.map((s) => (
              <span key={s} className="px-3 py-1 rounded-full bg-violet-900/40 border border-violet-700/50 text-violet-200 text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {other.length > 0 && (
        <div>
          {tech.length > 0 && <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Domain & Other</p>}
          <div className="flex flex-wrap gap-2">
            {other.map((s) => (
              <span key={s} className="px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

function ExperienceSection({ experience }: { experience: AgentExperience[] }) {
  if (!experience.length) return (
    <Section title="Experience" icon="💼" count={0}>
      <p className="text-gray-500 text-sm italic">No experience entries found.</p>
    </Section>
  )

  return (
    <Section title="Experience" icon="💼" count={experience.length}>
      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-700/60" />
        <div className="space-y-6">
          {experience.map((e, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-violet-600 border-2 border-gray-900 mt-1 z-10" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold text-white">{e.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {e.company && <span className="text-violet-400 text-sm">{e.company}</span>}
                    </div>
                  </div>
                  {(e.start_date || e.end_date) && (
                    <span className="text-xs text-gray-500 bg-gray-800/80 border border-gray-700/50 px-2.5 py-1 rounded-full flex-shrink-0">
                      {e.start_date}{e.start_date && e.end_date ? ' – ' : ''}{e.end_date || (e.start_date ? 'Present' : '')}
                    </span>
                  )}
                </div>
                {e.description.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {e.description.map((line, li) => (
                      <li key={li} className="flex items-start gap-2 text-sm text-gray-400">
                        <span className="text-gray-600 flex-shrink-0 mt-0.5">–</span>
                        <span className="leading-relaxed">{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------

function EducationSection({ education }: { education: AgentEducation[] }) {
  if (!education.length) return (
    <Section title="Education" icon="🎓" count={0}>
      <p className="text-gray-500 text-sm italic">No education entries found.</p>
    </Section>
  )

  return (
    <Section title="Education" icon="🎓" count={education.length}>
      <div className="space-y-3">
        {education.map((e, i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-gray-800/40 border border-gray-700/40 hover:border-gray-600/60 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/40 border border-indigo-700/30 flex items-center justify-center text-xl flex-shrink-0">
              🎓
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{e.institution}</p>
              <p className="text-indigo-300 text-sm mt-0.5">
                {e.degree}{e.field ? ` in ${e.field}` : ''}
              </p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {e.year && (
                  <span className="text-xs text-gray-500">📅 {e.year}</span>
                )}
                {e.grade && (
                  <span className="text-xs text-green-400 bg-green-900/20 border border-green-800/30 px-2 py-0.5 rounded-full">
                    {e.grade}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

function ProjectsSection({ projects }: { projects: AgentProject[] }) {
  if (!projects.length) return (
    <Section title="Projects" icon="🚀" count={0}>
      <p className="text-gray-500 text-sm italic">No projects found.</p>
    </Section>
  )

  return (
    <Section title="Projects" icon="🚀" count={projects.length}>
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((p, i) => (
          <div key={i} className="p-4 rounded-xl bg-gray-800/40 border border-gray-700/40 hover:border-gray-600/60 transition-colors flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-white text-sm leading-tight">{p.name}</p>
            </div>
            {p.description.length > 0 && (
              <ul className="space-y-1">
                {p.description.slice(0, 3).map((line, li) => (
                  <li key={li} className="flex items-start gap-1.5 text-xs text-gray-400">
                    <span className="text-gray-600 flex-shrink-0 mt-0.5">–</span>
                    <span className="leading-relaxed line-clamp-2">{line}</span>
                  </li>
                ))}
              </ul>
            )}
            {p.technologies.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-auto pt-1">
                {p.technologies.slice(0, 6).map((t) => (
                  <span key={t} className="px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300 text-xs border border-gray-600/40">
                    {t}
                  </span>
                ))}
                {p.technologies.length > 6 && (
                  <span className="text-xs text-gray-600 self-center">+{p.technologies.length - 6}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Achievements & Certifications
// ---------------------------------------------------------------------------

function AchievementsSection({ achievements, certifications }: {
  achievements: string[]
  certifications: string[]
}) {
  if (!achievements.length && !certifications.length) return null

  return (
    <Section title="Achievements & Certifications" icon="🏆" count={achievements.length + certifications.length}>
      {achievements.length > 0 && (
        <div className="mb-4">
          {certifications.length > 0 && (
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Achievements</p>
          )}
          <ul className="space-y-2">
            {achievements.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-yellow-500 flex-shrink-0 mt-0.5">★</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
      {certifications.length > 0 && (
        <div>
          {achievements.length > 0 && (
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Certifications</p>
          )}
          <div className="flex flex-wrap gap-2">
            {certifications.map((c, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-blue-900/30 border border-blue-700/40 text-blue-300 text-xs">
                🎖 {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

function LanguagesSection({ languages }: { languages: string[] }) {
  if (!languages.length) return null

  return (
    <Section title="Languages" icon="🌍" count={languages.length}>
      <div className="flex flex-wrap gap-2">
        {languages.map((l, i) => (
          <span key={i} className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm">
            {l}
          </span>
        ))}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------

function StatsBar({ data }: { data: AgentResumeResult }) {
  const stats = [
    { label: 'Skills', value: data.skills.length, icon: '⚡', color: 'text-violet-400' },
    { label: 'Experience', value: data.experience.length, icon: '💼', color: 'text-blue-400' },
    { label: 'Education', value: data.education.length, icon: '🎓', color: 'text-indigo-400' },
    { label: 'Projects', value: data.projects.length, icon: '🚀', color: 'text-green-400' },
    { label: 'Achievements', value: data.achievements.length + data.certifications.length, icon: '🏆', color: 'text-yellow-400' },
  ]

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map(({ label, value, icon, color }) => (
        <div key={label} className="rounded-xl bg-gray-900/80 border border-gray-700/60 p-3 text-center">
          <div className="text-lg">{icon}</div>
          <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ResumeAnalyzer() {
  const { state, analyze, reset } = useResumeAgent()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-base shadow-lg">
              ✨
            </div>
            <div>
              <h1 className="font-bold text-white leading-tight">Resume Analyzer</h1>
              <p className="text-gray-500 text-xs">Powered by GPT-4o-mini</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/jd"
              className="text-xs text-gray-400 hover:text-violet-300 border border-gray-700 hover:border-violet-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              💼 JD Analyzer
            </a>
            {state.status === 'success' && (
              <button
                onClick={reset}
                className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                ↑ New resume
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* Idle */}
        {state.status === 'idle' && (
          <div className="space-y-10">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-900/30 border border-violet-700/40 text-violet-300 text-sm">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                AI-powered resume extraction
              </div>
              <h2 className="text-4xl font-bold text-white leading-tight">
                Analyze your resume<br />
                <span className="text-violet-400">in seconds</span>
              </h2>
              <p className="text-gray-400 max-w-lg mx-auto text-lg">
                Upload your resume and GPT-4o-mini will extract every detail —
                contact info, skills, experience, education, projects, and more.
              </p>
            </div>
            <UploadZone onFile={analyze} disabled={false} />
          </div>
        )}

        {/* Loading */}
        {state.status === 'loading' && (
          <LoadingState fileName={state.fileName} />
        )}

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
              <div className="flex items-center gap-3">
                <span className="text-green-400 font-medium text-sm">✓ Analysis complete</span>
                {state.fileName && (
                  <span className="text-gray-600 text-sm">· {state.fileName}</span>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-900/30 border border-violet-700/40 text-xs text-violet-300">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                {state.data.extraction_source === 'agent' ? 'GPT-4o-mini extraction' : 'Rule-based extraction'}
                {state.latencyMs !== null && (
                  <span className="text-violet-500">· {(state.latencyMs / 1000).toFixed(1)}s</span>
                )}
              </div>
            </div>

            {/* Stats */}
            <StatsBar data={state.data} />

            {/* Contact + Summary */}
            <ContactSection data={state.data} />

            {/* Skills */}
            <SkillsSection skills={state.data.skills} />

            {/* Experience */}
            <ExperienceSection experience={state.data.experience} />

            {/* Education */}
            <EducationSection education={state.data.education} />

            {/* Projects */}
            <ProjectsSection projects={state.data.projects} />

            {/* Achievements + Certifications */}
            <AchievementsSection
              achievements={state.data.achievements}
              certifications={state.data.certifications}
            />

            {/* Languages */}
            <LanguagesSection languages={state.data.languages} />
          </div>
        )}
      </main>
    </div>
  )
}
