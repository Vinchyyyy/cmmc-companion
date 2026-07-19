import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, FileWarning, FileX, Tag, LayoutGrid, LayoutList, LayoutPanelTop, Clock, AlertTriangle, History,
} from 'lucide-react'
import DashSidebar from '../components/DashSidebar.jsx'
import controls from '../data/controls/index.js'
import evidenceTypes from '../data/evidence/index.js'
import relationships from '../data/relationships/index.js'
import { readStatus } from '../utils/status'
import { readInheritanceSource } from '../utils/inheritance'
import { readObjectiveStatus, OBJECTIVE_STATUS_NOT_MET } from '../utils/objectiveStatus'
import { hasObjectiveArtifacts } from '../utils/objectiveArtifacts'
import { controlHasWarnings } from '../utils/objectiveWarnings'
import { listArtifacts } from '../utils/artifactRegistry'
import { getScoringSearchTerms } from '../utils/scoring'

// =========================================================================
// Family definitions — order matches the real Control Library family filter.
// `code` is the 2-letter prefix of control IDs in that family (see utils/sort.js).
// =========================================================================
const FAMILIES = [
  { code: 'AC', value: 'Access Control' },
  { code: 'AT', value: 'Awareness and Training' },
  { code: 'AU', value: 'Audit and Accountability' },
  { code: 'CM', value: 'Configuration Management' },
  { code: 'IA', value: 'Identification and Authentication' },
  { code: 'IR', value: 'Incident Response' },
  { code: 'MA', value: 'Maintenance' },
  { code: 'MP', value: 'Media Protection' },
  { code: 'PS', value: 'Personnel Security' },
  { code: 'PE', value: 'Physical Protection' },
  { code: 'RA', value: 'Risk Assessment' },
  { code: 'CA', value: 'Security Assessment' },
  { code: 'SC', value: 'System and Communications Protection' },
  { code: 'SI', value: 'System and Information Integrity' },
]

const statusMeta = [
  { key: 'met', label: 'Met', color: '#3FC98A', libraryStatus: 'MET' },
  { key: 'inProgress', label: 'In Progress', color: '#E3A83B', libraryStatus: 'In Progress' },
  { key: 'notMet', label: 'Not Met', color: '#E2665A', libraryStatus: 'NOT MET' },
  { key: 'notStarted', label: 'Not Started', color: '#5A5A62', libraryStatus: 'Not Started' },
]

function statusToKey(status) {
  if (status === 'MET') return 'met'
  if (status === 'In Progress') return 'inProgress'
  if (status === 'NOT MET') return 'notMet'
  return 'notStarted'
}

function objectiveStatusToKey(status) {
  if (status === 'MET') return 'met'
  if (status === OBJECTIVE_STATUS_NOT_MET) return 'notMet'
  return 'notStarted' // "Unreviewed" — objectives have no in-progress state
}

// =========================================================================
// Real per-family / per-status aggregation (controls + objectives), and
// per-family x per-inheritance-source matrix. Computed fresh on each render
// from real localStorage-backed status/inheritance data — no mock arrays.
// =========================================================================
function computeFamilyStats() {
  return FAMILIES.map((f) => {
    const fc = controls.filter((c) => c.family === f.value)
    const controlCounts = { met: 0, inProgress: 0, notMet: 0, notStarted: 0 }
    const objectiveCounts = { met: 0, inProgress: 0, notMet: 0, notStarted: 0 }
    let objTotal = 0
    for (const c of fc) {
      controlCounts[statusToKey(readStatus(c.id))]++
      for (const obj of c.objectives ?? []) {
        objTotal++
        objectiveCounts[objectiveStatusToKey(readObjectiveStatus(c.id, obj.id))]++
      }
    }
    return { ...f, total: fc.length, objTotal, controlCounts, objectiveCounts }
  })
}

function aggregateFamilyStats(familyStats, unit) {
  const countsKey = unit === 'objectives' ? 'objectiveCounts' : 'controlCounts'
  return statusMeta.reduce((acc, s) => {
    acc[s.key] = familyStats.reduce((sum, f) => sum + f[countsKey][s.key], 0)
    return acc
  }, {})
}

