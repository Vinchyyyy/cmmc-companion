import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ChevronDown, ArrowRight, X } from 'lucide-react'
import DashSidebar from '../components/DashSidebar.jsx'
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

// ── Flow diagram — real flowchart with connector lines ────────────────────────

const REL_TONE = { Prerequisite: '#A78BFA', 'Supported By': '#22D3EE', Supports: '#3FC98A' }

function RelPopover({ data, onClose, onExplore }) {
  const popRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!data) return null
  const { item, x, y } = data

  return (
    <div
      ref={popRef}
      className="rel-popover"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label={`Relationship detail: ${item.id}`}
    >
      <div className="rel-popover-header">
        <span className="rel-popover-type" style={{ color: REL_TONE[item.type] || 'var(--dash-accent2)' }}>{item.type || 'Relationship'}</span>
        <button onClick={onClose} aria-label="Close"><X size={14} /></button>
      </div>
      <div className="rel-popover-id mono"><ControlLink id={item.id} className="rel-popover-id-link" /></div>
      <div className="rel-popover-title">{item.title}</div>
      {item.reason && (
        <div className="rel-popover-body">
          <div className="rel-popover-body-label">Relationship Context</div>
          <p className="rel-popover-reasoning">{item.reason}</p>
        </div>
      )}
      <div className="rel-popover-actions">
        <Link to={`/controls/${encodeURIComponent(item.id)}`} className="rel-popover-action" onClick={onClose}>
          View control detail <ArrowRight size={11} />
        </Link>
        <button className="rel-popover-action" onClick={() => { onExplore(item.id); onClose() }}>
          Explore relationships <ArrowRight size={11} />
        </button>
      </div>
    </div>
  )
}

function FlowNode({ item, tone, style, onClick }) {
  return (
    <button type="button" className="rel-flow-node" style={{ ...style, borderLeftColor: tone }} onClick={onClick}>
      <div className="rel-flow-node-top">
        <span className="mono rel-flow-node-id">{item.id}</span>
        {item.type && <span className="rel-flow-node-type" style={{ color: tone }}>{item.type}</span>}
      </div>
      <div className="rel-flow-node-title">{item.title}</div>
    </button>
  )
}

function FlowSideLabel({ label, style }) {
  return <div className="rel-flow-side-label" style={style}>{label}</div>
}

const CARD_W = 420, CARD_H = 100, GAP_Y = 28, PITCH = CARD_H + GAP_Y
const CENTER_W = 480, CENTER_H = 260
const GAP_X = 160, TRUNK_LEN = 60
// Floor width so the layout never crushes columns into each other on narrow
// screens — below this, the diagram scrolls horizontally instead of shrinking.
const MIN_CANVAS_W = CARD_W * 2 + CENTER_W + GAP_X * 2

// Measures the live rendered width of the diagram's wrapping container via
// ResizeObserver, same pattern used for the Home dashboard's waffle grid and
// inheritance heatmap — the diagram's horizontal layout is derived from this
// instead of a hardcoded pixel constant, so it stretches with the browser.
function useContainerWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width)
    })
    observer.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

