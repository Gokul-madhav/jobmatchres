import { useState, useCallback } from 'react'
import { useEmbedding } from '../hooks/useEmbedding'
import type { EmbeddingMeta } from '../hooks/useEmbedding'

// ---------------------------------------------------------------------------
// Similarity gauge
// ---------------------------------------------------------------------------

function SimilarityGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  // Color: 0=red, 0.5=yellow, 1=green via hsl
  const hue = Math.round(value * 120) // 0 → 0 (red), 1 → 120 (green)
  const color = `hsl(${hue}, 80%, 55%)`

  // SVG arc gauge
  const radius = 54
  const circumference = Math.PI * radius // half-circle
  const offset = circumference * (1 - value)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* Track */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke="#374151"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Fill — animated */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.6s ease' }}
        />
        {/* Value label */}
        <text x="70" y="68" textAnchor="middle" fontSize="20" fontWeight="bold" fill="white">
          {value.toFixed(3)}
        </text>
      </svg>
      <div className="flex justify-between w-36 text-xs text-gray-500">
        <span>0.0</span>
        <span>1.0</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Embedding heatmap strip (384 cells)
// ---------------------------------------------------------------------------

function EmbeddingHeatmap({ vector, label }: { vector: number[]; label: string }) {
  const max = Math.max(...vector.map(Math.abs), 0.001)

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <div
        className="flex flex-wrap gap-px rounded overflow-hidden"
        title="384-dim embedding heatmap"
      >
        {vector.map((v, i) => {
          const intensity = Math.abs(v) / max
          const positive = v >= 0
          // positive → blue tones, negative → orange tones
          const bg = positive
            ? `rgba(99,102,241,${0.15 + intensity * 0.85})`
            : `rgba(249,115,22,${0.15 + intensity * 0.85})`
          return (
            <div
              key={i}
              title={`dim ${i}: ${v.toFixed(4)}`}
              style={{ width: 3, height: 10, backgroundColor: bg }}
            />
          )
        })}
      </div>
      <p className="text-xs text-gray-600">
        <span className="inline-block w-2 h-2 rounded-sm bg-indigo-500 mr-1" />positive
        <span className="inline-block w-2 h-2 rounded-sm bg-orange-500 ml-3 mr-1" />negative
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cache status badge
// ---------------------------------------------------------------------------

function CacheBadge({ meta, label }: { meta: EmbeddingMeta; label: string }) {
  const hit = meta.cache_hit
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-400">{label}:</span>
      <span
        className={`px-2 py-0.5 rounded-full font-semibold ${
          hit
            ? 'bg-green-900 text-green-300 border border-green-700'
            : 'bg-amber-900 text-amber-300 border border-amber-700'
        }`}
      >
        {hit ? 'Cache HIT — served from Redis' : 'Cache MISS — model invoked'}
      </span>
      <span className="text-gray-500">{meta.latency_ms} ms</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export default function EmbeddingCard() {
  const [open, setOpen] = useState(true)
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const { state, compute, reset } = useEmbedding()

  const canCompute = textA.trim().length > 0 && textB.trim().length > 0 && state.status !== 'loading'

  const handleCompute = useCallback(() => {
    if (canCompute) compute(textA, textB)
  }, [canCompute, compute, textA, textB])

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800 transition-colors"
      >
        <span className="font-semibold text-white text-sm tracking-wide">
          EPIC 4 — Embedding Engine
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-gray-700 pt-4">
          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Text A</label>
              <textarea
                value={textA}
                onChange={(e) => setTextA(e.target.value)}
                placeholder="Enter first text…"
                rows={3}
                className="w-full resize-y rounded-lg border border-gray-600 bg-gray-800 text-gray-100 text-sm px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Text B</label>
              <textarea
                value={textB}
                onChange={(e) => setTextB(e.target.value)}
                placeholder="Enter second text…"
                rows={3}
                className="w-full resize-y rounded-lg border border-gray-600 bg-gray-800 text-gray-100 text-sm px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCompute}
              disabled={!canCompute}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
            >
              {state.status === 'loading' ? 'Computing…' : 'Compute Similarity'}
            </button>
            {state.status !== 'idle' && (
              <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-300 underline">
                Reset
              </button>
            )}
          </div>

          {/* Error */}
          {state.status === 'error' && (
            <div className="flex items-center gap-3 rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
              <span>✗</span>
              <span>{state.errorMessage}</span>
            </div>
          )}

          {/* Results */}
          {state.status === 'success' && state.data && (
            <div className="space-y-5">
              {/* Gauge + self-similarity badge */}
              <div className="flex items-start gap-8">
                <div className="space-y-1 text-center">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                    Cosine Similarity
                  </p>
                  <SimilarityGauge value={state.data.similarity} />
                  {state.latencyMs !== null && (
                    <p className="text-xs text-gray-600">{state.latencyMs} ms total</p>
                  )}
                </div>

                <div className="space-y-3 flex-1">
                  {/* Self-similarity sanity check */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Self-similarity sanity (A,A):</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        state.data.self_similarity_pass
                          ? 'bg-green-900 text-green-300 border border-green-700'
                          : 'bg-red-900 text-red-300 border border-red-700'
                      }`}
                    >
                      {state.data.self_similarity_pass ? '✓ PASS' : '✗ FAIL'}{' '}
                      <span className="font-normal opacity-80">
                        ({state.data.self_similarity_a.toFixed(6)})
                      </span>
                    </span>
                  </div>

                  {/* Cache status */}
                  <div className="space-y-1.5">
                    <CacheBadge meta={state.data.embedding_a} label="Text A" />
                    <CacheBadge meta={state.data.embedding_b} label="Text B" />
                  </div>
                </div>
              </div>

              {/* Heatmaps */}
              <div className="space-y-3">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                  Embedding Vectors (384-dim)
                </p>
                <EmbeddingHeatmap vector={state.data.embedding_a.vector} label="Text A" />
                <EmbeddingHeatmap vector={state.data.embedding_b.vector} label="Text B" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
