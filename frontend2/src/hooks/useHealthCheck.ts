import { useState, useCallback } from 'react'

export type CheckStatus = 'idle' | 'loading' | 'success' | 'error'

export interface CheckResult {
  status: CheckStatus
  data: unknown
  errorMessage: string
  latencyMs: number | null
}

const initialResult = (): CheckResult => ({
  status: 'idle',
  data: null,
  errorMessage: '',
  latencyMs: null,
})

async function runCheck(url: string): Promise<CheckResult> {
  const start = performance.now()
  try {
    const res = await fetch(url)
    const latencyMs = Math.round(performance.now() - start)

    // Guard against empty bodies (proxy errors, 502/504, etc.)
    const text = await res.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      // non-JSON body — treat as error
      return {
        status: 'error',
        data: null,
        errorMessage: `HTTP ${res.status} — backend unreachable`,
        latencyMs,
      }
    }

    if (!res.ok) {
      return { status: 'error', data, errorMessage: `HTTP ${res.status}`, latencyMs }
    }
    return { status: 'success', data, errorMessage: '', latencyMs }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start)
    return {
      status: 'error',
      data: null,
      errorMessage: err instanceof Error ? err.message : 'Network error',
      latencyMs,
    }
  }
}

export function useHealthCheck() {
  const [ping, setPing] = useState<CheckResult>(initialResult())
  const [redis, setRedis] = useState<CheckResult>(initialResult())

  const checkPing = useCallback(async () => {
    setPing((p) => ({ ...p, status: 'loading' }))
    const result = await runCheck('/api/v1/health')
    setPing(result)
  }, [])

  const checkRedis = useCallback(async () => {
    setRedis((p) => ({ ...p, status: 'loading' }))
    const result = await runCheck('/api/v1/health/redis')
    setRedis(result)
  }, [])

  const checkAll = useCallback(() => {
    checkPing()
    checkRedis()
  }, [checkPing, checkRedis])

  return { ping, redis, checkPing, checkRedis, checkAll }
}
