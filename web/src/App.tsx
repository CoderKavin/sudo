import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import ScanPage from './pages/ScanPage'

export default function App() {
  const location = useLocation()

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Ambient mesh gradient — shifts color subtly */}
      <div className="mesh-gradient" />

      {/* Floating orbs for depth */}
      <div className="orb" style={{ width: 600, height: 600, top: '-15%', left: '-10%', background: 'rgba(124,106,239,0.07)' }} />
      <div className="orb" style={{ width: 500, height: 500, bottom: '-10%', right: '-10%', background: 'rgba(192,132,252,0.05)', animationDelay: '-4s' }} />
      <div className="orb" style={{ width: 400, height: 400, top: '40%', left: '60%', background: 'rgba(59,130,246,0.04)', animationDelay: '-8s' }} />

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
