import React from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export function Input({ label, error, icon, className, id, ...props }: InputProps) {
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
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-japandi-muted dark:text-gothic-muted">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-200',
            'bg-white border-japandi-border text-japandi-text placeholder:text-japandi-muted',
            'focus:border-japandi-primary focus:ring-2 focus:ring-japandi-primary/20',
            'dark:bg-gothic-card dark:border-gothic-border dark:text-gothic-text dark:placeholder:text-gothic-muted',
            'dark:focus:border-gothic-primary dark:focus:ring-gothic-primary/20',
            icon && 'pl-10',
            error && 'border-red-400 dark:border-gothic-accent',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 dark:text-gothic-accent">{error}</p>
      )}
    </div>
  )
}
