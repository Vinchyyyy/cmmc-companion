// User-defined inheritance sources that aren't in the curated PROVIDERS
// catalog (src/data/providers.js). Previously, typing a brand-new provider
// name into "Inherited From" only ever lived on that one control — it never
// became a suggestion anywhere else. This pool is a small localStorage-backed
// list an assessor can promote a custom name into, so it starts showing up
// as a suggestion across every control, the same way catalog providers do.

import { PROVIDERS } from '../data/providers'

const STORAGE_KEY = 'cmmc-custom-providers'

export function isCatalogProvider(name) {
  const q = String(name).trim().toLowerCase()
  return PROVIDERS.some((p) => p.name.toLowerCase() === q)
}

export function readCustomProviders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string' && n.trim()) : []
  } catch {
    return []
  }
}

function writeCustomProviders(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}

export function isInCustomPool(name) {
  const q = String(name).trim().toLowerCase()
  return readCustomProviders().some((n) => n.toLowerCase() === q)
}

// Adds a name to the pool unless it's already there or already in the
// curated catalog (catalog entries don't need a duplicate pool entry).
export function addCustomProvider(name) {
  const trimmed = String(name).trim()
  if (!trimmed || isCatalogProvider(trimmed)) return
  const current = readCustomProviders()
  if (current.some((n) => n.toLowerCase() === trimmed.toLowerCase())) return
  writeCustomProviders([...current, trimmed].sort((a, b) => a.localeCompare(b)))
}

export function renameCustomProvider(oldName, newName) {
  const trimmed = String(newName).trim()
  if (!trimmed) return
  const current = readCustomProviders()
  const next = current
    .filter((n) => n.toLowerCase() !== String(oldName).trim().toLowerCase())
    .concat(isCatalogProvider(trimmed) ? [] : [trimmed])
  writeCustomProviders([...new Set(next)].sort((a, b) => a.localeCompare(b)))
}

export function removeCustomProvider(name) {
  const q = String(name).trim().toLowerCase()
  writeCustomProviders(readCustomProviders().filter((n) => n.toLowerCase() !== q))
}
