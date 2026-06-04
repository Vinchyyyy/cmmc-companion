// Objective-level artifact references for CMMC control assessment.
// Stores per-objective artifact name references as a JSON string array.
// Mirrors the structure of evidencePool.js so the storage pattern stays consistent.
//
// Storage key format: cmmc-obj-artifacts-{controlId}-{objectiveId}
// Stored value: JSON string array, e.g. ["SSP.pdf", "RBAC Configuration.png"]
//
// These are metadata references only — filenames or artifact labels.
// No file contents, no uploads, no CUI.

const STORAGE_PREFIX = 'cmmc-obj-artifacts-'

function objectiveArtifactsKey(controlId, objectiveId) {
  return `${STORAGE_PREFIX}${controlId}-${objectiveId}`
}

// Safe localStorage read — returns [] if storage is unavailable, key is
// absent, the stored value fails to parse, or the parsed value is not an array.
// Non-string elements in a valid array are filtered out.
export function readObjectiveArtifacts(controlId, objectiveId) {
  if (!controlId || !objectiveId) return []
  try {
    const raw = localStorage.getItem(objectiveArtifactsKey(controlId, objectiveId))
    if (raw === null) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}

// True if any of the control's objectives has at least one artifact reference.
// Stops at the first non-empty objective found.
// Checks objective artifact storage only — ignores the Evidence Pool.
export function hasObjectiveArtifacts(control) {
  if (!control || !Array.isArray(control.objectives)) return false
  for (const obj of control.objectives) {
    if (readObjectiveArtifacts(control.id, obj.id).length > 0) return true
  }
  return false
}

// Safe localStorage write — removes the key entirely when items is empty,
// silently fails if storage is unavailable.
export function writeObjectiveArtifacts(controlId, objectiveId, items) {
  if (!controlId || !objectiveId) return
  try {
    if (!Array.isArray(items) || items.length === 0) {
      localStorage.removeItem(objectiveArtifactsKey(controlId, objectiveId))
    } else {
      localStorage.setItem(objectiveArtifactsKey(controlId, objectiveId), JSON.stringify(items))
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}
