import { useState, useCallback } from 'react'

export interface JDAgentResult {
  job_title: string
  company: string
  location: string
  job_type: string
  required_skills: string[]
  preferred_skills: string[]
  tools: string[]
  experience_required: string
  responsibilities: string[]
  qualifications: string[]
  keywords: string[]
  salary_range: string
  benefits: string[]
  extraction_source: string
}

export type JDAgentStatus = 'idle' | 'loading' | 'success' | 'error'

export interface JDAgentState {
  status: JDAgentStatus
  data: JDAgentResult | null
  errorCode: string | null
  errorMessage: string
  latencyMs: number | null
}

const initial = (): JDAgentState => ({
  status: 'idle',
  data: null,
  errorCode: null,
  errorMessage: '',
  latencyMs: null,
})

export function useJDAgent() {
  const [state, setState] = useState<JDAgentState>(initial())

  const analyze = useCallback(async (jdText: string) => {
    setState({ status: 'loading', data: null, errorCode: null, errorMessage: '', latencyMs: null })

    const start = performance.now()
    try {
      const res = await fetch('/api/v1/analyze-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: jdText }),
      })
      const latencyMs = Math.round(performance.now() - start)
      const json = await res.json()

      if (!res.ok) {
        setState({
          status: 'error',
          data: null,
          errorCode: json.error_code ?? 'UNKNOWN',
          errorMessage: json.message ?? `HTTP ${res.status}`,
          latencyMs,
        })
      } else {
        setState({
          status: 'success',
          data: json as JDAgentResult,
          errorCode: null,
          errorMessage: '',
          latencyMs,
        })
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start)
      setState({
        status: 'error',
        data: null,
        errorCode: 'NETWORK_ERROR',
        errorMessage: err instanceof Error ? err.message : 'Network error',
        latencyMs,
      })
    }
  }, [])

  const reset = useCallback(() => setState(initial()), [])

  return { state, analyze, reset }
}
