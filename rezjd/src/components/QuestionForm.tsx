import React from 'react'
import { MessageSquare } from 'lucide-react'
import { Textarea } from './ui/Textarea'
import { Badge } from './ui/Badge'
import type { Question } from '../services/api'

interface QuestionFormProps {
  questions: Question[]
  answers: Record<string, string>
  onChange: (id: string, value: string) => void
}

export function QuestionForm({ questions, answers, onChange }: QuestionFormProps) {
  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={q.id} className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-japandi-primary/10 dark:bg-gothic-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageSquare size={14} className="text-japandi-primary dark:text-gothic-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-japandi-muted dark:text-gothic-muted">
                  Q{i + 1}
                </span>
                {q.target_gap && (
                  <Badge variant="primary">{q.target_gap}</Badge>
                )}
                {q.is_fallback && (
                  <Badge variant="warning">fallback</Badge>
                )}
              </div>
              <p className="text-sm font-medium text-japandi-text dark:text-gothic-text mb-2">
                {q.text}
              </p>
              <Textarea
                placeholder="Your answer…"
                value={answers[q.id] || ''}
                onChange={(e) => onChange(q.id, e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
