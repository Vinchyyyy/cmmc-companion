import { useState, useMemo } from 'react'
import InterviewRolePickerModal from './InterviewRolePickerModal'
import { readObjectiveInterviewedRoles, writeObjectiveInterviewedRoles } from '../utils/objectiveInterviewedRoles'
import { readObjectiveResult } from '../utils/objectiveResults'

// "Apply Same Interviewer" — lets the assessor pick interviewed role(s) once,
// then apply them across many objectives in the current modal scope (Bulk
// Findings, DIBCAC Group Findings, or the per-objective Fix Interview Details
// flow). Writes go straight to the interviewed-roles storage helper — no
// group-only data is created. Interview comments are objective-specific and
// are not handled here (see Fix Interview Details / Control Detail).
//
// `scopeObjectives`: array of { controlId, objId, objText, status, key, eligible }
// `initialRoles`: optional pre-fill (used when opened from Fix Interview
//   Details, which already has roles selected for the objective in progress).
//   When omitted/empty, the modal preloads whatever interviewed roles already
//   exist across the current scope.
// `excludeKey`: optional objective key to omit from the target list (the
//   objective currently being edited in Fix Interview Details).
export default function ApplySameInterviewerModal({
  scopeObjectives,
  initialRoles = [],
  excludeKey = null,
  onClose,
  onApplied,
}) {
  const items = useMemo(() => {
    return (scopeObjectives ?? [])
      .filter((item) => item.key !== excludeKey)
      .map((item) => {
        const existingRoles = readObjectiveInterviewedRoles(item.controlId, item.objId)
        const existingResult = readObjectiveResult(item.controlId, item.objId)
        return {
          ...item,
          hasRoles: existingRoles.length > 0,
          hasComments: !!existingResult.interviews.trim(),
        }
      })
  }, [scopeObjectives, excludeKey])

  // Preload roles already assigned anywhere in scope, deduped case-insensitively
  // with the first-seen casing preserved. Explicit initialRoles (from Fix
  // Interview Details) take priority when provided.
  const scopePreloadRoles = useMemo(() => {
    const seen = new Map()
    for (const item of items) {
      for (const r of readObjectiveInterviewedRoles(item.controlId, item.objId)) {
        const key = r.toLowerCase()
        if (!seen.has(key)) seen.set(key, r)
      }
    }
    return [...seen.values()]
  }, [items])

  const [roles, setRoles] = useState(() => (initialRoles.length > 0 ? initialRoles : scopePreloadRoles))
  const [showRolePicker, setShowRolePicker] = useState(false)
  const [overwrite, setOverwrite] = useState(false)

  const [selectedKeys, setSelectedKeys] = useState(() => new Set(
    items.filter((item) => item.eligible !== false && !item.hasRoles).map((item) => item.key)
  ))

  const toggleItem = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleApplyToAll = () => {
    setSelectedKeys(new Set(items.map((item) => item.key)))
  }

  const handleClearSelection = () => {
    setSelectedKeys(new Set())
  }

  const handleApply = () => {
    let count = 0
    for (const item of items) {
      if (!selectedKeys.has(item.key)) continue
      const existing = readObjectiveInterviewedRoles(item.controlId, item.objId)
      if (overwrite || existing.length === 0) {
        writeObjectiveInterviewedRoles(item.controlId, item.objId, roles)
        count++
      }
    }
    onApplied(count)
  }

  return (
    <>
      <div
        className="dibcac-comments-overlay dibcac-fix-overlay"
        onClick={(e) => { if (e.target === e.currentTarget && !showRolePicker) onClose() }}
        role="dialog"
        aria-modal="true"
        aria-label="Apply Same Interviewer"
      >
        <div className="dibcac-comments-panel dibcac-fix-panel cd-apply-interviewer-panel">
          <div className="dibcac-comments-header">
            <span className="dibcac-comments-title">Apply Same Interviewer</span>
            <button type="button" className="dibcac-preview-close" onClick={onClose} aria-label="Close">✕</button>
          </div>

          <div className="dibcac-fix-body">
            <div className="dibcac-fix-field">
              <div className="dibcac-fix-field-header">
                <span className="dibcac-fix-label">Interviewed Roles / Titles</span>
                <button
                  type="button"
                  className="dibcac-action-btn"
                  onClick={() => setShowRolePicker(true)}
                >
                  {roles.length > 0 ? 'Manage Roles' : '+ Add Roles'}
                </button>
              </div>
              {roles.length > 0 ? (
                <div className="dibcac-fix-role-chips">
                  {roles.map((r) => (
                    <span key={r} className="dibcac-fix-role-chip">
                      {r}
                      <button
                        type="button"
                        className="dibcac-fix-role-chip-remove"
                        onClick={() => setRoles((prev) => prev.filter((x) => x !== r))}
                        aria-label={`Remove ${r}`}
                      >×</button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="dibcac-fix-empty">No roles selected yet. Click + Add Roles to pick from the role list.</p>
              )}
            </div>

            <div className="cd-apply-interviewer-options">
              <label className="dibcac-group-findings-overwrite">
                <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                Overwrite existing interviewed roles
              </label>
            </div>

            <div className="cd-apply-interviewer-targets-header">
              <span className="dibcac-fix-label">Targets</span>
              <div className="cd-apply-interviewer-targets-actions">
                <button type="button" className="dibcac-action-btn" onClick={handleApplyToAll} disabled={items.length === 0}>
                  Apply to All
                </button>
                <button type="button" className="dibcac-action-btn" onClick={handleClearSelection} disabled={selectedKeys.size === 0}>
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="cd-apply-interviewer-list">
              {items.length === 0 && (
                <p className="dibcac-fix-empty">No objectives in scope.</p>
              )}
              {items.map((item) => (
                <label key={item.key} className="cd-apply-interviewer-row">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(item.key)}
                    onChange={() => toggleItem(item.key)}
                  />
                  <div className="cd-apply-interviewer-row-info">
                    <div className="cd-apply-interviewer-row-header">
                      <span className="mono">{item.key}</span>
                      <span className="cd-apply-interviewer-row-status">{item.status}</span>
                    </div>
                    <p className="cd-apply-interviewer-row-text muted">{item.objText}</p>
                    <div className="cd-apply-interviewer-row-flags">
                      {item.hasRoles && <span className="cd-apply-interviewer-flag">has roles</span>}
                      {item.hasComments && <span className="cd-apply-interviewer-flag">has comments</span>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="dibcac-comments-footer">
            <button
              type="button"
              className="dibcac-builder-save"
              onClick={handleApply}
              disabled={selectedKeys.size === 0 || roles.length === 0}
            >
              Apply to {selectedKeys.size} Objective{selectedKeys.size !== 1 ? 's' : ''}
            </button>
            <button type="button" className="dibcac-builder-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>

      {showRolePicker && (
        <InterviewRolePickerModal
          currentRoles={roles}
          onSave={(newRoles) => { setRoles(newRoles); setShowRolePicker(false) }}
          onClose={() => setShowRolePicker(false)}
        />
      )}
    </>
  )
}
