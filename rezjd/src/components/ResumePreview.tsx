import React from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { Button } from './ui/Button'
import { cn } from '../lib/utils'

interface ResumePreviewProps {
  downloadUrl: string
  sessionId: string
  onDownload: () => void
  downloading?: boolean
}

export function ResumePreview({ downloadUrl, sessionId, onDownload, downloading }: ResumePreviewProps) {
  return (
    <div className="space-y-4">
      {/* Preview frame */}
      <div className={cn(
        'rounded-2xl border overflow-hidden',
        'border-japandi-border dark:border-gothic-border',
        'bg-japandi-bg dark:bg-gothic-bg'
      )}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-japandi-border dark:border-gothic-border bg-white dark:bg-gothic-card">
          <span className="text-xs text-japandi-muted dark:text-gothic-muted font-mono">
            resume_{sessionId.slice(0, 8)}.pdf
          </span>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-japandi-muted dark:text-gothic-muted hover:text-japandi-primary dark:hover:text-gothic-primary transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Simulated PDF preview */}
        <div className="p-8 min-h-[400px] flex flex-col gap-4">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-japandi-border dark:bg-gothic-border" />
            <div className="h-3 w-32 rounded bg-japandi-border/60 dark:bg-gothic-border/60" />
            <div className="h-3 w-40 rounded bg-japandi-border/60 dark:bg-gothic-border/60" />
          </div>
          <div className="border-t border-japandi-border dark:border-gothic-border pt-4 space-y-2">
            <div className="h-4 w-24 rounded bg-japandi-primary/20 dark:bg-gothic-primary/20" />
            <div className="h-3 w-full rounded bg-japandi-border/40 dark:bg-gothic-border/40" />
            <div className="h-3 w-5/6 rounded bg-japandi-border/40 dark:bg-gothic-border/40" />
            <div className="h-3 w-4/6 rounded bg-japandi-border/40 dark:bg-gothic-border/40" />
          </div>
          <div className="border-t border-japandi-border dark:border-gothic-border pt-4 space-y-2">
            <div className="h-4 w-28 rounded bg-japandi-primary/20 dark:bg-gothic-primary/20" />
            {[1, 2].map((i) => (
              <div key={i} className="space-y-1 pl-3">
                <div className="h-3 w-40 rounded bg-japandi-border/60 dark:bg-gothic-border/60" />
                <div className="h-3 w-full rounded bg-japandi-border/30 dark:bg-gothic-border/30" />
                <div className="h-3 w-5/6 rounded bg-japandi-border/30 dark:bg-gothic-border/30" />
              </div>
            ))}
          </div>
          <div className="border-t border-japandi-border dark:border-gothic-border pt-4 space-y-2">
            <div className="h-4 w-20 rounded bg-japandi-primary/20 dark:bg-gothic-primary/20" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-5 w-16 rounded-full bg-japandi-border/50 dark:bg-gothic-border/50" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={onDownload}
        loading={downloading}
        size="lg"
        className="w-full"
        icon={<Download size={18} />}
      >
        Download PDF
      </Button>
    </div>
  )
}
