import { useEffect, useRef, useState } from 'react'
import { Download, Upload, X } from 'lucide-react'
import useFocusTrap from './useFocusTrap.js'
import { getReviewGroups, getReviewFolders, commitReviewPlan } from '../utils/reviewGroups.js'
import { MAX_PLAN_BYTES, prepareDibcacPlan, exportDibcacPlan, downloadPlanFile } from '../utils/dibcacPlanImport.js'
import { buildDibcacImportInstructions, exampleDibcacPlan } from '../utils/dibcacImportInstructions.js'

export default function DibcacPlanImportModal({ onClose, onApply }) {
  const dialog = useRef(null)
  const input = useRef(null)
  const readVersion = useRef(0)
  const [source, setSource] = useState(null)
  const [fileName, setFileName] = useState('')
  const [mode, setMode] = useState('add')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  useFocusTrap(dialog, true)
  useEffect(() => {
    const requestVersion = readVersion
    dialog.current?.focus()
    const keydown = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); requestVersion.current++ }
  }, [onClose])

  const validate = (value, nextMode) => {
    setPreview(null); setError('')
    try { setPreview(prepareDibcacPlan(value, getReviewGroups(), getReviewFolders(), nextMode)) }
    catch (err) { setError(err.message) }
  }
  const readFile = async (file) => {
    if (!file) return
    const version = ++readVersion.current
    setSource(null); setPreview(null); setError(''); setFileName(file.name)
    if (file.size > MAX_PLAN_BYTES) { setError('Choose a JSON file no larger than 3 MB.'); setReading(false); return }
    setReading(true)
    try {
      const parsed = JSON.parse((await file.text()).replace(/^\uFEFF/, ''))
      if (version !== readVersion.current) return
      setSource(parsed)
      validate(parsed, mode)
    } catch (err) {
      if (version === readVersion.current) setError(`Could not read JSON: ${err.message}`)
    } finally {
      if (version === readVersion.current) setReading(false)
      if (input.current) input.current.value = ''
    }
  }
  const apply = () => {
    try {
      const saved = commitReviewPlan(preview)
      onApply(saved)
      onClose()
    } catch (err) { setError(err.message); setPreview(null) }
  }

  return (
    <div className="dibcac-template-overlay">
      <section ref={dialog} tabIndex={-1} className="dibcac-template-modal dibcac-plan-modal" role="dialog" aria-modal="true" aria-labelledby="dibcac-plan-title">
        <header className="dibcac-template-header">
          <div><h2 id="dibcac-plan-title">DIBCAC Import / Export</h2><p>Exchange groups, Planned Ask, topics, checklist questions, and objective connections. Preview changes before applying.</p></div>
          <button type="button" onClick={onClose} aria-label="Close import and export"><X size={19} /></button>
        </header>
        <div className="dibcac-template-body">
          <div className="dibcac-plan-downloads">
            <button type="button" onClick={() => downloadPlanFile('DIBCAC_IMPORT_INSTRUCTIONS.md', buildDibcacImportInstructions(), 'text/markdown;charset=utf-8')}><Download size={15} /> Download Import Instructions (.md)</button>
            <button type="button" onClick={() => downloadPlanFile('DIBCAC_PLAN.json', JSON.stringify(exportDibcacPlan(getReviewGroups(), getReviewFolders()), null, 2))}><Download size={15} /> Export DIBCAC Plan</button>
            <button type="button" onClick={() => downloadPlanFile('DIBCAC_PLAN_EXAMPLE.json', JSON.stringify(exampleDibcacPlan, null, 2))}>Download Example JSON</button>
          </div>
          <p className="dibcac-plan-help">Plan exports contain reusable structure and formatting. Use Settings → Export Project JSON to back up assessment notes and progress.</p>
          <div className="dibcac-plan-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); readFile(event.dataTransfer.files?.[0]) }}>
            <Upload size={24} /><p>Drop a DIBCAC plan JSON here, or choose a file.</p>
            <button type="button" disabled={reading} onClick={() => input.current?.click()}>Choose JSON File</button>
            <input ref={input} type="file" accept=".json,application/json" hidden onChange={(event) => readFile(event.target.files?.[0])} />
            {fileName && <span>{fileName}</span>}
          </div>
          <label className="dibcac-plan-mode">Import behavior
            <select value={mode} disabled={reading} onChange={(event) => { setMode(event.target.value); if (source) validate(source, event.target.value) }}>
              <option value="add">Add as new groups</option><option value="update">Update matching group IDs</option>
            </select>
          </label>
          <p className="dibcac-plan-help">{mode === 'add' ? 'Creates fresh groups and remaps their connections. Matching names receive a numbered suffix.' : 'Matches stable IDs from a plan export. Included groups replace their planning structure; other groups stay as they are. Existing checklist notes and progress are retained by item ID.'}</p>
          {reading && <p role="status">Reading file…</p>}
          {error && <p role="alert" className="dibcac-template-message error">{error}</p>}
          {source && !preview && !reading && <button type="button" onClick={() => validate(source, mode)}>Preview Again</button>}
          {preview && <section aria-label="Import preview" className="dibcac-plan-preview">
            <h3>Preview · {preview.summary.length} groups</h3>
            <p>Only DIBCAC folders and planning structures will be saved. Objective results, findings, evidence, and comments are unaffected.</p>
            {preview.summary.map((row, index) => <div className="dibcac-plan-preview-row" key={index}><strong>{row.action}: {row.name}</strong><span>{row.objectives} objectives · {row.questions} questions</span></div>)}
            {preview.warnings.length > 0 && <details><summary>{preview.warnings.length} review notes</summary><ul>{preview.warnings.slice(0, 50).map((warning, index) => <li key={index}>{warning}</li>)}</ul>{preview.warnings.length > 50 && <p>Showing the first 50 notes.</p>}</details>}
            <details><summary>Inspect resulting group content</summary>{preview.groups.map((group) => <details key={group.id}><summary>{group.name}</summary><pre>{group.plannedAsk}</pre><ul>{group.checklist.map((item) => <li key={item.id}><strong>{item.type === 'header' ? 'Section: ' : ''}{item.text}</strong>{item.objKeys?.length > 0 && <p>{item.objKeys.join(', ')}</p>}</li>)}</ul></details>)}</details>
          </section>}
        </div>
        <footer className="dibcac-template-footer"><button type="button" onClick={onClose}>Cancel</button><button type="button" disabled={!preview || reading} onClick={apply}>Apply Import</button></footer>
      </section>
    </div>
  )
}
