# AI Resume ATS Optimizer — Frontend Build Tasks

## Project: `rezjd/`
## Stack: React + Vite + TypeScript + Tailwind CSS + Firebase + Axios

---

## PHASE 1 — Project Scaffold & Config
- [x] 1.1 Create `rezjd/` folder with Vite + React + TypeScript template structure
- [x] 1.2 Write `package.json` with all dependencies (axios, firebase, lucide-react, etc.)
- [x] 1.3 Write `vite.config.ts` with API proxy to `http://localhost:8000`
- [x] 1.4 Write `tsconfig.json` and `tsconfig.app.json`
- [x] 1.5 Write `index.html` entry point
- [x] 1.6 Write `tailwind.config.js` with Japandi + Gothic design tokens
- [x] 1.7 Write `postcss.config.js`

---

## PHASE 2 — Design System & Theme
- [x] 2.1 Write `src/index.css` — global styles, CSS variables for both themes
- [x] 2.2 Write `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- [x] 2.3 Write `src/lib/theme.ts` — theme toggle logic, localStorage persistence
- [x] 2.4 Write `src/contexts/ThemeContext.tsx` — React context for light/dark mode

---

## PHASE 3 — Firebase Setup
- [x] 3.1 Write `src/lib/firebase.ts` — Firebase app init, auth, database exports
- [x] 3.2 Write `src/contexts/AuthContext.tsx` — auth state, login, register, logout
- [x] 3.3 Write `src/lib/firebaseDb.ts` — helpers: saveResume, getSessions, saveSession

---

## PHASE 4 — API Service Layer
- [x] 4.1 Write `src/services/api.ts` — Axios instance + all API functions:
  - `parseResume(file)` → POST `/api/v1/analyze-resume`
  - `parseJD(jdText)` → POST `/api/v1/analyze-jd`
  - `createSession(file, jdText)` → POST `/api/v1/sessions`
  - `getQuestions(sessionId)` → GET `/api/v1/sessions/:id/questions`
  - `submitAnswers(sessionId, answers)` → POST `/api/v1/sessions/:id/answers`
  - `approveSuggestions(sessionId, decisions)` → POST `/api/v1/sessions/:id/suggestions/approve`
  - `generateResume(sessionId, templateId)` → POST `/api/v1/sessions/:id/generate`
  - `downloadResume(sessionId)` → GET `/api/v1/sessions/:id/download`
  - `scrapeJD(url)` → placeholder (no backend endpoint yet)
  - `healthCheck()` → GET `/api/v1/health`

---

## PHASE 5 — Shared UI Components (shadcn-style)
- [x] 5.1 `src/components/ui/Button.tsx` — variants: primary, secondary, ghost, danger
- [x] 5.2 `src/components/ui/Card.tsx` — Japandi card + Gothic glow card
- [x] 5.3 `src/components/ui/Input.tsx` — styled text input
- [x] 5.4 `src/components/ui/Textarea.tsx` — styled textarea
- [x] 5.5 `src/components/ui/Badge.tsx` — skill/status badges
- [x] 5.6 `src/components/ui/Spinner.tsx` — loading spinner
- [x] 5.7 `src/components/ui/Progress.tsx` — animated progress bar
- [x] 5.8 `src/components/ui/Skeleton.tsx` — loading skeleton blocks
- [x] 5.9 `src/components/ui/Toast.tsx` — toast notification system
- [x] 5.10 `src/components/ui/Modal.tsx` — dialog/modal wrapper

---

## PHASE 6 — Layout Components
- [x] 6.1 `src/components/layout/Navbar.tsx` — logo, nav links, theme toggle, user menu
- [x] 6.2 `src/components/layout/ProtectedRoute.tsx` — redirect to /login if not authed
- [x] 6.3 `src/components/layout/PageWrapper.tsx` — consistent page padding/max-width

---

## PHASE 7 — Feature Components
- [x] 7.1 `src/components/AuthForm.tsx` — login + register form with Firebase
- [x] 7.2 `src/components/ResumeUploader.tsx` — drag-and-drop PDF/DOCX uploader
- [x] 7.3 `src/components/JDInput.tsx` — textarea + URL input with scrape button
- [x] 7.4 `src/components/ProcessStepper.tsx` — animated pipeline stepper (6 steps)
- [x] 7.5 `src/components/ScoreRing.tsx` — circular score display (ATS / Match)
- [x] 7.6 `src/components/QuestionForm.tsx` — list of questions with answer inputs
- [x] 7.7 `src/components/SuggestionCard.tsx` — accept/reject toggle per suggestion
- [x] 7.8 `src/components/TemplateCard.tsx` — resume template preview + select
- [x] 7.9 `src/components/ResumePreview.tsx` — generated resume preview panel
- [x] 7.10 `src/components/SkillBadgeList.tsx` — matched/missing skill chips

---

## PHASE 8 — Hooks
- [x] 8.1 `src/hooks/useTheme.ts` — consume ThemeContext
- [x] 8.2 `src/hooks/useAuth.ts` — consume AuthContext
- [x] 8.3 `src/hooks/useSession.ts` — manage session state (create, poll, cache)
- [x] 8.4 `src/hooks/useResumeUpload.ts` — file validation + upload state
- [x] 8.5 `src/hooks/useJDInput.ts` — JD text/URL state + scrape logic
- [x] 8.6 `src/hooks/useProcess.ts` — pipeline step orchestration
- [x] 8.7 `src/hooks/useToast.ts` — toast helper

---

## PHASE 9 — Pages
- [x] 9.1 `src/pages/Landing.tsx` — hero, features, CTA buttons
- [x] 9.2 `src/pages/Login.tsx` — login form page
- [x] 9.3 `src/pages/Register.tsx` — register form page
- [x] 9.4 `src/pages/Onboarding.tsx` — first-login resume upload
- [x] 9.5 `src/pages/Dashboard.tsx` — two main cards: ATS Builder + Job Match
- [x] 9.6 `src/pages/JobMatch.tsx` — Step 1 resume select, Step 2 JD input
- [x] 9.7 `src/pages/ATSBuilder.tsx` — upload resume + JD → start session
- [x] 9.8 `src/pages/Process.tsx` — animated pipeline stepper page
- [x] 9.9 `src/pages/Results.tsx` — scores, gaps, matched/missing skills
- [x] 9.10 `src/pages/Questions.tsx` — question form page
- [x] 9.11 `src/pages/Suggestions.tsx` — suggestion cards with approve/reject
- [x] 9.12 `src/pages/Templates.tsx` — template selection page
- [x] 9.13 `src/pages/Download.tsx` — resume preview + download PDF

---

## PHASE 10 — Routing & App Entry
- [x] 10.1 `src/router.tsx` — all routes with ProtectedRoute wrappers
- [x] 10.2 `src/main.tsx` — app entry, providers (Theme, Auth, Router, Toaster)
- [x] 10.3 `src/App.tsx` — root component with router outlet

---

## PHASE 11 — Firebase Types & DB Structure
```
Firebase Realtime DB:
users/
  {userId}/
    profile: { name, email, createdAt }
    resumes/
      {resumeId}/
        fileName, uploadedAt, parsedData
    sessions/
      {sessionId}/
        createdAt, matchScore, atsScore, status
```

---

## API Endpoints Used
| Method | Path | Used In |
|--------|------|---------|
| POST | `/api/v1/analyze-resume` | Onboarding, ATSBuilder |
| POST | `/api/v1/analyze-jd` | JobMatch, ATSBuilder |
| POST | `/api/v1/sessions` | Process page |
| GET | `/api/v1/sessions/:id/questions` | Questions page |
| POST | `/api/v1/sessions/:id/answers` | Questions page |
| POST | `/api/v1/sessions/:id/suggestions/approve` | Suggestions page |
| POST | `/api/v1/sessions/:id/generate` | Templates page |
| GET | `/api/v1/sessions/:id/download` | Download page |
| GET | `/api/v1/health` | Dashboard |

---

## Design Tokens
| Token | Light (Japandi) | Dark (Gothic) |
|-------|----------------|---------------|
| Background | `#F5F5F0` | `#0D0D0D` |
| Card | `#FFFFFF` | `#1A1A1A` |
| Primary | `#4A6C6F` | `#7F5AF0` |
| Accent | `#C2A878` | `#E94560` |
| Text | `#2E2E2E` | `#EAEAEA` |
| Font | Inter / Noto Sans | Playfair Display |
