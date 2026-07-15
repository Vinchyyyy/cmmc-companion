import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ChevronDown } from 'lucide-react'
import DashSidebar from '../components/DashSidebar.jsx'
import evidenceTypes from '../data/evidence/index.js'
import accessControlData from '../data/evidence/access-control.json'
import identAuthData from '../data/evidence/identification-authentication.json'
import auditData from '../data/evidence/audit-accountability.json'
import configMgmtData from '../data/evidence/configuration-management.json'
import encryptionData from '../data/evidence/system-communications-protection.json'
import incidentData from '../data/evidence/incident-response.json'
import riskData from '../data/evidence/risk-assessment.json'
import secAssessData from '../data/evidence/security-assessment.json'
import sysIntegrityData from '../data/evidence/system-information-integrity.json'
import personnelData from '../data/evidence/personnel-security.json'
import physicalData from '../data/evidence/physical-protection.json'
import trainingData from '../data/evidence/awareness-training.json'
import maintenanceData from '../data/evidence/maintenance.json'
import mediaData from '../data/evidence/media-protection.json'
import sharedData from '../data/evidence/shared.json'
import controls from '../data/controls/index.js'
import ControlLink from '../components/ControlLink.jsx'

// ── Category definitions ──────────────────────────────────────────────────────
// Each category maps to a set of evidence items by reference (using name as key)
// derived from the source data files — no mutation of source data.

const nameSet = (arr) => new Set(arr.map((e) => e.name))

const CATEGORIES = [
  { id: 'all',          label: 'All Evidence',                    names: null },
  { id: 'access',       label: 'Access & Identity',               names: nameSet([...accessControlData, ...identAuthData]) },
  { id: 'audit',        label: 'Audit & Logging',                 names: nameSet(auditData) },
  { id: 'config',       label: 'Configuration Management',        names: nameSet(configMgmtData) },
  { id: 'encryption',   label: 'Encryption & Boundary Protection',names: nameSet(encryptionData) },
  { id: 'incident',     label: 'Incident Response',               names: nameSet(incidentData) },
  { id: 'risk',         label: 'Risk & Assessment',               names: nameSet([...riskData, ...secAssessData]) },
  { id: 'integrity',    label: 'System & Information Integrity',  names: nameSet(sysIntegrityData) },
  { id: 'personnel',    label: 'Personnel & Physical',            names: nameSet([...personnelData, ...physicalData]) },
  { id: 'training',     label: 'Training & Awareness',            names: nameSet(trainingData) },
  { id: 'maintenance',  label: 'Maintenance Records',             names: nameSet(maintenanceData) },
  { id: 'media',        label: 'Media Protection',                names: nameSet(mediaData) },
  { id: 'shared',       label: 'Cross-Domain Evidence',           names: nameSet(sharedData) },
]

const FAMILIES = [
  'All',
  'Access Control',
  'Awareness and Training',
  'Audit and Accountability',
  'Configuration Management',
  'Identification and Authentication',
  'Incident Response',
  'Maintenance',
  'Media Protection',
  'Personnel Security',
  'Physical Protection',
  'Risk Assessment',
  'Security Assessment',
  'System and Communications Protection',
  'System and Information Integrity',
]

const familyById = Object.fromEntries(
  controls.map((c) => [c.id, c.family])
)

