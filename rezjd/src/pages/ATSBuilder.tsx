import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, AlignLeft } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../components/ui/Card'
import { ResumeUploader } from '../components/ResumeUploader'
import { JDInput } from '../components/JDInput'
import { Button } from '../components/ui/Button'

export default function ATSBuilder() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [jdText, setJdText] = useState('')

  const canProceed = !!file && jdText.trim().length >= 50

  const handleStart = () => {
    if (!canProceed) return
    // Store in sessionStorage for Process page
    sessionStorage.setItem('rezjd_file_name', file!.name)
    sessionStorage.setItem('rezjd_jd_text', jdText)
    // We pass the file via a custom event since sessionStorage can't hold File objects
    ;(window as unknown as Record<string, unknown>).__rezjd_file = file
    navigate('/process')
  }

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto space-y-8 animate-slide-up">
        <div>
          <h1 className="text-3xl font-semibold text-japandi-text dark:text-gothic-text dark:font-serif">
            ATS Resume Builder
          </h1>
          <p className="text-japandi-muted dark:text-gothic-muted mt-2">
            Upload your resume and paste a job description to start the full optimization pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Resume upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-japandi-primary dark:text-gothic-primary" />
                <CardTitle>Your Resume</CardTitle>
              </div>
              <CardDescription>Upload the resume you want to optimize</CardDescription>
            </CardHeader>
            <CardBody>
              <ResumeUploader onFile={(f) => setFile(f)} file={file} />
            </CardBody>
          </Card>

          {/* JD input */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlignLeft size={18} className="text-japandi-primary dark:text-gothic-primary" />
                <CardTitle>Job Description</CardTitle>
              </div>
              <CardDescription>Paste the full JD or fetch from a URL (min 50 characters)</CardDescription>
            </CardHeader>
            <CardBody>
              <JDInput value={jdText} onChange={setJdText} />
            </CardBody>
          </Card>
        </div>

        {/* Validation hint */}
        {!canProceed && (file || jdText) && (
          <p className="text-sm text-japandi-muted dark:text-gothic-muted text-center">
            {!file ? '⬆ Upload a resume' : '⬆ Job description needs at least 50 characters'}
          </p>
        )}

        <Button
          onClick={handleStart}
          disabled={!canProceed}
          size="lg"
          className="w-full"
          icon={<ArrowRight size={18} />}
        >
          Start Analysis Pipeline
        </Button>
      </div>
    </PageWrapper>
  )
}
