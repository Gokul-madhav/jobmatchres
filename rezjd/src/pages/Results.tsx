import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, AlertTriangle, AlertCircle } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card'
import { ScoreRing } from '../components/ScoreRing'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Progress } from '../components/ui/Progress'
import { Spinner } from '../components/ui/Spinner'
import type { SessionResponse, ATSSubScore } from '../services/api'

// Derive matched/missing skills from parsed_resume vs parsed_jd
function deriveSkills(session: SessionResponse) {
  const resumeSkills = (session as unknown as Record<string, unknown>)
  // The session object from /sessions endpoint includes parsed_resume and parsed_jd
  // We compute matched/missing from those if available
  const raw = session as unknown as {
    parsed_resume?: { skills?: string[] }
    parsed_jd?: { required_skills?: string[] }
  }
  const resumeSet = new Set(
    (raw.parsed_resume?.skills ?? []).map((s: string) => s.toLowerCase().trim())
  )
  const required = (raw.parsed_jd?.required_skills ?? []).map((s: string) => s.toLowerCase().trim())
  const matched = required.filter((s) => resumeSet.has(s))
  const missing = required.filter((s) => !resumeSet.has(s))
  return { matched, missing }
}

// Map sub_scores array to named values
function getSubScore(subScores: ATSSubScore[], name: string): number {
  const found = subScores.find(
    (s) => s.name.toLowerCase().includes(name.toLowerCase())
  )
  return found ? found.raw_score / 100 : 0
}

export default function Results() {
  const navigate = useNavigate()
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('rezjd_session')
    if (!raw) {
      setLoadError('No session data found. Please run the analysis again.')
      return
    }
    try {
      const parsed = JSON.parse(raw) as SessionResponse
      // Validate minimum required fields
      if (!parsed.match_result || !parsed.ats_result || !parsed.gap_report) {
        setLoadError('Session data is incomplete. Please run the analysis again.')
        return
      }
      setSession(parsed)
    } catch {
      setLoadError('Failed to read session data. Please run the analysis again.')
    }
  }, [])

  // Loading state
  if (!session && !loadError) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    )
  }

  // Error state
  if (loadError) {
    return (
      <PageWrapper narrow>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center">
          <div className="flex items-start gap-3 p-5 rounded-2xl bg-red-50 dark:bg-gothic-accent/10 border border-red-200 dark:border-gothic-accent/30 w-full max-w-md">
            <AlertCircle size={20} className="text-red-500 dark:text-gothic-accent flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="font-medium text-red-700 dark:text-gothic-accent">Could not load results</p>
              <p className="text-sm text-red-600 dark:text-gothic-accent/80 mt-1">{loadError}</p>
            </div>
          </div>
          <Button onClick={() => navigate('/ats-builder')} variant="secondary">
            ← Back to ATS Builder
          </Button>
        </div>
      </PageWrapper>
    )
  }

  const { match_result, ats_result, gap_report } = session!
  const { matched, missing } = deriveSkills(session!)
  const subScores = ats_result.sub_scores ?? []

  // Build score breakdown from sub_scores
  const scoreBreakdown = subScores.length > 0
    ? subScores.map((s) => ({
        label: s.name,
        value: s.raw_score / 100,
      }))
    : [
        { label: 'Keyword Match', value: match_result.keyword_score / 100 },
        { label: 'Semantic Match', value: match_result.semantic_score / 100 },
      ]

  const severityColor: Record<string, 'danger' | 'warning' | 'default'> = {
    high: 'danger',
    medium: 'warning',
    low: 'default',
  }

  // Normalise scores — backend returns 0–100, ScoreRing expects 0–1
  const matchScore = match_result.overall_score > 1
    ? match_result.overall_score / 100
    : match_result.overall_score
  const atsScore = ats_result.overall_score > 1
    ? ats_result.overall_score / 100
    : ats_result.overall_score

  return (
    <PageWrapper>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-semibold text-japandi-text dark:text-gothic-text dark:font-serif">
            Analysis Results
          </h1>
          <p className="text-japandi-muted dark:text-gothic-muted mt-1">
            Here's how your resume performs against the job description.
          </p>
        </div>

        {/* Score rings */}
        <Card>
          <CardHeader><CardTitle>Overall Scores</CardTitle></CardHeader>
          <CardBody>
            <div className="flex flex-wrap justify-center gap-12">
              <ScoreRing score={matchScore} label="Match Score" size={140} />
              <ScoreRing score={atsScore} label="ATS Score" size={140} />
            </div>
          </CardBody>
        </Card>

        {/* Score breakdown */}
        {scoreBreakdown.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Score Breakdown</CardTitle></CardHeader>
            <CardBody>
              <div className="space-y-4">
                {scoreBreakdown.map((item) => {
                  const pct = item.value > 1 ? item.value : item.value * 100
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-japandi-text dark:text-gothic-text capitalize">
                          {item.label}
                        </span>
                        <span className="font-medium text-japandi-text dark:text-gothic-text">
                          {Math.round(pct)}%
                        </span>
                      </div>
                      <Progress value={pct} />
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Skills */}
        {(matched.length > 0 || missing.length > 0) && (
          <Card>
            <CardHeader><CardTitle>Skills Analysis</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              {matched.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-japandi-text dark:text-gothic-text mb-2">
                    ✅ Matched Skills ({matched.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {matched.map((skill) => (
                      <span key={skill} className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {missing.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-japandi-text dark:text-gothic-text mb-2">
                    ❌ Missing Skills ({missing.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {missing.map((skill) => (
                      <span key={skill} className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200 dark:bg-gothic-accent/10 dark:text-gothic-accent dark:border-gothic-accent/30">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Gaps */}
        {gap_report.has_gaps && gap_report.gaps.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <CardTitle>Detected Gaps ({gap_report.gaps.length})</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {gap_report.gaps.map((gap, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2.5 border-b border-japandi-border dark:border-gothic-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={severityColor[gap.severity] ?? 'default'}>
                        {gap.severity}
                      </Badge>
                      <span className="text-sm text-japandi-text dark:text-gothic-text">{gap.item}</span>
                    </div>
                    <span className="text-xs text-japandi-muted dark:text-gothic-muted capitalize">
                      {gap.gap_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        <Button
          onClick={() => navigate('/questions')}
          size="lg"
          className="w-full"
          icon={<ArrowRight size={18} />}
        >
          Continue to Questions
        </Button>
      </div>
    </PageWrapper>
  )
}