function EvidenceLibrary() {
  const [searchParams] = useSearchParams()
  const [search, setSearch]           = useState(searchParams.get('search') || '')
  const [familyFilter, setFamilyFilter] = useState('All')
  const [activeCategory, setActiveCategory] = useState('all')

  const term = search.trim().toLowerCase()

  const results = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.id === activeCategory)
    return evidenceTypes.filter((ev) => {
      // Category filter
      if (cat && cat.names && !cat.names.has(ev.name)) return false
      // Family filter
      if (familyFilter !== 'All') {
        if (!ev.likelyControls.some((id) => familyById[id] === familyFilter)) return false
      }
      // Search
      if (term) {
        return (
          ev.name.toLowerCase().includes(term) ||
          ev.description.toLowerCase().includes(term) ||
          ev.reasoning.toLowerCase().includes(term) ||
          ev.likelyControls.some((id) => id.toLowerCase().includes(term))
        )
      }
      return true
    })
  }, [activeCategory, familyFilter, term])

  // Per-category counts (respect family + search filters but not category filter)
  const categoryCounts = useMemo(() => {
    const counts = {}
    for (const cat of CATEGORIES) {
      counts[cat.id] = evidenceTypes.filter((ev) => {
        if (cat.names && !cat.names.has(ev.name)) return false
        if (familyFilter !== 'All') {
          if (!ev.likelyControls.some((id) => familyById[id] === familyFilter)) return false
        }
        if (term) {
          return (
            ev.name.toLowerCase().includes(term) ||
            ev.description.toLowerCase().includes(term) ||
            ev.reasoning.toLowerCase().includes(term) ||
            ev.likelyControls.some((id) => id.toLowerCase().includes(term))
          )
        }
        return true
      }).length
    }
    return counts
  }, [familyFilter, term])

  const activeCategoryLabel = CATEGORIES.find((c) => c.id === activeCategory)?.label ?? 'All Evidence'

  return (
    <div className="dash-root">
      <DashSidebar />
      <div className="ev-lib dash-main">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="ev-lib-header">
        <div className="ev-lib-header-text">
          <h1 className="ev-lib-title">Evidence Library</h1>
          <p className="ev-lib-subtitle muted">
            Browse common evidence types, likely controls, and assessor review context.
          </p>
        </div>
        <div className="ev-lib-filters">
          <div className="ev-lib-search-wrap">
            <Search size={14} className="ev-lib-search-icon" />
            <input
              className="ev-lib-search"
              type="text"
              placeholder="Search by name, control, or reasoning…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search evidence types"
            />
          </div>
          <div className="ev-lib-family-select-wrap">
            <select
              className="ev-lib-family-select"
              value={familyFilter}
              onChange={(e) => setFamilyFilter(e.target.value)}
              aria-label="Filter by CMMC family"
            >
              {FAMILIES.map((f) => (
                <option key={f} value={f}>{f === 'All' ? 'All Families' : f}</option>
              ))}
            </select>
            <ChevronDown size={13} className="ev-lib-family-select-icon" />
          </div>
        </div>
      </div>

      {/* ── Workspace ──────────────────────────────────────────────────────── */}
      <div className="ev-lib-workspace">

        {/* Left: category nav */}
        <nav className="ev-lib-cat-nav" aria-label="Evidence categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`ev-lib-cat-btn${activeCategory === cat.id ? ' ev-lib-cat-btn--active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              aria-current={activeCategory === cat.id ? 'true' : undefined}
            >
              <span className="ev-lib-cat-label">{cat.label}</span>
              <span className="ev-lib-cat-count">{categoryCounts[cat.id]}</span>
            </button>
          ))}
        </nav>

        {/* Right: results */}
        <div className="ev-lib-results">
          <div className="ev-lib-results-header">
            <h2 className="ev-lib-results-heading">{activeCategoryLabel}</h2>
            <span className="ev-lib-results-count muted">
              {results.length} evidence type{results.length !== 1 ? 's' : ''}
            </span>
          </div>

          {results.length === 0 ? (
            <p className="muted ev-lib-empty">No matching evidence types found.</p>
          ) : (
            <ul className="ev-lib-card-list">
              {results.map((ev, i) => (
                <li
                  key={ev.name}
                  className="ev-lib-card"
                  style={{ borderBottom: i < results.length - 1 ? '1px solid var(--dash-border)' : 'none' }}
                >
                  <h3 className="ev-lib-card-name">{ev.name}</h3>
                  <p className="ev-lib-card-desc">{ev.description}</p>
                  <div className="ev-lib-card-meta">
                    <div className="ev-lib-card-controls">
                      <span className="ev-lib-card-meta-label">Likely Controls</span>
                      <div className="ev-lib-card-chips">
                        {ev.likelyControls.map((id) => (
                          <ControlLink key={id} id={id} className="ev-lib-chip" />
                        ))}
                      </div>
                    </div>
                    <div className="ev-lib-card-reasoning">
                      <span className="ev-lib-card-meta-label">Assessor Context</span>
                      <p className="ev-lib-card-reasoning-text">{ev.reasoning}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>{/* /ev-lib-workspace */}
      </div>
    </div>
  )
}

export default EvidenceLibrary
