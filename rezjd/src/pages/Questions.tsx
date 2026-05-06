import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, AlertCircle, MessageSquare } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../components/ui/Card'
import { QuestionForm } from '../components/QuestionForm'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { useSession } from '../hooks/useSession'
import type { Question } from '../services/api'
import toast from 'react-hot-toast'

export default function Questions() {
  const navigate = useNavigate()
  const { fetchQuestions, sendAnswers, loading } = useSession()
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionId = sessionStorage.getItem('rezjd_session_id') || ''

  useEffect(() => {
    if (!sessionId) { navigate('/ats-builder'); return }
    fetchQuestions(sessionId)
      .then((res) => setQuestions(res.questions))
      .catch((e) => setError(e.message || 'Failed to load questions'))
      .finally(() => setFetching(false))
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async () => {
    const payload = questions.map((q) => ({
      question_id: q.id,
      answer_text: answers[q.id] || '',
    }))
    try {
      const result = await sendAnswers(sessionId, payload)
      sessionStorage.setItem('rezjd_suggestions', JSON.stringify(result.suggestions))
      sessionStorage.setItem('rezjd_session_id', sessionId)
      toast.success('Answers submitted!')
      navigate('/suggestions')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Submission failed')
    }
  }

  return (
    <PageWrapper narrow>
      <div className="space-y-6 animate-slide-up">
        <div>
          <h1 className="text-3xl font-semibold text-japandi-text dark:text-gothic-text dark:font-serif">
            Clarifying Questions
          </h1>
          <p className="text-japandi-muted dark:text-gothic-muted mt-2">
            Answer these questions to help us generate better resume suggestions.
            You can skip any question.
          </p>
        </div>

        {fetching ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-gothic-accent/10 border border-red-200 dark:border-gothic-accent/30">
            <AlertCircle size={18} className="text-red-500 dark:text-gothic-accent flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-gothic-accent">{error}</p>
          </div>
        ) : questions.length === 0 ? (
          <Card>
            <CardBody className="text-center py-10">
              <MessageSquare size={32} className="mx-auto text-japandi-muted dark:text-gothic-muted mb-3" />
              <p className="text-japandi-muted dark:text-gothic-muted">No questions generated — proceeding to suggestions.</p>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{questions.length} Questions</CardTitle>
              <CardDescription>Based on gaps detected in your resume</CardDescription>
            </CardHeader>
            <CardBody>
              <QuestionForm questions={questions} answers={answers} onChange={handleChange} />
            </CardBody>
          </Card>
        )}

        <Button
          onClick={handleSubmit}
          loading={loading}
          size="lg"
          className="w-full"
          icon={<ArrowRight size={18} />}
        >
          {questions.length === 0 ? 'Skip to Suggestions' : 'Submit Answers'}
        </Button>
      </div>
    </PageWrapper>
  )
}
