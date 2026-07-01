import { useState, useEffect, useRef } from 'react'
import InterviewRolePickerModal from './InterviewRolePickerModal'
import ApplySameInterviewerModal from './ApplySameInterviewerModal'
import { readObjectiveInterviewedRoles, writeObjectiveInterviewedRoles } from '../utils/objectiveInterviewedRoles'
import { readObjectiveResult, writeObjectiveResult } from '../utils/objectiveResults'

// Shared "Fix Interview Details" modal — lets the assessor add interviewed
// roles and interview comments for an objective without leaving the bulk /
// group findings preview. Used by DIBCAC group findings and the bulk
// "Create Findings" workflow.
//
// Optional `scopeObjectives` prop enables "Apply Same Interviewer": an array
// of { controlId, objId, objText, status, key, eligible } describing the
// other objectives visible in the parent modal's current scope. When omitted
// (e.g. the normal single-objective Findings Builder flow), the action is
// hidden and existing behavior is unchanged.
export default function FixInterviewDetailsModal({ controlId, objId, objKey, objText, scopeObjectives, onSave, onClose }) {
  const [roles, setRoles] = useState(() => readObjectiveInterviewedRoles(controlId, objId))
  const [interviewText, setInterviewText] = useState(() => readObjectiveResult(controlId, objId).interviews)
  const [showRolePicker, setShowRolePicker] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [applyMessage, setApplyMessage] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
  }, [interviewText])

  const handleSave = () => {
    writeObjectiveInterviewedRoles(controlId, objId, roles)
    const existing = readObjectiveResult(controlId, objId)
    writeObjectiveResult(controlId, objId, { ...existing, interviews: interviewText })
    onSave()
  }

  const handleApplied = (count) => {
    setShowApplyModal(false)
    setApplyMessage(`Applied to ${count} other objective${count !== 1 ? 's' : ''}.`)
  }

  const hasScope = Array.isArray(scopeObjectives) && scopeObjectives.length > 1

  return (
    <>
      <div
        className="dibcac-comments-overlay dibcac-fix-overlay"
        onClick={(e) => { if (e.target === e.currentTarget && !showRolePicker && !showApplyModal) onClose() }}
        role="dialog"
        aria-modal="true"
        aria-label="Fix Interview Details"
      >
        <div className="dibcac-comments-panel dibcac-fix-panel">
          <div className="dibcac-comments-header">
            <span className="dibcac-comments-title">Fix Interview Details</span>
            <span className="dibcac-comments-id mono">{objKey}</span>
            <button type="button" className="dibcac-preview-close" onClick={onClose} aria-label="Close">✕</button>
          </div>

          {objText && <p className="dibcac-fix-obj-text">{objText}</p>}

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
                <p className="dibcac-fix-empty">No roles selected. Click + Add Roles to pick from the role list.</p>
              )}
            </div>

            <div className="dibcac-fix-field">
              <label className="dibcac-fix-label" htmlFor="fix-interview-text">Interview Notes / Comments</label>
              <textarea
                ref={textareaRef}
                id="fix-interview-text"
                className="dibcac-comments-textarea"
                value={interviewText}
                onChange={(e) => setInterviewText(e.target.value)}
                rows={4}
                placeholder="Describe what was discussed or confirmed in the interview…"
                style={{ resize: 'none', overflow: 'hidden' }}
              />
            </div>

            {hasScope && (
              <div className="dibcac-fix-field">
                <button
                  type="button"
                  className="dibcac-action-btn"
                  onClick={() => { setApplyMessage(''); setShowApplyModal(true) }}
                  disabled={roles.length === 0}
                >
                  Apply Same Interviewer
                </button>
                {applyMessage && <p className="dibcac-fix-empty">{applyMessage}</p>}
              </div>
            )}
          </div>

          <div className="dibcac-comments-footer">
            <button type="button" className="dibcac-builder-save" onClick={handleSave}>Save</button>
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

      {showApplyModal && (
        <ApplySameInterviewerModal
          excludeKey={objKey}
          scopeObjectives={scopeObjectives}
          initialRoles={roles}
          onClose={() => setShowApplyModal(false)}
          onApplied={handleApplied}
        />
      )}
    </>
  )
}
