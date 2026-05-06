import { useState, useCallback } from 'react'
import type { GapItem } from './useGapDetection'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestionAnswer {
  question_id: string
  answer_text: string
}

export interface Suggestion {
  id: string
  target_section: string
  suggested_change: string
  rationale: string
  gap_reference: string | null
  approved: boolean | null
}

export interface SuggestionsRequest {
  gaps: GapItem[]
  answers: QuestionAnswer[]
  resume_sections: Record<string, string>
}

export interface SuggestionsResponse {
  suggestions: Suggestion[]
  llm_error: string
  is_partial: boolean
  suggestion_count: number
}

export type SuggestionsStatus = 'idle' | 'loading' | 'success' | 'partial' | 'error'

export interface SuggestionsState {
  status: SuggestionsStatus
  data: SuggestionsResponse | null
  errorMessage: string
  latencyMs: number | null
}

const initial = (): SuggestionsState => ({
  status: 'idle',
  data: null,
  errorMessage: '',
  latencyMs: null,
})

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSuggestions() {
  const [state, setState] = useState<SuggestionsState>(initial())

  const generate = useCallback(async (req: SuggestionsRequest) => {
    setState({ status: 'loading', data: null, errorMessage: '', latencyMs: null })
    const start = performance.now()
    try {
      const res = await fetch('/api/v1/dev/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      })
      const latencyMs = Math.round(performance.now() - start)
      const json = await res.json() as SuggestionsResponse

      if (res.status === 206) {
        // Partial result — LLM unavailable
        setState({ status: 'partial', data: json, errorMessage: '', latencyMs })
      } else if (!res.ok) {
        setState({
          status: 'error',
          data: null,
          errorMessage: (json as unknown as { message?: string }).message ?? `HTTP ${res.status}`,
          latencyMs,
        })
      } else {
        setState({ status: 'success', data: json, errorMessage: '', latencyMs })
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

  return { state, generate, reset }
}
