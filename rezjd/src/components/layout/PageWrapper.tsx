import React from 'react'
import { cn } from '../../lib/utils'

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  narrow?: boolean
}

export function PageWrapper({ children, className, narrow = false }: PageWrapperProps) {
  return (
    <main
      className={cn(
        'min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-10',
        'bg-japandi-bg dark:bg-gothic-bg transition-colors duration-300',
        className
      )}
    >
      <div className={cn('mx-auto w-full', narrow ? 'max-w-2xl' : 'max-w-6xl')}>
        {children}
      </div>
    </main>
  )
}
