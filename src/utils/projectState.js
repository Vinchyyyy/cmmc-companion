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
import { readPoolIds, writePoolIds } from './evidencePool'
import { readObjectiveArtifactIds, writeObjectiveArtifactIds } from './objectiveArtifacts'
import { listArtifacts, findOrCreate, isArtifactId, updateArtifactTags } from './artifactRegistry'
import { readObjectiveResult, writeObjectiveResult } from './objectiveResults'
import { readEnvironmentProfile, writeEnvironmentProfile } from './environmentProfile'
import {
  OBJECTIVE_STATUSES,
  OBJECTIVE_STATUS_UNREVIEWED,
  readObjectiveStatus,
  writeObjectiveStatus,
} from './objectiveStatus'
import {
  readObjectiveInheritance,
  writeObjectiveInheritance,
  readInheritanceSources,
  writeInheritanceSources,
} from './inheritance'
import { getReviewGroups, saveReviewGroups } from './reviewGroups'
import { clearRegistry } from './artifactRegistry'
import { readObjectiveFinding, writeObjectiveFinding } from './objectiveFindings'
import { readObjectiveInterviewedRoles, writeObjectiveInterviewedRoles } from './objectiveInterviewedRoles'

export const SCHEMA_VERSION = 4

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
    objectiveFindings: true,
    objectiveInterviewedRoles: true,
  },
}

