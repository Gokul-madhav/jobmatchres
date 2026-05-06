import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Upload, FileText, CheckCircle } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../components/ui/Card'
import { ResumeUploader } from '../components/ResumeUploader'
import { JDInput } from '../components/JDInput'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../hooks/useAuth'
import { getResumes, type StoredResume } from '../lib/firebaseDb'
import { formatDate } from '../lib/utils'
import { cn } from '../lib/utils'

type Step = 1 | 2

export default function JobMatch() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [resumes, setResumes] = useState<StoredResume[]>([])
  const [loadingResumes, setLoadingResumes] = useState(true)
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [uploadMode, setUploadMode] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [jdText, setJdText] = useState('')

  useEffect(() => {
    if (!user) return
    getResumes(user.uid)
      .then(setResumes)
      .catch(() => setResumes([]))
      .finally(() => setLoadingResumes(false))
  }, [user])

  const canGoStep2 = uploadMode ? !!file : !!selectedResumeId
  const canStart = canGoStep2 && jdText.trim().length >= 50

  const handleStart = () => {
    if (!canStart) return
    sessionStorage.setItem('rezjd_jd_text', jdText)
    if (file) {
      ;(window as unknown as Record<string, unknown>).__rezjd_file = file
      sessionStorage.setItem('rezjd_file_name', file.name)
    }
    navigate('/process')
  }

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto space-y-8 animate-slide-up">
        <div>
          <h1 className="text-3xl font-semibold text-japandi-text dark:text-gothic-text dark:font-serif">
            Job Match Analysis
          </h1>
          <p className="text-japandi-muted dark:text-gothic-muted mt-2">
            See how well your resume matches a specific job description.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          {([1, 2] as Step[]).map((s) => (
            <React.Fragment key={s}>
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                step === s
                  ? 'bg-japandi-primary text-white dark:bg-gothic-primary'
                  : step > s
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                  : 'bg-japandi-bg text-japandi-muted dark:bg-gothic-border dark:text-gothic-muted'
              )}>
                {step > s ? <CheckCircle size={14} /> : <span>{s}</span>}
                {s === 1 ? 'Select Resume' : 'Job Description'}
              </div>
              {s < 2 && <div className="flex-1 h-px bg-japandi-border dark:bg-gothic-border" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1 — Resume selection */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Resume</CardTitle>
              <CardDescription>Select a saved resume or upload a new one</CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setUploadMode(false)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    !uploadMode
                      ? 'bg-japandi-primary/10 text-japandi-primary dark:bg-gothic-primary/20 dark:text-gothic-primary'
                      : 'text-japandi-muted dark:text-gothic-muted hover:bg-japandi-bg dark:hover:bg-white/5'
                  )}
                >
                  <FileText size={14} /> Saved Resumes
                </button>
                <button
                  onClick={() => setUploadMode(true)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    uploadMode
                      ? 'bg-japandi-primary/10 text-japandi-primary dark:bg-gothic-primary/20 dark:text-gothic-primary'
                      : 'text-japandi-muted dark:text-gothic-muted hover:bg-japandi-bg dark:hover:bg-white/5'
                  )}
                >
                  <Upload size={14} /> Upload New
                </button>
              </div>

              {uploadMode ? (
                <ResumeUploader onFile={(f) => setFile(f)} file={file} />
              ) : loadingResumes ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : resumes.length === 0 ? (
                <div className="text-center py-8 text-japandi-muted dark:text-gothic-muted text-sm">
                  No saved resumes. Upload one above.
                </div>
              ) : (
                <div className="space-y-2">
                  {resumes.map((r) => (
                    <div
                      key={r.resumeId}
                      onClick={() => setSelectedResumeId(r.resumeId)}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all',
                        selectedResumeId === r.resumeId
                          ? 'border-japandi-primary bg-japandi-primary/5 dark:border-gothic-primary dark:bg-gothic-primary/10'
                          : 'border-japandi-border dark:border-gothic-border hover:border-japandi-primary/50 dark:hover:border-gothic-primary/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-japandi-muted dark:text-gothic-muted" />
                        <div>
                          <p className="text-sm font-medium text-japandi-text dark:text-gothic-text">{r.fileName}</p>
                          <p className="text-xs text-japandi-muted dark:text-gothic-muted">{formatDate(r.uploadedAt)}</p>
                        </div>
                      </div>
                      {selectedResumeId === r.resumeId && (
                        <CheckCircle size={16} className="text-japandi-primary dark:text-gothic-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={() => setStep(2)}
                disabled={!canGoStep2}
                icon={<ArrowRight size={16} />}
                className="w-full"
              >
                Next: Job Description
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Step 2 — JD input */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
              <CardDescription>Paste the full JD or fetch from a URL</CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              <JDInput value={jdText} onChange={setJdText} />
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button
                  onClick={handleStart}
                  disabled={!canStart}
                  icon={<ArrowRight size={16} />}
                  className="flex-1"
                >
                  Analyze Match
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </PageWrapper>
  )
}
