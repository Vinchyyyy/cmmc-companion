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
