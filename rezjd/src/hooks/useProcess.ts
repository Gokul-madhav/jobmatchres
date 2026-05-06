import { useState, useCallback } from 'react'
import type { Step, StepStatus } from '../components/ProcessStepper'

const INITIAL_STEPS: Step[] = [
  { id: 'resume', label: 'Parsing Resume', description: 'Extracting skills, experience, and education', status: 'pending' },
  { id: 'jd', label: 'Parsing Job Description', description: 'Identifying required skills and qualifications', status: 'pending' },
  { id: 'match', label: 'Computing Match Score', description: 'Semantic + keyword similarity analysis', status: 'pending' },
  { id: 'ats', label: 'ATS Score Analysis', description: 'Checking format, sections, and keywords', status: 'pending' },
  { id: 'gaps', label: 'Detecting Gaps', description: 'Finding missing skills and experience', status: 'pending' },
  { id: 'done', label: 'Pipeline Complete', description: 'Ready to generate questions', status: 'pending' },
]

export function useProcess() {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS)

  const setStepStatus = useCallback((id: string, status: StepStatus, description?: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status, ...(description ? { description } : {}) } : s
      )
    )
  }, [])

  const reset = useCallback(() => {
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'pending' })))
  }, [])

  const runAll = useCallback(async (fn: () => Promise<void>) => {
    const ids = ['resume', 'jd', 'match', 'ats', 'gaps', 'done']
    for (const id of ids) {
      setStepStatus(id, 'running')
      await new Promise((r) => setTimeout(r, 400))
    }
    try {
      await fn()
      for (const id of ids) {
        setStepStatus(id, 'done')
        await new Promise((r) => setTimeout(r, 150))
      }
    } catch (e) {
      for (const id of ids) {
        setStepStatus(id, 'error')
      }
      throw e
    }
  }, [setStepStatus])

  const runWithSteps = useCallback(async (fn: () => Promise<void>) => {
    const ids = ['resume', 'jd', 'match', 'ats', 'gaps', 'done']
    reset()
    for (let i = 0; i < ids.length; i++) {
      setStepStatus(ids[i], 'running')
      if (i === 0) {
        try {
          await fn()
        } catch (e) {
          for (const id of ids) setStepStatus(id, 'error')
          throw e
        }
      }
      await new Promise((r) => setTimeout(r, 300))
      setStepStatus(ids[i], 'done')
    }
  }, [reset, setStepStatus])

  return { steps, setStepStatus, reset, runAll, runWithSteps }
}
