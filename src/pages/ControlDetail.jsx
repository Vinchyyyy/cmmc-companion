import { useState, useEffect, useMemo, useRef } from 'react'
import DashSidebar from '../components/DashSidebar.jsx'
import AutoResizeTextarea from '../components/AutoResizeTextarea'
import ExpectedEvidenceTypes from '../components/ExpectedEvidenceTypes'
import useFocusTrap from '../components/useFocusTrap'
import { useParams, Link, useSearchParams, useLocation } from 'react-router-dom'
import controls from '../data/controls/index.js'
import { sortControlsInAssessmentOrder } from '../utils/controlOrder'
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
import FindingsBuilderModal from '../components/FindingsBuilderModal'
import InterviewRolePickerModal from '../components/InterviewRolePickerModal'
import BulkFindingsModal from '../components/BulkFindingsModal'
import {
  readObjectiveFinding,
  writeObjectiveFinding,
  clearObjectiveFinding,
} from '../utils/objectiveFindings'
import {
  readObjectiveInterviewedRoles,
  writeObjectiveInterviewedRoles,
} from '../utils/objectiveInterviewedRoles'
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
  getStatusConsistencyWarning,
} from '../utils/objectiveStatus'

// scoring.js is intentionally NOT imported here — the Scoring & POA&M
// section has been removed from the detail view. Metadata remains available
// in the Library (badges, filters) and Quick Search.

// Evidence tag id → display label (for tag-aware reuse overlap chips).
const EVIDENCE_TAG_LABEL = new Map(evidenceTags.map((t) => [t.id, t.label]))

// eMASS import caps these free-text fields at 400 characters.
const EMASS_CHAR_LIMIT = 400
const EMASS_LIMITED_FIELDS = new Set(['interviews', 'examine', 'test'])

// Prev/Next nav must walk controls in the same family → practice-number
// order the Control Library displays them in (see controlOrder.js) — not
// the raw JSON source order, which groups by level and can put e.g.
// MP.L1-3.8.3 before MP.L2-3.8.1/3.8.2.
const orderedControls = sortControlsInAssessmentOrder(controls)

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

// ── Suggested Artifacts modal ─────────────────────────────────────────────────

const SUGGESTION_TIER_PAGE_SIZE = 5

