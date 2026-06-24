import { useState, useEffect, useMemo, useRef } from 'react'
import AutoResizeTextarea from '../components/AutoResizeTextarea'
import ExpectedEvidenceTypes from '../components/ExpectedEvidenceTypes'
import useFocusTrap from '../components/useFocusTrap'
import { useParams, Link, useSearchParams, useLocation } from 'react-router-dom'
import controls from '../data/controls/index.js'
import { controlDiscussions } from '../data/controlDiscussions.js'
import { PROVIDERS } from '../data/providers'
import { getEnvironmentTechTags } from '../utils/environmentProfile'
import evidenceTypes from '../data/evidence/index.js'
import { STATUSES, readStatus, writeStatus, STATUS_BADGE_CLASS } from '../utils/status'
import {
  INHERITANCE_VALUES,
  DEFAULT_INHERITANCE,
  INHERITANCE_BADGE_CLASS,
  readInheritance,
  writeInheritance,
  readInheritanceSources,
  writeInheritanceSources,
  readObjectiveInheritance,
  writeObjectiveInheritance,
} from '../utils/inheritance'
import { readAssignedTo, writeAssignedTo, normalizeAssignee } from '../utils/assignment'
import { readPool, writePool } from '../utils/evidencePool'
import { readObjectiveArtifacts, writeObjectiveArtifacts } from '../utils/objectiveArtifacts'
import { buildArtifactIndex } from '../utils/artifactIndex.js'
import { findByName, findOrCreate } from '../utils/artifactRegistry.js'
import ArtifactDetailModal from '../components/ArtifactDetailModal.jsx'
import { getObjectiveArtifactSuggestions } from '../utils/evidenceRecommendations.js'
import { evidenceTags } from '../data/evidenceTags.js'
import { readObjectiveResult, writeObjectiveResult } from '../utils/objectiveResults'
import { getDibcacStandard } from '../data/dibcacAssessmentStandards'
import {
  getReviewGroups,
  addObjectiveToGroup,
  createReviewGroup,
  findGroupsForObjective,
} from '../utils/reviewGroups'
import {
  OBJECTIVE_STATUS_UNREVIEWED,
  OBJECTIVE_STATUS_MET,
  OBJECTIVE_STATUS_NOT_MET,
  readObjectiveStatus,
  writeObjectiveStatus,
  getTrendingStatus,
} from '../utils/objectiveStatus'

// scoring.js is intentionally NOT imported here — the Scoring & POA&M
// section has been removed from the detail view. Metadata remains available
// in the Library (badges, filters) and Quick Search.

// Evidence tag id → display label (for tag-aware reuse overlap chips).
const EVIDENCE_TAG_LABEL = new Map(evidenceTags.map((t) => [t.id, t.label]))

function resolveBackUrl(rawFrom) {
  if (!rawFrom) return '/controls'
  if (/^[a-z][a-z0-9+.-]*:/i.test(rawFrom)) return '/controls'
  if (rawFrom.startsWith('//')) return '/controls'
  if (rawFrom !== '/controls' && !rawFrom.startsWith('/controls?')) return '/controls'
  return rawFrom
}

// ── Review Group row (inside objective header) ────────────────────────────────

function ReviewGroupRow({ controlId, objId, reviewGroupsVersion, onAddClick }) {
  const objectiveRef = `${controlId}[${objId}]`
  const memberGroups = useMemo(
    () => findGroupsForObjective(objectiveRef),
    // reviewGroupsVersion is the dependency that triggers a refresh when groups change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [objectiveRef, reviewGroupsVersion]
  )
  return (
    <div className="cd-obj-pills-group">
      <span className="cd-obj-pills-label">Review Group</span>
      <div className="cd-rg-chips-row">
        {memberGroups.map((g) => (
          <span key={g.id} className="cd-rg-chip" title={g.plannedAsk || undefined}>
            {g.name}
          </span>
        ))}
        <button
          type="button"
          className="cd-rg-add-btn"
          onClick={onAddClick}
          aria-label="Add objective to a review group"
        >
          {memberGroups.length > 0 ? '+ Add' : '+ Add to Group'}
        </button>
      </div>
    </div>
  )
}

// ── Add Objective to Review Group modal ───────────────────────────────────────

