import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Info } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TemplateCard, type Template } from '../components/TemplateCard'
import { Button } from '../components/ui/Button'
import { useSession } from '../hooks/useSession'
import toast from 'react-hot-toast'

const TEMPLATES: Template[] = [
  {
    id: 'clean',
    name: 'Clean',
    description: 'Pure white, Helvetica, thin rules. Preferred by Google, Meta, and most tech companies.',
    tags: ['ATS-safe', 'Tech', 'Minimal'],
    badge: '⭐ Most Popular',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Navy header bar with bold section rules. Ideal for consulting, finance, and product roles.',
    tags: ['Consulting', 'Finance', 'Product'],
    badge: '🏢 MNC Favourite',
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Double gold-black rules, premium spacing. Designed for senior and leadership positions.',
    tags: ['Senior', 'Leadership', 'Premium'],
    badge: '👔 Executive',
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Maximum density at 8.5pt. Fits a full career on one page — perfect for experienced candidates.',
    tags: ['One-page', 'Dense', 'Amazon/MS'],
    badge: '📄 One Page',
  },
]

const TEMPLATE_TIPS: Record<string, string> = {
  clean: 'Best for software engineering, data science, and product roles at FAANG companies.',
  modern: 'Preferred by McKinsey, Deloitte, Goldman Sachs, and Fortune 500 hiring managers.',
  executive: 'Designed for Director, VP, and C-suite applications. Conveys seniority and polish.',
  compact: 'Ideal when you have 5+ years of experience and need everything on a single page.',
}

export default function Templates() {
  const navigate = useNavigate()
  const { generate, loading } = useSession()
  const [selected, setSelected] = useState<string>('clean')

  const sessionId = sessionStorage.getItem('rezjd_session_id') || ''

  const handleGenerate = async () => {
    if (!sessionId) { navigate('/ats-builder'); return }
    try {
      const result = await generate(sessionId, selected)
      sessionStorage.setItem('rezjd_download_url', result.download_url)
      toast.success('Resume generated!')
      navigate('/download')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Generation failed')
    }
  }

  const selectedTemplate = TEMPLATES.find((t) => t.id === selected)

  return (
    <PageWrapper>
      <div className="space-y-8 animate-slide-up">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-japandi-text dark:text-gothic-text dark:font-serif">
            Choose a Template
          </h1>
          <p className="text-japandi-muted dark:text-gothic-muted mt-2">
            All templates are ATS-optimised and MNC-ready. Click to preview, then generate.
          </p>
        </div>

        {/* Template grid — 2×2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TEMPLATES.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              selected={selected === t.id}
              onSelect={setSelected}
            />
          ))}
        </div>

        {/* Selected template tip */}
        {selectedTemplate && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl
            bg-japandi-primary/8 border border-japandi-primary/20
            dark:bg-gothic-primary/10 dark:border-gothic-primary/30
            transition-all duration-300">
            <Info size={16} className="text-japandi-primary dark:text-gothic-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-japandi-text dark:text-gothic-text">
              <span className="font-medium">{selectedTemplate.name}: </span>
              {TEMPLATE_TIPS[selected]}
            </p>
          </div>
        )}

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          loading={loading}
          size="lg"
          className="w-full"
          icon={<ArrowRight size={18} />}
        >
          Generate with "{selectedTemplate?.name}" Template
        </Button>
      </div>
    </PageWrapper>
  )
}
