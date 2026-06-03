// Shared notes utility for CMMC control assessment tracking.
// Mirrors the structure of status.js so the storage pattern stays consistent
// across the app.

const STORAGE_PREFIX = 'cmmc-note-'

// Safe localStorage read — returns an empty string if storage is unavailable
// (private browsing, quota errors, SSR) or no value exists yet for this control.
export function readNote(controlId) {
  if (!controlId) return ''
  try {
    const value = localStorage.getItem(`${STORAGE_PREFIX}${controlId}`)
    return value ?? ''
  } catch {
    return ''
  }
}

// Safe localStorage write — silently fails if storage is unavailable.
export function writeNote(controlId, value) {
  if (!controlId) return
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${controlId}`, value)
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}
