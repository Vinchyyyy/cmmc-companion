// Shared inheritance tracking utility for CMMC controls.
// Mirrors the structure of status.js so the storage pattern stays consistent.
//
// Inheritance reflects whether a control is satisfied by the infrastructure
// or services of an enclave provider (e.g., a managed cloud, a GovCloud
// environment) rather than being independently implemented by the organization.

import { ensureOscProvider } from './oscProfile'
import { safeSetItem } from './storageWrite.js'

const STORAGE_PREFIX = 'cmmc-inheritance-'

export const INHERITANCE_VALUES = ['None', 'Full', 'Partial']

export const DEFAULT_INHERITANCE = 'None'

// Maps inheritance value → CSS badge modifier class.
export const INHERITANCE_BADGE_CLASS = {
  'None':    'inheritance-badge--none',
  'Full':    'inheritance-badge--full',
  'Partial': 'inheritance-badge--partial',
}

// Safe localStorage read — returns 'None' if unavailable or unset.
export function readInheritance(controlId) {
  if (!controlId) return DEFAULT_INHERITANCE
  try {
    const value = localStorage.getItem(`${STORAGE_PREFIX}${controlId}`)
    return INHERITANCE_VALUES.includes(value) ? value : DEFAULT_INHERITANCE
  } catch {
    return DEFAULT_INHERITANCE
  }
}

// Safe localStorage write — silently fails if storage is unavailable.
export function writeInheritance(controlId, value) {
  if (!controlId) return
  safeSetItem(`${STORAGE_PREFIX}${controlId}`, value)
}

// -------------------------------------------------------------------------
// Inheritance source — documents where inherited coverage comes from.
// Keyed separately from the inheritance status so each field can evolve
// independently (e.g. future structured source metadata).
// -------------------------------------------------------------------------

const SOURCE_PREFIX  = 'cmmc-inheritance-source-'
const SOURCES_PREFIX = 'cmmc-inheritance-sources-'

// Returns the stored source string, or '' if unset or storage unavailable.
// Legacy single-value accessor — kept for Control Library filter compatibility.
export function readInheritanceSource(controlId) {
  if (!controlId) return ''
  try {
    // Prefer the multi-source array; return first entry as the "primary" source
    // so existing Control Library filter logic (which compares one string) still works.
    const raw = localStorage.getItem(`${SOURCES_PREFIX}${controlId}`)
    if (raw) {
      const arr = JSON.parse(raw)
      return Array.isArray(arr) && arr.length > 0 ? arr[0] : ''
    }
    return localStorage.getItem(`${SOURCE_PREFIX}${controlId}`) ?? ''
  } catch {
    return ''
  }
}

// Persists the source string. Removes the key when value is blank.
// Legacy single-value writer — kept so Control Library bulk ops still compile.
export function writeInheritanceSource(controlId, value) {
  if (!controlId) return
  try { localStorage.removeItem(`cmmc-inheritance-levels-${controlId}`) } catch { /* unavailable */ }
  if (!value || !value.trim()) {
    try {
      localStorage.removeItem(`${SOURCE_PREFIX}${controlId}`)
      localStorage.removeItem(`${SOURCES_PREFIX}${controlId}`)
    } catch { /* unavailable */ }
  } else {
    safeSetItem(`${SOURCE_PREFIX}${controlId}`, value)
    safeSetItem(`${SOURCES_PREFIX}${controlId}`, JSON.stringify([value]))
    ensureOscProvider(value)
  }
}

// ── Multi-source accessors ────────────────────────────────────────────────────
// Stored as a JSON array at cmmc-inheritance-sources-{id}.
// Falls back to the legacy single-value key for backward compatibility
// with projects saved before this change.

export function readInheritanceSources(controlId) {
  if (!controlId) return []
  try {
    const raw = localStorage.getItem(`${SOURCES_PREFIX}${controlId}`)
    if (raw) {
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? arr : []
    }
    // Backward compat: migrate legacy single-source string to array on first read
    const legacy = localStorage.getItem(`${SOURCE_PREFIX}${controlId}`)
    return legacy && legacy.trim() ? [legacy.trim()] : []
  } catch {
    return []
  }
}

export function writeInheritanceSources(controlId, sources) {
  if (!controlId) return
  const filtered = [...new Set(sources.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()))]
  writeInheritanceAssignments(controlId, readInheritanceAssignments(controlId).filter((item) => filtered.includes(item.source)))
  if (filtered.length === 0) {
    try {
      localStorage.removeItem(`${SOURCES_PREFIX}${controlId}`)
      localStorage.removeItem(`${SOURCE_PREFIX}${controlId}`)
    } catch { /* unavailable */ }
  } else {
    safeSetItem(`${SOURCES_PREFIX}${controlId}`, JSON.stringify(filtered))
    // Keep legacy key in sync so existing filter logic continues to see the first source
    safeSetItem(`${SOURCE_PREFIX}${controlId}`, filtered[0])
    for (const source of filtered) ensureOscProvider(source)
  }
}

// ── Objective-level inheritance sources ───────────────────────────────────────
// Stores which control-level inheritance sources apply to each objective.
// Storage key: cmmc-obj-inheritance-{controlId}-{objectiveId}
// Value: JSON array of source strings, e.g. ["Microsoft Entra ID"]
// Defaults to [] — old projects that never wrote this key are unaffected.

const OBJ_INHERIT_PREFIX = 'cmmc-obj-inheritance-'

