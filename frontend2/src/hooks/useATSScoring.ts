import { useState, useCallback } from 'react'

export interface ATSSubScore {
  name: string
  raw_score: number
  weight: number
  weighted_contribution: number
}

export interface ATSResult {
  overall_score: number
  sub_scores: ATSSubScore[]
}

export interface ATSRequest {
  resume_skills: string[]
  detected_sections: string[]
  formatting_issues: string[]
  total_experience_years: number
  resume_text?: string
  summary?: string
  experience_count?: number
  education_count?: number
  projects_count?: number
  jd_required_skills: string[]
  jd_preferred_skills?: string[]
  min_experience_years?: number | null
  max_experience_years?: number | null
  jd_text?: string
}

export type ATSStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ATSState {
  status: ATSStatus
  data: ATSResult | null
  errorMessage: string
  latencyMs: number | null
}

const initial = (): ATSState => ({
  status: 'idle',
  data: null,
  errorMessage: '',
  latencyMs: null,
})

export function useATSScoring() {
  const [state, setState] = useState<ATSState>(initial())

  const compute = useCallback(async (req: ATSRequest) => {
    setState({ status: 'loading', data: null, errorMessage: '', latencyMs: null })
    const start = performance.now()
    try {
      const res = await fetch('/api/v1/dev/ats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      })
      const latencyMs = Math.round(performance.now() - start)
      const json = await res.json()
      if (!res.ok) {
        setState({
          status: 'error',
          data: null,
          errorMessage: json.message ?? `HTTP ${res.status}`,
          latencyMs,
        })
      } else {
        setState({ status: 'success', data: json as ATSResult, errorMessage: '', latencyMs })
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start)
      setState({
        status: 'error',
        data: null,
        errorMessage: err instanceof Error ? err.message : 'Network error',
        latencyMs,
      })
    }
  }, [])

  const reset = useCallback(() => setState(initial()), [])

  return { state, compute, reset }
}
