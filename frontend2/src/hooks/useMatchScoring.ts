import { useState, useCallback } from 'react'

export interface MatchResult {
  overall_score: number
  keyword_score: number
  semantic_score: number
  matched_skills: string[]
  missing_skills: string[]
  keyword_weight: number
  semantic_weight: number
}

export type MatchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface MatchState {
  status: MatchStatus
  data: MatchResult | null
  errorMessage: string
  latencyMs: number | null
}

const initial = (): MatchState => ({
  status: 'idle',
  data: null,
  errorMessage: '',
  latencyMs: null,
})

export function useMatchScoring() {
  const [state, setState] = useState<MatchState>(initial())

  const compute = useCallback(
    async (resumeSkills: string[], jdRequiredSkills: string[], resumeText?: string, jdText?: string) => {
      setState({ status: 'loading', data: null, errorMessage: '', latencyMs: null })
      const start = performance.now()
      try {
        const res = await fetch('/api/v1/dev/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resume_skills: resumeSkills,
            jd_required_skills: jdRequiredSkills,
            resume_text: resumeText,
            jd_text: jdText,
          }),
        })
        const latencyMs = Math.round(performance.now() - start)
        const json = await res.json()
        if (!res.ok) {
          setState({ status: 'error', data: null, errorMessage: json.message ?? `HTTP ${res.status}`, latencyMs })
        } else {
          setState({ status: 'success', data: json as MatchResult, errorMessage: '', latencyMs })
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
    },
    [],
  )

  const reset = useCallback(() => setState(initial()), [])

  return { state, compute, reset }
}
