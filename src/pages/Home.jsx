import { useRef, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import controls from '../data/controls/index.js'
import evidenceTypes from '../data/evidence/index.js'
import relationships from '../data/relationships/index.js'
import { STATUSES, readStatus, writeStatus, STATUS_BADGE_CLASS } from '../utils/status'
import { readInheritanceSource, readInheritance, DEFAULT_INHERITANCE } from '../utils/inheritance'
// readAssignedTo removed — assignment coverage not rendered in dashboard view
import { writeNote } from '../utils/notes'
import { getScoringSearchTerms } from '../utils/scoring'
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
import { THEME_LIGHT, THEME_DARK, readTheme, writeTheme, applyTheme } from '../utils/theme'
import { PALETTES, readPalette, writePalette, applyPalette } from '../utils/themePalette'
import { APP_VERSION, APP_DEPLOYMENT } from '../utils/version'
import { listArtifacts } from '../utils/artifactRegistry'
import { readObjectiveStatus, OBJECTIVE_STATUS_NOT_MET } from '../utils/objectiveStatus'
import { hasObjectiveArtifacts } from '../utils/objectiveArtifacts'

const KNOWN_CONTROL_IDS = new Set(controls.map((c) => c.id))

// Provider names from the app's real provider registry — used as fallback
// options in the inheritance source reconciliation dropdown when the project
// has no existing sources yet.
const PROVIDER_NAMES = PROVIDERS.map((p) => p.name)

function getInheritanceSources(allControls) {
  const counts = new Map()
  for (const c of allControls) {
    const src = readInheritanceSource(c.id).trim()
    if (src) counts.set(src, (counts.get(src) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

const STATUS_NORMALIZER = STATUSES.reduce((acc, s) => {
  acc[s.toLowerCase()] = s
  return acc
}, {})

function normalizeStatus(raw) {
  const key = String(raw ?? '').trim().toLowerCase()
  return STATUS_NORMALIZER[key] ?? null
}

// =========================================================================
// Family definitions — order matches family dropdown
// =========================================================================

const FAMILIES = [
  { value: 'All', label: 'All Families' },
  { value: 'Access Control', label: 'Access Control' },
  { value: 'Awareness and Training', label: 'Awareness and Training' },
  { value: 'Audit and Accountability', label: 'Audit & Accountability' },
  { value: 'Configuration Management', label: 'Configuration Management' },
  { value: 'Identification and Authentication', label: 'Identification & Authentication' },
  { value: 'Incident Response', label: 'Incident Response' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Media Protection', label: 'Media Protection' },
  { value: 'Personnel Security', label: 'Personnel Security' },
  { value: 'Physical Protection', label: 'Physical Protection' },
  { value: 'Risk Assessment', label: 'Risk Assessment' },
  { value: 'Security Assessment', label: 'Security Assessment' },
  { value: 'System and Communications Protection', label: 'System & Communications Protection' },
  { value: 'System and Information Integrity', label: 'System and Information Integrity' },
]

// Maps STATUSES values → segment CSS modifier classes
const STATUS_SEGMENT_CLASS = {
  'MET': 'progress-bar-segment--met',
  'NOT MET': 'progress-bar-segment--not-met',
  'In Progress': 'progress-bar-segment--in-progress',
  'Not Started': 'progress-bar-segment--not-started',
}

// =========================================================================
// Quick Search helpers
// =========================================================================

const MIN_TERM_LENGTH = 2
const MAX_RESULTS_PER_GROUP = 5

function includes(str, term) {
  return typeof str === 'string' && str.toLowerCase().includes(term)
}

function searchControls(term) {
  const results = []
  for (const c of controls) {
    if (results.length >= MAX_RESULTS_PER_GROUP) break
    const hit =
      includes(c.id, term) ||
      includes(c.title, term) ||
      includes(c.family, term) ||
      includes(c.controlText, term) ||
      includes(c.plainEnglish, term) ||
      c.commonArtifacts?.some((a) => includes(a, term)) ||
      c.commonGaps?.some((g) => includes(g, term)) ||
      c.objectives?.some(
        (o) =>
          includes(o.text, term) ||
          includes(o.whatToLookFor, term) ||
          o.commonEvidence?.some((e) => includes(e, term))
      ) ||
      getScoringSearchTerms(c.id).some((t) => t.includes(term))
    if (hit) results.push(c)
  }
  return results
}

function searchEvidence(term) {
  const results = []
  for (const ev of evidenceTypes) {
    if (results.length >= MAX_RESULTS_PER_GROUP) break
    const hit =
      includes(ev.name, term) ||
      includes(ev.description, term) ||
      includes(ev.reasoning, term) ||
      ev.likelyControls?.some((id) => includes(id, term))
    if (hit) results.push(ev)
  }
  return results
}

function searchRelationships(term) {
  const results = []
  for (const r of relationships) {
    if (results.length >= MAX_RESULTS_PER_GROUP) break
    const hit =
      includes(r.sourceControl, term) ||
      includes(r.targetControl, term) ||
      includes(r.relationshipType, term) ||
      includes(r.reasoning, term)
    if (hit) results.push(r)
  }
  return results
}

// =========================================================================
// CSV import helpers
// =========================================================================

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { row.push(field); field = '' }
      else if (ch === '\r') {
        row.push(field); rows.push(row); row = []; field = ''
        if (text[i + 1] === '\n') i++
      } else if (ch === '\n') {
        row.push(field); rows.push(row); row = []; field = ''
      } else field += ch
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

function buildColumnMap(headerRow) {
  const norm = (s) => String(s ?? '').trim().toLowerCase()
  const idx = { controlId: -1, status: -1, notes: -1 }
  headerRow.forEach((h, i) => {
    const n = norm(h)
    if (n === 'control id') idx.controlId = i
    else if (n === 'status') idx.status = i
    else if (n === 'notes') idx.notes = i
  })
  if (idx.controlId === -1 || idx.status === -1) return null
  return idx
}

function stripFormulaGuard(value) {
  if (typeof value === 'string' && /^'[=+\-@]/.test(value)) return value.slice(1)
  return value
}

// =========================================================================
// Home component
// =========================================================================

// Build a library URL for a given status, optionally scoped to a family.
function libraryUrlForStatus(status, family) {
  const params = { status }
  if (family && family !== 'All') params.family = family
  return `/controls?${new URLSearchParams(params).toString()}`
}

function Home() {
  const csvFileRef = useRef(null)
  const jsonFileRef = useRef(null)
  const workbookFileRef = useRef(null)
  const [refreshKey, setRefreshKey] = useState(0)
  // eslint-disable-next-line no-unused-vars
  const [csvResult, setCsvResult] = useState(null)
  const [jsonResult, setJsonResult] = useState(null)
  const [workbookImportResult, setWorkbookImportResult] = useState(null)
  const [pendingWorkbookImport, setPendingWorkbookImport] = useState(null)
  const [workbookImportParsing, setWorkbookImportParsing] = useState(false)
  const [reconciliationChoices, setReconciliationChoices] = useState({ assignedTo: {}, inheritanceSources: {} })
  const [searchTerm, setSearchTerm] = useState('')
  // exportDialog: null (closed) | { mode: 'xlsx'|'json', osc: string, assessment: string }
  const [exportDialog, setExportDialog] = useState(null)
  const [xlsxResult, setXlsxResult] = useState(null)
  const [pendingJsonImport, setPendingJsonImport] = useState(null)
  const [importOptions, setImportOptions] = useState(DEFAULT_IMPORT_OPTIONS)
  // wipeStage: null | 'confirm1' | 'confirm2'
  const [wipeStage, setWipeStage] = useState(null)
  const [wipeInput, setWipeInput] = useState('')
  const [wipeSuccess, setWipeSuccess] = useState(false)
  const [lastBackup, setLastBackup] = useState(() => readLastBackup())
  const [theme, setTheme] = useState(() => readTheme())
  const [palette, setPalette] = useState(() => readPalette())
  const [sourceLimit, setSourceLimit] = useState('5')

  const toggleTheme = () => {
    const next = theme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT
    writeTheme(next)
    applyTheme(next)
    setTheme(next)
  }

  const handlePaletteChange = (e) => {
    const next = e.target.value
    writePalette(next)
    applyPalette(next)
    setPalette(next)
    // Palette selection always activates dark mode — palettes only apply in dark context
    if (theme !== THEME_DARK) {
      writeTheme(THEME_DARK)
      applyTheme(THEME_DARK)
      setTheme(THEME_DARK)
    }
  }

  const openExportDialog = (mode) => {
    const meta = readExportMeta()
    setExportDialog({ mode, osc: meta.osc, assessment: meta.assessment })
  }
  const closeExportDialog = () => setExportDialog(null)

  // -----------------------------------------------------------------------
  // Dashboard metrics — objectives, artifacts, family progress, attention
  // -----------------------------------------------------------------------

  const dashMetrics = useMemo(() => {
    // Objective counts across all controls
    let totalObjectives = 0
    let objMet = 0, objNotMet = 0, objUnreviewed = 0
    for (const c of controls) {
      for (const obj of c.objectives ?? []) {
        totalObjectives++
        const s = readObjectiveStatus(c.id, obj.id)
        if (s === 'MET') objMet++
        else if (s === OBJECTIVE_STATUS_NOT_MET) objNotMet++
        else objUnreviewed++
      }
    }

    // Artifact health
    const allArtifacts = listArtifacts()
    const totalArtifacts = allArtifacts.length
    const taggedArtifacts = allArtifacts.filter((a) => a.tags.length > 0).length
    const untaggedArtifacts = totalArtifacts - taggedArtifacts

    // Control-level status counts (all controls, not family-filtered)
    const allCounts = { 'MET': 0, 'NOT MET': 0, 'In Progress': 0, 'Not Started': 0 }
    for (const c of controls) allCounts[readStatus(c.id)] += 1

    // Needs attention
    const controlsWithNotMet = controls.filter((c) =>
      c.objectives?.some((obj) => readObjectiveStatus(c.id, obj.id) === OBJECTIVE_STATUS_NOT_MET)
    )
    const controlsNoArtifacts = controls.filter((c) => !hasObjectiveArtifacts(c))

    // Family progress (all controls, status-segmented)
    const familyProgress = FAMILIES.slice(1).map((f) => {
      const fc = controls.filter((c) => c.family === f.value)
      const fc_counts = { 'MET': 0, 'NOT MET': 0, 'In Progress': 0, 'Not Started': 0 }
      for (const c of fc) fc_counts[readStatus(c.id)] += 1
      const pct = fc.length === 0 ? 0 : Math.round((fc_counts['MET'] / fc.length) * 100)
      return { label: f.label, value: f.value, total: fc.length, counts: fc_counts, pct }
    })

    // Continue Assessment — readiness score for non-MET controls.
    // Score is informational only; not a compliance indicator.
    const continueItems = controls
      .filter((c) => readStatus(c.id) !== 'MET')
      .map((c) => {
        let score = 0
        const hints = []
        // Inheritance set
        if (readInheritance(c.id) !== DEFAULT_INHERITANCE) { score += 10; hints.push('inheritance set') }
        // Artifacts assigned
        const hasArt = hasObjectiveArtifacts(c)
        if (hasArt) { score += 30; hints.push('artifacts assigned') }
        // Any objective reviewed
        let reviewed = 0
        for (const obj of c.objectives ?? []) {
          if (readObjectiveStatus(c.id, obj.id) !== 'Unreviewed') reviewed++
        }
        if (reviewed > 0) { score += 20; hints.push(`${reviewed} obj reviewed`) }
        // Control already in-progress or not-met bumped over not-started
        const st = readStatus(c.id)
        if (st === 'In Progress') score += 25
        else if (st === 'NOT MET') score += 15
        return { control: c, score, hints: hints.slice(0, 2) }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)

    return {
      totalObjectives, objMet, objNotMet, objUnreviewed,
      totalArtifacts, taggedArtifacts, untaggedArtifacts,
      controlsWithNotMet, controlsNoArtifacts,
      allCounts,
      familyProgress, continueItems,
    }
  // refreshKey forces recomputation after import
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  // -----------------------------------------------------------------------
  // Quick Search
  // -----------------------------------------------------------------------

  const term = searchTerm.trim().toLowerCase()
  const hasResults = term.length >= MIN_TERM_LENGTH
  const controlResults = hasResults ? searchControls(term) : []
  const evidenceResults = hasResults ? searchEvidence(term) : []
  const relResults = hasResults ? searchRelationships(term) : []
  const anyResults = controlResults.length > 0 || evidenceResults.length > 0 || relResults.length > 0

  // -----------------------------------------------------------------------
  // Export handlers
  // -----------------------------------------------------------------------

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

  // eslint-disable-next-line no-unused-vars
  const handleCsvImportClick = () => csvFileRef.current?.click()

  const CSV_MAX_BYTES = 1 * 1024 * 1024  // 1 MB
  const CSV_ALLOWED_TYPES = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain', ''])

  const handleCsvFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvResult({ ok: false, message: 'Invalid file. Please select a .csv file.' })
      return
    }
    if (!CSV_ALLOWED_TYPES.has(file.type)) {
      setCsvResult({ ok: false, message: `Unexpected file type "${file.type}". Please select a valid CSV file.` })
      return
    }
    if (file.size > CSV_MAX_BYTES) {
      setCsvResult({ ok: false, message: 'File too large. CSV imports must be under 1 MB.' })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try { processCsv(String(reader.result ?? '')) }
      catch (err) { setCsvResult({ ok: false, message: `Import failed: ${err.message}` }) }
    }
    reader.onerror = () => setCsvResult({ ok: false, message: 'Could not read file.' })
    reader.readAsText(file)
  }

  const processCsv = (text) => {
    const rows = parseCsv(text)
    if (rows.length === 0) { setCsvResult({ ok: false, message: 'CSV is empty.' }); return }
    const cols = buildColumnMap(rows[0])
    if (!cols) {
      setCsvResult({ ok: false, message: 'CSV is missing required columns ("Control ID" and "Status").' })
      return
    }
    let imported = 0, skippedId = 0, skippedStatus = 0, notesWritten = 0
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (row.every((cell) => String(cell ?? '').trim() === '')) continue
      const id = String(row[cols.controlId] ?? '').trim()
      if (!id || !KNOWN_CONTROL_IDS.has(id)) { skippedId++; continue }
      const status = normalizeStatus(row[cols.status])
      if (!status) { skippedStatus++; continue }
      writeStatus(id, status)
      imported++
      if (cols.notes !== -1 && row[cols.notes] !== undefined) {
        const note = stripFormulaGuard(String(row[cols.notes] ?? ''))
        writeNote(id, note)
        if (note.trim() !== '') notesWritten++
      }
    }
    setCsvResult({
      ok: true,
      message: `Imported ${imported} status update${imported === 1 ? '' : 's'}` +
        (notesWritten > 0 ? ` (${notesWritten} with notes)` : '') +
        (skippedId > 0 ? `, skipped ${skippedId} unknown ID${skippedId === 1 ? '' : 's'}` : '') +
        (skippedStatus > 0 ? `, skipped ${skippedStatus} invalid status${skippedStatus === 1 ? '' : 'es'}` : '') + '.',
    })
    setRefreshKey((k) => k + 1)
  }

  // -----------------------------------------------------------------------
  // JSON project state handlers
  // -----------------------------------------------------------------------

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
        // Pre-validate structure before showing the confirm dialog so errors
        // surface immediately rather than after the user clicks Restore Backup
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
      setRefreshKey((k) => k + 1)
    } catch {
      setJsonResult({ ok: false, message: 'Restore failed — unexpected error.' })
    } finally {
      setPendingJsonImport(null)
    }
  }

  const cancelJsonRestore = () => setPendingJsonImport(null)

  // -----------------------------------------------------------------------
  // Assessment workbook import handlers
  // -----------------------------------------------------------------------

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
          // Initialize reconciliation choices with conservative defaults:
          // unmatched assignees default to add-as-new (raw value),
          // unmatched sources default to alias suggestion or add-as-new (raw value).
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
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setWorkbookImportResult({ ok: false, message: `Import failed: ${err.message}` })
      setPendingWorkbookImport(null)
    }
  }

  const cancelWorkbookImport = () => {
    setPendingWorkbookImport(null)
    setReconciliationChoices({ assignedTo: {}, inheritanceSources: {} })
  }

  // -----------------------------------------------------------------------
  // Wipe project state handlers
  // -----------------------------------------------------------------------

  const handleWipeConfirmed = () => {
    wipeProjectState()
    setWipeStage(null)
    setWipeInput('')
    setWipeSuccess(true)
    setRefreshKey((k) => k + 1)
    setLastBackup(null)
    setJsonResult(null)
    setTimeout(() => setWipeSuccess(false), 5000)
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const {
    totalObjectives, objMet, objNotMet, objUnreviewed,
    totalArtifacts, taggedArtifacts, untaggedArtifacts,
    controlsWithNotMet, controlsNoArtifacts,
    allCounts,
    familyProgress, continueItems,
  } = dashMetrics

  const allTotal = controls.length

  return (
    <div className="home-dash">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="home-dash-header">
        <div>
          <h1 className="home-dash-title">Assessment Dashboard</h1>
          <p className="muted home-dash-subtitle">CMMC Companion — local assessment workspace</p>
        </div>
        <div className="home-dash-header-actions">
          <input
            type="text"
            className="home-search-input"
            placeholder="Quick search controls, evidence, relationships…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Quick search"
          />
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === THEME_LIGHT ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === THEME_LIGHT ? 'Dark' : 'Light'}
          </button>
        </div>
      </div>

      {/* ── Quick Search Results (drops below header when active) ─────────── */}
      {hasResults && (
        <div className="home-search-results-wrap">
          {!anyResults && (
            <p className="muted">No results for &ldquo;{searchTerm.trim()}&rdquo;.</p>
          )}
          {anyResults && (
            <div className="quick-search-results">
              {controlResults.length > 0 && (
                <div className="quick-search-group">
                  <p className="quick-search-group-label">Controls</p>
                  <ul className="control-list">
                    {controlResults.map((c) => {
                      const s = readStatus(c.id)
                      return (
                        <li key={c.id}>
                          <Link to={`/controls/${encodeURIComponent(c.id)}`} className="control-list-link">
                            <span className="mono">{c.id}</span>
                            <span>— {c.title}</span>
                            <span className="muted">({c.family})</span>
                            <span className={`status-badge ${STATUS_BADGE_CLASS[s]}`}>{s}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {evidenceResults.length > 0 && (
                <div className="quick-search-group">
                  <p className="quick-search-group-label">Evidence</p>
                  <ul className="control-list">
                    {evidenceResults.map((ev) => (
                      <li key={ev.name}>
                        <Link to={`/evidence?search=${encodeURIComponent(ev.name)}`} className="control-list-link">
                          <span>{ev.name}</span>
                          <span className="muted">— {ev.likelyControls?.length ?? 0} control{ev.likelyControls?.length === 1 ? '' : 's'}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {relResults.length > 0 && (
                <div className="quick-search-group">
                  <p className="quick-search-group-label">Relationships</p>
                  <ul className="control-list">
                    {relResults.map((r, i) => (
                      <li key={i}>
                        <Link to={`/relationships?control=${encodeURIComponent(r.sourceControl)}`} className="control-list-link">
                          <span className="mono">{r.sourceControl}</span>
                          <span className="muted">→</span>
                          <span className="mono">{r.targetControl}</span>
                          <span className="muted">({r.relationshipType})</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Top metric cards ───────────────────────────────────────────────── */}
      <div className="home-metric-row">
        {/* Controls */}
        <div className="home-metric-card">
          <div className="home-metric-card-title">Controls <span className="home-metric-card-total">/ {controls.length}</span></div>
          <div className="home-metric-stat-list">
            <Link to={libraryUrlForStatus('MET', 'All')} className="home-metric-stat home-metric-stat--met">
              <span className="home-metric-stat-val">{allCounts['MET']}</span>
              <span className="home-metric-stat-label">Met</span>
            </Link>
            <Link to={libraryUrlForStatus('In Progress', 'All')} className="home-metric-stat home-metric-stat--ip">
              <span className="home-metric-stat-val">{allCounts['In Progress']}</span>
              <span className="home-metric-stat-label">In Progress</span>
            </Link>
            <Link to={libraryUrlForStatus('NOT MET', 'All')} className="home-metric-stat home-metric-stat--nm">
              <span className="home-metric-stat-val">{allCounts['NOT MET']}</span>
              <span className="home-metric-stat-label">Not Met</span>
            </Link>
            <Link to={libraryUrlForStatus('Not Started', 'All')} className="home-metric-stat home-metric-stat--ns">
              <span className="home-metric-stat-val">{allCounts['Not Started']}</span>
              <span className="home-metric-stat-label">Not Started</span>
            </Link>
          </div>
        </div>

        {/* Objectives */}
        <div className="home-metric-card">
          <div className="home-metric-card-title">Objectives <span className="home-metric-card-total">/ {totalObjectives}</span></div>
          <div className="home-metric-stat-list">
            <span className="home-metric-stat home-metric-stat--met">
              <span className="home-metric-stat-val">{objMet}</span>
              <span className="home-metric-stat-label">Met</span>
            </span>
            <span className="home-metric-stat home-metric-stat--nm">
              <span className="home-metric-stat-val">{objNotMet}</span>
              <span className="home-metric-stat-label">Not Met</span>
            </span>
            <span className="home-metric-stat home-metric-stat--ns">
              <span className="home-metric-stat-val">{objUnreviewed}</span>
              <span className="home-metric-stat-label">Unreviewed</span>
            </span>
          </div>
        </div>

        {/* Artifacts */}
        <div className="home-metric-card">
          <div className="home-metric-card-title">Artifacts <span className="home-metric-card-total">/ {totalArtifacts}</span></div>
          <div className="home-metric-stat-list">
            <span className="home-metric-stat home-metric-stat--met">
              <span className="home-metric-stat-val">{taggedArtifacts}</span>
              <span className="home-metric-stat-label">Tagged</span>
            </span>
            <span className={`home-metric-stat${untaggedArtifacts > 0 ? ' home-metric-stat--warn' : ' home-metric-stat--ns'}`}>
              <span className="home-metric-stat-val">{untaggedArtifacts}</span>
              <span className="home-metric-stat-label">Untagged</span>
            </span>
          </div>
          {totalArtifacts === 0 && (
            <p className="home-metric-card-hint muted">Add artifacts via Control Detail pages.</p>
          )}
        </div>

      </div>

      {/* ── Dashboard body ─────────────────────────────────────────────────── */}
      <div className="home-dash-body">

        {/* Row 1: Overall Assessment Progress + Family Progress */}
        <div className="home-twin-row home-twin-row--progress">

          {/* Overall Assessment Progress — conic-gradient donut + legend */}
          {(() => {
            const metPct = allTotal === 0 ? 0 : (allCounts['MET'] / allTotal) * 100
            const ipPct  = allTotal === 0 ? 0 : (allCounts['In Progress'] / allTotal) * 100
            const nmPct  = allTotal === 0 ? 0 : (allCounts['NOT MET'] / allTotal) * 100
            const s1 = metPct, s2 = s1 + ipPct, s3 = s2 + nmPct
            const donutBg = allTotal === 0
              ? 'conic-gradient(var(--color-border) 0% 100%)'
              : `conic-gradient(var(--color-met) 0% ${s1}%, var(--color-in-progress) ${s1}% ${s2}%, var(--color-not-met) ${s2}% ${s3}%, var(--color-border) ${s3}% 100%)`
            const metPctRound = Math.round(metPct)
            return (
              <div className="home-dash-card home-dash-card--stretch">
                <h2 className="home-dash-card-heading">Overall Assessment Progress</h2>
                <div className="home-progress-inner">
                  <div className="home-donut-wrap" aria-hidden="true">
                    <div className="home-donut" style={{ background: donutBg }} />
                    <div className="home-donut-center">
                      <span className="home-donut-pct">{metPctRound}%</span>
                      <span className="home-donut-label">Met</span>
                    </div>
                  </div>
                  <div className="home-progress-legend">
                    {[
                      ['MET',         'Met',         'home-legend-dot--met'],
                      ['In Progress', 'In Progress', 'home-legend-dot--ip'],
                      ['NOT MET',     'Not Met',     'home-legend-dot--nm'],
                      ['Not Started', 'Not Started', 'home-legend-dot--ns'],
                    ].map(([key, label, dotClass]) => {
                      const count = allCounts[key] ?? 0
                      const pct   = allTotal === 0 ? 0 : Math.round((count / allTotal) * 100)
                      return (
                        <Link key={key} to={libraryUrlForStatus(key, 'All')} className="home-legend-row">
                          <span className={`home-legend-dot ${dotClass}`} />
                          <span className="home-legend-label">{label}</span>
                          <span className="home-legend-count">{count}</span>
                          <span className="home-legend-pct">{pct}%</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Family Progress — segmented bars, order: Met → In Progress → Not Met → Not Started */}
          <div className="home-dash-card">
            <div className="home-dash-card-header">
              <h2 className="home-dash-card-heading">Family Progress</h2>
              <Link to="/controls" className="home-dash-card-link">View all →</Link>
            </div>
            <div className="home-family-list">
              {familyProgress.map((f) => (
                <div key={f.value} className="home-family-row">
                  <Link to={`/controls?family=${encodeURIComponent(f.value)}`} className="home-family-name" title={f.label}>
                    {f.label}
                  </Link>
                  <div className="home-family-bar-wrap" aria-hidden="true">
                    {f.total > 0 && ['MET', 'In Progress', 'NOT MET', 'Not Started'].map((st) => {
                      const pct = (f.counts[st] / f.total) * 100
                      if (pct === 0) return null
                      return (
                        <div
                          key={st}
                          className={`home-family-seg home-family-seg--${STATUS_SEGMENT_CLASS[st]?.replace('progress-bar-segment--', '') ?? 'not-started'}`}
                          style={{ width: `${pct}%` }}
                          title={`${st}: ${f.counts[st]}`}
                        />
                      )
                    })}
                  </div>
                  <span className="home-family-pct">{f.pct}%</span>
                </div>
              ))}
            </div>
          </div>

        </div>{/* /Row 1 */}

        {/* Row 2: Needs Attention + Inheritance Sources */}
        <div className="home-twin-row home-twin-row--secondary">

          {/* Needs Attention */}
          <div className="home-dash-card">
            <h2 className="home-dash-card-heading">Needs Attention</h2>
            <ul className="home-attention-list">
              <li className="home-attention-item">
                <span className="home-attention-label">Controls not started</span>
                <Link
                  to={libraryUrlForStatus('Not Started', 'All')}
                  className={`home-attention-count${allCounts['Not Started'] > 0 ? ' home-attention-count--warn' : ''}`}
                >
                  {allCounts['Not Started']}
                </Link>
              </li>
              <li className="home-attention-item">
                <span className="home-attention-label">Controls with any Not Met objective</span>
                <Link
                  to={libraryUrlForStatus('NOT MET', 'All')}
                  className={`home-attention-count${controlsWithNotMet.length > 0 ? ' home-attention-count--alert' : ''}`}
                >
                  {controlsWithNotMet.length}
                </Link>
              </li>
              <li className="home-attention-item">
                <span className="home-attention-label">Controls with no artifacts</span>
                <Link
                  to="/controls"
                  className={`home-attention-count${controlsNoArtifacts.length > 20 ? ' home-attention-count--alert' : ''}`}
                >
                  {controlsNoArtifacts.length}
                </Link>
              </li>
              <li className="home-attention-item">
                <span className="home-attention-label">Untagged artifacts</span>
                <Link
                  to="/artifact-map"
                  className={`home-attention-count${untaggedArtifacts > 0 ? ' home-attention-count--warn' : ''}`}
                >
                  {untaggedArtifacts}
                </Link>
              </li>
            </ul>
          </div>

          {/* Inheritance Sources */}
          {(() => {
            const allSources = getInheritanceSources(controls)
            if (allSources.length === 0) return (
              <div className="home-dash-card home-dash-card--empty-state">
                <h2 className="home-dash-card-heading">Inheritance Sources</h2>
                <p className="muted home-empty-state-text">No inheritance sources labeled.</p>
              </div>
            )
            const displayed = sourceLimit === 'All' ? allSources : allSources.slice(0, Number(sourceLimit))
            const max = allSources[0]?.count ?? 1
            return (
              <div className="home-dash-card">
                <div className="home-dash-card-header">
                  <h2 className="home-dash-card-heading">Inheritance Sources</h2>
                  <select value={sourceLimit} onChange={(e) => setSourceLimit(e.target.value)} aria-label="Show top N inheritance sources">
                    <option value="5">Top 5</option>
                    <option value="10">Top 10</option>
                    <option value="All">All</option>
                  </select>
                </div>
                <div className="inh-source-list">
                  {displayed.map(({ name, count }) => (
                    <Link key={name} to={`/controls?inheritanceSource=${encodeURIComponent(name)}`} className="inh-source-row" title={`View controls inherited from ${name}`}>
                      <span className="inh-source-name">{name}</span>
                      <div className="inh-source-bar-wrap" aria-hidden="true">
                        <div className="inh-source-bar" style={{ width: `${Math.round((count / max) * 100)}%` }} />
                      </div>
                      <span className="inh-source-count">{count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })()}

        </div>{/* /Row 2 */}

        {/* Row 3: Continue Review */}
        <div className="home-dash-card">
          <div className="home-dash-card-header">
            <h2 className="home-dash-card-heading">Continue Review</h2>
            <Link to="/controls" className="home-dash-card-link">Open Library →</Link>
          </div>
          <p className="muted home-continue-hint">Controls with review work already started, ordered by progress.</p>
          {continueItems.length === 0 ? (
            <p className="muted">All controls are Met or no work has been started.</p>
          ) : (
            <ul className="home-continue-list">
              {continueItems.map(({ control: c, hints }) => {
                const s = readStatus(c.id)
                return (
                  <li key={c.id} className="home-continue-item">
                    <Link to={`/controls/${encodeURIComponent(c.id)}`} className="home-continue-link">
                      <span className="mono home-continue-id">{c.id}</span>
                      <span className="home-continue-title">{c.title}</span>
                      <span className={`status-badge ${STATUS_BADGE_CLASS[s]}`}>{s}</span>
                    </Link>
                    {hints.length > 0 && (
                      <p className="home-continue-hints muted">{hints.join(' · ')}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Row 4: Project Actions */}
        <div className="home-dash-card">
          <h2 className="home-dash-card-heading">Project Actions</h2>
          <ul className="home-actions-list home-actions-list--inline">
            <li>
              <button className="home-action-btn" onClick={() => openExportDialog('json')}>Export Project JSON</button>
            </li>
            <li>
              <button className="home-action-btn" onClick={handleJsonImportClick}>Import Project JSON</button>
              <input ref={jsonFileRef} type="file" accept=".json,application/json" onChange={handleJsonFileChange} style={{ display: 'none' }} />
            </li>
            <li>
              <button className="home-action-btn" onClick={() => openExportDialog('xlsx')}>Export Assessment Workbook</button>
            </li>
            <li>
              <button
                className="home-action-btn"
                onClick={handleWorkbookImportClick}
                disabled={workbookImportParsing}
              >
                {workbookImportParsing ? 'Parsing…' : 'Import Assessment Workbook'}
              </button>
              <input
                ref={workbookFileRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleWorkbookFileChange}
                style={{ display: 'none' }}
              />
            </li>
          </ul>
          {/* hidden — CSV import kept for consulting workflow, not exposed here */}
          <input ref={csvFileRef} type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} style={{ display: 'none' }} />
          {xlsxResult && (
            <div className="home-actions-feedback">
              <p className={`feedback ${xlsxResult.ok ? 'feedback--ok' : 'feedback--error'}`}>{xlsxResult.message}</p>
            </div>
          )}
          {jsonResult && (
            <div className="home-actions-feedback">
              <p className={`feedback ${jsonResult.ok ? 'feedback--ok' : 'feedback--error'}`}>{jsonResult.message}</p>
            </div>
          )}
          {workbookImportResult && (
            <div className="home-actions-feedback">
              <p className={`feedback ${workbookImportResult.ok ? 'feedback--ok' : 'feedback--error'}`}>{workbookImportResult.message}</p>
            </div>
          )}
          {wipeSuccess && (
            <div className="home-actions-feedback">
              <p className="feedback feedback--ok">Project wiped. All local assessment data has been cleared.</p>
            </div>
          )}

          <div className="home-actions-divider home-actions-divider--danger" />
          <div className="home-actions-danger-zone">
            <p className="home-actions-danger-label">Danger Zone</p>
            <ul className="home-actions-list home-actions-list--inline">
              <li>
                <button
                  className="home-action-btn home-action-btn--danger"
                  onClick={() => { setWipeStage('confirm1'); setWipeInput('') }}
                >
                  Wipe Entire Project
                </button>
              </li>
            </ul>
          </div>

          <div className="home-actions-divider" />
          <div className="home-actions-instructions">
            <p className="home-actions-instructions-text">
              <strong>Export Project JSON</strong> creates a portable backup of your current local project state.{' '}
              <strong>Import Project JSON</strong> restores a previously exported project file into this browser.{' '}
              <strong>Export Assessment Workbook</strong> populates the official CMMC Level 2 Assessment Results Template with current project data.{' '}
              <strong>Import Assessment Workbook</strong> imports an existing official CMMC Assessment Results Template workbook into this local project.
            </p>
            <p className="home-actions-instructions-note muted">
              Use Project JSON for backup and restore. Use the workbook export when preparing assessment documentation.
            </p>
          </div>
          <div className="home-actions-meta-row">
            <p className="home-actions-meta muted">Last backup: <strong style={{ fontWeight: 500 }}>{formatLastBackup(lastBackup)}</strong></p>
          </div>

          <div className="home-actions-divider" />
          <div className="home-appearance">
            <p className="home-appearance-label">Appearance</p>
            <p className="home-appearance-helper">Choose a muted color palette for the local workspace. Applies in dark mode only.</p>
            <div className="home-appearance-row">
              <select
                className="home-appearance-select"
                value={palette}
                onChange={handlePaletteChange}
                aria-label="Theme palette"
              >
                {PALETTES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <span className="home-appearance-swatches" aria-hidden="true">
                {(PALETTES.find((p) => p.value === palette)?.swatches ?? []).map((hex, i) => (
                  <span key={i} className="home-appearance-swatch" style={{ background: hex }} />
                ))}
              </span>
            </div>
          </div>
        </div>

      </div>{/* /home-dash-body */}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="home-dash-footer">
        <p className="muted">Version {APP_VERSION} — {APP_DEPLOYMENT}</p>
        <p className="muted">Copyright &copy; 2026 Vincent Azada. Independent project. All rights reserved.</p>
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
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

      {/* ── Wipe Stage 1 ─────────────────────────────────────────────────── */}
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

      {/* ── Wipe Stage 2 ─────────────────────────────────────────────────── */}
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

        // Build augmented option pools for the "Use Existing" optgroup.
        // Layer order (all de-duplicated, sorted):
        // Pool sources: current project values + workbook values + real provider list (sources only)
        const dedupe = (arr) => [...new Set(arr.filter(Boolean))].sort()
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

export default Home
