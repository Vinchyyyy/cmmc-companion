import { useState, useEffect } from 'react'
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

  useEffect(() => {
    setStatus(readStatus(id))
    setNote(readNote(id))
    setInheritance(readInheritance(id))
    setObjectiveNotes(loadObjectiveNotes(id, control))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleStatusChange      = (e) => { const v = e.target.value; setStatus(v); writeStatus(id, v) }
  const handleNoteChange        = (e) => { const v = e.target.value; setNote(v); writeNote(id, v) }
  const handleInheritanceChange = (e) => { const v = e.target.value; setInheritance(v); writeInheritance(id, v) }
  const handleObjectiveNoteChange = (objId, value) => {
    setObjectiveNotes((prev) => ({ ...prev, [objId]: value }))
    writeObjectiveNote(id, objId, value)
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
          <textarea
            id="assessment-notes"
            value={note}
            onChange={handleNoteChange}
            rows={6}
            placeholder="Findings, evidence references, follow-ups, blockers..."
          />
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
              <div>
                <label htmlFor={objNoteId}>
                  <strong>Objective Notes</strong>
                </label>
                <textarea
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

function loadObjectiveNotes(controlId, control) {
  if (!control) return {}
  const map = {}
  for (const obj of control.objectives) map[obj.id] = readObjectiveNote(controlId, obj.id)
  return map
}

export default ControlDetail
