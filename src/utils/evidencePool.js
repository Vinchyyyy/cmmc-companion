// Evidence Pool utility for CMMC control assessment.
//
// Public API is name-based and unchanged: readPool returns display names and
// writePool accepts display names, so UI components and exporters keep receiving
// artifact names. Internally the per-control list is stored as artifact-id
// references resolved through the artifact registry.
//
// Storage key format: cmmc-pool-{controlId}
// Stored value: JSON array of artifact ids, e.g. ["art_3f9a2b1c", ...]
//   (legacy values are name arrays; reads self-heal them via the registry)
//
// These are metadata references only — filenames or artifact labels.
// No file contents, no uploads, no CUI.

import { idsToNames, namesToIds } from './artifactRegistry'

const STORAGE_PREFIX = 'cmmc-pool-'

// Raw storage accessors — operate on the stored array as-is (ids and/or legacy
// names). Mirror the safe-read / empty-clears-key behavior of the prior version.
function readRaw(controlId) {
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

function writeRaw(controlId, arr) {
  if (!controlId) return
  try {
    if (!Array.isArray(arr) || arr.length === 0) {
      localStorage.removeItem(`${STORAGE_PREFIX}${controlId}`)
    } else {
      localStorage.setItem(`${STORAGE_PREFIX}${controlId}`, JSON.stringify(arr))
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}

// --- Name-based public API (unchanged signatures) ---

// Returns display names. Resolves stored ids to names and self-heals any legacy
// name strings; unknown ids are dropped.
export function readPool(controlId) {
  return idsToNames(readRaw(controlId))
}

// Accepts display names. Converts to artifact ids (find-or-create) and stores
// ids; an empty list removes the key.
export function writePool(controlId, names) {
  writeRaw(controlId, namesToIds(names ?? []))
}

// --- Id-aware helpers (for projectState import/export only) ---

// Returns artifact ids, self-healing any legacy name entries to ids.
export function readPoolIds(controlId) {
  return namesToIds(readPool(controlId))
}

// Stores artifact ids directly, de-duplicating; an empty list removes the key.
export function writePoolIds(controlId, ids) {
  const deduped = [...new Set((ids ?? []).filter((v) => typeof v === 'string' && v))]
  writeRaw(controlId, deduped)
}
