import { useState, useMemo } from 'react'
import { getDibcacStandard } from '../data/dibcacAssessmentStandards'
import {
  readObjectiveStatus,
  OBJECTIVE_STATUS_MET,
  OBJECTIVE_STATUS_NOT_MET,
  OBJECTIVE_STATUS_UNREVIEWED,
} from '../utils/objectiveStatus'
import { readObjectiveFinding, writeObjectiveFinding } from '../utils/objectiveFindings'
import { readObjectiveArtifacts } from '../utils/objectiveArtifacts'
import { readObjectiveResult } from '../utils/objectiveResults'
import { readObjectiveInterviewedRoles } from '../utils/objectiveInterviewedRoles'
import { buildFinalText } from '../utils/findingStatementBuilder'
import FixInterviewDetailsModal from './FixInterviewDetailsModal'
import ApplySameInterviewerModal from './ApplySameInterviewerModal'

const SKIP_NOT_MET = 'NOT MET — skipped'
const SKIP_IN_PROGRESS = 'In Progress — skipped'
const SKIP_UNREVIEWED = 'Unreviewed — skipped'
const SKIP_DIFFERENCES = 'Existing finding has noted differences — skipped'
const SKIP_EXISTING = 'existing finding preserved'

// Bulk "Create Findings" workflow — scans a set of controls' objectives and
// lets the assessor generate Findings Builder statements for many objectives
// at once, using the same deterministic template as the single-objective
// Findings Builder and DIBCAC group findings. No AI, no scoring changes.
//
// Objective-level status is only ever MET / NOT MET / Unreviewed. There is no
// stored "In Progress" objective status — "In Progress" here means an
// Unreviewed objective that already has some assessment activity recorded
// (interviewed roles, interview comments, or assigned artifacts), as opposed
// to a fully blank "Not Started" Unreviewed objective. This distinction is
// deterministic and template-based — no status data is modified.
export default function BulkFindingsModal({ title, controlsInScope, onClose }) {
  const [overwrite, setOverwrite] = useState(false)
  const [includeInProgress, setIncludeInProgress] = useState(false)
  const [includeUnreviewed, setIncludeUnreviewed] = useState(false)
  const [includeNotMet, setIncludeNotMet] = useState(false)
  const [includeDifferences, setIncludeDifferences] = useState(false)
  const [filter, setFilter] = useState('all') // all | ready | attention | skipped
  const [done, setDone] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [fixTarget, setFixTarget] = useState(null)
  const [showApplyInterviewerModal, setShowApplyInterviewerModal] = useState(false)
  const [expandedFamilies, setExpandedFamilies] = useState(() => new Set())

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

        const isMet        = status === OBJECTIVE_STATUS_MET
        const isNotMet      = status === OBJECTIVE_STATUS_NOT_MET
        const isUnreviewed  = status === OBJECTIVE_STATUS_UNREVIEWED
        const hasActivity   = roles.length > 0 || result.interviews.trim() !== '' || artifacts.length > 0
        const isInProgress  = isUnreviewed && hasActivity
        const isNotStarted  = isUnreviewed && !hasActivity

        const statusContext = isMet ? 'MET' : isNotMet ? 'NOT_MET' : isInProgress ? 'IN_PROGRESS' : 'UNREVIEWED'

        const hasExisting = existing !== null
        const hasSavedDifferences = !!existing?.hasDifferences
        const missingRoles = roles.length === 0
        const missingInterviewComments = !result.interviews.trim()

        const warnings = []
        if (artifacts.length === 0)   warnings.push({ key: 'artifacts', text: 'No assigned artifacts.' })
        if (missingRoles)             warnings.push({ key: 'roles', text: 'Missing interviewed role.', fixable: true })
        if (missingInterviewComments) warnings.push({ key: 'interview', text: 'Missing interview comments.', fixable: true })
        if (hasSavedDifferences && includeDifferences) {
          warnings.push({ key: 'differences', text: 'Existing finding has noted differences — difference language will be preserved.' })
        }

        const statusAllowed =
          isMet ||
          (isNotMet && includeNotMet) ||
          (isInProgress && includeInProgress) ||
          (isNotStarted && includeUnreviewed)

        const differencesAllowed = !hasSavedDifferences || includeDifferences

        let skipReason = null
        if (!statusAllowed) {
          skipReason = isNotMet ? SKIP_NOT_MET : isInProgress ? SKIP_IN_PROGRESS : SKIP_UNREVIEWED
        } else if (!differencesAllowed) {
          skipReason = SKIP_DIFFERENCES
        } else if (hasExisting && !overwrite) {
          skipReason = SKIP_EXISTING
        }

        const eligible = statusAllowed && differencesAllowed && (!hasExisting || overwrite)
        const category = !eligible ? 'skipped' : (warnings.length > 0 ? 'attention' : 'ready')

        out.push({
          controlId: control.id,
          controlTitle: control.title,
          family: control.family ?? 'Unassigned',
          objId: obj.id,
          objText: obj.text,
          key: `${control.id}[${obj.id}]`,
          status,
          statusContext,
          hasExisting,
          hasSavedDifferences,
          existingDifferencesText: existing?.differencesText ?? '',
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
  }, [controlsInScope, overwrite, includeInProgress, includeUnreviewed, includeNotMet, includeDifferences, refreshKey])

  // Compact per-family scope summary — deliberately not a per-objective list,
  // so selecting many controls (e.g. from Control Library) doesn't flood the
  // top of the modal before the assessor even reaches the readiness rows.
  const familySummary = useMemo(() => {
    const map = new Map()
    for (const control of controlsInScope) {
      const family = control.family ?? 'Unassigned'
      const entry = map.get(family) ?? { controls: 0, objectives: 0 }
      entry.controls += 1
      entry.objectives += control.objectives?.length ?? 0
      map.set(family, entry)
    }
    return [...map.entries()].map(([family, entry]) => ({ family, ...entry }))
  }, [controlsInScope])

  const counts = useMemo(() => ({
    ready:    rows.filter((r) => r.category === 'ready').length,
    attention: rows.filter((r) => r.category === 'attention').length,
    skipped:  rows.filter((r) => r.category === 'skipped').length,
    existing: rows.filter((r) => r.hasExisting).length,
  }), [rows])

  const eligibleRows = useMemo(() => rows.filter((r) => r.eligible), [rows])
  const anyOverrideActive = includeInProgress || includeUnreviewed || includeNotMet || includeDifferences

  // Objective rows grouped by family, with per-family readiness/warning
  // counts computed from the full family (not the current filter), and
  // collapsed by default so large multi-control scopes don't flood the modal.
  const familyGroups = useMemo(() => {
    const map = new Map()
    for (const row of rows) {
      if (!map.has(row.family)) map.set(row.family, [])
      map.get(row.family).push(row)
    }
    return [...map.entries()].map(([family, familyRows]) => ({
      family,
      rows: familyRows,
      controlsCount: new Set(familyRows.map((r) => r.controlId)).size,
      objectivesCount: familyRows.length,
      readyCount:     familyRows.filter((r) => r.category === 'ready').length,
      attentionCount: familyRows.filter((r) => r.category === 'attention').length,
      skippedCount:   familyRows.filter((r) => r.category === 'skipped').length,
      existingCount:  familyRows.filter((r) => r.hasExisting).length,
      missingRolesCount:    familyRows.filter((r) => r.warnings.some((w) => w.key === 'roles')).length,
      missingCommentsCount: familyRows.filter((r) => r.warnings.some((w) => w.key === 'interview')).length,
      missingArtifactsCount: familyRows.filter((r) => r.warnings.some((w) => w.key === 'artifacts')).length,
      notMetSkippedCount:      familyRows.filter((r) => r.skipReason === SKIP_NOT_MET).length,
      inProgressSkippedCount:  familyRows.filter((r) => r.skipReason === SKIP_IN_PROGRESS).length,
      unreviewedSkippedCount:  familyRows.filter((r) => r.skipReason === SKIP_UNREVIEWED).length,
      differencesSkippedCount: familyRows.filter((r) => r.skipReason === SKIP_DIFFERENCES).length,
      existingPreservedCount:  familyRows.filter((r) => r.skipReason === SKIP_EXISTING).length,
    }))
  }, [rows])

  // Filtered for display — families with zero matching rows for the current
  // filter are hidden entirely rather than shown as empty shells.
  const visibleFamilyGroups = useMemo(() => {
    return familyGroups
      .map((g) => ({
        ...g,
        filteredRows: filter === 'all' ? g.rows : g.rows.filter((r) => r.category === filter),
      }))
      .filter((g) => g.filteredRows.length > 0)
  }, [familyGroups, filter])

  const toggleFamily = (family) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev)
      if (next.has(family)) next.delete(family)
      else next.add(family)
      return next
    })
  }

  const handleGenerate = () => {
    for (const row of eligibleRows) {
      const preserveDifferences = row.hasSavedDifferences && includeDifferences
      writeObjectiveFinding(row.controlId, row.objId, {
        includedArtifacts: row.artifacts,
        hasDifferences: preserveDifferences,
        differencesText: preserveDifferences ? row.existingDifferencesText : '',
        finalText: buildFinalText({
          roles: row.roles,
          includedArtifacts: row.artifacts,
          objectiveRef: row.key,
          objectiveText: row.objText,
          dibcacMethod: row.standard,
          hasDifferences: preserveDifferences,
          differencesText: preserveDifferences ? row.existingDifferencesText : '',
          statusContext: row.statusContext,
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
              <div className="bulk-findings-target-scope">
                <span className="bulk-findings-target-scope-label">Target Scope</span>
                <ul className="bulk-findings-target-scope-list">
                  {familySummary.map((f) => (
                    <li key={f.family}>
                      {f.family} — {f.controls} control{f.controls !== 1 ? 's' : ''}, {f.objectives} objective{f.objectives !== 1 ? 's' : ''}
                    </li>
                  ))}
                  {familySummary.length > 1 && (
                    <li className="bulk-findings-target-scope-total">
                      Total — {controlsInScope.length} control{controlsInScope.length !== 1 ? 's' : ''}, {rows.length} objective{rows.length !== 1 ? 's' : ''}
                    </li>
                  )}
                </ul>
              </div>

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

              <details className="bulk-findings-advanced">
                <summary className="bulk-findings-advanced-summary">Advanced generation options</summary>
                <div className="bulk-findings-advanced-body">
                  <label className="dibcac-group-findings-overwrite">
                    <input
                      type="checkbox"
                      checked={overwrite}
                      onChange={(e) => setOverwrite(e.target.checked)}
                    />
                    Overwrite existing findings
                  </label>
                  <label className="dibcac-group-findings-overwrite">
                    <input
                      type="checkbox"
                      checked={includeInProgress}
                      onChange={(e) => setIncludeInProgress(e.target.checked)}
                    />
                    Include In Progress objectives
                  </label>
                  <label className="dibcac-group-findings-overwrite">
                    <input
                      type="checkbox"
                      checked={includeUnreviewed}
                      onChange={(e) => setIncludeUnreviewed(e.target.checked)}
                    />
                    Include Unreviewed / Not Started objectives
                  </label>
                  <label className="dibcac-group-findings-overwrite">
                    <input
                      type="checkbox"
                      checked={includeNotMet}
                      onChange={(e) => setIncludeNotMet(e.target.checked)}
                    />
                    Include NOT MET objectives
                  </label>
                  <label className="dibcac-group-findings-overwrite">
                    <input
                      type="checkbox"
                      checked={includeDifferences}
                      onChange={(e) => setIncludeDifferences(e.target.checked)}
                    />
                    Include objectives with differences/discrepancies (requires overwrite)
                  </label>
                  <p className="dibcac-fix-empty">
                    Included non-MET objectives use conservative confirmation language and never state the objective is implemented.
                    Difference/discrepancy objectives regenerate with their existing difference text preserved and still require overwrite to be selected.
                  </p>
                </div>
              </details>

              <div className="bulk-findings-family-list">
                {visibleFamilyGroups.map((g) => {
                  const expanded = expandedFamilies.has(g.family)
                  const warningParts = []
                  if (g.missingRolesCount > 0)     warningParts.push(`Missing roles ${g.missingRolesCount}`)
                  if (g.missingCommentsCount > 0)  warningParts.push(`Missing comments ${g.missingCommentsCount}`)
                  if (g.missingArtifactsCount > 0) warningParts.push(`Missing artifacts ${g.missingArtifactsCount}`)
                  if (g.notMetSkippedCount > 0)      warningParts.push(`NOT MET ${g.notMetSkippedCount}`)
                  if (g.inProgressSkippedCount > 0)  warningParts.push(`In Progress ${g.inProgressSkippedCount}`)
                  if (g.unreviewedSkippedCount > 0)  warningParts.push(`Unreviewed ${g.unreviewedSkippedCount}`)
                  if (g.differencesSkippedCount > 0) warningParts.push(`Differences ${g.differencesSkippedCount}`)
                  if (g.existingPreservedCount > 0)  warningParts.push(`Existing preserved ${g.existingPreservedCount}`)

                  return (
                    <div key={g.family} className="bulk-findings-family-group">
                      <button
                        type="button"
                        className="bulk-findings-family-header"
                        onClick={() => toggleFamily(g.family)}
                        aria-expanded={expanded}
                      >
                        <span className="bulk-findings-family-toggle">{expanded ? '▼' : '▶'}</span>
                        <div className="bulk-findings-family-info">
                          <div className="bulk-findings-family-title">
                            {g.family} — {g.controlsCount} control{g.controlsCount !== 1 ? 's' : ''}, {g.objectivesCount} objective{g.objectivesCount !== 1 ? 's' : ''}
                          </div>
                          <div className="bulk-findings-family-counts">
                            Ready: {g.readyCount} · Needs Attention: {g.attentionCount} · Skipped: {g.skippedCount} · Existing: {g.existingCount}
                          </div>
                          {warningParts.length > 0 && (
                            <div className="bulk-findings-family-warnings">
                              Warnings: {warningParts.join(' · ')}
                            </div>
                          )}
                        </div>
                      </button>

                      {expanded && (
                        <div className="dibcac-group-findings-list bulk-findings-family-rows">
                          {g.filteredRows.map((row) => (
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
                        </div>
                      )}
                    </div>
                  )
                })}
                {visibleFamilyGroups.length === 0 && (
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
                Generate {eligibleRows.length > 0 ? `${eligibleRows.length} ${anyOverrideActive ? '' : 'Ready '}Finding${eligibleRows.length !== 1 ? 's' : ''}` : '0 Findings'}
              </button>
              <button type="button" className="dibcac-builder-cancel" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
