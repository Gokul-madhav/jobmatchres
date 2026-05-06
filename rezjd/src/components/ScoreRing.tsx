import React from 'react'
import { cn } from '../lib/utils'

interface ScoreRingProps {
  score: number // 0–1
  label: string
  size?: number
  className?: string
}

export function ScoreRing({ score, label, size = 120, className }: ScoreRingProps) {
  const pct = Math.round(score * 100)
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  const color =
    pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
  const darkColor =
    pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#E94560'

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="score-ring">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-japandi-border dark:text-gothic-border"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            stroke="var(--ring-color)"
            style={
              {
                '--ring-color': color,
                transition: 'stroke-dashoffset 0.8s ease-out',
              } as React.CSSProperties
            }
            className="dark:[--ring-color:var(--ring-dark)]"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-japandi-text dark:text-gothic-text">
            {pct}
          </span>
          <span className="text-xs text-japandi-muted dark:text-gothic-muted">/ 100</span>
        </div>
      </div>
      <p className="text-sm font-medium text-japandi-text dark:text-gothic-text">{label}</p>
    </div>
  )
}
