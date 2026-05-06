import React from 'react'
import { CheckCircle, Circle, Loader2, XCircle } from 'lucide-react'
import { cn } from '../lib/utils'

export type StepStatus = 'pending' | 'running' | 'done' | 'error'

export interface Step {
  id: string
  label: string
  description?: string
  status: StepStatus
}

interface ProcessStepperProps {
  steps: Step[]
}

const statusIcon: Record<StepStatus, React.ReactNode> = {
  pending: <Circle size={20} className="text-japandi-border dark:text-gothic-border" />,
  running: <Loader2 size={20} className="animate-spin text-japandi-primary dark:text-gothic-primary" />,
  done: <CheckCircle size={20} className="text-emerald-500" />,
  error: <XCircle size={20} className="text-red-500 dark:text-gothic-accent" />,
}

export function ProcessStepper({ steps }: ProcessStepperProps) {
  return (
    <div className="w-full space-y-3">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-start gap-4">
          {/* Icon + connector */}
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
              step.status === 'done' && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
              step.status === 'running' && 'border-japandi-primary bg-japandi-primary/10 dark:border-gothic-primary dark:bg-gothic-primary/20',
              step.status === 'error' && 'border-red-400 bg-red-50 dark:border-gothic-accent dark:bg-gothic-accent/10',
              step.status === 'pending' && 'border-japandi-border dark:border-gothic-border bg-transparent',
            )}>
              {statusIcon[step.status]}
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'w-0.5 h-8 mt-1 transition-all duration-500',
                step.status === 'done' ? 'bg-emerald-400' : 'bg-japandi-border dark:bg-gothic-border'
              )} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pt-1.5 pb-4">
            <p className={cn(
              'font-medium text-sm transition-colors duration-200',
              step.status === 'running' && 'text-japandi-primary dark:text-gothic-primary',
              step.status === 'done' && 'text-japandi-text dark:text-gothic-text',
              step.status === 'error' && 'text-red-500 dark:text-gothic-accent',
              step.status === 'pending' && 'text-japandi-muted dark:text-gothic-muted',
            )}>
              {step.label}
            </p>
            {step.description && (
              <p className="text-xs text-japandi-muted dark:text-gothic-muted mt-0.5">
                {step.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
