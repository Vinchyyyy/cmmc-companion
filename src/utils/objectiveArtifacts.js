// Objective-level artifact references for CMMC control assessment.
//
// Public API is name-based and unchanged: readObjectiveArtifacts returns display
// names and writeObjectiveArtifacts accepts display names, so UI components and
// exporters keep receiving artifact names. Internally each per-objective list is
// stored as artifact-id references resolved through the artifact registry.
//
// Storage key format: cmmc-obj-artifacts-{controlId}-{objectiveId}
// Stored value: JSON array of artifact ids, e.g. ["art_3f9a2b1c", ...]
//   (legacy values are name arrays; reads self-heal them via the registry)
//
// These are metadata references only — filenames or artifact labels.
// No file contents, no uploads, no CUI.

import { idsToNames, namesToIds } from './artifactRegistry'

const STORAGE_PREFIX = 'cmmc-obj-artifacts-'

function objectiveArtifactsKey(controlId, objectiveId) {
  return `${STORAGE_PREFIX}${controlId}-${objectiveId}`
}

// Raw storage accessors — operate on the stored array as-is (ids and/or legacy
// names). Mirror the safe-read / empty-clears-key behavior of the prior version.
function readRaw(controlId, objectiveId) {
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

function writeRaw(controlId, objectiveId, arr) {
  if (!controlId || !objectiveId) return
  try {
    if (!Array.isArray(arr) || arr.length === 0) {
      localStorage.removeItem(objectiveArtifactsKey(controlId, objectiveId))
    } else {
      localStorage.setItem(objectiveArtifactsKey(controlId, objectiveId), JSON.stringify(arr))
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}

// --- Name-based public API (unchanged signatures) ---

// Returns display names. Resolves stored ids to names and self-heals any legacy
// name strings; unknown ids are dropped.
export function readObjectiveArtifacts(controlId, objectiveId) {
  return idsToNames(readRaw(controlId, objectiveId))
}

// Accepts display names. Converts to artifact ids (find-or-create) and stores
// ids; an empty list removes the key.
export function writeObjectiveArtifacts(controlId, objectiveId, names) {
  writeRaw(controlId, objectiveId, namesToIds(names ?? []))
}

// True if any of the control's objectives has at least one artifact reference.
// Stops at the first non-empty objective found. Checks objective artifact
// storage only — ignores the Evidence Pool. Uses the raw count to avoid
// resolving names for a boolean check.
export function hasObjectiveArtifacts(control) {
  if (!control || !Array.isArray(control.objectives)) return false
  for (const obj of control.objectives) {
    if (readRaw(control.id, obj.id).length > 0) return true
  }
  return false
}

// --- Id-aware helpers (for projectState import/export only) ---

// Returns artifact ids, self-healing any legacy name entries to ids.
export function readObjectiveArtifactIds(controlId, objectiveId) {
  return namesToIds(readObjectiveArtifacts(controlId, objectiveId))
}

// Stores artifact ids directly, de-duplicating; an empty list removes the key.
export function writeObjectiveArtifactIds(controlId, objectiveId, ids) {
  const deduped = [...new Set((ids ?? []).filter((v) => typeof v === 'string' && v))]
  writeRaw(controlId, objectiveId, deduped)
}
