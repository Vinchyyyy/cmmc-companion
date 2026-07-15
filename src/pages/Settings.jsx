import { useRef, useState } from 'react'
import { Download, Upload, FileSpreadsheet, AlertTriangle, Palette, Check } from 'lucide-react'
import DashSidebar from '../components/DashSidebar.jsx'
import controls from '../data/controls/index.js'
import {
  exportProjectState,
  importProjectState,
  downloadProjectJson,
  wipeProjectState,
  DEFAULT_IMPORT_OPTIONS,
  SCHEMA_VERSION,
  ACCEPTED_SCHEMA_VERSIONS,
} from '../utils/projectState'
import { readExportMeta, writeExportMeta, buildExportFilename, readLastBackup, writeLastBackup, formatLastBackup } from '../utils/exportMeta'
import { buildCmmcTemplateWorkbook, downloadCmmcTemplate, formatWarningSummary } from '../utils/exportCmmcTemplate'
import { parseAssessmentWorkbook, applyWorkbookImport } from '../utils/importAssessmentWorkbook'
import { PROVIDERS } from '../data/providers'
import { ACCENT_PALETTES, readAccent, writeAccent, applyAccent } from '../utils/accentColor'
import { reconcileProgressFromStoredWork } from '../utils/progressReconciliation'

// Provider names from the app's real provider registry — used as fallback
// options in the inheritance source reconciliation dropdown when the project
// has no existing sources yet.
const PROVIDER_NAMES = PROVIDERS.map((p) => p.name)