function AddToGroupModal({ controlId, obj, dibcacStd, onClose, onGroupsChanged }) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true)

  const objectiveRef = `${controlId}[${obj.id}]`

  const [groups] = useState(() => getReviewGroups())
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupAsk, setNewGroupAsk] = useState('')
  const [tab, setTab] = useState('existing') // 'existing' | 'new'
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const objectiveData = {
    key: objectiveRef,
    controlId,
    objId: obj.id,
    objText: obj.text,
    standard: dibcacStd?.standard ?? 'unknown',
  }

  const handleAddToExisting = () => {
    if (!selectedGroupId) return
    const grp = groups.find((g) => g.id === selectedGroupId)
    const alreadyIn = grp?.objectives.some((o) => (o.key ?? o.objectiveRef) === objectiveRef)
    if (alreadyIn) {
      setFeedback('This objective is already in that review group.')
      return
    }
    addObjectiveToGroup(selectedGroupId, objectiveData)
    onGroupsChanged()
    onClose()
  }

  const handleCreateNew = () => {
    if (!newGroupName.trim()) return
    createReviewGroup({
      id: crypto.randomUUID(),
      name: newGroupName.trim(),
      plannedAsk: newGroupAsk.trim(),
      objectives: [objectiveData],
      createdAt: new Date().toISOString(),
    })
    onGroupsChanged()
    onClose()
  }

  return (
    <div
      className="cd-edit-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Add Objective to Review Group"
    >
      <div className="cd-edit-modal cd-rg-modal" ref={modalRef}>
        {/* Header */}
        <div className="cd-edit-modal-header">
          <span className="cd-edit-modal-title">Add to Review Group</span>
          <button type="button" className="cd-edit-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Objective reference card */}
        <div className="cd-rg-modal-obj-card">
          <span className="cd-rg-modal-obj-ref mono">{objectiveRef}</span>
          <span className="cd-rg-modal-obj-text">{obj.text}</span>
          {dibcacStd && (
            <span className={`cd-dibcac-chip cd-dibcac-chip--${dibcacStd.standard} cd-rg-modal-std`}>{dibcacStd.label}</span>
          )}
        </div>

        {/* Tab bar */}
        <div className="cd-rg-modal-tabs">
          <button
            type="button"
            className={`cd-rg-modal-tab${tab === 'existing' ? ' cd-rg-modal-tab--active' : ''}`}
            onClick={() => { setTab('existing'); setFeedback('') }}
          >Add to Existing Group</button>
          <button
            type="button"
            className={`cd-rg-modal-tab${tab === 'new' ? ' cd-rg-modal-tab--active' : ''}`}
            onClick={() => { setTab('new'); setFeedback('') }}
          >Create New Group</button>
        </div>

        <div className="cd-edit-modal-body">
          {tab === 'existing' ? (
            groups.length === 0 ? (
              <p className="cd-rg-modal-empty">No review groups yet. Switch to the Create New Group tab.</p>
            ) : (
              <div className="cd-rg-modal-group-list">
                {groups.map((g) => {
                  const alreadyIn = g.objectives.some((o) => (o.key ?? o.objectiveRef) === objectiveRef)
                  return (
                    <label
                      key={g.id}
                      className={`cd-rg-modal-group-row${selectedGroupId === g.id ? ' cd-rg-modal-group-row--selected' : ''}${alreadyIn ? ' cd-rg-modal-group-row--in' : ''}`}
                    >
                      <input
                        type="radio"
                        name="rg-select"
                        value={g.id}
                        checked={selectedGroupId === g.id}
                        onChange={() => { setSelectedGroupId(g.id); setFeedback('') }}
                        disabled={alreadyIn}
                        className="cd-rg-modal-radio"
                      />
                      <div className="cd-rg-modal-group-info">
                        <span className="cd-rg-modal-group-name">{g.name}</span>
                        <span className="cd-rg-modal-group-meta">
                          {g.objectives.length} objective{g.objectives.length !== 1 ? 's' : ''}
                          {alreadyIn ? ' · Already in this group' : ''}
                        </span>
                        {g.plannedAsk && (
                          <span className="cd-rg-modal-group-ask">{g.plannedAsk.slice(0, 80)}{g.plannedAsk.length > 80 ? '…' : ''}</span>
                        )}
                      </div>
                    </label>
                  )
                })}
                {feedback && <p className="cd-rg-modal-feedback">{feedback}</p>}
              </div>
            )
          ) : (
            <div className="cd-rg-modal-new-form">
              <label className="cd-rg-modal-field-label" htmlFor="rg-new-name">Group Name</label>
              <input
                id="rg-new-name"
                type="text"
                className="cd-edit-input"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Screen Share Review — AC Family"
                autoFocus
              />
              <label className="cd-rg-modal-field-label" htmlFor="rg-new-ask">Planned Ask</label>
              <textarea
                id="rg-new-ask"
                className="cd-edit-textarea"
                value={newGroupAsk}
                onChange={(e) => setNewGroupAsk(e.target.value)}
                rows={3}
                placeholder="Describe what you plan to ask or review during this session…"
              />
            </div>
          )}
        </div>

        <div className="cd-edit-modal-footer">
          <button type="button" className="cd-edit-btn-secondary" onClick={onClose}>Cancel</button>
          {tab === 'existing' ? (
            <button
              type="button"
              className="cd-edit-btn-primary"
              onClick={handleAddToExisting}
              disabled={!selectedGroupId}
            >
              Add to Selected Group
            </button>
          ) : (
            <button
              type="button"
              className="cd-edit-btn-primary"
              onClick={handleCreateNew}
              disabled={!newGroupName.trim()}
            >
              Create Group with Objective
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Edit Details modal ────────────────────────────────────────────────────────

function EditDetailsModal({
  onClose,
  status, onStatusSelect,
  inheritance, onInheritanceSelect,
  inheritanceSources, addInheritanceSource, removeInheritanceSource,
  trendingStatus,
  assignedTo, onAssignedToChange, onAssignedToBlur, onAssignedToSelect,
}) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true)

  const [sourceInput, setSourceInput] = useState('')

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const handleAddSource = (name) => {
    addInheritanceSource(name)
    setSourceInput('')
  }

  return (
    <div
      className="cd-edit-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="cd-edit-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit Control Details"
      >
        <div className="cd-edit-modal-header">
          <h2 className="cd-edit-modal-title">Edit Details</h2>
          <button className="cd-edit-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="cd-edit-modal-body">

          {/* Assessment Status */}
          <section className="cd-edit-section">
            <div className="cd-edit-section-title">Assessment Status</div>
            <div className="cd-edit-pills">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`cd-edit-pill${status === s ? ' cd-edit-pill--active' : ''}`}
                  onClick={() => onStatusSelect(s)}
                >{s}</button>
              ))}
            </div>
          </section>

          {/* Inheritance */}
          <section className="cd-edit-section">
            <div className="cd-edit-section-title">Inheritance</div>
            <div className="cd-edit-pills">
              {INHERITANCE_VALUES.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`cd-edit-pill${inheritance === v ? ' cd-edit-pill--active' : ''}`}
                  onClick={() => onInheritanceSelect(v)}
                >{v}</button>
              ))}
            </div>
          </section>

          {/* Inherited From */}
          {inheritance !== DEFAULT_INHERITANCE && (
            <section className="cd-edit-section">
              <div className="cd-edit-section-title">Inherited From</div>
              {inheritanceSources.length > 0 && (
                <div className="cd-sources-chips">
                  {inheritanceSources.map((src) => (
                    <span key={src} className="cd-source-chip">
                      <span className="cd-source-chip-label">{src}</span>
                      <button
                        type="button"
                        className="cd-source-chip-remove"
                        onClick={() => removeInheritanceSource(src)}
                        aria-label={`Remove ${src}`}
                      >×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="provider-picker-wrapper">
                <input
                  type="text"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddSource(sourceInput) }
                  }}
                  placeholder="Add a provider, press Enter…"
                  autoComplete="off"
                  className={
                    sourceInput.trim() && !PROVIDERS.some((p) => p.name === sourceInput.trim())
                      ? 'provider-picker-input--open' : ''
                  }
                />
                {sourceInput.trim() && (() => {
                  const q = sourceInput.toLowerCase()
                  const envTags = getEnvironmentTechTags()
                  const envLower = new Set(envTags.map((t) => t.toLowerCase()))
                  const catalogNames = PROVIDERS.map((p) => p.name).filter((name) => !envLower.has(name.toLowerCase()))
                  const allCandidates = [...envTags, ...catalogNames]
                  const suggestions = allCandidates
                    .filter((name) => name.toLowerCase().includes(q) && !inheritanceSources.includes(name))
                    .slice(0, 8)
                  return suggestions.length > 0 ? (
                    <ul className="provider-picker-results">
                      {suggestions.map((name) => (
                        <li key={name} className="provider-picker-result"
                          onMouseDown={(e) => { e.preventDefault(); handleAddSource(name) }}>
                          {name}
                        </li>
                      ))}
                    </ul>
                  ) : null
                })()}
              </div>
            </section>
          )}

          {/* Trending — read-only */}
          <section className="cd-edit-section">
            <div className="cd-edit-section-title">Trending Status</div>
            <div className="cd-edit-trending">
              <span className={`status-badge ${STATUS_BADGE_CLASS[trendingStatus]}`}>{trendingStatus}</span>
              <span className="cd-edit-trending-note muted">Calculated from objective progress — not directly editable.</span>
            </div>
          </section>

          {/* Assigned To */}
          <section className="cd-edit-section">
            <div className="cd-edit-section-title">Assigned To</div>
            <div className="provider-picker-wrapper">
              <input
                type="text"
                value={assignedTo}
                onChange={onAssignedToChange}
                onBlur={onAssignedToBlur}
                placeholder="Type a person's name…"
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
                      <li key={name} className="provider-picker-result"
                        onMouseDown={(e) => { e.preventDefault(); onAssignedToSelect(name) }}>
                        {name}
                      </li>
                    ))}
                  </ul>
                )
              })()}
            </div>
          </section>

        </div>

        <div className="cd-edit-modal-footer">
          <button className="cd-edit-modal-done" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

