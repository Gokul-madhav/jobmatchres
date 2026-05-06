import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 300_000, // 5 minutes — LLM + embedding cold start can be slow
})

// ── Types ──

export interface ParsedResume {
  contact: { name: string; email: string; phone: string; linkedin: string; location: string }
  summary: string
  skills: string[]
  experience: Array<{ title: string; company: string; start_date: string; end_date: string; description: string }>
  education: Array<{ institution: string; degree: string; field: string; year: string; grade: string }>
  projects: Array<{ name: string; description: string; technologies: string[] }>
  achievements: string[]
  certifications: string[]
  languages: string[]
  total_experience_years: number
  extraction_source: string
  raw_text: string
}

export interface ParsedJD {
  job_title: string
  company: string
  location: string
  job_type: string
  required_skills: string[]
  preferred_skills: string[]
  tools: string[]
  experience_required: string
  responsibilities: string[]
  qualifications: string[]
  keywords: string[]
  salary_range: string
  benefits: string[]
  extraction_source: string
}

export interface MatchResult {
  overall_score: number
  keyword_score: number
  semantic_score: number
}

export interface ATSSubScore {
  name: string
  raw_score: number
  weight: number
  weighted_contribution: number
}

export interface ATSResult {
  overall_score: number
  sub_scores: ATSSubScore[]
}

export interface GapItem {
  gap_type: string
  item: string
  severity: string
}

export interface GapReport {
  gaps: GapItem[]
  has_gaps: boolean
}

export interface Question {
  id: string
  text: string
  target_gap: string | null
  is_fallback: boolean
}

export interface Suggestion {
  id: string
  target_section: string
  suggested_change: string
  rationale: string
  gap_reference: string | null
  approved: boolean | null
}

export interface SessionResponse {
  session_id: string
  match_result: MatchResult
  ats_result: ATSResult
  gap_report: GapReport
  created_at: string
  expires_at: string
}

export interface QuestionsResponse {
  session_id: string
  questions: Question[]
  question_count: number
  fallback_mode: boolean
}

export interface SuggestionsResponse {
  session_id: string
  suggestions: Suggestion[]
  suggestion_count: number
  is_partial: boolean
  llm_error: string | null
}

export interface GenerateResponse {
  session_id: string
  download_url: string
  expires_at: string
  template_id: string
  approved_suggestions_count: number
}

// ── API Functions ──

export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  const { data } = await api.get('/health')
  return data
}

export async function parseResume(file: File): Promise<ParsedResume> {
  const form = new FormData()
  form.append('resume_file', file)
  const { data } = await api.post('/analyze-resume', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function parseJD(jdText: string): Promise<ParsedJD> {
  const { data } = await api.post('/analyze-jd', { jd_text: jdText })
  return data
}

export async function createSession(
  file: File,
  jdText: string
): Promise<SessionResponse> {
  const form = new FormData()
  form.append('resume_file', file)
  form.append('jd_text', jdText)
  const { data } = await api.post('/sessions', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getQuestions(sessionId: string): Promise<QuestionsResponse> {
  const { data } = await api.get(`/sessions/${sessionId}/questions`)
  return data
}

export async function submitAnswers(
  sessionId: string,
  answers: Array<{ question_id: string; answer_text: string }>
): Promise<SuggestionsResponse> {
  const { data } = await api.post(`/sessions/${sessionId}/answers`, { answers })
  return data
}

export async function approveSuggestions(
  sessionId: string,
  decisions: Record<string, boolean>
): Promise<{ status: string }> {
  const { data } = await api.post(`/sessions/${sessionId}/suggestions/approve`, { decisions })
  return data
}

export async function generateResume(
  sessionId: string,
  templateId: string
): Promise<GenerateResponse> {
  const { data } = await api.post(`/sessions/${sessionId}/generate`, { template_id: templateId })
  return data
}

export async function downloadResume(sessionId: string): Promise<Blob> {
  const { data } = await api.get(`/sessions/${sessionId}/download`, {
    responseType: 'blob',
  })
  return data
}

export async function scrapeJD(_url: string): Promise<string> {
  // Placeholder — no backend scrape endpoint yet
  // Returns empty string; UI will show manual input fallback
  return ''
}

export default api
