// Evidence Pool utility for CMMC control assessment.
// Stores per-control artifact name references as a JSON string array.
// Mirrors the structure of notes.js so the storage pattern stays consistent.
//
// Storage key format: cmmc-pool-{controlId}
// Stored value: JSON string array, e.g. ["SSP.pdf", "RBAC Configuration.png"]
//
// These are metadata references only — filenames or artifact labels.
// No file contents, no uploads, no CUI.

const STORAGE_PREFIX = 'cmmc-pool-'

// Safe localStorage read — returns [] if storage is unavailable, key is
// absent, or the stored value fails to parse as a string array.
export function readPool(controlId) {
  if (!controlId) return []
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${controlId}`)
    if (raw === null) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}

// Safe localStorage write — removes the key entirely when items is empty,
// silently fails if storage is unavailable.
export function writePool(controlId, items) {
  if (!controlId) return
  try {
    if (!Array.isArray(items) || items.length === 0) {
      localStorage.removeItem(`${STORAGE_PREFIX}${controlId}`)
    } else {
      localStorage.setItem(`${STORAGE_PREFIX}${controlId}`, JSON.stringify(items))
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}
