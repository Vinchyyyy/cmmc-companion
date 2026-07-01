import { useState, useMemo } from 'react'
import { getDibcacStandard } from '../data/dibcacAssessmentStandards'
import {
  readObjectiveStatus,
  OBJECTIVE_STATUS_MET,
  OBJECTIVE_STATUS_NOT_MET,
} from '../utils/objectiveStatus'
import { readObjectiveFinding, writeObjectiveFinding } from '../utils/objectiveFindings'
import { readObjectiveArtifacts } from '../utils/objectiveArtifacts'
import { readObjectiveResult } from '../utils/objectiveResults'
import { readObjectiveInterviewedRoles } from '../utils/objectiveInterviewedRoles'
import { buildFinalText } from '../utils/findingStatementBuilder'
import FixInterviewDetailsModal from './FixInterviewDetailsModal'
import ApplySameInterviewerModal from './ApplySameInterviewerModal'

// Bulk "Create Findings" workflow — scans a set of controls' objectives and
// lets the assessor generate Findings Builder statements for many objectives
// at once, using the same deterministic template as the single-objective
// Findings Builder and DIBCAC group findings. No AI, no scoring changes.
export default function BulkFindingsModal({ title, controlsInScope, onClose }) {
  const [overwrite, setOverwrite] = useState(false)
  const [filter, setFilter] = useState('all') // all | ready | attention | skipped
  const [done, setDone] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [fixTarget, setFixTarget] = useState(null)
  const [showApplyInterviewerModal, setShowApplyInterviewerModal] = useState(false)

  const rows = useMemo(() => {
    const out = []
    for (const control of controlsInScope) {
      for (const obj of control.objectives ?? []) {
        const status   = readObjectiveStatus(control.id, obj.id)
        const existing = readObjectiveFinding(control.id, obj.id)
        const artifacts = readObjectiveArtifacts(control.id, obj.id)
        const result   = readObjectiveResult(control.id, obj.id)
        const roles    = readObjectiveInterviewedRoles(control.id, obj.id)
        const dibcacStd = getDibcacStandard(control.id, obj.id)

        const isMet       = status === OBJECTIVE_STATUS_MET
        const hasExisting = existing !== null
        const hasSavedDifferences = !!existing?.hasDifferences
        const missingRoles = roles.length === 0
        const missingInterviewComments = !result.interviews.trim()

        const warnings = []
        if (artifacts.length === 0)   warnings.push({ key: 'artifacts', text: 'No assigned artifacts.' })
        if (missingRoles)             warnings.push({ key: 'roles', text: 'Missing interviewed role.', fixable: true })
        if (missingInterviewComments) warnings.push({ key: 'interview', text: 'Missing interview comments.', fixable: true })

        let skipReason = null
        if (!isMet) {
          skipReason = status === OBJECTIVE_STATUS_NOT_MET ? 'NOT MET — skipped' : `${status} — skipped`
        } else if (hasSavedDifferences) {
          skipReason = 'Existing finding has noted differences — skipped'
        } else if (hasExisting && !overwrite) {
          skipReason = 'existing finding preserved'
        }

        const eligible = isMet && !hasSavedDifferences && (!hasExisting || overwrite)
        const category = !eligible ? 'skipped' : (warnings.length > 0 ? 'attention' : 'ready')

        out.push({
          controlId: control.id,
          controlTitle: control.title,
          objId: obj.id,
          objText: obj.text,
          key: `${control.id}[${obj.id}]`,
          status,
          hasExisting,
          artifacts,
          roles,
          standard: dibcacStd?.standard,
          eligible,
          skipReason,
          warnings,
          category,
        })
      }
    }
    return out
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlsInScope, overwrite, refreshKey])

  const counts = useMemo(() => ({
    ready:    rows.filter((r) => r.category === 'ready').length,
    attention: rows.filter((r) => r.category === 'attention').length,
    skipped:  rows.filter((r) => r.category === 'skipped').length,
    existing: rows.filter((r) => r.hasExisting).length,
  }), [rows])

  const eligibleRows = useMemo(() => rows.filter((r) => r.eligible), [rows])

  const visibleRows = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter((r) => r.category === filter)
  }, [rows, filter])

  const handleGenerate = () => {
    for (const row of eligibleRows) {
      writeObjectiveFinding(row.controlId, row.objId, {
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
      controlId: r.controlId,
      objId: r.objId,
      objText: r.objText,
      status: r.status,
      key: r.key,
      eligible: r.eligible,
    })),
    [rows]
  )

  if (fixTarget) {
    return (
      <FixInterviewDetailsModal
        controlId={fixTarget.controlId}
        objId={fixTarget.objId}
        objKey={fixTarget.key}
        objText={fixTarget.objText}
        scopeObjectives={scopeObjectives}
        onSave={handleFixSave}
        onClose={() => setFixTarget(null)}
      />
    )
  }

  // While Apply Same Interviewer is active, it is the only rendered modal
  // step — the Bulk Findings surface is not kept mounted underneath it.
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
      aria-label={title}
    >
      <div className="dibcac-group-findings-panel dibcac-group-findings-panel--wide">
        <div className="dibcac-comments-header">
          <span className="dibcac-comments-title">{title}</span>
          <span className="dibcac-comments-id">{rows.length} objective{rows.length !== 1 ? 's' : ''} in scope</span>
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
              <div className="bulk-findings-summary">
                <span className="bulk-findings-summary-chip bulk-findings-summary-chip--ready">Ready: {counts.ready}</span>
                <span className="bulk-findings-summary-chip bulk-findings-summary-chip--attention">Needs Attention: {counts.attention}</span>
                <span className="bulk-findings-summary-chip bulk-findings-summary-chip--skipped">Skipped: {counts.skipped}</span>
                <span className="bulk-findings-summary-chip">Existing Findings: {counts.existing}</span>
              </div>

              <div className="bulk-findings-filters-row">
                <div className="bulk-findings-filters">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'ready', label: 'Ready' },
                    { key: 'attention', label: 'Needs Attention' },
                    { key: 'skipped', label: 'Skipped' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className={`bulk-findings-filter-btn${filter === f.key ? ' bulk-findings-filter-btn--active' : ''}`}
                      onClick={() => setFilter(f.key)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="dibcac-action-btn bulk-findings-apply-interviewer-btn"
                  onClick={() => setShowApplyInterviewerModal(true)}
                >
                  Apply Same Interviewer
                </button>
              </div>

              <label className="dibcac-group-findings-overwrite">
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                />
                Overwrite existing findings
              </label>

              <div className="dibcac-group-findings-list">
                {visibleRows.map((row) => (
                  <div key={row.key} className={`dibcac-group-findings-row${row.eligible ? '' : ' dibcac-group-findings-row--skip'}`}>
                    <div className="dibcac-group-findings-row-header">
                      <span className="mono dibcac-group-findings-ref">{row.controlId}[{row.objId}]</span>
                      {row.skipReason
                        ? <span className="dibcac-group-findings-skip">{row.skipReason}</span>
                        : <span className="dibcac-group-findings-generate">will generate</span>
                      }
                    </div>
                    <p className="bulk-findings-row-text muted">{row.objText}</p>
                    {row.eligible && row.warnings.length > 0 && (
                      <div className="dibcac-group-findings-warnings">
                        {row.warnings.map((w) => (
                          <span key={w.key} className="dibcac-group-findings-warning">
                            ⚠ {w.text}
                            {w.fixable && (
                              <button
                                type="button"
                                className="dibcac-fix-btn"
                                onClick={() => setFixTarget({ controlId: row.controlId, objId: row.objId, key: row.key, objText: row.objText })}
                              >Fix</button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {visibleRows.length === 0 && (
                  <p className="dibcac-group-findings-done">No objectives match this filter.</p>
                )}
              </div>
            </div>
            <div className="dibcac-comments-footer">
              <button
                type="button"
                className="dibcac-builder-save"
                onClick={handleGenerate}
                disabled={eligibleRows.length === 0}
              >
                Generate {eligibleRows.length > 0 ? `${eligibleRows.length} Ready Finding${eligibleRows.length !== 1 ? 's' : ''}` : '0 Findings'}
              </button>
              <button type="button" className="dibcac-builder-cancel" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