function computeInheritanceMatrix() {
  const sourceCounts = new Map() // source -> Map(familyCode -> count)
  for (const c of controls) {
    const src = readInheritanceSource(c.id).trim()
    if (!src) continue
    const code = c.id.slice(0, 2)
    if (!sourceCounts.has(src)) sourceCounts.set(src, new Map())
    const byFamily = sourceCounts.get(src)
    byFamily.set(code, (byFamily.get(code) ?? 0) + 1)
  }
  const rows = [...sourceCounts.entries()]
    .map(([name, byFamily]) => {
      const values = FAMILIES.map((f) => byFamily.get(f.code) ?? 0)
      const total = values.reduce((a, b) => a + b, 0)
      return { name, values, total }
    })
    .sort((a, b) => b.total - a.total)
  const max = Math.max(1, ...rows.flatMap((r) => r.values))
  return { rows, max }
}

// Reads the live accent2 color (set by the Settings accent picker, or its
// default) so the heatmap gradient tracks the chosen accent instead of a
// baked-in violet.
function getAccent2Rgb() {
  if (typeof document === 'undefined') return [167, 139, 250]
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--user-accent2').trim()
  const m = raw.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [167, 139, 250]
}

function heatColor(t) {
  const lo = [26, 24, 34]
  const hi = getAccent2Rgb()
  const r = Math.round(lo[0] + (hi[0] - lo[0]) * t)
  const g = Math.round(lo[1] + (hi[1] - lo[1]) * t)
  const b = Math.round(lo[2] + (hi[2] - lo[2]) * t)
  return `rgb(${r},${g},${b})`
}

function pctColor(pct) {
  const stops = [
    { p: 0, c: [226, 102, 90] },
    { p: 50, c: [227, 168, 59] },
    { p: 100, c: [63, 201, 138] },
  ]
  let lo = stops[0], hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (pct >= stops[i].p && pct <= stops[i + 1].p) { lo = stops[i]; hi = stops[i + 1]; break }
  }
  const t = hi.p === lo.p ? 0 : (pct - lo.p) / (hi.p - lo.p)
  const r = Math.round(lo.c[0] + (hi.c[0] - lo.c[0]) * t)
  const g = Math.round(lo.c[1] + (hi.c[1] - lo.c[1]) * t)
  const b = Math.round(lo.c[2] + (hi.c[2] - lo.c[2]) * t)
  return `rgb(${r},${g},${b})`
}

function bestColumns(total, maxCols) {
  if (total <= maxCols) return total
  const baseRows = Math.ceil(total / maxCols)
  let best = maxCols
  let bestWaste = maxCols - (total - (baseRows - 1) * maxCols)
  const floor = Math.max(maxCols - 8, 1)
  for (let c = maxCols; c >= floor; c--) {
    const rows = Math.ceil(total / c)
    if (rows > baseRows + 1) continue
    const lastRow = total - (rows - 1) * c
    const waste = c - lastRow
    if (waste < bestWaste) { bestWaste = waste; best = c; if (waste === 0) break }
  }
  return best
}

function solveGrid(total, containerWidth, gap, maxCellCap, targetMaxRows) {
  if (containerWidth <= 0) return { cellSize: maxCellCap, columns: Math.max(1, total) }
  for (let cellSize = maxCellCap; cellSize >= 10; cellSize--) {
    const maxCols = Math.floor(containerWidth / (cellSize + gap))
    if (maxCols < 1) continue
    const rows = Math.ceil(total / maxCols)
    if (rows <= targetMaxRows) return { cellSize, columns: bestColumns(total, maxCols) }
  }
  const maxCols = Math.max(1, Math.floor(containerWidth / (10 + gap)))
  return { cellSize: 10, columns: bestColumns(total, maxCols) }
}

// Measures the live rendered width of a container via ResizeObserver so grid
// layouts never rely on a hardcoded pixel constant (this was a real bug in
// the original prototype — overlap on window resize).
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

function libraryUrl(params) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  return `/controls?${new URLSearchParams(clean).toString()}`
}

// =========================================================================
// Global search — real data, debounced
// =========================================================================

const MAX_RESULTS_PER_GROUP = 5

function includes(str, term) {
  return typeof str === 'string' && str.toLowerCase().includes(term)
}

