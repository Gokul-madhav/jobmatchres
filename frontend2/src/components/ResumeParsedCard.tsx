import { useState, useCallback, useRef } from 'react'
import { useResumeParser } from '../hooks/useResumeParser'
import type { ParsedResume } from '../hooks/useResumeParser'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function fileTypeBadge(name: string) {
  const ext = name.split('.').pop()?.toUpperCase() ?? '?'
  const color = ext === 'PDF' ? 'bg-red-900 text-red-300 border-red-700' : 'bg-blue-900 text-blue-300 border-blue-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${color}`}>
      {ext}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Section Detection Heatmap
// ---------------------------------------------------------------------------

const STANDARD_SECTIONS = ['summary', 'skills', 'experience', 'education', 'projects'] as const

function SectionHeatmap({ detected }: { detected: string[] }) {
  const detectedSet = new Set(detected.map((s) => s.toLowerCase()))
  return (
    <div className="grid grid-cols-5 gap-2">
      {STANDARD_SECTIONS.map((sec) => {
        const found = detectedSet.has(sec)
        const label = sec.charAt(0).toUpperCase() + sec.slice(1)
        const color = found
          ? 'bg-green-900 border-green-600 text-green-300'
          : 'bg-red-900 border-red-600 text-red-300'
        const icon = found ? '✓' : '✗'
        return (
          <div
            key={sec}
            className={`flex flex-col items-center justify-center rounded-lg border py-3 gap-1 ${color}`}
          >
            <span className="text-lg font-bold">{icon}</span>
            <span className="text-xs font-medium">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type Tab = 'contact' | 'skills' | 'experience' | 'education' | 'projects'

const TABS: { id: Tab; label: string }[] = [
  { id: 'contact', label: 'Contact' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'projects', label: 'Projects' },
]

function ContactTab({ data }: { data: ParsedResume }) {
  const { contact } = data
  const rows = [
    { label: 'Name', value: contact.name },
    { label: 'Email', value: contact.email },
    { label: 'Phone', value: contact.phone },
    { label: 'LinkedIn', value: contact.linkedin },
    { label: 'Location', value: contact.location },
  ]
  return (
    <div className="space-y-2">
      {data.summary && (
        <p className="text-sm text-gray-300 italic border-l-2 border-indigo-500 pl-3">{data.summary}</p>
      )}
      <table className="w-full text-sm">
        <tbody>
          {rows.map(({ label, value }) => (
            <tr key={label} className="border-b border-gray-800">
              <td className="py-1.5 pr-4 text-gray-400 font-medium w-24">{label}</td>
              <td className="py-1.5 text-gray-200">{value ?? <span className="text-gray-600 italic">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SkillsTab({ skills }: { skills: string[] }) {
  if (!skills.length) return <p className="text-gray-500 text-sm italic">No skills extracted.</p>
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((s) => (
        <span key={s} className="px-2.5 py-1 rounded-full bg-indigo-900 border border-indigo-700 text-indigo-200 text-xs font-medium">
          {s}
        </span>
      ))}
    </div>
  )
}

function ExperienceTab({ experience }: { experience: ParsedResume['experience'] }) {
  if (!experience.length) return <p className="text-gray-500 text-sm italic">No experience entries found.</p>
  return (
    <ol className="relative border-l border-gray-700 space-y-6 ml-2">
      {experience.map((e, i) => (
        <li key={i} className="ml-4">
          <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-gray-900" />
          <p className="text-sm font-semibold text-white">{e.title}</p>
          <p className="text-xs text-gray-400">{e.company}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {e.start_date} — {e.end_date ?? 'Present'}
          </p>
          {e.description && <p className="text-xs text-gray-300 mt-1">{e.description}</p>}
        </li>
      ))}
    </ol>
  )
}

function EducationTab({ education }: { education: ParsedResume['education'] }) {
  if (!education.length) return <p className="text-gray-500 text-sm italic">No education entries found.</p>
  return (
    <div className="space-y-3">
      {education.map((e, i) => (
        <div key={i} className="rounded-lg border border-gray-700 bg-gray-800 p-3">
          <p className="text-sm font-semibold text-white">{e.institution}</p>
          <p className="text-xs text-gray-300">{e.degree}{e.field ? ` — ${e.field}` : ''}</p>
          {e.graduation_year && <p className="text-xs text-gray-500 mt-0.5">Class of {e.graduation_year}</p>}
        </div>
      ))}
    </div>
  )
}

function ProjectsTab({ projects }: { projects: ParsedResume['projects'] }) {
  if (!projects.length) return <p className="text-gray-500 text-sm italic">No projects found.</p>
  return (
    <div className="space-y-3">
      {projects.map((p, i) => (
        <div key={i} className="rounded-lg border border-gray-700 bg-gray-800 p-3">
          <p className="text-sm font-semibold text-white">{p.name}</p>
          {p.description && <p className="text-xs text-gray-300 mt-1">{p.description}</p>}
          {p.skills_mentioned.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {p.skills_mentioned.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded bg-gray-700 text-gray-300 text-xs">{s}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ParsedResume Viewer
// ---------------------------------------------------------------------------

function ParsedResumeViewer({ data }: { data: ParsedResume }) {
  const [activeTab, setActiveTab] = useState<Tab>('contact')
  const maxYears = 10
  const pct = Math.min((data.total_experience_years / maxYears) * 100, 100)

  return (
    <div className="space-y-5">
      {/* Section Detection Heatmap */}
      <div>
        <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">Section Detection</p>
        <SectionHeatmap detected={data.detected_sections} />
      </div>

      {/* Experience bar + formatting issues */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Total Experience</span>
          <span className="font-semibold text-white">{data.total_experience_years} yrs</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {data.formatting_issues.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {data.formatting_issues.map((issue) => (
              <span key={issue} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-900 border border-amber-700 text-amber-300 text-xs">
                ⚠ {issue.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabbed viewer */}
      <div>
        <div className="flex gap-1 border-b border-gray-700 mb-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                activeTab === t.id
                  ? 'bg-gray-800 text-white border border-b-0 border-gray-700'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="min-h-[120px]">
          {activeTab === 'contact' && <ContactTab data={data} />}
          {activeTab === 'skills' && <SkillsTab skills={data.skills} />}
          {activeTab === 'experience' && <ExperienceTab experience={data.experience} />}
          {activeTab === 'education' && <EducationTab education={data.education} />}
          {activeTab === 'projects' && <ProjectsTab projects={data.projects} />}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Drop Zone
// ---------------------------------------------------------------------------

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

interface DropZoneProps {
  onFile: (file: File) => void
  disabled: boolean
}

function DropZone({ onFile, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
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
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 cursor-pointer transition-colors ${
        dragging
          ? 'border-indigo-400 bg-indigo-950'
          : disabled
          ? 'border-gray-700 bg-gray-900 cursor-not-allowed opacity-60'
          : 'border-gray-600 bg-gray-900 hover:border-indigo-500 hover:bg-gray-800'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <span className="text-3xl">📄</span>
      <p className="text-sm text-gray-300 font-medium">
        Drag &amp; drop or <span className="text-indigo-400 underline">browse</span>
      </p>
      <p className="text-xs text-gray-500">PDF or DOCX · max 5 MB</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error Toast
// ---------------------------------------------------------------------------

function ErrorToast({ code, message, onDismiss }: { code: string; message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-700 bg-red-950 px-4 py-3">
      <span className="text-red-400 text-lg mt-0.5">✗</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-300">{code}</p>
        <p className="text-xs text-red-400 mt-0.5">{message}</p>
      </div>
      <button onClick={onDismiss} className="text-red-500 hover:text-red-300 text-sm ml-2">✕</button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Card
// ---------------------------------------------------------------------------

export default function ResumeParsedCard() {
  const [open, setOpen] = useState(true)
  const { state, parseFile, reset } = useResumeParser()

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800 transition-colors"
      >
        <span className="font-semibold text-white text-sm tracking-wide">
          EPIC 2 — Resume Parsing
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-700 pt-4">
          {/* File info row */}
          {state.fileName && (
            <div className="flex items-center gap-2 text-sm">
              {fileTypeBadge(state.fileName)}
              <span className="text-gray-200 truncate max-w-xs">{state.fileName}</span>
              {state.fileSize !== null && (
                <span className="text-gray-500 text-xs">{formatBytes(state.fileSize)}</span>
              )}
              {state.latencyMs !== null && (
                <span className="text-gray-500 text-xs ml-auto">{state.latencyMs} ms</span>
              )}
              <button onClick={reset} className="text-gray-500 hover:text-gray-300 text-xs ml-1">✕ reset</button>
            </div>
          )}

          {/* Drop zone — hide after success */}
          {state.status !== 'success' && (
            <DropZone onFile={parseFile} disabled={state.status === 'loading'} />
          )}

          {/* Loading */}
          {state.status === 'loading' && (
            <p className="text-sm text-indigo-400 animate-pulse text-center">Parsing resume…</p>
          )}

          {/* Error toast */}
          {state.status === 'error' && (
            <ErrorToast
              code={state.errorCode ?? 'ERROR'}
              message={state.errorMessage}
              onDismiss={reset}
            />
          )}

          {/* Parsed result */}
          {state.status === 'success' && state.data && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-400 font-medium">✓ Parsed successfully</span>
                <button
                  onClick={reset}
                  className="text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  Upload another
                </button>
              </div>
              <ParsedResumeViewer data={state.data} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
