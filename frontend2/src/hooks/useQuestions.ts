import { useState, useCallback } from 'react'
import type { GapItem } from './useGapDetection'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResumeContext {
  candidate_name?: string
  total_experience_years?: number
  top_skills?: string[]
  detected_sections?: string[]
  summary_snippet?: string
}

export interface Question {
  id: string
  text: string
  target_gap: string | null
  is_fallback: boolean
}

export interface QuestionsRequest {
  gaps: GapItem[]
  resume_context?: ResumeContext
}

export interface QuestionsResponse {
  questions: Question[]
  fallback_mode: boolean
  question_count: number
}

export type QuestionsStatus = 'idle' | 'loading' | 'success' | 'error'

export interface QuestionsState {
  status: QuestionsStatus
  data: QuestionsResponse | null
  errorMessage: string
  latencyMs: number | null
}

const initial = (): QuestionsState => ({
  status: 'idle',
  data: null,
  errorMessage: '',
  latencyMs: null,
})

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useQuestions() {
  const [state, setState] = useState<QuestionsState>(initial())

  const generate = useCallback(async (req: QuestionsRequest) => {
    setState({ status: 'loading', data: null, errorMessage: '', latencyMs: null })
    const start = performance.now()
    try {
      const res = await fetch('/api/v1/dev/questions', {
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
        setState({ status: 'success', data: json as QuestionsResponse, errorMessage: '', latencyMs })
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
