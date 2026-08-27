import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Download, LayoutTemplate, Save, Trash2, Upload, X } from 'lucide-react'
import useFocusTrap from './useFocusTrap.js'
import {
  createDibcacTemplateFromCurrent,
  deleteCustomDibcacTemplate,
  downloadDibcacTemplate,
  extractDibcacTemplate,
  getBuiltInDibcacTemplate,
  instantiateDibcacTemplate,
  readCustomDibcacTemplates,
  saveCustomDibcacTemplate,
  templateStats,
} from '../utils/dibcacTemplates.js'

const MAX_TEMPLATE_BYTES = 3 * 1024 * 1024

function TemplateCard({ template, onApply, onDelete }) {
  const stats = useMemo(() => templateStats(template), [template])
  return (
    <article className="dibcac-template-card">
      <div className="dibcac-template-card__top">
        <div>
          <div className="dibcac-template-name-row"><h3>{template.name}</h3>{template.builtIn && <span>Built in</span>}</div>
          <p>{template.description || 'Reusable DIBCAC review-group structure.'}</p>
        </div>
        {!template.builtIn && onDelete && <button type="button" className="dibcac-template-delete" onClick={onDelete} title="Delete this saved template"><Trash2 size={15} /></button>}
      </div>
      <div className="dibcac-template-stats">
        <span><strong>{stats.folders}</strong> folders</span>
        <span><strong>{stats.groups}</strong> groups</span>
        <span><strong>{stats.uniqueObjectives}</strong> objectives</span>
        <span><strong>{stats.checklistItems}</strong> questions</span>
      </div>
      <div className="dibcac-template-actions">
        <button type="button" className="dibcac-template-export" onClick={() => downloadDibcacTemplate(template)}><Download size={14} /> Export</button>
        <button type="button" className="dibcac-template-apply" onClick={onApply}><LayoutTemplate size={14} /> Use Template</button>
      </div>
    </article>
  )
}

