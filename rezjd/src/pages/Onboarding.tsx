import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ResumeUploader } from '../components/ResumeUploader'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import { parseResume } from '../services/api'
import { saveResume } from '../lib/firebaseDb'
import toast from 'react-hot-toast'

export default function Onboarding() {
  const { user, setIsFirstLogin } = useAuth()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    if (!file || !user) return
    setLoading(true)
    try {
      const parsed = await parseResume(file)
      await saveResume(user.uid, file.name, parsed as unknown as Record<string, unknown>)
      toast.success('Resume saved!')
      setIsFirstLogin(false)
      navigate('/dashboard')
    } catch {
      toast.error('Failed to parse resume — please try again')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    setIsFirstLogin(false)
    navigate('/dashboard')
  }

  return (
    <PageWrapper narrow className="flex items-center justify-center">
      <div className="w-full max-w-xl space-y-6 animate-slide-up">
        {/* Welcome */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-japandi-primary/10 dark:bg-gothic-primary/20 flex items-center justify-center mx-auto">
            <Sparkles size={28} className="text-japandi-primary dark:text-gothic-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-japandi-text dark:text-gothic-text dark:font-serif">
            Welcome, {user?.displayName?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-japandi-muted dark:text-gothic-muted">
            Upload your resume to get started. We'll save it for future sessions.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Your Resume</CardTitle>
            <CardDescription>PDF or DOCX · Max 5MB</CardDescription>
          </CardHeader>
          <CardBody>
            <ResumeUploader
              onFile={(f) => setFile(f)}
              file={file}
              loading={loading}
            />
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleUpload}
                disabled={!file}
                loading={loading}
                className="flex-1"
                icon={<ArrowRight size={16} />}
              >
                Save & Continue
              </Button>
              <Button variant="ghost" onClick={handleSkip} disabled={loading}>
                Skip for now
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  )
}
