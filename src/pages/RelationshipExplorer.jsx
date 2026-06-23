import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import controls from '../data/controls/index.js'
import relationships from '../data/relationships/index.js'
import evidenceTypes from '../data/evidence/index.js'
import ControlLink from '../components/ControlLink.jsx'
import { compareIds } from '../utils/sort'

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

const sortByOtherControl = (items, key) =>
  items.slice().sort((a, b) => compareIds(a[key], b[key]))

// ── Launcher helpers ──────────────────────────────────────────────────────────

function buildFamilyStats(allControls, allRelationships) {
  const map = new Map()
  for (const c of allControls) {
    const fam = c.family || 'Uncategorized'
    if (!map.has(fam)) map.set(fam, { name: fam, controlCount: 0, relCount: 0 })
    map.get(fam).controlCount++
  }
  for (const r of allRelationships) {
    const src = allControls.find((c) => c.id === r.sourceControl)
    if (src?.family && map.has(src.family)) map.get(src.family).relCount++
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function getControlCounts(id, allRelationships, allEvidence) {
  let prereqs = 0, supp = 0, suppBy = 0
  for (const r of allRelationships) {
    if (r.relationshipType === 'prerequisite' && r.targetControl === id) prereqs++
    if (r.relationshipType === 'supports' && r.sourceControl === id) supp++
    if (r.relationshipType === 'supports' && r.targetControl === id) suppBy++
  }
  const evidence = allEvidence.filter((e) => e.likelyControls?.includes(id)).length
  return { prereqs, supp, suppBy, evidence, total: prereqs + supp + suppBy }
}

// ── Family tile ───────────────────────────────────────────────────────────────

function FamilyTile({ stat, onClick }) {
  return (
    <button type="button" className="rel-family-tile" onClick={onClick}>
      <div className="rel-family-tile-name">{stat.name}</div>
      <div className="rel-family-tile-meta">
        <span className="rel-family-tile-count">{stat.controlCount} control{stat.controlCount !== 1 ? 's' : ''}</span>
        {stat.relCount > 0 && (
          <span className="rel-family-tile-rels"> · {stat.relCount} rel.</span>
        )}
      </div>
    </button>
  )
}

// ── Control tile ──────────────────────────────────────────────────────────────

function ControlTile({ control, allRelationships, allEvidence, onClick }) {
  const c = getControlCounts(control.id, allRelationships, allEvidence)
  const parts = []
  if (c.prereqs > 0)  parts.push(`${c.prereqs} prereq${c.prereqs !== 1 ? 's' : ''}`)
  if (c.supp > 0)     parts.push(`${c.supp} supports`)
  if (c.suppBy > 0)   parts.push(`${c.suppBy} supported by`)
  if (c.evidence > 0) parts.push(`${c.evidence} evidence`)
  return (
    <button type="button" className="rel-control-tile" onClick={onClick}>
      <div className="rel-control-tile-id mono">{control.id}</div>
      <div className="rel-control-tile-title">{control.title}</div>
      {c.total > 0 || c.evidence > 0 ? (
        <div className="rel-control-tile-counts">
          <span className="rel-control-tile-total">{c.total + c.evidence} rel.</span>
          {parts.map((p) => <span key={p} className="rel-control-tile-part"> · {p}</span>)}
        </div>
      ) : (
        <div className="rel-control-tile-counts rel-control-tile-counts--none">No relationships documented.</div>
      )}
    </button>
  )
}

const getControl = (id) => controls.find((c) => c.id === id)

const PREVIEW_LEN = 180

// ── Relationship card modal ───────────────────────────────────────────────────

function RelModal({ entry, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const { rel, idKey, groupLabel } = entry
  const otherId = rel[idKey]
  const other   = getControl(otherId)

  return (
    <div
      className="rel-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Relationship detail: ${otherId}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rel-modal" ref={dialogRef} tabIndex={-1}>
        <div className="rel-modal-header">
          <span className="rel-modal-group-label">{groupLabel}</span>
          <button className="rel-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="rel-modal-id mono">
          <ControlLink id={otherId} />
        </div>
        <div className="rel-modal-title">{other ? other.title : otherId}</div>
        {other?.family && (
          <div className="rel-modal-family muted">{other.family}</div>
        )}
        {rel.reasoning && (
          <div className="rel-modal-body">
            <div className="rel-modal-body-label">Relationship context</div>
            <p className="rel-modal-reasoning">{rel.reasoning}</p>
          </div>
        )}
        <div className="rel-modal-actions">
          <Link
            to={`/controls/${encodeURIComponent(otherId)}`}
            className="rel-modal-action-link"
            onClick={onClose}
          >
            View control detail →
          </Link>
          <Link
            to={`/relationships?control=${encodeURIComponent(otherId)}`}
            className="rel-modal-action-link"
            onClick={onClose}
          >
            Explore relationships →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Relationship card ─────────────────────────────────────────────────────────

function RelCard({ rel, idKey, groupLabel, onReadMore }) {
  const otherId = rel[idKey]
  const other   = getControl(otherId)
  const preview = rel.reasoning
    ? rel.reasoning.length > PREVIEW_LEN
      ? rel.reasoning.slice(0, PREVIEW_LEN).trimEnd() + '…'
      : rel.reasoning
    : null
  const hasMore = rel.reasoning && rel.reasoning.length > PREVIEW_LEN

  return (
    <div className="rel-board-card">
      <div className="rel-board-card-id">
        <ControlLink id={otherId} />
      </div>
      <div className="rel-board-card-title">{other ? other.title : otherId}</div>
      {preview && (
        <p className="rel-board-card-reason">{preview}</p>
      )}
      <div className="rel-board-card-actions">
        {hasMore && (
          <button
            className="rel-board-card-readmore"
            onClick={() => onReadMore({ rel, idKey, groupLabel })}
          >
            Read more
          </button>
        )}
        <Link
          to={`/relationships?control=${encodeURIComponent(otherId)}`}
          className="rel-board-card-link"
        >
          Explore →
        </Link>
      </div>
    </div>
  )
}

// ── Relationship column ───────────────────────────────────────────────────────

function RelColumn({ heading, subtitle, items, idKey, onReadMore }) {
  return (
    <div className="rel-board-col">
      <div className="rel-board-col-header">
        <h2 className="rel-board-col-heading">{heading}</h2>
        <span className="rel-board-col-count">{items.length}</span>
      </div>
      <p className="rel-board-col-sub muted">{subtitle}</p>
      <div className="rel-board-col-cards">
        {items.length === 0 ? (
          <p className="muted rel-board-empty">None documented.</p>
        ) : (
          items.map((r, i) => (
            <RelCard
              key={i}
              rel={r}
              idKey={idKey}
              groupLabel={heading}
              onReadMore={onReadMore}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function RelationshipExplorer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('control') || ''

  const [search, setSearch]             = useState('')
  const [familyFilter, setFamilyFilter] = useState('All')
  const [launcherFamily, setLauncherFamily] = useState(null)   // launcher nav state
  const [modalEntry, setModalEntry]     = useState(null)

  // Pre-computed family stats for the tile launcher (stable — control/rel data is static)
  const familyStats = useMemo(() => buildFamilyStats(controls, relationships), [])

  // Controls shown in the launcher's Step 2 tile grid
  const launcherControls = useMemo(
    () => {
      if (!launcherFamily) return []
      const t = search.trim().toLowerCase()
      return controls
        .filter((c) => {
          if (c.family !== launcherFamily) return false
          if (t) {
            return (
              c.id.toLowerCase().includes(t) ||
              c.title.toLowerCase().includes(t) ||
              (c.plainEnglish && c.plainEnglish.toLowerCase().includes(t))
            )
          }
          return true
        })
        .slice()
        .sort(compareIds)
    },
    [launcherFamily, search]
  )

  useEffect(() => {
    if (selectedId && !controls.find((c) => c.id === selectedId)) {
      setSearchParams({})
    }
  }, [selectedId, setSearchParams])

  const handleSelectControl = (e) => {
    const value = e.target.value
    if (value) setSearchParams({ control: value })
    else setSearchParams({})
  }

  const term = search.trim().toLowerCase()

  const filteredControls = controls
    .filter((c) => {
      if (familyFilter !== 'All' && c.family !== familyFilter) return false
      if (term) {
        return (
          c.id.toLowerCase().includes(term) ||
          c.title.toLowerCase().includes(term) ||
          (c.plainEnglish && c.plainEnglish.toLowerCase().includes(term))
        )
      }
      return true
    })
    .slice()
    .sort(compareIds)

  const selectedControl = controls.find((c) => c.id === selectedId)
  const dropdownOptions =
    selectedControl && !filteredControls.find((c) => c.id === selectedId)
      ? [selectedControl, ...filteredControls]
      : filteredControls

  const prerequisites = selectedId
    ? sortByOtherControl(
        relationships.filter(
          (r) => r.targetControl === selectedId && r.relationshipType === 'prerequisite'
        ),
        'sourceControl'
      )
    : []

  const supports = selectedId
    ? sortByOtherControl(
        relationships.filter(
          (r) => r.sourceControl === selectedId && r.relationshipType === 'supports'
        ),
        'targetControl'
      )
    : []

  const supportedBy = selectedId
    ? sortByOtherControl(
        relationships.filter(
          (r) => r.targetControl === selectedId && r.relationshipType === 'supports'
        ),
        'sourceControl'
      )
    : []

  const supportingEvidence = selectedId
    ? evidenceTypes.filter((e) => e.likelyControls.includes(selectedId))
    : []

  const totalRelationships = prerequisites.length + supports.length + supportedBy.length

  return (
    <div className="rel-explorer">

      {/* ── Filters / header ───────────────────────────────────────────────── */}
      <div className="rel-explorer-header">
        <h1 className="rel-explorer-title">Relationship Explorer</h1>
        <div className="rel-explorer-controls">
          <input
            className="rel-explorer-search"
            type="text"
            placeholder="Search by ID, title, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search controls"
          />
          <select
            className="rel-explorer-family"
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
            aria-label="Filter by family"
          >
            {FAMILIES.map((f) => (
              <option key={f} value={f}>{f === 'All' ? 'All Families' : f}</option>
            ))}
          </select>
          <select
            className="rel-explorer-picker"
            value={selectedId}
            onChange={handleSelectControl}
            aria-label="Select a control"
          >
            <option value="">— Select a control —</option>
            {dropdownOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.id} — {c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Tile launcher (no control selected) ───────────────────────────── */}
      {!selectedId ? (
        <div className="rel-launcher">
          <p className="rel-launcher-subtitle muted">
            Start with a family, choose a control, then review how related controls and evidence connect.
          </p>

          {/* Step 1 — family grid */}
          <div className="rel-launcher-step">
            <div className="rel-launcher-step-label">
              Step 1 — Choose a family
              {launcherFamily && (
                <button
                  type="button"
                  className="rel-launcher-back"
                  onClick={() => setLauncherFamily(null)}
                >
                  ← All families
                </button>
              )}
            </div>
            {!launcherFamily ? (
              <div className="rel-family-grid">
                {familyStats.map((stat) => (
                  <FamilyTile
                    key={stat.name}
                    stat={stat}
                    onClick={() => setLauncherFamily(stat.name)}
                  />
                ))}
              </div>
            ) : (
              <div className="rel-launcher-selected-family">
                <span className="rel-launcher-family-badge">{launcherFamily}</span>
              </div>
            )}
          </div>

          {/* Step 2 — control grid (only when a family is chosen) */}
          {launcherFamily && (
            <div className="rel-launcher-step">
              <div className="rel-launcher-step-label">Step 2 — Choose a control</div>
              {launcherControls.length === 0 ? (
                <p className="muted">No controls match your search in this family.</p>
              ) : (
                <div className="rel-control-grid">
                  {launcherControls.map((c) => (
                    <ControlTile
                      key={c.id}
                      control={c}
                      allRelationships={relationships}
                      allEvidence={evidenceTypes}
                      onClick={() => setSearchParams({ control: c.id })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── Selected-control summary band ──────────────────────────────── */}
          <div className="rel-control-summary">
            <div className="rel-control-summary-main">
              <div className="rel-control-summary-id mono">
                <ControlLink id={selectedId} />
              </div>
              <div className="rel-control-summary-title">{selectedControl?.title}</div>
              {selectedControl?.family && (
                <div className="rel-control-summary-family muted">{selectedControl.family}</div>
              )}
              {selectedControl?.plainEnglish && (
                <p className="rel-control-summary-plain">{selectedControl.plainEnglish}</p>
              )}
            </div>
            <div className="rel-control-summary-meta">
              <div className="rel-control-summary-counts">
                <span className="rel-control-summary-stat">
                  <span className="rel-control-summary-stat-val">{totalRelationships}</span>
                  <span className="rel-control-summary-stat-label">Relationships</span>
                </span>
                <span className="rel-control-summary-divider" aria-hidden="true">·</span>
                <span className="rel-control-summary-stat">
                  <span className="rel-control-summary-stat-val">{prerequisites.length}</span>
                  <span className="rel-control-summary-stat-label">Prerequisites</span>
                </span>
                <span className="rel-control-summary-divider" aria-hidden="true">·</span>
                <span className="rel-control-summary-stat">
                  <span className="rel-control-summary-stat-val">{supports.length}</span>
                  <span className="rel-control-summary-stat-label">Supports</span>
                </span>
                <span className="rel-control-summary-divider" aria-hidden="true">·</span>
                <span className="rel-control-summary-stat">
                  <span className="rel-control-summary-stat-val">{supportedBy.length}</span>
                  <span className="rel-control-summary-stat-label">Supported By</span>
                </span>
                <span className="rel-control-summary-divider" aria-hidden="true">·</span>
                <span className="rel-control-summary-stat">
                  <span className="rel-control-summary-stat-val">{supportingEvidence.length}</span>
                  <span className="rel-control-summary-stat-label">Evidence</span>
                </span>
              </div>
              <Link
                to={`/controls/${encodeURIComponent(selectedId)}`}
                className="rel-control-summary-link"
              >
                View control detail →
              </Link>
              <button
                type="button"
                className="rel-browse-btn"
                onClick={() => setSearchParams({})}
              >
                ← Browse controls
              </button>
            </div>
          </div>

          {/* ── Relationship columns board ─────────────────────────────────── */}
          <div className="rel-board">
            <RelColumn
              heading="Prerequisites"
              subtitle="Controls that must be in place first."
              items={prerequisites}
              idKey="sourceControl"
              onReadMore={setModalEntry}
            />
            <RelColumn
              heading="Supports"
              subtitle="Controls this one helps enable."
              items={supports}
              idKey="targetControl"
              onReadMore={setModalEntry}
            />
            <RelColumn
              heading="Supported By"
              subtitle="Controls that strengthen this one."
              items={supportedBy}
              idKey="sourceControl"
              onReadMore={setModalEntry}
            />
          </div>

          {/* ── Supporting Evidence (below board) ─────────────────────────── */}
          <section className="rel-evidence-section">
            <div className="rel-evidence-section-header">
              <h2 className="rel-evidence-section-heading">Supporting Evidence</h2>
              <span className="rel-evidence-section-count muted">
                {supportingEvidence.length} evidence type{supportingEvidence.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="muted rel-evidence-section-sub">
              Evidence types commonly reviewed alongside this control.
            </p>
            {supportingEvidence.length === 0 ? (
              <p className="muted">None documented for this control.</p>
            ) : (
              <div className="rel-evidence-grid">
                {supportingEvidence.map((e) => (
                  <div key={e.name} className="rel-evidence-card">
                    <div className="rel-evidence-card-name">{e.name}</div>
                    {e.description && (
                      <p className="rel-evidence-card-desc">{e.description}</p>
                    )}
                    {e.reasoning && (
                      <div className="rel-evidence-card-reasoning">
                        <span className="rel-evidence-card-reasoning-label">Review context</span>
                        <p className="rel-evidence-card-reasoning-text">{e.reasoning}</p>
                      </div>
                    )}
                    {e.likelyControls?.length > 0 && (
                      <div className="rel-evidence-card-controls">
                        {e.likelyControls.map((id) => (
                          <ControlLink key={id} id={id} className="rel-evidence-chip" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {modalEntry && (
        <RelModal entry={modalEntry} onClose={() => setModalEntry(null)} />
      )}

    </div>
  )
}

export default RelationshipExplorer
