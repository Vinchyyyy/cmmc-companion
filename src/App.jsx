import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation.jsx'
import Home from './pages/Home.jsx'
import ControlLibrary from './pages/ControlLibrary.jsx'
import EvidenceLookup from './pages/EvidenceLookup.jsx'
import ControlDetail from './pages/ControlDetail.jsx'
import RelationshipExplorer from './pages/RelationshipExplorer.jsx'
import About from './pages/About.jsx'
import Faq from './pages/Faq.jsx'
import Changelog from './pages/Changelog.jsx'
import ArtifactMap from './pages/ArtifactMap.jsx'

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
  return (
    <div className="app">
      <FirstRunNotice />
      <Navigation />
      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/controls" element={<ControlLibrary />} />
          <Route path="/controls/:id" element={<ControlDetail />} />
          <Route path="/evidence" element={<EvidenceLookup />} />
          <Route path="/relationships" element={<RelationshipExplorer />} />
          <Route path="/artifact-map" element={<ArtifactMap />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<About />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
