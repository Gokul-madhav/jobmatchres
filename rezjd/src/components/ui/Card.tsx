import React from 'react'
import { cn } from '../../lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className, glow = false, hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border transition-all duration-300',
        // Light
        'bg-white border-japandi-border shadow-japandi',
        // Dark
        'dark:bg-gothic-card dark:border-gothic-border dark:shadow-gothic-card',
        // Glassmorphism in dark
        'dark:backdrop-blur-sm',
        // Glow
        glow && 'dark:shadow-gothic-glow dark:animate-pulse-glow',
        // Hover
        hover && 'cursor-pointer hover:shadow-japandi-md dark:hover:shadow-gothic-glow hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 pt-6 pb-4', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 pb-6', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn(
      'text-lg font-semibold text-japandi-text dark:text-gothic-text dark:font-serif',
      className
    )}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-sm text-japandi-muted dark:text-gothic-muted mt-1', className)}>
      {children}
    </p>
  )
}
