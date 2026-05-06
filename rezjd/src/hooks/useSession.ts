import { useState } from 'react'
import {
  createSession,
  getQuestions,
  submitAnswers,
  approveSuggestions,
  generateResume,
  downloadResume,
  type SessionResponse,
  type QuestionsResponse,
  type SuggestionsResponse,
  type GenerateResponse,
} from '../services/api'
import { useAuth } from './useAuth'
import { saveSession, updateSession } from '../lib/firebaseDb'

export function useSession() {
  const { user } = useAuth()
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [questions, setQuestions] = useState<QuestionsResponse | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null)
  const [generated, setGenerated] = useState<GenerateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startSession = async (file: File, jdText: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await createSession(file, jdText)
      setSession(result)
      // Firebase save is best-effort — never block the main flow
      if (user) {
        saveSession(user.uid, {
          sessionId: result.session_id,
          createdAt: result.created_at,
          matchScore: result.match_result.overall_score,
          atsScore: result.ats_result.overall_score,
          status: 'created',
          resumeFileName: file.name,
        }).catch(() => { /* ignore firebase errors */ })
      }
      return result
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Session creation failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }

  const fetchQuestions = async (sessionId: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getQuestions(sessionId)
      setQuestions(result)
      if (user) updateSession(user.uid, sessionId, { status: 'questions' }).catch(() => {})
      return result
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load questions'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }

  const sendAnswers = async (
    sessionId: string,
    answers: Array<{ question_id: string; answer_text: string }>
  ) => {
    setLoading(true)
    setError(null)
    try {
      const result = await submitAnswers(sessionId, answers)
      setSuggestions(result)
      if (user) updateSession(user.uid, sessionId, { status: 'suggestions' }).catch(() => {})
      return result
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to submit answers'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }

  const approveAll = async (sessionId: string, decisions: Record<string, boolean>) => {
    await approveSuggestions(sessionId, decisions)
  }

  const generate = async (sessionId: string, templateId: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await generateResume(sessionId, templateId)
      setGenerated(result)
      if (user) await updateSession(user.uid, sessionId, { status: 'generated' })
      return result
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Generation failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }

  const download = async (sessionId: string) => {
    const blob = await downloadResume(sessionId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume_${sessionId.slice(0, 8)}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    if (user) await updateSession(user.uid, sessionId, { status: 'downloaded' })
  }

  return {
    session,
    questions,
    suggestions,
    generated,
    loading,
    error,
    startSession,
    fetchQuestions,
    sendAnswers,
    approveAll,
    generate,
    download,
    setSession,
    setSuggestions,
  }
}
