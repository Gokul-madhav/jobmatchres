import React from 'react'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../lib/utils'
import { Badge } from './ui/Badge'
import type { Suggestion } from '../services/api'

interface SuggestionCardProps {
  suggestion: Suggestion
  onDecision: (id: string, approved: boolean) => void
}

export function SuggestionCard({ suggestion, onDecision }: SuggestionCardProps) {
  const [expanded, setExpanded] = React.useState(false)
  const approved = suggestion.approved

  return (
    <div className={cn(
      'rounded-2xl border transition-all duration-300',
      'bg-white border-japandi-border',
      'dark:bg-gothic-card dark:border-gothic-border',
      approved === true && 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/10',
      approved === false && 'border-red-200 bg-red-50/50 dark:border-gothic-accent/40 dark:bg-gothic-accent/5 opacity-60',
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary">
                {suggestion.target_section}
              </Badge>
              {approved === true && <Badge variant="success">Accepted</Badge>}
              {approved === false && <Badge variant="danger">Rejected</Badge>}
            </div>
            <p className="text-sm font-medium text-japandi-text dark:text-gothic-text">
              {suggestion.suggested_change}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onDecision(suggestion.id, true)}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                approved === true
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40'
              )}
              title="Accept"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => onDecision(suggestion.id, false)}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                approved === false
                  ? 'bg-red-500 text-white dark:bg-gothic-accent'
                  : 'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-gothic-accent/10 dark:text-gothic-accent dark:hover:bg-gothic-accent/20'
              )}
              title="Reject"
            >
              <X size={14} />
            </button>
            {suggestion.rationale && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-japandi-muted dark:text-gothic-muted hover:bg-japandi-bg dark:hover:bg-white/5 transition-colors"
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        </div>

        {expanded && suggestion.rationale && (
          <div className="mt-3 pt-3 border-t border-japandi-border dark:border-gothic-border">
            <p className="text-xs text-japandi-muted dark:text-gothic-muted">
              <span className="font-medium">Why: </span>{suggestion.rationale}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
