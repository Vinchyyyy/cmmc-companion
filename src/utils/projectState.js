// Shared utility for full project state export and import.
// Covers all localStorage layers:
//   - control status              (cmmc-status-{controlId})
//   - control-level notes         (cmmc-note-{controlId})
//   - objective-level notes       (cmmc-objective-note-{controlId}-{objectiveId})
//   - objective-level statuses    (cmmc-obj-status-{controlId}-{objectiveId})
//   - inheritance                 (cmmc-inheritance-{controlId})
//   - inheritance source          (cmmc-inheritance-source-{controlId})
//   - control-level evidence pool (cmmc-pool-{controlId})
//   - objective-level artifacts   (cmmc-obj-artifacts-{controlId}-{objectiveId})
//   - objective-level results     (cmmc-objective-result-{controlId}-{objectiveId})

import { STATUSES, DEFAULT_STATUS, readStatus, writeStatus } from './status'
import { readNote, writeNote } from './notes'
import { readObjectiveNote, writeObjectiveNote } from './objectiveNotes'
import {
  INHERITANCE_VALUES,
  DEFAULT_INHERITANCE,
  readInheritance,
  writeInheritance,
  readInheritanceSource,
  writeInheritanceSource,
} from './inheritance'
import { readAssignedTo, writeAssignedTo } from './assignment'
import { readPool, writePool } from './evidencePool'
import { readObjectiveArtifacts, writeObjectiveArtifacts } from './objectiveArtifacts'
import { readObjectiveResult, writeObjectiveResult } from './objectiveResults'
import {
  OBJECTIVE_STATUSES,
  OBJECTIVE_STATUS_UNREVIEWED,
  readObjectiveStatus,
  writeObjectiveStatus,
} from './objectiveStatus'

export const SCHEMA_VERSION = 2

export const DEFAULT_IMPORT_OPTIONS = {
  mode: 'replace',
  categories: {
    statuses: true,
    notes: true,
    objectiveNotes: true,
    objectiveStatuses: true,
    inheritance: true,
    inheritanceSource: true,
    assignments: true,
    evidencePool: true,
    objectiveArtifacts: true,
    objectiveResults: true,
  },
}

// All schema versions this app can import. Add new versions here as the
// schema evolves — never remove old ones while users may have older backups.
export const ACCEPTED_SCHEMA_VERSIONS = [1, 2]

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

    const pool = readPool(control.id)

    const objectiveArtifacts = {}
    for (const obj of control.objectives ?? []) {
      const artifacts = readObjectiveArtifacts(control.id, obj.id)
      if (artifacts.length > 0) objectiveArtifacts[obj.id] = artifacts
    }

    const objectiveStatuses = {}
    for (const obj of control.objectives ?? []) {
      const s = readObjectiveStatus(control.id, obj.id)
      if (s !== OBJECTIVE_STATUS_UNREVIEWED) objectiveStatuses[obj.id] = s
    }

    const objectiveResults = {}
    for (const obj of control.objectives ?? []) {
      const r = readObjectiveResult(control.id, obj.id)
      if (Object.values(r).some((v) => v.trim() !== '')) objectiveResults[obj.id] = r
    }

    const assignedTo = readAssignedTo(control.id)

    const entry = {
      id: control.id,
      status: readStatus(control.id),
      note: readNote(control.id),
      objectiveNotes,
      inheritance: readInheritance(control.id),
      inheritanceSource: readInheritanceSource(control.id),
    }

    if (assignedTo) entry.assignedTo = assignedTo

    if (pool.length > 0) entry.evidencePool = pool
    if (Object.keys(objectiveArtifacts).length > 0) entry.objectiveArtifacts = objectiveArtifacts
    if (Object.keys(objectiveStatuses).length > 0) entry.objectiveStatuses = objectiveStatuses
    if (Object.keys(objectiveResults).length > 0) entry.objectiveResults = objectiveResults

    return entry
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

// Returns true if the value should be written.
// In fill-empty mode, returns false (and increments skippedBecauseExisting)
// when the current local field already has a non-default value.
function canWrite(currentIsEmpty, opts, summary) {
  if (opts.mode !== 'fill-empty') return true
  if (currentIsEmpty) return true
  summary.skippedBecauseExisting++
  return false
}

// Case-insensitive normalizer for inheritance values on import.
const INHERITANCE_NORMALIZER = INHERITANCE_VALUES.reduce((acc, v) => {
  acc[v.toLowerCase()] = v
  return acc
}, {})

