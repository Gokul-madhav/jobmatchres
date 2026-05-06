import React from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { cn } from '../lib/utils'

interface SkillBadgeListProps {
  matched: string[]
  missing: string[]
}

export function SkillBadgeList({ matched, missing }: SkillBadgeListProps) {
  return (
    <div className="space-y-4">
      {matched.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-emerald-500" />
            <span className="text-sm font-medium text-japandi-text dark:text-gothic-text">
              Matched Skills ({matched.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {matched.map((skill) => (
              <span
                key={skill}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium',
                  'bg-emerald-50 text-emerald-700 border border-emerald-200',
                  'dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                )}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={16} className="text-red-500 dark:text-gothic-accent" />
            <span className="text-sm font-medium text-japandi-text dark:text-gothic-text">
              Missing Skills ({missing.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {missing.map((skill) => (
              <span
                key={skill}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium',
                  'bg-red-50 text-red-600 border border-red-200',
                  'dark:bg-gothic-accent/10 dark:text-gothic-accent dark:border-gothic-accent/30'
                )}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
