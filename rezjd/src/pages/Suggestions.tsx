import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Lightbulb, CheckCheck } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card, CardBody } from '../components/ui/Card'
import { SuggestionCard } from '../components/SuggestionCard'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useSession } from '../hooks/useSession'
import type { Suggestion } from '../services/api'
import toast from 'react-hot-toast'

export default function Suggestions() {
  const navigate = useNavigate()
  const { approveAll, loading } = useSession()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const sessionId = sessionStorage.getItem('rezjd_session_id') || ''

  useEffect(() => {
    const raw = sessionStorage.getItem('rezjd_suggestions')
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Suggestion[]
        setSuggestions(parsed.map((s) => ({ ...s, approved: null })))
      } catch { /* ignore */ }
    }
    if (!raw) navigate('/questions')
  }, [navigate])

  const handleDecision = (id: string, approved: boolean) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, approved } : s))
    )
  }

  const handleAcceptAll = () => {
    setSuggestions((prev) => prev.map((s) => ({ ...s, approved: true })))
  }

  const handleSubmit = async () => {
    const decisions: Record<string, boolean> = {}
    for (const s of suggestions) {
      if (s.approved !== null) decisions[s.id] = s.approved
    }
    try {
      await approveAll(sessionId, decisions)
      sessionStorage.setItem('rezjd_decisions', JSON.stringify(decisions))
      toast.success('Decisions saved!')
      navigate('/templates')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save decisions')
    }
  }

  const categories = ['all', ...Array.from(new Set(
    suggestions.map((s) => s.target_section).filter(Boolean)
  ))]

  const filtered = activeCategory === 'all'
    ? suggestions
    : suggestions.filter((s) => s.target_section === activeCategory)

  const acceptedCount = suggestions.filter((s) => s.approved === true).length
  const pendingCount = suggestions.filter((s) => s.approved === null).length

  return (
    <PageWrapper>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-japandi-text dark:text-gothic-text dark:font-serif">
              AI Suggestions
            </h1>
            <p className="text-japandi-muted dark:text-gothic-muted mt-1">
              Accept or reject each suggestion. Accepted ones will be applied to your resume.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">{acceptedCount} accepted</Badge>
            {pendingCount > 0 && <Badge variant="warning">{pendingCount} pending</Badge>}
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize
                ${activeCategory === cat
                  ? 'bg-japandi-primary text-white dark:bg-gothic-primary'
                  : 'bg-japandi-bg text-japandi-muted dark:bg-gothic-border dark:text-gothic-muted hover:bg-japandi-border dark:hover:bg-gothic-card'
                }`}
            >
              {cat}
              {cat !== 'all' && (
                <span className="ml-1.5 opacity-70">
                  ({suggestions.filter((s) => s.target_section === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Accept all */}
        {pendingCount > 0 && (
          <button
            onClick={handleAcceptAll}
            className="flex items-center gap-2 text-sm text-japandi-primary dark:text-gothic-primary hover:underline"
          >
            <CheckCheck size={16} />
            Accept all {pendingCount} pending suggestions
          </button>
        )}

        {/* Suggestion cards */}
        {filtered.length === 0 ? (
          <Card>
            <CardBody className="text-center py-10">
              <Lightbulb size={32} className="mx-auto text-japandi-muted dark:text-gothic-muted mb-3" />
              <p className="text-japandi-muted dark:text-gothic-muted">No suggestions in this category.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onDecision={handleDecision} />
            ))}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          loading={loading}
          size="lg"
          className="w-full"
          icon={<ArrowRight size={18} />}
        >
          Continue to Templates
        </Button>
      </div>
    </PageWrapper>
  )
}