export function importProjectState(projectJson, controls, options = {}) {
  const controlMap = new Map(controls.map((c) => [c.id, c]))

  const opts = {
    mode: options.mode ?? DEFAULT_IMPORT_OPTIONS.mode,
    categories: { ...DEFAULT_IMPORT_OPTIONS.categories, ...options.categories },
  }

  if (!projectJson || typeof projectJson !== 'object') {
    return { ok: false, error: 'Invalid JSON: expected an object.' }
  }
  if (!ACCEPTED_SCHEMA_VERSIONS.includes(projectJson.schemaVersion)) {
    return {
      ok: false,
      error: `Unsupported schema version ${projectJson.schemaVersion}. ` +
             `Expected version 1 or 2.`,
    }
  }
  if (!Array.isArray(projectJson.controls)) {
    return { ok: false, error: 'Invalid JSON: "controls" must be an array.' }
  }

  const STATUS_NORMALIZER = STATUSES.reduce((acc, s) => {
    acc[s.toLowerCase()] = s
    return acc
  }, {})

  const OBJECTIVE_STATUS_NORMALIZER = OBJECTIVE_STATUSES.reduce((acc, s) => {
    acc[s.toLowerCase()] = s
    return acc
  }, {})

  const summary = {
    ok: true,
    controlsProcessed: 0,
    statusesWritten: 0,
    notesWritten: 0,
    objectiveNotesWritten: 0,
    objectiveStatusesWritten: 0,
    inheritanceWritten: 0,
    inheritanceSourcesWritten: 0,
    assignmentsWritten: 0,
    evidencePoolsWritten: 0,
    objectiveArtifactsWritten: 0,
    objectiveResultsWritten: 0,
    skippedUnknownId: 0,
    skippedInvalidStatus: 0,
    skippedUnknownObjective: 0,
    skippedBecauseExisting: 0,
  }

  for (const entry of projectJson.controls) {
    const control = controlMap.get(entry?.id)
    if (!control) { summary.skippedUnknownId++; continue }

    summary.controlsProcessed++

    const knownObjectiveIds = new Set((control.objectives ?? []).map((o) => o.id))

    // Status
    if (opts.categories.statuses) {
      const normalizedStatus = STATUS_NORMALIZER[String(entry.status ?? '').trim().toLowerCase()]
      if (normalizedStatus) {
        if (canWrite(readStatus(control.id) === DEFAULT_STATUS, opts, summary)) {
          writeStatus(control.id, normalizedStatus)
          summary.statusesWritten++
        }
      } else {
        summary.skippedInvalidStatus++
      }
    }

    // Control-level note
    if (opts.categories.notes) {
      if (typeof entry.note === 'string') {
        if (canWrite(readNote(control.id).trim() === '', opts, summary)) {
          writeNote(control.id, entry.note)
          if (entry.note.trim() !== '') summary.notesWritten++
        }
      }
    }

    // Objective notes
    if (opts.categories.objectiveNotes) {
      if (entry.objectiveNotes && typeof entry.objectiveNotes === 'object') {
        for (const [objId, objNote] of Object.entries(entry.objectiveNotes)) {
          if (!knownObjectiveIds.has(objId)) { summary.skippedUnknownObjective++; continue }
          if (typeof objNote === 'string') {
            if (canWrite(readObjectiveNote(control.id, objId).trim() === '', opts, summary)) {
              writeObjectiveNote(control.id, objId, objNote)
              if (objNote.trim() !== '') summary.objectiveNotesWritten++
            }
          }
        }
      }
    }

    // Objective Statuses (drives Trending Status — trending is always re-derived at render time)
    if (opts.categories.objectiveStatuses) {
      if ('objectiveStatuses' in entry) {
        if (
          entry.objectiveStatuses !== null &&
          typeof entry.objectiveStatuses === 'object' &&
          !Array.isArray(entry.objectiveStatuses)
        ) {
          for (const [objId, objStatus] of Object.entries(entry.objectiveStatuses)) {
            if (!knownObjectiveIds.has(objId)) { summary.skippedUnknownObjective++; continue }
            const normalized = OBJECTIVE_STATUS_NORMALIZER[String(objStatus ?? '').trim().toLowerCase()]
            if (normalized) {
              if (canWrite(readObjectiveStatus(control.id, objId) === OBJECTIVE_STATUS_UNREVIEWED, opts, summary)) {
                writeObjectiveStatus(control.id, objId, normalized)
                if (normalized !== OBJECTIVE_STATUS_UNREVIEWED) summary.objectiveStatusesWritten++
              }
            }
          }
        }
      }
    }

    // Inheritance — case-insensitive, falls back to DEFAULT_INHERITANCE if absent/invalid
    if (opts.categories.inheritance) {
      if (entry.inheritance !== undefined) {
        const normalizedInheritance =
          INHERITANCE_NORMALIZER[String(entry.inheritance ?? '').trim().toLowerCase()]
        if (normalizedInheritance) {
          if (canWrite(readInheritance(control.id) === DEFAULT_INHERITANCE, opts, summary)) {
            writeInheritance(control.id, normalizedInheritance)
            if (normalizedInheritance !== DEFAULT_INHERITANCE) summary.inheritanceWritten++
          }
        }
        // Invalid inheritance values are silently skipped (no summary count —
        // they're rare enough that polluting the message isn't worth it)
      }
    }

    // Inheritance Source
    if (opts.categories.inheritanceSource) {
      if (typeof entry.inheritanceSource === 'string') {
        if (canWrite(readInheritanceSource(control.id).trim() === '', opts, summary)) {
          writeInheritanceSource(control.id, entry.inheritanceSource)
          if (entry.inheritanceSource.trim() !== '') summary.inheritanceSourcesWritten++
        }
      }
    }

    // Assigned To
    if (opts.categories.assignments) {
      if (typeof entry.assignedTo === 'string') {
        if (canWrite(readAssignedTo(control.id) === '', opts, summary)) {
          writeAssignedTo(control.id, entry.assignedTo)
          if (entry.assignedTo.trim() !== '') summary.assignmentsWritten++
        }
      }
    }

    // Evidence Pool
    // Only write when the field is explicitly present in the entry.
    // Missing field = backward-compatible no-op (does not clear existing pool).
    // Explicit empty array = intentionally clear the pool.
    if (opts.categories.evidencePool) {
      if ('evidencePool' in entry) {
        if (Array.isArray(entry.evidencePool)) {
          const filtered = entry.evidencePool.filter((v) => typeof v === 'string')
          if (canWrite(readPool(control.id).length === 0, opts, summary)) {
            writePool(control.id, filtered)
            if (filtered.length > 0) summary.evidencePoolsWritten++
          }
        }
      }
    }

    // Objective Artifacts
    // Same missing-vs-explicit-empty distinction as Evidence Pool above.
    if (opts.categories.objectiveArtifacts) {
      if ('objectiveArtifacts' in entry) {
        if (
          entry.objectiveArtifacts !== null &&
          typeof entry.objectiveArtifacts === 'object' &&
          !Array.isArray(entry.objectiveArtifacts)
        ) {
          for (const [objId, artifacts] of Object.entries(entry.objectiveArtifacts)) {
            if (!knownObjectiveIds.has(objId)) { summary.skippedUnknownObjective++; continue }
            if (Array.isArray(artifacts)) {
              const filtered = artifacts.filter((v) => typeof v === 'string')
              if (canWrite(readObjectiveArtifacts(control.id, objId).length === 0, opts, summary)) {
                writeObjectiveArtifacts(control.id, objId, filtered)
                if (filtered.length > 0) summary.objectiveArtifactsWritten++
              }
            }
          }
        }
      }
    }

    // Objective Results (interviews, examine, test, overallComments)
    if (opts.categories.objectiveResults) {
      if (
        'objectiveResults' in entry &&
        entry.objectiveResults !== null &&
        typeof entry.objectiveResults === 'object' &&
        !Array.isArray(entry.objectiveResults)
      ) {
        for (const [objId, result] of Object.entries(entry.objectiveResults)) {
          if (!knownObjectiveIds.has(objId)) { summary.skippedUnknownObjective++; continue }
          if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
            const coerce = (v) => (typeof v === 'string' ? v : '')
            const incoming = {
              interviews:      coerce(result.interviews),
              examine:         coerce(result.examine),
              test:            coerce(result.test),
              overallComments: coerce(result.overallComments),
            }
            const hasData = Object.values(incoming).some((v) => v.trim() !== '')
            if (!hasData) continue
            const current = readObjectiveResult(control.id, objId)
            const currentIsEmpty = Object.values(current).every((v) => v.trim() === '')
            if (canWrite(currentIsEmpty, opts, summary)) {
              writeObjectiveResult(control.id, objId, incoming)
              summary.objectiveResultsWritten++
            }
          }
        }
      }
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
