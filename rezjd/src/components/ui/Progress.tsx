import React from 'react'
import { cn } from '../../lib/utils'

interface ProgressProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
}

export function Progress({ value, max = 100, className, showLabel = false }: ProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="w-full">
      <div
        className={cn(
          'h-2 rounded-full overflow-hidden',
          'bg-japandi-border dark:bg-gothic-border',
          className
        )}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out bg-japandi-primary dark:bg-gothic-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-japandi-muted dark:text-gothic-muted mt-1 text-right">
          {Math.round(percent)}%
        </p>
      )}
    </div>
  )
}
