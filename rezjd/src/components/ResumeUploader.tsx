import React, { useRef, useState } from 'react'
import { Upload, FileText, X, CheckCircle } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/Button'

interface ResumeUploaderProps {
  onFile: (file: File) => void
  file?: File | null
  loading?: boolean
  accept?: string
}

export function ResumeUploader({
  onFile,
  file,
  loading = false,
  accept = '.pdf,.docx',
}: ResumeUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const validate = (f: File): boolean => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'docx'].includes(ext || '')) {
      setError('Only PDF and DOCX files are supported')
      return false
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB')
      return false
    }
    setError('')
    return true
  }

  const handleFile = (f: File) => {
    if (validate(f)) onFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer',
          'flex flex-col items-center justify-center gap-3 p-10 text-center',
          dragOver
            ? 'border-japandi-primary bg-japandi-primary/5 dark:border-gothic-primary dark:bg-gothic-primary/10'
            : 'border-japandi-border dark:border-gothic-border hover:border-japandi-primary dark:hover:border-gothic-primary',
          file && 'cursor-default'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />

        {file ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <CheckCircle size={28} className="text-emerald-500" />
            </div>
            <div>
              <p className="font-medium text-japandi-text dark:text-gothic-text">{file.name}</p>
              <p className="text-sm text-japandi-muted dark:text-gothic-muted mt-0.5">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<X size={14} />}
              onClick={(e) => {
                e.stopPropagation()
                if (inputRef.current) inputRef.current.value = ''
                onFile(null as unknown as File)
              }}
            >
              Remove
            </Button>
          </>
        ) : (
          <>
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center',
              'bg-japandi-primary/10 dark:bg-gothic-primary/20'
            )}>
              {loading ? (
                <svg className="animate-spin h-7 w-7 text-japandi-primary dark:text-gothic-primary" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <Upload size={28} className="text-japandi-primary dark:text-gothic-primary" />
              )}
            </div>
            <div>
              <p className="font-medium text-japandi-text dark:text-gothic-text">
                {loading ? 'Uploading…' : 'Drop your resume here'}
              </p>
              <p className="text-sm text-japandi-muted dark:text-gothic-muted mt-0.5">
                PDF or DOCX · Max 5MB
              </p>
            </div>
            {!loading && (
              <Button variant="secondary" size="sm" icon={<FileText size={14} />}>
                Browse Files
              </Button>
            )}
          </>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500 dark:text-gothic-accent">{error}</p>
      )}
    </div>
  )
}
