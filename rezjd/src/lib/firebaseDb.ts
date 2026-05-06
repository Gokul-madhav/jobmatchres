import { ref, set, get, push, update } from 'firebase/database'
import { db } from './firebase'

// ── Resume ──

export interface StoredResume {
  resumeId: string
  fileName: string
  uploadedAt: string
  parsedData?: Record<string, unknown>
}

export async function saveResume(
  userId: string,
  fileName: string,
  parsedData?: Record<string, unknown>
): Promise<string> {
  const resumesRef = ref(db, `users/${userId}/resumes`)
  const newRef = push(resumesRef)
  const resumeId = newRef.key!
  await set(newRef, {
    resumeId,
    fileName,
    uploadedAt: new Date().toISOString(),
    parsedData: parsedData ?? null,
  })
  return resumeId
}

export async function getResumes(userId: string): Promise<StoredResume[]> {
  const snap = await get(ref(db, `users/${userId}/resumes`))
  if (!snap.exists()) return []
  const data = snap.val() as Record<string, StoredResume>
  return Object.values(data).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  )
}

// ── Session ──

export interface StoredSession {
  sessionId: string
  createdAt: string
  matchScore?: number
  atsScore?: number
  status: 'created' | 'questions' | 'suggestions' | 'generated' | 'downloaded'
  resumeFileName?: string
}

export async function saveSession(
  userId: string,
  session: Omit<StoredSession, 'sessionId'> & { sessionId: string }
): Promise<void> {
  await set(ref(db, `users/${userId}/sessions/${session.sessionId}`), session)
}

export async function updateSession(
  userId: string,
  sessionId: string,
  updates: Partial<StoredSession>
): Promise<void> {
  await update(ref(db, `users/${userId}/sessions/${sessionId}`), updates)
}

export async function getSessions(userId: string): Promise<StoredSession[]> {
  const snap = await get(ref(db, `users/${userId}/sessions`))
  if (!snap.exists()) return []
  const data = snap.val() as Record<string, StoredSession>
  return Object.values(data).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// ── User Profile ──

export async function saveUserProfile(
  userId: string,
  profile: { name: string; email: string }
): Promise<void> {
  await set(ref(db, `users/${userId}/profile`), {
    ...profile,
    createdAt: new Date().toISOString(),
  })
}

export async function getUserProfile(
  userId: string
): Promise<{ name: string; email: string; createdAt: string } | null> {
  const snap = await get(ref(db, `users/${userId}/profile`))
  return snap.exists() ? snap.val() : null
}