export function readObjectiveInheritance(controlId, objectiveId) {
  if (!controlId || !objectiveId) return []
  try {
    const raw = localStorage.getItem(`${OBJ_INHERIT_PREFIX}${controlId}-${objectiveId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string' && v.trim()) : []
  } catch {
    return []
  }
}

export function writeObjectiveInheritance(controlId, objectiveId, sources) {
  if (!controlId || !objectiveId) return
  const filtered = (sources ?? []).filter((s) => s && s.trim())
  if (filtered.length === 0) {
    try { localStorage.removeItem(`${OBJ_INHERIT_PREFIX}${controlId}-${objectiveId}`) } catch { /* unavailable */ }
  } else {
    safeSetItem(`${OBJ_INHERIT_PREFIX}${controlId}-${objectiveId}`, JSON.stringify(filtered))
  }
}

// Propagation helpers keep control-level inheritance edits synchronized with
// every objective while preserving the user's ability to remove a source from
// an individual objective afterward.
export function addInheritanceSourceToObjectives(control, source) {
  const trimmed = String(source ?? '').trim()
  if (!control?.id || !trimmed) return
  for (const objective of control.objectives ?? []) {
    const current = readObjectiveInheritance(control.id, objective.id)
    if (!current.includes(trimmed)) {
      writeObjectiveInheritance(control.id, objective.id, [...current, trimmed])
    }
  }
}

export function removeInheritanceSourceFromObjectives(control, source) {
  if (!control?.id || !source) return
  for (const objective of control.objectives ?? []) {
    const current = readObjectiveInheritance(control.id, objective.id)
    if (current.includes(source)) {
      writeObjectiveInheritance(control.id, objective.id, current.filter((item) => item !== source))
    }
  }
}

export function renameInheritanceSourceOnObjectives(control, oldName, newName) {
  const trimmed = String(newName ?? '').trim()
  if (!control?.id || !oldName || !trimmed) return
  for (const objective of control.objectives ?? []) {
    const current = readObjectiveInheritance(control.id, objective.id)
    if (!current.includes(oldName)) continue
    const next = current.map((item) => (item === oldName ? trimmed : item))
    writeObjectiveInheritance(control.id, objective.id, [...new Set(next)])
  }
}

// Returns a warning object when inheritance is set but source is undocumented,
// or null when source is present or inheritance is None.
// Accepts a string (legacy) or an array (multi-source).
export function getInheritanceSourceWarning(inheritance, source) {
  const hasSource = Array.isArray(source)
    ? source.some((s) => s && s.trim())
    : (source && source.trim())
  if ((inheritance === 'Partial' || inheritance === 'Full') && !hasSource)
    return {
      severity: 'caution',
      title: 'Inheritance Provider Not Documented',
      message: 'Inheritance Status is set, but no inheritance provider has been documented.',
      note: 'Inheritance Status identifies whether the control is inherited. Inherited From documents the provider, service, or source responsible for that inheritance.',
    }
  return null
}

// Per-source assignment levels supplement the legacy control summary.
export function readInheritanceAssignments(controlId) {
  let levels = {}
  try { levels = JSON.parse(localStorage.getItem(`cmmc-inheritance-levels-${controlId}`)) || {} } catch { /* legacy project */ }
  return readInheritanceSources(controlId).map((source) => ({
    source,
    level: ['Partial', 'Full'].includes(levels[source]) ? levels[source] : readInheritance(controlId),
  }))
}

export function writeInheritanceAssignments(controlId, assignments) {
  const levels = Object.fromEntries(assignments.filter((item) => ['Partial', 'Full'].includes(item.level)).map((item) => [item.source, item.level]))
  safeSetItem(`cmmc-inheritance-levels-${controlId}`, JSON.stringify(levels))
}

export function applyControlInheritance(control, level, source = '', mode = 'replace') {
  if (!control?.id) return
  const previous = readInheritanceAssignments(control.id)
  const trimmed = source.trim()
  const next = level === 'None' ? [] : mode === 'add' ? [...previous] : []
  if (level !== 'None' && trimmed) {
    const existing = next.find((item) => item.source.toLowerCase() === trimmed.toLowerCase())
    if (existing) existing.level = level
    else next.push({ source: trimmed, level })
  }
  for (const item of previous) {
    if (!next.some((entry) => entry.source === item.source)) removeInheritanceSourceFromObjectives(control, item.source)
  }
  writeInheritanceSources(control.id, next.map((item) => item.source))
  writeInheritanceAssignments(control.id, next)
  // Mixed source levels remain Partial; adding sources does not imply full coverage.
  writeInheritance(control.id, next.length ? (next.every((item) => item.level === 'Full') ? 'Full' : 'Partial') : 'None')
  if (trimmed && level !== 'None') {
    // Only propagate to every objective when the source is genuinely new to
    // this control. Re-applying an already-present source (e.g. clicking
    // "Add Inheritance" again for the same provider, just to change its
    // level) must not re-add it to objectives where the user deliberately
    // removed it via the per-objective picker — see
    // removeInheritanceSourceFromObjectives / addInheritanceSourceToObjectives.
    const wasAlreadyPresent = previous.some((item) => item.source.toLowerCase() === trimmed.toLowerCase())
    if (!wasAlreadyPresent) {
      const assigned = next.find((item) => item.source.toLowerCase() === trimmed.toLowerCase())
      addInheritanceSourceToObjectives(control, assigned.source)
    }
  }
}
