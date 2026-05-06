import { useState, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GapType = 'missing_skill' | 'weak_section' | 'experience_gap'
export type Severity = 'high' | 'medium' | 'low'

export interface GapItem {
  gap_type: GapType
  item: string
  severity: Severity
}

export interface GapReport {
  gaps: GapItem[]
  has_gaps: boolean
}

export interface GapRequest {
  resume_skills: string[]
  detected_sections: string[]
  total_experience_years: number
  summary?: string
  experience_count: number
  education_count: number
  projects_count: number
  jd_required_skills: string[]
  jd_preferred_skills: string[]
  min_experience_years: number | null
  max_experience_years: number | null
}

export type GapStatus = 'idle' | 'loading' | 'success' | 'error'

export interface GapState {
  status: GapStatus
  data: GapReport | null
  errorMessage: string
  latencyMs: number | null
}

const initial = (): GapState => ({
  status: 'idle',
  data: null,
  errorMessage: '',
  latencyMs: null,
})

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGapDetection() {
  const [state, setState] = useState<GapState>(initial())

  const detect = useCallback(async (req: GapRequest) => {
    setState({ status: 'loading', data: null, errorMessage: '', latencyMs: null })
    const start = performance.now()
    try {
      const res = await fetch('/api/v1/dev/gap', {
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
        setState({ status: 'success', data: json as GapReport, errorMessage: '', latencyMs })
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

  return { state, detect, reset }
}
