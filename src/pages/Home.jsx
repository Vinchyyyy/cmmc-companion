import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import controls from '../data/controls/index.js'
import evidenceTypes from '../data/evidence/index.js'
import relationships from '../data/relationships/index.js'
import { STATUSES, readStatus, writeStatus, STATUS_BADGE_CLASS } from '../utils/status'
import { readNote, writeNote } from '../utils/notes'
import { getScoringSearchTerms } from '../utils/scoring'
import {
  exportProjectState,
  importProjectState,
  downloadProjectJson,
  SCHEMA_VERSION,
} from '../utils/projectState'
import { readExportMeta, writeExportMeta, buildExportFilename, readLastBackup, writeLastBackup, formatLastBackup } from '../utils/exportMeta'
import { THEME_LIGHT, THEME_DARK, readTheme, writeTheme, applyTheme } from '../utils/theme'
import { APP_VERSION, APP_DEPLOYMENT } from '../utils/version'

const KNOWN_CONTROL_IDS = new Set(controls.map((c) => c.id))

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
// CSV export helpers
// =========================================================================

function escapeCsvField(value) {
  let str = String(value ?? '')
  if (/^[=+\-@]/.test(str)) str = `'${str}`
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function todayStamp() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function handleCsvExport(filename) {
  const headers = ['Control ID', 'Family', 'Title', 'Status', 'Notes']
  const rows = controls.map((c) => [
    c.id, c.family, c.title, readStatus(c.id), readNote(c.id),
  ])
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvField).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename ?? `cmmc-status-export-${todayStamp()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 0)
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
  const [refreshKey, setRefreshKey] = useState(0)
  const [csvResult, setCsvResult] = useState(null)
  const [jsonResult, setJsonResult] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFamily, setSelectedFamily] = useState('All')
  // exportDialog: null (closed) | { mode: 'csv'|'json', osc: string, assessment: string }
  const [exportDialog, setExportDialog] = useState(null)
  const [pendingJsonImport, setPendingJsonImport] = useState(null)
  const [lastBackup, setLastBackup] = useState(() => readLastBackup())
  const [theme, setTheme] = useState(() => readTheme())

  const toggleTheme = () => {
    const next = theme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT
    writeTheme(next)
    applyTheme(next)
    setTheme(next)
  }

  const openExportDialog = (mode) => {
    const meta = readExportMeta()
    setExportDialog({ mode, osc: meta.osc, assessment: meta.assessment })
  }
  const closeExportDialog = () => setExportDialog(null)

  // -----------------------------------------------------------------------
  // Progress stats — recomputed on every render (refreshKey forces re-render
  // after import; selectedFamily narrows the control set)
  // -----------------------------------------------------------------------

  // eslint-disable-next-line no-unused-vars
  const _refresh = refreshKey

  const familyControls = selectedFamily === 'All'
    ? controls
    : controls.filter((c) => c.family === selectedFamily)

  const counts = { 'MET': 0, 'NOT MET': 0, 'In Progress': 0, 'Not Started': 0 }
  for (const c of familyControls) counts[readStatus(c.id)] += 1
  const total = familyControls.length
  const percentComplete = total === 0 ? 0 : Math.round((counts['MET'] / total) * 100)

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
  // CSV handlers
  // -----------------------------------------------------------------------

  const confirmExport = () => {
    const { mode, osc, assessment } = exportDialog
    writeExportMeta(osc, assessment)
    if (mode === 'csv') {
      const filename = buildExportFilename(osc, assessment, 'AssessmentProgress', 'csv')
      handleCsvExport(filename)
      setCsvResult(null)
    } else {
      const filename = buildExportFilename(osc, assessment, 'ProjectBackup', 'json')
      const state = exportProjectState(controls)
      downloadProjectJson(state, filename)
      writeLastBackup()
      setLastBackup(readLastBackup())
      setJsonResult({ ok: true, message: `Project exported — ${controls.length} controls, schema v${SCHEMA_VERSION}.` })
    }
    closeExportDialog()
  }

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
        if (parsed.schemaVersion !== SCHEMA_VERSION) {
          setJsonResult({ ok: false, message: `Unsupported schema version ${parsed.schemaVersion}. Expected version ${SCHEMA_VERSION}.` }); return
        }
        if (!Array.isArray(parsed.controls)) {
          setJsonResult({ ok: false, message: 'Invalid JSON: "controls" must be an array.' }); return
        }
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
      const summary = importProjectState(pendingJsonImport, controls)
      if (!summary.ok) { setJsonResult({ ok: false, message: summary.error }); return }
      setJsonResult({
        ok: true,
        message: `Restored ${summary.controlsProcessed} controls — ` +
          `${summary.statusesWritten} status${summary.statusesWritten === 1 ? '' : 'es'}, ` +
          `${summary.notesWritten} note${summary.notesWritten === 1 ? '' : 's'}, ` +
          `${summary.objectiveNotesWritten} objective note${summary.objectiveNotesWritten === 1 ? '' : 's'}` +
          (summary.skippedUnknownId > 0 ? `, skipped ${summary.skippedUnknownId} unknown ID${summary.skippedUnknownId === 1 ? '' : 's'}` : '') + '.',
      })
      setRefreshKey((k) => k + 1)
    } catch {
      setJsonResult({ ok: false, message: 'Restore failed — unexpected error.' })
    } finally {
      setPendingJsonImport(null)
    }
  }

  const cancelJsonRestore = () => setPendingJsonImport(null)

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="page">
      <h1>Home</h1>
      <p className="muted">Welcome. Use the navigation above to move between pages.</p>

      {/* ---------------------------------------------------------------- */}
      {/* Quick Search                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <h2>Quick Search</h2>
        <div className="filter-row">
          <input
            type="text"
            placeholder="Search controls, evidence, or relationships…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: '1 1 100%' }}
          />
        </div>

        {hasResults && !anyResults && (
          <p className="muted">No results found for &ldquo;{searchTerm.trim()}&rdquo;.</p>
        )}

        {hasResults && anyResults && (
          <div className="quick-search-results">
            {controlResults.length > 0 && (
              <div className="quick-search-group">
                <p className="quick-search-group-label">Controls</p>
                <ul className="control-list">
                  {controlResults.map((c) => {
                    const status = readStatus(c.id)
                    return (
                      <li key={c.id}>
                        <Link
                          to={`/controls/${encodeURIComponent(c.id)}`}
                          className="control-list-link"
                        >
                          <span className="mono">{c.id}</span>
                          <span>— {c.title}</span>
                          <span className="muted">({c.family})</span>
                          <span className={`status-badge ${STATUS_BADGE_CLASS[status]}`}>{status}</span>
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
                      <Link
                        to={`/evidence?search=${encodeURIComponent(ev.name)}`}
                        className="control-list-link"
                      >
                        <span>{ev.name}</span>
                        <span className="muted">
                          — {ev.likelyControls?.length ?? 0} control{ev.likelyControls?.length === 1 ? '' : 's'}
                        </span>
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
                      <Link
                        to={`/relationships?control=${encodeURIComponent(r.sourceControl)}`}
                        className="control-list-link"
                      >
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
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Assessment Progress                                               */}
      {/* ---------------------------------------------------------------- */}
      <section>
        {/* Header row: heading + family selector */}
        <div className="progress-header">
          <h2 style={{ margin: 0 }}>Assessment Progress</h2>
          <select
            value={selectedFamily}
            onChange={(e) => setSelectedFamily(e.target.value)}
            className="progress-family-select"
          >
            {FAMILIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Summary text */}
        <p style={{ marginTop: 'var(--space-3)' }}>
          <strong>{percentComplete}% complete</strong>
          {' '}<span className="muted">
            ({counts['MET']} of {total} control{total === 1 ? '' : 's'} marked MET
            {selectedFamily !== 'All' ? ` in ${selectedFamily}` : ''})
          </span>
        </p>

        {/* Stacked progress bar */}
        {total > 0 ? (
          <div className="progress-bar" role="img" aria-label={`Progress bar: ${percentComplete}% complete`}>
            {STATUSES.map((status) => {
              const pct = (counts[status] / total) * 100
              if (pct === 0) return null
              return (
                <div
                  key={status}
                  className={`progress-bar-segment ${STATUS_SEGMENT_CLASS[status]}`}
                  style={{ width: `${pct}%` }}
                  title={`${status}: ${counts[status]} control${counts[status] === 1 ? '' : 's'} (${Math.round(pct)}%)`}
                />
              )
            })}
          </div>
        ) : (
          <div className="progress-bar progress-bar--empty">
            <span className="muted" style={{ fontSize: 'var(--text-xs)', padding: '0 var(--space-2)' }}>
              No controls in this family
            </span>
          </div>
        )}

        {/* Total Controls */}
        <p className="status-total-row">
          <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>Total Controls</span>
          <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{total}</strong>
        </p>

        {/* 2×2 status grid */}
        <div className="status-grid">
          {STATUSES.map((status) => {
            const count = counts[status]
            const pct   = total === 0 ? 0 : Math.round((count / total) * 100)
            return (
              <Link
                key={status}
                to={libraryUrlForStatus(status, selectedFamily)}
                className={`status-card status-card--${STATUS_BADGE_CLASS[status].replace('status-badge--', '')}`}
                title={`View ${count} ${status} control${count === 1 ? '' : 's'}`}
              >
                <span className="status-card-label">{status}</span>
                <span className="status-card-count">{count}</span>
                <span className="status-card-pct">{pct}%</span>
              </Link>
            )
          })}
        </div>

        {/* CSV */}
        <p className="muted" style={{ marginBottom: 'var(--space-1)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          Status CSV
        </p>
        <div className="button-group">
          <button onClick={() => openExportDialog('csv')}>Export CSV</button>
          <button onClick={handleCsvImportClick}>Import CSV</button>
          <input ref={csvFileRef} type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} style={{ display: 'none' }} />
        </div>
        <p className="io-description">
          <strong>Export CSV</strong> — Export assessment progress including statuses, inheritance selections, and notes. Useful for sharing assessment progress or reviewing data in Excel.<br />
          <strong>Import CSV</strong> — Import a previously exported assessment CSV to restore statuses, inheritance selections, and notes.
        </p>
        {csvResult && (
          <p className={`feedback ${csvResult.ok ? 'feedback--ok' : 'feedback--error'}`}>
            {csvResult.message}
          </p>
        )}

        {/* Project JSON */}
        <p className="muted" style={{ marginBottom: 'var(--space-1)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          Project Backup
        </p>
        <div className="button-group">
          <button onClick={() => openExportDialog('json')}>Export Project JSON</button>
          <button onClick={handleJsonImportClick}>Import Project JSON</button>
          <input ref={jsonFileRef} type="file" accept=".json,application/json" onChange={handleJsonFileChange} style={{ display: 'none' }} />
        </div>
        <p className="io-description">
          <strong>Export Project JSON</strong> — Create a complete project backup including statuses, inheritance, control notes, and objective notes. Recommended before major changes or clearing browser data.<br />
          <strong>Import Project JSON</strong> — Restore a complete project backup. This replaces current project data with the contents of the selected backup file.
        </p>
        {jsonResult && (
          <p className={`feedback ${jsonResult.ok ? 'feedback--ok' : 'feedback--error'}`}>
            {jsonResult.message}
          </p>
        )}
        <p className="io-description">
          Tip: CSV exports are best for sharing assessment progress. JSON exports are intended for full project backup and recovery.
        </p>
        <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
          Last Project Backup: <strong style={{ fontWeight: 500 }}>{formatLastBackup(lastBackup)}</strong>
        </p>
      </section>

      <div className="home-footer-row">
        <p className="muted" style={{ margin: 0 }}>
          Example deep link:{' '}
          <Link to="/controls/AC.L1-3.1.1" className="mono">/controls/AC.L1-3.1.1</Link>
        </p>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === THEME_LIGHT ? 'Switch to dark mode' : 'Switch to light mode'}
          title={theme === THEME_LIGHT ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === THEME_LIGHT ? 'Dark' : 'Light'}
        </button>
      </div>

      <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
        Version {APP_VERSION} — {APP_DEPLOYMENT}
      </p>
      <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
        Copyright &copy; 2026 Vincent Azada. Independent project. All rights reserved.
      </p>

      {exportDialog && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title">
          <div className="confirm-dialog">
            <h2 id="export-dialog-title">
              {exportDialog.mode === 'csv' ? 'Export Assessment Progress' : 'Create Project Backup'}
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
                {exportDialog.mode === 'csv' ? 'Export CSV' : 'Create Backup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingJsonImport && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="restore-dialog-title">
          <div className="confirm-dialog">
            <h2 id="restore-dialog-title">Restore Project Backup?</h2>
            <p>This will replace your current browser project data with the selected backup file.</p>
            <p>This may overwrite:</p>
            <ul>
              <li>Control statuses</li>
              <li>Inheritance selections</li>
              <li>Control notes</li>
              <li>Objective notes</li>
            </ul>
            <p>This does not modify:</p>
            <ul>
              <li>Control definitions</li>
              <li>Scoring metadata</li>
              <li>Evidence mappings</li>
              <li>Relationships</li>
            </ul>
            <p>Files are processed locally in your browser and are not uploaded to a server.</p>
            <div className="confirm-dialog-buttons">
              <button onClick={cancelJsonRestore}>Cancel</button>
              <button className="bulk-toolbar-danger" onClick={confirmJsonRestore}>Restore Backup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
