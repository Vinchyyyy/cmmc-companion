import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ClipboardPaste, TriangleAlert, X } from 'lucide-react'
import useFocusTrap from './useFocusTrap.js'
import {
  buildCrmBulkAssignments,
  parseCrmBulkText,
  summarizeCrmBulkRows,
} from '../utils/crmBulkImport.js'

const OUTCOME_LABELS = {
  mapped: 'Ready',
  unmatched: 'No crosswalk match',
  invalid: 'Invalid control ID',
  duplicate: 'Duplicate skipped',
  blank: 'Blank skipped',
  none: 'No inheritance',
  review: 'Needs review',
}

export default function CrmBulkImportModal({ providerName, onApply, onClose }) {
  const dialogRef = useRef(null)
  const pasteRef = useRef(null)
  const [pasteText, setPasteText] = useState('')
  const rows = useMemo(() => parseCrmBulkText(pasteText), [pasteText])
  const eligibleIds = useMemo(() => rows.filter((row) => row.selectable).map((row) => row.id), [rows])
  const [deselectedIds, setDeselectedIds] = useState(() => new Set())
  const selectedIds = useMemo(() => new Set(eligibleIds.filter((id) => !deselectedIds.has(id))), [eligibleIds, deselectedIds])
  const summary = useMemo(() => summarizeCrmBulkRows(rows), [rows])
  const assignments = useMemo(() => buildCrmBulkAssignments(rows, selectedIds), [rows, selectedIds])

  useFocusTrap(dialogRef, true)

  useEffect(() => {
    pasteRef.current?.focus()
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const toggleRow = (id) => setDeselectedIds((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const selectedRows = rows.filter((row) => row.selectable && selectedIds.has(row.id))
  const canApply = providerName.trim() && selectedRows.length > 0 && assignments.length > 0

  return (
    <div className="crm-bulk-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="crm-bulk-modal" role="dialog" aria-modal="true" aria-labelledby="crm-bulk-title">
        <header className="crm-bulk-header">
          <div>
            <span className="crm-eyebrow">{providerName} CRM</span>
            <h2 id="crm-bulk-title">Bulk Paste CRM Controls</h2>
            <p>Paste the Control ID and Can Be Inherited from CSP columns. Headers are optional.</p>
          </div>
          <button type="button" className="crm-bulk-close" onClick={onClose} aria-label="Close CRM importer"><X size={19} /></button>
        </header>

        <div className="crm-bulk-body">
          <label className="crm-bulk-paste-label" htmlFor="crm-bulk-paste">
            <span>Spreadsheet rows</span>
            <small>Excel and spreadsheet tabs are supported, along with comma- or space-separated rows.</small>
          </label>
          <textarea
            ref={pasteRef}
            id="crm-bulk-paste"
            className="crm-bulk-paste"
            value={pasteText}
            onChange={(event) => { setPasteText(event.target.value); setDeselectedIds(new Set()) }}
            placeholder={'AC-01(a)\tPartial\nAC-02(03)(a)\tYes\nAC-02(05)\t'}
            spellCheck="false"
          />

          {rows.length === 0 ? (
            <div className="crm-bulk-empty"><ClipboardPaste size={24} /><strong>Paste two CRM columns to begin</strong><span>The importer will preview every crosswalk before anything is applied.</span></div>
          ) : (
            <>
              <div className="crm-bulk-summary" aria-live="polite">
                <span><strong>{summary.total}</strong> rows</span>
                <span className="ready"><strong>{summary.ready}</strong> ready</span>
                <span><strong>{summary.unmatched}</strong> unmatched</span>
                <span><strong>{summary.review}</strong> review</span>
                <span><strong>{summary.skipped}</strong> skipped</span>
              </div>

              <div className="crm-bulk-review-note"><TriangleAlert size={16} /><span>Lettered subparts are retained in the original CRM row, while matching uses the closest 800-53 parent or numeric enhancement. Unmatched and unclear rows are never applied automatically.</span></div>

              <div className="crm-bulk-selection-row">
                <div><strong>{selectedRows.length}</strong> CRM rows selected → <strong>{assignments.length}</strong> CMMC requirements</div>
                <div><button type="button" onClick={() => setDeselectedIds(new Set())}>Select all ready</button><button type="button" onClick={() => setDeselectedIds(new Set(eligibleIds))}>Deselect all</button></div>
              </div>

              <div className="crm-bulk-table-wrap">
                <table className="crm-bulk-table">
                  <thead><tr><th aria-label="Include" /><th>CRM row</th><th>Normalized</th><th>CRM value</th><th>CMMC candidates</th><th>Result</th></tr></thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className={row.selectable ? '' : 'crm-bulk-row--muted'}>
                        <td><input type="checkbox" aria-label={`Include ${row.rawControl || `line ${row.lineNumber}`}`} checked={row.selectable && selectedIds.has(row.id)} disabled={!row.selectable} onChange={() => toggleRow(row.id)} /></td>
                        <td><strong>{row.rawControl || '—'}</strong></td>
                        <td><code>{row.normalizedControl || '—'}</code></td>
                        <td>{row.rawStatus || 'Blank'}</td>
                        <td>{row.candidates.length > 0 ? row.candidates.map((candidate) => candidate.requirement).join(', ') : '—'}</td>
                        <td><span className={`crm-bulk-outcome crm-bulk-outcome--${row.outcome}`}>{OUTCOME_LABELS[row.outcome] ?? row.statusLabel}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {assignments.length > 0 && (
                <div className="crm-bulk-assignment-summary">
                  <strong>Proposed result</strong>
                  <span>{assignments.filter((item) => item.treatment === 'Full').length} Full</span>
                  <span>{assignments.filter((item) => item.treatment === 'Partial').length} Partial</span>
                  <small>If CRM rows overlap, Partial wins so the importer does not overstate inherited coverage.</small>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="crm-bulk-footer">
          <span>{!providerName.trim() ? 'Name this provider before applying mappings.' : 'No assessment data changes until you apply.'}</span>
          <div><button type="button" className="crm-secondary" onClick={onClose}>Cancel</button><button type="button" className="crm-bulk-apply" disabled={!canApply} onClick={() => onApply(selectedRows, assignments)}><Check size={16} /> Apply {assignments.length || ''} Mapping{assignments.length === 1 ? '' : 's'}</button></div>
        </footer>
      </section>
    </div>
  )
}
