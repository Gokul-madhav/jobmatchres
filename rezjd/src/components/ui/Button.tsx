import React from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
}

const variants: Record<Variant, string> = {
  primary: [
    'bg-japandi-primary text-white hover:bg-opacity-90',
    'dark:bg-gothic-primary dark:hover:bg-opacity-90',
    'dark:shadow-[0_0_20px_rgba(127,90,240,0.3)]',
  ].join(' '),
  secondary: [
    'bg-white border border-japandi-border text-japandi-text hover:bg-japandi-bg',
    'dark:bg-gothic-card dark:border-gothic-border dark:text-gothic-text dark:hover:bg-white/5',
  ].join(' '),
  ghost: [
    'bg-transparent text-japandi-text hover:bg-japandi-bg',
    'dark:text-gothic-text dark:hover:bg-white/5',
  ].join(' '),
  danger: [
    'bg-red-500 text-white hover:bg-red-600',
    'dark:bg-gothic-accent dark:hover:bg-opacity-90',
  ].join(' '),
  accent: [
    'bg-japandi-accent text-white hover:bg-opacity-90',
    'dark:bg-gothic-accent dark:hover:bg-opacity-90',
    'dark:shadow-[0_0_20px_rgba(233,69,96,0.3)]',
  ].join(' '),
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-2xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium',
        'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
        'focus:ring-japandi-primary dark:focus:ring-gothic-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}
