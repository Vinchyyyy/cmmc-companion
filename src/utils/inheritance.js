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

const SOURCE_PREFIX = 'cmmc-inheritance-source-'

// Returns the stored source string, or '' if unset or storage unavailable.
export function readInheritanceSource(controlId) {
  if (!controlId) return ''
  try {
    return localStorage.getItem(`${SOURCE_PREFIX}${controlId}`) ?? ''
  } catch {
    return ''
  }
}

// Persists the source string. Removes the key when value is blank.
export function writeInheritanceSource(controlId, value) {
  if (!controlId) return
  try {
    if (!value || !value.trim()) {
      localStorage.removeItem(`${SOURCE_PREFIX}${controlId}`)
    } else {
      localStorage.setItem(`${SOURCE_PREFIX}${controlId}`, value)
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}

// Returns a warning object when inheritance is set but source is undocumented,
// or null when source is present or inheritance is None.
export function getInheritanceSourceWarning(inheritance, source) {
  if ((inheritance === 'Partial' || inheritance === 'Full') && (!source || !source.trim()))
    return {
      severity: 'caution',
      title: 'Inheritance Provider Not Documented',
      message: 'Inheritance Status is set, but no inheritance provider has been documented.',
      note: 'Inheritance Status identifies whether the control is inherited. Inherited From documents the provider, service, or source responsible for that inheritance.',
    }
  return null
}
