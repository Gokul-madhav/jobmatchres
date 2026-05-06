import React, { useState } from 'react'
import { Link2, FileText, Loader2 } from 'lucide-react'
import { Textarea } from './ui/Textarea'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { cn } from '../lib/utils'
import { scrapeJD } from '../services/api'
import toast from 'react-hot-toast'

interface JDInputProps {
  value: string
  onChange: (v: string) => void
}

export function JDInput({ value, onChange }: JDInputProps) {
  const [tab, setTab] = useState<'text' | 'url'>('text')
  const [url, setUrl] = useState('')
  const [scraping, setScraping] = useState(false)

  const handleScrape = async () => {
    if (!url.trim()) return
    setScraping(true)
    try {
      const text = await scrapeJD(url)
      if (text) {
        onChange(text)
        setTab('text')
        toast.success('Job description loaded')
      } else {
        toast.error('Could not scrape URL — please paste the JD manually')
        setTab('text')
      }
    } catch {
      toast.error('Scraping failed — paste the JD manually')
      setTab('text')
    } finally {
      setScraping(false)
    }
  }

  return (
    <div className="w-full space-y-3">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-japandi-bg dark:bg-gothic-border w-fit">
        {(['text', 'url'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
              tab === t
                ? 'bg-white text-japandi-primary shadow-sm dark:bg-gothic-card dark:text-gothic-primary'
                : 'text-japandi-muted dark:text-gothic-muted hover:text-japandi-text dark:hover:text-gothic-text'
            )}
          >
            {t === 'text' ? <FileText size={14} /> : <Link2 size={14} />}
            {t === 'text' ? 'Paste Text' : 'From URL'}
          </button>
        ))}
      </div>

      {tab === 'text' ? (
        <Textarea
          placeholder="Paste the full job description here…&#10;&#10;We're looking for a Senior Software Engineer with 5+ years of experience in Python, React, and cloud infrastructure…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
        />
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="https://jobs.example.com/senior-engineer"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            icon={<Link2 size={16} />}
          />
          <Button
            onClick={handleScrape}
            loading={scraping}
            disabled={!url.trim()}
            icon={scraping ? <Loader2 size={14} className="animate-spin" /> : undefined}
          >
            Fetch
          </Button>
        </div>
      )}

      {value && (
        <p className="text-xs text-japandi-muted dark:text-gothic-muted">
          {value.length} characters · {value.split(/\s+/).filter(Boolean).length} words
        </p>
      )}
    </div>
  )
}