// All schema versions this app can import. Add new versions here as the
// schema evolves — never remove old ones while users may have older backups.
export const ACCEPTED_SCHEMA_VERSIONS = [1, 2, 3, 4]

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

    const pool = readPoolIds(control.id)

    const objectiveArtifacts = {}
    for (const obj of control.objectives ?? []) {
      const artifacts = readObjectiveArtifactIds(control.id, obj.id)
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

    const objectiveFindings = {}
    for (const obj of control.objectives ?? []) {
      const f = readObjectiveFinding(control.id, obj.id)
      if (f) objectiveFindings[obj.id] = f
    }

    const objectiveInterviewedRoles = {}
    for (const obj of control.objectives ?? []) {
      const roles = readObjectiveInterviewedRoles(control.id, obj.id)
      if (roles.length > 0) objectiveInterviewedRoles[obj.id] = roles
    }

    const assignedTo = readAssignedTo(control.id)

    // Objective-level inheritance sources
    const objectiveInheritance = {}
    for (const obj of control.objectives ?? []) {
      const sources = readObjectiveInheritance(control.id, obj.id)
      if (sources.length > 0) objectiveInheritance[obj.id] = sources
    }

    const inheritanceSourcesArr = readInheritanceSources(control.id)

    const entry = {
      id: control.id,
      status: readStatus(control.id),
      note: readNote(control.id),
      objectiveNotes,
      inheritance: readInheritance(control.id),
      // Legacy single-value field kept for backward-compat with v1/v2/v3 importers.
      inheritanceSource: readInheritanceSource(control.id),
      // Full multi-source array (v4+). Takes priority over inheritanceSource on import.
      inheritanceSources: inheritanceSourcesArr,
    }

    if (assignedTo) entry.assignedTo = assignedTo

    if (pool.length > 0) entry.evidencePool = pool
    if (Object.keys(objectiveArtifacts).length > 0) entry.objectiveArtifacts = objectiveArtifacts
    if (Object.keys(objectiveStatuses).length > 0) entry.objectiveStatuses = objectiveStatuses
    if (Object.keys(objectiveResults).length > 0) entry.objectiveResults = objectiveResults
    if (Object.keys(objectiveInheritance).length > 0) entry.objectiveInheritance = objectiveInheritance
    if (Object.keys(objectiveFindings).length > 0) entry.objectiveFindings = objectiveFindings
    if (Object.keys(objectiveInterviewedRoles).length > 0) entry.objectiveInterviewedRoles = objectiveInterviewedRoles

    return entry
  })

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    artifacts: listArtifacts(),
    environmentProfile: readEnvironmentProfile(),
    reviewGroups: getReviewGroups(),
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
             `Expected version 1, 2, 3, or 4.`,
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

  // Restore environment profile if present. Optional field — missing means no-op
  // (backward-compatible with v1/v2 backups that predate this field).
  if (
    projectJson.environmentProfile !== undefined &&
    projectJson.environmentProfile !== null &&
    typeof projectJson.environmentProfile === 'object'
  ) {
    writeEnvironmentProfile(projectJson.environmentProfile)
  }

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
    objectiveInheritanceWritten: 0,
    objectiveFindingsWritten: 0,
    objectiveInterviewedRolesWritten: 0,
    reviewGroupsWritten: 0,
    skippedUnknownId: 0,
    skippedInvalidStatus: 0,
    skippedUnknownObjective: 0,
    skippedBecauseExisting: 0,
    droppedArtifactRefs: 0,
    artifactTagsWritten: 0,
  }

  // Review groups — top-level field, not per-control. Restore in replace mode only
  // (fill-empty is not well-defined for groups which have no default empty state).
  if (Array.isArray(projectJson.reviewGroups) && opts.mode === 'replace') {
    saveReviewGroups(projectJson.reviewGroups)
    summary.reviewGroupsWritten = projectJson.reviewGroups.length
  }

  // Artifact registry: v3+ files carry a top-level `artifacts` array of records.
  // Build a foreign-id -> name lookup so referenced ids can be remapped to local
  // ids by normalized name. v1/v2 files have no array — entries are names.
  // Also restore evidence tags stored on each artifact record (bug fix: tags were
  // previously exported but never re-applied on import).
  const hasArtifactsArray = Array.isArray(projectJson.artifacts)
  const foreignIdToName = new Map()
  if (hasArtifactsArray) {
    for (const rec of projectJson.artifacts) {
      if (rec && typeof rec === 'object' && typeof rec.id === 'string' && typeof rec.name === 'string') {
        foreignIdToName.set(rec.id, rec.name)

        // Restore evidence tags. Filter to non-empty strings and de-duplicate;
        // unknown tag IDs are preserved as-is (the scorer ignores unrecognised tags).
        if (Array.isArray(rec.tags) && rec.tags.length > 0) {
          const validTags = [...new Set(rec.tags.filter((t) => typeof t === 'string' && t.trim()))]
          if (validTags.length > 0) {
            const localRec = findOrCreate(rec.name)
            if (localRec) {
              updateArtifactTags(localRec.id, validTags)
              summary.artifactTagsWritten++
            }
          }
        }
      }
    }
  }

  // Resolves a single imported artifact entry (a foreign id for v3, or a name for
  // v1/v2) to a local artifact id, creating/deduping by normalized name. Returns
  // undefined (and counts a drop) for an id-shaped entry with no matching record.
  // Only invoked inside enabled category blocks, so disabled categories create
  // no orphaned registry records.
  const resolveImportedEntry = (entry) => {
    if (typeof entry !== 'string' || entry.trim() === '') return undefined
    const foreignName = foreignIdToName.get(entry)
    if (foreignName !== undefined) {
      return findOrCreate(foreignName)?.id
    }
    if (isArtifactId(entry)) {
      summary.droppedArtifactRefs++
      return undefined
    }
    return findOrCreate(entry)?.id
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

    // Inheritance Sources — prefer the v4 array field; fall back to legacy string.
    if (opts.categories.inheritanceSource) {
      if (Array.isArray(entry.inheritanceSources)) {
        // v4 multi-source array
        const filtered = entry.inheritanceSources.filter((s) => typeof s === 'string' && s.trim())
        if (canWrite(readInheritanceSources(control.id).length === 0, opts, summary)) {
          writeInheritanceSources(control.id, filtered)
          if (filtered.length > 0) summary.inheritanceSourcesWritten++
        }
      } else if (typeof entry.inheritanceSource === 'string') {
        // Legacy single-value string (v1/v2/v3)
        if (canWrite(readInheritanceSource(control.id).trim() === '', opts, summary)) {
          writeInheritanceSource(control.id, entry.inheritanceSource)
          if (entry.inheritanceSource.trim() !== '') summary.inheritanceSourcesWritten++
        }
      }
    }

    // Objective-level inheritance sources (v4+)
    if (opts.categories.inheritanceSource) {
      if (
        'objectiveInheritance' in entry &&
        entry.objectiveInheritance !== null &&
        typeof entry.objectiveInheritance === 'object' &&
        !Array.isArray(entry.objectiveInheritance)
      ) {
        for (const [objId, sources] of Object.entries(entry.objectiveInheritance)) {
          if (!knownObjectiveIds.has(objId)) { summary.skippedUnknownObjective++; continue }
          if (Array.isArray(sources)) {
            const filtered = sources.filter((s) => typeof s === 'string' && s.trim())
            if (canWrite(readObjectiveInheritance(control.id, objId).length === 0, opts, summary)) {
              writeObjectiveInheritance(control.id, objId, filtered)
              if (filtered.length > 0) summary.objectiveInheritanceWritten++
            }
          }
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
          const ids = [...new Set(entry.evidencePool.map(resolveImportedEntry).filter(Boolean))]
          if (canWrite(readPoolIds(control.id).length === 0, opts, summary)) {
            writePoolIds(control.id, ids)
            if (ids.length > 0) summary.evidencePoolsWritten++
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
              const ids = [...new Set(artifacts.map(resolveImportedEntry).filter(Boolean))]
              if (canWrite(readObjectiveArtifactIds(control.id, objId).length === 0, opts, summary)) {
                writeObjectiveArtifactIds(control.id, objId, ids)
                if (ids.length > 0) summary.objectiveArtifactsWritten++
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

    // Objective Findings (Findings Builder final statements)
    if (opts.categories.objectiveFindings) {
      if (
        'objectiveFindings' in entry &&
        entry.objectiveFindings !== null &&
        typeof entry.objectiveFindings === 'object' &&
        !Array.isArray(entry.objectiveFindings)
      ) {
        for (const [objId, finding] of Object.entries(entry.objectiveFindings)) {
          if (!knownObjectiveIds.has(objId)) { summary.skippedUnknownObjective++; continue }
          if (finding !== null && typeof finding === 'object' && !Array.isArray(finding)) {
            // Only write if finalText is a non-empty string — malformed entries are skipped.
            if (typeof finding.finalText !== 'string' || !finding.finalText.trim()) continue
            const currentIsEmpty = readObjectiveFinding(control.id, objId) === null
            if (canWrite(currentIsEmpty, opts, summary)) {
              writeObjectiveFinding(control.id, objId, finding)
              summary.objectiveFindingsWritten++
            }
          }
        }
      }
    }

    // Objective Interviewed Roles (role chips for the Findings Builder)
    if (opts.categories.objectiveInterviewedRoles) {
      if (
        'objectiveInterviewedRoles' in entry &&
        entry.objectiveInterviewedRoles !== null &&
        typeof entry.objectiveInterviewedRoles === 'object' &&
        !Array.isArray(entry.objectiveInterviewedRoles)
      ) {
        for (const [objId, roles] of Object.entries(entry.objectiveInterviewedRoles)) {
          if (!knownObjectiveIds.has(objId)) { summary.skippedUnknownObjective++; continue }
          if (Array.isArray(roles)) {
            const filtered = roles.filter((r) => typeof r === 'string' && r.trim())
            const currentIsEmpty = readObjectiveInterviewedRoles(control.id, objId).length === 0
            if (canWrite(currentIsEmpty, opts, summary)) {
              writeObjectiveInterviewedRoles(control.id, objId, filtered)
              if (filtered.length > 0) summary.objectiveInterviewedRolesWritten++
            }
          }
        }
      }
    }
  }

  return summary
}

// =========================================================================
// Wipe helper — clears all user/project state from localStorage.
// Does NOT remove static source data (controls, evidence, relationships).
// Does NOT remove UI preferences (theme).
// =========================================================================

// localStorage key prefixes that belong to project/assessment state.
const WIPE_PREFIXES = [
  'cmmc-status-',
  'cmmc-note-',
  'cmmc-objective-note-',
  'cmmc-obj-status-',
  'cmmc-inheritance-',
  'cmmc-inheritance-source-',
  'cmmc-inheritance-sources-',
  'cmmc-obj-inheritance-',
  'cmmc-assigned-to-',
  'cmmc-pool-',
  'cmmc-obj-artifacts-',
  'cmmc-objective-result-',
  'cmmc-objective-finding-',
  'cmmc-objective-interviewed-roles-',
]

// Exact localStorage keys that belong to project/assessment state.
const WIPE_EXACT_KEYS = [
  'cmmc-artifacts',
  'cmmc-companion-dibcac-review-groups',
  'cmmc-environment-profile',
  'cmmc-export-osc',
  'cmmc-export-assessment',
  'cmmc-last-backup',
]

export function wipeProjectState() {
  try {
    // Collect prefix-matched keys first (iterating while deleting is unsafe).
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && WIPE_PREFIXES.some((p) => key.startsWith(p))) keysToRemove.push(key)
    }
    for (const key of keysToRemove) localStorage.removeItem(key)
    for (const key of WIPE_EXACT_KEYS) localStorage.removeItem(key)
  } catch { /* storage unavailable */ }

  // Reset in-memory artifact registry cache so the cleared storage takes effect.
  clearRegistry()
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
