import React from 'react'
import { Link } from 'react-router-dom'
import { FileText, Zap, Target, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { cn } from '../lib/utils'

const features = [
  {
    icon: <FileText size={22} />,
    title: 'Smart Resume Parsing',
    desc: 'AI extracts skills, experience, and education from any PDF or DOCX resume.',
  },
  {
    icon: <Target size={22} />,
    title: 'ATS Score Analysis',
    desc: 'Know exactly how your resume performs against applicant tracking systems.',
  },
  {
    icon: <Zap size={22} />,
    title: 'Gap Detection',
    desc: 'Instantly see missing skills and experience gaps for any job description.',
  },
  {
    icon: <TrendingUp size={22} />,
    title: 'AI Suggestions',
    desc: 'Get tailored improvement suggestions powered by GPT-4o-mini.',
  },
]

const steps = [
  'Upload your resume (PDF or DOCX)',
  'Paste or link a job description',
  'Review your ATS & match scores',
  'Answer clarifying questions',
  'Accept AI improvement suggestions',
  'Download your optimized resume',
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-japandi-bg dark:bg-gothic-bg transition-colors duration-300">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8
          bg-japandi-primary/10 text-japandi-primary
          dark:bg-gothic-primary/20 dark:text-gothic-primary">
          <Zap size={12} />
          Powered by GPT-4o-mini
        </div>

        <h1 className={cn(
          'text-5xl sm:text-6xl font-bold leading-tight mb-6',
          'text-japandi-text',
          'dark:text-gothic-text dark:font-serif'
        )}>
          Land more interviews<br />
          <span className="text-japandi-primary dark:text-gothic-primary">with AI-optimized</span><br />
          resumes
        </h1>

        <p className="text-lg text-japandi-muted dark:text-gothic-muted max-w-2xl mx-auto mb-10">
          RezJD analyzes your resume against any job description, scores it for ATS compatibility,
          detects gaps, and generates a tailored resume — in minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" icon={<ArrowRight size={18} />}>
              Get Started Free
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="secondary">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-semibold text-center text-japandi-text dark:text-gothic-text dark:font-serif mb-12">
          Everything you need to get hired
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <Card key={f.title} hover className="p-6">
              <CardBody className="px-0 pb-0">
                <div className="w-10 h-10 rounded-xl bg-japandi-primary/10 dark:bg-gothic-primary/20 flex items-center justify-center text-japandi-primary dark:text-gothic-primary mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-japandi-text dark:text-gothic-text dark:font-serif mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-japandi-muted dark:text-gothic-muted">{f.desc}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-semibold text-center text-japandi-text dark:text-gothic-text dark:font-serif mb-12">
          How it works
        </h2>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-japandi-primary dark:bg-gothic-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 flex items-center gap-3 py-3 px-4 rounded-xl bg-white dark:bg-gothic-card border border-japandi-border dark:border-gothic-border">
                <CheckCircle size={16} className="text-japandi-primary dark:text-gothic-primary flex-shrink-0" />
                <span className="text-sm text-japandi-text dark:text-gothic-text">{step}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link to="/register">
            <Button size="lg" icon={<ArrowRight size={18} />}>
              Start Optimizing Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-japandi-border dark:border-gothic-border py-8 text-center">
        <p className="text-sm text-japandi-muted dark:text-gothic-muted">
          © 2026 RezJD · AI Resume ATS Optimizer
        </p>
      </footer>
    </div>
  )
}
