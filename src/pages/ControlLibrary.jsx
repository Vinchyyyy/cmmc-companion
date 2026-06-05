import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import controls from '../data/controls/index'
import { STATUSES, readStatus, writeStatus, STATUS_BADGE_CLASS } from '../utils/status'
import { readNote, writeNote } from '../utils/notes'
import { hasObjectiveNotes, writeObjectiveNote } from '../utils/objectiveNotes'
import { hasObjectiveArtifacts, writeObjectiveArtifacts } from '../utils/objectiveArtifacts'
import { writePool } from '../utils/evidencePool'
import {
  getTrendingStatusFromStorage,
  writeObjectiveStatus,
  readObjectiveStatus,
  OBJECTIVE_STATUS_UNREVIEWED,
  OBJECTIVE_STATUS_MET,
  OBJECTIVE_STATUS_NOT_MET,
  getStatusConsistencyWarning,
} from '../utils/objectiveStatus'
import {
  INHERITANCE_VALUES,
  DEFAULT_INHERITANCE,
  INHERITANCE_BADGE_CLASS,
  readInheritance,
  writeInheritance,
  readInheritanceSource,
  writeInheritanceSource,
  getInheritanceSourceWarning,
} from '../utils/inheritance'
import {
  SCORE_VALUES,
  SCORE_BADGE_CLASS,
  getScore,
  isPoamAllowed,
} from '../utils/scoring'
import { IconNotes, IconPaperclip, IconTrendingUp, IconTrendingDown } from '../components/icons'

const TRENDING_INDICATOR = {
  'MET':         { color: 'var(--color-met)',         title: 'Trending: MET' },
  'NOT MET':     { color: 'var(--color-not-met)',     title: 'Trending: NOT MET' },
  'In Progress': { color: 'var(--color-in-progress)', title: 'Trending: In Progress', symbol: '◐' },
  'Not Started': { color: 'var(--color-text-muted)',  title: 'Trending: Not Started', symbol: '○' },
}

function getControlWarnings(control) {
  const status      = readStatus(control.id)
  const trending    = getTrendingStatusFromStorage(control)
  const inheritance = readInheritance(control.id)
  const source      = readInheritanceSource(control.id)
  const out         = []
  const sw = getStatusConsistencyWarning(status, trending)
  if (sw) out.push(sw)
  const iw = getInheritanceSourceWarning(inheritance, source)
  if (iw) out.push(iw)
  return out
}

function hasAnyNote(control) {
  if (readNote(control.id).trim() !== '') return true
  return hasObjectiveNotes(control)
}

function getObjectiveProgress(control) {
  const objectives = control.objectives ?? []
  const total = objectives.length
  const statuses = objectives.map((obj) => readObjectiveStatus(control.id, obj.id))
  const met      = statuses.filter((s) => s === OBJECTIVE_STATUS_MET).length
  const notMet   = statuses.filter((s) => s === OBJECTIVE_STATUS_NOT_MET).length
  return { total, reviewed: met + notMet, met, notMet, unreviewed: total - met - notMet }
}

const DEFAULTS = {
  search: '',
  family: 'All',
  status: 'All',
  notes: 'All',
  artifacts: 'All',
  inheritance: 'All',
  score: 'All',
  poam: 'All',
  trending: 'All',
  warnings: 'All',
}

