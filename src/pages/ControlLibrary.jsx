import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import controls from '../data/controls/index'
import { STATUSES, readStatus, writeStatus, STATUS_BADGE_CLASS } from '../utils/status'
import { readNote, writeNote } from '../utils/notes'
import { hasObjectiveNotes, writeObjectiveNote } from '../utils/objectiveNotes'
import { hasObjectiveArtifacts } from '../utils/objectiveArtifacts'
import {
  INHERITANCE_VALUES,
  DEFAULT_INHERITANCE,
  INHERITANCE_BADGE_CLASS,
  readInheritance,
  writeInheritance,
} from '../utils/inheritance'
import {
  SCORE_VALUES,
  SCORE_BADGE_CLASS,
  getScore,
  isPoamAllowed,
} from '../utils/scoring'

function hasAnyNote(control) {
  if (readNote(control.id).trim() !== '') return true
  return hasObjectiveNotes(control)
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

const FILTER_KEYS = ['search', 'family', 'status', 'notes', 'artifacts', 'inheritance', 'score', 'poam']
const SEARCH_DEBOUNCE_MS = 500

function ControlLibrary() {
  const [searchParams, setSearchParams] = useSearchParams()

  const urlSearch     = searchParams.get('search')      ?? DEFAULTS.search
  const familyFilter  = searchParams.get('family')      ?? DEFAULTS.family
  const statusFilter  = searchParams.get('status')      ?? DEFAULTS.status
  const notesFilter      = searchParams.get('notes')     ?? DEFAULTS.notes
  const artifactsFilter  = searchParams.get('artifacts') ?? DEFAULTS.artifacts
  const inheritFilter    = searchParams.get('inheritance') ?? DEFAULTS.inheritance
  const scoreFilter   = searchParams.get('score')       ?? DEFAULTS.score
  const poamFilter    = searchParams.get('poam')        ?? DEFAULTS.poam

  const location = useLocation()

  const [searchInput, setSearchInput] = useState(urlSearch)
  const [selected, setSelected]       = useState(new Set())
  const [updateKey, setUpdateKey]     = useState(0)
  const [confirmClear, setConfirmClear] = useState(false)
  const [hideMet, setHideMet] = useState(() => localStorage.getItem('cmmc-hide-met-controls') === 'true')
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

  const matchesHideMet = (c) => {
    if (!hideMet || statusFilter === 'MET') return true
    return readStatus(c.id) !== 'MET'
  }

  // Preserve official index.js order — do NOT sort by compareIds
  const results = controls.filter((c) =>
    matchesSearch(c) && matchesFamily(c) && matchesStatus(c) &&
    matchesNotes(c) && matchesArtifacts(c) && matchesInheritance(c) &&
    matchesScore(c) && matchesPoam(c) && matchesHideMet(c)
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
  const selectedControls = controls.filter((c) => selected.has(c.id))

  const bulkSetStatus      = (s) => { for (const id of selected) writeStatus(id, s); forceUpdate() }
  const bulkSetInheritance = (v) => { for (const id of selected) writeInheritance(id, v); forceUpdate() }
  const bulkClearData      = () => {
    for (const ctrl of selectedControls) {
      writeStatus(ctrl.id, 'Not Started')
      writeInheritance(ctrl.id, DEFAULT_INHERITANCE)
      writeNote(ctrl.id, '')
      for (const obj of ctrl.objectives ?? []) writeObjectiveNote(ctrl.id, obj.id, '')
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
        <button
          onClick={handleClearFilters}
          disabled={!hasActiveFilters}
          title={hasActiveFilters ? 'Reset all filters' : 'No active filters'}
        >
          Clear Filters
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
          <input type="checkbox" checked={hideMet} onChange={toggleHideMet} />
          Hide MET controls
        </label>
      </div>
      {hideMet && statusFilter !== 'MET' && (
        <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
          MET controls are hidden. Use the Status filter to view MET controls.
        </p>
      )}

      <p className="result-count">
        Showing {results.length} of {controls.length} controls
      </p>

      {selectedCount > 0 && (
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
            onChange={(e) => { if (e.target.value) { bulkSetInheritance(e.target.value); e.target.value = '' } }}>
            <option value="" disabled>Set inheritance…</option>
            {INHERITANCE_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <button className="bulk-toolbar-danger" onClick={() => setConfirmClear(true)}
            title="Reset status, inheritance, and all notes for selected controls">
            Clear Data
          </button>
          <button className="bulk-toolbar-clear" onClick={clearSelection}>Clear Selection</button>
        </div>
      )}

      {results.length === 0 ? (
        <p className="muted">No controls match the current filters.</p>
      ) : (
        <>
          <ul className="control-list" style={{ marginBottom: 0 }}>
            <li className="control-list-select-all">
              <label className="control-list-checkbox-label">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={toggleAll}
                />
                <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                  {allSelected ? 'Deselect all' : 'Select all'} ({allResultIds.length})
                </span>
              </label>
            </li>
          </ul>
          {groups.map(({ family, controls: groupControls }) => (
            <div key={family}>
              <div className="control-family-header">
                {family} — {groupControls.length} control{groupControls.length === 1 ? '' : 's'}
              </div>
              <ul className="control-list">
                {groupControls.map((control) => {
                  const status      = readStatus(control.id)
                  const inheritance = readInheritance(control.id)
                  const score       = getScore(control.id)
                  const poamOk      = isPoamAllowed(control.id)
                  const hasNote      = hasAnyNote(control)
                  const hasArtifacts = hasObjectiveArtifacts(control)
                  const isSelected   = selected.has(control.id)
                  return (
                    <li key={control.id} className={isSelected ? 'control-list-item--selected' : ''}>
                      <label className="control-list-checkbox-label" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(control.id)} />
                      </label>
                      <Link
                        to={`/controls/${encodeURIComponent(control.id)}${fromSuffix}`}
                        className="control-list-link"
                      >
                        <span className="mono">{control.id}</span>
                        <span>— {control.title}</span>
                        <span className={`status-badge ${STATUS_BADGE_CLASS[status]}`}>{status}</span>
                        {inheritance !== DEFAULT_INHERITANCE && (
                          <span className={`inheritance-badge ${INHERITANCE_BADGE_CLASS[inheritance]}`}>
                            {inheritance}
                          </span>
                        )}
                        {hasNote && (
                          <span className="notes-indicator" title="This control has notes (control or objective level)">📝</span>
                        )}
                        {hasArtifacts && (
                          <span className="notes-indicator" title="This control has objective artifact references">📎</span>
                        )}
                        {!poamOk && (
                          <span className="poam-badge" title="Cannot be placed on a POA&M">Non-POA&amp;M</span>
                        )}
                        <span
                          className={`score-badge ${SCORE_BADGE_CLASS[String(score)]}`}
                          title={`${Math.abs(score)}-point deduction if not met`}
                        >
                          ({Math.abs(score)})
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </>
      )}
      {confirmClear && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="confirm-dialog">
            <h2 id="confirm-title">Clear selected control data?</h2>
            <p>This will reset the selected controls to:</p>
            <ul>
              <li>Status: Not Started</li>
              <li>Inheritance: None</li>
              <li>Control notes: deleted</li>
              <li>Objective notes: deleted</li>
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
