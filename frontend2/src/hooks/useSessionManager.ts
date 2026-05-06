/**
 * useSessionManager — manages the full EPIC 9 session lifecycle.
 *
 * Tracks each step: Upload → Score → Questions → Answers → Suggestions → Approve
 * and exposes actions for each transition.
 */
import { useState, useCallback, useRef } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepStatus = 'pending' | 'active' | 'complete' | 'error'

export interface LifecycleStep {
  id: string
  label: string
  status: StepStatus
  timestamp: string | null
  errorMessage?: string
}

export interface RequestLogEntry {
  id: string
  endpoint: string
  method: string
  statusCode: number
  durationMs: number
  requestId: string | null
  timestamp: string
}

export interface SessionData {
  session_id: string
  match_result: Record<string, unknown>
  ats_result: Record<string, unknown>
  gap_report: Record<string, unknown>
  questions?: unknown[]
  answers?: unknown[]
  suggestions?: unknown[]
  download_url?: string | null
  created_at: string
  expires_at: string
}

export interface QuestionItem {
  id: string
  text: string
  target_gap: string | null
  is_fallback: boolean
}

export interface SuggestionItem {
  id: string
  target_section: string
  suggested_change: string
  rationale: string
  gap_reference: string | null
  approved: boolean | null
}

export type SessionManagerStatus = 'idle' | 'loading' | 'error'

export interface SessionManagerState {
  status: SessionManagerStatus
  sessionId: string | null
  sessionData: SessionData | null
  questions: QuestionItem[]
  suggestions: SuggestionItem[]
  fallbackMode: boolean
  llmError: string
  downloadUrl: string | null
  steps: LifecycleStep[]
  requestLog: RequestLogEntry[]
  errorMessage: string
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const STEP_DEFS: { id: string; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'score', label: 'Score' },
  { id: 'questions', label: 'Questions' },
  { id: 'answers', label: 'Answers' },
  { id: 'suggestions', label: 'Suggestions' },
  { id: 'approve', label: 'Approve' },
]

function makeSteps(): LifecycleStep[] {
  return STEP_DEFS.map((s) => ({
    id: s.id,
    label: s.label,
    status: 'pending',
    timestamp: null,
  }))
}

