import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import ScanPage from './pages/ScanPage'

export default function App() {
  const location = useLocation()

  return (
    <div className="noise relative min-h-screen bg-[var(--bg)]">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[800px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.08),transparent)] z-[1]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-[400px] bg-[radial-gradient(ellipse_60%_40%_at_50%_120%,rgba(99,102,241,0.04),transparent)] z-[1]" />

      {/* Grid */}
      <div className="grid-bg fixed inset-0 pointer-events-none z-0 opacity-60" />

      {/* Content */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  )
}
