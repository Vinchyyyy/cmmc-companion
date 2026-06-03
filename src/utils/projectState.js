// Shared utility for full project state export and import.
// Covers all four localStorage layers:
//   - control status         (cmmc-status-{controlId})
//   - control-level notes    (cmmc-note-{controlId})
//   - objective-level notes  (cmmc-objective-note-{controlId}-{objectiveId})
//   - inheritance            (cmmc-inheritance-{controlId})

import { STATUSES, readStatus, writeStatus } from './status'
import { readNote, writeNote } from './notes'
import { readObjectiveNote, writeObjectiveNote } from './objectiveNotes'
import { INHERITANCE_VALUES, DEFAULT_INHERITANCE, readInheritance, writeInheritance } from './inheritance'

export const SCHEMA_VERSION = 1

// =========================================================================
// Export
// =========================================================================

export function exportProjectState(controls) {
  const exported = controls.map((control) => {
    const objectiveNotes = {}
    for (const obj of control.objectives ?? []) {
      const note = readObjectiveNote(control.id, obj.id)
      if (note.trim() !== '') objectiveNotes[obj.id] = note
    }

    return {
      id: control.id,
      status: readStatus(control.id),
      note: readNote(control.id),
      objectiveNotes,
      inheritance: readInheritance(control.id),
    }
  })

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    controls: exported,
  }
}

// =========================================================================
// Import
// =========================================================================

// Case-insensitive normalizer for inheritance values on import.
const INHERITANCE_NORMALIZER = INHERITANCE_VALUES.reduce((acc, v) => {
  acc[v.toLowerCase()] = v
  return acc
}, {})

export function importProjectState(projectJson, controls) {
  const controlMap = new Map(controls.map((c) => [c.id, c]))

  if (!projectJson || typeof projectJson !== 'object') {
    return { ok: false, error: 'Invalid JSON: expected an object.' }
  }
  if (projectJson.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported schema version ${projectJson.schemaVersion}. ` +
             `Expected version ${SCHEMA_VERSION}.`,
    }
  }
  if (!Array.isArray(projectJson.controls)) {
    return { ok: false, error: 'Invalid JSON: "controls" must be an array.' }
  }

  const STATUS_NORMALIZER = STATUSES.reduce((acc, s) => {
    acc[s.toLowerCase()] = s
    return acc
  }, {})

  const summary = {
    ok: true,
    controlsProcessed: 0,
    statusesWritten: 0,
    notesWritten: 0,
    objectiveNotesWritten: 0,
    inheritanceWritten: 0,
    skippedUnknownId: 0,
    skippedInvalidStatus: 0,
    skippedUnknownObjective: 0,
  }

  for (const entry of projectJson.controls) {
    const control = controlMap.get(entry?.id)
    if (!control) { summary.skippedUnknownId++; continue }

    summary.controlsProcessed++

    // Status
    const normalizedStatus = STATUS_NORMALIZER[String(entry.status ?? '').trim().toLowerCase()]
    if (normalizedStatus) {
      writeStatus(control.id, normalizedStatus)
      summary.statusesWritten++
    } else {
      summary.skippedInvalidStatus++
    }

    // Control-level note
    if (typeof entry.note === 'string') {
      writeNote(control.id, entry.note)
      if (entry.note.trim() !== '') summary.notesWritten++
    }

    // Objective notes
    const knownObjectiveIds = new Set((control.objectives ?? []).map((o) => o.id))
    if (entry.objectiveNotes && typeof entry.objectiveNotes === 'object') {
      for (const [objId, objNote] of Object.entries(entry.objectiveNotes)) {
        if (!knownObjectiveIds.has(objId)) { summary.skippedUnknownObjective++; continue }
        if (typeof objNote === 'string') {
          writeObjectiveNote(control.id, objId, objNote)
          if (objNote.trim() !== '') summary.objectiveNotesWritten++
        }
      }
    }

    // Inheritance — case-insensitive, falls back to DEFAULT_INHERITANCE if absent/invalid
    if (entry.inheritance !== undefined) {
      const normalizedInheritance =
        INHERITANCE_NORMALIZER[String(entry.inheritance ?? '').trim().toLowerCase()]
      if (normalizedInheritance) {
        writeInheritance(control.id, normalizedInheritance)
        if (normalizedInheritance !== DEFAULT_INHERITANCE) summary.inheritanceWritten++
      }
      // Invalid inheritance values are silently skipped (no summary count —
      // they're rare enough that polluting the message isn't worth it)
    }
  }

  return summary
}

// =========================================================================
// Download helper (browser only)
// =========================================================================

export function downloadProjectJson(projectJson, filename) {
  const date = new Date().toISOString().split('T')[0]
  const resolvedFilename = filename ?? `cmmc-project-${date}.json`
  const blob = new Blob(
    [JSON.stringify(projectJson, null, 2)],
    { type: 'application/json;charset=utf-8;' }
  )
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = resolvedFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
