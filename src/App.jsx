import { lazy, Suspense, useState } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import PageLoadBoundary from './components/PageLoadBoundary.jsx'
import Navigation from './components/Navigation.jsx'
import Home from './pages/Home.jsx'
const ControlLibrary = lazy(() => import('./pages/ControlLibrary.jsx'))
const EvidenceLookup = lazy(() => import('./pages/EvidenceLookup.jsx'))
const ControlDetail = lazy(() => import('./pages/ControlDetail.jsx'))
const RelationshipExplorer = lazy(() => import('./pages/RelationshipExplorer.jsx'))
const About = lazy(() => import('./pages/About.jsx'))
const Changelog = lazy(() => import('./pages/Changelog.jsx'))
const ArtifactMap = lazy(() => import('./pages/ArtifactMap.jsx'))
const DibcacMode = lazy(() => import('./pages/DibcacMode.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const OscProfile = lazy(() => import('./pages/OscProfile.jsx'))
const CrmResponsibilityMapper = lazy(() => import('./pages/CrmResponsibilityMapper.jsx'))

const NOTICE_VERSION = 1
const NOTICE_KEY = 'cmmc-notice-version'

function FirstRunNotice() {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(NOTICE_KEY) !== String(NOTICE_VERSION)
  )
  const [acknowledged, setAcknowledged] = useState(false)

  if (!visible) return null

  const handleContinue = () => {
    localStorage.setItem(NOTICE_KEY, String(NOTICE_VERSION))
    setVisible(false)
  }

  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="notice-title">
      <div className="confirm-dialog">
        <h2 id="notice-title">Privacy &amp; Usage Notice</h2>
        <p>Please review the following before using CMMC Companion:</p>
        <ul>
          <li>Files are never uploaded, transmitted, or stored by CMMC Companion.</li>
          <li>Artifact entries are metadata references only and do not link to, contain, or store actual files.</li>
          <li>All assessment data remains in your browser unless you explicitly export it.</li>
          <li>Do not enter CUI, SSPs, assessment artifacts, inventories, screenshots, network diagrams, or other sensitive documentation.</li>
          <li>CMMC Companion is an independent workflow-support tool and is not an official assessment platform.</li>
        </ul>
        <div style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
            <input
              id="notice-ack"
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              style={{ marginTop: '3px', flexShrink: 0 }}
            />
            I have read and understand the data handling, privacy, storage limitations, and intended use of CMMC Companion.
          </label>
        </div>
        <div className="confirm-dialog-buttons">
          <a
            href="/about#data-handling"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button type="button">View Full Details</button>
          </a>
          <button type="button" disabled={!acknowledged} onClick={handleContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const location = useLocation()
  // Redesigned pages render their own violet-themed <DashSidebar/> and hide the
  // legacy shared <Navigation/>. Extend this list as more pages get redesigned.
  const isRedesigned = location.pathname === '/' || location.pathname.startsWith('/controls') || location.pathname.startsWith('/evidence') || location.pathname.startsWith('/relationships') || location.pathname.startsWith('/dibcac-mode') || location.pathname.startsWith('/artifact-map') || location.pathname.startsWith('/osc-profile') || location.pathname.startsWith('/global-evidence') || location.pathname.startsWith('/settings') || location.pathname.startsWith('/about') || location.pathname.startsWith('/faq') || location.pathname.startsWith('/changelog')
  return (
    <div className="app">
      <FirstRunNotice />
      {!isRedesigned && <Navigation />}
      <main className="content">
        <PageLoadBoundary key={location.pathname}>
        <Suspense fallback={<p role="status" style={{ padding: '2rem' }}>Loading page…</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/controls" element={<ControlLibrary />} />
          <Route path="/controls/:id" element={<ControlDetail />} />
          <Route path="/evidence" element={<EvidenceLookup />} />
          <Route path="/relationships" element={<RelationshipExplorer />} />
          <Route path="/artifact-map" element={<ArtifactMap />} />
          <Route path="/osc-profile" element={<OscProfile />} />
          <Route path="/osc-profile/providers/:providerId/crm-mapper" element={<CrmResponsibilityMapper />} />
          <Route path="/global-evidence" element={<Navigate to="/osc-profile?tab=evidence" replace />} />
          <Route path="/dibcac-mode" element={<DibcacMode />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<About />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Routes>
        </Suspense>
        </PageLoadBoundary>
      </main>
    </div>
  )
}

export default App
