import { useState, useEffect, useRef, useMemo } from 'react'
import useFocusTrap from './useFocusTrap'
import InterviewRolePickerModal from './InterviewRolePickerModal'
import { buildFinalText, buildObjectiveValidationStatement } from '../utils/findingStatementBuilder'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Derive the initial included-artifacts list from an existing finding or default to all assigned.
function resolveInitialIncluded(existingFinding, assignedArtifacts) {
  if (existingFinding?.includedArtifacts && Array.isArray(existingFinding.includedArtifacts)) {
    // Keep only artifacts still assigned to the objective.
    const assignedSet = new Set(assignedArtifacts)
    const saved = existingFinding.includedArtifacts.filter((a) => assignedSet.has(a))
    // If none of the saved ones are still assigned, fall back to all assigned.
    return saved.length > 0 ? saved : [...assignedArtifacts]
  }
  return [...assignedArtifacts]
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function FindingsBuilderModal({
  controlId,
  controlTitle,
  obj,
  objStatus,
  dibcacStd,
  assignedArtifacts,
  interviewedRoles: initialRoles,
  existingFinding,
  onSave,
  onClear,
  onClose,
  onRolesSaved,
}) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true)

  const objectiveRef = `${controlId}[${obj.id}]`

  // Roles — initialized from prop, can be updated via inline role picker
  const [roles, setRoles] = useState(() => initialRoles ?? [])
  // Included artifacts — togglable subset of assignedArtifacts (does NOT unassign)
  const [includedArtifacts, setIncludedArtifacts] = useState(
    () => resolveInitialIncluded(existingFinding, assignedArtifacts)
  )
  const [hasDifferences, setHasDifferences] = useState(existingFinding?.hasDifferences ?? false)
  const [differencesText, setDifferencesText] = useState(existingFinding?.differencesText ?? '')
  const [validationError, setValidationError] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showRolePicker, setShowRolePicker] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !showRolePicker) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, showRolePicker])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const finalText = useMemo(() => buildFinalText({
    roles,
    includedArtifacts,
    objectiveRef,
    objectiveText: obj.text,
    dibcacMethod: dibcacStd?.standard,
    hasDifferences,
    differencesText,
  }), [roles, includedArtifacts, objectiveRef, obj.text, dibcacStd, hasDifferences, differencesText])

  const validationSentence = useMemo(
    () => buildObjectiveValidationStatement({ objectiveRef, objectiveText: obj.text, dibcacMethod: dibcacStd?.standard }),
    [objectiveRef, obj.text, dibcacStd]
  )

  const toggleArtifact = (name) => {
    setIncludedArtifacts((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    )
  }

  const handleRolesSaved = (newRoles) => {
    setRoles(newRoles)
    setShowRolePicker(false)
    onRolesSaved?.(newRoles)
  }

  const handleSave = () => {
    if (hasDifferences && !differencesText.trim()) {
      setValidationError('Enter the noted findings or differences before saving.')
      return
    }
    setValidationError('')
    onSave({
      includedArtifacts,
      hasDifferences,
      differencesText,
      finalText,
      updatedAt: new Date().toISOString(),
    })
  }

  const handleClear = () => {
    setShowClearConfirm(false)
    onClear()
  }

  // Artifacts that were saved but are no longer assigned (can't be re-toggled on)
  const allArtifactsForDisplay = useMemo(() => {
    const assigned = new Set(assignedArtifacts)
    const extras = (existingFinding?.includedArtifacts ?? []).filter((a) => !assigned.has(a))
    return [...assignedArtifacts, ...extras]
  }, [assignedArtifacts, existingFinding])

  return (
    <>
      <div
        className="cd-edit-modal-overlay"
        onClick={(e) => { if (e.target === e.currentTarget && !showRolePicker) onClose() }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="findings-builder-title"
      >
        <div className="cd-edit-modal cd-findings-modal" ref={modalRef}>
          {/* Header */}
          <div className="cd-edit-modal-header">
            <div>
              <span id="findings-builder-title" className="cd-edit-modal-title">Findings Builder</span>
              <p className="cd-findings-subtitle">
                Build a standardized validation statement for this objective&apos;s Findings column.
              </p>
            </div>
            <button type="button" className="cd-edit-modal-close" onClick={onClose} aria-label="Close">✕</button>
          </div>

          <div className="cd-edit-modal-body cd-findings-body">
            {/* Context card */}
            <div className="cd-findings-context-card">
              <div className="cd-findings-context-ref">
                <span className="mono">{controlId}</span>
                {' — '}
                <span>{controlTitle}</span>
              </div>
              <div className="cd-findings-context-obj">
                <span className="mono">[{obj.id}]</span>
                {' '}
                <span>{obj.text}</span>
              </div>
              <div className="cd-findings-context-meta">
                {dibcacStd && (
                  <span className={`cd-dibcac-chip cd-dibcac-chip--${dibcacStd.standard}`}>{dibcacStd.label}</span>
                )}
                {objStatus && objStatus !== 'Unreviewed' && (
                  <span className={`cd-findings-status-chip cd-findings-status-chip--${objStatus === 'MET' ? 'met' : 'not-met'}`}>
                    Status: {objStatus}
                  </span>
                )}
              </div>
            </div>

            {/* ── 1. Interviewed Roles ── */}
            <div className="cd-findings-field">
              <div className="cd-findings-field-header-row">
                <span className="cd-findings-field-label">Interviewed Roles / Titles</span>
                <button
                  type="button"
                  className="cd-findings-manage-roles-btn"
                  onClick={() => setShowRolePicker(true)}
                >
                  {roles.length > 0 ? 'Manage Roles' : '+ Add Roles'}
                </button>
              </div>
              {roles.length > 0 ? (
                <div className="cd-findings-role-chips">
                  {roles.map((r) => (
                    <span key={r} className="cd-findings-role-chip">{r}</span>
                  ))}
                </div>
              ) : (
                <p className="cd-findings-field-note muted">
                  No interviewed roles selected for this objective.
                  If blank, the Interviewed line will be omitted.
                </p>
              )}
            </div>

            {/* ── 2. Reviewed Artifacts ── */}
            <div className="cd-findings-field">
              <span className="cd-findings-field-label">A) Reviewed Artifacts</span>
              {allArtifactsForDisplay.length === 0 ? (
                <p className="cd-findings-field-warning">
                  No artifacts assigned to this objective. Assign artifacts in the objective&apos;s Assigned Artifacts section.
                </p>
              ) : (
                <>
                  <div className="cd-findings-artifact-chips">
                    {allArtifactsForDisplay.map((a) => {
                      const isAssigned = assignedArtifacts.includes(a)
                      const isIncluded = includedArtifacts.includes(a)
                      return (
                        <button
                          key={a}
                          type="button"
                          className={`cd-findings-artifact-toggle${isIncluded ? ' cd-findings-artifact-toggle--on' : ' cd-findings-artifact-toggle--off'}${!isAssigned ? ' cd-findings-artifact-toggle--removed' : ''}`}
                          onClick={() => isAssigned && toggleArtifact(a)}
                          title={!isAssigned ? 'No longer assigned to this objective' : isIncluded ? 'Click to exclude from finding' : 'Click to include in finding'}
                          aria-pressed={isIncluded}
                        >
                          {isIncluded ? '✓ ' : ''}{a}
                          {!isAssigned && <span className="cd-findings-artifact-removed-note"> (removed)</span>}
                        </button>
                      )
                    })}
                  </div>
                  <p className="cd-findings-field-note muted">
                    Toggle chips to include or exclude from the finding statement.
                    To add artifacts, assign them in the objective&apos;s Assigned Artifacts section.
                  </p>
                </>
              )}
            </div>

            {/* ── 3. SSP Validation Reference (generated) ── */}
            <div className="cd-findings-field">
              <span className="cd-findings-field-label">B) SSP Validation Reference</span>
              <div className="cd-findings-generated-line">{validationSentence}</div>
            </div>

            {/* ── 4. Findings / Differences ── */}
            <div className="cd-findings-field">
              <span className="cd-findings-field-label">C) Noted findings or differences?</span>
              <div className="cd-findings-toggle-row">
                <button
                  type="button"
                  className={`cd-findings-toggle-btn${!hasDifferences ? ' cd-findings-toggle-btn--active' : ''}`}
                  onClick={() => { setHasDifferences(false); setValidationError('') }}
                  aria-pressed={!hasDifferences}
                >
                  No
                </button>
                <button
                  type="button"
                  className={`cd-findings-toggle-btn cd-findings-toggle-btn--yes${hasDifferences ? ' cd-findings-toggle-btn--active cd-findings-toggle-btn--yes-active' : ''}`}
                  onClick={() => setHasDifferences(true)}
                  aria-pressed={hasDifferences}
                >
                  Yes
                </button>
              </div>
              {hasDifferences && (
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <label className="cd-findings-field-label" htmlFor="fb-differences">
                    Describe noted findings or differences
                  </label>
                  <textarea
                    id="fb-differences"
                    className="cd-edit-textarea"
                    rows={3}
                    value={differencesText}
                    onChange={(e) => { setDifferencesText(e.target.value); setValidationError('') }}
                    placeholder="Describe the noted findings or differences…"
                    autoFocus
                  />
                </div>
              )}
              {validationError && (
                <p className="cd-findings-validation-error">{validationError}</p>
              )}
            </div>

            {/* ── 5. Confirmation Statement (generated) ── */}
            <div className="cd-findings-field">
              <span className="cd-findings-field-label">D) Confirmation Statement</span>
              <div className="cd-findings-generated-line">
                Assessment team confirmed in interview, testing, and documentation that this objective is{' '}
                {hasDifferences
                  ? <strong className="cd-findings-not-implemented">not implemented.</strong>
                  : <strong className="cd-findings-implemented">implemented.</strong>
                }
              </div>
            </div>

            {/* ── Live Preview ── */}
            <div className="cd-findings-preview">
              <div className="cd-findings-preview-title">Findings Preview</div>
              <pre className="cd-findings-preview-text">{finalText}</pre>
            </div>

            {/* ── Clear Finding ── */}
            {existingFinding && (
              <div className="cd-findings-danger-zone">
                {showClearConfirm ? (
                  <div className="cd-findings-clear-confirm">
                    <span>Remove the saved finding for this objective?</span>
                    <button type="button" className="cd-findings-clear-confirm-yes" onClick={handleClear}>
                      Yes, Clear Finding
                    </button>
                    <button type="button" className="cd-edit-btn-secondary" onClick={() => setShowClearConfirm(false)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="cd-findings-clear-btn"
                    onClick={() => setShowClearConfirm(true)}
                  >
                    Clear Finding
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="cd-edit-modal-footer">
            <button type="button" className="cd-edit-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="cd-edit-btn-primary" onClick={handleSave}>
              Save Finding
            </button>
          </div>
        </div>
      </div>

      {/* Role picker stacks on top of Findings Builder */}
      {showRolePicker && (
        <InterviewRolePickerModal
          currentRoles={roles}
          onSave={handleRolesSaved}
          onClose={() => setShowRolePicker(false)}
        />
      )}
    </>
  )
}