function FlowDiagram({ selectedControl, leftItems, rightItems, onExplore }) {
  const [popover, setPopover] = useState(null)
  const [wrapRef, measuredWidth] = useContainerWidth()

  const canvasW = Math.max(measuredWidth, MIN_CANVAS_W)
  const leftX = 0
  const rightX = canvasW - CARD_W
  const centerX = (canvasW - CENTER_W) / 2

  const leftCount = leftItems.length
  const rightCount = rightItems.length
  const leftStackH = leftCount > 0 ? leftCount * PITCH - GAP_Y : 0
  const rightStackH = rightCount > 0 ? rightCount * PITCH - GAP_Y : 0
  const canvasH = Math.max(leftStackH, rightStackH, CENTER_H) + 60

  const leftStartY = (canvasH - leftStackH) / 2
  const rightStartY = (canvasH - rightStackH) / 2
  const centerY = (canvasH - CENTER_H) / 2
  const mergeY = centerY + CENTER_H / 2

  const leftPositions = leftItems.map((item, i) => ({ item, y: leftStartY + i * PITCH }))
  const rightPositions = rightItems.map((item, i) => ({ item, y: rightStartY + i * PITCH }))

  return (
    <div ref={wrapRef} className="rel-flow-measure">
    <div className="rel-flow-canvas" style={{ width: canvasW, height: canvasH }} onClick={() => setPopover(null)}>
      <svg width={canvasW} height={canvasH} className="rel-flow-svg">
        <defs>
          <marker id="relArrow" markerWidth="11" markerHeight="11" refX="8" refY="5.5" orient="auto">
            <path d="M1,1 Q3.7,5.5 1,10 L10,5.5 Z" fill="#8B7CF6" />
          </marker>
        </defs>

        {leftCount > 0 && leftPositions.map(({ item, y }) => {
          const x1 = leftX + CARD_W, y1 = y + CARD_H / 2
          const x2 = centerX - TRUNK_LEN, y2 = mergeY
          const midX = (x1 + x2) / 2
          return (
            <path key={item.id + item.type} d={`M ${x1},${y1} C ${midX},${y1} ${midX},${y2} ${x2},${y2}`}
              fill="none" stroke="#6B5FBF" strokeOpacity="0.4" strokeWidth="4" strokeLinecap="round" />
          )
        })}
        {leftCount > 0 && (
          <path d={`M ${centerX - TRUNK_LEN},${mergeY} L ${centerX - 8},${mergeY}`}
            fill="none" stroke="#8B7CF6" strokeWidth="7" strokeLinecap="round" markerEnd="url(#relArrow)" />
        )}

        {rightCount > 0 && (
          <path d={`M ${centerX + CENTER_W},${mergeY} L ${centerX + CENTER_W + TRUNK_LEN},${mergeY}`}
            fill="none" stroke="#8B7CF6" strokeWidth="7" strokeLinecap="round" />
        )}
        {rightCount > 0 && rightPositions.map(({ item, y }) => {
          const x1 = centerX + CENTER_W + TRUNK_LEN, y1 = mergeY
          const x2 = rightX, y2 = y + CARD_H / 2
          const midX = (x1 + x2) / 2
          return (
            <path key={item.id} d={`M ${x1},${y1} C ${midX},${y1} ${midX},${y2} ${x2 - 8},${y2}`}
              fill="none" stroke="#6B5FBF" strokeOpacity="0.4" strokeWidth="4" strokeLinecap="round" markerEnd="url(#relArrow)" />
          )
        })}
      </svg>

      {leftPositions.map(({ item, y }) => (
        <FlowNode
          key={item.id + item.type}
          item={item}
          tone={REL_TONE[item.type] || 'var(--dash-accent2)'}
          style={{ left: leftX, top: y, width: CARD_W, height: CARD_H }}
          onClick={(e) => { e.stopPropagation(); setPopover({ item, x: leftX + CARD_W + 16, y }) }}
        />
      ))}
      {leftCount === 0 && (
        <p className="muted rel-flow-empty" style={{ left: leftX, top: centerY, width: CARD_W }}>None documented.</p>
      )}

      <div className="rel-flow-center" style={{ left: centerX, top: centerY, width: CENTER_W, height: CENTER_H }}>
        <span className="mono rel-flow-center-id">{selectedControl.id}</span>
        <div className="rel-flow-center-title">{selectedControl.title}</div>
        <div className="rel-flow-center-family">{selectedControl.family}</div>
        {selectedControl.plainEnglish && (
          <div className="rel-flow-center-desc">{selectedControl.plainEnglish}</div>
        )}
      </div>

      {rightPositions.map(({ item, y }) => (
        <FlowNode
          key={item.id}
          item={item}
          tone={REL_TONE[item.type] || '#3FC98A'}
          style={{ left: rightX, top: y, width: CARD_W, height: CARD_H }}
          onClick={(e) => { e.stopPropagation(); setPopover({ item, x: rightX - 316, y }) }}
        />
      ))}
      {rightCount === 0 && (
        <p className="muted rel-flow-empty" style={{ left: rightX, top: centerY, width: CARD_W }}>None documented.</p>
      )}

      {leftCount > 0 && <FlowSideLabel label="Feeds Into This Control" style={{ left: leftX, top: leftStartY - 26 }} />}
      {rightCount > 0 && <FlowSideLabel label="This Control Enables" style={{ left: rightX, top: rightStartY - 26 }} />}

      <RelPopover data={popover} onClose={() => setPopover(null)} onExplore={onExplore} />
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

  // Flow diagram data: left side is everything that feeds into the selected
  // control (prerequisites + supported-by), right side is what it enables.
  const flowLeftItems = [
    ...prerequisites.map((r) => ({ id: r.sourceControl, title: getControl(r.sourceControl)?.title ?? r.sourceControl, type: 'Prerequisite', reason: r.reasoning })),
    ...supportedBy.map((r) => ({ id: r.sourceControl, title: getControl(r.sourceControl)?.title ?? r.sourceControl, type: 'Supported By', reason: r.reasoning })),
  ]
  const flowRightItems = supports.map((r) => ({ id: r.targetControl, title: getControl(r.targetControl)?.title ?? r.targetControl, type: 'Supports', reason: r.reasoning }))

  const handleExplore = (controlId) => setSearchParams({ control: controlId })

  return (
    <div className="dash-root">
      <DashSidebar />
      <div className="rel-explorer dash-main">

      {/* ── Filters / header ───────────────────────────────────────────────── */}
      <div className="rel-explorer-header">
        <div>
          <h1 className="rel-explorer-title">Relationship Explorer</h1>
          <p className="rel-explorer-subtitle muted">Start with a family, choose a control, then trace how it connects to everything else.</p>
        </div>
        <div className="rel-explorer-controls">
          <div className="rel-explorer-search-wrap">
            <Search size={14} className="rel-explorer-search-icon" />
            <input
              className="rel-explorer-search"
              type="text"
              placeholder="Search by ID, title, or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search controls"
            />
          </div>
          <div className="rel-explorer-family-wrap">
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
            <ChevronDown size={13} className="rel-explorer-family-icon" />
          </div>
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

      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <div className="rel-breadcrumb">
        <button
          type="button"
          className="rel-breadcrumb-item"
          onClick={() => { setSearchParams({}); setLauncherFamily(null) }}
        >
          All Families
        </button>
        {(launcherFamily || selectedControl) && (
          <>
            <ArrowRight size={11} className="rel-breadcrumb-sep" />
            <button
              type="button"
              className="rel-breadcrumb-item"
              onClick={() => { setSearchParams({}); setLauncherFamily(selectedControl?.family ?? launcherFamily) }}
            >
              {selectedControl?.family ?? launcherFamily}
            </button>
          </>
        )}
        {selectedControl && (
          <>
            <ArrowRight size={11} className="rel-breadcrumb-sep" />
            <span className="rel-breadcrumb-current mono">{selectedControl.id}</span>
          </>
        )}
      </div>

      {/* ── Tile launcher (no control selected) ───────────────────────────── */}
      {!selectedId ? (
        <div className="rel-launcher">
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
          {/* ── Compact stat strip — counts + quick links, no box ────────────── */}
          <div className="rel-stat-strip">
            <span className="rel-stat-strip-item">
              <span className="rel-stat-strip-val">{totalRelationships}</span> Relationships
            </span>
            <span className="rel-stat-strip-sep" aria-hidden="true">·</span>
            <span className="rel-stat-strip-item">
              <span className="rel-stat-strip-val">{prerequisites.length}</span> Prerequisites
            </span>
            <span className="rel-stat-strip-sep" aria-hidden="true">·</span>
            <span className="rel-stat-strip-item">
              <span className="rel-stat-strip-val">{supports.length}</span> Supports
            </span>
            <span className="rel-stat-strip-sep" aria-hidden="true">·</span>
            <span className="rel-stat-strip-item">
              <span className="rel-stat-strip-val">{supportedBy.length}</span> Supported By
            </span>
            <span className="rel-stat-strip-sep" aria-hidden="true">·</span>
            <span className="rel-stat-strip-item">
              <span className="rel-stat-strip-val">{supportingEvidence.length}</span> Evidence
            </span>
            <span className="rel-stat-strip-sep" aria-hidden="true">·</span>
            <Link to={`/controls/${encodeURIComponent(selectedId)}`} className="rel-stat-strip-link">
              View control detail →
            </Link>
            <button type="button" className="rel-stat-strip-link" onClick={() => setSearchParams({})}>
              ← Browse controls
            </button>
          </div>

          {/* ── Relationship flow diagram ─────────────────────────────────── */}
          <div className="rel-flow-wrap">
            <FlowDiagram
              selectedControl={selectedControl}
              leftItems={flowLeftItems}
              rightItems={flowRightItems}
              onExplore={handleExplore}
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

      </div>
    </div>
  )
}

export default RelationshipExplorer