function SuggestedArtifactsModal({ control, obj, allControls, onAssign, onClose }) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true)

  const [strongPage, setStrongPage] = useState(0)
  const [relatedPage, setRelatedPage] = useState(0)
  const [relatedExpanded, setRelatedExpanded] = useState(false)

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

  const { strong, related, excluded } = useMemo(() => getObjectiveArtifactSuggestions({
    control,
    objective: obj,
    allControls,
    limit: 20,
  }), [control, obj, allControls])

  const totalVisible = strong.length + related.length
  const excludedTotal =
    excluded.untaggedCount + excluded.broadCount

  // Strong tier pagination
  const strongTotal = strong.length
  const strongTotalPages = Math.ceil(strongTotal / SUGGESTION_TIER_PAGE_SIZE)
  const strongSafePage = Math.min(strongPage, Math.max(strongTotalPages - 1, 0))
  const sStart = strongSafePage * SUGGESTION_TIER_PAGE_SIZE
  const sEnd = Math.min(sStart + SUGGESTION_TIER_PAGE_SIZE, strongTotal)
  const visibleStrong = strong.slice(sStart, sEnd)

  // Related tier pagination
  const relatedTotal = related.length
  const relatedTotalPages = Math.ceil(relatedTotal / SUGGESTION_TIER_PAGE_SIZE)
  const relatedSafePage = Math.min(relatedPage, Math.max(relatedTotalPages - 1, 0))
  const rStart = relatedSafePage * SUGGESTION_TIER_PAGE_SIZE
  const rEnd = Math.min(rStart + SUGGESTION_TIER_PAGE_SIZE, relatedTotal)
  const visibleRelated = related.slice(rStart, rEnd)

  const renderCard = (s) => (
    <li key={s.artifact} className="cd-suggested-item">
      <div className="cd-suggested-item-body">
        <span className="cd-suggested-item-name">{s.artifact}</span>
        {s.reason && (
          <span className="cd-suggested-item-reason">{s.reason}</span>
        )}
        {s.sourceControlId && (
          <span className="cd-suggested-item-source muted">
            also mapped to{' '}
            <Link
              to={`/controls/${encodeURIComponent(s.sourceControlId)}#objective-${s.sourceObjectiveId}`}
              onClick={onClose}
              title={`${s.sourceControlId} — ${s.sourceControlTitle}`}
            >
              {s.sourceControlId}
            </Link>
            {s.sourceObjectiveId ? ` [${s.sourceObjectiveId}]` : ''}
          </span>
        )}
        {s.tagAlignment && s.tagAlignment.overlap.all.length > 0 && (
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
        {s.rationale && (
          <details className="cd-suggested-item-details">
            <summary>Details</summary>
            <span className="cd-suggested-item-rationale muted">{s.rationale}</span>
          </details>
        )}
      </div>
      <button
        type="button"
        className="cd-suggested-item-assign"
        onClick={() => { onAssign(s.artifact); onClose() }}
        aria-label={`Assign ${s.artifact} to this objective`}
      >
        + Assign
      </button>
    </li>
  )

  return (
    <div
      className="cd-edit-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggested-artifacts-title"
    >
      <div className="cd-edit-modal cd-suggested-modal" ref={modalRef}>
        <div className="cd-edit-modal-header">
          <span id="suggested-artifacts-title" className="cd-edit-modal-title">Suggested Tagged Artifacts</span>
          <button type="button" className="cd-edit-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="cd-edit-modal-body">
          <p className="cd-suggested-subtitle muted">
            Suggestions are based on evidence tags, expected evidence alignment, Assessment Guide evidence objects, and relationship context. Tags classify artifacts; they do not determine assessment outcomes. Suggestions are guidance only and do not determine assessment outcomes.
          </p>

          {totalVisible === 0 ? (
            <div className="cd-suggested-empty-state">
              <p className="muted cd-suggested-empty">
                No tagged artifact suggestions found for this objective. Add evidence tags to artifacts to improve reuse recommendations.
              </p>
              {excludedTotal > 0 && (
                <p className="muted cd-suggested-excluded-note">
                  {excludedTotal} broad or untagged candidate{excludedTotal !== 1 ? 's were' : ' was'} excluded from suggestions.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Strong Suggestions — expanded by default */}
              <div className="cd-suggested-tier">
                <h4 className="cd-suggested-tier-heading">
                  Strong Suggestions{strong.length > 0 ? ` (${strong.length})` : ''}
                </h4>
                {strong.length === 0 ? (
                  <p className="muted cd-suggested-tier-empty">No strong suggestions found.</p>
                ) : (
                  <>
                    <ul className="cd-suggested-list">{visibleStrong.map(renderCard)}</ul>
                    {strongTotalPages > 1 && (
                      <div className="am-exp-pagination">
                        <button type="button" className="am-exp-page-btn" disabled={strongSafePage === 0} onClick={() => setStrongPage(strongSafePage - 1)}>‹ Prev</button>
                        <span className="am-exp-page-info">{sStart + 1}–{sEnd} of {strongTotal}</span>
                        <button type="button" className="am-exp-page-btn" disabled={strongSafePage >= strongTotalPages - 1} onClick={() => setStrongPage(strongSafePage + 1)}>Next ›</button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Related Candidates — collapsed by default */}
              {related.length > 0 && (
                <div className="cd-suggested-tier">
                  <button
                    type="button"
                    className="cd-suggested-tier-heading cd-suggested-tier-heading--toggle"
                    onClick={() => setRelatedExpanded((v) => !v)}
                    aria-expanded={relatedExpanded}
                  >
                    Related Candidates ({relatedTotal})
                    <span className="reuse-tier-chevron" aria-hidden="true">{relatedExpanded ? ' ▾' : ' ▸'}</span>
                  </button>
                  {relatedExpanded && (
                    <>
                      <ul className="cd-suggested-list">{visibleRelated.map(renderCard)}</ul>
                      {relatedTotalPages > 1 && (
                        <div className="am-exp-pagination">
                          <button type="button" className="am-exp-page-btn" disabled={relatedSafePage === 0} onClick={() => setRelatedPage(relatedSafePage - 1)}>‹ Prev</button>
                          <span className="am-exp-page-info">{rStart + 1}–{rEnd} of {relatedTotal}</span>
                          <button type="button" className="am-exp-page-btn" disabled={relatedSafePage >= relatedTotalPages - 1} onClick={() => setRelatedPage(relatedSafePage + 1)}>Next ›</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {excluded.cappedCount > 0 && (
                <p className="muted cd-suggested-excluded-note">
                  Additional lower-ranked candidates were hidden to keep suggestions focused.
                </p>
              )}
              {excludedTotal > 0 && (
                <p className="muted cd-suggested-excluded-note">
                  {excludedTotal} broad or untagged candidate{excludedTotal !== 1 ? 's were' : ' was'} excluded from suggestions.
                </p>
              )}
            </>
          )}
        </div>

        <div className="cd-edit-modal-footer">
          <button type="button" className="cd-edit-btn-secondary" onClick={onClose}>Close</button>
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
  statusWarning,
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
            <p className="cd-edit-trending-note muted">
              Status automatically follows objective MET/NOT MET progress. A manual pick here holds until the next
              objective status change recalculates it.
            </p>
            {statusWarning && (
              <p className={`cd-edit-status-warning cd-edit-status-warning--${statusWarning.severity}`}>
                ⚠ {statusWarning.message}
              </p>
            )}
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

// ── Inline Suggested Artifacts (center column, below objective workspace) ─────

function SuggestedArtifactsInline({ control, obj, allControls, onAdd, onOpenArtifact }) {
  const [strongPage, setStrongPage] = useState(0)
  const [relatedPage, setRelatedPage] = useState(0)
  const [relatedExpanded, setRelatedExpanded] = useState(false)

  const { strong, related, excluded } = useMemo(() => getObjectiveArtifactSuggestions({
    control,
    objective: obj,
    allControls,
    limit: 50,
  }), [control, obj, allControls])

  const total = strong.length + related.length
  const excludedTotal = excluded.untaggedCount + excluded.broadCount

  // Strong tier pagination
  const strongTotal = strong.length
  const strongTotalPages = Math.ceil(strongTotal / SUGGESTION_TIER_PAGE_SIZE)
  const strongSafePage = Math.min(strongPage, Math.max(strongTotalPages - 1, 0))
  const sStart = strongSafePage * SUGGESTION_TIER_PAGE_SIZE
  const sEnd = Math.min(sStart + SUGGESTION_TIER_PAGE_SIZE, strongTotal)
  const visibleStrong = strong.slice(sStart, sEnd)

  // Related tier pagination
  const relatedTotal = related.length
  const relatedTotalPages = Math.ceil(relatedTotal / SUGGESTION_TIER_PAGE_SIZE)
  const relatedSafePage = Math.min(relatedPage, Math.max(relatedTotalPages - 1, 0))
  const rStart = relatedSafePage * SUGGESTION_TIER_PAGE_SIZE
  const rEnd = Math.min(rStart + SUGGESTION_TIER_PAGE_SIZE, relatedTotal)
  const visibleRelated = related.slice(rStart, rEnd)

  const ec = obj.evidenceClass
  if (ec !== 'artifact' && ec !== 'mixed') return null
  if (total === 0 && excludedTotal === 0) return null

  const renderSuggestion = (s) => (
    <li key={s.artifact} className="evidence-reuse-suggestion">
      <button
        type="button"
        className="evidence-reuse-suggestion-add"
        onClick={(e) => { e.stopPropagation(); onAdd(obj.id, s.artifact) }}
        aria-label={`Add ${s.artifact} to objective ${obj.id}`}
      >+</button>
      <div className="evidence-reuse-suggestion-body">
        <button
          type="button"
          className="evidence-reuse-suggestion-name evidence-reuse-suggestion-name--button"
          onClick={() => onOpenArtifact(s.artifact)}
          aria-label={`Edit evidence tags for ${s.artifact}`}
        >{s.artifact}</button>
        {s.reason && (
          <span className="evidence-reuse-suggestion-reason">{s.reason}</span>
        )}
        {s.sourceControlId && (
          <span className="evidence-reuse-suggestion-source">
            also mapped to{' '}
            <Link
              to={`/controls/${encodeURIComponent(s.sourceControlId)}#objective-${s.sourceObjectiveId}`}
              title={`${s.sourceControlId} — ${s.sourceControlTitle}`}
            >
              {s.sourceControlId}
            </Link>
            {s.sourceObjectiveId ? ` [${s.sourceObjectiveId}]` : ''}
          </span>
        )}
        {s.tagAlignment && s.tagAlignment.overlap.all.length > 0 && (
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
        {s.rationale && (
          <details className="evidence-reuse-suggestion-details">
            <summary>Details</summary>
            <span className="evidence-reuse-suggestion-rationale">{s.rationale}</span>
          </details>
        )}
      </div>
    </li>
  )

  return (
    <div className="evidence-reuse-suggestions">
      <p className="reuse-tag-helper">
        Suggestions are based on evidence tags, expected evidence alignment, and relationship context. Suggestions are guidance only and do not determine assessment outcomes.
      </p>
      {total === 0 ? (
        <div className="evidence-reuse-suggestions-empty">
          <p className="reuse-tag-helper">No tagged artifact suggestions found for this objective. Add evidence tags to artifacts to improve reuse recommendations.</p>
        </div>
      ) : (
        <>
          {/* Strong Suggestions — expanded by default */}
          <p className="reuse-tier-heading">Strong Suggestions{strong.length > 0 ? ` (${strong.length})` : ''}</p>
          {strong.length === 0 ? (
            <p className="reuse-tag-helper">No strong suggestions found.</p>
          ) : (
            <>
              <ul>{visibleStrong.map(renderSuggestion)}</ul>
              {strongTotalPages > 1 && (
                <div className="am-exp-pagination">
                  <button type="button" className="am-exp-page-btn" disabled={strongSafePage === 0} onClick={() => setStrongPage(strongSafePage - 1)}>‹ Prev</button>
                  <span className="am-exp-page-info">{sStart + 1}–{sEnd} of {strongTotal}</span>
                  <button type="button" className="am-exp-page-btn" disabled={strongSafePage >= strongTotalPages - 1} onClick={() => setStrongPage(strongSafePage + 1)}>Next ›</button>
                </div>
              )}
            </>
          )}

          {/* Related Candidates — collapsed by default */}
          {related.length > 0 && (
            <>
              <button
                type="button"
                className="reuse-tier-heading reuse-tier-heading--toggle"
                onClick={() => setRelatedExpanded((v) => !v)}
                aria-expanded={relatedExpanded}
              >
                Related Candidates ({relatedTotal})
                <span className="reuse-tier-chevron" aria-hidden="true">{relatedExpanded ? ' ▾' : ' ▸'}</span>
              </button>
              {relatedExpanded && (
                <>
                  <ul>{visibleRelated.map(renderSuggestion)}</ul>
                  {relatedTotalPages > 1 && (
                    <div className="am-exp-pagination">
                      <button type="button" className="am-exp-page-btn" disabled={relatedSafePage === 0} onClick={() => setRelatedPage(relatedSafePage - 1)}>‹ Prev</button>
                      <span className="am-exp-page-info">{rStart + 1}–{rEnd} of {relatedTotal}</span>
                      <button type="button" className="am-exp-page-btn" disabled={relatedSafePage >= relatedTotalPages - 1} onClick={() => setRelatedPage(relatedSafePage + 1)}>Next ›</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      {excluded.cappedCount > 0 && (
        <p className="reuse-tag-excluded-note">
          Additional lower-ranked candidates were hidden to keep suggestions focused.
        </p>
      )}
      {excludedTotal > 0 && (
        <p className="reuse-tag-excluded-note">
          {excludedTotal} broad or untagged candidate{excludedTotal !== 1 ? 's were' : ' was'} excluded from suggestions.
        </p>
      )}
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
  const [selectedObjectiveId, setSelectedObjectiveId] = useState(() => control?.objectives[0]?.id ?? null)
  const [selectedArtifact, setSelectedArtifact] = useState(null)
  // Bumped after tag saves so findByName() re-runs and untagged chip state updates.
  const [artifactTagVersion, setArtifactTagVersion] = useState(0)
  // Review group modal state
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false)
  const [reviewGroupsVersion, setReviewGroupsVersion] = useState(0) // bump to recompute
  // Suggested artifacts modal
  const [showSuggestedModal, setShowSuggestedModal] = useState(false)
  // Findings Builder modal
  const [showFindingsModal, setShowFindingsModal] = useState(false)
  const [showBulkFindingsModal, setShowBulkFindingsModal] = useState(false)
  const [objectiveFindings, setObjectiveFindings] = useState(() => loadObjectiveFindings(id, control))
  // Per-objective interviewed roles (separate from finding and from interview notes)
  const [objectiveInterviewedRoles, setObjectiveInterviewedRoles] = useState(() => loadObjectiveInterviewedRolesMap(id, control))
  // Role picker modal — can be opened from the Interviews section header
  const [showRolePickerModal, setShowRolePickerModal] = useState(false)

  // Recomputed whenever this control's pool or objective artifacts change so
  // newly-typed names show up in suggestion dropdowns immediately — previously
  // memoized with an empty deps array, so it only reflected the artifact set
  // as of the last full page load / control navigation.
  const globalArtifactNames = useMemo(() => buildArtifactIndex(controls).map((e) => e.artifact),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, objectiveArtifacts])

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

  // Whether an objective has any recorded work (results, artifacts, a saved
  // finding, or interviewed roles) even if its MET/NOT MET status hasn't
  // been explicitly set — drives the rail's "In Progress" indicator below.
  const objectiveHasWork = (objId) => {
    const result = objectiveResults[objId]
    if (result && Object.values(result).some((v) => (v ?? '').trim())) return true
    if ((objectiveArtifacts[objId] ?? []).length > 0) return true
    if (objectiveFindings[objId]) return true
    if ((objectiveInterviewedRoles[objId] ?? []).length > 0) return true
    return false
  }

  // Status is a single field driven automatically by objective progress —
  // there is no separate "Trending" indicator anymore. Every time an
  // objective's MET/NOT MET call changes, Status is recomputed from scratch
  // and always overwritten (all objectives MET → MET; any NOT MET → NOT MET;
  // otherwise In Progress/Not Started). A manually-picked Status (via Edit
  // Details) stands until the next objective-status change recomputes it —
  // getStatusConsistencyWarning flags the gap in the meantime.
  const syncStatusToTrending = (nextObjectiveStatuses) => {
    const next = getTrendingStatus(control?.objectives ?? [], nextObjectiveStatuses)
    setStatus(next)
    writeStatus(id, next)
  }

  const statusWarning = getStatusConsistencyWarning(status, trendingStatus)

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
    const next = { ...objectiveStatuses, [objId]: value }
    setObjectiveStatuses(next)
    writeObjectiveStatus(id, objId, value)
    if (value !== OBJECTIVE_STATUS_UNREVIEWED) promoteToInProgress(status, id, setStatus)
    syncStatusToTrending(next)
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

  // Applies every control-level inheritance source to every objective on this
  // control in one action. Additive/union only — an objective's existing
  // inheritance sources are preserved and sources already present are skipped,
  // so this is always safe to click again after the control's sources change.
  const handleApplyInheritanceToAllObjectives = () => {
    if (inheritanceSources.length === 0 || !control?.objectives?.length) return
    const nextObjInheritance = { ...objectiveInheritance }
    for (const obj of control.objectives) {
      const current = nextObjInheritance[obj.id] ?? []
      const additions = inheritanceSources.filter((s) => !current.includes(s))
      if (additions.length === 0) continue
      const next = [...current, ...additions]
      nextObjInheritance[obj.id] = next
      writeObjectiveInheritance(id, obj.id, next)
    }
    setObjectiveInheritance(nextObjInheritance)
  }

  const handleObjectiveResultChange = (objId, field, value) => {
    const current = objectiveResults[objId] ?? { interviews: '', examine: '', test: '', overallComments: '' }
    const next = { ...current, [field]: value }
    setObjectiveResults((prev) => ({ ...prev, [objId]: next }))
    writeObjectiveResult(id, objId, next)
    promoteToInProgress(status, id, setStatus)
  }

  const handleSaveFinding = (objId, finding) => {
    writeObjectiveFinding(id, objId, finding)
    setObjectiveFindings((prev) => ({ ...prev, [objId]: finding }))
    setShowFindingsModal(false)
  }

  const handleClearFinding = (objId) => {
    clearObjectiveFinding(id, objId)
    setObjectiveFindings((prev) => {
      const next = { ...prev }
      delete next[objId]
      return next
    })
    setShowFindingsModal(false)
  }

  const handleRolesSaved = (objId, roles) => {
    writeObjectiveInterviewedRoles(id, objId, roles)
    setObjectiveInterviewedRoles((prev) => ({ ...prev, [objId]: roles }))
    setShowRolePickerModal(false)
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

  // Applies every current Evidence Pool artifact to every objective on this
  // control in one action. Additive/union only — an objective's existing
  // artifact list is preserved and pool items already assigned are skipped,
  // so this is always safe to click again after the pool changes.
  const handleApplyPoolToAllObjectives = () => {
    if (pool.length === 0 || !control?.objectives?.length) return
    const nextObjArtifacts = { ...objectiveArtifacts }
    for (const obj of control.objectives) {
      const current = nextObjArtifacts[obj.id] ?? []
      const additions = pool.filter((item) => !current.includes(item))
      if (additions.length === 0) continue
      const next = [...current, ...additions]
      nextObjArtifacts[obj.id] = next
      writeObjectiveArtifacts(id, obj.id, next)
    }
    setObjectiveArtifacts(nextObjArtifacts)
    promoteToInProgress(status, id, setStatus)
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

  const controlIndex = orderedControls.findIndex((c) => c.id === id)
  const prevControl = controlIndex > 0 ? orderedControls[controlIndex - 1] : null
  const nextControl = controlIndex < orderedControls.length - 1 ? orderedControls[controlIndex + 1] : null

  return (
    <div className="dash-root">
      <DashSidebar />
      <div className="cd-workspace dash-main">

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
            <span className="cd-status-value-row">
              <span className={`status-badge ${STATUS_BADGE_CLASS[status]}`}>{status}</span>
              {statusWarning && (
                <span
                  className={`cd-status-warning cd-status-warning--${statusWarning.severity}`}
                  title={`${statusWarning.message} ${statusWarning.note}`}
                >
                  ⚠
                </span>
              )}
            </span>
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
            <button type="button" onClick={() => setShowBulkFindingsModal(true)}>Create Findings for This Control</button>
            {inheritanceSources.length > 0 && (
              <button
                type="button"
                onClick={handleApplyInheritanceToAllObjectives}
                title="Add every control-level inheritance source to every objective on this control. Existing per-objective sources are left as-is."
              >
                Apply Inheritance to All Objectives
              </button>
            )}
          </div>
        </div>

        {/* Two-column top panel: Evidence Pool (left) + Assessment Guide Discussion (right) */}
        <div className="cd-top-grid">

          {/* LEFT: Evidence Pool + Expected Evidence Types */}
          <div className="cd-header-pool">
            <div className="cd-pool-header-row">
              <label htmlFor="pool-input">
                <strong>Evidence Pool{pool.length > 0 ? ` (${pool.length})` : ''}</strong>
              </label>
              {pool.length > 0 && (
                <button
                  type="button"
                  className="cd-pool-apply-all-btn"
                  onClick={handleApplyPoolToAllObjectives}
                  title="Add every Evidence Pool artifact to every objective on this control. Existing assignments and overlaps are left as-is."
                >
                  Apply to All Objectives
                </button>
              )}
            </div>
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
            const railStatus = objStatus === OBJECTIVE_STATUS_UNREVIEWED && objectiveHasWork(obj.id)
              ? 'In Progress'
              : objStatus
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
                  {railStatus !== OBJECTIVE_STATUS_UNREVIEWED && (
                    <span className={`cd-rail-status cd-rail-status--${
                      railStatus === OBJECTIVE_STATUS_MET ? 'met' : railStatus === OBJECTIVE_STATUS_NOT_MET ? 'not-met' : 'in-progress'
                    }`}>{railStatus}</span>
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

                  {/* Findings Builder — last in header, final output after review */}
                  <div className="cd-obj-pills-group cd-obj-findings-group">
                    <span className="cd-obj-pills-label">Findings</span>
                    <div className="cd-obj-findings-row">
                      {objectiveFindings[selectedObj.id] && (
                        <span className="cd-findings-drafted-chip">Finding Drafted</span>
                      )}
                      <button
                        type="button"
                        className="cd-findings-builder-btn"
                        onClick={() => setShowFindingsModal(true)}
                      >
                        {objectiveFindings[selectedObj.id] ? 'Edit Finding' : 'Create Finding'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cd-obj-body">
                {/* Assigned Artifacts — shown first for quick access */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <div className="cd-assigned-artifacts-header">
                    <label htmlFor={`obj-artifacts-${control.id}-${selectedObj.id}`}>
                      <strong>Assigned Artifacts{(objectiveArtifacts[selectedObj.id] ?? []).length > 0
                        ? ` (${(objectiveArtifacts[selectedObj.id] ?? []).length})` : ''}</strong>
                    </label>
                    {(selectedObj.evidenceClass === 'artifact' || selectedObj.evidenceClass === 'mixed') && (
                      <button
                        type="button"
                        className="cd-view-suggested-btn"
                        onClick={() => setShowSuggestedModal(true)}
                      >
                        View Suggested Artifacts
                      </button>
                    )}
                  </div>
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
                  const isInterviews = field === 'interviews'
                  const objRoles = isInterviews ? (objectiveInterviewedRoles[selectedObj.id] ?? []) : []
                  return (
                    <div key={field} style={{ marginBottom: 'var(--space-3)' }}>
                      <div className={isInterviews ? 'cd-interviews-header' : undefined}>
                        <label htmlFor={fieldId}><strong>{label}</strong></label>
                        {isInterviews && (
                          <button
                            type="button"
                            className="cd-interviews-add-role-btn"
                            onClick={() => setShowRolePickerModal(true)}
                          >
                            + Add Role
                          </button>
                        )}
                      </div>
                      {isInterviews && objRoles.length > 0 && (
                        <div className="cd-interviews-role-chips">
                          {objRoles.map((r) => (
                            <span key={r} className="cd-interviews-role-chip">
                              {r}
                              <button
                                type="button"
                                className="cd-interviews-role-chip-remove"
                                onClick={() => {
                                  const next = objRoles.filter((x) => x !== r)
                                  writeObjectiveInterviewedRoles(id, selectedObj.id, next)
                                  setObjectiveInterviewedRoles((prev) => ({ ...prev, [selectedObj.id]: next }))
                                }}
                                aria-label={`Remove ${r}`}
                              >×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      <AutoResizeTextarea
                        id={fieldId}
                        value={(objectiveResults[selectedObj.id] ?? {})[field] ?? ''}
                        onChange={(e) => handleObjectiveResultChange(selectedObj.id, field, e.target.value)}
                        rows={3}
                        placeholder={placeholder}
                      />
                      {EMASS_LIMITED_FIELDS.has(field) && (() => {
                        const len = ((objectiveResults[selectedObj.id] ?? {})[field] ?? '').length
                        const overLimit = len > EMASS_CHAR_LIMIT
                        return (
                          <div className={`cd-field-char-count${overLimit ? ' cd-field-char-count--over' : ''}`}>
                            {len} / {EMASS_CHAR_LIMIT}{overLimit ? ' — exceeds eMASS import limit' : ''}
                          </div>
                        )
                      })()}
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
              <SuggestedArtifactsInline
                key={selectedObj.id}
                control={control}
                obj={selectedObj}
                allControls={controls}
                onAdd={(objId, artifact) => commitObjArtifact(objId, artifact)}
                onOpenArtifact={(name) => setSelectedArtifact(findOrCreate(name))}
              />
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

      {showSuggestedModal && selectedObj && (
        <SuggestedArtifactsModal
          control={control}
          obj={selectedObj}
          allControls={controls}
          onAssign={(name) => commitObjArtifact(selectedObj.id, name)}
          onClose={() => setShowSuggestedModal(false)}
        />
      )}

      {showFindingsModal && selectedObj && (
        <FindingsBuilderModal
          controlId={control.id}
          controlTitle={control.title}
          obj={selectedObj}
          objStatus={objectiveStatuses[selectedObj.id] ?? 'Unreviewed'}
          dibcacStd={getDibcacStandard(control.id, selectedObj.id)}
          assignedArtifacts={objectiveArtifacts[selectedObj.id] ?? []}
          interviewedRoles={objectiveInterviewedRoles[selectedObj.id] ?? []}
          existingFinding={objectiveFindings[selectedObj.id] ?? null}
          onSave={(finding) => handleSaveFinding(selectedObj.id, finding)}
          onClear={() => handleClearFinding(selectedObj.id)}
          onClose={() => setShowFindingsModal(false)}
          onRolesSaved={(roles) => {
            writeObjectiveInterviewedRoles(id, selectedObj.id, roles)
            setObjectiveInterviewedRoles((prev) => ({ ...prev, [selectedObj.id]: roles }))
          }}
        />
      )}

      {showRolePickerModal && selectedObj && (
        <InterviewRolePickerModal
          currentRoles={objectiveInterviewedRoles[selectedObj.id] ?? []}
          onSave={(roles) => handleRolesSaved(selectedObj.id, roles)}
          onClose={() => setShowRolePickerModal(false)}
        />
      )}

      {showBulkFindingsModal && (
        <BulkFindingsModal
          title={`Create Findings for ${control.id}`}
          controlsInScope={[control]}
          onClose={() => {
            setShowBulkFindingsModal(false)
            setObjectiveFindings(loadObjectiveFindings(id, control))
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
          statusWarning={statusWarning}
          assignedTo={assignedTo}
          onAssignedToChange={handleAssignedToChange}
          onAssignedToBlur={handleAssignedToBlur}
          onAssignedToSelect={handleAssignedToSelect}
        />
      )}
      </div>
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

function loadObjectiveInterviewedRolesMap(controlId, control) {
  if (!control) return {}
  const map = {}
  for (const obj of control.objectives) {
    const roles = readObjectiveInterviewedRoles(controlId, obj.id)
    if (roles.length > 0) map[obj.id] = roles
  }
  return map
}

function loadObjectiveFindings(controlId, control) {
  if (!control) return {}
  const map = {}
  for (const obj of control.objectives) {
    const f = readObjectiveFinding(controlId, obj.id)
    if (f) map[obj.id] = f
  }
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
