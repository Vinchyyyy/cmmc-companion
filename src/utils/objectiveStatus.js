// Objective-level status tracking for CMMC control assessment.
// Mirrors the structure of objectiveNotes.js so the storage pattern stays consistent.
//
// Storage key format: cmmc-obj-status-{controlId}-{objectiveId}
// The controlId is part of the key because objective IDs ("a", "b", "c"...)
// repeat across every control.

import { writeStatus } from './status'

const STORAGE_PREFIX = 'cmmc-obj-status-'

export const OBJECTIVE_STATUS_UNREVIEWED = 'Unreviewed'
export const OBJECTIVE_STATUS_MET        = 'MET'
export const OBJECTIVE_STATUS_NOT_MET    = 'NOT MET'

export const OBJECTIVE_STATUSES = [
  OBJECTIVE_STATUS_UNREVIEWED,
  OBJECTIVE_STATUS_MET,
  OBJECTIVE_STATUS_NOT_MET,
]

function objectiveStatusKey(controlId, objectiveId) {
  return `${STORAGE_PREFIX}${controlId}-${objectiveId}`
}

// Safe localStorage read — returns Unreviewed if storage is unavailable,
// key is absent, or stored value is not a recognized status.
export function readObjectiveStatus(controlId, objectiveId) {
  if (!controlId || !objectiveId) return OBJECTIVE_STATUS_UNREVIEWED
  try {
    const value = localStorage.getItem(objectiveStatusKey(controlId, objectiveId))
    return OBJECTIVE_STATUSES.includes(value) ? value : OBJECTIVE_STATUS_UNREVIEWED
  } catch {
    return OBJECTIVE_STATUS_UNREVIEWED
  }
}

// Safe localStorage write — removes the key for Unreviewed (default),
// stores value for MET or NOT MET, silently fails if storage is unavailable.
export function writeObjectiveStatus(controlId, objectiveId, value) {
  if (!controlId || !objectiveId) return
  try {
    if (value === OBJECTIVE_STATUS_UNREVIEWED) {
      localStorage.removeItem(objectiveStatusKey(controlId, objectiveId))
    } else if (OBJECTIVE_STATUSES.includes(value)) {
      localStorage.setItem(objectiveStatusKey(controlId, objectiveId), value)
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}

// Derives a trending status from an objectives array and a statusMap
// ({ objId: status }). Pure — reads no localStorage, writes nothing.
// Missing keys in statusMap are treated as Unreviewed.
//
// Rules (evaluated in priority order):
//   1. No objectives → Not Started
//   2. Any NOT MET  → NOT MET
//   3. All MET      → MET
//   4. Any MET or NOT MET → In Progress
//   5. Otherwise   → Not Started
export function getTrendingStatus(objectives, statusMap) {
  if (!Array.isArray(objectives) || objectives.length === 0) return 'Not Started'
  const statuses = objectives.map((obj) => statusMap?.[obj.id] ?? OBJECTIVE_STATUS_UNREVIEWED)
  if (statuses.some((s) => s === OBJECTIVE_STATUS_NOT_MET)) return 'NOT MET'
  if (statuses.every((s) => s === OBJECTIVE_STATUS_MET))    return 'MET'
  if (statuses.some((s) => s === OBJECTIVE_STATUS_MET || s === OBJECTIVE_STATUS_NOT_MET)) return 'In Progress'
  return 'Not Started'
}

// Convenience wrapper that reads objective statuses from localStorage and
// passes them to the pure getTrendingStatus helper.
// Use this in list views (ControlLibrary) where state is not available.
export function getTrendingStatusFromStorage(control) {
  if (!control || !Array.isArray(control.objectives)) return 'Not Started'
  const statusMap = {}
  for (const obj of control.objectives) {
    statusMap[obj.id] = readObjectiveStatus(control.id, obj.id)
  }
  return getTrendingStatus(control.objectives, statusMap)
}

// Recomputes the control-level Status field from current objective statuses
// and writes it — mirrors ControlDetail's own syncStatusToTrending so any
// surface that sets an objective's status outside ControlDetail (DIBCAC
// Mode's checklist toggle and status-cycle button) keeps Control Library and
// Home in sync too. Without this, marking the last remaining objective MET
// from DIBCAC Mode would leave the control's own Status stuck at whatever it
// was before, even though every objective is now MET.
export function syncControlStatusFromObjectives(control) {
  if (!control) return
  writeStatus(control.id, getTrendingStatusFromStorage(control))
}

// Returns a warning object when Assessment Status and Trending Status conflict,
// or null when the combination is expected/acceptable.
const STATUS_CONSISTENCY_NOTE = 'Assessment Status reflects the selected workflow status. Trending Status reflects objective-level status selections.'

export function getStatusConsistencyWarning(assessmentStatus, trendingStatus) {
  if (assessmentStatus === 'MET' && trendingStatus === 'NOT MET')
    return {
      severity: 'warning',
      title: 'Status Consistency Warning',
      message: 'Assessment Status is MET, but Trending Status is NOT MET because at least one objective is marked NOT MET.',
      note: STATUS_CONSISTENCY_NOTE,
    }
  if (assessmentStatus === 'NOT MET' && trendingStatus === 'MET')
    return {
      severity: 'warning',
      title: 'Status Consistency Warning',
      message: 'Assessment Status is NOT MET, but Trending Status is MET because all objectives are currently marked MET.',
      note: STATUS_CONSISTENCY_NOTE,
    }
  if (assessmentStatus === 'MET' && trendingStatus === 'In Progress')
    return {
      severity: 'caution',
      title: 'Status Consistency Warning',
      message: 'Assessment Status is MET, but Trending Status is In Progress because not all objectives have been fully reviewed.',
      note: STATUS_CONSISTENCY_NOTE,
    }
  if (assessmentStatus === 'NOT MET' && trendingStatus === 'In Progress')
    return {
      severity: 'caution',
      title: 'Status Consistency Warning',
      message: 'Assessment Status is NOT MET, but Trending Status is In Progress because objective review is still incomplete.',
      note: STATUS_CONSISTENCY_NOTE,
    }
  if (assessmentStatus === 'Not Started' && trendingStatus !== 'Not Started')
    return {
      severity: 'caution',
      title: 'Status Consistency Warning',
      message: 'Assessment Status is Not Started, but objective statuses have already been entered.',
      note: STATUS_CONSISTENCY_NOTE,
    }
  return null
}

// True if any of the control's objectives has a non-Unreviewed status.
// Stops at the first set objective found.
export function hasObjectiveStatuses(control) {
  if (!control || !Array.isArray(control.objectives)) return false
  for (const obj of control.objectives) {
    if (readObjectiveStatus(control.id, obj.id) !== OBJECTIVE_STATUS_UNREVIEWED) return true
  }
  return false
}
