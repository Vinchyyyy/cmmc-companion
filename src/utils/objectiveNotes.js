// Shared utility for per-objective assessment notes.
// Mirrors the structure of status.js and notes.js so the storage pattern
// stays consistent across the app.
//
// Storage key format: cmmc-objective-note-{controlId}-{objectiveId}
// The controlId is part of the key because objective IDs ("a", "b", "c"...)
// repeat across every control — without controlId scoping, every control's
// objective "a" would share one storage slot.

const STORAGE_PREFIX = 'cmmc-objective-note-'

function objectiveNoteKey(controlId, objectiveId) {
  return `${STORAGE_PREFIX}${controlId}-${objectiveId}`
}

// Safe localStorage read — returns an empty string if storage is unavailable
// (private browsing, quota errors, SSR) or no value exists yet.
export function readObjectiveNote(controlId, objectiveId) {
  if (!controlId || !objectiveId) return ''
  try {
    const value = localStorage.getItem(objectiveNoteKey(controlId, objectiveId))
    return value ?? ''
  } catch {
    return ''
  }
}

// Safe localStorage write — silently fails if storage is unavailable.
export function writeObjectiveNote(controlId, objectiveId, value) {
  if (!controlId || !objectiveId) return
  try {
    localStorage.setItem(objectiveNoteKey(controlId, objectiveId), value)
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}

// True if any of the control's objectives has a non-empty note (whitespace
// only counts as empty). Stops at the first non-empty objective found.
// Defensive against a missing/malformed control argument.
export function hasObjectiveNotes(control) {
  if (!control || !Array.isArray(control.objectives)) return false
  for (const obj of control.objectives) {
    if (readObjectiveNote(control.id, obj.id).trim() !== '') return true
  }
  return false
}
