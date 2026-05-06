import React from 'react'
import { cn } from '../../lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'accent'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-japandi-bg text-japandi-text dark:bg-gothic-border dark:text-gothic-text',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-gothic-accent',
  primary: 'bg-japandi-primary/10 text-japandi-primary dark:bg-gothic-primary/20 dark:text-gothic-primary',
  accent: 'bg-japandi-accent/10 text-japandi-accent dark:bg-gothic-accent/20 dark:text-gothic-accent',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        'transition-colors duration-200',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
