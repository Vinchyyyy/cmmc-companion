import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import controls from '../data/controls/index'
import { getDibcacStandard, DIBCAC_STANDARDS } from '../data/dibcacAssessmentStandards'
import {
  readObjectiveStatus,
  writeObjectiveStatus,
  OBJECTIVE_STATUS_MET,
  OBJECTIVE_STATUS_NOT_MET,
  OBJECTIVE_STATUS_UNREVIEWED,
} from '../utils/objectiveStatus'
import { readObjectiveResult, writeObjectiveResult } from '../utils/objectiveResults'
import { readObjectiveArtifacts } from '../utils/objectiveArtifacts'
import { readObjectiveInheritance } from '../utils/inheritance'
import {
  getReviewGroups,
  createReviewGroup,
  updateReviewGroup,
  deleteReviewGroup,
} from '../utils/reviewGroups'

const METHOD_ORDER = [
  'document',
  'screen_share',
  'artifact',
  'physical_review',
  'artifact_and_screen_share',
]

const METHOD_META = {
  document:                  { label: 'Document',               className: 'dibcac-chip--document' },
  screen_share:              { label: 'Screen Share',           className: 'dibcac-chip--screen_share' },
  artifact:                  { label: 'Artifact',               className: 'dibcac-chip--artifact' },
  physical_review:           { label: 'Physical Review',        className: 'dibcac-chip--physical_review' },
  artifact_and_screen_share: { label: 'Artifact + Screen Share', className: 'dibcac-chip--artifact_and_screen_share' },
  unknown:                   { label: 'Variable',               className: 'dibcac-chip--unknown' },
}

const ALL_FAMILIES = [...new Set(controls.map((c) => c.family))]
const CONTROL_BY_ID = new Map(controls.map((c) => [c.id, c]))

// ── Shared chips ──────────────────────────────────────────────────────────────

function MethodChip({ standard }) {
  const meta = METHOD_META[standard] ?? METHOD_META.unknown
  return <span className={`dibcac-chip ${meta.className}`}>{meta.label}</span>
}

function ObjStatusChip({ controlId, objId }) {
  const status = readObjectiveStatus(controlId, objId)
  if (status === OBJECTIVE_STATUS_MET)
    return <span className="dibcac-obj-status dibcac-obj-status--met">MET</span>
  if (status === OBJECTIVE_STATUS_NOT_MET)
    return <span className="dibcac-obj-status dibcac-obj-status--not-met">NOT MET</span>
  return null
}

// ── Objective inline preview modal ────────────────────────────────────────────

