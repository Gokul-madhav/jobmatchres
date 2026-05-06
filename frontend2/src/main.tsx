import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import DevDashboard from './pages/DevDashboard'
import ResumeAnalyzer from './pages/ResumeAnalyzer'
import JDAnalyzer from './pages/JDAnalyzer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ResumeAnalyzer />} />
        <Route path="/jd" element={<JDAnalyzer />} />
        <Route path="/dev" element={<DevDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
