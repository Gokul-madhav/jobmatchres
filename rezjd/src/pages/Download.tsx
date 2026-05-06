import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Home, RotateCcw } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../components/ui/Card'
import { ResumePreview } from '../components/ResumePreview'
import { Button } from '../components/ui/Button'
import { useSession } from '../hooks/useSession'
import toast from 'react-hot-toast'

export default function Download() {
  const navigate = useNavigate()
  const { download } = useSession()
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const sessionId = sessionStorage.getItem('rezjd_session_id') || ''
  const downloadUrl = sessionStorage.getItem('rezjd_download_url') || ''

  useEffect(() => {
    if (!sessionId || !downloadUrl) navigate('/ats-builder')
  }, [sessionId, downloadUrl, navigate])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await download(sessionId)
      setDownloaded(true)
      toast.success('Resume downloaded!')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const handleStartOver = () => {
    sessionStorage.removeItem('rezjd_session_id')
    sessionStorage.removeItem('rezjd_session')
    sessionStorage.removeItem('rezjd_suggestions')
    sessionStorage.removeItem('rezjd_decisions')
    sessionStorage.removeItem('rezjd_download_url')
    sessionStorage.removeItem('rezjd_jd_text')
    sessionStorage.removeItem('rezjd_file_name')
    ;(window as unknown as Record<string, unknown>).__rezjd_file = undefined
    navigate('/ats-builder')
  }

  return (
    <PageWrapper narrow>
      <div className="space-y-6 animate-slide-up">
        {/* Success banner */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle size={22} className="text-emerald-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-emerald-800 dark:text-emerald-300">
              Your optimized resume is ready!
            </p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
              AI suggestions have been applied. Download your PDF below.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resume Preview</CardTitle>
            <CardDescription>Your AI-optimized resume</CardDescription>
          </CardHeader>
          <CardBody>
            <ResumePreview
              downloadUrl={downloadUrl}
              sessionId={sessionId}
              onDownload={handleDownload}
              downloading={downloading}
            />
          </CardBody>
        </Card>

        {downloaded && (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/dashboard')}
              icon={<Home size={16} />}
              className="flex-1"
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={handleStartOver}
              icon={<RotateCcw size={16} />}
              className="flex-1"
            >
              Start Over
            </Button>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
