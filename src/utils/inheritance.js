// Shared inheritance tracking utility for CMMC controls.
// Mirrors the structure of status.js so the storage pattern stays consistent.
//
// Inheritance reflects whether a control is satisfied by the infrastructure
// or services of an enclave provider (e.g., a managed cloud, a GovCloud
// environment) rather than being independently implemented by the organization.

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
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${controlId}`, value)
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
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
  try {
    if (!value || !value.trim()) {
      localStorage.removeItem(`${SOURCE_PREFIX}${controlId}`)
      localStorage.removeItem(`${SOURCES_PREFIX}${controlId}`)
    } else {
      localStorage.setItem(`${SOURCE_PREFIX}${controlId}`, value)
      localStorage.setItem(`${SOURCES_PREFIX}${controlId}`, JSON.stringify([value]))
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
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
  try {
    const filtered = sources.filter((s) => s && s.trim())
    if (filtered.length === 0) {
      localStorage.removeItem(`${SOURCES_PREFIX}${controlId}`)
      localStorage.removeItem(`${SOURCE_PREFIX}${controlId}`)
    } else {
      localStorage.setItem(`${SOURCES_PREFIX}${controlId}`, JSON.stringify(filtered))
      // Keep legacy key in sync so existing filter logic continues to see the first source
      localStorage.setItem(`${SOURCE_PREFIX}${controlId}`, filtered[0])
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
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
  try {
    const filtered = (sources ?? []).filter((s) => s && s.trim())
    if (filtered.length === 0) {
      localStorage.removeItem(`${OBJ_INHERIT_PREFIX}${controlId}-${objectiveId}`)
    } else {
      localStorage.setItem(`${OBJ_INHERIT_PREFIX}${controlId}-${objectiveId}`, JSON.stringify(filtered))
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
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
