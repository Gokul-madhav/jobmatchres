import React from 'react'
import { cn } from '../../lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-japandi-text dark:text-gothic-text mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 resize-none',
          'bg-white border-japandi-border text-japandi-text placeholder:text-japandi-muted',
          'focus:border-japandi-primary focus:ring-2 focus:ring-japandi-primary/20',
          'dark:bg-gothic-card dark:border-gothic-border dark:text-gothic-text dark:placeholder:text-gothic-muted',
          'dark:focus:border-gothic-primary dark:focus:ring-gothic-primary/20',
          error && 'border-red-400 dark:border-gothic-accent',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500 dark:text-gothic-accent">{error}</p>
      )}
    </div>
  )
}
