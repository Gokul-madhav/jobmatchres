import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Briefcase, Clock, TrendingUp, Wifi, WifiOff } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../hooks/useAuth'
import { getSessions, type StoredSession } from '../lib/firebaseDb'
import { healthCheck } from '../services/api'
import { formatDate } from '../lib/utils'
import { cn } from '../lib/utils'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<StoredSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking')

  useEffect(() => {
    if (!user) return
    getSessions(user.uid)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false))

    healthCheck()
      .then(() => setApiStatus('ok'))
      .catch(() => setApiStatus('error'))
  }, [user])

  const mainCards = [
    {
      icon: <FileText size={28} />,
      title: 'ATS Resume Builder',
      description: 'Upload your resume and a job description. Get ATS score, gap analysis, and an AI-optimized resume.',
      cta: 'Start Building',
      href: '/ats-builder',
      accent: false,
    },
    {
      icon: <Briefcase size={28} />,
      title: 'Job Match Analysis',
      description: 'Select a saved resume and paste a job description to see how well you match the role.',
      cta: 'Analyze Match',
      href: '/job-match',
      accent: true,
    },
  ]

  return (
    <PageWrapper>
      <div className="space-y-10 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-japandi-text dark:text-gothic-text dark:font-serif">
              Good {getGreeting()}, {user?.displayName?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-japandi-muted dark:text-gothic-muted mt-1">
              What would you like to optimize today?
            </p>
          </div>
          {/* API status */}
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
            apiStatus === 'ok' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
            apiStatus === 'error' && 'bg-red-50 text-red-600 dark:bg-gothic-accent/10 dark:text-gothic-accent',
            apiStatus === 'checking' && 'bg-japandi-bg text-japandi-muted dark:bg-gothic-border dark:text-gothic-muted',
          )}>
            {apiStatus === 'ok' ? <Wifi size={12} /> : <WifiOff size={12} />}
            {apiStatus === 'checking' ? 'Connecting…' : apiStatus === 'ok' ? 'API Online' : 'API Offline'}
          </div>
        </div>

        {/* Main action cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mainCards.map((card) => (
            <div
              key={card.href}
              onClick={() => navigate(card.href)}
              className={cn(
                'group relative rounded-2xl border-2 p-8 cursor-pointer transition-all duration-300',
                'hover:-translate-y-1',
                card.accent
                  ? [
                      'border-japandi-accent/30 bg-gradient-to-br from-white to-japandi-accent/5',
                      'dark:border-gothic-accent/30 dark:bg-gradient-to-br dark:from-gothic-card dark:to-gothic-accent/10',
                      'hover:border-japandi-accent dark:hover:border-gothic-accent',
                      'hover:shadow-[0_8px_30px_rgba(194,168,120,0.15)] dark:hover:shadow-gothic-accent',
                    ].join(' ')
                  : [
                      'border-japandi-border bg-white',
                      'dark:border-gothic-border dark:bg-gothic-card',
                      'hover:border-japandi-primary dark:hover:border-gothic-primary',
                      'hover:shadow-japandi-md dark:hover:shadow-gothic-glow',
                    ].join(' ')
              )}
            >
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center mb-5',
                card.accent
                  ? 'bg-japandi-accent/15 text-japandi-accent dark:bg-gothic-accent/20 dark:text-gothic-accent'
                  : 'bg-japandi-primary/10 text-japandi-primary dark:bg-gothic-primary/20 dark:text-gothic-primary'
              )}>
                {card.icon}
              </div>
              <h2 className="text-xl font-semibold text-japandi-text dark:text-gothic-text dark:font-serif mb-2">
                {card.title}
              </h2>
              <p className="text-sm text-japandi-muted dark:text-gothic-muted mb-6">
                {card.description}
              </p>
              <span className={cn(
                'inline-flex items-center gap-2 text-sm font-medium',
                card.accent
                  ? 'text-japandi-accent dark:text-gothic-accent'
                  : 'text-japandi-primary dark:text-gothic-primary'
              )}>
                {card.cta} →
              </span>
            </div>
          ))}
        </div>

        {/* Recent sessions */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-japandi-muted dark:text-gothic-muted" />
            <h2 className="text-lg font-semibold text-japandi-text dark:text-gothic-text">
              Recent Sessions
            </h2>
          </div>

          {loadingSessions ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-japandi-border dark:border-gothic-border">
              <TrendingUp size={32} className="mx-auto text-japandi-muted dark:text-gothic-muted mb-3" />
              <p className="text-japandi-muted dark:text-gothic-muted text-sm">
                No sessions yet — start with ATS Builder or Job Match
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 5).map((s) => (
                <div
                  key={s.sessionId}
                  className="flex items-center justify-between p-4 rounded-xl border border-japandi-border dark:border-gothic-border bg-white dark:bg-gothic-card"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-japandi-muted dark:text-gothic-muted" />
                    <div>
                      <p className="text-sm font-medium text-japandi-text dark:text-gothic-text">
                        {s.resumeFileName || 'Resume'}
                      </p>
                      <p className="text-xs text-japandi-muted dark:text-gothic-muted">
                        {formatDate(s.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.atsScore !== undefined && (
                      <Badge variant={s.atsScore >= 0.75 ? 'success' : s.atsScore >= 0.5 ? 'warning' : 'danger'}>
                        ATS {Math.round(s.atsScore * 100)}
                      </Badge>
                    )}
                    {s.matchScore !== undefined && (
                      <Badge variant={s.matchScore >= 0.75 ? 'success' : s.matchScore >= 0.5 ? 'warning' : 'danger'}>
                        Match {Math.round(s.matchScore * 100)}
                      </Badge>
                    )}
                    <Badge variant="default">{s.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
