import { useState, useCallback } from 'react'

export interface ParsedJD {
  required_skills: string[]
  preferred_skills: string[]
  keywords: string[]   // format: "keyword:weight"
  raw_text: string
  min_experience_years: number | null
  max_experience_years: number | null
}

export type JDParseStatus = 'idle' | 'loading' | 'success' | 'error'

export interface JDParseState {
  status: JDParseStatus
  data: ParsedJD | null
  errorCode: string | null
  errorMessage: string
  latencyMs: number | null
}

const initial = (): JDParseState => ({
  status: 'idle',
  data: null,
  errorCode: null,
  errorMessage: '',
  latencyMs: null,
})

export function useJDParser() {
  const [state, setState] = useState<JDParseState>(initial())

  const parseJD = useCallback(async (jdText: string) => {
    setState({ status: 'loading', data: null, errorCode: null, errorMessage: '', latencyMs: null })

    const start = performance.now()
    try {
      const res = await fetch('/api/v1/dev/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: jdText }),
      })
      const latencyMs = Math.round(performance.now() - start)
      const json = await res.json()

      if (!res.ok) {
        setState({ status: 'error', data: null, errorCode: json.error_code ?? 'UNKNOWN', errorMessage: json.message ?? `HTTP ${res.status}`, latencyMs })
      } else {
        setState({ status: 'success', data: json as ParsedJD, errorCode: null, errorMessage: '', latencyMs })
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start)
      setState({ status: 'error', data: null, errorCode: 'NETWORK_ERROR', errorMessage: err instanceof Error ? err.message : 'Network error', latencyMs })
    }
  }, [])

  const reset = useCallback(() => setState(initial()), [])

  return { state, parseJD, reset }
}
