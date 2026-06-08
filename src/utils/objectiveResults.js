// Shared utility for per-objective assessment result fields.
// Mirrors the structure of objectiveNotes.js so the storage pattern stays consistent.
//
// Storage key format: cmmc-objective-result-{controlId}-{objectiveId}
// Value: JSON object with four fields aligned to the CMMC L2 assessment template:
//   { interviews, examine, test, overallComments }
//
// The controlId is part of the key because objective IDs ("a", "b", "c"...)
// repeat across every control — without controlId scoping, every control's
// objective "a" would share one storage slot.

const STORAGE_PREFIX = 'cmmc-objective-result-'

const DEFAULT_RESULT = { interviews: '', examine: '', test: '', overallComments: '' }

function objectiveResultKey(controlId, objectiveId) {
  return `${STORAGE_PREFIX}${controlId}-${objectiveId}`
}

function coerceString(v) {
  return typeof v === 'string' ? v : ''
}

// Safe localStorage read — returns the default object if the key is missing,
// JSON is invalid, or storage is unavailable (private browsing, quota, SSR).
// Each field is coerced to a string; missing or non-string fields default to ''.
export function readObjectiveResult(controlId, objectiveId) {
  if (!controlId || !objectiveId) return { ...DEFAULT_RESULT }
  try {
    const raw = localStorage.getItem(objectiveResultKey(controlId, objectiveId))
    if (raw === null) return { ...DEFAULT_RESULT }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_RESULT }
    return {
      interviews:      coerceString(parsed.interviews),
      examine:         coerceString(parsed.examine),
      test:            coerceString(parsed.test),
      overallComments: coerceString(parsed.overallComments),
    }
  } catch {
    return { ...DEFAULT_RESULT }
  }
}

// Safe localStorage write — merges incoming fields with defaults so callers can
// pass a partial update. If all four fields are blank after trimming, the key is
// removed to avoid accumulating empty-object noise. Fails silently on storage errors.
export function writeObjectiveResult(controlId, objectiveId, result) {
  if (!controlId || !objectiveId) return
  try {
    const merged = {
      interviews:      coerceString(result?.interviews),
      examine:         coerceString(result?.examine),
      test:            coerceString(result?.test),
      overallComments: coerceString(result?.overallComments),
    }
    const allBlank = Object.values(merged).every((v) => v.trim() === '')
    if (allBlank) {
      localStorage.removeItem(objectiveResultKey(controlId, objectiveId))
    } else {
      localStorage.setItem(objectiveResultKey(controlId, objectiveId), JSON.stringify(merged))
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}

// True if any of the control's objectives has at least one non-blank result field.
// Stops at the first non-blank value found.
// Defensive against a missing/malformed control argument.
export function hasObjectiveResults(control) {
  if (!control || !Array.isArray(control.objectives)) return false
  for (const obj of control.objectives) {
    const result = readObjectiveResult(control.id, obj.id)
    if (Object.values(result).some((v) => v.trim() !== '')) return true
  }
  return false
}