// Official CMMC assessment order per Assessment Guide TOC
const FAMILY_ORDER = [
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

const FILTER_KEYS = ['search', 'family', 'status', 'notes', 'artifacts', 'inheritance', 'score', 'poam', 'trending', 'warnings']
const SEARCH_DEBOUNCE_MS = 500

function ControlLibrary() {
  const [searchParams, setSearchParams] = useSearchParams()

  const urlSearch      = searchParams.get('search')      ?? DEFAULTS.search
  const familyFilter   = searchParams.get('family')      ?? DEFAULTS.family
  const statusFilter   = searchParams.get('status')      ?? DEFAULTS.status
  const notesFilter    = searchParams.get('notes')       ?? DEFAULTS.notes
  const artifactsFilter = searchParams.get('artifacts')  ?? DEFAULTS.artifacts
  const inheritFilter  = searchParams.get('inheritance') ?? DEFAULTS.inheritance
  const scoreFilter    = searchParams.get('score')       ?? DEFAULTS.score
  const poamFilter     = searchParams.get('poam')        ?? DEFAULTS.poam
  const trendingFilter  = searchParams.get('trending')  ?? DEFAULTS.trending
  const warningsFilter  = searchParams.get('warnings')  ?? DEFAULTS.warnings

  const location = useLocation()

  const [searchInput, setSearchInput]   = useState(urlSearch)
  const [selected, setSelected]         = useState(new Set())
  const [updateKey, setUpdateKey]       = useState(0)
  const [confirmClear, setConfirmClear] = useState(false)
  const [bulkInheritanceModal, setBulkInheritanceModal] = useState(null)
  const [showIconGuide, setShowIconGuide] = useState(false)
  const [hideMet, setHideMet] = useState(() => localStorage.getItem('cmmc-hide-met-controls') === 'true')
  const [openQuickLook, setOpenQuickLook] = useState(null)
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [openWarning, setOpenWarning] = useState(null)
  const forceUpdate = () => setUpdateKey((k) => k + 1)

  // Re-read localStorage whenever the user navigates to this page (e.g. returning
  // from ControlDetail after adding notes or artifacts). location.key is unique
  // per navigation event, so this fires on every client-side route transition.
  useEffect(() => {
    forceUpdate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  const toggleHideMet = () => setHideMet((prev) => {
    const next = !prev
    localStorage.setItem('cmmc-hide-met-controls', String(next))
    return next
  })

  useEffect(() => { setSearchInput(urlSearch) }, [urlSearch])

  const debounceRef = useRef(null)
  useEffect(() => {
    if (searchInput === urlSearch) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => writeFilter('search', searchInput), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const writeFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value === DEFAULTS[key] || value === '') next.delete(key)
    else next.set(key, value)
    setSearchParams(next)
  }

  const hasActiveFilters = FILTER_KEYS.some(
    (key) => (searchParams.get(key) ?? DEFAULTS[key]) !== DEFAULTS[key]
  )

  const handleClearFilters = () => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
    setSearchInput(DEFAULTS.search)
    const next = new URLSearchParams(searchParams)
    for (const key of FILTER_KEYS) next.delete(key)
    setSearchParams(next)
  }

  const term = urlSearch.trim().toLowerCase()

  const matchesSearch = (c) => {
    if (term === '') return true
    return (
      c.id.toLowerCase().includes(term) ||
      c.title.toLowerCase().includes(term) ||
      c.family.toLowerCase().includes(term) ||
      c.plainEnglish.toLowerCase().includes(term) ||
      c.controlText.toLowerCase().includes(term) ||
      c.commonArtifacts.some((a) => a.toLowerCase().includes(term)) ||
      c.commonGaps.some((g) => g.toLowerCase().includes(term))
    )
  }

  const matchesFamily      = (c) => familyFilter === 'All' || c.family === familyFilter
  const matchesStatus      = (c) => statusFilter === 'All' || readStatus(c.id) === statusFilter
  const matchesNotes       = (c) => {
    if (notesFilter === 'All') return true
    return notesFilter === 'Has Notes' ? hasAnyNote(c) : !hasAnyNote(c)
  }
  const matchesArtifacts   = (c) => {
    if (artifactsFilter === 'All') return true
    return artifactsFilter === 'Yes' ? hasObjectiveArtifacts(c) : !hasObjectiveArtifacts(c)
  }
  const matchesInheritance = (c) => inheritFilter === 'All' || readInheritance(c.id) === inheritFilter
  const matchesScore       = (c) => scoreFilter === 'All' || getScore(c.id) === Number(scoreFilter)
  const matchesPoam        = (c) => {
    if (poamFilter === 'All') return true
    return poamFilter === 'Allowed' ? isPoamAllowed(c.id) : !isPoamAllowed(c.id)
  }
  const matchesTrending    = (c) => {
    if (trendingFilter === 'All') return true
    return getTrendingStatusFromStorage(c) === trendingFilter
  }
  const matchesWarnings    = (c) => {
    if (warningsFilter === 'All') return true
    const hasWarnings = getControlWarnings(c).length > 0
    return warningsFilter === 'Has warnings' ? hasWarnings : !hasWarnings
  }

  const matchesHideMet = (c) => {
    if (!hideMet || statusFilter === 'MET') return true
    return readStatus(c.id) !== 'MET'
  }

  // Preserve official index.js order — do NOT sort by compareIds
  const results = controls.filter((c) =>
    matchesSearch(c) && matchesFamily(c) && matchesStatus(c) &&
    matchesNotes(c) && matchesArtifacts(c) && matchesInheritance(c) &&
    matchesScore(c) && matchesPoam(c) && matchesTrending(c) && matchesHideMet(c) &&
    matchesWarnings(c)
  )

  // Group by family in official CMMC order
  const byFamily = new Map()
  for (const c of results) {
    if (!byFamily.has(c.family)) byFamily.set(c.family, [])
    byFamily.get(c.family).push(c)
  }
  const groups = FAMILY_ORDER
    .filter((f) => byFamily.has(f))
    .map((f) => ({ family: f, controls: byFamily.get(f) }))

  const queryString = searchParams.toString()
  const currentLibraryUrl = queryString ? `/controls?${queryString}` : '/controls'
  const fromSuffix = `?from=${encodeURIComponent(currentLibraryUrl)}`

  // -----------------------------------------------------------------------
  // Multi-select
  // -----------------------------------------------------------------------
  const allResultIds = results.map((c) => c.id)
  const allSelected  = allResultIds.length > 0 && allResultIds.every((id) => selected.has(id))
  const someSelected = allResultIds.some((id) => selected.has(id))

  const toggleOne = (id) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => { const next = new Set(prev); for (const id of allResultIds) next.delete(id); return next })
    } else {
      setSelected((prev) => new Set([...prev, ...allResultIds]))
    }
  }
  const clearSelection   = () => setSelected(new Set())
  const enterMultiSelect = () => { setMultiSelectMode(true); setOpenQuickLook(null) }
  const exitMultiSelect  = () => { setMultiSelectMode(false); setOpenQuickLook(null); setSelected(new Set()) }
  const selectedControls = controls.filter((c) => selected.has(c.id))

  const bulkSetStatus      = (s) => { for (const id of selected) writeStatus(id, s); forceUpdate() }
  const bulkSetInheritance = (v, source = '') => {
    for (const id of selected) {
      writeInheritance(id, v)
      writeInheritanceSource(id, v === DEFAULT_INHERITANCE ? '' : source)
    }
    forceUpdate()
  }
  const bulkClearData      = () => {
    for (const ctrl of selectedControls) {
      writeStatus(ctrl.id, 'Not Started')
      writeInheritance(ctrl.id, DEFAULT_INHERITANCE)
      writeInheritanceSource(ctrl.id, '')
      writeNote(ctrl.id, '')
      writePool(ctrl.id, [])
      for (const obj of ctrl.objectives ?? []) {
        writeObjectiveNote(ctrl.id, obj.id, '')
        writeObjectiveStatus(ctrl.id, obj.id, OBJECTIVE_STATUS_UNREVIEWED)
        writeObjectiveArtifacts(ctrl.id, obj.id, [])
      }
    }
    forceUpdate()
  }

  // eslint-disable-next-line no-unused-vars
  const _update = updateKey
  const selectedCount = selected.size

  return (
    <div className="page">
      <h1>Control Library</h1>

      <div className="filter-row">
        <input
          type="text"
          placeholder="Search by ID, title, family, plain English, artifacts, or gaps..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select value={familyFilter} onChange={(e) => writeFilter('family', e.target.value)}>
          <option value="All">All families</option>
          <option value="Access Control">Access Control</option>
          <option value="Awareness and Training">Awareness and Training</option>
          <option value="Audit and Accountability">Audit &amp; Accountability</option>
          <option value="Configuration Management">Configuration Management</option>
          <option value="Identification and Authentication">Identification &amp; Authentication</option>
          <option value="Incident Response">Incident Response</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Media Protection">Media Protection</option>
          <option value="Personnel Security">Personnel Security</option>
          <option value="Physical Protection">Physical Protection</option>
          <option value="Risk Assessment">Risk Assessment</option>
          <option value="Security Assessment">Security Assessment</option>
          <option value="System and Communications Protection">System &amp; Communications Protection</option>
          <option value="System and Information Integrity">System and Information Integrity</option>
        </select>
        <select value={statusFilter} onChange={(e) => writeFilter('status', e.target.value)}>
          <option value="All">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={notesFilter} onChange={(e) => writeFilter('notes', e.target.value)}>
          <option value="All">All notes</option>
          <option value="Has Notes">Has notes</option>
          <option value="No Notes">No notes</option>
        </select>
        <select value={artifactsFilter} onChange={(e) => writeFilter('artifacts', e.target.value)}>
          <option value="All">All artifacts</option>
          <option value="Yes">Has artifacts</option>
          <option value="No">No artifacts</option>
        </select>
        <select value={inheritFilter} onChange={(e) => writeFilter('inheritance', e.target.value)}>
          <option value="All">All inheritance</option>
          {INHERITANCE_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={scoreFilter} onChange={(e) => writeFilter('score', e.target.value)}>
          <option value="All">All scores</option>
          {SCORE_VALUES.map((v) => (
            <option key={v} value={v}>({Math.abs(v)}) pts</option>
          ))}
        </select>
        <select value={poamFilter} onChange={(e) => writeFilter('poam', e.target.value)}>
          <option value="All">All POA&amp;M</option>
          <option value="Allowed">POA&amp;M Allowed</option>
          <option value="Not Allowed">Non-POA&amp;Mable</option>
        </select>
        <select value={trendingFilter} onChange={(e) => writeFilter('trending', e.target.value)}>
          <option value="All">All trending</option>
          <option value="Not Started">Trending: Not Started</option>
          <option value="In Progress">Trending: In Progress</option>
          <option value="MET">Trending: MET</option>
          <option value="NOT MET">Trending: NOT MET</option>
        </select>
        <select value={warningsFilter} onChange={(e) => writeFilter('warnings', e.target.value)}>
          <option value="All">All warnings</option>
          <option value="Has warnings">Has warnings</option>
          <option value="No warnings">No warnings</option>
        </select>
        <button
          onClick={handleClearFilters}
          disabled={!hasActiveFilters}
          title={hasActiveFilters ? 'Reset all filters' : 'No active filters'}
        >
          Clear Filters
        </button>
        <button onClick={() => setShowIconGuide(true)}>Icon Guide</button>
      </div>

      <div className="control-utility-bar">
        <label className="control-utility-toggle">
          <input type="checkbox" checked={hideMet} onChange={toggleHideMet} />
          Automatically hide MET controls
        </label>
        <span className="control-utility-count">
          Showing {results.length} of {controls.length} controls
        </span>
        {multiSelectMode ? (
          <div className="control-utility-multiselect-group">
            <label className="control-utility-select">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                onChange={toggleAll}
              />
              {allSelected ? 'Deselect all' : 'Select all visible'} ({allResultIds.length})
            </label>
            <button className="control-utility-exit-btn" onClick={exitMultiSelect}>
              Exit Multi-Select
            </button>
          </div>
        ) : (
          <button className="control-utility-multiselect-btn" onClick={enterMultiSelect}>
            Multi-Select
          </button>
        )}
      </div>
      {hideMet && statusFilter !== 'MET' && (
        <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'calc(-1 * var(--space-2))', marginBottom: 'var(--space-3)' }}>
          When enabled, MET controls are hidden so you can focus on remaining assessment work. Use the Status filter to view MET controls.
        </p>
      )}

      {multiSelectMode && selectedCount > 0 && (
        <div className="bulk-toolbar">
          <span className="bulk-toolbar-count">
            {selectedCount} control{selectedCount === 1 ? '' : 's'} selected
          </span>
          <select className="bulk-toolbar-select" defaultValue=""
            onChange={(e) => { if (e.target.value) { bulkSetStatus(e.target.value); e.target.value = '' } }}>
            <option value="" disabled>Set status…</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="bulk-toolbar-select" defaultValue=""
            onChange={(e) => {
              const v = e.target.value
              e.target.value = ''
              if (!v) return
              if (v === DEFAULT_INHERITANCE) {
                bulkSetInheritance(DEFAULT_INHERITANCE)
              } else {
                setBulkInheritanceModal({ value: v, source: '' })
              }
            }}>
            <option value="" disabled>Set inheritance…</option>
            {INHERITANCE_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <button className="bulk-toolbar-danger" onClick={() => setConfirmClear(true)}
            title="Reset status, inheritance, and all notes for selected controls">
            Clear Data
          </button>
          <button className="bulk-toolbar-clear" onClick={exitMultiSelect}>Exit Multi-Select</button>
        </div>
      )}

      {results.length === 0 ? (
        <p className="muted">No controls match the current filters.</p>
      ) : (
        <>
          {groups.map(({ family, controls: groupControls }) => {
            const familyIds = groupControls.map((c) => c.id)
            const allFamilySelected = familyIds.length > 0 && familyIds.every((id) => selected.has(id))
            const toggleFamily = () => setSelected((prev) => {
              const next = new Set(prev)
              if (allFamilySelected) { for (const id of familyIds) next.delete(id) }
              else                   { for (const id of familyIds) next.add(id) }
              return next
            })

            const statusCounts = {}
            for (const c of groupControls) {
              const s = readStatus(c.id)
              statusCounts[s] = (statusCounts[s] || 0) + 1
            }
            const STATUS_DISPLAY_ORDER = ['MET', 'In Progress', 'NOT MET', 'Not Started']
            const STATUS_VAR_COLOR = {
              'MET':         'var(--color-met)',
              'In Progress': 'var(--color-in-progress)',
              'NOT MET':     'var(--color-not-met)',
              'Not Started': 'var(--color-not-started)',
            }

            return (
            <div key={family}>
              <div className="control-family-header">
                <div className="control-family-header-top">
                  <span>{family} — {groupControls.length} control{groupControls.length === 1 ? '' : 's'}</span>
                  {multiSelectMode && (
                    <button type="button" className="family-select-btn" onClick={toggleFamily}>
                      {allFamilySelected ? 'Deselect family' : 'Select family'}
                    </button>
                  )}
                </div>
                <div className="control-family-header-progress">
                  {STATUS_DISPLAY_ORDER.filter((s) => statusCounts[s] > 0).map((s, i, arr) => (
                    <span key={s} className="family-progress-item">
                      <span style={{ color: STATUS_VAR_COLOR[s], fontWeight: 600 }}>{statusCounts[s]}</span>
                      {' '}<span>{s}</span>
                      {i < arr.length - 1 && <span className="family-progress-sep"> •</span>}
                    </span>
                  ))}
                </div>
              </div>
              <ul className="control-list">
                {groupControls.map((control) => {
                  const status       = readStatus(control.id)
                  const inheritance  = readInheritance(control.id)
                  const score        = getScore(control.id)
                  const poamOk       = isPoamAllowed(control.id)
                  const hasNote      = hasAnyNote(control)
                  const hasArtifacts = hasObjectiveArtifacts(control)
                  const trending     = getTrendingStatusFromStorage(control)
                  const trendInd     = TRENDING_INDICATOR[trending]
                  const isSelected        = selected.has(control.id)
                  const isOpen            = openQuickLook === control.id
                  const panelId           = `quick-look-${control.id}`
                  const inheritanceSource = readInheritanceSource(control.id)
                  const isWarnOpen        = openWarning === control.id
                  const warnPanelId       = `warning-panel-${control.id}`

                  const warnings     = getControlWarnings(control)
                  const maxSeverity  = warnings.some((w) => w.severity === 'warning') ? 'warning' : 'caution'

                  const rowContent = (
                    <>
                      <span className="mono">{control.id}</span>
                      <span>— {control.title}</span>
                      <span className={`status-badge ${STATUS_BADGE_CLASS[status]}`}>{status}</span>
                      {inheritance !== DEFAULT_INHERITANCE && (
                        <span className={`inheritance-badge ${INHERITANCE_BADGE_CLASS[inheritance]}`}>
                          {inheritance}
                        </span>
                      )}
                      <span
                        className={`score-badge ${SCORE_BADGE_CLASS[String(score)]}`}
                        title={`${Math.abs(score)}-point deduction if not met`}
                      >
                        ({Math.abs(score)})
                      </span>
                      {hasNote && (
                        <span className="row-icon" style={{ color: 'var(--color-text-muted)' }} title="This control has assessment notes or objective notes">
                          <IconNotes size="14px" />
                        </span>
                      )}
                      {hasArtifacts && (
                        <span className="row-icon" style={{ color: 'var(--color-text-muted)' }} title="This control has objective artifact references">
                          <IconPaperclip size="14px" />
                        </span>
                      )}
                      <span className="row-icon" style={{ color: trendInd.color }} title={trendInd.title}>
                        {trending === 'MET'         && <IconTrendingUp size="14px" />}
                        {trending === 'NOT MET'     && <IconTrendingDown size="14px" />}
                        {trending !== 'MET' && trending !== 'NOT MET' && trendInd.symbol}
                      </span>
                      {!poamOk && (
                        <span className="poam-badge" title="Cannot be placed on a POA&M">Non-POA&amp;M</span>
                      )}
                    </>
                  )

                  const warningBtn = warnings.length > 0 && (
                    <button
                      type="button"
                      className={`warning-indicator-btn warning-indicator-btn--${maxSeverity}`}
                      aria-expanded={isWarnOpen}
                      aria-controls={warnPanelId}
                      aria-label={isWarnOpen ? 'Hide status warnings' : 'View status warnings'}
                      title={warnings.length === 1 ? warnings[0].title : 'Multiple status warnings'}
                      onClick={(e) => { e.stopPropagation(); setOpenWarning((prev) => prev === control.id ? null : control.id) }}
                    >
                      ⚠
                    </button>
                  )

                  const warningPanelNote = warnings.length === 1
                    ? warnings[0].note
                    : 'Warnings identify incomplete or potentially inconsistent assessment tracking data.'

                  const warningPanel = warnings.length > 0 && isWarnOpen && (
                    <div className={`warning-panel warning-panel--${maxSeverity}`} id={warnPanelId} role="note">
                      {warnings.map((w, i) => (
                        <div key={i} className={`warning-panel-item warning-panel-item--${w.severity}`}>
                          <strong className="warning-panel-title">{w.title}</strong>
                          <p className="warning-panel-message">{w.message}</p>
                        </div>
                      ))}
                      {warningPanelNote && <p className="warning-panel-note">{warningPanelNote}</p>}
                    </div>
                  )

                  const quickLookBtn = (
                    <button
                      type="button"
                      className="quick-look-btn"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      aria-label={isOpen ? 'Hide assessment progress' : 'Show assessment progress'}
                      title={isOpen ? 'Hide assessment progress' : 'Show assessment progress'}
                      onClick={() => setOpenQuickLook((prev) => prev === control.id ? null : control.id)}
                    >
                      {isOpen ? '▴' : '▾'}
                    </button>
                  )

                  const quickLookPanel = isOpen && (() => {
                    const { total, reviewed, met, notMet, unreviewed } = getObjectiveProgress(control)
                    return (
                      <div className={`quick-look-panel${multiSelectMode ? ' quick-look-panel--multiselect' : ''}`} id={panelId}>
                        <div className="quick-look-stat">
                          <span className="quick-look-stat-label">Reviewed</span>
                          <span className="quick-look-stat-value">{reviewed} / {total}</span>
                        </div>
                        <div className="quick-look-stat">
                          <span className="quick-look-stat-label">MET</span>
                          <span className="quick-look-stat-value" style={{ color: met > 0 ? 'var(--color-met)' : undefined }}>{met}</span>
                        </div>
                        <div className="quick-look-stat">
                          <span className="quick-look-stat-label">NOT MET</span>
                          <span className="quick-look-stat-value" style={{ color: notMet > 0 ? 'var(--color-not-met)' : undefined }}>{notMet}</span>
                        </div>
                        <div className="quick-look-stat">
                          <span className="quick-look-stat-label">Unreviewed</span>
                          <span className="quick-look-stat-value">{unreviewed}</span>
                        </div>
                        <div className="quick-look-stat">
                          <span className="quick-look-stat-label">Trending</span>
                          <span className="quick-look-stat-value" style={{ color: trendInd.color }}>{trending}</span>
                        </div>
                        {inheritance !== DEFAULT_INHERITANCE && (
                          <>
                            <div className="quick-look-stat">
                              <span className="quick-look-stat-label">Inheritance</span>
                              <span className="quick-look-stat-value">{inheritance}</span>
                            </div>
                            <div className="quick-look-stat">
                              <span className="quick-look-stat-label">Inherited From</span>
                              {inheritanceSource.trim() ? (
                                <span className="quick-look-stat-value">{inheritanceSource}</span>
                              ) : (
                                <span className="quick-look-stat-value" style={{ color: 'var(--color-in-progress)' }}>Not documented</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })()

                  return (
                    <li key={control.id} className={isSelected ? 'control-list-item--selected' : ''}>
                      {multiSelectMode ? (
                        <div className="control-row-top">
                          <label className="control-list-checkbox-label">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOne(control.id)}
                              aria-label={`Select ${control.id}`}
                            />
                          </label>
                          <div
                            className="control-list-link control-list-link--selectable"
                            onClick={() => toggleOne(control.id)}
                          >
                            {rowContent}
                          </div>
                          {warningBtn}
                          {quickLookBtn}
                        </div>
                      ) : (
                        <div className="control-row-top">
                          <span className="control-row-spacer" aria-hidden="true" />
                          <Link
                            to={`/controls/${encodeURIComponent(control.id)}${fromSuffix}`}
                            className="control-list-link"
                          >
                            {rowContent}
                          </Link>
                          {warningBtn}
                          {quickLookBtn}
                        </div>
                      )}
                      {quickLookPanel}
                      {warningPanel}
                    </li>
                  )
                })}
              </ul>
            </div>
            )
          })}
        </>
      )}

      {showIconGuide && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="icon-guide-title">
          <div className="confirm-dialog">
            <h2 id="icon-guide-title">Icon Guide</h2>
            <p><strong><IconNotes size="14px" style={{ verticalAlign: 'middle' }} /></strong> — This control has assessment notes or objective notes.</p>
            <p><strong><IconPaperclip size="14px" style={{ verticalAlign: 'middle' }} /></strong> — This control has objective artifact references.</p>
            <p><strong><IconTrendingUp size="14px" style={{ verticalAlign: 'middle', color: 'var(--color-met)' }} /></strong> — Trending Status: MET. All objectives are currently marked MET.</p>
            <p><strong><IconTrendingDown size="14px" style={{ verticalAlign: 'middle', color: 'var(--color-not-met)' }} /></strong> — Trending Status: NOT MET. At least one objective is currently marked NOT MET.</p>
            <p><strong>◐</strong> — Trending Status: In Progress. At least one objective has been reviewed, but the control is not fully trending MET or NOT MET.</p>
            <p><strong>○</strong> — Trending Status: Not Started. No objectives have been reviewed.</p>
            <p><strong>▾ / ▴</strong> — Expands or collapses the Assessment Progress quick look panel for the control.</p>
            <p><strong>⚠</strong> — Warning. This control contains information that may require review. Warnings identify potential assessment inconsistencies, incomplete documentation, missing inheritance details, or other items needing attention.</p>
            <p><strong>Non-POA&amp;M</strong> — This control is marked as not eligible for POA&amp;M treatment.</p>
            <p><strong>(5), (3), (1)</strong> — CMMC scoring value for the control.</p>
            <div className="confirm-dialog-buttons">
              <button onClick={() => setShowIconGuide(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {bulkInheritanceModal && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="bulk-inheritance-title">
          <div className="confirm-dialog">
            <h2 id="bulk-inheritance-title">Set Inheritance Source</h2>
            <p>
              You are setting inheritance to <strong>{bulkInheritanceModal.value}</strong> for{' '}
              {selectedCount} control{selectedCount === 1 ? '' : 's'}.
            </p>
            <div className="control-meta-field" style={{ marginTop: 'var(--space-3)' }}>
              <label htmlFor="bulk-inheritance-source" style={{ display: 'block', marginBottom: 'var(--space-1)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                Inherited From
              </label>
              <input
                id="bulk-inheritance-source"
                type="text"
                value={bulkInheritanceModal.source}
                onChange={(e) => setBulkInheritanceModal((prev) => ({ ...prev, source: e.target.value }))}
                placeholder="e.g. Microsoft 365 GCC High, AWS GovCloud"
                style={{ width: '100%', boxSizing: 'border-box' }}
                autoFocus
              />
              <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Enter the provider, service, or source responsible for the inherited control implementation.
              </p>
            </div>
            <div className="confirm-dialog-buttons">
              <button onClick={() => setBulkInheritanceModal(null)}>Cancel</button>
              <button
                disabled={!bulkInheritanceModal.source.trim()}
                onClick={() => {
                  bulkSetInheritance(bulkInheritanceModal.value, bulkInheritanceModal.source.trim())
                  setBulkInheritanceModal(null)
                }}
              >
                Apply Inheritance
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmClear && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="confirm-dialog">
            <h2 id="confirm-title">Clear selected control data?</h2>
            <p>This will reset the selected controls to:</p>
            <ul>
              <li>Assessment Status: Not Started</li>
              <li>Inheritance: None</li>
              <li>Assessment Notes: deleted</li>
              <li>Objective Notes: deleted</li>
              <li>Objective Statuses: Unreviewed</li>
              <li>Evidence Pool entries: deleted</li>
              <li>Objective Artifact references: deleted</li>
            </ul>
            <p>Scoring metadata, POA&amp;M eligibility, control text, evidence mappings, and relationships will not be changed.</p>
            <p>This only affects data stored in this browser.</p>
            <div className="confirm-dialog-buttons">
              <button onClick={() => setConfirmClear(false)}>Cancel</button>
              <button className="bulk-toolbar-danger" onClick={() => { bulkClearData(); setConfirmClear(false) }}>
                Clear Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ControlLibrary
