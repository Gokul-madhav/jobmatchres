/**
 * useResumeGeneration — EPIC 10 hook for PDF resume generation.
 *
 * Calls POST /api/v1/sessions/{sessionId}/generate and tracks state.
 */
import { useState, useCallback } from 'react'
import type { SuggestionItem } from './useSessionManager'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error'

export interface GenerationState {
  status: GenerationStatus
  downloadUrl: string | null
  expiresAt: string | null
  approvedSuggestionsCount: number
  templateId: string
  errorMessage: string
  latencyMs: number | null
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

function initial(): GenerationState {
  return {
    status: 'idle',
    downloadUrl: null,
    expiresAt: null,
    approvedSuggestionsCount: 0,
    templateId: 'clean',
    errorMessage: '',
    latencyMs: null,
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useResumeGeneration() {
  const [state, setState] = useState<GenerationState>(initial())

  /**
   * Call POST /api/v1/sessions/{sessionId}/generate.
   * Returns the download URL on success, or null on failure.
   *
   * Note: approvedSuggestions is accepted for UI display purposes;
   * the backend derives approved suggestions from the session itself.
   */
  const generate = useCallback(
    async (
      sessionId: string,
      templateId: string,
      approvedSuggestions: SuggestionItem[],
    ): Promise<string | null> => {
      setState({
        status: 'loading',
        downloadUrl: null,
        expiresAt: null,
        approvedSuggestionsCount: approvedSuggestions.length,
        templateId,
        errorMessage: '',
        latencyMs: null,
      })

      const start = performance.now()

      try {
        const res = await fetch(`/api/v1/sessions/${sessionId}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template_id: templateId }),
        })

        const latencyMs = Math.round(performance.now() - start)
        let json: Record<string, unknown> = {}
        try {
          const text = await res.text()
          json = text ? JSON.parse(text) : {}
        } catch {
          json = {}
        }

        if (!res.ok) {
          const errorMessage = (json.message as string) ?? `HTTP ${res.status}`
          setState((prev) => ({
            ...prev,
            status: 'error',
            errorMessage,
            latencyMs,
          }))
          return null
        }

        const downloadUrl = (json.download_url as string) ?? null
        const expiresAt = (json.expires_at as string) ?? null
        const approvedSuggestionsCount =
          (json.approved_suggestions_count as number) ?? approvedSuggestions.length

        setState({
          status: 'success',
          downloadUrl,
          expiresAt,
          approvedSuggestionsCount,
          templateId,
          errorMessage: '',
          latencyMs,
        })

        return downloadUrl
      } catch (err) {
        const latencyMs = Math.round(performance.now() - start)
        const errorMessage =
          err instanceof Error ? err.message : 'Network error'
        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage,
          latencyMs,
        }))
        return null
      }
    },
    [],
  )

  const reset = useCallback(() => setState(initial()), [])

  return { state, generate, reset }
}