function runSearch(term) {
  const controlResults = []
  for (const c of controls) {
    if (controlResults.length >= MAX_RESULTS_PER_GROUP) break
    const hit =
      includes(c.id, term) || includes(c.title, term) || includes(c.family, term) ||
      includes(c.controlText, term) || includes(c.plainEnglish, term) ||
      c.commonArtifacts?.some((a) => includes(a, term)) ||
      c.commonGaps?.some((g) => includes(g, term)) ||
      c.objectives?.some((o) => includes(o.text, term) || includes(o.whatToLookFor, term) || o.commonEvidence?.some((e) => includes(e, term))) ||
      getScoringSearchTerms(c.id).some((t) => t.includes(term))
    if (hit) controlResults.push(c)
  }
  const evidenceResults = []
  for (const ev of evidenceTypes) {
    if (evidenceResults.length >= MAX_RESULTS_PER_GROUP) break
    if (includes(ev.name, term) || includes(ev.description, term) || includes(ev.reasoning, term) || ev.likelyControls?.some((id) => includes(id, term))) {
      evidenceResults.push(ev)
    }
  }
  const relResults = []
  for (const r of relationships) {
    if (relResults.length >= MAX_RESULTS_PER_GROUP) break
    if (includes(r.sourceControl, term) || includes(r.targetControl, term) || includes(r.relationshipType, term) || includes(r.reasoning, term)) {
      relResults.push(r)
    }
  }
  return { controlResults, evidenceResults, relResults }
}

function StatusPill({ status }) {
  const map = {
    'In Progress': { bg: 'var(--dash-warn-bg)', fg: 'var(--dash-warn)' },
    'NOT MET': { bg: 'var(--dash-danger-bg)', fg: 'var(--dash-danger)' },
    'Not Started': { bg: '#1C1C20', fg: 'var(--dash-text-tertiary)' },
    'MET': { bg: 'var(--dash-success-bg)', fg: 'var(--dash-success)' },
  }
  const s = map[status] || map['Not Started']
  const label = status === 'MET' ? 'Met' : status === 'NOT MET' ? 'Not Met' : status
  return (
    <span className="dash-status-pill" style={{ background: s.bg, color: s.fg }}>{label}</span>
  )
}

function StatusIcon({ status }) {
  if (status === 'In Progress') return <Clock size={14} style={{ color: 'var(--dash-warn)' }} />
  return <AlertTriangle size={14} style={{ color: status === 'NOT MET' ? 'var(--dash-danger)' : 'var(--dash-text-tertiary)' }} />
}

function SectionLabel({ children, accent }) {
  return (
    <div className="dash-section-label">
      <span className="dash-section-bar" style={{ background: accent || 'var(--dash-accent)' }} />
      <span className="dash-section-text">{children}</span>
    </div>
  )
}

// =========================================================================
// Header search — debounced, real data, capped width
// =========================================================================