function ControlDetailView() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const control = controls.find((c) => c.id === id)

  const backUrl = resolveBackUrl(searchParams.get('from'))

  const [status, setStatus]           = useState(() => readStatus(id))
  const [inheritance, setInheritance] = useState(() => readInheritance(id))
  const [inheritanceSources, setInheritanceSources] = useState(() => readInheritanceSources(id))
  const [assignedTo, setAssignedTo] = useState(() => readAssignedTo(id))
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [pool, setPool]               = useState(() => readPool(id))
  const [poolInput, setPoolInput]     = useState('')
  const [objectiveStatuses, setObjectiveStatuses]         = useState(() => loadObjectiveStatuses(id, control))
  const [objectiveArtifacts, setObjectiveArtifacts]       = useState(() => loadObjectiveArtifacts(id, control))
  const [objectiveResults, setObjectiveResults]           = useState(() => loadObjectiveResults(id, control))
  const [objectiveInheritance, setObjectiveInheritance]   = useState(() => loadObjectiveInheritance(id, control))
  const [openObjInheritPicker, setOpenObjInheritPicker]   = useState(null)
  const objInheritPickerRef = useRef(null)
  const [objArtifactInputs, setObjArtifactInputs]   = useState({})
  const [focusedObjId, setFocusedObjId]             = useState(null)
  const [poolFocused, setPoolFocused]               = useState(false)
  const [suggestionPages, setSuggestionPages]       = useState({})
  const [expandedSuggestions, setExpandedSuggestions] = useState(() => new Set())
  const [selectedObjectiveId, setSelectedObjectiveId] = useState(() => control?.objectives[0]?.id ?? null)
  const [selectedArtifact, setSelectedArtifact] = useState(null)
  // Bumped after tag saves so findByName() re-runs and untagged chip state updates.
  const [artifactTagVersion, setArtifactTagVersion] = useState(0)
  // Review group modal state
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false)
  const [reviewGroupsVersion, setReviewGroupsVersion] = useState(0) // bump to recompute

  const globalArtifactNames = useMemo(() => buildArtifactIndex(controls).map((e) => e.artifact), [])

  // Per-control state is reset by remounting on `id` change (see the
  // ControlDetail wrapper's key={id}); every useState initializer above reads
  // fresh from storage, so no synchronizing effect is needed here.

  // Scroll to the objective anchor when navigating here via a hash link
  // (e.g. from Evidence Reuse Recommendation source links).
  // The timeout lets React finish painting the new control's DOM first.
  useEffect(() => {
    if (!location.hash) return
    const targetId = location.hash.replace('#', '')
    // Auto-select the targeted objective so it's visible in the workspace.
    const objMatch = targetId.match(/^objective-(.+)$/)
    const timer = setTimeout(() => {
      if (objMatch) {
        setSelectedObjectiveId(objMatch[1])
      }
      const el = document.getElementById(targetId)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
    return () => clearTimeout(timer)
  }, [id, location.hash])

  // Close the objective inheritance picker when the user clicks outside it
  useEffect(() => {
    if (!openObjInheritPicker) return
    const handler = (e) => {
      if (objInheritPickerRef.current && !objInheritPickerRef.current.contains(e.target)) {
        setOpenObjInheritPicker(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openObjInheritPicker])

  const trendingStatus = useMemo(
    () => getTrendingStatus(control?.objectives ?? [], objectiveStatuses),
    [control, objectiveStatuses]
  )

  const handleStatusSelect      = (v) => { setStatus(v); writeStatus(id, v) }
  const handleInheritanceSelect = (v) => { setInheritance(v); writeInheritance(id, v) }
  const addInheritanceSource = (name) => {
    const trimmed = name.trim()
    if (!trimmed || inheritanceSources.includes(trimmed)) return
    const next = [...inheritanceSources, trimmed]
    setInheritanceSources(next)
    writeInheritanceSources(id, next)
  }
  const removeInheritanceSource = (name) => {
    const next = inheritanceSources.filter((s) => s !== name)
    setInheritanceSources(next)
    writeInheritanceSources(id, next)
  }
  const handleAssignedToChange  = (e) => { const v = e.target.value; setAssignedTo(v); writeAssignedTo(id, v) }
  const handleAssignedToBlur   = () => { const n = normalizeAssignee(assignedTo); setAssignedTo(n); writeAssignedTo(id, n) }
  const handleAssignedToSelect = (name) => { setAssignedTo(name); writeAssignedTo(id, name) }
  const handleObjectiveStatusChange = (objId, value) => {
    setObjectiveStatuses((prev) => ({ ...prev, [objId]: value }))
    writeObjectiveStatus(id, objId, value)
    if (value !== OBJECTIVE_STATUS_UNREVIEWED) promoteToInProgress(status, id, setStatus)
  }

  const handleObjectiveInheritanceAdd = (objId, source) => {
    const current = objectiveInheritance[objId] ?? []
    if (current.includes(source)) return
    const next = [...current, source]
    setObjectiveInheritance((prev) => ({ ...prev, [objId]: next }))
    writeObjectiveInheritance(id, objId, next)
  }

  const handleObjectiveInheritanceRemove = (objId, source) => {
    const next = (objectiveInheritance[objId] ?? []).filter((s) => s !== source)
    setObjectiveInheritance((prev) => ({ ...prev, [objId]: next }))
    writeObjectiveInheritance(id, objId, next)
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
  const selectedObj = control.objectives.find((o) => o.id === selectedObjectiveId) ?? control.objectives[0] ?? null

  const controlIndex = controls.findIndex((c) => c.id === id)
  const prevControl = controlIndex > 0 ? controls[controlIndex - 1] : null
  const nextControl = controlIndex < controls.length - 1 ? controls[controlIndex + 1] : null

  // Suggested artifacts block — driven by selectedObj, rendered in right panel
  const renderSuggestedArtifacts = (obj) => {
    if (!obj) return null
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
    const setPage = (next) => setSuggestionPages((prev) => ({ ...prev, [obj.id]: next }))

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
            <p className="reuse-tag-helper">
              Evidence tags are classification aids. They help explain reuse
              suggestions but do not determine whether an objective is satisfied.
            </p>
            {total > PAGE_SIZE && (
              <p className="evidence-reuse-suggestions-count">
                Showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total}
              </p>
            )}
            <ul>
              {pageSuggestions.map((s) => {
                const sRec = findByName(s.artifact)
                const sUntagged = !sRec || !Array.isArray(sRec.tags) || sRec.tags.length === 0
                return (
                  <li
                    key={s.artifact}
                    className={`evidence-reuse-suggestion${sUntagged ? ' evidence-reuse-suggestion--untagged' : ''}`}
                    title={sUntagged ? 'No evidence tags yet — click to add tags.' : undefined}
                  >
                    <button
                      type="button"
                      className="evidence-reuse-suggestion-add"
                      onClick={(e) => { e.stopPropagation(); commitObjArtifact(obj.id, s.artifact) }}
                      aria-label={`Add ${s.artifact} to objective ${obj.id}`}
                    >+</button>
                    <div className="evidence-reuse-suggestion-body">
                      <button
                        type="button"
                        className="evidence-reuse-suggestion-name evidence-reuse-suggestion-name--button"
                        onClick={() => setSelectedArtifact(findOrCreate(s.artifact))}
                        aria-label={`Edit evidence tags for ${s.artifact}`}
                      >{s.artifact}</button>
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
                      {s.tagAlignment && (
                        <div className="reuse-tag-alignment">
                          <span className="reuse-tag-alignment-label">
                            {s.tagAlignment.label}
                          </span>
                          {s.tagAlignment.overlap.all.length > 0 && (
                            <span className="reuse-tag-overlap-chips">
                              {s.tagAlignment.overlap.primary.map((tagId) => (
                                <span key={tagId} className="reuse-tag-overlap-chip reuse-tag-overlap-chip--primary">
                                  {EVIDENCE_TAG_LABEL.get(tagId) ?? tagId}
                                </span>
                              ))}
                              {s.tagAlignment.overlap.acceptable.map((tagId) => (
                                <span key={tagId} className="reuse-tag-overlap-chip reuse-tag-overlap-chip--acceptable">
                                  {EVIDENCE_TAG_LABEL.get(tagId) ?? tagId}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            {total > PAGE_SIZE && (
              <div className="evidence-reuse-suggestions-pagination">
                <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label="Previous suggestions">← Previous</button>
                <button type="button" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1} aria-label="Next suggestions">Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="cd-workspace">

      {/* ── Top header ──────────────────────────────────────────────────── */}
      <div className="cd-header">
        <div className="cd-header-top">
          <div className="cd-header-nav">
            <Link to={backUrl} className="cd-back-link">← Back to Control Library</Link>
            <div className="cd-prev-next">
              {prevControl ? (
                <Link
                  to={`/controls/${encodeURIComponent(prevControl.id)}`}
                  className="cd-nav-btn"
                  title={prevControl.title}
                >
                  ← {prevControl.id}
                </Link>
              ) : (
                <span className="cd-nav-btn cd-nav-btn--disabled" aria-disabled="true">← Prev</span>
              )}
              {nextControl ? (
                <Link
                  to={`/controls/${encodeURIComponent(nextControl.id)}`}
                  className="cd-nav-btn"
                  title={nextControl.title}
                >
                  {nextControl.id} →
                </Link>
              ) : (
                <span className="cd-nav-btn cd-nav-btn--disabled" aria-disabled="true">Next →</span>
              )}
            </div>
          </div>
          <h1 className="cd-title">
            <Link to={`/controls/${control.id}`} className="mono">{control.id}</Link>
            {' — '}{control.title}
          </h1>
        </div>

        <div className="cd-header-meta">
          <div className="cd-meta-item">
            <span className="cd-meta-label">Status</span>
            <span className={`status-badge ${STATUS_BADGE_CLASS[status]}`}>{status}</span>
          </div>

          <div className="cd-meta-item">
            <span className="cd-meta-label">Inheritance</span>
            {inheritance !== DEFAULT_INHERITANCE
              ? <span className={`inheritance-badge ${INHERITANCE_BADGE_CLASS[inheritance]}`}>{inheritance}</span>
              : <span className="cd-meta-value-muted">None</span>
            }
          </div>

          {inheritance !== DEFAULT_INHERITANCE && (
            <div className="cd-meta-item cd-meta-item--sources">
              <span className="cd-meta-label">Inherited From</span>
              {inheritanceSources.length > 0
                ? (
                  <div className="cd-meta-sources">
                    {inheritanceSources.map((src) => (
                      <span key={src} className="cd-source-chip cd-source-chip--readonly">{src}</span>
                    ))}
                  </div>
                )
                : <span className="cd-meta-value-muted">None documented</span>
              }
            </div>
          )}

          <div className="cd-meta-item">
            <span className="cd-meta-label">Trending</span>
            <span className={`status-badge ${STATUS_BADGE_CLASS[trendingStatus]}`}>{trendingStatus}</span>
          </div>

          <div className="cd-meta-item">
            <span className="cd-meta-label">Assigned To</span>
            {assignedTo
              ? <span className="cd-meta-value">{assignedTo}</span>
              : <span className="cd-meta-value-muted">Unassigned</span>
            }
          </div>

          <div className="cd-header-actions">
            <button
              type="button"
              className="cd-edit-details-btn"
              onClick={() => setShowDetailsModal(true)}
            >
              Edit Details
            </button>
            <Link to={`/relationships?control=${control.id}`}><button type="button">View Relationships</button></Link>
            <Link to={`/evidence?search=${encodeURIComponent(control.id)}`}><button type="button">Search Related Evidence</button></Link>
          </div>
        </div>

        {/* Two-column top panel: Evidence Pool (left) + Assessment Guide Discussion (right) */}
        <div className="cd-top-grid">

          {/* LEFT: Evidence Pool + Expected Evidence Types */}
          <div className="cd-header-pool">
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
                    <li key={s} className="artifact-suggestion-item"
                      onMouseDown={(e) => { e.preventDefault(); setPoolInput(s) }}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
            {pool.length > 0 && (
              <div className="evidence-chips" data-tag-version={artifactTagVersion}>
                {pool.map((item) => {
                  const rec = findByName(item)
                  const untagged = !rec || !Array.isArray(rec.tags) || rec.tags.length === 0
                  return (
                    <span key={item}
                      className={`evidence-chip${untagged ? ' evidence-chip--untagged' : ''}`}
                      title={untagged ? 'No evidence tags yet — click to add tags.' : undefined}
                    >
                      <button type="button" className="evidence-chip-name evidence-chip-name--button" title={item}
                        onClick={() => setSelectedArtifact(findOrCreate(item))}
                        aria-label={`Edit evidence tags for ${item}`}>{item}</button>
                      <button type="button" className="evidence-chip-remove"
                        onClick={(e) => { e.stopPropagation(); handleRemovePoolItem(item) }}
                        aria-label={`Remove ${item} from Evidence Pool`}>×</button>
                    </span>
                  )
                })}
              </div>
            )}
            {/* Expected Evidence Types — shown near Evidence Pool for artifact-action context */}
            {selectedObj && (
              <div className="cd-pool-expected-tags">
                <ExpectedEvidenceTypes
                  expectedTags={selectedObj.expectedTags}
                  note={selectedObj.expectedTagsNote}
                />
              </div>
            )}
          </div>

          {/* RIGHT: Assessment Guide Discussion */}
          {(() => {
            const disc = controlDiscussions[control.id]
            return (
              <div className="cd-discussion-panel">
                <div className="cd-discussion-title">Assessment Guide Discussion</div>
                {disc ? (
                  <>
                    <p className="cd-discussion-text">{disc.discussion}</p>
                    <p className="cd-discussion-source">Source: {disc.source}</p>
                  </>
                ) : (
                  <p className="cd-discussion-empty">
                    No assessment guide discussion is mapped for this control yet.
                  </p>
                )}
              </div>
            )
          })()}

        </div>
      </div>

      {/* ── Main 3-column workspace ──────────────────────────────────────── */}
      <div className="cd-main">

        {/* LEFT: Objective Rail */}
        <aside className="cd-rail">
          <div className="cd-rail-title">Objective Rail</div>
          {control.objectives.map((obj) => {
            const artCount = (objectiveArtifacts[obj.id] ?? []).length
            const objStatus = objectiveStatuses[obj.id] ?? OBJECTIVE_STATUS_UNREVIEWED
            const isActive = selectedObj?.id === obj.id
            return (
              <button
                key={obj.id}
                type="button"
                id={`objective-${obj.id}`}
                className={`cd-rail-row${isActive ? ' cd-rail-row--active' : ''}`}
                onClick={() => { setSelectedObjectiveId(obj.id); setOpenObjInheritPicker(null) }}
              >
                <span className="cd-rail-label mono">[{obj.id}]</span>
                <span className="cd-rail-text">{obj.text}</span>
                <span className="cd-rail-meta">
                  {objStatus !== OBJECTIVE_STATUS_UNREVIEWED && (
                    <span className={`cd-rail-status cd-rail-status--${objStatus === OBJECTIVE_STATUS_MET ? 'met' : 'not-met'}`}>{objStatus}</span>
                  )}
                  {artCount > 0 && (
                    <span className="cd-rail-count">{artCount} artifact{artCount !== 1 ? 's' : ''}</span>
                  )}
                </span>
              </button>
            )
          })}
        </aside>

        {/* CENTER: Selected Objective Work Area */}
        <main className="cd-center">
          {selectedObj ? (
            <div className="cd-obj-workspace">
              <div className="cd-obj-header">
                <h2>
                  <span className="mono">[{selectedObj.id}]</span> {selectedObj.text}
                </h2>
                <div className="cd-obj-status-row">
                  {/* MET / NOT MET status pills */}
                  <div className="cd-obj-pills-group">
                    <span className="cd-obj-pills-label">Objective Status</span>
                    <div className="cd-obj-pills">
                      {(() => {
                        const cur = objectiveStatuses[selectedObj.id] ?? OBJECTIVE_STATUS_UNREVIEWED
                        const setMet    = () => handleObjectiveStatusChange(selectedObj.id, cur === OBJECTIVE_STATUS_MET    ? OBJECTIVE_STATUS_UNREVIEWED : OBJECTIVE_STATUS_MET)
                        const setNotMet = () => handleObjectiveStatusChange(selectedObj.id, cur === OBJECTIVE_STATUS_NOT_MET ? OBJECTIVE_STATUS_UNREVIEWED : OBJECTIVE_STATUS_NOT_MET)
                        return (
                          <>
                            <button
                              type="button"
                              className={`cd-obj-pill cd-obj-pill--met${cur === OBJECTIVE_STATUS_MET ? ' cd-obj-pill--active' : ''}`}
                              onClick={setMet}
                              aria-pressed={cur === OBJECTIVE_STATUS_MET}
                            >MET</button>
                            <button
                              type="button"
                              className={`cd-obj-pill cd-obj-pill--not-met${cur === OBJECTIVE_STATUS_NOT_MET ? ' cd-obj-pill--active' : ''}`}
                              onClick={setNotMet}
                              aria-pressed={cur === OBJECTIVE_STATUS_NOT_MET}
                            >NOT MET</button>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* DIBCAC Assessment Standard chip */}
                  {(() => {
                    const std = getDibcacStandard(control.id, selectedObj.id)
                    if (!std) return null
                    return (
                      <div className="cd-obj-pills-group">
                        <span className="cd-obj-pills-label">DIBCAC Standard</span>
                        <span className={`cd-dibcac-chip cd-dibcac-chip--${std.standard}`}>{std.label}</span>
                      </div>
                    )
                  })()}

                  {/* Review Group membership — computed from reviewGroupsVersion bump */}
                  <ReviewGroupRow
                    controlId={control.id}
                    objId={selectedObj.id}
                    reviewGroupsVersion={reviewGroupsVersion}
                    onAddClick={() => setShowAddToGroupModal(true)}
                  />

                  {/* Objective-level inheritance — only when control has sources or obj already has some */}
                  {(inheritanceSources.length > 0 || (objectiveInheritance[selectedObj.id] ?? []).length > 0) && (
                    <div className="cd-obj-pills-group">
                      <span className="cd-obj-pills-label">Inheritance</span>
                      <div className="cd-obj-inherit-chips">
                        {(objectiveInheritance[selectedObj.id] ?? []).map((src) => (
                          <span key={src} className="cd-source-chip">
                            <span className="cd-source-chip-label">{src}</span>
                            <button
                              type="button"
                              className="cd-source-chip-remove"
                              onClick={() => handleObjectiveInheritanceRemove(selectedObj.id, src)}
                              aria-label={`Remove ${src}`}
                            >×</button>
                          </span>
                        ))}
                        {(() => {
                          const available = inheritanceSources.filter(
                            (s) => !(objectiveInheritance[selectedObj.id] ?? []).includes(s)
                          )
                          if (available.length === 0) return null
                          const isOpen = openObjInheritPicker === selectedObj.id
                          return (
                            <div className="cd-obj-inherit-wrap" ref={objInheritPickerRef}>
                              <button
                                type="button"
                                className={`cd-obj-inherit-add${isOpen ? ' cd-obj-inherit-add--open' : ''}`}
                                aria-expanded={isOpen}
                                aria-label="Add inheritance source to this objective"
                                onClick={() => setOpenObjInheritPicker(isOpen ? null : selectedObj.id)}
                              >
                                {isOpen ? '− Add' : '+ Add'}
                              </button>
                              {isOpen && (
                                <div className="cd-obj-inherit-picker" role="listbox">
                                  {available.map((src) => (
                                    <button
                                      key={src}
                                      type="button"
                                      role="option"
                                      className="cd-obj-inherit-picker-option"
                                      onClick={() => handleObjectiveInheritanceAdd(selectedObj.id, src)}
                                    >
                                      {src}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="cd-obj-body">
                {/* Assigned Artifacts — shown first for quick access */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label htmlFor={`obj-artifacts-${control.id}-${selectedObj.id}`}>
                    <strong>Assigned Artifacts{(objectiveArtifacts[selectedObj.id] ?? []).length > 0
                      ? ` (${(objectiveArtifacts[selectedObj.id] ?? []).length})` : ''}</strong>
                  </label>
                  <div className="obj-artifact-input-wrap">
                    <input
                      id={`obj-artifacts-${control.id}-${selectedObj.id}`}
                      type="text"
                      className="evidence-pool-input"
                      value={objArtifactInputs[selectedObj.id] ?? ''}
                      onChange={(e) => setObjArtifactInputs((prev) => ({ ...prev, [selectedObj.id]: e.target.value }))}
                      onKeyDown={(e) => handleObjArtifactKeyDown(e, selectedObj.id)}
                      onFocus={() => setFocusedObjId(selectedObj.id)}
                      onBlur={() => setFocusedObjId(null)}
                      placeholder={pool.length > 0 ? 'Type to filter pool entries, or enter a new name' : 'Type an artifact name, press Enter or comma to add'}
                      autoComplete="off"
                    />
                    {(focusedObjId === selectedObj.id ? getObjSuggestions(selectedObj.id) : []).length > 0 && (
                      <ul className="artifact-suggestions">
                        {getObjSuggestions(selectedObj.id).map((s) => (
                          <li key={s} className="artifact-suggestion-item"
                            onMouseDown={(e) => { e.preventDefault(); setObjArtifactInputs((prev) => ({ ...prev, [selectedObj.id]: s })) }}>
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {(objectiveArtifacts[selectedObj.id] ?? []).length > 0 && (
                    <div className="evidence-chips" data-tag-version={artifactTagVersion}>
                      {(objectiveArtifacts[selectedObj.id] ?? []).map((item) => {
                        const rec = findByName(item)
                        const untagged = !rec || !Array.isArray(rec.tags) || rec.tags.length === 0
                        return (
                          <span key={item}
                            className={`evidence-chip${untagged ? ' evidence-chip--untagged' : ''}`}
                            title={untagged ? 'No evidence tags yet — click to add tags.' : undefined}
                          >
                            <button type="button" className="evidence-chip-name evidence-chip-name--button" title={item}
                              onClick={() => setSelectedArtifact(findOrCreate(item))}
                              aria-label={`Edit evidence tags for ${item}`}>{item}</button>
                            <button type="button" className="evidence-chip-remove"
                              onClick={(e) => { e.stopPropagation(); handleRemoveObjArtifact(selectedObj.id, item) }}
                              aria-label={`Remove ${item} from objective ${selectedObj.id}`}>×</button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Assessment result fields */}
                {[
                  { field: 'interviews',      label: 'Interviews',       placeholder: 'Interview findings for this objective…' },
                  { field: 'examine',         label: 'Examine',          placeholder: 'Examined artifacts or documents…' },
                  { field: 'test',            label: 'Test',             placeholder: 'Test results or observations…' },
                  { field: 'overallComments', label: 'Overall Comments', placeholder: 'Overall assessment comments for this objective…' },
                ].map(({ field, label, placeholder }) => {
                  const fieldId = `obj-${field}-${control.id}-${selectedObj.id}`
                  return (
                    <div key={field} style={{ marginBottom: 'var(--space-3)' }}>
                      <label htmlFor={fieldId}><strong>{label}</strong></label>
                      <AutoResizeTextarea
                        id={fieldId}
                        value={(objectiveResults[selectedObj.id] ?? {})[field] ?? ''}
                        onChange={(e) => handleObjectiveResultChange(selectedObj.id, field, e.target.value)}
                        rows={3}
                        placeholder={placeholder}
                      />
                    </div>
                  )
                })}

                {/* Objective Notes UI removed — field hidden but fully retained for backward compatibility.
                    Storage keys, read/write logic, import/export support, and existing localStorage data
                    are preserved. Structured result fields replace this field. */}
              </div>
            </div>
          ) : (
            <p className="muted">No objectives available for this control.</p>
          )}

          {/* Suggested Existing Artifacts card — center column, below objective work */}
          {selectedObj && (
            <div className="cd-suggestions-card">
              <h3 className="cd-suggestions-heading">Suggested Existing Artifacts</h3>
              {(() => {
                const suggestions = renderSuggestedArtifacts(selectedObj)
                return suggestions ?? (
                  <p className="muted cd-suggestions-empty">No suggested artifacts for this objective yet.</p>
                )
              })()}
            </div>
          )}
        </main>

        {/* RIGHT: Reference / Context Panel */}
        <aside className="cd-panel">
          {/* Specific Guidance + Plain English — control-level, shown first */}
          <div className="cd-panel-section">
            <h3 className="cd-panel-heading">Specific Guidance</h3>
            <p>{control.controlText}</p>
            <h3 className="cd-panel-heading" style={{ marginTop: 'var(--space-3)' }}>Plain English</h3>
            <p>{control.plainEnglish}</p>
          </div>

          {/* Evidence Examples & Review Focus — combines What to Look For + Supporting Evidence */}
          {selectedObj && (
            <div className="cd-panel-section">
              <h3 className="cd-panel-heading">Evidence Examples &amp; Review Focus</h3>
              <p className="cd-panel-disclaimer muted">
                These are examples to guide evidence review, not a definitive checklist or indicator of adequacy.
              </p>
              <p>{selectedObj.whatToLookFor}</p>
              {supportingEvidence.length > 0 && (
                <ul className="cd-panel-evidence-list">
                  {supportingEvidence.map((e) => (
                    <li key={e.name}>
                      <Link to={`/evidence?search=${encodeURIComponent(e.name)}`}>{e.name}</Link>
                      <p>{e.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Common Gaps — control-level */}
          <div className="cd-panel-section">
            <h3 className="cd-panel-heading">Common Gaps</h3>
            <ul>
              {control.commonGaps.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        </aside>

      </div>

      <ArtifactDetailModal
        key={selectedArtifact?.id}
        isOpen={!!selectedArtifact}
        artifact={selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
        onTagsUpdated={() => setArtifactTagVersion((v) => v + 1)}
      />

      {showAddToGroupModal && selectedObj && (
        <AddToGroupModal
          controlId={control.id}
          obj={selectedObj}
          dibcacStd={getDibcacStandard(control.id, selectedObj.id)}
          onClose={() => setShowAddToGroupModal(false)}
          onGroupsChanged={() => {
            setShowAddToGroupModal(false)
            setReviewGroupsVersion((v) => v + 1)
          }}
        />
      )}

      {showDetailsModal && (
        <EditDetailsModal
          onClose={() => setShowDetailsModal(false)}
          status={status}
          onStatusSelect={handleStatusSelect}
          inheritance={inheritance}
          onInheritanceSelect={handleInheritanceSelect}
          inheritanceSources={inheritanceSources}
          addInheritanceSource={addInheritanceSource}
          removeInheritanceSource={removeInheritanceSource}
          trendingStatus={trendingStatus}
          assignedTo={assignedTo}
          onAssignedToChange={handleAssignedToChange}
          onAssignedToBlur={handleAssignedToBlur}
          onAssignedToSelect={handleAssignedToSelect}
        />
      )}
    </div>
  )
}

// Artifact-driven promotion only. Never reverts.
function promoteToInProgress(currentStatus, controlId, setStatus) {
  if (currentStatus !== 'Not Started') return
  writeStatus(controlId, 'In Progress')
  setStatus('In Progress')
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

function loadObjectiveInheritance(controlId, control) {
  if (!control) return {}
  const map = {}
  for (const obj of control.objectives) map[obj.id] = readObjectiveInheritance(controlId, obj.id)
  return map
}

// Keying the view by control id remounts it on navigation, so all per-control
// state is re-initialized from storage by the useState initializers — no
// synchronizing effect required.
function ControlDetail() {
  const { id } = useParams()
  return <ControlDetailView key={id} />
}

export default ControlDetail
