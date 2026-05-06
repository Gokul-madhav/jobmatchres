import { useEffect } from 'react'
import BackendHealthCard from '../components/BackendHealthCard'
import ResumeParsedCard from '../components/ResumeParsedCard'
import JDParsedCard from '../components/JDParsedCard'
import EmbeddingCard from '../components/EmbeddingCard'
import MatchScoringCard from '../components/MatchScoringCard'
import ATSScoringCard from '../components/ATSScoringCard'
import GapDetectionCard from '../components/GapDetectionCard'
import LLMEnginesCard from '../components/LLMEnginesCard'
import SessionManagerCard from '../components/SessionManagerCard'
import ResumeGenerationCard from '../components/ResumeGenerationCard'
import { useHealthCheck } from '../hooks/useHealthCheck'

export default function DevDashboard() {
  const { ping, redis, checkPing, checkRedis, checkAll } = useHealthCheck()

  // Run all checks in parallel on page load
  useEffect(() => {
    checkAll()
  }, [checkAll])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          🛠 Dev Dashboard
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          EPIC smoke-test panels — backend health &amp; component checks
        </p>
      </header>

      <div className="space-y-4 max-w-3xl">
        <BackendHealthCard
          ping={ping}
          redis={redis}
          onPing={checkPing}
          onRedis={checkRedis}
        />
        <ResumeParsedCard />
        <JDParsedCard />
        <EmbeddingCard />
        <MatchScoringCard />
        <ATSScoringCard />
        <GapDetectionCard />
        <LLMEnginesCard />
        <SessionManagerCard />
        <ResumeGenerationCard />
      </div>
    </div>
  )
}
