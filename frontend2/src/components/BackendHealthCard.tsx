import { useState } from 'react'
import type { CheckResult } from '../hooks/useHealthCheck'
import JsonViewer from './JsonViewer'

interface Props {
  ping: CheckResult
  redis: CheckResult
  onPing: () => void
  onRedis: () => void
}

export default function BackendHealthCard({ ping, redis, onPing, onRedis }: Props) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      {/* Card header — collapsible toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800 transition-colors"
      >
        <span className="font-semibold text-white text-sm tracking-wide">
          EPIC 1 — Backend Health
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-6 border-t border-gray-700">
          {/* Ping API */}
          <section className="pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onPing}
                disabled={ping.status === 'loading'}
                className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {ping.status === 'loading' ? 'Pinging…' : 'Ping API'}
              </button>

              {ping.status === 'success' && (
                <span className="flex items-center gap-1.5 text-sm text-green-400 font-medium">
                  <span className="text-green-400">✓</span>
                  <span>{ping.latencyMs} ms</span>
                </span>
              )}
              {ping.status === 'error' && (
                <span className="flex items-center gap-1.5 text-sm text-red-400 font-medium">
                  <span>✗</span>
                  <span>{ping.errorMessage}</span>
                </span>
              )}
            </div>

            {ping.data !== null && (
              <JsonViewer label="GET /api/v1/health" data={ping.data} />
            )}
          </section>

          {/* Redis Status */}
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onRedis}
                disabled={redis.status === 'loading'}
                className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {redis.status === 'loading' ? 'Checking…' : 'Redis Status'}
              </button>

              <RedisChip result={redis} />
            </div>

            {redis.data !== null && (
              <JsonViewer label="GET /api/v1/health/redis" data={redis.data} />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function RedisChip({ result }: { result: CheckResult }) {
  if (result.status === 'idle') return null
  if (result.status === 'loading') return <span className="text-gray-400 text-sm">…</span>

  const redisData = result.data as { status?: string } | null
  const connected =
    result.status === 'success' && redisData?.status === 'connected'

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
        connected
          ? 'bg-green-900 text-green-300 border border-green-700'
          : 'bg-red-900 text-red-300 border border-red-700'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
      {connected ? 'Connected' : 'Unreachable'}
      {result.latencyMs !== null && (
        <span className="opacity-70 font-normal">{result.latencyMs} ms</span>
      )}
    </span>
  )
}