function ObjectivePreview({ previewKey, onClose }) {
  const ref = useRef(null)

  const [controlId, objId] = useMemo(() => {
    if (!previewKey) return [null, null]
    const m = previewKey.match(/^(.+)\[([a-z0-9]+)\]$/)
    return m ? [m[1], m[2]] : [null, null]
  }, [previewKey])

  const control    = controlId ? CONTROL_BY_ID.get(controlId) : null
  const obj        = control?.objectives.find((o) => o.id === objId) ?? null
  const std        = controlId && objId ? getDibcacStandard(controlId, objId) : null
  const status     = controlId && objId ? readObjectiveStatus(controlId, objId) : null
  const result     = controlId && objId ? readObjectiveResult(controlId, objId) : null
  const artifacts  = controlId && objId ? readObjectiveArtifacts(controlId, objId) : []
  const objInherit = controlId && objId ? readObjectiveInheritance(controlId, objId) : []

  if (!previewKey || !control || !obj) return null

  const statusLabel = status === OBJECTIVE_STATUS_MET ? 'MET'
    : status === OBJECTIVE_STATUS_NOT_MET ? 'NOT MET'
    : 'Unreviewed'

  return (
    <div
      className="dibcac-preview-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`Objective preview: ${previewKey}`}
    >
      <div className="dibcac-preview-panel" ref={ref}>
        <div className="dibcac-preview-header">
          <div className="dibcac-preview-header-id">
            <span className="dibcac-preview-control-id mono">{controlId}</span>
            <span className="dibcac-preview-control-title">— {control.title}</span>
          </div>
          <button
            type="button"
            className="dibcac-preview-close"
            onClick={onClose}
            aria-label="Close preview"
          >✕</button>
        </div>

        <div className="dibcac-preview-body">
          <div className="dibcac-preview-obj-heading">
            <span className="mono dibcac-preview-obj-letter">[{obj.id}]</span>
            <span className="dibcac-preview-obj-text">{obj.text}</span>
          </div>

          <div className="dibcac-preview-meta-row">
            <div className="dibcac-preview-meta-item">
              <span className="dibcac-preview-meta-label">Objective Status</span>
              <span className={`dibcac-preview-status dibcac-preview-status--${status === OBJECTIVE_STATUS_MET ? 'met' : status === OBJECTIVE_STATUS_NOT_MET ? 'not-met' : 'unreviewed'}`}>
                {statusLabel}
              </span>
            </div>
            <div className="dibcac-preview-meta-item">
              <span className="dibcac-preview-meta-label">DIBCAC Standard</span>
              {std ? <MethodChip standard={std.standard} /> : <span className="dibcac-preview-na">Not mapped</span>}
            </div>
          </div>

          {objInherit.length > 0 && (
            <div className="dibcac-preview-section">
              <span className="dibcac-preview-section-label">Inheritance</span>
              <div className="dibcac-preview-chips">
                {objInherit.map((src) => (
                  <span key={src} className="dibcac-preview-inherit-chip">{src}</span>
                ))}
              </div>
            </div>
          )}

          {artifacts.length > 0 && (
            <div className="dibcac-preview-section">
              <span className="dibcac-preview-section-label">Assigned Artifacts ({artifacts.length})</span>
              <ul className="dibcac-preview-artifact-list">
                {artifacts.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {result && (result.interviews || result.examine || result.test || result.overallComments) && (
            <div className="dibcac-preview-result-fields">
              {result.interviews && (
                <div className="dibcac-preview-section">
                  <span className="dibcac-preview-section-label">Interviews</span>
                  <p className="dibcac-preview-result-text">{result.interviews}</p>
                </div>
              )}
              {result.examine && (
                <div className="dibcac-preview-section">
                  <span className="dibcac-preview-section-label">Examine</span>
                  <p className="dibcac-preview-result-text">{result.examine}</p>
                </div>
              )}
              {result.test && (
                <div className="dibcac-preview-section">
                  <span className="dibcac-preview-section-label">Test</span>
                  <p className="dibcac-preview-result-text">{result.test}</p>
                </div>
              )}
              {result.overallComments && (
                <div className="dibcac-preview-section">
                  <span className="dibcac-preview-section-label">Overall Comments</span>
                  <p className="dibcac-preview-result-text">{result.overallComments}</p>
                </div>
              )}
            </div>
          )}

          {artifacts.length === 0 && objInherit.length === 0 &&
            !(result && (result.interviews || result.examine || result.test || result.overallComments)) && (
            <p className="dibcac-preview-none">No assessment data recorded for this objective yet.</p>
          )}
        </div>

        <div className="dibcac-preview-footer">
          <span className="dibcac-preview-readonly-note">Read-only reference</span>
          <Link
            to={`/controls/${controlId}#objective-${objId}`}
            className="dibcac-preview-open-link"
          >
            Open in Control Detail →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Objective row (browse + builder left-panel) ───────────────────────────────

function ObjectiveRow({ obj, builderMode, checked, onCheck, onPreview }) {
  const std = obj.standard ?? 'unknown'
  const handleRowClick = builderMode
    ? (e) => {
        // Don't toggle if the click was on the ref button or checkbox itself
        if (e.target.closest('.dibcac-obj-ref-btn') || e.target.closest('.dibcac-obj-checkbox')) return
        onCheck(obj.key)
      }
    : undefined

  return (
    <div
      className={`dibcac-obj-row${checked ? ' dibcac-obj-row--selected' : ''}${builderMode ? ' dibcac-obj-row--selectable' : ''}`}
      onClick={handleRowClick}
      role={builderMode ? 'checkbox' : undefined}
      aria-checked={builderMode ? checked : undefined}
    >
      {builderMode && (
        <input
          type="checkbox"
          className="dibcac-obj-checkbox"
          checked={checked}
          onChange={() => onCheck(obj.key)}
          aria-label={`Select ${obj.controlId}[${obj.objId}]`}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div className="dibcac-obj-body">
        <div className="dibcac-obj-main">
          <button
            type="button"
            className="dibcac-obj-ref-btn mono"
            onClick={(e) => { e.stopPropagation(); onPreview(obj.key) }}
            title="Click to preview objective"
          >
            {obj.controlId}[{obj.objId}]
          </button>
          <span className="dibcac-obj-text">{obj.objText}</span>
        </div>
        <div className="dibcac-obj-meta">
          <MethodChip standard={std} />
          <ObjStatusChip controlId={obj.controlId} objId={obj.objId} />
        </div>
      </div>
    </div>
  )
}

// ── Grouped browser ───────────────────────────────────────────────────────────

function GroupedBrowser({ flatObjs, builderMode, checkedKeys, onCheck, onPreview }) {
  const [openMethods,  setOpenMethods]  = useState(new Set())
  const [openFamilies, setOpenFamilies] = useState(new Set())
  const [openControls, setOpenControls] = useState(new Set())

  const toggleMethod  = (m) => setOpenMethods((s)  => { const n = new Set(s); n.has(m) ? n.delete(m) : n.add(m); return n })
  const toggleFamily  = (k) => setOpenFamilies((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const toggleControl = (k) => setOpenControls((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })

  const grouped = useMemo(() => {
    const byMethod = new Map()
    for (const obj of flatObjs) {
      const m = obj.standard ?? 'unknown'
      if (!byMethod.has(m)) byMethod.set(m, new Map())
      const byFamily = byMethod.get(m)
      if (!byFamily.has(obj.family)) byFamily.set(obj.family, new Map())
      const byControl = byFamily.get(obj.family)
      if (!byControl.has(obj.controlId)) byControl.set(obj.controlId, { title: obj.controlTitle, objs: [] })
      byControl.get(obj.controlId).objs.push(obj)
    }
    return byMethod
  }, [flatObjs])

  const orderedMethods = [
    ...METHOD_ORDER.filter((m) => grouped.has(m)),
    ...[...grouped.keys()].filter((m) => !METHOD_ORDER.includes(m)),
  ]

  if (flatObjs.length === 0) {
    return <div className="dibcac-empty">No objectives match the current filters.</div>
  }

  return (
    <div className="dibcac-browser">
      {orderedMethods.map((method) => {
        const meta = METHOD_META[method] ?? METHOD_META.unknown
        const byFamily = grouped.get(method)
        const isOpen = openMethods.has(method)
        const totalObjs = [...byFamily.values()].flatMap((bf) => [...bf.values()]).flatMap((c) => c.objs).length

        return (
          <section key={method} className={`dibcac-method-section${method === 'unknown' ? ' dibcac-method-section--variable' : ''}`}>
            <button
              type="button"
              className="dibcac-method-header"
              onClick={() => toggleMethod(method)}
              aria-expanded={isOpen}
            >
              <span className={`dibcac-chip ${meta.className}`}>{meta.label}</span>
              <span className="dibcac-method-count">{totalObjs} objective{totalObjs !== 1 ? 's' : ''}</span>
              <span className="dibcac-collapse-icon">{isOpen ? '▼' : '▶'}</span>
            </button>

            {isOpen && (
              <div className="dibcac-method-body">
                {[...byFamily.entries()].map(([family, byControl]) => {
                  const familyKey = `${method}:${family}`
                  const isFamilyOpen = openFamilies.has(familyKey)
                  const familyObjCount = [...byControl.values()].flatMap((c) => c.objs).length

                  return (
                    <div key={family} className="dibcac-family-group">
                      <button
                        type="button"
                        className="dibcac-family-header"
                        onClick={() => toggleFamily(familyKey)}
                        aria-expanded={isFamilyOpen}
                      >
                        <span className="dibcac-family-name">{family}</span>
                        <span className="dibcac-family-count">{familyObjCount} obj</span>
                        <span className="dibcac-collapse-icon">{isFamilyOpen ? '▼' : '▶'}</span>
                      </button>

                      {isFamilyOpen && (
                        <div className="dibcac-family-body">
                          {[...byControl.entries()].map(([controlId, { title, objs }]) => {
                            const ctrlKey = `${method}:${family}:${controlId}`
                            const isCtrlOpen = openControls.has(ctrlKey)

                            return (
                              <div key={controlId} className="dibcac-control-group">
                                <button
                                  type="button"
                                  className="dibcac-control-header"
                                  onClick={() => toggleControl(ctrlKey)}
                                  aria-expanded={isCtrlOpen}
                                >
                                  <span className="dibcac-control-id mono">{controlId}</span>
                                  <span className="dibcac-control-title">{title}</span>
                                  <span className="dibcac-control-obj-count">{objs.length} obj</span>
                                  <span className="dibcac-collapse-icon">{isCtrlOpen ? '▼' : '▶'}</span>
                                </button>

                                {isCtrlOpen && (
                                  <div className="dibcac-control-body">
                                    {objs.map((obj) => (
                                      <ObjectiveRow
                                        key={obj.key}
                                        obj={obj}
                                        builderMode={builderMode}
                                        checked={checkedKeys.has(obj.key)}
                                        onCheck={onCheck}
                                        onPreview={onPreview}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

// ── Builder panel (new group OR editing existing) ─────────────────────────────

function AutoExpandTextarea({ value, onChange, id, className, placeholder, rows }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${ref.current.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      id={id}
      className={className}
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      style={{ resize: 'none', overflow: 'hidden' }}
    />
  )
}

function BuilderPanel({ checkedKeys, flatObjs, onSave, onCancel, editingGroup }) {
  const isEditing = !!editingGroup

  const [groupName, setGroupName] = useState(() => editingGroup?.name ?? '')
  const [plannedAsk, setPlannedAsk] = useState(() => editingGroup?.plannedAsk ?? '')
  const [selectedObjs, setSelectedObjs] = useState(() =>
    editingGroup ? [...editingGroup.objectives] : []
  )

  const objMap = useMemo(() => {
    const m = new Map()
    for (const o of flatObjs) m.set(o.key, o)
    return m
  }, [flatObjs])

  const handleAddChecked = () => {
    const toAdd = [...checkedKeys]
      .map((k) => objMap.get(k))
      .filter(Boolean)
      .filter((o) => !selectedObjs.some((s) => (s.key ?? s.objectiveRef) === o.key))
    setSelectedObjs((prev) => [...prev, ...toAdd])
  }

  const removeObj = (key) =>
    setSelectedObjs((prev) => prev.filter((o) => (o.key ?? o.objectiveRef) !== key))

  const handleSave = () => {
    if (!groupName.trim() || selectedObjs.length === 0) return
    const normObjs = selectedObjs.map((o) => ({
      key: o.key ?? o.objectiveRef,
      controlId: o.controlId,
      objId: o.objId ?? o.objectiveKey,
      objText: o.objText ?? o.objectiveText,
      standard: o.standard ?? 'unknown',
    }))
    if (isEditing) {
      onSave({
        ...editingGroup,
        name: groupName.trim(),
        plannedAsk: plannedAsk.trim(),
        objectives: normObjs,
      })
    } else {
      onSave({
        id: crypto.randomUUID(),
        name: groupName.trim(),
        plannedAsk: plannedAsk.trim(),
        objectives: normObjs,
        createdAt: new Date().toISOString(),
      })
    }
  }

  return (
    <div className="dibcac-builder-panel">
      <div className="dibcac-builder-header">
        <span className="dibcac-builder-title">
          {isEditing ? 'Edit Review Group' : 'Review Group Builder'}
        </span>
      </div>

      <div className="dibcac-builder-body">
        <div className="dibcac-builder-field">
          <label className="dibcac-builder-label" htmlFor="group-name">Group name</label>
          <input
            id="group-name"
            type="text"
            className="dibcac-builder-input"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Identity Inventory Document Review"
          />
        </div>

        <div className="dibcac-builder-field">
          <div className="dibcac-builder-label">
            Selected Objectives
            <span className="dibcac-builder-count">{selectedObjs.length}</span>
          </div>
          {selectedObjs.length === 0 ? (
            <p className="dibcac-builder-empty-hint">
              {isEditing ? 'No objectives yet. Check objectives on the left, then click Add.' : 'Check objectives on the left, then click Add.'}
            </p>
          ) : (
            <div className="dibcac-builder-obj-list">
              {selectedObjs.map((o) => {
                const key = o.key ?? o.objectiveRef
                const objId = o.objId ?? o.objectiveKey
                const text = o.objText ?? o.objectiveText
                const std = o.standard ?? 'unknown'
                return (
                  <div key={key} className="dibcac-builder-obj-row">
                    <div className="dibcac-builder-obj-info">
                      <span className="mono dibcac-builder-obj-id">{o.controlId}[{objId}]</span>
                      <span className="dibcac-builder-obj-text">{text}</span>
                      <MethodChip standard={std} />
                    </div>
                    <button
                      type="button"
                      className="dibcac-builder-obj-remove"
                      onClick={() => removeObj(key)}
                      aria-label={`Remove ${o.controlId}[${objId}]`}
                    >×</button>
                  </div>
                )
              })}
            </div>
          )}
          <button
            type="button"
            className="dibcac-builder-add-btn"
            onClick={handleAddChecked}
            disabled={checkedKeys.size === 0}
          >
            Add {checkedKeys.size > 0 ? checkedKeys.size : ''} selected objective{checkedKeys.size !== 1 ? 's' : ''}
          </button>
        </div>

        <div className="dibcac-builder-field">
          <label className="dibcac-builder-label" htmlFor="planned-ask">Planned Ask</label>
          <AutoExpandTextarea
            id="planned-ask"
            className="dibcac-builder-textarea"
            value={plannedAsk}
            onChange={(e) => setPlannedAsk(e.target.value)}
            rows={4}
            placeholder="Describe what you plan to ask or review during this session…"
          />
        </div>
      </div>

      <div className="dibcac-builder-footer">
        <button
          type="button"
          className="dibcac-builder-save"
          onClick={handleSave}
          disabled={!groupName.trim() || selectedObjs.length === 0}
        >
          {isEditing ? 'Save Changes' : 'Save Group'}
        </button>
        <button type="button" className="dibcac-builder-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Overall Comments popover ──────────────────────────────────────────────────

function OverallCommentsPopover({ controlId, objId, onClose }) {
  const existing = useMemo(() => readObjectiveResult(controlId, objId), [controlId, objId])
  const [text, setText] = useState(existing.overallComments ?? '')
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSave = useCallback(() => {
    writeObjectiveResult(controlId, objId, { ...existing, overallComments: text })
    onClose()
  }, [controlId, objId, existing, text, onClose])

  return (
    <div
      className="dibcac-comments-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Overall Comments"
    >
      <div className="dibcac-comments-panel">
        <div className="dibcac-comments-header">
          <span className="dibcac-comments-title">Overall Comments</span>
          <span className="dibcac-comments-id mono">{controlId}[{objId}]</span>
          <button type="button" className="dibcac-preview-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <textarea
          ref={textareaRef}
          className="dibcac-comments-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Add overall assessment comments for this objective…"
        />
        <div className="dibcac-comments-footer">
          <button type="button" className="dibcac-builder-save" onClick={handleSave}>Save</button>
          <button type="button" className="dibcac-builder-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Saved group card ──────────────────────────────────────────────────────────

function SavedGroupCard({ group, onDelete, onEditRequest, onPreview }) {
  const [expanded, setExpanded] = useState(false)
  const [commentsKey, setCommentsKey] = useState(null) // `${controlId}[${objId}]`
  const [, forceUpdate] = useState(0)

  const methodSummary = useMemo(() => {
    const seen = new Set(group.objectives.map((o) => o.standard))
    return [...seen].map((s) => METHOD_META[s]?.label ?? 'Variable').join(' · ')
  }, [group.objectives])

  const cycleStatus = useCallback((controlId, objId) => {
    const current = readObjectiveStatus(controlId, objId)
    const next =
      current === OBJECTIVE_STATUS_UNREVIEWED ? OBJECTIVE_STATUS_MET
      : current === OBJECTIVE_STATUS_MET      ? OBJECTIVE_STATUS_NOT_MET
      :                                          OBJECTIVE_STATUS_UNREVIEWED
    writeObjectiveStatus(controlId, objId, next)
    forceUpdate((n) => n + 1)
  }, [])

  const [commentsObjId, commentsControlId] = useMemo(() => {
    if (!commentsKey) return [null, null]
    const m = commentsKey.match(/^(.+)\[([a-z0-9]+)\]$/)
    return m ? [m[2], m[1]] : [null, null]
  }, [commentsKey])

  return (
    <div className="dibcac-group-card">
      {commentsKey && commentsObjId && (
        <OverallCommentsPopover
          controlId={commentsControlId}
          objId={commentsObjId}
          onClose={() => { setCommentsKey(null); forceUpdate((n) => n + 1) }}
        />
      )}

      <div className="dibcac-group-card-header">
        <button
          type="button"
          className="dibcac-group-card-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span className="dibcac-collapse-icon dibcac-group-card-chevron">{expanded ? '▼' : '▶'}</span>
          <div className="dibcac-group-card-info">
            <span className="dibcac-group-card-name">{group.name}</span>
            <span className="dibcac-group-card-meta">
              {group.objectives.length} objective{group.objectives.length !== 1 ? 's' : ''}
              {methodSummary ? ` · ${methodSummary}` : ''}
            </span>
          </div>
        </button>

        <div className="dibcac-group-card-actions">
          <button
            type="button"
            className="dibcac-action-btn"
            onClick={() => onEditRequest(group)}
          >Edit</button>
          <button
            type="button"
            className="dibcac-action-btn dibcac-action-btn--delete"
            onClick={() => onDelete(group.id)}
          >Delete</button>
        </div>
      </div>

      {expanded && (
        <div className="dibcac-group-card-body">
          {group.plannedAsk && (
            <div className="dibcac-group-card-ask-block">
              <span className="dibcac-preview-section-label">Planned Ask</span>
              <p className="dibcac-group-card-ask-text">{group.plannedAsk}</p>
            </div>
          )}

          <div className="dibcac-group-card-objs">
            <span className="dibcac-preview-section-label">Objectives</span>
            {group.objectives.map((o) => {
              const key = o.key ?? o.objectiveRef
              const objId = o.objId ?? o.objectiveKey
              const status = readObjectiveStatus(o.controlId, objId)
              const hasComments = !!readObjectiveResult(o.controlId, objId).overallComments
              return (
                <div key={key} className="dibcac-group-card-obj-row">
                  <div className="dibcac-group-card-obj-left">
                    <button
                      type="button"
                      className="dibcac-obj-ref-btn mono"
                      onClick={() => onPreview(key)}
                      title="Click to preview objective"
                    >
                      {o.controlId}[{objId}]
                    </button>
                    <span className="dibcac-group-card-obj-text">{o.objText ?? o.objectiveText}</span>
                  </div>
                  <div className="dibcac-group-card-obj-actions">
                    <MethodChip standard={o.standard} />
                    <button
                      type="button"
                      className={`dibcac-status-cycle-btn dibcac-status-cycle-btn--${status === OBJECTIVE_STATUS_MET ? 'met' : status === OBJECTIVE_STATUS_NOT_MET ? 'not-met' : 'unreviewed'}`}
                      onClick={() => cycleStatus(o.controlId, objId)}
                      title="Click to cycle: Unreviewed → MET → NOT MET"
                    >
                      {status === OBJECTIVE_STATUS_MET ? 'MET' : status === OBJECTIVE_STATUS_NOT_MET ? 'NOT MET' : '—'}
                    </button>
                    <button
                      type="button"
                      className={`dibcac-comments-btn${hasComments ? ' dibcac-comments-btn--has-content' : ''}`}
                      onClick={() => setCommentsKey(key)}
                      title="Add/edit overall comments"
                    >
                      {hasComments ? '💬' : '○'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function parseGroupSortKey(name) {
  return String(name ?? '').toLowerCase().replace(/(\d+)/g, (n) => n.padStart(10, '0'))
}

// ── Saved groups panel (right rail) ───────────────────────────────────────────

function SavedGroupsPanel({ savedGroups, onDelete, onEditRequest, onPreview, onEnterBuilder }) {
  const [groupSort, setGroupSort] = useState('name') // 'name' | 'created'

  const sortedGroups = useMemo(() => {
    const copy = [...savedGroups]
    if (groupSort === 'name') {
      copy.sort((a, b) => parseGroupSortKey(a.name).localeCompare(parseGroupSortKey(b.name)))
    } else {
      // newest first — fall back to array order for groups without createdAt
      copy.sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0
        if (!a.createdAt) return 1
        if (!b.createdAt) return -1
        return b.createdAt.localeCompare(a.createdAt)
      })
    }
    return copy
  }, [savedGroups, groupSort])

  return (
    <div className="dibcac-rail-panel">
      <div className="dibcac-rail-header">
        <h2 className="dibcac-rail-title">
          Review Groups
          {savedGroups.length > 0 && (
            <span className="dibcac-saved-count">{savedGroups.length}</span>
          )}
        </h2>
        <button type="button" className="dibcac-create-btn" onClick={onEnterBuilder}>
          + Create
        </button>
      </div>

      {savedGroups.length === 0 ? (
        <p className="dibcac-rail-empty">
          No review groups yet. Create one to plan your assessment sessions.
        </p>
      ) : (
        <>
          <div className="dibcac-sort-row">
            <span className="dibcac-sort-label">Sort:</span>
            <button
              type="button"
              className={`dibcac-sort-btn${groupSort === 'name' ? ' dibcac-sort-btn--active' : ''}`}
              onClick={() => setGroupSort('name')}
            >Name</button>
            <button
              type="button"
              className={`dibcac-sort-btn${groupSort === 'created' ? ' dibcac-sort-btn--active' : ''}`}
              onClick={() => setGroupSort('created')}
            >Recently Created</button>
          </div>
          <p className="dibcac-saved-hint">Saved locally · not included in project exports.</p>
          <div className="dibcac-saved-list">
            {sortedGroups.map((group) => (
              <SavedGroupCard
                key={group.id}
                group={group}
                onDelete={onDelete}
                onEditRequest={onEditRequest}
                onPreview={onPreview}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function DibcacMode() {
  const [mode, setMode] = useState('browse')        // 'browse' | 'builder'
  const [editingGroup, setEditingGroup] = useState(null) // null = new group; group obj = edit mode
  const [search, setSearch] = useState('')
  const [familyFilter, setFamilyFilter] = useState('All')
  const [methodFilter, setMethodFilter] = useState('all')
  const [checkedKeys, setCheckedKeys] = useState(new Set())
  const [savedGroups, setSavedGroups] = useState(getReviewGroups)
  const [previewKey, setPreviewKey] = useState(null)
  const searchRef = useRef(null)

  const allObjs = useMemo(() => {
    const list = []
    for (const control of controls) {
      for (const obj of (control.objectives ?? [])) {
        const std = getDibcacStandard(control.id, obj.id)
        list.push({
          key: `${control.id}[${obj.id}]`,
          controlId: control.id,
          controlTitle: control.title,
          family: control.family,
          objId: obj.id,
          objText: obj.text,
          standard: std?.standard ?? null,
          standardLabel: std?.label ?? 'Variable',
        })
      }
    }
    return list
  }, [])

  const unmappedCount = useMemo(() => allObjs.filter((o) => o.standard === null).length, [allObjs])

  const filteredObjs = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allObjs.filter((o) => {
      if (methodFilter !== 'all') {
        if (methodFilter === 'unknown' && o.standard !== null) return false
        if (methodFilter !== 'unknown' && o.standard !== methodFilter) return false
      }
      if (familyFilter !== 'All' && o.family !== familyFilter) return false
      if (q) {
        return (
          o.controlId.toLowerCase().includes(q) ||
          o.controlTitle.toLowerCase().includes(q) ||
          o.family.toLowerCase().includes(q) ||
          o.objText.toLowerCase().includes(q) ||
          o.objId.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [allObjs, search, familyFilter, methodFilter])

  const methodCounts = useMemo(() => {
    const m = {}
    for (const o of allObjs) {
      if (o.standard === null) { m.unknown = (m.unknown ?? 0) + 1; continue }
      m[o.standard] = (m[o.standard] ?? 0) + 1
    }
    return m
  }, [allObjs])

  const toggleCheck = (key) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const enterBuilder = () => {
    setEditingGroup(null)
    setMode('builder')
    setCheckedKeys(new Set())
  }

  const handleEditRequest = (group) => {
    setEditingGroup(group)
    setMode('builder')
    setCheckedKeys(new Set())
  }

  const cancelBuilder = () => {
    setMode('browse')
    setEditingGroup(null)
    setCheckedKeys(new Set())
  }

  const handleSaveGroup = (group) => {
    let next
    if (editingGroup) {
      // Update existing group
      next = updateReviewGroup(group.id, {
        name: group.name,
        plannedAsk: group.plannedAsk,
        objectives: group.objectives,
      })
    } else {
      // Create new group
      next = createReviewGroup(group)
    }
    setSavedGroups(next)
    setMode('browse')
    setEditingGroup(null)
    setCheckedKeys(new Set())
  }

  const handleDeleteGroup = (id) => {
    const next = deleteReviewGroup(id)
    setSavedGroups(next)
  }

  // Sync if another tab/page changes localStorage (e.g. Control Detail adds objective)
  const refreshGroups = () => setSavedGroups(getReviewGroups())

  return (
    <div className="dibcac-page">

      {previewKey && (
        <ObjectivePreview previewKey={previewKey} onClose={() => setPreviewKey(null)} />
      )}

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="dibcac-page-header">
        <h1>DIBCAC Mode</h1>
        <p className="dibcac-page-subtitle">
          Plan objective review sequences by DIBCAC assessment method.
          Use this workspace to group objectives efficiently before a live assessment session.
          Final assessment decisions remain the responsibility of the assessor.
        </p>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="dibcac-toolbar">
        <div className="dibcac-toolbar-row">
          <input
            ref={searchRef}
            type="search"
            className="dibcac-search"
            placeholder="Search controls, objectives, families…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search objectives"
          />
          <select
            className="dibcac-family-select"
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
            aria-label="Filter by family"
          >
            <option value="All">All Families</option>
            {ALL_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="dibcac-method-filters" role="group" aria-label="Filter by assessment method">
          <button
            type="button"
            className={`dibcac-method-filter-btn${methodFilter === 'all' ? ' dibcac-method-filter-btn--active' : ''}`}
            onClick={() => setMethodFilter('all')}
          >All</button>
          {DIBCAC_STANDARDS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`dibcac-method-filter-btn${methodFilter === s.value ? ' dibcac-method-filter-btn--active' : ''}`}
              onClick={() => setMethodFilter(s.value)}
            >
              {s.label}
              <span className="dibcac-method-filter-count">{methodCounts[s.value] ?? 0}</span>
            </button>
          ))}
          {unmappedCount > 0 && (
            <button
              type="button"
              className={`dibcac-method-filter-btn dibcac-method-filter-btn--muted${methodFilter === 'unknown' ? ' dibcac-method-filter-btn--active' : ''}`}
              onClick={() => setMethodFilter('unknown')}
              title="Objectives not yet covered by DIBCAC standard metadata"
            >
              Variable
              <span className="dibcac-method-filter-count">{unmappedCount}</span>
            </button>
          )}
        </div>

        {unmappedCount > 0 && methodFilter === 'all' && (
          <p className="dibcac-unmapped-note">
            {unmappedCount} objective{unmappedCount !== 1 ? 's have' : ' has'} a Variable assessment standard — no single method is fixed.{' '}
            <button type="button" className="dibcac-unmapped-link" onClick={() => setMethodFilter('unknown')}>View variable</button>
          </p>
        )}
      </div>

      {/* ── Builder mode hint ─────────────────────────────────────────────── */}
      {mode === 'builder' && (
        <div className="dibcac-builder-hint">
          Check objectives on the left, then click <strong>Add selected objectives</strong> in the builder panel.
        </div>
      )}

      {/* ── Main workspace (always split) ─────────────────────────────────── */}
      <div className="dibcac-workspace dibcac-workspace--split">
        {/* Left: objective browser */}
        <div className="dibcac-browser-pane">
          <GroupedBrowser
            flatObjs={filteredObjs}
            builderMode={mode === 'builder'}
            checkedKeys={checkedKeys}
            onCheck={toggleCheck}
            onPreview={setPreviewKey}
          />
        </div>

        {/* Right rail */}
        <div className="dibcac-right-rail">
          {mode === 'builder' ? (
            <>
              <BuilderPanel
                checkedKeys={checkedKeys}
                flatObjs={allObjs}
                onSave={handleSaveGroup}
                onCancel={cancelBuilder}
                editingGroup={editingGroup}
              />
              {savedGroups.length > 0 && (
                <div className="dibcac-rail-saved-below">
                  <p className="dibcac-rail-saved-below-label">
                    Saved Groups <span className="dibcac-saved-count">{savedGroups.length}</span>
                  </p>
                  <div className="dibcac-saved-list">
                    {savedGroups.map((group) => (
                      <SavedGroupCard
                        key={group.id}
                        group={group}
                        onDelete={handleDeleteGroup}
                        onEditRequest={handleEditRequest}
                        onPreview={setPreviewKey}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <SavedGroupsPanel
              savedGroups={savedGroups}
              onDelete={handleDeleteGroup}
              onEditRequest={handleEditRequest}
              onPreview={setPreviewKey}
              onEnterBuilder={enterBuilder}
              onRefresh={refreshGroups}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default DibcacMode
