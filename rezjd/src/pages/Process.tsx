import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../components/ui/Card'
import { ProcessStepper, type StepStatus } from '../components/ProcessStepper'
import { Button } from '../components/ui/Button'
import { useSession } from '../hooks/useSession'
import { sleep } from '../lib/utils'

const STEP_DEFS = [
  { id: 'resume', label: 'Parsing Resume', description: 'Extracting skills, experience, and education' },
  { id: 'jd', label: 'Parsing Job Description', description: 'Identifying required skills and qualifications' },
  { id: 'match', label: 'Computing Match Score', description: 'Semantic + keyword similarity analysis' },
  { id: 'ats', label: 'ATS Score Analysis', description: 'Checking format, sections, and keywords' },
  { id: 'gaps', label: 'Detecting Gaps', description: 'Finding missing skills and experience' },
  { id: 'done', label: 'Pipeline Complete', description: 'Ready to review results' },
]

export default function Process() {
  const navigate = useNavigate()
  const { startSession } = useSession()
  const [steps, setSteps] = useState(STEP_DEFS.map((s) => ({ ...s, status: 'pending' as StepStatus })))
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const ran = useRef(false)

  const setStatus = (id: string, status: StepStatus) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
  }

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const file = (window as unknown as Record<string, unknown>).__rezjd_file as File | undefined
    const jdText = sessionStorage.getItem('rezjd_jd_text') || ''

    if (!file || !jdText) {
      setError('Missing resume or job description. Please go back and try again.')
      return
    }

    const run = async () => {
      try {
        // Step 1 & 2 animate while API call starts
        setStatus('resume', 'running')
        await sleep(400)
        setStatus('jd', 'running')

        // Fire the real API call — it handles all steps server-side
        const sessionPromise = startSession(file, jdText)

        // Continue animating remaining steps with delays
        await sleep(600)
        setStatus('resume', 'done')
        setStatus('jd', 'done')
        setStatus('match', 'running')
        await sleep(800)
        setStatus('match', 'done')
        setStatus('ats', 'running')
        await sleep(800)
        setStatus('ats', 'done')
        setStatus('gaps', 'running')
        await sleep(600)
        setStatus('gaps', 'done')
        setStatus('done', 'running')

        // Wait for the real API call to finish
        const session = await sessionPromise

        setStatus('done', 'done')
        setDone(true)

        // Store session data for downstream pages
        sessionStorage.setItem('rezjd_session_id', session.session_id)
        sessionStorage.setItem('rezjd_session', JSON.stringify(session))

        await sleep(700)
        navigate('/results')
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Pipeline failed'
        setError(msg)
        setSteps((prev) => prev.map((s) =>
          s.status === 'running' || s.status === 'pending' ? { ...s, status: 'error' } : s
        ))
      }
    }

    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageWrapper narrow className="flex items-center justify-center">
      <div className="w-full max-w-lg space-y-6 animate-slide-up">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-japandi-text dark:text-gothic-text dark:font-serif">
            {done ? 'Analysis Complete!' : 'Analyzing Your Resume…'}
          </h1>
          <p className="text-japandi-muted dark:text-gothic-muted mt-2 text-sm">
            {done
              ? 'Redirecting to results…'
              : 'First run takes 30–90 seconds (AI model warm-up). Subsequent runs are faster.'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline Progress</CardTitle>
            <CardDescription>Running AI analysis on your resume and job description</CardDescription>
          </CardHeader>
          <CardBody>
            <ProcessStepper steps={steps} />
          </CardBody>
        </Card>

        {error && (
          <>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-gothic-accent/10 border border-red-200 dark:border-gothic-accent/30">
              <AlertCircle size={18} className="text-red-500 dark:text-gothic-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-gothic-accent">Analysis Failed</p>
                <p className="text-xs text-red-600 dark:text-gothic-accent/80 mt-0.5">{error}</p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate(-1)} className="w-full">
              ← Go Back
            </Button>
          </>
        )}
      </div>
    </PageWrapper>
  )
}
