import { useState, useCallback } from 'react'

export interface ContactInfo {
  name: string
  email: string | null
  phone: string | null
  linkedin: string | null
  location: string | null
}

export interface ExperienceEntry {
  company: string
  title: string
  start_date: string
  end_date: string | null
  description: string
  skills_mentioned: string[]
}

export interface EducationEntry {
  institution: string
  degree: string
  field: string
  graduation_year: number | null
}

export interface ProjectEntry {
  name: string
  description: string
  skills_mentioned: string[]
}

export interface ParsedResume {
  contact: ContactInfo
  summary: string | null
  skills: string[]
  experience: ExperienceEntry[]
  education: EducationEntry[]
  projects: ProjectEntry[]
  raw_text: string
  total_experience_years: number
  detected_sections: string[]
  formatting_issues: string[]
}

export type ParseStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ParseState {
  status: ParseStatus
  data: ParsedResume | null
  errorCode: string | null
  errorMessage: string
  latencyMs: number | null
  fileName: string | null
  fileSize: number | null
}

const initial = (): ParseState => ({
  status: 'idle',
  data: null,
  errorCode: null,
  errorMessage: '',
  latencyMs: null,
  fileName: null,
  fileSize: null,
})

export function useResumeParser() {
  const [state, setState] = useState<ParseState>(initial())

  const parseFile = useCallback(async (file: File) => {
    setState({
      status: 'loading',
      data: null,
      errorCode: null,
      errorMessage: '',
      latencyMs: null,
      fileName: file.name,
      fileSize: file.size,
    })

    const form = new FormData()
    form.append('resume_file', file)

    const start = performance.now()
    try {
      const res = await fetch('/api/v1/dev/parse-resume', { method: 'POST', body: form })
      const latencyMs = Math.round(performance.now() - start)
      const json = await res.json()

      if (!res.ok) {
        setState((s) => ({
          ...s,
          status: 'error',
          errorCode: json.error_code ?? 'UNKNOWN',
          errorMessage: json.message ?? `HTTP ${res.status}`,
          latencyMs,
        }))
      } else {
        setState((s) => ({
          ...s,
          status: 'success',
          data: json as ParsedResume,
          latencyMs,
        }))
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start)
      setState((s) => ({
        ...s,
        status: 'error',
        errorCode: 'NETWORK_ERROR',
        errorMessage: err instanceof Error ? err.message : 'Network error',
        latencyMs,
      }))
    }
  }, [])

  const reset = useCallback(() => setState(initial()), [])

  return { state, parseFile, reset }
}