function HeaderSearch() {
  const [hover, setHover] = useState(false)
  const [locked, setLocked] = useState(false)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const inputRef = useRef(null)
  const wrapRef = useRef(null)
  const navigate = useNavigate()
  const open = hover || locked

  useEffect(() => { if (locked) inputRef.current?.focus() }, [locked])

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) { setLocked(false); setQuery('') }
    }
    if (locked) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [locked])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 150)
    return () => clearTimeout(t)
  }, [query])

  const q = debounced
  const { controlResults, evidenceResults, relResults } = q ? runSearch(q) : { controlResults: [], evidenceResults: [], relResults: [] }
  const noResults = q && controlResults.length === 0 && evidenceResults.length === 0 && relResults.length === 0

  const closeSearch = () => { setLocked(false); setQuery('') }

  return (
    <div ref={wrapRef} className="dash-search" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div
        className="dash-search-bar"
        style={{
          background: locked ? 'var(--dash-surface)' : 'transparent',
          border: `1px solid ${locked ? 'var(--dash-accent)' : open ? 'var(--dash-border)' : 'transparent'}`,
          boxShadow: locked ? '0 0 0 3px rgba(124,92,252,0.15)' : 'none',
          width: locked ? 320 : open ? 160 : 40,
        }}
        onClick={() => setLocked(true)}
      >
        <div className="dash-search-icon" style={{ color: locked ? 'var(--dash-accent2)' : 'var(--dash-text-secondary)' }}>
          <Search size={16} />
        </div>
        {locked ? (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search controls, evidence, relationships…"
            className="dash-search-input"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="dash-search-hint" style={{ opacity: open ? 1 : 0 }}>Search</span>
        )}
      </div>

      {locked && q && (
        <div className="dash-search-results">
          <div className="dash-search-results-inner">
            {noResults && <div className="dash-search-empty">No results for &ldquo;{query}&rdquo;</div>}

            {controlResults.length > 0 && (
              <div>
                <div className="dash-search-group-label"><span className="dash-search-group-dot" style={{ background: 'var(--dash-accent2)' }} />Controls</div>
                <div className="dash-search-rows">
                  {controlResults.map((c) => (
                    <div key={c.id} className="dash-search-row" onClick={() => { navigate(`/controls/${encodeURIComponent(c.id)}`); closeSearch() }}>
                      <span className="dash-mono dash-search-row-id">{c.id}</span>
                      <span>{c.title}</span>
                      <span className="dash-muted">({c.family})</span>
                      <span className="dash-search-row-status"><StatusPill status={readStatus(c.id)} /></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {evidenceResults.length > 0 && (
              <div>
                <div className="dash-search-group-label"><span className="dash-search-group-dot" style={{ background: '#22D3EE' }} />Evidence</div>
                <div className="dash-search-rows">
                  {evidenceResults.map((ev) => (
                    <div key={ev.name} className="dash-search-row" onClick={() => { navigate(`/artifact-map?search=${encodeURIComponent(ev.name)}`); closeSearch() }}>
                      <span>{ev.name}</span>
                      <span className="dash-muted">— {ev.likelyControls?.length ?? 0} control{ev.likelyControls?.length === 1 ? '' : 's'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {relResults.length > 0 && (
              <div>
                <div className="dash-search-group-label"><span className="dash-search-group-dot" style={{ background: '#E3A83B' }} />Relationships</div>
                <div className="dash-search-rows">
                  {relResults.map((r, i) => (
                    <div key={i} className="dash-search-row" onClick={() => { navigate(`/relationships?control=${encodeURIComponent(r.sourceControl)}`); closeSearch() }}>
                      <span className="dash-mono">{r.sourceControl}</span>
                      <span className="dash-muted">→</span>
                      <span className="dash-mono">{r.targetControl}</span>
                      <span className="dash-muted">({r.relationshipType})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// Family & Status Breakdown — waffle grid with legend, ResizeObserver-driven
// =========================================================================

function FamilyStatusWaffle({ familyStats }) {
  const [selected, setSelected] = useState('All')
  const [unit, setUnit] = useState('controls')
  const [hoverKey, setHoverKey] = useState(null)
  const [containerRef, containerWidth] = useContainerWidth()
  const navigate = useNavigate()

  const active = selected === 'All' ? null : familyStats.find((f) => f.code === selected)
  const currentCounts = active ? active[unit === 'objectives' ? 'objectiveCounts' : 'controlCounts'] : aggregateFamilyStats(familyStats, unit)
  const currentTotal = active ? (unit === 'objectives' ? active.objTotal : active.total) : familyStats.reduce((a, f) => a + (unit === 'objectives' ? f.objTotal : f.total), 0)
  const metPct = currentTotal === 0 ? 0 : Math.round((currentCounts.met / currentTotal) * 100)

  const cells = []
  statusMeta.forEach((s) => { for (let i = 0; i < currentCounts[s.key]; i++) cells.push({ key: s.key, color: s.color }) })

  const gap = 8
  const { cellSize, columns } = solveGrid(cells.length, containerWidth, gap, 28, 8)
  const radius = Math.max(2, Math.round(cellSize * 0.22))

  const goToLibrary = (statusKey) => {
    const s = statusMeta.find((sm) => sm.key === statusKey)
    navigate(libraryUrl({ status: s.libraryStatus, family: active ? active.value : undefined }))
  }

  return (
    <div ref={containerRef}>
      <div className="dash-panel-header">
        <SectionLabel accent="var(--dash-accent2)">Family &amp; Status Breakdown</SectionLabel>
        <div className="dash-toggle-group">
          <div className="dash-toggle-indicator" style={{ transform: `translateX(${unit === 'objectives' ? '100%' : '0'})` }} />
          <button onClick={() => setUnit('controls')} className="dash-toggle-btn" style={{ color: unit === 'controls' ? '#fff' : undefined }}>Controls</button>
          <button onClick={() => setUnit('objectives')} className="dash-toggle-btn" style={{ color: unit === 'objectives' ? '#fff' : undefined }}>Objectives</button>
        </div>
      </div>

      <div className="dash-waffle-title-row">
        <div className="dash-waffle-title">
          <span className="dash-waffle-title-main">{active ? active.value : 'All Families'}</span>
          <span className="dash-muted">{currentTotal} {unit}</span>
        </div>
        <span className="dash-waffle-pct" style={{ color: pctColor(metPct) }}>{metPct}%</span>
      </div>

      <div key={selected + unit} className="dash-waffle-grid" style={{ gridTemplateColumns: `repeat(${columns}, ${cellSize}px)`, gap: `${gap}px` }}>
        {cells.map((c, i) => (
          <div
            key={i}
            className="dash-waffle-cell"
            style={{ width: cellSize, height: cellSize, background: c.color, borderRadius: radius, opacity: hoverKey && hoverKey !== c.key ? 0.18 : 1, animationDelay: `${i * 3}ms` }}
          />
        ))}
      </div>

      <div className="dash-legend-row">
        {statusMeta.map((s) => {
          const dimmed = hoverKey && hoverKey !== s.key
          return (
            <button
              key={s.key}
              className="dash-legend-item"
              style={{ opacity: dimmed ? 0.35 : 1 }}
              onMouseEnter={() => setHoverKey(s.key)}
              onMouseLeave={() => setHoverKey(null)}
              onClick={() => goToLibrary(s.key)}
            >
              <span className="dash-legend-label-row"><span className="dash-legend-dot" style={{ background: s.color }} />{s.label}</span>
              <span className="dash-legend-val">{currentCounts[s.key]}</span>
            </button>
          )
        })}
      </div>

      <div className="dash-family-chips">
        <button onClick={() => setSelected('All')} className="dash-chip" style={selected === 'All' ? { background: 'var(--dash-accent)', color: '#fff' } : {}}>All</button>
        {familyStats.map((f) => (
          <button key={f.code} onClick={() => setSelected(f.code)} className="dash-chip dash-mono" style={selected === f.code ? { background: 'var(--dash-accent)', color: '#fff' } : {}}>{f.code}</button>
        ))}
      </div>
    </div>
  )
}

// =========================================================================
// Inheritance Sources heatmap
// =========================================================================

function InheritanceHeatmapPanel({ matrix }) {
  const navigate = useNavigate()
  const { rows, max } = matrix
  const [hoveredKey, setHoveredKey] = useState(null)

  if (rows.length === 0) {
    return (
      <div className="dash-panel-empty">
        <SectionLabel accent="var(--dash-accent2)">Inheritance Sources</SectionLabel>
        <p className="dash-muted">No inheritance sources labeled yet.</p>
      </div>
    )
  }

  return (
    <div className="dash-heatmap-wrap">
      <SectionLabel accent="var(--dash-accent2)">Inheritance Sources</SectionLabel>
      <div className="dash-muted dash-heatmap-subtitle">Controls covered per family, by inheritance source</div>

      <div className="dash-heatmap-grid" style={{ gridTemplateColumns: `190px repeat(${FAMILIES.length}, minmax(0, 1fr)) 34px` }}>
        <div />
        {FAMILIES.map((f) => <div key={f.code} className="dash-mono dash-heatmap-colhead">{f.code}</div>)}
        <div className="dash-heatmap-colhead">Σ</div>

        {rows.map((row, rowIndex) => (
          <FragmentRow
            key={row.name}
            row={row}
            rowIndex={rowIndex}
            max={max}
            hoveredKey={hoveredKey}
            onHover={setHoveredKey}
            onCellClick={(code) => navigate(libraryUrl({ family: FAMILIES.find((f) => f.code === code)?.value, inheritanceSource: row.name }))}
            onRowClick={() => navigate(libraryUrl({ inheritanceSource: row.name }))}
          />
        ))}
      </div>

      <div className="dash-heatmap-legend">
        <span className="dash-muted">Fewer</span>
        <div className="dash-heatmap-scale">
          {Array.from({ length: 16 }).map((_, i) => <div key={i} style={{ flex: 1, background: heatColor(i / 15) }} />)}
        </div>
        <span className="dash-muted">More controls</span>
      </div>
    </div>
  )
}

function FragmentRow({ row, rowIndex, max, hoveredKey, onHover, onCellClick, onRowClick }) {
  return (
    <>
      <div className="dash-heatmap-rowlabel" onClick={onRowClick} title={`View controls inherited from ${row.name}`}>{row.name}</div>
      {row.values.map((v, i) => {
        const t = v === 0 ? 0 : 0.3 + 0.7 * (v / max)
        const key = `${rowIndex}-${i}`
        const hovered = hoveredKey === key
        // Hover brightens the cell toward the top of the scale (or gives an
        // empty cell a faint glow) so the grid reads as live/responsive.
        const background = hovered
          ? (v === 0 ? '#2A2836' : heatColor(Math.min(1, t + 0.3)))
          : (v === 0 ? '#1A1822' : heatColor(t))
        return (
          <div
            key={i}
            className="dash-mono dash-heatmap-cell"
            style={{
              background,
              color: t > 0.55 || hovered ? '#0A0A0B' : 'var(--dash-text-tertiary)',
              cursor: v > 0 ? 'pointer' : 'default',
              transform: hovered ? 'scale(1.08)' : 'scale(1)',
              boxShadow: hovered ? '0 0 0 1px rgba(167,139,250,0.5), 0 4px 12px rgba(124,92,252,0.35)' : 'none',
            }}
            onMouseEnter={() => onHover(key)}
            onMouseLeave={() => onHover(null)}
            onClick={() => v > 0 && onCellClick(FAMILIES[i].code)}
          >
            {v > 0 ? v : ''}
          </div>
        )
      })}
      <div className="dash-heatmap-total" onClick={onRowClick} style={{ cursor: 'pointer' }}>{row.total}</div>
    </>
  )
}

// =========================================================================
// Needs Attention + Continue Review, with Table/Cards toggle + pagination
// =========================================================================

const PAGE_SIZE = 12

function reviewScore(c) {
  let score = 0
  const st = readStatus(c.id)
  if (hasObjectiveArtifacts(c)) score += 30
  let reviewed = 0
  for (const obj of c.objectives ?? []) if (readObjectiveStatus(c.id, obj.id) !== 'Unreviewed') reviewed++
  if (reviewed > 0) score += 20
  if (st === 'In Progress') score += 25
  else if (st === 'NOT MET') score += 15
  return score
}

function controlProgress(c) {
  const objs = c.objectives ?? []
  if (objs.length === 0) return 0
  const reviewed = objs.filter((obj) => readObjectiveStatus(c.id, obj.id) !== 'Unreviewed').length
  return Math.round((reviewed / objs.length) * 100)
}

function ControlCard({ c }) {
  const status = readStatus(c.id)
  const progress = controlProgress(c)
  return (
    <Link to={`/controls/${encodeURIComponent(c.id)}`} className="dash-card">
      <div className="dash-card-top">
        <span className="dash-card-id-group">
          <StatusIcon status={status} />
          <span className="dash-mono dash-card-id">{c.id}</span>
        </span>
        <span className="dash-card-family">{c.id.slice(0, 2)}</span>
      </div>
      <div className="dash-card-title">{c.title}</div>
      <div className="dash-card-bottom">
        <StatusPill status={status} />
        <span className="dash-muted">{progress}%</span>
      </div>
      <div className="dash-progress-track"><div className="dash-progress-fill" style={{ width: `${progress}%` }} /></div>
    </Link>
  )
}

function FocusReviewPanel({ controlsWithNotMet, controlsNoArtifacts, untaggedArtifacts, controlsWithWarnings }) {
  const [selected, setSelected] = useState('all')
  const [view, setView] = useState('table')
  const [page, setPage] = useState(1)
  // null = unsorted (default order), 'asc'/'desc' = sort by Progress %
  const [progressSort, setProgressSort] = useState(null)
  const toggleProgressSort = () => {
    setProgressSort((prev) => (prev === 'desc' ? 'asc' : prev === 'asc' ? null : 'desc'))
    setPage(1)
  }

  const notStartedControls = useMemo(() => controls.filter((c) => readStatus(c.id) === 'Not Started'), [])
  const allReviewControls = useMemo(
    () => controls.filter((c) => readStatus(c.id) !== 'MET').sort((a, b) => reviewScore(b) - reviewScore(a)),
    []
  )

  const focusAreas = [
    { key: 'all', label: 'Continue Review', count: allReviewControls.length, color: 'var(--dash-accent2)' },
    { key: 'notStarted', label: 'Not Started', count: notStartedControls.length, color: '#E3A83B' },
    { key: 'notMetObjective', label: 'Not Met Objective', count: controlsWithNotMet.length, color: '#E2665A' },
    { key: 'noArtifacts', label: 'No Artifacts', count: controlsNoArtifacts.length, color: '#E3A83B' },
    { key: 'untagged', label: 'Untagged Evidence', count: untaggedArtifacts.length, color: '#8B90F0' },
    { key: 'warnings', label: 'Warnings', count: controlsWithWarnings.length, color: '#E2665A' },
  ]
  const activeArea = focusAreas.find((f) => f.key === selected)
  const isEvidence = selected === 'untagged'

  const filteredControls =
    selected === 'all' ? allReviewControls :
    selected === 'notStarted' ? notStartedControls :
    selected === 'notMetObjective' ? controlsWithNotMet :
    selected === 'noArtifacts' ? controlsNoArtifacts :
    selected === 'warnings' ? controlsWithWarnings : []

  const items = isEvidence ? untaggedArtifacts : (
    progressSort
      ? [...filteredControls].sort((a, b) =>
          progressSort === 'asc'
            ? controlProgress(a) - controlProgress(b)
            : controlProgress(b) - controlProgress(a)
        )
      : filteredControls
  )
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const pageItems = items.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  const selectArea = (key) => { setSelected(key); setPage(1) }

  return (
    <div className="dash-focus-grid">
      <div className="dash-focus-sidebar">
        <SectionLabel accent="#E2665A">Needs Attention</SectionLabel>
        <div className="dash-focus-list">
          {focusAreas.map((f) => {
            const active = selected === f.key
            const Icon = focusAreaIcons[f.key]
            return (
              <button key={f.key} onClick={() => selectArea(f.key)} className="dash-focus-item" style={active ? { background: `color-mix(in srgb, ${f.color} 14%, transparent)` } : {}}>
                <Icon size={15} style={{ color: f.color, flexShrink: 0 }} />
                <span className="dash-focus-item-label" style={{ color: active ? 'var(--dash-text-primary)' : 'var(--dash-text-secondary)' }}>{f.label}</span>
                <span className="dash-focus-item-count" style={{ background: active ? `color-mix(in srgb, ${f.color} 20%, transparent)` : '#1C1C20', color: active ? f.color : 'var(--dash-text-tertiary)' }}>{f.count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="dash-review-panel">
        <div className="dash-review-header">
          <SectionLabel accent={activeArea.color}>{activeArea.label}</SectionLabel>
          <span className="dash-muted">{items.length} of {isEvidence ? untaggedArtifacts.length : controls.length} {isEvidence ? 'artifacts' : 'controls'}</span>
        </div>

        {!isEvidence && (
          <div className="dash-view-toggle">
            <button onClick={() => setView('table')} className="dash-view-btn" style={view === 'table' ? { background: '#1C1C20', color: 'var(--dash-text-primary)' } : {}}><LayoutList size={13} /> Table</button>
            <button onClick={() => setView('cards')} className="dash-view-btn" style={view === 'cards' ? { background: '#1C1C20', color: 'var(--dash-text-primary)' } : {}}><LayoutPanelTop size={13} /> Cards</button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="dash-review-empty">No {isEvidence ? 'untagged evidence' : 'controls'} match this filter.</div>
        ) : isEvidence ? (
          <div className="dash-review-table-wrap">
            <table className="dash-table">
              <thead><tr><th>Evidence</th><th>Tags</th></tr></thead>
              <tbody>
                {pageItems.map((a) => (
                  <tr key={a.id} onClick={() => window.location.assign(`/artifact-map?search=${encodeURIComponent(a.name)}`)} style={{ cursor: 'pointer' }}>
                    <td>{a.name}</td>
                    <td className="dash-muted">Untagged</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : view === 'cards' ? (
          <div className="dash-cards-grid">
            {pageItems.map((c) => <ControlCard key={c.id} c={c} />)}
          </div>
        ) : (
          <div className="dash-review-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Control</th>
                  <th>Title</th>
                  <th>Family</th>
                  <th>Status</th>
                  <th>
                    <button type="button" className="dash-table-sort-btn" onClick={toggleProgressSort}>
                      Progress
                      <span className="dash-table-sort-arrow">
                        {progressSort === 'asc' ? '↑' : progressSort === 'desc' ? '↓' : '↕'}
                      </span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => {
                  const status = readStatus(c.id)
                  const progress = controlProgress(c)
                  return (
                    <tr key={c.id} onClick={() => window.location.assign(`/controls/${encodeURIComponent(c.id)}`)} style={{ cursor: 'pointer' }}>
                      <td className="dash-mono dash-table-id">
                        <span className="dash-card-id-group"><StatusIcon status={status} />{c.id}</span>
                      </td>
                      <td>{c.title}</td>
                      <td><span className="dash-family-badge">{c.id.slice(0, 2)}</span></td>
                      <td><StatusPill status={status} /></td>
                      <td>
                        <div className="dash-table-progress">
                          <div className="dash-progress-track dash-progress-track--sm"><div className="dash-progress-fill" style={{ width: `${progress}%` }} /></div>
                          <span className="dash-muted">{progress}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="dash-pagination">
            <button disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)}>Prev</button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} className={i + 1 === pageSafe ? 'dash-page-active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button disabled={pageSafe >= totalPages} onClick={() => setPage(pageSafe + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  )
}

const focusAreaIcons = {
  all: LayoutGrid,
  notStarted: History,
  notMetObjective: FileX,
  noArtifacts: FileWarning,
  untagged: Tag,
  warnings: AlertTriangle,
}

function Home() {
  const familyStats = useMemo(() => computeFamilyStats(), [])
  const matrix = useMemo(() => computeInheritanceMatrix(), [])

  const dashMetrics = useMemo(() => {
    const controlAgg = aggregateFamilyStats(familyStats, 'controls')
    const objAgg = aggregateFamilyStats(familyStats, 'objectives')
    const controlsTotal = controls.length
    const objTotal = familyStats.reduce((a, f) => a + f.objTotal, 0)
    const allArtifacts = listArtifacts()
    const untaggedArtifacts = allArtifacts.filter((a) => a.tags.length === 0)
    const controlsWithNotMet = controls.filter((c) => c.objectives?.some((obj) => readObjectiveStatus(c.id, obj.id) === OBJECTIVE_STATUS_NOT_MET))
    const controlsNoArtifacts = controls.filter((c) => !hasObjectiveArtifacts(c))
    const controlsWithWarnings = controls.filter((c) => readStatus(c.id) !== 'In Progress' && controlHasWarnings(c))
    return { controlAgg, objAgg, controlsTotal, objTotal, allArtifacts, untaggedArtifacts, controlsWithNotMet, controlsNoArtifacts, controlsWithWarnings }
  }, [familyStats])

  const controlsMetPct = dashMetrics.controlsTotal === 0 ? 0 : Math.round((dashMetrics.controlAgg.met / dashMetrics.controlsTotal) * 100)
  const objectivesMetPct = dashMetrics.objTotal === 0 ? 0 : Math.round((dashMetrics.objAgg.met / dashMetrics.objTotal) * 100)

  const kpis = [
    { label: 'Controls Assessed', value: dashMetrics.controlAgg.met, total: `/ ${dashMetrics.controlsTotal}`, pct: `${controlsMetPct}%`, color: '#3FC98A', caption: `${dashMetrics.controlAgg.inProgress} in progress · ${dashMetrics.controlAgg.notMet} not met`, to: libraryUrl({ status: 'MET' }) },
    { label: 'Objectives Reviewed', value: dashMetrics.objAgg.met, total: `/ ${dashMetrics.objTotal}`, pct: `${objectivesMetPct}%`, color: 'var(--dash-accent2)', caption: `${dashMetrics.objAgg.notMet} not met · ${dashMetrics.objAgg.notStarted} unreviewed` },
    { label: 'Evidence Artifacts', value: dashMetrics.allArtifacts.length, total: 'total', pct: dashMetrics.allArtifacts.length === 0 ? '0%' : `${Math.round(((dashMetrics.allArtifacts.length - dashMetrics.untaggedArtifacts.length) / dashMetrics.allArtifacts.length) * 100)}%`, color: '#E3A83B', caption: `${dashMetrics.allArtifacts.length - dashMetrics.untaggedArtifacts.length} tagged · ${dashMetrics.untaggedArtifacts.length} untagged` },
  ]
  // KPI strip is confirmed non-clickable (see dashboard handoff spec) — always
  // rendered as a plain <div>, never a link, regardless of what data it summarizes.

  return (
    <div className="dash-root">
      <DashSidebar />

      <main className="dash-main">
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Assessment Dashboard</h1>
            <p className="dash-muted dash-subtitle">CMMC Companion — local assessment workspace</p>
          </div>
          <HeaderSearch />
        </div>

        <div className="dash-kpi-row">
          {kpis.map((k, i) => (
            <div key={k.label} className="dash-kpi" style={{ borderLeft: i === 0 ? 'none' : '1px solid var(--dash-border)' }}>
              <div className="dash-kpi-label">{k.label}</div>
              <div className="dash-kpi-value-row">
                <span className="dash-kpi-value" style={{ color: k.color }}>{k.value}</span>
                <span className="dash-muted">{k.total}</span>
                <span className="dash-kpi-pct" style={{ color: k.color }}>{k.pct}</span>
              </div>
              <div className="dash-muted dash-kpi-caption">{k.caption}</div>
            </div>
          ))}
        </div>

        <div className="dash-twin-panel">
          <FamilyStatusWaffle familyStats={familyStats} />
          <InheritanceHeatmapPanel matrix={matrix} />
        </div>

        <FocusReviewPanel
          controlsWithNotMet={dashMetrics.controlsWithNotMet}
          controlsNoArtifacts={dashMetrics.controlsNoArtifacts}
          untaggedArtifacts={dashMetrics.untaggedArtifacts}
          controlsWithWarnings={dashMetrics.controlsWithWarnings}
        />
      </main>
    </div>
  )
}

export default Home
