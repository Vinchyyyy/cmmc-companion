import { useState, useEffect, useMemo } from 'react'
import AutoResizeTextarea from '../components/AutoResizeTextarea'
import ExpectedEvidenceTypes from '../components/ExpectedEvidenceTypes'
import { useParams, Link, useSearchParams, useLocation } from 'react-router-dom'
import controls from '../data/controls/index.js'
import { PROVIDERS } from '../data/providers'
import { getEnvironmentTechTags } from '../utils/environmentProfile'
import evidenceTypes from '../data/evidence/index.js'
import { STATUSES, readStatus, writeStatus, STATUS_BADGE_CLASS } from '../utils/status'
import { readNote, writeNote } from '../utils/notes'
import { readObjectiveNote, writeObjectiveNote } from '../utils/objectiveNotes'
import {
  INHERITANCE_VALUES,
  DEFAULT_INHERITANCE,
  INHERITANCE_BADGE_CLASS,
  readInheritance,
  writeInheritance,
  readInheritanceSource,
  writeInheritanceSource,
} from '../utils/inheritance'
import { readAssignedTo, writeAssignedTo, normalizeAssignee } from '../utils/assignment'
import { readPool, writePool } from '../utils/evidencePool'
import { readObjectiveArtifacts, writeObjectiveArtifacts } from '../utils/objectiveArtifacts'
import { buildArtifactIndex } from '../utils/artifactIndex.js'
import { findByName, findOrCreate } from '../utils/artifactRegistry.js'
import ArtifactDetailModal from '../components/ArtifactDetailModal.jsx'
import { getObjectiveArtifactSuggestions } from '../utils/evidenceRecommendations.js'
import { readObjectiveResult, writeObjectiveResult } from '../utils/objectiveResults'
import {
  OBJECTIVE_STATUSES,
  OBJECTIVE_STATUS_UNREVIEWED,
  readObjectiveStatus,
  writeObjectiveStatus,
  getTrendingStatus,
} from '../utils/objectiveStatus'

// scoring.js is intentionally NOT imported here — the Scoring & POA&M
// section has been removed from the detail view. Metadata remains available
// in the Library (badges, filters) and Quick Search.

function resolveBackUrl(rawFrom) {
  if (!rawFrom) return '/controls'
  if (/^[a-z][a-z0-9+.-]*:/i.test(rawFrom)) return '/controls'
  if (rawFrom.startsWith('//')) return '/controls'
  if (rawFrom !== '/controls' && !rawFrom.startsWith('/controls?')) return '/controls'
  return rawFrom
}

function ControlDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const control = controls.find((c) => c.id === id)

  const backUrl = resolveBackUrl(searchParams.get('from'))

  const [status, setStatus]           = useState(() => readStatus(id))
  const [note, setNote]               = useState(() => readNote(id))
  const [inheritance, setInheritance] = useState(() => readInheritance(id))
  const [inheritanceSource, setInheritanceSource] = useState(() => readInheritanceSource(id))
  const [assignedTo, setAssignedTo] = useState(() => readAssignedTo(id))
  const [objectiveNotes, setObjectiveNotes] = useState(() => loadObjectiveNotes(id, control))
  const [pool, setPool]               = useState(() => readPool(id))
  const [poolInput, setPoolInput]     = useState('')
  const [objectiveStatuses, setObjectiveStatuses]   = useState(() => loadObjectiveStatuses(id, control))
  const [objectiveArtifacts, setObjectiveArtifacts] = useState(() => loadObjectiveArtifacts(id, control))
  const [objectiveResults, setObjectiveResults]     = useState(() => loadObjectiveResults(id, control))
  const [objArtifactInputs, setObjArtifactInputs]   = useState({})
  const [focusedObjId, setFocusedObjId]             = useState(null)
  const [poolFocused, setPoolFocused]               = useState(false)
  const [suggestionPages, setSuggestionPages]       = useState({})
  const [expandedSuggestions, setExpandedSuggestions] = useState(() => new Set())
  const [selectedArtifact, setSelectedArtifact] = useState(null)
  // Bumped after tag saves so findByName() re-runs and untagged chip state updates.
  const [artifactTagVersion, setArtifactTagVersion] = useState(0)

  const globalArtifactNames = useMemo(() => buildArtifactIndex(controls).map((e) => e.artifact), [])

  useEffect(() => {
    setStatus(readStatus(id))
    setNote(readNote(id))
    setInheritance(readInheritance(id))
    setInheritanceSource(readInheritanceSource(id))
    setAssignedTo(readAssignedTo(id))
    setObjectiveNotes(loadObjectiveNotes(id, control))
    setObjectiveStatuses(loadObjectiveStatuses(id, control))
    setPool(readPool(id))
    setPoolInput('')
    setObjectiveArtifacts(loadObjectiveArtifacts(id, control))
    setObjectiveResults(loadObjectiveResults(id, control))
    setObjArtifactInputs({})
    setFocusedObjId(null)
    setPoolFocused(false)
    setSuggestionPages({})
    setExpandedSuggestions(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Scroll to the objective anchor when navigating here via a hash link
  // (e.g. from Evidence Reuse Recommendation source links).
  // The timeout lets React finish painting the new control's DOM first.
  useEffect(() => {
    if (!location.hash) return
    const targetId = location.hash.replace('#', '')
    const timer = setTimeout(() => {
      const el = document.getElementById(targetId)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
    return () => clearTimeout(timer)
  }, [id, location.hash])

  const trendingStatus = useMemo(
    () => getTrendingStatus(control?.objectives ?? [], objectiveStatuses),
    [control, objectiveStatuses]
  )

  const handleStatusChange      = (e) => { const v = e.target.value; setStatus(v); writeStatus(id, v) }
  const handleNoteChange        = (e) => {
    const v = e.target.value
    setNote(v)
    writeNote(id, v)
    syncAutoStatus(v, objectiveNotes, status, id, setStatus)
  }
  const handleInheritanceChange = (e) => { const v = e.target.value; setInheritance(v); writeInheritance(id, v) }
  const handleInheritanceSourceChange = (e) => { const v = e.target.value; setInheritanceSource(v); writeInheritanceSource(id, v) }
  const handleAssignedToChange = (e) => { const v = e.target.value; setAssignedTo(v); writeAssignedTo(id, v) }
  const handleAssignedToBlur = () => { const n = normalizeAssignee(assignedTo); setAssignedTo(n); writeAssignedTo(id, n) }
  const handleObjectiveStatusChange = (objId, value) => {
    setObjectiveStatuses((prev) => ({ ...prev, [objId]: value }))
    writeObjectiveStatus(id, objId, value)
    if (value !== OBJECTIVE_STATUS_UNREVIEWED) promoteToInProgress(status, id, setStatus)
  }

  const handleObjectiveNoteChange = (objId, value) => {
    const nextObjNotes = { ...objectiveNotes, [objId]: value }
    setObjectiveNotes(nextObjNotes)
    writeObjectiveNote(id, objId, value)
    syncAutoStatus(note, nextObjNotes, status, id, setStatus)
  }

  const handleObjectiveResultChange = (objId, field, value) => {
    const current = objectiveResults[objId] ?? { interviews: '', examine: '', test: '', overallComments: '' }
    const next = { ...current, [field]: value }
    setObjectiveResults((prev) => ({ ...prev, [objId]: next }))
    writeObjectiveResult(id, objId, next)
    promoteToInProgress(status, id, setStatus)
  }

  const commitPoolInput = (raw) => {
    const trimmed = raw.trim()
    if (!trimmed || pool.includes(trimmed)) { setPoolInput(''); return }
    const next = [...pool, trimmed]
    setPool(next)
    writePool(id, next)
    setPoolInput('')
    promoteToInProgress(status, id, setStatus)
  }

  const handlePoolInputChange = (e) => { setPoolInput(e.target.value) }

  const handlePoolKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitPoolInput(poolInput)
    }
  }

  const handleRemovePoolItem = (item) => {
    const nextPool = pool.filter((p) => p !== item)
    setPool(nextPool)
    writePool(id, nextPool)

    // Cascade: remove this artifact from every objective's artifact list
    const nextObjArtifacts = {}
    for (const [objId, artifacts] of Object.entries(objectiveArtifacts)) {
      const filtered = artifacts.filter((a) => a !== item)
      nextObjArtifacts[objId] = filtered
      writeObjectiveArtifacts(id, objId, filtered)
    }
    setObjectiveArtifacts(nextObjArtifacts)
  }

  const getObjSuggestions = (objId) => {
    const input = (objArtifactInputs[objId] ?? '').trim()
    if (!input) return []
    const assigned = objectiveArtifacts[objId] ?? []
    const lower = input.toLowerCase()
    if (globalArtifactNames.some((n) => n.toLowerCase() === lower)) return []
    return globalArtifactNames
      .filter((n) => n.toLowerCase().includes(lower) && !assigned.includes(n))
      .slice(0, 8)
  }

  const getPoolSuggestions = () => {
    const input = poolInput.trim()
    if (!input) return []
    const lower = input.toLowerCase()
    if (globalArtifactNames.some((n) => n.toLowerCase() === lower)) return []
    return globalArtifactNames
      .filter((n) => n.toLowerCase().includes(lower) && !pool.includes(n))
      .slice(0, 8)
  }

  const commitObjArtifact = (objId, raw) => {
    const trimmed = raw.trim()
    if (!trimmed) { setObjArtifactInputs((prev) => ({ ...prev, [objId]: '' })); return }

    const current = objectiveArtifacts[objId] ?? []
    const needsObjectiveUpdate = !current.includes(trimmed)
    const needsPoolUpdate = !pool.includes(trimmed)

    // Both already present — nothing to write
    if (!needsObjectiveUpdate && !needsPoolUpdate) {
      setObjArtifactInputs((prev) => ({ ...prev, [objId]: '' }))
      return
    }

    if (needsObjectiveUpdate) {
      const next = [...current, trimmed]
      setObjectiveArtifacts((prev) => ({ ...prev, [objId]: next }))
      writeObjectiveArtifacts(id, objId, next)
    }

    if (needsPoolUpdate) {
      const nextPool = [...pool, trimmed]
      setPool(nextPool)
      writePool(id, nextPool)
    }

    promoteToInProgress(status, id, setStatus)
    setObjArtifactInputs((prev) => ({ ...prev, [objId]: '' }))
  }

  const handleObjArtifactKeyDown = (e, objId) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitObjArtifact(objId, objArtifactInputs[objId] ?? '')
    }
  }

  const handleRemoveObjArtifact = (objId, item) => {
    const current = objectiveArtifacts[objId] ?? []
    const next = current.filter((a) => a !== item)
    setObjectiveArtifacts((prev) => ({ ...prev, [objId]: next }))
    writeObjectiveArtifacts(id, objId, next)
  }

  if (!control) {
    return (
      <div className="page">
        <h1>Control not found</h1>
        <p>No control with id &ldquo;{id}&rdquo; exists.</p>
        <p><Link to={backUrl}>← Back to Control Library</Link></p>
      </div>
    )
  }

  const supportingEvidence = evidenceTypes.filter((e) => e.likelyControls.includes(control.id))

  return (
    <div className="page">
      <p><Link to={backUrl}>← Back to Control Library</Link></p>

      <h1>
        <Link to={`/controls/${control.id}`} className="mono">{control.id}</Link>
        {' — '}{control.title}
      </h1>

      {/* Assessment tracking */}
      <section>
        <div className="control-meta-row">
          <div className="control-meta-field">
            <label htmlFor="assessment-status">
              <strong>Assessment Status</strong>
            </label>
            <div className="control-meta-input-row">
              <select
                id="assessment-status"
                value={status}
                onChange={handleStatusChange}
              >
                {STATUSES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <span className={`status-badge ${STATUS_BADGE_CLASS[status]}`}>{status}</span>
            </div>
          </div>

          <div className="control-meta-field">
            <label htmlFor="inheritance-status">
              <strong>Inheritance</strong>
            </label>
            <div className="control-meta-input-row">
              <select
                id="inheritance-status"
                value={inheritance}
                onChange={handleInheritanceChange}
              >
                {INHERITANCE_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              {inheritance !== DEFAULT_INHERITANCE && (
                <span className={`inheritance-badge ${INHERITANCE_BADGE_CLASS[inheritance]}`}>
                  {inheritance}
                </span>
              )}
            </div>
          </div>

          {inheritance !== DEFAULT_INHERITANCE && (
            <div className="control-meta-field">
              <label htmlFor="inheritance-source">
                <strong>Inherited From</strong>
              </label>
              <div className="provider-picker-wrapper">
                <input
                  id="inheritance-source"
                  type="text"
                  value={inheritanceSource}
                  onChange={handleInheritanceSourceChange}
                  placeholder="e.g. Microsoft 365 GCC High, AWS GovCloud"
                  autoComplete="off"
                  className={
                    inheritanceSource.trim() &&
                    !PROVIDERS.some((p) => p.name === inheritanceSource)
                      ? 'provider-picker-input--open'
                      : ''
                  }
                />
                {inheritanceSource.trim() &&
                  (() => {
                    const q = inheritanceSource.toLowerCase()
                    // Merge PROVIDERS catalog with environment tech tags.
                    // Environment tags take precedence on case-insensitive collisions.
                    const envTags = getEnvironmentTechTags()
                    const envLower = new Set(envTags.map((t) => t.toLowerCase()))
                    const catalogNames = PROVIDERS
                      .map((p) => p.name)
                      .filter((name) => !envLower.has(name.toLowerCase()))
                    const allCandidates = [...envTags, ...catalogNames]
                    const suggestions = allCandidates
                      .filter((name) => name.toLowerCase().includes(q))
                      .filter((name) => name !== inheritanceSource)
                      .slice(0, 8)
                    return suggestions.length > 0 ? (
                      <ul className="provider-picker-results">
                        {suggestions.map((name) => (
                          <li
                            key={name}
                            className="provider-picker-result"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setInheritanceSource(name)
                              writeInheritanceSource(id, name)
                            }}
                          >
                            {name}
                          </li>
                        ))}
                      </ul>
                    ) : null
                  })()}
              </div>
            </div>
          )}

          <div className="control-meta-field">
            <label><strong>Trending Status</strong></label>
            <div className="control-meta-input-row" style={{ marginTop: 'var(--space-1)' }}>
              <span className={`status-badge ${STATUS_BADGE_CLASS[trendingStatus]}`}>
                {trendingStatus}
              </span>
            </div>
          </div>

          <div className="control-meta-field">
            <label htmlFor="assigned-to">
              <strong>Assigned To</strong>
            </label>
            <div className="provider-picker-wrapper">
              <input
                id="assigned-to"
                type="text"
                value={assignedTo}
                onChange={handleAssignedToChange}
                onBlur={handleAssignedToBlur}
                placeholder="Type a person's name..."
                autoComplete="off"
                className={(() => {
                  if (!assignedTo.trim()) return ''
                  const used = [...new Set(controls.map((c) => normalizeAssignee(readAssignedTo(c.id))).filter(Boolean))]
                  return used.includes(normalizeAssignee(assignedTo)) ? '' : 'provider-picker-input--open'
                })()}
              />
              {(() => {
                if (!assignedTo.trim()) return null
                const used = [...new Set(controls.map((c) => normalizeAssignee(readAssignedTo(c.id))).filter(Boolean))].sort()
                if (used.includes(normalizeAssignee(assignedTo))) return null
                const q = assignedTo.toLowerCase()
                const suggestions = used.filter((n) => n.toLowerCase().includes(q)).slice(0, 8)
                if (suggestions.length === 0) return null
                return (
                  <ul className="provider-picker-results">
                    {suggestions.map((name) => (
                      <li
                        key={name}
                        className="provider-picker-result"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setAssignedTo(name)
                          writeAssignedTo(id, name)
                        }}
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Assessment Notes UI removed — field hidden but fully retained for backward compatibility.
            Storage key, read/write logic, import/export support, and localStorage data are preserved.
            Assessment data collection has moved to the objective level (Interview, Examine, Test,
            Overall Comments). Re-expose this block to restore the UI. */}

        <div style={{ marginTop: 'var(--space-4)' }}>
          <label htmlFor="pool-input">
            <strong>Evidence Pool{pool.length > 0 ? ` (${pool.length})` : ''}</strong>
          </label>
          <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 'var(--space-1) 0 var(--space-2)' }}>
            Artifact names only — no file contents, no sensitive data. Examples: SSP.pdf, RBAC Policy.docx
          </p>
          <div className="obj-artifact-input-wrap">
            <input
              id="pool-input"
              type="text"
              className="evidence-pool-input"
              value={poolInput}
              onChange={handlePoolInputChange}
              onKeyDown={handlePoolKeyDown}
              onFocus={() => setPoolFocused(true)}
              onBlur={() => setPoolFocused(false)}
              placeholder="Type an artifact name, press Enter or comma to add"
              autoComplete="off"
            />
            {poolFocused && getPoolSuggestions().length > 0 && (
              <ul className="artifact-suggestions">
                {getPoolSuggestions().map((s) => (
                  <li
                    key={s}
                    className="artifact-suggestion-item"
                    onMouseDown={(e) => { e.preventDefault(); setPoolInput(s) }}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {pool.length > 0 && (
            <div className="evidence-chips">
              {pool.map((item) => (
                <span key={item} className="evidence-chip">
                  <span className="evidence-chip-name" title={item}>{item}</span>
                  <button
                    type="button"
                    className="evidence-chip-remove"
                    onClick={() => handleRemovePoolItem(item)}
                    aria-label={`Remove ${item} from Evidence Pool`}
                  >×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="button-group">
          <Link to={`/relationships?control=${control.id}`}>
            <button>View Relationships</button>
          </Link>
          <Link to={`/evidence?search=${encodeURIComponent(control.id)}`}>
            <button>Search Related Evidence</button>
          </Link>
        </div>
      </section>

      <section>
        <h2>Control Text</h2>
        <p>{control.controlText}</p>
      </section>

      <section>
        <h2>Plain English</h2>
        <p>{control.plainEnglish}</p>
      </section>

      <section>
        <h2>Assessment Objectives</h2>
        {control.objectives.map((obj) => {
          const objStatusId = `obj-status-${control.id}-${obj.id}`
          const objNoteId = `obj-note-${control.id}-${obj.id}`
          const objArtifactInputId = `obj-artifacts-${control.id}-${obj.id}`
          const suggestions = focusedObjId === obj.id ? getObjSuggestions(obj.id) : []
          const assignedArtifacts = objectiveArtifacts[obj.id] ?? []
          return (
            <div key={obj.id} id={`objective-${obj.id}`} style={{ marginBottom: 'var(--space-6)' }}>
              <h3>
                <span className="mono">[{obj.id}]</span> {obj.text}
              </h3>

              <div style={{ marginBottom: 'var(--space-3)' }}>
                <label htmlFor={objStatusId}><strong>Objective Status</strong></label>
                <div className="control-meta-input-row" style={{ marginTop: 'var(--space-1)' }}>
                  <select
                    id={objStatusId}
                    value={objectiveStatuses[obj.id] ?? OBJECTIVE_STATUS_UNREVIEWED}
                    onChange={(e) => handleObjectiveStatusChange(obj.id, e.target.value)}
                  >
                    {OBJECTIVE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <h4>What to look for</h4>
              <p>{obj.whatToLookFor}</p>
              <h4>Common evidence</h4>
              <ul>
                {obj.commonEvidence.map((item, i) => <li key={i}>{item}</li>)}
              </ul>

              <ExpectedEvidenceTypes
                expectedTags={obj.expectedTags}
                note={obj.expectedTagsNote}
              />

              <div style={{ marginTop: 'var(--space-3)' }}>
                <label htmlFor={objArtifactInputId}>
                  <strong>Artifacts{assignedArtifacts.length > 0 ? ` (${assignedArtifacts.length})` : ''}</strong>
                </label>
                <div className="obj-artifact-input-wrap">
                  <input
                    id={objArtifactInputId}
                    type="text"
                    className="evidence-pool-input"
                    value={objArtifactInputs[obj.id] ?? ''}
                    onChange={(e) => setObjArtifactInputs((prev) => ({ ...prev, [obj.id]: e.target.value }))}
                    onKeyDown={(e) => handleObjArtifactKeyDown(e, obj.id)}
                    onFocus={() => setFocusedObjId(obj.id)}
                    onBlur={() => setFocusedObjId(null)}
                    placeholder={pool.length > 0 ? 'Type to filter pool entries, or enter a new name' : 'Type an artifact name, press Enter or comma to add'}
                    autoComplete="off"
                  />
                  {suggestions.length > 0 && (
                    <ul className="artifact-suggestions">
                      {suggestions.map((s) => (
                        <li
                          key={s}
                          className="artifact-suggestion-item"
                          onMouseDown={(e) => { e.preventDefault(); setObjArtifactInputs((prev) => ({ ...prev, [obj.id]: s })) }}
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {assignedArtifacts.length > 0 && (
                  <div className="evidence-chips" data-tag-version={artifactTagVersion}>
                    {assignedArtifacts.map((item) => {
                      const rec = findByName(item)
                      const untagged = !rec || !Array.isArray(rec.tags) || rec.tags.length === 0
                      return (
                        <span
                          key={item}
                          className={`evidence-chip${untagged ? ' evidence-chip--untagged' : ''}`}
                          title={untagged ? 'No evidence tags yet — click to add tags.' : undefined}
                        >
                          <button
                            type="button"
                            className="evidence-chip-name evidence-chip-name--button"
                            title={item}
                            onClick={() => setSelectedArtifact(findOrCreate(item))}
                            aria-label={`Edit evidence tags for ${item}`}
                          >{item}</button>
                          <button
                            type="button"
                            className="evidence-chip-remove"
                            onClick={(e) => { e.stopPropagation(); handleRemoveObjArtifact(obj.id, item) }}
                            aria-label={`Remove ${item} from objective ${obj.id}`}
                          >×</button>
                        </span>
                      )
                    })}
                  </div>
                )}

                {(() => {
                  const ec = obj.evidenceClass
                  if (ec !== 'artifact' && ec !== 'mixed') return null
                  const PAGE_SIZE = 5
                  const allSuggestions = getObjectiveArtifactSuggestions({
                    control,
                    objective: obj,
                    allControls: controls,
                    limit: 1000,
                  })
                  if (allSuggestions.length === 0) return null

                  const total = allSuggestions.length
                  const isOpen = expandedSuggestions.has(obj.id)

                  const toggleOpen = () => {
                    setExpandedSuggestions((prev) => {
                      const next = new Set(prev)
                      if (next.has(obj.id)) next.delete(obj.id)
                      else next.add(obj.id)
                      return next
                    })
                  }

                  const totalPages = Math.ceil(total / PAGE_SIZE)
                  const rawPage = suggestionPages[obj.id] ?? 0
                  const page = Math.min(rawPage, totalPages - 1)
                  const start = page * PAGE_SIZE
                  const pageSuggestions = allSuggestions.slice(start, start + PAGE_SIZE)

                  const setPage = (next) =>
                    setSuggestionPages((prev) => ({ ...prev, [obj.id]: next }))

                  return (
                    <div className="evidence-reuse-suggestions">
                      <button
                        type="button"
                        className="evidence-reuse-suggestions-toggle"
                        onClick={toggleOpen}
                        aria-expanded={isOpen}
                      >
                        <span className="evidence-reuse-suggestions-chevron" aria-hidden="true">
                          {isOpen ? '▼' : '▶'}
                        </span>
                        <span className="evidence-reuse-suggestions-label">
                          Suggested Existing Artifacts ({total})
                        </span>
                      </button>

                      {isOpen && (
                        <>
                          {total > PAGE_SIZE && (
                            <p className="evidence-reuse-suggestions-count">
                              Showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total}
                            </p>
                          )}
                          <ul>
                            {pageSuggestions.map((s) => (
                              <li key={s.artifact} className="evidence-reuse-suggestion">
                                <button
                                  type="button"
                                  className="evidence-reuse-suggestion-add"
                                  onClick={() => commitObjArtifact(obj.id, s.artifact)}
                                  aria-label={`Add ${s.artifact} to objective ${obj.id}`}
                                >+</button>
                                <div className="evidence-reuse-suggestion-body">
                                  <span className="evidence-reuse-suggestion-name">{s.artifact}</span>
                                  <span className="evidence-reuse-suggestion-source">
                                    from{' '}
                                    <Link
                                      to={`/controls/${encodeURIComponent(s.sourceControlId)}#objective-${s.sourceObjectiveId}`}
                                      title={`${s.sourceControlId} — ${s.sourceControlTitle}`}
                                    >
                                      {s.sourceControlId}
                                    </Link>
                                    {' '}[{s.sourceObjectiveId}]
                                  </span>
                                  {s.rationale && (
                                    <span className="evidence-reuse-suggestion-rationale">{s.rationale}</span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                          {total > PAGE_SIZE && (
                            <div className="evidence-reuse-suggestions-pagination">
                              <button
                                type="button"
                                onClick={() => setPage(page - 1)}
                                disabled={page === 0}
                                aria-label="Previous suggestions"
                              >← Previous</button>
                              <button
                                type="button"
                                onClick={() => setPage(page + 1)}
                                disabled={page >= totalPages - 1}
                                aria-label="Next suggestions"
                              >Next →</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })()}
              </div>

              {[
                { field: 'interviews',      label: 'Interviews',       placeholder: 'Interview findings for this objective…' },
                { field: 'examine',         label: 'Examine',          placeholder: 'Examined artifacts or documents…' },
                { field: 'test',            label: 'Test',             placeholder: 'Test results or observations…' },
                { field: 'overallComments', label: 'Overall Comments', placeholder: 'Overall assessment comments for this objective…' },
              ].map(({ field, label, placeholder }) => {
                const fieldId = `obj-${field}-${control.id}-${obj.id}`
                return (
                  <div key={field} style={{ marginTop: 'var(--space-3)' }}>
                    <label htmlFor={fieldId}><strong>{label}</strong></label>
                    <AutoResizeTextarea
                      id={fieldId}
                      value={(objectiveResults[obj.id] ?? {})[field] ?? ''}
                      onChange={(e) => handleObjectiveResultChange(obj.id, field, e.target.value)}
                      rows={3}
                      placeholder={placeholder}
                    />
                  </div>
                )
              })}

              {/* Objective Notes UI removed — field hidden but fully retained for backward compatibility.
                  Storage keys, read/write logic, import/export support, and existing localStorage data
                  are preserved. Structured result fields (Interviews, Examine, Test, Overall Comments)
                  replace this field. Re-expose this block to restore the UI. */}
            </div>
          )
        })}
      </section>

      <section>
        <h2>Supporting Evidence</h2>
        {supportingEvidence.length === 0 ? (
          <p className="muted">No mapped evidence types yet.</p>
        ) : (
          <ul>
            {supportingEvidence.map((e) => (
              <li key={e.name}>
                <h3>
                  <Link to={`/evidence?search=${encodeURIComponent(e.name)}`}>
                    {e.name}
                  </Link>
                </h3>
                <p>{e.description}</p>
                <p><strong>Reasoning:</strong> {e.reasoning}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Common Artifacts</h2>
        <ul>
          {control.commonArtifacts.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </section>

      <section>
        <h2>Common Gaps</h2>
        <ul>
          {control.commonGaps.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </section>

      <ArtifactDetailModal
        key={selectedArtifact?.id}
        isOpen={!!selectedArtifact}
        artifact={selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
        onTagsUpdated={() => setArtifactTagVersion((v) => v + 1)}
      />
    </div>
  )
}

// Artifact-driven promotion only. Never reverts — reversion stays note-driven
// via syncAutoStatus.
function promoteToInProgress(currentStatus, controlId, setStatus) {
  if (currentStatus !== 'Not Started') return
  writeStatus(controlId, 'In Progress')
  setStatus('In Progress')
}

function syncAutoStatus(assessmentNote, objNotes, currentStatus, controlId, setStatus) {
  if (currentStatus !== 'Not Started' && currentStatus !== 'In Progress') return
  const allEmpty =
    assessmentNote.trim() === '' &&
    Object.values(objNotes).every((v) => (v ?? '').trim() === '')
  const targetStatus = allEmpty ? 'Not Started' : 'In Progress'
  if (targetStatus === currentStatus) return
  writeStatus(controlId, targetStatus)
  setStatus(targetStatus)
}

function loadObjectiveNotes(controlId, control) {
  if (!control) return {}
  const map = {}
  for (const obj of control.objectives) map[obj.id] = readObjectiveNote(controlId, obj.id)
  return map
}

function loadObjectiveStatuses(controlId, control) {
  if (!control) return {}
  const map = {}
  for (const obj of control.objectives) map[obj.id] = readObjectiveStatus(controlId, obj.id)
  return map
}

function loadObjectiveArtifacts(controlId, control) {
  if (!control) return {}
  const map = {}
  for (const obj of control.objectives) map[obj.id] = readObjectiveArtifacts(controlId, obj.id)
  return map
}

function loadObjectiveResults(controlId, control) {
  if (!control) return {}
  const map = {}
  for (const obj of control.objectives) map[obj.id] = readObjectiveResult(controlId, obj.id)
  return map
}

export default ControlDetail
