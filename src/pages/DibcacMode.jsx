import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FolderPlus, Folder } from 'lucide-react'
import DashSidebar from '../components/DashSidebar.jsx'
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
  saveReviewGroups,
  getReviewFolders,
  createReviewFolder,
  deleteReviewFolder,
  assignGroupToFolder,
} from '../utils/reviewGroups'
import { readObjectiveFinding, writeObjectiveFinding } from '../utils/objectiveFindings'
import { readObjectiveInterviewedRoles } from '../utils/objectiveInterviewedRoles'
import { getObjectiveWarnings } from '../utils/objectiveWarnings'
import FixInterviewDetailsModal from '../components/FixInterviewDetailsModal'
import ApplySameInterviewerModal from '../components/ApplySameInterviewerModal'
import { buildFinalText } from '../utils/findingStatementBuilder'

const METHOD_ORDER = [
  'document',
  'screen_share',
  'artifact',
  'physical_review',
  'artifact_and_screen_share',
]

const METHOD_META = {
  document:                  { label: 'Document',               className: 'dibcac-chip--document',                  dot: '#A78BFA' },
  screen_share:              { label: 'Screen Share',           className: 'dibcac-chip--screen_share',              dot: '#22D3EE' },
  artifact:                  { label: 'Artifact',               className: 'dibcac-chip--artifact',                  dot: '#3FC98A' },
  physical_review:           { label: 'Physical Review',        className: 'dibcac-chip--physical_review',           dot: '#E3A83B' },
  artifact_and_screen_share: { label: 'Artifact + Screen Share', className: 'dibcac-chip--artifact_and_screen_share', dot: '#EC4899' },
  unknown:                   { label: 'Variable',               className: 'dibcac-chip--unknown',                   dot: '#8A8A93' },
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
              <span className="dibcac-method-dot" style={{ background: meta.dot }} />
              <span className="dibcac-method-label">{meta.label}</span>
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

// ── Objective attach picker (checklist items) ─────────────────────────────────
// Search-and-attach control for checklist items — matches any objective in
// the whole catalog (e.g. typing "3.5.3" finds IA.L2-3.5.3 objectives), not
// just objectives already in this review group.

function ObjectiveAttachPicker({ attachedKeys, onAdd, onRemove, flatObjs, hideMet }) {
  const [query, setQuery] = useState('')

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const attached = new Set(attachedKeys)
    return flatObjs
      .filter((o) => !attached.has(o.key))
      .filter((o) => !hideMet || readObjectiveStatus(o.controlId, o.objId) !== OBJECTIVE_STATUS_MET)
      .filter((o) =>
        o.controlId.toLowerCase().includes(q) ||
        o.objId.toLowerCase().includes(q) ||
        o.objText.toLowerCase().includes(q) ||
        (o.controlTitle ?? '').toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [query, flatObjs, attachedKeys, hideMet])

  const visibleAttachedKeys = useMemo(() => {
    if (!hideMet) return attachedKeys
    return attachedKeys.filter((key) => {
      const o = flatObjs.find((x) => x.key === key)
      return !o || readObjectiveStatus(o.controlId, o.objId) !== OBJECTIVE_STATUS_MET
    })
  }, [attachedKeys, flatObjs, hideMet])

  return (
    <div className="dibcac-checklist-attach">
      {visibleAttachedKeys.length > 0 && (
        <div className="dibcac-checklist-attach-chips">
          {visibleAttachedKeys.map((key) => {
            const o = flatObjs.find((x) => x.key === key)
            return (
              <span key={key} className="dibcac-checklist-attach-chip">
                <span className="mono">{o ? `${o.controlId}[${o.objId}]` : key}</span>
                <button
                  type="button"
                  className="dibcac-checklist-attach-chip-remove"
                  onClick={() => onRemove(key)}
                  aria-label={`Detach ${key}`}
                >×</button>
              </span>
            )
          })}
        </div>
      )}
      <div className="provider-picker-wrapper">
        <input
          type="text"
          className="dibcac-builder-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search controls or objectives (e.g. 3.5.3)…"
        />
        {suggestions.length > 0 && (
          <ul className="provider-picker-results">
            {suggestions.map((o) => (
              <li
                key={o.key}
                className="provider-picker-result"
                onMouseDown={(e) => { e.preventDefault(); onAdd(o.key); setQuery('') }}
              >
                <span className="mono">{o.controlId}[{o.objId}]</span> — {o.objText}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function BuilderPanel({ checkedKeys, flatObjs, onSave, onCancel, editingGroup }) {
  const isEditing = !!editingGroup

  const [groupName, setGroupName] = useState(() => editingGroup?.name ?? '')
  const [plannedAsk, setPlannedAsk] = useState(() => editingGroup?.plannedAsk ?? '')
  const [selectedObjs, setSelectedObjs] = useState(() =>
    editingGroup ? [...editingGroup.objectives] : []
  )
  const [checklist, setChecklist] = useState(() => editingGroup?.checklist ?? [])
  const [addingChecklistItem, setAddingChecklistItem] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const [newItemObjKeys, setNewItemObjKeys] = useState(() => new Set())
  const [addingChecklistHeader, setAddingChecklistHeader] = useState(false)
  const [newHeaderText, setNewHeaderText] = useState('')
  const [hideMetInChecklist, setHideMetInChecklist] = useState(false)

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

  const metCount = selectedObjs.filter((o) =>
    readObjectiveStatus(o.controlId, o.objId ?? o.objectiveKey) === OBJECTIVE_STATUS_MET
  ).length

  const removeAllMet = () => {
    setSelectedObjs((prev) => prev.filter((o) =>
      readObjectiveStatus(o.controlId, o.objId ?? o.objectiveKey) !== OBJECTIVE_STATUS_MET
    ))
  }

  const toggleNewItemObj = (key) => {
    setNewItemObjKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const resetNewChecklistItem = () => {
    setNewItemText('')
    setNewItemObjKeys(new Set())
  }

  const cancelAddChecklistItem = () => {
    setAddingChecklistItem(false)
    resetNewChecklistItem()
  }

  const addChecklistItem = () => {
    if (!newItemText.trim()) return
    setChecklist((prev) => [...prev, {
      id: crypto.randomUUID(),
      type: 'item',
      text: newItemText.trim(),
      objKeys: [...newItemObjKeys],
      checked: false,
    }])
    resetNewChecklistItem()
  }

  const cancelAddChecklistHeader = () => {
    setAddingChecklistHeader(false)
    setNewHeaderText('')
  }

  const addChecklistHeader = () => {
    if (!newHeaderText.trim()) return
    setChecklist((prev) => [...prev, {
      id: crypto.randomUUID(),
      type: 'header',
      text: newHeaderText.trim(),
    }])
    setNewHeaderText('')
  }

  const removeChecklistItem = (id) => setChecklist((prev) => prev.filter((i) => i.id !== id))

  const updateChecklistItemText = (id, text) =>
    setChecklist((prev) => prev.map((i) => i.id === id ? { ...i, text } : i))

  const toggleChecklistItemObj = (id, key) =>
    setChecklist((prev) => prev.map((i) => {
      if (i.id !== id) return i
      const has = (i.objKeys ?? []).includes(key)
      return { ...i, objKeys: has ? i.objKeys.filter((k) => k !== key) : [...(i.objKeys ?? []), key] }
    }))

  // Reordering: dropping a row onto another moves it to right before that
  // row's current position. Since headers and items share one flat list,
  // dropping an item just after a different header is how it moves into
  // that header's section — no separate "section" concept to keep in sync.
  const [draggedChecklistId, setDraggedChecklistId] = useState(null)
  const [dragOverChecklistId, setDragOverChecklistId] = useState(null)

  const reorderChecklist = (draggedId, targetId) => {
    if (!draggedId || draggedId === targetId) return
    setChecklist((prev) => {
      const dragIndex = prev.findIndex((i) => i.id === draggedId)
      if (dragIndex === -1) return prev
      const moved = prev[dragIndex]
      const without = prev.filter((i) => i.id !== draggedId)
      const targetIndex = targetId ? without.findIndex((i) => i.id === targetId) : without.length
      if (targetIndex === -1) return prev
      const next = [...without]
      next.splice(targetIndex, 0, moved)
      return next
    })
  }

  const handleSave = () => {
    if (!groupName.trim() || selectedObjs.length === 0) return
    const normObjs = selectedObjs.map((o) => ({
      key: o.key ?? o.objectiveRef,
      controlId: o.controlId,
      objId: o.objId ?? o.objectiveKey,
      objText: o.objText ?? o.objectiveText,
      standard: o.standard ?? 'unknown',
    }))
    // Checklist items can attach any objective in the catalog, not just ones
    // in this group, so checklist is saved as-is (no pruning against normObjs).
    if (isEditing) {
      onSave({
        ...editingGroup,
        name: groupName.trim(),
        plannedAsk: plannedAsk.trim(),
        objectives: normObjs,
        checklist,
      })
    } else {
      onSave({
        id: crypto.randomUUID(),
        name: groupName.trim(),
        plannedAsk: plannedAsk.trim(),
        objectives: normObjs,
        checklist,
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
            {metCount > 0 && (
              <button
                type="button"
                className="dibcac-remove-met-btn"
                onClick={removeAllMet}
                title="Remove every objective already marked MET from this group"
              >
                Remove all MET ({metCount})
              </button>
            )}
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
                    <div className="dibcac-builder-obj-main">
                      <div className="dibcac-builder-obj-info">
                        <span className="mono dibcac-builder-obj-id">{o.controlId}[{objId}]</span>
                        <span className="dibcac-builder-obj-text">{text}</span>
                      </div>
                      <div className="dibcac-builder-obj-chips">
                        <MethodChip standard={std} />
                        <ObjStatusChip controlId={o.controlId} objId={objId} />
                      </div>
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

        <div className="dibcac-builder-field">
          <div className="dibcac-builder-label">
            Checklist
            <button
              type="button"
              className="control-utility-toggle dibcac-checklist-hide-met-toggle"
              onClick={() => setHideMetInChecklist((v) => !v)}
              aria-pressed={hideMetInChecklist}
            >
              <span className="cl2-toggle-track" style={{ background: hideMetInChecklist ? 'var(--dash-accent)' : '#1C1C20' }}>
                <span className="cl2-toggle-thumb" style={{ transform: hideMetInChecklist ? 'translateX(14px)' : 'translateX(0)' }} />
              </span>
              Hide MET objectives
            </button>
            {!addingChecklistHeader && (
              <button
                type="button"
                className="dibcac-sort-btn"
                onClick={() => { setAddingChecklistHeader(true); cancelAddChecklistItem() }}
              >
                + Add section header
              </button>
            )}
            {!addingChecklistItem && (
              <button
                type="button"
                className="dibcac-sort-btn"
                onClick={() => { setAddingChecklistItem(true); cancelAddChecklistHeader() }}
              >
                + Create new list item
              </button>
            )}
          </div>

          {checklist.length === 0 && !addingChecklistItem && !addingChecklistHeader && (
            <p className="dibcac-builder-empty-hint">No checklist items yet.</p>
          )}

          {checklist.length > 0 && (
            <div className="dibcac-checklist-list">
              {checklist.map((item) => {
                const dragProps = {
                  draggable: true,
                  onDragStart: (e) => { setDraggedChecklistId(item.id); e.dataTransfer.effectAllowed = 'move' },
                  onDragEnd: () => { setDraggedChecklistId(null); setDragOverChecklistId(null) },
                  onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverChecklistId(item.id) },
                  onDragLeave: () => setDragOverChecklistId((prev) => prev === item.id ? null : prev),
                  onDrop: (e) => { e.preventDefault(); reorderChecklist(draggedChecklistId, item.id); setDragOverChecklistId(null) },
                }
                const dragState =
                  `${draggedChecklistId === item.id ? ' dibcac-checklist-dragging' : ''}` +
                  `${dragOverChecklistId === item.id && draggedChecklistId !== item.id ? ' dibcac-checklist-drag-over' : ''}`
                return item.type === 'header' ? (
                  <div key={item.id} className={`dibcac-checklist-header-edit-row${dragState}`} {...dragProps}>
                    <span className="dibcac-checklist-drag-handle" aria-hidden="true" title="Drag to reorder">⠿</span>
                    <input
                      type="text"
                      className="dibcac-builder-input dibcac-checklist-header-input"
                      value={item.text}
                      onChange={(e) => updateChecklistItemText(item.id, e.target.value)}
                    />
                    <button
                      type="button"
                      className="dibcac-builder-obj-remove"
                      onClick={() => removeChecklistItem(item.id)}
                      aria-label={`Remove section header "${item.text}"`}
                    >×</button>
                  </div>
                ) : (
                  <div key={item.id} className={`dibcac-checklist-edit-row${dragState}`} {...dragProps}>
                    <div className="dibcac-checklist-row-main">
                      <span className="dibcac-checklist-drag-handle" aria-hidden="true" title="Drag to reorder">⠿</span>
                      <input
                        type="text"
                        className="dibcac-builder-input"
                        value={item.text}
                        onChange={(e) => updateChecklistItemText(item.id, e.target.value)}
                      />
                      <button
                        type="button"
                        className="dibcac-builder-obj-remove"
                        onClick={() => removeChecklistItem(item.id)}
                        aria-label={`Remove checklist item "${item.text}"`}
                      >×</button>
                    </div>
                    <div className="dibcac-checklist-attach-label">Attached objective(s):</div>
                    <ObjectiveAttachPicker
                      attachedKeys={item.objKeys ?? []}
                      onAdd={(key) => toggleChecklistItemObj(item.id, key)}
                      onRemove={(key) => toggleChecklistItemObj(item.id, key)}
                      flatObjs={flatObjs}
                      hideMet={hideMetInChecklist}
                    />
                  </div>
                )
              })}
              {draggedChecklistId && (
                <div
                  className={`dibcac-checklist-drop-end${dragOverChecklistId === '__end__' ? ' dibcac-checklist-drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverChecklistId('__end__') }}
                  onDragLeave={() => setDragOverChecklistId((prev) => prev === '__end__' ? null : prev)}
                  onDrop={(e) => { e.preventDefault(); reorderChecklist(draggedChecklistId, null); setDragOverChecklistId(null) }}
                >
                  Drop here to move to end
                </div>
              )}
            </div>
          )}

          {addingChecklistHeader && (
            <div className="dibcac-checklist-add-form">
              <input
                type="text"
                className="dibcac-builder-input"
                value={newHeaderText}
                onChange={(e) => setNewHeaderText(e.target.value)}
                placeholder="Section header…"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Escape') cancelAddChecklistHeader() }}
              />
              <div className="dibcac-checklist-add-actions">
                <button type="button" className="dibcac-builder-save" onClick={addChecklistHeader} disabled={!newHeaderText.trim()}>Add</button>
                <button type="button" className="dibcac-builder-cancel" onClick={cancelAddChecklistHeader}>Cancel</button>
                <button
                  type="button"
                  className="dibcac-checklist-add-switch"
                  onClick={() => { cancelAddChecklistHeader(); setAddingChecklistItem(true) }}
                >+ Add checklist item instead</button>
              </div>
            </div>
          )}

          {addingChecklistItem && (
            <div className="dibcac-checklist-add-form">
              <input
                type="text"
                className="dibcac-builder-input"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="Checklist item…"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Escape') cancelAddChecklistItem() }}
              />
              <div className="dibcac-checklist-attach-label">Attach objective(s):</div>
              <ObjectiveAttachPicker
                attachedKeys={[...newItemObjKeys]}
                onAdd={(key) => toggleNewItemObj(key)}
                onRemove={(key) => toggleNewItemObj(key)}
                flatObjs={flatObjs}
                hideMet={hideMetInChecklist}
              />
              <div className="dibcac-checklist-add-actions">
                <button type="button" className="dibcac-builder-save" onClick={addChecklistItem} disabled={!newItemText.trim()}>Add</button>
                <button type="button" className="dibcac-builder-cancel" onClick={cancelAddChecklistItem}>Cancel</button>
                <button
                  type="button"
                  className="dibcac-checklist-add-switch"
                  onClick={() => { cancelAddChecklistItem(); setAddingChecklistHeader(true) }}
                >+ Add section header instead</button>
              </div>
            </div>
          )}
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

// ── Bulk group findings helpers ───────────────────────────────────────────────

function GroupFindingsModal({ group, onClose }) {
  const [overwrite, setOverwrite] = useState(false)
  const [done, setDone] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [fixTarget, setFixTarget] = useState(null) // { controlId, objId, key, text }
  const [showApplyInterviewerModal, setShowApplyInterviewerModal] = useState(false)

  const rows = useMemo(() => group.objectives.map((o) => {
    const objId     = o.objId ?? o.objectiveKey
    const key       = o.key  ?? o.objectiveRef
    const status    = readObjectiveStatus(o.controlId, objId)
    const existing  = readObjectiveFinding(o.controlId, objId)
    const artifacts = readObjectiveArtifacts(o.controlId, objId)
    const roles     = readObjectiveInterviewedRoles(o.controlId, objId)
    const isMet         = status === OBJECTIVE_STATUS_MET
    const hasExisting   = existing !== null
    const warnings = getObjectiveWarnings(o.controlId, objId)
    return { o, objId, key, status, hasExisting, artifacts, roles, isMet, warnings, objText: o.objText ?? o.objectiveText, standard: o.standard }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [group.objectives, refreshKey])

  const eligibleRows = useMemo(
    () => rows.filter((r) => r.isMet && (!r.hasExisting || overwrite)),
    [rows, overwrite]
  )

  const handleGenerate = () => {
    for (const row of eligibleRows) {
      writeObjectiveFinding(row.o.controlId, row.objId, {
        includedArtifacts: row.artifacts,
        hasDifferences: false,
        differencesText: '',
        finalText: buildFinalText({
          roles: row.roles,
          includedArtifacts: row.artifacts,
          objectiveRef: row.key,
          objectiveText: row.objText,
          dibcacMethod: row.standard,
          hasDifferences: false,
          differencesText: '',
        }),
        updatedAt: new Date().toISOString(),
      })
    }
    setDone(eligibleRows.length)
  }

  const handleFixSave = () => {
    setFixTarget(null)
    setRefreshKey((k) => k + 1)
  }

  const handleApplyInterviewerApplied = () => {
    setShowApplyInterviewerModal(false)
    setRefreshKey((k) => k + 1)
  }

  const scopeObjectives = useMemo(
    () => rows.map((r) => ({
      controlId: r.o.controlId,
      objId: r.objId,
      objText: r.objText,
      status: r.status,
      key: r.key,
      eligible: r.isMet,
    })),
    [rows]
  )

  // When a fix target is active, replace this modal entirely with FixInterviewDetailsModal.
  // This prevents two overlays from stacking on screen at the same time.
  if (fixTarget) {
    return (
      <FixInterviewDetailsModal
        controlId={fixTarget.controlId}
        objId={fixTarget.objId}
        objKey={fixTarget.key}
        objText={fixTarget.text}
        scopeObjectives={scopeObjectives}
        onSave={handleFixSave}
        onClose={() => setFixTarget(null)}
      />
    )
  }

  // While Apply Same Interviewer is active, it is the only rendered modal
  // step — the Group Findings surface is not kept mounted underneath it.
  if (showApplyInterviewerModal) {
    return (
      <ApplySameInterviewerModal
        scopeObjectives={scopeObjectives}
        onClose={() => setShowApplyInterviewerModal(false)}
        onApplied={handleApplyInterviewerApplied}
      />
    )
  }

  return (
    <div
      className="dibcac-comments-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Create Group Findings"
    >
      <div className="dibcac-group-findings-panel">
        <div className="dibcac-comments-header">
          <span className="dibcac-comments-title">Create Group Findings</span>
          <span className="dibcac-comments-id">{group.name}</span>
          <button type="button" className="dibcac-preview-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {done !== null ? (
          <>
            <div className="dibcac-group-findings-body">
              <p className="dibcac-group-findings-done">
                {done} finding{done !== 1 ? 's' : ''} generated. Open each objective in Control Detail to review or refine.
              </p>
            </div>
            <div className="dibcac-comments-footer">
              <button type="button" className="dibcac-builder-save" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <>
            <div className="dibcac-group-findings-body">
              <div className="bulk-findings-filters-row">
                <label className="dibcac-group-findings-overwrite">
                  <input
                    type="checkbox"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                  />
                  Overwrite existing findings
                </label>
                <button
                  type="button"
                  className="dibcac-action-btn bulk-findings-apply-interviewer-btn"
                  onClick={() => setShowApplyInterviewerModal(true)}
                >
                  Apply Same Interviewer
                </button>
              </div>
              <div className="dibcac-group-findings-list">
                {rows.map((row) => {
                  const eligible = row.isMet && (!row.hasExisting || overwrite)
                  let skipReason = null
                  if (!row.isMet) {
                    skipReason = row.status === OBJECTIVE_STATUS_NOT_MET ? 'NOT MET — skipped' : 'not MET — skipped'
                  } else if (row.hasExisting && !overwrite) {
                    skipReason = 'existing finding preserved'
                  }
                  return (
                    <div key={row.key} className={`dibcac-group-findings-row${eligible ? '' : ' dibcac-group-findings-row--skip'}`}>
                      <div className="dibcac-group-findings-row-header">
                        <span className="mono dibcac-group-findings-ref">{row.key}</span>
                        {skipReason
                          ? <span className="dibcac-group-findings-skip">{skipReason}</span>
                          : <span className="dibcac-group-findings-generate">will generate</span>
                        }
                      </div>
                      {eligible && row.warnings.length > 0 && (
                        <div className="dibcac-group-findings-warnings">
                          {row.warnings.map((w) => (
                            <span key={w.key} className="dibcac-group-findings-warning">
                              ⚠ {w.text}
                              {w.fixable && (
                                <button
                                  type="button"
                                  className="dibcac-fix-btn"
                                  onClick={() => setFixTarget({ controlId: row.o.controlId, objId: row.objId, key: row.key, text: row.objText })}
                                >Fix</button>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="dibcac-comments-footer">
              <button
                type="button"
                className="dibcac-builder-save"
                onClick={handleGenerate}
                disabled={eligibleRows.length === 0}
              >
                Generate {eligibleRows.length > 0 ? `${eligibleRows.length} finding${eligibleRows.length !== 1 ? 's' : ''}` : '0 findings'}
              </button>
              <button type="button" className="dibcac-builder-cancel" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Saved group card ──────────────────────────────────────────────────────────

function SavedGroupCard({
  group, savedFolders, allGroups, onDelete, onEditRequest, onPreview, onMoveToFolder,
  onMoveObjectives, onUpdateChecklist, selectionMode, isSelected, onToggleSelect, isExpanded, onToggleExpanded,
}) {
  const expanded = isExpanded ?? false
  const [commentsKey, setCommentsKey] = useState(null) // `${controlId}[${objId}]`
  const [showFindingsModal, setShowFindingsModal] = useState(false)
  const [, forceUpdate] = useState(0)
  const [objSelectMode, setObjSelectMode] = useState(false)
  const [selectedObjKeys, setSelectedObjKeys] = useState(() => new Set())
  const [objView, setObjView] = useState(() => localStorage.getItem('cmmc-dibcac-group-obj-view') === 'cards' ? 'cards' : 'list')

  const setObjViewPersisted = (view) => {
    setObjView(view)
    try { localStorage.setItem('cmmc-dibcac-group-obj-view', view) } catch { /* ignore */ }
  }

  const checklist = group.checklist ?? []

  // Checklist items may attach objectives outside this group's own objective
  // list (any control in the catalog), so keys are parsed directly rather
  // than looked up in group.objectives — the key format is always
  // "${controlId}[${objId}]", which is already the display label too.
  const parseObjKey = (key) => {
    const m = key.match(/^(.+)\[([^[\]]+)\]$/)
    return m ? { controlId: m[1], objId: m[2] } : null
  }
  const objLabelFor = (key) => key

  // For items with attached objectives, "checked" is derived live from
  // objective status rather than the stored flag — this is what makes an
  // item auto-strike when its objective(s) get marked MET from elsewhere
  // (another checklist item, another group, the objectives list, etc.),
  // and un-strike if any of them stop being MET. An item tied to multiple
  // objectives only shows complete once every one of them is MET, so a
  // partial match (one objective MET via a different item, the rest not)
  // never renders as a false "done". Items with no attached objectives have
  // nothing to derive from, so they keep their own manually-toggled flag.
  const isItemMet = (item) => {
    const keys = item.objKeys ?? []
    if (keys.length === 0) return !!item.checked
    return keys.every((key) => {
      const parsed = parseObjKey(key)
      return !!parsed && readObjectiveStatus(parsed.controlId, parsed.objId) === OBJECTIVE_STATUS_MET
    })
  }

  // Wording and attached objectives are only editable via Edit Review Group
  // (same as Planned Ask) — outside of edit, checking an item on/off is the
  // only interaction available here.
  // Checking an item marks every attached objective MET; unchecking reverts
  // them to Unreviewed. This is the whole point of the checklist — ticking
  // it off is how an objective gets marked done during a live session.
  const toggleChecklistItem = (item) => {
    const willBeChecked = !isItemMet(item)
    const next = checklist.map((i) => i.id === item.id ? { ...i, checked: willBeChecked } : i)
    onUpdateChecklist?.(group.id, next)
    for (const key of item.objKeys ?? []) {
      const parsed = parseObjKey(key)
      if (!parsed) continue
      writeObjectiveStatus(parsed.controlId, parsed.objId, willBeChecked ? OBJECTIVE_STATUS_MET : OBJECTIVE_STATUS_UNREVIEWED)
    }
    forceUpdate((n) => n + 1)
  }

  const otherGroups = useMemo(
    () => (allGroups ?? []).filter((g) => g.id !== group.id),
    [allGroups, group.id]
  )

  const toggleObjSelectMode = () => {
    setObjSelectMode((v) => !v)
    setSelectedObjKeys(new Set())
  }

  const toggleObjSelected = (key) => {
    setSelectedObjKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleMoveSelected = (targetGroupId) => {
    if (!targetGroupId || selectedObjKeys.size === 0) return
    onMoveObjectives?.(group.id, targetGroupId, [...selectedObjKeys])
    setObjSelectMode(false)
    setSelectedObjKeys(new Set())
  }

  const familySummary = useMemo(() => {
    const codes = new Set(group.objectives.map((o) => o.controlId.split('.')[0]))
    return [...codes].sort().join(' · ')
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
    <div className={`dibcac-group-card${isSelected ? ' dibcac-group-card--selected' : ''}`}>
      {commentsKey && commentsObjId && (
        <OverallCommentsPopover
          controlId={commentsControlId}
          objId={commentsObjId}
          onClose={() => { setCommentsKey(null); forceUpdate((n) => n + 1) }}
        />
      )}
      {showFindingsModal && (
        <GroupFindingsModal
          group={group}
          onClose={() => setShowFindingsModal(false)}
        />
      )}

      <div className="dibcac-group-card-header">
        {selectionMode && (
          <input
            type="checkbox"
            className="dibcac-group-select-checkbox"
            checked={!!isSelected}
            onChange={() => onToggleSelect?.(group.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${group.name}`}
          />
        )}
        <button
          type="button"
          className="dibcac-group-card-toggle"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
        >
          <span className="dibcac-collapse-icon dibcac-group-card-chevron">{expanded ? '▼' : '▶'}</span>
          <div className="dibcac-group-card-info">
            <span className="dibcac-group-card-name">{group.name}</span>
            <span className="dibcac-group-card-meta">
              {group.objectives.length} objective{group.objectives.length !== 1 ? 's' : ''}
              {familySummary ? ` · ${familySummary}` : ''}
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
            className="dibcac-action-btn"
            onClick={() => setShowFindingsModal(true)}
            title="Generate findings for MET objectives in this group"
          >Findings</button>
          <button
            type="button"
            className="dibcac-action-btn dibcac-action-btn--delete"
            onClick={() => onDelete(group.id)}
          >Delete</button>
          {savedFolders && savedFolders.length > 0 && onMoveToFolder && (
            <select
              className="dibcac-folder-select"
              value={group.folderId ?? ''}
              onChange={(e) => onMoveToFolder(group.id, e.target.value || null)}
              onClick={(e) => e.stopPropagation()}
              title="Move to folder"
              aria-label="Move to folder"
            >
              <option value="">No folder</option>
              {savedFolders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
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

          {checklist.length > 0 && (
            <div className="dibcac-checklist">
              <div className="dibcac-group-card-objs-header">
                <span className="dibcac-preview-section-label">Checklist</span>
              </div>
              <div className="dibcac-checklist-list">
                {checklist.map((item) => item.type === 'header' ? (
                  <div key={item.id} className="dibcac-checklist-header-row">
                    {item.text}
                  </div>
                ) : (
                  <div key={item.id} className="dibcac-checklist-row">
                    <div className="dibcac-checklist-row-main">
                      <input
                        type="checkbox"
                        className="dibcac-obj-checkbox dibcac-checklist-checkbox"
                        checked={isItemMet(item)}
                        onChange={() => toggleChecklistItem(item)}
                        aria-label={`Mark "${item.text}" complete`}
                      />
                      <span className={`dibcac-checklist-text${isItemMet(item) ? ' dibcac-checklist-text--done' : ''}`}>
                        {item.text}
                      </span>
                    </div>
                    {(item.objKeys ?? []).length > 0 && (
                      <ul className="dibcac-checklist-obj-list">
                        {item.objKeys.map((key) => (
                          <li key={key} className="dibcac-checklist-obj-item mono">{objLabelFor(key)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dibcac-group-card-objs">
            <div className="dibcac-group-card-objs-header">
              <span className="dibcac-preview-section-label">Objectives</span>
              <div className="dibcac-group-card-objs-header-actions">
                <div className="dibcac-obj-view-toggle">
                  <button
                    type="button"
                    className={`dibcac-obj-view-btn${objView === 'list' ? ' dibcac-obj-view-btn--active' : ''}`}
                    onClick={() => setObjViewPersisted('list')}
                  >List</button>
                  <button
                    type="button"
                    className={`dibcac-obj-view-btn${objView === 'cards' ? ' dibcac-obj-view-btn--active' : ''}`}
                    onClick={() => setObjViewPersisted('cards')}
                  >Cards</button>
                </div>
                {otherGroups.length > 0 && (
                  objSelectMode ? (
                    <button type="button" className="dibcac-sort-btn" onClick={toggleObjSelectMode}>Cancel</button>
                  ) : (
                    <button type="button" className="dibcac-sort-btn" onClick={toggleObjSelectMode}>Select</button>
                  )
                )}
              </div>
            </div>
            {objSelectMode && (
              <div className="dibcac-obj-move-bar">
                <span className="dibcac-selection-count">
                  {selectedObjKeys.size} selected
                </span>
                <select
                  className="dibcac-folder-select"
                  value=""
                  disabled={selectedObjKeys.size === 0}
                  onChange={(e) => handleMoveSelected(e.target.value)}
                  aria-label="Move selected objectives to group"
                >
                  <option value="">Move to group…</option>
                  {otherGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className={objView === 'cards' ? 'dibcac-group-card-objs-grid' : undefined}>
              {group.objectives.map((o) => {
                const key = o.key ?? o.objectiveRef
                const objId = o.objId ?? o.objectiveKey
                const status = readObjectiveStatus(o.controlId, objId)
                const result = readObjectiveResult(o.controlId, objId)
                const hasComments = !!result.overallComments
                const commentPreview = result.overallComments?.trim() ?? ''
                const handleObjRowClick = objSelectMode
                  ? (e) => {
                      if (e.target.closest('.dibcac-group-card-obj-actions') || e.target.closest('.dibcac-obj-ref-btn')) return
                      toggleObjSelected(key)
                    }
                  : undefined
                return (
                  <div
                    key={key}
                    className={`${objView === 'cards' ? 'dibcac-group-card-obj-card' : 'dibcac-group-card-obj-row'}${objSelectMode ? ' dibcac-group-card-obj-row--selectable' : ''}`}
                    onClick={handleObjRowClick}
                  >
                    <div className="dibcac-group-card-obj-main-row">
                      <div className="dibcac-group-card-obj-left">
                        {objSelectMode && (
                          <input
                            type="checkbox"
                            className="dibcac-group-select-checkbox"
                            checked={selectedObjKeys.has(key)}
                            onChange={() => toggleObjSelected(key)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select ${o.controlId}[${objId}]`}
                          />
                        )}
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
                    {commentPreview && (
                      <p className="dibcac-group-card-obj-comment">{commentPreview}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function parseGroupSortKey(name) {
  return String(name ?? '').toLowerCase().replace(/(\d+)/g, (n) => n.padStart(10, '0'))
}

// ── Folder section ────────────────────────────────────────────────────────────

function FolderSection({
  folder, groups, savedFolders, allGroups, onDelete, onEditRequest, onPreview,
  onMoveToFolder, onDeleteFolder, onMoveObjectives, onUpdateChecklist, selectionMode, selectedIds, onToggleSelect,
  isOpen, onToggleOpen, expandedGroupIds, onToggleGroupExpanded,
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="dibcac-folder-section">
      <div className="dibcac-folder-header">
        <button type="button" className="dibcac-folder-toggle" onClick={onToggleOpen}>
          <span className="dibcac-collapse-icon">{isOpen ? '▼' : '▶'}</span>
          <Folder size={13} className="dibcac-folder-icon" />
          <span className="dibcac-folder-name">{folder.name}</span>
          <span className="dibcac-folder-count">{groups.length}</span>
        </button>
        {confirming ? (
          <div className="dibcac-folder-delete-confirm">
            <span>Delete folder?</span>
            <button type="button" className="dibcac-action-btn dibcac-action-btn--delete" onClick={() => { onDeleteFolder(folder.id); setConfirming(false) }}>Yes</button>
            <button type="button" className="dibcac-action-btn" onClick={() => setConfirming(false)}>No</button>
          </div>
        ) : (
          <button type="button" className="dibcac-action-btn dibcac-action-btn--delete" onClick={() => setConfirming(true)}>Delete</button>
        )}
      </div>
      {isOpen && (
        <div className="dibcac-folder-body">
          {groups.length === 0 ? (
            <p className="dibcac-folder-empty">No groups in this folder.</p>
          ) : (
            groups.map((group) => (
              <SavedGroupCard
                key={group.id}
                group={group}
                savedFolders={savedFolders}
                allGroups={allGroups}
                onDelete={onDelete}
                onEditRequest={onEditRequest}
                onPreview={onPreview}
                onMoveToFolder={onMoveToFolder}
                onMoveObjectives={onMoveObjectives}
                onUpdateChecklist={onUpdateChecklist}
                selectionMode={selectionMode}
                isSelected={selectedIds?.has(group.id)}
                onToggleSelect={onToggleSelect}
                isExpanded={expandedGroupIds?.has(group.id)}
                onToggleExpanded={() => onToggleGroupExpanded(group.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Saved groups panel (right rail) ───────────────────────────────────────────

function SavedGroupsPanel({
  savedGroups, savedFolders, onDelete, onEditRequest, onPreview, onEnterBuilder,
  onCreateFolder, onDeleteFolder, onMoveGroupToFolder, onBatchMove, onMoveObjectives, onUpdateChecklist,
  openFolderIds, onToggleFolderOpen, expandedGroupIds, onToggleGroupExpanded,
  railExpanded, onToggleRailExpanded,
}) {
  const [groupSort, setGroupSort] = useState('created') // 'name' | 'created'
  const [sortDir,   setSortDir]   = useState('asc')      // 'asc' | 'desc'
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName,  setNewFolderName]  = useState('')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds,   setSelectedIds]   = useState(() => new Set())
  const [showMoveMenu,  setShowMoveMenu]  = useState(false)

  const handleSortClick = (sortType) => {
    if (sortType === groupSort) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setGroupSort(sortType)
      setSortDir(sortType === 'name' ? 'asc' : 'desc')
    }
  }

  const toggleGroupSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const enterSelectionMode = () => {
    setSelectionMode(true)
    setSelectedIds(new Set())
    setShowMoveMenu(false)
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setShowMoveMenu(false)
  }

  const applyBatchMove = (folderId) => {
    if (selectedIds.size > 0) onBatchMove([...selectedIds], folderId)
    setShowMoveMenu(false)
    exitSelectionMode()
  }

  const sortedGroups = useMemo(() => {
    const copy = [...savedGroups]
    if (groupSort === 'name') {
      copy.sort((a, b) => {
        const cmp = parseGroupSortKey(a.name).localeCompare(parseGroupSortKey(b.name))
        return sortDir === 'asc' ? cmp : -cmp
      })
    } else {
      copy.sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0
        if (!a.createdAt) return sortDir === 'asc' ? 1 : -1
        if (!b.createdAt) return sortDir === 'asc' ? -1 : 1
        const cmp = a.createdAt.localeCompare(b.createdAt)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return copy
  }, [savedGroups, groupSort, sortDir])

  const submitNewFolder = () => {
    if (!newFolderName.trim()) return
    onCreateFolder(newFolderName.trim())
    setNewFolderName('')
    setCreatingFolder(false)
  }

  // Partition groups into folder buckets
  const groupsByFolder = useMemo(() => {
    const map = new Map()
    map.set(null, [])
    for (const f of savedFolders) map.set(f.id, [])
    for (const g of sortedGroups) {
      const fid = g.folderId ?? null
      if (map.has(fid)) map.get(fid).push(g)
      else map.get(null).push(g) // folder deleted — treat as ungrouped
    }
    return map
  }, [savedFolders, sortedGroups])

  const hasFolders = savedFolders.length > 0
  const ungrouped  = groupsByFolder.get(null) ?? []

  const sortDirArrow = (type) => groupSort === type ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div className="dibcac-rail-panel">
      <div className="dibcac-rail-header">
        <div className="dibcac-rail-title-group">
          {onToggleRailExpanded && (
            <button
              type="button"
              className="dibcac-rail-expand-btn"
              onClick={onToggleRailExpanded}
              aria-pressed={railExpanded}
              title={railExpanded ? 'Collapse — show the objective browser again' : 'Expand — fill the workspace with Review Groups'}
            >
              {railExpanded ? '«' : '»'}
            </button>
          )}
          <h2 className="dibcac-rail-title">
            Review Groups
            {savedGroups.length > 0 && (
              <span className="dibcac-saved-count">{savedGroups.length}</span>
            )}
          </h2>
        </div>
        <div className="dibcac-rail-header-actions">
          <button type="button" className="dibcac-create-btn" onClick={onEnterBuilder}>
            + Create
          </button>
          <button type="button" className="dibcac-create-folder-btn" onClick={() => setCreatingFolder((v) => !v)} title="Create a group folder">
            <FolderPlus size={13} /> Folder
          </button>
        </div>
      </div>

      {creatingFolder && (
        <div className="dibcac-create-folder-form">
          <input
            type="text"
            className="dibcac-builder-input"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitNewFolder()}
            placeholder="Folder name…"
            autoFocus
          />
          <button type="button" className="dibcac-builder-save" onClick={submitNewFolder} disabled={!newFolderName.trim()}>Create</button>
          <button type="button" className="dibcac-builder-cancel" onClick={() => { setCreatingFolder(false); setNewFolderName('') }}>Cancel</button>
        </div>
      )}

      {savedGroups.length === 0 && savedFolders.length === 0 ? (
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
              onClick={() => handleSortClick('name')}
            >Name{sortDirArrow('name')}</button>
            <button
              type="button"
              className={`dibcac-sort-btn${groupSort === 'created' ? ' dibcac-sort-btn--active' : ''}`}
              onClick={() => handleSortClick('created')}
            >Date Created{sortDirArrow('created')}</button>
            <div className="dibcac-sort-spacer" />
            {!selectionMode ? (
              <button type="button" className="dibcac-select-groups-btn" onClick={enterSelectionMode}>
                Select
              </button>
            ) : (
              <button type="button" className="dibcac-sort-btn" onClick={exitSelectionMode}>
                Cancel
              </button>
            )}
          </div>

          {selectionMode && (
            <div className="dibcac-selection-bar">
              <span className="dibcac-selection-count">
                {selectedIds.size} group{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="dibcac-selection-actions">
                <div className="dibcac-move-menu-wrapper">
                  <button
                    type="button"
                    className="dibcac-builder-save dibcac-move-btn"
                    disabled={selectedIds.size === 0}
                    onClick={() => setShowMoveMenu((v) => !v)}
                  >
                    Move to Folder ▾
                  </button>
                  {showMoveMenu && (
                    <div className="dibcac-move-menu">
                      <button type="button" className="dibcac-move-menu-item" onClick={() => applyBatchMove(null)}>
                        No Folder / Ungrouped
                      </button>
                      {savedFolders.length === 0 && (
                        <p className="dibcac-move-menu-hint">Create a folder first to organize selected groups.</p>
                      )}
                      {savedFolders.map((f) => (
                        <button key={f.id} type="button" className="dibcac-move-menu-item" onClick={() => applyBatchMove(f.id)}>
                          <Folder size={12} /> {f.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="dibcac-saved-hint">Saved locally · not included in project exports.</p>

          {hasFolders ? (
            <>
              {savedFolders.map((folder) => (
                <FolderSection
                  key={folder.id}
                  folder={folder}
                  groups={groupsByFolder.get(folder.id) ?? []}
                  savedFolders={savedFolders}
                  allGroups={savedGroups}
                  onDelete={onDelete}
                  onEditRequest={onEditRequest}
                  onPreview={onPreview}
                  onMoveToFolder={onMoveGroupToFolder}
                  onDeleteFolder={onDeleteFolder}
                  onMoveObjectives={onMoveObjectives}
                  onUpdateChecklist={onUpdateChecklist}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleGroupSelect}
                  isOpen={openFolderIds.has(folder.id)}
                  onToggleOpen={() => onToggleFolderOpen(folder.id)}
                  expandedGroupIds={expandedGroupIds}
                  onToggleGroupExpanded={onToggleGroupExpanded}
                />
              ))}
              {ungrouped.length > 0 && (
                <div className="dibcac-folder-section dibcac-folder-section--ungrouped">
                  <div className="dibcac-folder-header dibcac-folder-header--ungrouped">
                    <span className="dibcac-folder-name">Ungrouped</span>
                    <span className="dibcac-folder-count">{ungrouped.length}</span>
                  </div>
                  <div className="dibcac-folder-body">
                    {ungrouped.map((group) => (
                      <SavedGroupCard
                        key={group.id}
                        group={group}
                        savedFolders={savedFolders}
                        allGroups={savedGroups}
                        onDelete={onDelete}
                        onEditRequest={onEditRequest}
                        onPreview={onPreview}
                        onMoveToFolder={onMoveGroupToFolder}
                        onMoveObjectives={onMoveObjectives}
                        onUpdateChecklist={onUpdateChecklist}
                        selectionMode={selectionMode}
                        isSelected={selectedIds.has(group.id)}
                        onToggleSelect={toggleGroupSelect}
                        isExpanded={expandedGroupIds.has(group.id)}
                        onToggleExpanded={() => onToggleGroupExpanded(group.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="dibcac-saved-list">
              {sortedGroups.map((group) => (
                <SavedGroupCard
                  key={group.id}
                  group={group}
                  savedFolders={savedFolders}
                  allGroups={savedGroups}
                  onDelete={onDelete}
                  onEditRequest={onEditRequest}
                  onPreview={onPreview}
                  onMoveToFolder={onMoveGroupToFolder}
                  onMoveObjectives={onMoveObjectives}
                  onUpdateChecklist={onUpdateChecklist}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(group.id)}
                  onToggleSelect={toggleGroupSelect}
                  isExpanded={expandedGroupIds.has(group.id)}
                  onToggleExpanded={() => onToggleGroupExpanded(group.id)}
                />
              ))}
            </div>
          )}
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
  const [hideMet, setHideMet] = useState(() => localStorage.getItem('cmmc-dibcac-hide-met') === 'true')
  const toggleHideMet = () => setHideMet((prev) => {
    const next = !prev
    localStorage.setItem('cmmc-dibcac-hide-met', String(next))
    return next
  })
  const [savedGroups,  setSavedGroups]  = useState(getReviewGroups)
  const [savedFolders, setSavedFolders] = useState(getReviewFolders)
  // Lifted out of FolderSection/SavedGroupCard so open/expanded state survives
  // SavedGroupsPanel unmounting when entering builder mode to edit a group —
  // previously editing a group and saving would collapse every open folder.
  const [openFolderIds, setOpenFolderIds] = useState(() => new Set())
  const [expandedGroupIds, setExpandedGroupIds] = useState(() => new Set())
  const toggleFolderOpen = (id) => setOpenFolderIds((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const toggleGroupExpanded = (id) => setExpandedGroupIds((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const [previewKey, setPreviewKey] = useState(null)
  const [railExpanded, setRailExpanded] = useState(false)
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
      if (hideMet && readObjectiveStatus(o.controlId, o.objId) === OBJECTIVE_STATUS_MET) return false
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
  }, [allObjs, search, familyFilter, methodFilter, hideMet])

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
        checklist: group.checklist,
      })
    } else {
      // Create new group
      next = createReviewGroup(group)
    }
    setSavedGroups(next)
    setMode('browse')
    setEditingGroup(null)
    setCheckedKeys(new Set())
    // Keep the saved group (and its folder, if any) expanded/open on return
    // to the browse view, instead of resetting to fully collapsed.
    const saved = next.find((g) => g.id === group.id)
    setExpandedGroupIds((prev) => new Set(prev).add(group.id))
    if (saved?.folderId) {
      setOpenFolderIds((prev) => new Set(prev).add(saved.folderId))
    }
  }

  const handleDeleteGroup = (id) => {
    const next = deleteReviewGroup(id)
    setSavedGroups(next)
  }

  // Moves the given objective keys out of one saved group and into another.
  // Skips any objective already present in the target group (no duplicates).
  // Operates on the in-memory savedGroups state directly (rather than
  // round-tripping through getReviewGroups()/updateReviewGroup() twice) so
  // the UI reflects the move immediately instead of needing a refresh.
  const handleMoveObjectives = (sourceGroupId, targetGroupId, objKeys) => {
    if (sourceGroupId === targetGroupId || objKeys.length === 0) return
    const source = savedGroups.find((g) => g.id === sourceGroupId)
    const target = savedGroups.find((g) => g.id === targetGroupId)
    if (!source || !target) return
    const keySet = new Set(objKeys)
    const moving = source.objectives.filter((o) => keySet.has(o.key ?? o.objectiveRef))
    const targetKeys = new Set(target.objectives.map((o) => o.key ?? o.objectiveRef))
    const toAdd = moving.filter((o) => !targetKeys.has(o.key ?? o.objectiveRef))
    const next = savedGroups.map((g) => {
      if (g.id === sourceGroupId) {
        return { ...g, objectives: g.objectives.filter((o) => !keySet.has(o.key ?? o.objectiveRef)), updatedAt: new Date().toISOString() }
      }
      if (g.id === targetGroupId) {
        return { ...g, objectives: [...g.objectives, ...toAdd], updatedAt: new Date().toISOString() }
      }
      return g
    })
    saveReviewGroups(next)
    setSavedGroups(next)
    setExpandedGroupIds((prev) => new Set(prev).add(sourceGroupId).add(targetGroupId))
  }

  // Persists a group's checklist (add/remove/check/uncheck items) straight
  // to state + storage, same pattern as handleMoveObjectives above.
  const handleUpdateChecklist = (groupId, checklist) => {
    const next = savedGroups.map((g) => g.id === groupId ? { ...g, checklist } : g)
    saveReviewGroups(next)
    setSavedGroups(next)
  }

  const handleCreateFolder = (name) => {
    const next = createReviewFolder(name)
    setSavedFolders(next)
  }

  const handleDeleteFolder = (folderId) => {
    // Unassign all groups in the deleted folder
    const groups = getReviewGroups()
    for (const g of groups) {
      if (g.folderId === folderId) assignGroupToFolder(g.id, null)
    }
    const nextFolders = deleteReviewFolder(folderId)
    setSavedFolders(nextFolders)
    setSavedGroups(getReviewGroups())
  }

  const handleMoveGroupToFolder = (groupId, folderId) => {
    const next = assignGroupToFolder(groupId, folderId)
    setSavedGroups(next)
  }

  const handleBatchMoveGroups = (groupIds, folderId) => {
    for (const id of groupIds) assignGroupToFolder(id, folderId)
    setSavedGroups(getReviewGroups())
  }


  return (
    <div className="dash-root">
      <DashSidebar />

      <main className="dash-main dibcac-page">

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
          <button type="button" className="control-utility-toggle" onClick={toggleHideMet} aria-pressed={hideMet}>
            <span className="cl2-toggle-track" style={{ background: hideMet ? 'var(--dash-accent)' : '#1C1C20' }}>
              <span className="cl2-toggle-thumb" style={{ transform: hideMet ? 'translateX(14px)' : 'translateX(0)' }} />
            </span>
            Hide MET objectives
          </button>
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
      <div className={`dibcac-workspace dibcac-workspace--split${railExpanded && mode === 'browse' ? ' dibcac-workspace--rail-expanded' : ''}`}>
        {/* Left: objective browser */}
        {!(railExpanded && mode === 'browse') && (
          <div className="dibcac-browser-pane">
            <GroupedBrowser
              flatObjs={filteredObjs}
              builderMode={mode === 'builder'}
              checkedKeys={checkedKeys}
              onCheck={toggleCheck}
              onPreview={setPreviewKey}
            />
          </div>
        )}

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
                        allGroups={savedGroups}
                        onDelete={handleDeleteGroup}
                        onEditRequest={handleEditRequest}
                        onPreview={setPreviewKey}
                        onMoveObjectives={handleMoveObjectives}
                        onUpdateChecklist={handleUpdateChecklist}
                        isExpanded={expandedGroupIds.has(group.id)}
                        onToggleExpanded={() => toggleGroupExpanded(group.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <SavedGroupsPanel
              savedGroups={savedGroups}
              savedFolders={savedFolders}
              onDelete={handleDeleteGroup}
              onEditRequest={handleEditRequest}
              onPreview={setPreviewKey}
              onEnterBuilder={enterBuilder}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onMoveGroupToFolder={handleMoveGroupToFolder}
              onBatchMove={handleBatchMoveGroups}
              onMoveObjectives={handleMoveObjectives}
              onUpdateChecklist={handleUpdateChecklist}
              openFolderIds={openFolderIds}
              onToggleFolderOpen={toggleFolderOpen}
              expandedGroupIds={expandedGroupIds}
              onToggleGroupExpanded={toggleGroupExpanded}
              railExpanded={railExpanded}
              onToggleRailExpanded={() => setRailExpanded((v) => !v)}
            />
          )}
        </div>
      </div>
      </main>
    </div>
  )
}

export default DibcacMode
