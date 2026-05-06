import { useState, useCallback } from 'react'

// Types for the Resume Agent API response
export interface AgentContact {
  name: string
  email: string
  phone: string
  linkedin: string
  location: string
  github?: string
  website?: string
}

export interface AgentExperience {
  title: string
  company: string
  location?: string        // optional — not always returned by agent
  start_date: string
  end_date: string
  description: string[]
}

export interface AgentEducation {
  institution: string
  degree: string
  field: string
  year: string
  grade: string
}

export interface AgentProject {
  name: string
  description: string[]
  technologies: string[]
  url?: string             // optional — not always returned by agent
}

export interface AgentResumeResult {
  contact: AgentContact
  summary: string
  skills: string[]
  experience: AgentExperience[]
  education: AgentEducation[]
  projects: AgentProject[]
  achievements: string[]
  certifications: string[]
  languages: string[]
  total_experience_years: number
  extraction_source: string
  raw_text: string
}

export type AgentStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AgentState {
  status: AgentStatus
  data: AgentResumeResult | null
  errorCode: string | null
  errorMessage: string
  latencyMs: number | null
  fileName: string | null
  fileSize: number | null
}

const initial = (): AgentState => ({
  status: 'idle',
  data: null,
  errorCode: null,
  errorMessage: '',
  latencyMs: null,
  fileName: null,
  fileSize: null,
})

export function useResumeAgent() {
  const [state, setState] = useState<AgentState>(initial())

  const analyze = useCallback(async (file: File) => {
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
      const res = await fetch('/api/v1/analyze-resume', { method: 'POST', body: form })
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
        // Normalize: ensure description fields are always arrays
        const data = json as AgentResumeResult
        data.experience = (data.experience || []).map((e) => ({
          ...e,
          description: Array.isArray(e.description)
            ? e.description
            : e.description ? [e.description as unknown as string] : [],
        }))
        data.projects = (data.projects || []).map((p) => ({
          ...p,
          description: Array.isArray(p.description)
            ? p.description
            : p.description ? [p.description as unknown as string] : [],
          technologies: Array.isArray(p.technologies) ? p.technologies : [],
        }))
        data.skills = data.skills || []
        data.achievements = data.achievements || []
        data.certifications = data.certifications || []
        data.languages = data.languages || []

        setState((s) => ({
          ...s,
          status: 'success',
          data,
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

  return { state, analyze, reset }
}