function Settings() {
  const jsonFileRef = useRef(null)
  const workbookFileRef = useRef(null)
  const [jsonResult, setJsonResult] = useState(null)
  const [workbookImportResult, setWorkbookImportResult] = useState(null)
  const [pendingWorkbookImport, setPendingWorkbookImport] = useState(null)
  const [workbookImportParsing, setWorkbookImportParsing] = useState(false)
  const [reconciliationChoices, setReconciliationChoices] = useState({ assignedTo: {}, inheritanceSources: {} })
  const [exportDialog, setExportDialog] = useState(null)
  const [xlsxResult, setXlsxResult] = useState(null)
  const [pendingJsonImport, setPendingJsonImport] = useState(null)
  const [importOptions, setImportOptions] = useState(DEFAULT_IMPORT_OPTIONS)
  const [wipeStage, setWipeStage] = useState(null)
  const [wipeInput, setWipeInput] = useState('')
  const [wipeSuccess, setWipeSuccess] = useState(false)
  const [lastBackup, setLastBackup] = useState(() => readLastBackup())
  const [accent, setAccent] = useState(() => readAccent())

  const handleAccentChange = (value) => {
    writeAccent(value)
    applyAccent(value)
    setAccent(value)
  }

  const openExportDialog = (mode) => {
    const meta = readExportMeta()
    setExportDialog({ mode, osc: meta.osc, assessment: meta.assessment })
  }
  const closeExportDialog = () => setExportDialog(null)

  const confirmExport = async () => {
    const { mode, osc, assessment } = exportDialog
    writeExportMeta(osc, assessment)
    closeExportDialog()

    if (mode === 'xlsx') {
      setXlsxResult(null)
      try {
        const res = await fetch('/templates/CMMC_Level2_AssessmentResults_Template.xlsx')
        if (!res.ok) throw new Error(`Failed to fetch bundled template (HTTP ${res.status}).`)
        const buffer = await res.arrayBuffer()
        const { workbook, warnings } = await buildCmmcTemplateWorkbook(buffer, controls)
        const sanitize = (s) => (s ?? '').trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')
        const parts = ['CMMC_Companion']
        const cleanOsc = sanitize(osc)
        const cleanAssessment = sanitize(assessment)
        if (cleanOsc) parts.push(cleanOsc)
        if (cleanAssessment) parts.push(cleanAssessment)
        parts.push('Assessment_Results')
        const filename = parts.join('_') + '.xlsx'
        await downloadCmmcTemplate(workbook, filename)
        const summary = formatWarningSummary(warnings)
        setXlsxResult({ ok: true, message: `Assessment Workbook exported: ${filename}`, detail: summary })
      } catch (err) {
        setXlsxResult({ ok: false, message: `Export failed: ${err.message}`, detail: '' })
      }
    } else {
      const filename = buildExportFilename(osc, assessment, 'ProjectBackup', 'json')
      const state = exportProjectState(controls)
      downloadProjectJson(state, filename)
      writeLastBackup()
      setLastBackup(readLastBackup())
      setJsonResult({ ok: true, message: `Project exported — ${controls.length} controls, schema v${SCHEMA_VERSION}.` })
    }
  }

  const handleJsonImportClick = () => jsonFileRef.current?.click()

  const JSON_MAX_BYTES = 2 * 1024 * 1024  // 2 MB
  const JSON_ALLOWED_TYPES = new Set(['application/json', 'text/plain', ''])

  const handleJsonFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.json')) {
      setJsonResult({ ok: false, message: 'Invalid file. Please select a .json file.' })
      return
    }
    if (!JSON_ALLOWED_TYPES.has(file.type)) {
      setJsonResult({ ok: false, message: `Unexpected file type "${file.type}". Please select a valid JSON file.` })
      return
    }
    if (file.size > JSON_MAX_BYTES) {
      setJsonResult({ ok: false, message: 'File too large. JSON imports must be under 2 MB.' })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? ''))
        if (!parsed || typeof parsed !== 'object') {
          setJsonResult({ ok: false, message: 'Invalid JSON: expected an object.' }); return
        }
        if (!ACCEPTED_SCHEMA_VERSIONS.includes(parsed.schemaVersion)) {
          setJsonResult({ ok: false, message: `Unsupported schema version ${parsed.schemaVersion}. Expected version 1, 2, 3, or 4.` }); return
        }
        if (!Array.isArray(parsed.controls)) {
          setJsonResult({ ok: false, message: 'Invalid JSON: "controls" must be an array.' }); return
        }
        setImportOptions(DEFAULT_IMPORT_OPTIONS)
        setPendingJsonImport(parsed)
      } catch {
        setJsonResult({ ok: false, message: 'Could not parse file — is it a valid CMMC Companion project JSON?' })
      }
    }
    reader.onerror = () => setJsonResult({ ok: false, message: 'Could not read file.' })
    reader.readAsText(file)
  }

  const confirmJsonRestore = () => {
    if (!pendingJsonImport) return
    try {
      const summary = importProjectState(pendingJsonImport, controls, importOptions)
      if (!summary.ok) { setJsonResult({ ok: false, message: summary.error }); return }
      reconcileProgressFromStoredWork(controls)
      const p = (n, singular, plural) => n > 0 ? `${n} ${n === 1 ? singular : plural}` : null
      const parts = [
        p(summary.statusesWritten,          'status',               'statuses'),
        p(summary.notesWritten,             'note',                 'notes'),
        p(summary.objectiveNotesWritten,    'objective note',       'objective notes'),
        p(summary.objectiveStatusesWritten, 'objective status',     'objective statuses'),
        p(summary.inheritanceWritten,       'inheritance value',    'inheritance values'),
        p(summary.inheritanceSourcesWritten,'inheritance source',   'inheritance sources'),
        p(summary.assignmentsWritten,       'assignment',           'assignments'),
        p(summary.evidencePoolsWritten,     'evidence pool',        'evidence pools'),
        p(summary.objectiveArtifactsWritten,'objective artifact set','objective artifact sets'),
        p(summary.objectiveResultsWritten,  'objective result',     'objective results'),
      ].filter(Boolean)
      const skipSuffix = summary.skippedBecauseExisting > 0
        ? ` Skipped ${summary.skippedBecauseExisting} existing field${summary.skippedBecauseExisting === 1 ? '' : 's'} — Fill Empty Only mode.`
        : ''
      const unknownSuffix = summary.skippedUnknownId > 0
        ? ` (${summary.skippedUnknownId} unknown ID${summary.skippedUnknownId === 1 ? '' : 's'} skipped)`
        : ''
      let message
      if (summary.controlsProcessed === 0) {
        message = 'No matching controls found in the backup file.'
      } else if (parts.length === 0) {
        message = `Backup processed${unknownSuffix}. No selected categories contained restorable values.${skipSuffix}`
      } else {
        message = `Restored ${summary.controlsProcessed} control${summary.controlsProcessed === 1 ? '' : 's'} — ${parts.join(', ')}${unknownSuffix}.${skipSuffix}`
      }
      setJsonResult({ ok: true, message })
    } catch {
      setJsonResult({ ok: false, message: 'Restore failed — unexpected error.' })
    } finally {
      setPendingJsonImport(null)
    }
  }

  const cancelJsonRestore = () => setPendingJsonImport(null)

  const handleWorkbookImportClick = () => workbookFileRef.current?.click()

  const WORKBOOK_MAX_BYTES = 10 * 1024 * 1024  // 10 MB

  const handleWorkbookFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setWorkbookImportResult({ ok: false, message: 'Invalid file. Please select a .xlsx workbook file.' })
      return
    }
    if (file.size > WORKBOOK_MAX_BYTES) {
      setWorkbookImportResult({ ok: false, message: 'File too large. Workbook imports must be under 10 MB.' })
      return
    }

    setWorkbookImportResult(null)
    setWorkbookImportParsing(true)

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const parsed = await parseAssessmentWorkbook(reader.result, controls)
        if (!parsed.ok) {
          setWorkbookImportResult({ ok: false, message: parsed.error })
        } else {
          const initialChoices = { assignedTo: {}, inheritanceSources: {} }
          for (const { raw } of parsed.reconciliation?.assignedTo?.unmatched ?? []) {
            initialChoices.assignedTo[raw] = raw
          }
          for (const { raw, suggestion } of parsed.reconciliation?.inheritanceSources?.unmatched ?? []) {
            initialChoices.inheritanceSources[raw] = suggestion ?? raw
          }
          setReconciliationChoices(initialChoices)
          setPendingWorkbookImport(parsed)
        }
      } catch (err) {
        setWorkbookImportResult({ ok: false, message: `Import failed: ${err.message}` })
      } finally {
        setWorkbookImportParsing(false)
      }
    }
    reader.onerror = () => {
      setWorkbookImportResult({ ok: false, message: 'Could not read file.' })
      setWorkbookImportParsing(false)
    }
    reader.readAsArrayBuffer(file)
  }

  const confirmWorkbookImport = (mode) => {
    if (!pendingWorkbookImport) return
    try {
      const result = applyWorkbookImport(pendingWorkbookImport, controls, mode, reconciliationChoices)
      reconcileProgressFromStoredWork(controls)
      setPendingWorkbookImport(null)
      const p = (n, singular, plural) => n > 0 ? `${n} ${n === 1 ? singular : plural}` : null
      const parts = [
        p(result.objectivesApplied,   'objective processed',    'objectives processed'),
        p(result.statusesWritten,     'status',                 'statuses'),
        p(result.resultsWritten,      'result set',             'result sets'),
        p(result.findingsWritten,     'finding',                'findings'),
        p(result.artifactSetsWritten, 'artifact set',           'artifact sets'),
      ].filter(Boolean)
      const modeLabel = mode === 'new' ? 'Imported as new project' : 'Merged into project'
      setWorkbookImportResult({
        ok: true,
        message: `${modeLabel} — ${parts.length > 0 ? parts.join(', ') : 'no data applied'}.`,
      })
    } catch (err) {
      setWorkbookImportResult({ ok: false, message: `Import failed: ${err.message}` })
      setPendingWorkbookImport(null)
    }
  }

  const cancelWorkbookImport = () => {
    setPendingWorkbookImport(null)
    setReconciliationChoices({ assignedTo: {}, inheritanceSources: {} })
  }

  const handleWipeConfirmed = () => {
    wipeProjectState()
    setWipeStage(null)
    setWipeInput('')
    setWipeSuccess(true)
    setLastBackup(null)
    setJsonResult(null)
    setTimeout(() => setWipeSuccess(false), 5000)
  }

  const dedupe = (arr) => [...new Set(arr.filter(Boolean))].sort()

  return (
    <div className="dash-root">
      <DashSidebar />

      <main className="dash-main set-page">
      <h1 className="set-title">Settings</h1>
      <p className="set-subtitle">Data management, backups, and appearance for this local assessment workspace.</p>

      <div className="set-card">
        <div className="set-card-group-label-row">
          <span className="set-card-group-label">Backup &amp; Restore</span>
        </div>
        <div className="set-card-group">
          <button className="set-action-row" onClick={() => openExportDialog('json')}>
            <span className="set-action-icon"><Download size={16} /></span>
            <span>
              <span className="set-action-label">Export Project JSON</span>
              <span className="set-action-desc">Creates a portable backup of your current local project state.</span>
            </span>
          </button>
          <button className="set-action-row" onClick={handleJsonImportClick}>
            <span className="set-action-icon"><Upload size={16} /></span>
            <span>
              <span className="set-action-label">Import Project JSON</span>
              <span className="set-action-desc">Restores a previously exported project file into this browser.</span>
            </span>
          </button>
          <input ref={jsonFileRef} type="file" accept=".json,application/json" onChange={handleJsonFileChange} style={{ display: 'none' }} />
        </div>

        <div className="set-card-group-label-row set-card-group-label-row--divider">
          <span className="set-card-group-label">Official Templates</span>
        </div>
        <div className="set-card-group">
          <button className="set-action-row" onClick={() => openExportDialog('xlsx')}>
            <span className="set-action-icon"><FileSpreadsheet size={16} /></span>
            <span>
              <span className="set-action-label">Export Assessment Workbook</span>
              <span className="set-action-desc">Populates the official CMMC Level 2 Assessment Results Template with current project data.</span>
            </span>
          </button>
          <button className="set-action-row" onClick={handleWorkbookImportClick} disabled={workbookImportParsing}>
            <span className="set-action-icon"><FileSpreadsheet size={16} /></span>
            <span>
              <span className="set-action-label">{workbookImportParsing ? 'Parsing…' : 'Import Assessment Workbook'}</span>
              <span className="set-action-desc">Imports an existing official CMMC Assessment Results Template workbook into this local project.</span>
            </span>
          </button>
          <input
            ref={workbookFileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleWorkbookFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {xlsxResult && (
          <div className="set-card-feedback">
            <p className={`feedback ${xlsxResult.ok ? 'feedback--ok' : 'feedback--error'}`}>{xlsxResult.message}</p>
          </div>
        )}
        {jsonResult && (
          <div className="set-card-feedback">
            <p className={`feedback ${jsonResult.ok ? 'feedback--ok' : 'feedback--error'}`}>{jsonResult.message}</p>
          </div>
        )}
        {workbookImportResult && (
          <div className="set-card-feedback">
            <p className={`feedback ${workbookImportResult.ok ? 'feedback--ok' : 'feedback--error'}`}>{workbookImportResult.message}</p>
          </div>
        )}
        {wipeSuccess && (
          <div className="set-card-feedback">
            <p className="feedback feedback--ok">Project wiped. All local assessment data has been cleared.</p>
          </div>
        )}

        <div className="set-card-meta-row">
          <p className="set-card-meta">Last backup: <strong>{formatLastBackup(lastBackup)}</strong></p>
        </div>
      </div>

      <div className="set-card">
        <div className="set-card-group-label-row">
          <span className="set-card-group-label set-card-group-label--danger">Danger Zone</span>
        </div>
        <div className="set-card-group">
          <button
            className="set-action-row set-action-row--danger"
            onClick={() => { setWipeStage('confirm1'); setWipeInput('') }}
          >
            <span className="set-action-icon set-action-icon--danger"><AlertTriangle size={16} /></span>
            <span>
              <span className="set-action-label set-action-label--danger">Wipe Entire Project</span>
              <span className="set-action-desc">Permanently deletes all local project data — statuses, notes, artifacts, tags, and saved review groups. This cannot be undone.</span>
            </span>
          </button>
        </div>
      </div>

      <div className="set-card">
        <div className="set-card-body">
          <div className="set-card-group-label">Appearance</div>

          <div className="set-appearance-section set-appearance-section--first">
            <div className="set-appearance-section-title">
              <Palette size={15} />
              <span>Accent Color</span>
            </div>
            <p className="set-appearance-section-helper">Pick the accent color used throughout the workspace — buttons, active nav, highlights, and chart accents.</p>
            <div className="set-accent-swatch-row">
              {ACCENT_PALETTES.map((p) => {
                const isActive = accent === p.value
                return (
                  <button
                    key={p.value}
                    type="button"
                    className="set-accent-swatch-btn"
                    onClick={() => handleAccentChange(p.value)}
                    aria-pressed={isActive}
                  >
                    <span
                      className={`set-accent-swatch${isActive ? ' set-accent-swatch--active' : ''}`}
                      style={{ background: `linear-gradient(135deg, ${p.accent} 0%, ${p.accent2} 100%)` }}
                    >
                      {isActive && <Check size={16} color="#fff" strokeWidth={3} />}
                    </span>
                    <span className={`set-accent-swatch-label${isActive ? ' set-accent-swatch-label--active' : ''}`}>{p.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      </main>

      {exportDialog && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title">
          <div className="confirm-dialog">
            <h2 id="export-dialog-title">
              {exportDialog.mode === 'xlsx' ? 'Export Assessment Workbook' : 'Create Project Backup'}
            </h2>
            <p>These fields are optional. If left blank, a generic filename will be used.</p>
            <div className="export-dialog-fields">
              <label className="export-dialog-label">
                OSC / Client Name
                <input
                  type="text"
                  className="export-dialog-input"
                  placeholder="e.g. Acme Corp"
                  value={exportDialog.osc}
                  onChange={(e) => setExportDialog((d) => ({ ...d, osc: e.target.value }))}
                  autoFocus
                />
              </label>
              <label className="export-dialog-label">
                Assessment Name <span className="muted">(optional)</span>
                <input
                  type="text"
                  className="export-dialog-input"
                  placeholder="e.g. Q2 2026"
                  value={exportDialog.assessment}
                  onChange={(e) => setExportDialog((d) => ({ ...d, assessment: e.target.value }))}
                />
              </label>
            </div>
            <div className="confirm-dialog-buttons">
              <button onClick={closeExportDialog}>Cancel</button>
              <button onClick={confirmExport}>
                {exportDialog.mode === 'xlsx' ? 'Export Assessment Workbook' : 'Create Backup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {wipeStage === 'confirm1' && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="wipe-dialog-title">
          <div className="confirm-dialog confirm-dialog--danger">
            <h2 id="wipe-dialog-title" className="confirm-dialog-title--danger">Wipe Entire Project?</h2>
            <p>This will permanently remove all local assessment progress from this browser, including:</p>
            <ul>
              <li>Control and objective statuses</li>
              <li>Assessment notes and objective results (interviews, examine, test, overall comments)</li>
              <li>Assigned artifacts and evidence pool entries</li>
              <li>Evidence tags on artifacts</li>
              <li>Inheritance settings and inheritance sources</li>
              <li>Control assignments</li>
              <li>Review groups and group memberships</li>
              <li>Environment profile</li>
            </ul>
            <p><strong>This action cannot be undone.</strong> Export a project backup first if you want to preserve your work.</p>
            <div className="confirm-dialog-buttons">
              <button onClick={() => setWipeStage(null)}>Cancel</button>
              <button className="bulk-toolbar-danger" onClick={() => { setWipeStage('confirm2'); setWipeInput('') }}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {wipeStage === 'confirm2' && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="wipe-final-title">
          <div className="confirm-dialog confirm-dialog--danger">
            <h2 id="wipe-final-title" className="confirm-dialog-title--danger">Final Confirmation</h2>
            <p>Type <strong>WIPE</strong> to confirm. This cannot be undone.</p>
            <input
              type="text"
              className="export-dialog-input"
              placeholder="Type WIPE here"
              value={wipeInput}
              onChange={(e) => setWipeInput(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            <div className="confirm-dialog-buttons">
              <button onClick={() => setWipeStage(null)}>Cancel</button>
              <button
                className="bulk-toolbar-danger"
                disabled={wipeInput !== 'WIPE'}
                onClick={handleWipeConfirmed}
              >
                Wipe Project
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingWorkbookImport && (() => {
        const { counts, warnings, derivedStatusCounts, reconciliation } = pendingWorkbookImport
        const recon = reconciliation ?? { assignedTo: { matched: [], unmatched: [] }, inheritanceSources: { matched: [], unmatched: [] }, existingAssignees: [], existingSources: [] }
        const hasAssignedTo = recon.assignedTo.matched.length > 0 || recon.assignedTo.unmatched.length > 0
        const hasSources    = recon.inheritanceSources.matched.length > 0 || recon.inheritanceSources.unmatched.length > 0
        const hasRecon      = hasAssignedTo || hasSources

        const assigneePool = dedupe([
          ...recon.existingAssignees,
          ...recon.assignedTo.matched.map((m) => m.resolvedTo),
          ...recon.assignedTo.unmatched.map((m) => m.raw),
        ])
        const sourcePool = dedupe([
          ...PROVIDER_NAMES,
          ...recon.existingSources,
          ...recon.inheritanceSources.matched.map((m) => m.resolvedTo),
          ...recon.inheritanceSources.unmatched.flatMap((m) =>
            m.suggestion && m.suggestion !== m.raw ? [m.raw, m.suggestion] : [m.raw]
          ),
        ])

        return (
          <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="workbook-import-dialog-title">
            <div className="confirm-dialog confirm-dialog--wide">
              <h2 id="workbook-import-dialog-title">Import Assessment Workbook</h2>
              <p>Review the parsed workbook summary and reconcile any unrecognized values before importing.</p>

              <div className="workbook-import-summary">
                <p><strong>Workbook Summary</strong></p>
                <ul>
                  <li>Controls found: {counts.controlsFound}</li>
                  <li>Objectives found: {counts.objectivesFound}</li>
                  <li>Objective statuses (MET / NOT MET): {counts.objectiveStatusesFound}</li>
                  <li>Findings statements: {counts.findingsFound}</li>
                  <li>Artifact references: {counts.artifactRefsFound}</li>
                  <li>Interview notes: {counts.interviewNotesFound}</li>
                  <li>Examine notes: {counts.examineNotesFound}</li>
                  <li>Test notes: {counts.testNotesFound}</li>
                  <li>Overall comments: {counts.overallCommentsFound}</li>
                </ul>
              </div>

              {derivedStatusCounts && (
                <div className="workbook-import-summary">
                  <p><strong>Status Derivation</strong></p>
                  <ul>
                    <li>Objectives with explicit workbook status: {derivedStatusCounts.fromWorkbook}</li>
                    <li>Objectives with imported content, no explicit status: {derivedStatusCounts.fromContent}</li>
                    <li>Objectives with no imported data: {derivedStatusCounts.noData}</li>
                  </ul>
                  {derivedStatusCounts.fromContent > 0 && (
                    <p className="muted">
                      Objectives with content but no explicit status are left as Unreviewed. Their notes, findings, and artifacts are still imported.
                    </p>
                  )}
                </div>
              )}

              {hasRecon && (
                <div className="workbook-import-summary">
                  <p><strong>Reconciliation</strong></p>

                  {hasAssignedTo && (
                    <div className="workbook-recon-section">
                      <p className="muted"><strong>Assigned To</strong></p>
                      <p className="workbook-recon-helper">
                        Choose whether each workbook assignee should be ignored, added as new, or mapped to an existing app value.
                      </p>
                      {recon.assignedTo.matched.length > 0 && (
                        <>
                          <p className="muted">Matched to existing:</p>
                          <ul>
                            {recon.assignedTo.matched.map(({ raw, resolvedTo }) => (
                              <li key={raw}>
                                <code>{raw}</code>{raw !== resolvedTo ? <> → <em>{resolvedTo}</em></> : null}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      {recon.assignedTo.unmatched.length > 0 && (
                        <>
                          <p className="workbook-recon-needs-review">Needs review</p>
                          {recon.assignedTo.unmatched.map(({ raw }) => {
                            const pool = assigneePool.filter((a) => a !== raw)
                            return (
                              <div key={raw} className="workbook-recon-card">
                                <div>
                                  <p className="workbook-recon-card-label">Workbook value</p>
                                  <p className="workbook-recon-card-value">{raw}</p>
                                </div>
                                <div className="workbook-recon-card-action">
                                  <p className="workbook-recon-card-label">Choose import action</p>
                                  <select
                                    className="workbook-recon-select"
                                    value={reconciliationChoices.assignedTo[raw] ?? raw}
                                    onChange={(e) => setReconciliationChoices((prev) => ({
                                      ...prev,
                                      assignedTo: { ...prev.assignedTo, [raw]: e.target.value },
                                    }))}
                                  >
                                    <option value="">Ignore — do not import</option>
                                    <option value={raw}>Add as New: {raw}</option>
                                    {pool.length > 0 && (
                                      <optgroup label="Use Existing">
                                        {pool.map((a) => (
                                          <option key={a} value={a}>Use Existing: {a}</option>
                                        ))}
                                      </optgroup>
                                    )}
                                  </select>
                                </div>
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
                  )}

                  {hasSources && (
                    <div className="workbook-recon-section">
                      <p className="muted"><strong>Inheritance Sources</strong></p>
                      <p className="workbook-recon-helper">
                        Choose whether each workbook inheritance source should be ignored, added as new, or mapped to an existing source.
                      </p>
                      {recon.inheritanceSources.matched.length > 0 && (
                        <>
                          <p className="muted">Matched to existing:</p>
                          <ul>
                            {recon.inheritanceSources.matched.map(({ raw, resolvedTo }) => (
                              <li key={raw}>
                                <code>{raw}</code>{raw !== resolvedTo ? <> → <em>{resolvedTo}</em></> : null}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      {recon.inheritanceSources.unmatched.length > 0 && (
                        <>
                          <p className="workbook-recon-needs-review">Needs review</p>
                          {recon.inheritanceSources.unmatched.map(({ raw, suggestion }) => {
                            const pool = sourcePool.filter((s) => s !== raw && s !== suggestion)
                            const defaultVal = reconciliationChoices.inheritanceSources[raw] ?? (suggestion ?? raw)
                            return (
                              <div key={raw} className="workbook-recon-card">
                                <div>
                                  <p className="workbook-recon-card-label">Workbook value</p>
                                  <p className="workbook-recon-card-value">{raw}</p>
                                </div>
                                <div className="workbook-recon-card-action">
                                  <p className="workbook-recon-card-label">Choose import action</p>
                                  <select
                                    className="workbook-recon-select"
                                    value={defaultVal}
                                    onChange={(e) => setReconciliationChoices((prev) => ({
                                      ...prev,
                                      inheritanceSources: { ...prev.inheritanceSources, [raw]: e.target.value },
                                    }))}
                                  >
                                    <option value="">Ignore — do not import</option>
                                    <option value={raw}>Add as New: {raw}</option>
                                    {suggestion && suggestion !== raw && (
                                      <option value={suggestion}>Add as Canonical: {suggestion}</option>
                                    )}
                                    {pool.length > 0 && (
                                      <optgroup label="Use Existing">
                                        {pool.map((s) => (
                                          <option key={s} value={s}>Use Existing: {s}</option>
                                        ))}
                                      </optgroup>
                                    )}
                                  </select>
                                </div>
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
                  )}

                  {!hasRecon && (
                    <p className="muted">No reconciliation needed.</p>
                  )}
                </div>
              )}

              {warnings.length > 0 && (
                <div className="workbook-import-warnings">
                  <p><strong>Warnings</strong></p>
                  <ul>
                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <p className="muted">
                Artifact references will be mapped to objectives but may need evidence tags added manually.
              </p>

              <div className="confirm-dialog-buttons">
                <button onClick={cancelWorkbookImport}>Cancel</button>
                <button onClick={() => confirmWorkbookImport('merge')}>
                  Merge Into Current Project
                </button>
                <button className="bulk-toolbar-danger" onClick={() => confirmWorkbookImport('new')}>
                  Import as New Project
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {pendingJsonImport && (() => {
        const noCategoriesSelected = !Object.values(importOptions.categories).some(Boolean)
        return (
          <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="restore-dialog-title">
            <div className="confirm-dialog">
              <h2 id="restore-dialog-title">Restore Project Backup?</h2>
              <p>This will restore your project data from the selected backup file.</p>
              <p>This does not modify:</p>
              <ul>
                <li>Control definitions</li>
                <li>Scoring metadata</li>
                <li>Evidence mappings</li>
                <li>Relationships</li>
              </ul>
              <p>Files are processed locally in your browser and are not uploaded to a server.</p>

              <details className="advanced-options-panel">
                <summary className="advanced-options-toggle">Advanced Options</summary>
                <div className="advanced-options-body">
                  <p className="advanced-options-hint">
                    Use advanced options to control which project data is restored and whether existing local work should be overwritten.
                  </p>
                  <div className="import-mode-group">
                    <p className="import-options-label">Import Mode</p>
                    <label className="import-option-row">
                      <input type="radio" name="importMode" value="replace"
                        checked={importOptions.mode === 'replace'}
                        onChange={() => setImportOptions((o) => ({ ...o, mode: 'replace' }))} />
                      <span>
                        <strong>Replace existing data</strong>
                        <span className="import-option-desc"> — Imported values overwrite existing local values for the selected categories.</span>
                      </span>
                    </label>
                    <label className="import-option-row">
                      <input type="radio" name="importMode" value="fill-empty"
                        checked={importOptions.mode === 'fill-empty'}
                        onChange={() => setImportOptions((o) => ({ ...o, mode: 'fill-empty' }))} />
                      <span>
                        <strong>Fill empty fields only</strong>
                        <span className="import-option-desc"> — Imported values are only written when the current local field is blank or default.</span>
                      </span>
                    </label>
                  </div>
                  <div className="import-category-section">
                    <p className="import-options-label">Import Categories</p>
                    <div className="import-category-grid">
                      {[
                        ['statuses',          'Assessment statuses'],
                        ['notes',             'Assessment notes'],
                        ['objectiveNotes',    'Objective notes'],
                        ['objectiveStatuses', 'Objective statuses'],
                        ['inheritance',       'Inheritance status'],
                        ['inheritanceSource', 'Inheritance source'],
                        ['assignments',       'Assignments'],
                        ['evidencePool',      'Evidence Pool'],
                        ['objectiveArtifacts','Objective Artifacts'],
                        ['objectiveResults',  'Objective Results'],
                      ].map(([key, label]) => (
                        <label key={key} className="import-option-row">
                          <input
                            type="checkbox"
                            checked={importOptions.categories[key]}
                            onChange={(e) => setImportOptions((o) => ({
                              ...o,
                              categories: { ...o.categories, [key]: e.target.checked },
                            }))}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </details>

              {noCategoriesSelected && (
                <p className="import-zero-categories-warning">
                  Select at least one data category to restore.
                </p>
              )}
              <div className="confirm-dialog-buttons">
                <button onClick={cancelJsonRestore}>Cancel</button>
                <button className="bulk-toolbar-danger" onClick={confirmJsonRestore} disabled={noCategoriesSelected}>
                  Restore Backup
                </button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}

export default Settings