export default function DibcacTemplatesModal({ currentGroups, currentFolders, onApply, onClose }) {
  const dialogRef = useRef(null)
  const fileRef = useRef(null)
  const [builtIn, setBuiltIn] = useState(null)
  const [customTemplates, setCustomTemplates] = useState(readCustomDibcacTemplates)
  const [saveName, setSaveName] = useState('')
  const [message, setMessage] = useState(null)
  const [applyTarget, setApplyTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useFocusTrap(dialogRef, true)

  useEffect(() => {
    let active = true
    getBuiltInDibcacTemplate()
      .then((template) => { if (active) setBuiltIn(template) })
      .catch(() => { if (active) setMessage({ ok: false, text: 'The built-in template could not be loaded.' }) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const saveCurrent = () => {
    const name = saveName.trim()
    if (!name) return
    if (currentGroups.length === 0) {
      setMessage({ ok: false, text: 'Create at least one review group before saving a template.' })
      return
    }
    const template = createDibcacTemplateFromCurrent(name, currentGroups, currentFolders)
    const next = saveCustomDibcacTemplate(template)
    setCustomTemplates(next)
    setSaveName('')
    setMessage({ ok: true, text: `Saved “${template.name}” as a reusable template. Checklist progress and assessment comments were excluded.` })
  }

  const importFile = async (file) => {
    if (!file) return
    if (file.size > MAX_TEMPLATE_BYTES) {
      setMessage({ ok: false, text: 'Template imports must be under 3 MB.' })
      return
    }
    try {
      const parsed = JSON.parse(await file.text())
      const fallback = file.name.replace(/\.json$/i, '').replace(/[-_]+/g, ' ').trim()
      const result = extractDibcacTemplate(parsed, fallback)
      if (!result.ok) {
        setMessage({ ok: false, text: result.error })
        return
      }
      const imported = { ...result.template, id: crypto.randomUUID(), builtIn: false, createdAt: new Date().toISOString() }
      const next = saveCustomDibcacTemplate(imported)
      setCustomTemplates(next)
      setMessage({
        ok: true,
        text: result.source === 'project-backup'
          ? `Extracted and saved “${imported.name}” from the full project backup. No assessment data was imported.`
          : `Imported and saved “${imported.name}”.`,
      })
    } catch {
      setMessage({ ok: false, text: 'Could not parse this file as a valid JSON template or project backup.' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const confirmApply = () => {
    if (!applyTarget) return
    const instantiated = instantiateDibcacTemplate(applyTarget)
    onApply(instantiated, applyTarget)
    setApplyTarget(null)
    onClose()
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    setCustomTemplates(deleteCustomDibcacTemplate(deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <div className="dibcac-template-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="dibcac-template-modal" role="dialog" aria-modal="true" aria-labelledby="dibcac-templates-title">
        <header className="dibcac-template-header">
          <div><span className="dibcac-template-eyebrow">Reusable workspace structures</span><h2 id="dibcac-templates-title">DIBCAC Templates</h2><p>Templates contain folders, review groups, objective assignments, planned asks, and checklist questions—not assessment results or progress.</p></div>
          <button type="button" onClick={onClose} aria-label="Close templates"><X size={19} /></button>
        </header>

        <div className="dibcac-template-body">
          <section className="dibcac-template-tools">
            <div className="dibcac-template-save-row">
              <label htmlFor="dibcac-template-name"><strong>Save current workspace as a template</strong><span>Checked items will be reset; assessment comments remain in the project only.</span></label>
              <div><input id="dibcac-template-name" value={saveName} onChange={(event) => setSaveName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveCurrent() }} placeholder="Template name…" /><button type="button" onClick={saveCurrent} disabled={!saveName.trim()}><Save size={15} /> Save Template</button></div>
            </div>
            <div className="dibcac-template-import-row">
              <div><strong>Import template</strong><span>Accepts a template JSON or extracts only DIBCAC groups from a full Settings backup.</span></div>
              <button type="button" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import JSON</button>
              <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(event) => importFile(event.target.files?.[0])} />
            </div>
          </section>

          {message && <div className={`dibcac-template-message${message.ok ? ' success' : ' error'}`}>{message.ok && <Check size={15} />}{message.text}</div>}

          <section className="dibcac-template-list-section">
            <div className="dibcac-template-section-heading"><h3>Available Templates</h3><span>{customTemplates.length + (builtIn ? 1 : 0)}</span></div>
            <div className="dibcac-template-list">
              {builtIn ? <TemplateCard template={builtIn} onApply={() => setApplyTarget(builtIn)} /> : <div className="dibcac-template-loading">Loading built-in template…</div>}
              {customTemplates.map((template) => <TemplateCard key={template.id} template={template} onApply={() => setApplyTarget(template)} onDelete={() => setDeleteTarget(template)} />)}
            </div>
          </section>
        </div>

        <footer className="dibcac-template-footer"><span>The built-in default is always available and is never applied automatically.</span><button type="button" onClick={onClose}>Done</button></footer>

        {applyTarget && (
          <div className="dibcac-template-confirm" role="alertdialog" aria-modal="true" aria-labelledby="dibcac-template-apply-title">
            <div><h3 id="dibcac-template-apply-title">Use “{applyTarget.name}”?</h3><p>This will replace the current DIBCAC folders and review groups. Objective statuses, findings, evidence, interview notes, and overall comments elsewhere in the project will remain unchanged.</p><div><button type="button" onClick={() => setApplyTarget(null)}>Cancel</button><button type="button" className="primary" onClick={confirmApply}>Replace Groups</button></div></div>
          </div>
        )}

        {deleteTarget && (
          <div className="dibcac-template-confirm" role="alertdialog" aria-modal="true" aria-labelledby="dibcac-template-delete-title">
            <div><h3 id="dibcac-template-delete-title">Delete “{deleteTarget.name}”?</h3><p>This removes the saved template only. It does not change the review groups currently in your workspace.</p><div><button type="button" onClick={() => setDeleteTarget(null)}>Cancel</button><button type="button" className="danger" onClick={confirmDelete}>Delete Template</button></div></div>
          </div>
        )}
      </section>
    </div>
  )
}
