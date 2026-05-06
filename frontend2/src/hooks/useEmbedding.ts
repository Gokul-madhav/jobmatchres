import { useState, useCallback } from 'react'

export interface EmbeddingMeta {
  vector: number[]
  cache_hit: boolean
  latency_ms: number
}

export interface EmbedResult {
  similarity: number
  self_similarity_a: number
  self_similarity_pass: boolean
  embedding_a: EmbeddingMeta
  embedding_b: EmbeddingMeta
}

export type EmbedStatus = 'idle' | 'loading' | 'success' | 'error'

export interface EmbedState {
  status: EmbedStatus
  data: EmbedResult | null
  errorMessage: string
  latencyMs: number | null
}

const initial = (): EmbedState => ({
  status: 'idle',
  data: null,
  errorMessage: '',
  latencyMs: null,
})

export function useEmbedding() {
  const [state, setState] = useState<EmbedState>(initial())

  const compute = useCallback(async (textA: string, textB: string) => {
    setState({ status: 'loading', data: null, errorMessage: '', latencyMs: null })
    const start = performance.now()
    try {
      const res = await fetch('/api/v1/dev/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text_a: textA, text_b: textB }),
      })
      const latencyMs = Math.round(performance.now() - start)
      const json = await res.json()
      if (!res.ok) {
        setState({ status: 'error', data: null, errorMessage: json.message ?? `HTTP ${res.status}`, latencyMs })
      } else {
        setState({ status: 'success', data: json as EmbedResult, errorMessage: '', latencyMs })
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start)
      setState({ status: 'error', data: null, errorMessage: err instanceof Error ? err.message : 'Network error', latencyMs })
    }
  }, [])

  const reset = useCallback(() => setState(initial()), [])

  return { state, compute, reset }
}
