import { useState, useEffect } from 'react'
import AutoResizeTextarea from '../components/AutoResizeTextarea'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import controls from '../data/controls/index.js'
import evidenceTypes from '../data/evidence/index.js'
import { STATUSES, readStatus, writeStatus, STATUS_BADGE_CLASS } from '../utils/status'
import { readNote, writeNote } from '../utils/notes'
import { readObjectiveNote, writeObjectiveNote } from '../utils/objectiveNotes'
import {
  INHERITANCE_VALUES,
  DEFAULT_INHERITANCE,
  INHERITANCE_BADGE_CLASS,
  readInheritance,
  writeInheritance,
} from '../utils/inheritance'
import { readPool, writePool } from '../utils/evidencePool'
import { readObjectiveArtifacts, writeObjectiveArtifacts } from '../utils/objectiveArtifacts'

// scoring.js is intentionally NOT imported here — the Scoring & POA&M
// section has been removed from the detail view. Metadata remains available
// in the Library (badges, filters) and Quick Search.

function resolveBackUrl(rawFrom) {
  if (!rawFrom) return '/controls'
  if (/^[a-z][a-z0-9+.-]*:/i.test(rawFrom)) return '/controls'
  if (rawFrom.startsWith('//')) return '/controls'
  if (rawFrom !== '/controls' && !rawFrom.startsWith('/controls?')) return '/controls'
  return rawFrom
}

function ControlDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const control = controls.find((c) => c.id === id)

  const backUrl = resolveBackUrl(searchParams.get('from'))

  const [status, setStatus]           = useState(() => readStatus(id))
  const [note, setNote]               = useState(() => readNote(id))
  const [inheritance, setInheritance] = useState(() => readInheritance(id))
  const [objectiveNotes, setObjectiveNotes] = useState(() => loadObjectiveNotes(id, control))
  const [pool, setPool]               = useState(() => readPool(id))
  const [poolInput, setPoolInput]     = useState('')
  const [objectiveArtifacts, setObjectiveArtifacts] = useState(() => loadObjectiveArtifacts(id, control))
  const [objArtifactInputs, setObjArtifactInputs]   = useState({})
  const [focusedObjId, setFocusedObjId]             = useState(null)

  useEffect(() => {
    setStatus(readStatus(id))
    setNote(readNote(id))
    setInheritance(readInheritance(id))
    setObjectiveNotes(loadObjectiveNotes(id, control))
    setPool(readPool(id))
    setPoolInput('')
    setObjectiveArtifacts(loadObjectiveArtifacts(id, control))
    setObjArtifactInputs({})
    setFocusedObjId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleStatusChange      = (e) => { const v = e.target.value; setStatus(v); writeStatus(id, v) }
  const handleNoteChange        = (e) => {
    const v = e.target.value
    setNote(v)
    writeNote(id, v)
    syncAutoStatus(v, objectiveNotes, status, id, setStatus)
  }
  const handleInheritanceChange = (e) => { const v = e.target.value; setInheritance(v); writeInheritance(id, v) }
  const handleObjectiveNoteChange = (objId, value) => {
    const nextObjNotes = { ...objectiveNotes, [objId]: value }
    setObjectiveNotes(nextObjNotes)
    writeObjectiveNote(id, objId, value)
    syncAutoStatus(note, nextObjNotes, status, id, setStatus)
  }

  const commitPoolInput = (raw) => {
    const trimmed = raw.trim()
    if (!trimmed || pool.includes(trimmed)) { setPoolInput(''); return }
    const next = [...pool, trimmed]
    setPool(next)
    writePool(id, next)
    setPoolInput('')
    promoteToInProgress(status, id, setStatus)
  }

  const handlePoolInputChange = (e) => { setPoolInput(e.target.value) }

  const handlePoolKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitPoolInput(poolInput)
    }
  }

  const handleRemovePoolItem = (item) => {
    const nextPool = pool.filter((p) => p !== item)
    setPool(nextPool)
    writePool(id, nextPool)

    // Cascade: remove this artifact from every objective's artifact list
    const nextObjArtifacts = {}
    for (const [objId, artifacts] of Object.entries(objectiveArtifacts)) {
      const filtered = artifacts.filter((a) => a !== item)
      nextObjArtifacts[objId] = filtered
      writeObjectiveArtifacts(id, objId, filtered)
    }
    setObjectiveArtifacts(nextObjArtifacts)
  }

  const getObjSuggestions = (objId) => {
    const input = (objArtifactInputs[objId] ?? '').trim()
    if (!input) return []
    const assigned = objectiveArtifacts[objId] ?? []
    const lower = input.toLowerCase()
    return pool.filter((item) => item.toLowerCase().includes(lower) && !assigned.includes(item))
  }

  const commitObjArtifact = (objId, raw) => {
    const trimmed = raw.trim()
    if (!trimmed) { setObjArtifactInputs((prev) => ({ ...prev, [objId]: '' })); return }

    const current = objectiveArtifacts[objId] ?? []
    const needsObjectiveUpdate = !current.includes(trimmed)
    const needsPoolUpdate = !pool.includes(trimmed)

    // Both already present — nothing to write
    if (!needsObjectiveUpdate && !needsPoolUpdate) {
      setObjArtifactInputs((prev) => ({ ...prev, [objId]: '' }))
      return
    }

    if (needsObjectiveUpdate) {
      const next = [...current, trimmed]
      setObjectiveArtifacts((prev) => ({ ...prev, [objId]: next }))
      writeObjectiveArtifacts(id, objId, next)
    }

    if (needsPoolUpdate) {
      const nextPool = [...pool, trimmed]
      setPool(nextPool)
      writePool(id, nextPool)
    }

    promoteToInProgress(status, id, setStatus)
    setObjArtifactInputs((prev) => ({ ...prev, [objId]: '' }))
  }

  const handleObjArtifactKeyDown = (e, objId) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitObjArtifact(objId, objArtifactInputs[objId] ?? '')
    }
  }

  const handleRemoveObjArtifact = (objId, item) => {
    const current = objectiveArtifacts[objId] ?? []
    const next = current.filter((a) => a !== item)
    setObjectiveArtifacts((prev) => ({ ...prev, [objId]: next }))
    writeObjectiveArtifacts(id, objId, next)
  }

  if (!control) {
    return (
      <div className="page">
        <h1>Control not found</h1>
        <p>No control with id &ldquo;{id}&rdquo; exists.</p>
        <p><Link to={backUrl}>← Back to Control Library</Link></p>
      </div>
    )
  }

  const supportingEvidence = evidenceTypes.filter((e) => e.likelyControls.includes(control.id))

  return (
    <div className="page">
      <p><Link to={backUrl}>← Back to Control Library</Link></p>

      <h1>
        <Link to={`/controls/${control.id}`} className="mono">{control.id}</Link>
        {' — '}{control.title}
      </h1>

      {/* Assessment tracking */}
      <section>
        <div className="control-meta-row">
          <div className="control-meta-field">
            <label htmlFor="assessment-status">
              <strong>Assessment Status</strong>
            </label>
            <div className="control-meta-input-row">
              <select
                id="assessment-status"
                value={status}
                onChange={handleStatusChange}
              >
                {STATUSES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <span className={`status-badge ${STATUS_BADGE_CLASS[status]}`}>{status}</span>
            </div>
          </div>

          <div className="control-meta-field">
            <label htmlFor="inheritance-status">
              <strong>Inheritance</strong>
            </label>
            <div className="control-meta-input-row">
              <select
                id="inheritance-status"
                value={inheritance}
                onChange={handleInheritanceChange}
              >
                {INHERITANCE_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              {inheritance !== DEFAULT_INHERITANCE && (
                <span className={`inheritance-badge ${INHERITANCE_BADGE_CLASS[inheritance]}`}>
                  {inheritance}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <label htmlFor="assessment-notes">
            <strong>Assessment Notes</strong>
          </label>
          <AutoResizeTextarea
            id="assessment-notes"
            value={note}
            onChange={handleNoteChange}
            rows={6}
            placeholder="Findings, evidence references, follow-ups, blockers..."
          />
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <label htmlFor="pool-input">
            <strong>Evidence Pool{pool.length > 0 ? ` (${pool.length})` : ''}</strong>
          </label>
          <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 'var(--space-1) 0 var(--space-2)' }}>
            Artifact names only — no file contents, no sensitive data. Examples: SSP.pdf, RBAC Policy.docx
          </p>
          <input
            id="pool-input"
            type="text"
            className="evidence-pool-input"
            value={poolInput}
            onChange={handlePoolInputChange}
            onKeyDown={handlePoolKeyDown}
            placeholder="Type an artifact name, press Enter or comma to add"
            autoComplete="off"
          />
          {pool.length > 0 && (
            <div className="evidence-chips">
              {pool.map((item) => (
                <span key={item} className="evidence-chip">
                  <span className="evidence-chip-name" title={item}>{item}</span>
                  <button
                    type="button"
                    className="evidence-chip-remove"
                    onClick={() => handleRemovePoolItem(item)}
                    aria-label={`Remove ${item} from Evidence Pool`}
                  >×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="button-group">
          <Link to={`/relationships?control=${control.id}`}>
            <button>View Relationships</button>
          </Link>
          <Link to={`/evidence?search=${encodeURIComponent(control.id)}`}>
            <button>Search Related Evidence</button>
          </Link>
        </div>
      </section>

      <section>
        <h2>Control Text</h2>
        <p>{control.controlText}</p>
      </section>

      <section>
        <h2>Plain English</h2>
        <p>{control.plainEnglish}</p>
      </section>

      <section>
        <h2>Assessment Objectives</h2>
        {control.objectives.map((obj) => {
          const objNoteId = `obj-note-${control.id}-${obj.id}`
          const objArtifactInputId = `obj-artifacts-${control.id}-${obj.id}`
          const suggestions = focusedObjId === obj.id ? getObjSuggestions(obj.id) : []
          const assignedArtifacts = objectiveArtifacts[obj.id] ?? []
          return (
            <div key={obj.id} style={{ marginBottom: 'var(--space-6)' }}>
              <h3>
                <span className="mono">[{obj.id}]</span> {obj.text}
              </h3>
              <h4>What to look for</h4>
              <p>{obj.whatToLookFor}</p>
              <h4>Common evidence</h4>
              <ul>
                {obj.commonEvidence.map((item, i) => <li key={i}>{item}</li>)}
              </ul>

              <div style={{ marginTop: 'var(--space-3)' }}>
                <label htmlFor={objArtifactInputId}>
                  <strong>Artifacts{assignedArtifacts.length > 0 ? ` (${assignedArtifacts.length})` : ''}</strong>
                </label>
                <div className="obj-artifact-input-wrap">
                  <input
                    id={objArtifactInputId}
                    type="text"
                    className="evidence-pool-input"
                    value={objArtifactInputs[obj.id] ?? ''}
                    onChange={(e) => setObjArtifactInputs((prev) => ({ ...prev, [obj.id]: e.target.value }))}
                    onKeyDown={(e) => handleObjArtifactKeyDown(e, obj.id)}
                    onFocus={() => setFocusedObjId(obj.id)}
                    onBlur={() => setFocusedObjId(null)}
                    placeholder={pool.length > 0 ? 'Type to filter pool entries, or enter a new name' : 'Type an artifact name, press Enter or comma to add'}
                    autoComplete="off"
                  />
                  {suggestions.length > 0 && (
                    <ul className="artifact-suggestions">
                      {suggestions.map((s) => (
                        <li
                          key={s}
                          className="artifact-suggestion-item"
                          onMouseDown={(e) => { e.preventDefault(); commitObjArtifact(obj.id, s) }}
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {assignedArtifacts.length > 0 && (
                  <div className="evidence-chips">
                    {assignedArtifacts.map((item) => (
                      <span key={item} className="evidence-chip">
                        <span className="evidence-chip-name" title={item}>{item}</span>
                        <button
                          type="button"
                          className="evidence-chip-remove"
                          onClick={() => handleRemoveObjArtifact(obj.id, item)}
                          aria-label={`Remove ${item} from objective ${obj.id}`}
                        >×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 'var(--space-3)' }}>
                <label htmlFor={objNoteId}>
                  <strong>Objective Notes</strong>
                </label>
                <AutoResizeTextarea
                  id={objNoteId}
                  value={objectiveNotes[obj.id] ?? ''}
                  onChange={(e) => handleObjectiveNoteChange(obj.id, e.target.value)}
                  rows={3}
                  placeholder="Findings or evidence references for this specific objective..."
                />
              </div>
            </div>
          )
        })}
      </section>

      <section>
        <h2>Supporting Evidence</h2>
        {supportingEvidence.length === 0 ? (
          <p className="muted">No mapped evidence types yet.</p>
        ) : (
          <ul>
            {supportingEvidence.map((e) => (
              <li key={e.name}>
                <h3>
                  <Link to={`/evidence?search=${encodeURIComponent(e.name)}`}>
                    {e.name}
                  </Link>
                </h3>
                <p>{e.description}</p>
                <p><strong>Reasoning:</strong> {e.reasoning}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Common Artifacts</h2>
        <ul>
          {control.commonArtifacts.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </section>

      <section>
        <h2>Common Gaps</h2>
        <ul>
          {control.commonGaps.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </section>
    </div>
  )
}

// Artifact-driven promotion only. Never reverts — reversion stays note-driven
// via syncAutoStatus.
function promoteToInProgress(currentStatus, controlId, setStatus) {
  if (currentStatus !== 'Not Started') return
  writeStatus(controlId, 'In Progress')
  setStatus('In Progress')
}

function syncAutoStatus(assessmentNote, objNotes, currentStatus, controlId, setStatus) {
  if (currentStatus !== 'Not Started' && currentStatus !== 'In Progress') return
  const allEmpty =
    assessmentNote.trim() === '' &&
    Object.values(objNotes).every((v) => (v ?? '').trim() === '')
  const targetStatus = allEmpty ? 'Not Started' : 'In Progress'
  if (targetStatus === currentStatus) return
  writeStatus(controlId, targetStatus)
  setStatus(targetStatus)
}

function loadObjectiveNotes(controlId, control) {
  if (!control) return {}
  const map = {}
  for (const obj of control.objectives) map[obj.id] = readObjectiveNote(controlId, obj.id)
  return map
}

function loadObjectiveArtifacts(controlId, control) {
  if (!control) return {}
  const map = {}
  for (const obj of control.objectives) map[obj.id] = readObjectiveArtifacts(controlId, obj.id)
  return map
}

export default ControlDetail