function initialState(): SessionManagerState {
  return {
    status: 'idle',
    sessionId: null,
    sessionData: null,
    questions: [],
    suggestions: [],
    fallbackMode: false,
    llmError: '',
    downloadUrl: null,
    steps: makeSteps(),
    requestLog: [],
    errorMessage: '',
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSessionManager() {
  const [state, setState] = useState<SessionManagerState>(initialState())
  const logRef = useRef<RequestLogEntry[]>([])

  // --- Internal helpers ---

  const now = () => new Date().toISOString()

  const addLogEntry = useCallback((entry: Omit<RequestLogEntry, 'id'>) => {
    const full: RequestLogEntry = { ...entry, id: crypto.randomUUID() }
    logRef.current = [full, ...logRef.current].slice(0, 10)
    setState((prev) => ({ ...prev, requestLog: [...logRef.current] }))
  }, [])

  const setStepStatus = useCallback(
    (stepId: string, status: StepStatus, errorMessage?: string) => {
      setState((prev) => ({
        ...prev,
        steps: prev.steps.map((s) =>
          s.id === stepId
            ? { ...s, status, timestamp: now(), errorMessage }
            : s,
        ),
      }))
    },
    [],
  )

  async function apiFetch(
    method: string,
    url: string,
    body?: BodyInit | null,
    headers?: Record<string, string>,
  ): Promise<{ ok: boolean; status: number; data: unknown; requestId: string | null }> {
    const start = performance.now()
    try {
      const res = await fetch(url, { method, body, headers })
      const durationMs = Math.round(performance.now() - start)
      const requestId = res.headers.get('x-request-id')
      let data: unknown = null
      try {
        const text = await res.text()
        data = text ? JSON.parse(text) : null
      } catch {
        data = null
      }
      addLogEntry({
        endpoint: url,
        method,
        statusCode: res.status,
        durationMs,
        requestId,
        timestamp: now(),
      })
      return { ok: res.ok || res.status === 206, status: res.status, data, requestId }
    } catch (err) {
      const durationMs = Math.round(performance.now() - start)
      addLogEntry({
        endpoint: url,
        method,
        statusCode: 0,
        durationMs,
        requestId: null,
        timestamp: now(),
      })
      throw err
    }
  }

  // ---------------------------------------------------------------------------
  // Step 1+2: Upload resume + JD → create session
  // ---------------------------------------------------------------------------

  const createSession = useCallback(
    async (resumeFile: File, jdText: string): Promise<string | null> => {
      setState((prev) => ({
        ...prev,
        status: 'loading',
        errorMessage: '',
        steps: makeSteps(),
        sessionId: null,
        sessionData: null,
        questions: [],
        suggestions: [],
        downloadUrl: null,
      }))
      setStepStatus('upload', 'active')

      const formData = new FormData()
      formData.append('resume_file', resumeFile)
      formData.append('jd_text', jdText)

      try {
        const result = await apiFetch('POST', '/api/v1/sessions', formData)
        if (!result.ok) {
          const msg = (result.data as Record<string, unknown>)?.message as string ?? `HTTP ${result.status}`
          setStepStatus('upload', 'error', msg)
          setStepStatus('score', 'error')
          setState((prev) => ({ ...prev, status: 'error', errorMessage: msg }))
          return null
        }
        const data = result.data as SessionData
        setStepStatus('upload', 'complete')
        setStepStatus('score', 'complete')
        setState((prev) => ({
          ...prev,
          status: 'idle',
          sessionId: data.session_id,
          sessionData: data,
        }))
        return data.session_id
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error'
        setStepStatus('upload', 'error', msg)
        setState((prev) => ({ ...prev, status: 'error', errorMessage: msg }))
        return null
      }
    },
    [addLogEntry, setStepStatus],
  )

  // ---------------------------------------------------------------------------
  // Step 3: Generate questions
  // ---------------------------------------------------------------------------

  const generateQuestions = useCallback(
    async (sessionId: string): Promise<QuestionItem[]> => {
      setStepStatus('questions', 'active')
      setState((prev) => ({ ...prev, status: 'loading' }))

      try {
        const result = await apiFetch('GET', `/api/v1/sessions/${sessionId}/questions`)
        const data = result.data as Record<string, unknown>

        if (!result.ok && result.status !== 206) {
          const msg = (data?.message as string) ?? `HTTP ${result.status}`
          setStepStatus('questions', 'error', msg)
          setState((prev) => ({ ...prev, status: 'error', errorMessage: msg }))
          return []
        }

        const questions = (data?.questions as QuestionItem[]) ?? []
        const fallbackMode = Boolean(data?.fallback_mode)
        const llmError = (data?.llm_error as string) ?? ''

        setStepStatus('questions', 'complete')
        setState((prev) => ({
          ...prev,
          status: 'idle',
          questions,
          fallbackMode,
          llmError,
        }))
        return questions
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error'
        setStepStatus('questions', 'error', msg)
        setState((prev) => ({ ...prev, status: 'error', errorMessage: msg }))
        return []
      }
    },
    [addLogEntry, setStepStatus],
  )

  // ---------------------------------------------------------------------------
  // Step 4+5: Submit answers → generate suggestions
  // ---------------------------------------------------------------------------

  const submitAnswers = useCallback(
    async (
      sessionId: string,
      answers: { question_id: string; answer_text: string }[],
    ): Promise<SuggestionItem[]> => {
      setStepStatus('answers', 'active')
      setState((prev) => ({ ...prev, status: 'loading' }))

      try {
        const result = await apiFetch(
          'POST',
          `/api/v1/sessions/${sessionId}/answers`,
          JSON.stringify({ answers }),
          { 'Content-Type': 'application/json' },
        )
        const data = result.data as Record<string, unknown>

        if (!result.ok && result.status !== 206) {
          const msg = (data?.message as string) ?? `HTTP ${result.status}`
          setStepStatus('answers', 'error', msg)
          setStepStatus('suggestions', 'error')
          setState((prev) => ({ ...prev, status: 'error', errorMessage: msg }))
          return []
        }

        const suggestions = (data?.suggestions as SuggestionItem[]) ?? []
        const llmError = (data?.llm_error as string) ?? ''

        setStepStatus('answers', 'complete')
        setStepStatus('suggestions', 'complete')
        setState((prev) => ({
          ...prev,
          status: 'idle',
          suggestions,
          llmError: llmError || prev.llmError,
          fallbackMode: Boolean(data?.is_partial) || prev.fallbackMode,
        }))
        return suggestions
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error'
        setStepStatus('answers', 'error', msg)
        setState((prev) => ({ ...prev, status: 'error', errorMessage: msg }))
        return []
      }
    },
    [addLogEntry, setStepStatus],
  )

  // ---------------------------------------------------------------------------
  // Step 6: Approve suggestions
  // ---------------------------------------------------------------------------

  const approveSuggestions = useCallback(
    async (
      sessionId: string,
      decisions: Record<string, boolean>,
    ): Promise<boolean> => {
      setStepStatus('approve', 'active')
      setState((prev) => ({ ...prev, status: 'loading' }))

      try {
        const result = await apiFetch(
          'POST',
          `/api/v1/sessions/${sessionId}/suggestions/approve`,
          JSON.stringify({ decisions }),
          { 'Content-Type': 'application/json' },
        )
        const data = result.data as Record<string, unknown>

        if (!result.ok) {
          const msg = (data?.message as string) ?? `HTTP ${result.status}`
          setStepStatus('approve', 'error', msg)
          setState((prev) => ({ ...prev, status: 'error', errorMessage: msg }))
          return false
        }

        setStepStatus('approve', 'complete')
        setState((prev) => ({ ...prev, status: 'idle' }))
        return true
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error'
        setStepStatus('approve', 'error', msg)
        setState((prev) => ({ ...prev, status: 'error', errorMessage: msg }))
        return false
      }
    },
    [addLogEntry, setStepStatus],
  )

  // ---------------------------------------------------------------------------
  // Generate PDF
  // ---------------------------------------------------------------------------

  const generatePdf = useCallback(
    async (sessionId: string, templateId: string): Promise<string | null> => {
      setState((prev) => ({ ...prev, status: 'loading' }))

      try {
        const result = await apiFetch(
          'POST',
          `/api/v1/sessions/${sessionId}/generate`,
          JSON.stringify({ template_id: templateId }),
          { 'Content-Type': 'application/json' },
        )
        const data = result.data as Record<string, unknown>

        if (!result.ok) {
          const msg = (data?.message as string) ?? `HTTP ${result.status}`
          setState((prev) => ({ ...prev, status: 'error', errorMessage: msg }))
          return null
        }

        const downloadUrl = (data?.download_url as string) ?? null
        setState((prev) => ({ ...prev, status: 'idle', downloadUrl }))
        return downloadUrl
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error'
        setState((prev) => ({ ...prev, status: 'error', errorMessage: msg }))
        return null
      }
    },
    [addLogEntry],
  )

  // ---------------------------------------------------------------------------
  // Fetch session by ID (for inspector)
  // ---------------------------------------------------------------------------

  const fetchSession = useCallback(
    async (sessionId: string): Promise<unknown> => {
      try {
        const result = await apiFetch('GET', `/api/v1/sessions/${sessionId}`)
        return result.data
      } catch {
        return null
      }
    },
    [addLogEntry],
  )

  // ---------------------------------------------------------------------------
  // Simulate error
  // ---------------------------------------------------------------------------

  const simulateError = useCallback(
    async (errorCode: string): Promise<{ status: number; data: unknown }> => {
      let method = 'GET'
      let url = ''
      let body: BodyInit | null = null
      let headers: Record<string, string> | undefined

      switch (errorCode) {
        case 'SESSION_NOT_FOUND':
          url = '/api/v1/sessions/nonexistent-session-id-00000/questions'
          break
        case 'JD_TOO_SHORT': {
          url = '/api/v1/sessions'
          method = 'POST'
          const fd = new FormData()
          fd.append('jd_text', 'short')
          fd.append('resume_file', new File(['dummy'], 'test.pdf', { type: 'application/pdf' }))
          body = fd
          break
        }
        case 'UNSUPPORTED_FORMAT': {
          url = '/api/v1/sessions'
          method = 'POST'
          const fd2 = new FormData()
          fd2.append('jd_text', 'This is a job description with more than fifty characters for testing purposes.')
          fd2.append('resume_file', new File(['dummy content'], 'resume.txt', { type: 'text/plain' }))
          body = fd2
          break
        }
        case 'FILE_TOO_LARGE': {
          url = '/api/v1/sessions'
          method = 'POST'
          // Create a fake oversized file (6MB of zeros)
          const bigContent = new Uint8Array(6 * 1024 * 1024)
          const fd3 = new FormData()
          fd3.append('jd_text', 'This is a job description with more than fifty characters for testing purposes.')
          fd3.append('resume_file', new File([bigContent], 'large.pdf', { type: 'application/pdf' }))
          body = fd3
          break
        }
        case 'PARSE_FAILURE': {
          url = '/api/v1/sessions'
          method = 'POST'
          // Empty PDF bytes
          const emptyPdf = new Uint8Array(0)
          const fd4 = new FormData()
          fd4.append('jd_text', 'This is a job description with more than fifty characters for testing purposes.')
          fd4.append('resume_file', new File([emptyPdf], 'empty.pdf', { type: 'application/pdf' }))
          body = fd4
          break
        }
        case 'LLM_UNAVAILABLE':
          url = '/api/v1/dev/suggestions'
          method = 'POST'
          body = JSON.stringify({ gaps: [], answers: [], resume_sections: {} })
          headers = { 'Content-Type': 'application/json' }
          break
        case 'INTERNAL_ERROR':
          // This will 404 (SESSION_NOT_FOUND), showing the error shape
          url = '/api/v1/sessions/trigger-500/questions'
          break
        default:
          url = '/api/v1/sessions/unknown/questions'
      }

      try {
        const result = await apiFetch(method, url, body, headers)
        return { status: result.status, data: result.data }
      } catch (err) {
        return { status: 0, data: { error: err instanceof Error ? err.message : 'Network error' } }
      }
    },
    [addLogEntry],
  )

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    logRef.current = []
    setState(initialState())
  }, [])

  return {
    state,
    createSession,
    generateQuestions,
    submitAnswers,
    approveSuggestions,
    generatePdf,
    fetchSession,
    simulateError,
    reset,
  }
}
