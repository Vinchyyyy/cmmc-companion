// First-class artifact registry for CMMC control assessment.
//
// Promotes artifacts from bare name strings into stable, opaque-ID entities so
// that controlled evidence tagging can eventually attach to a durable identity.
// This phase establishes the entity layer only — tags exist on every record but
// remain empty, and no tagging/management UI is introduced.
//
// Storage key: cmmc-artifacts
// Stored value: a map keyed by artifact id, e.g.
//   {
//     "art_3f9a2b1c": {
//       "id": "art_3f9a2b1c",
//       "name": "Entra ID User Export.xlsx",
//       "tags": [],
//       "createdAt": "2026-06-13T...",
//       "updatedAt": "2026-06-13T..."
//     }
//   }
//
// Identity rule: normalized (trim + lowercase) name. Display name preserves the
// first-seen casing. IDs are opaque and stable for the life of the record so a
// future rename never orphans tags.
//
// These are metadata references only — names/labels, no file contents, no CUI.

const STORAGE_KEY = 'cmmc-artifacts'
const ID_RE = /^art_[0-9a-f]{8}$/

// In-memory cache so the per-call lookups added to readPool/readObjectiveArtifacts
// cost a Map.get rather than a JSON.parse (buildArtifactIndex reads every control).
let _cache = null      // { [id]: record }
let _nameIndex = null   // Map<normalizedName, id>

function _load() {
  if (_cache) return
  _cache = {}
  _nameIndex = new Map()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return
    for (const [id, rec] of Object.entries(parsed)) {
      if (!rec || typeof rec !== 'object' || typeof rec.name !== 'string') continue
      _cache[id] = {
        id,
        name: rec.name,
        tags: Array.isArray(rec.tags) ? rec.tags : [],
        createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : undefined,
        updatedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : undefined,
      }
      _nameIndex.set(normalizeName(rec.name), id)
    }
  } catch {
    // Corrupt/unavailable storage — operate from an empty cache.
    _cache = {}
    _nameIndex = new Map()
  }
}

function _persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache))
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}

// Generates a fresh opaque id (art_ + 8 random hex chars), retrying on the
// astronomically-unlikely collision with an existing record.
function _freshId() {
  // _load() is the caller's responsibility before this is used.
  let id
  do {
    id = genId()
  } while (_cache[id])
  return id
}

// trim + lowercase; tolerates non-string input.
export function normalizeName(name) {
  return String(name ?? '').trim().toLowerCase()
}

// Opaque id: "art_" + 8 random hex characters (4 bytes of entropy).
export function genId() {
  const bytes = new Uint8Array(4)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return `art_${hex}`
}

// true only for well-formed artifact ids.
export function isArtifactId(value) {
  return typeof value === 'string' && ID_RE.test(value)
}

export function listArtifacts() {
  _load()
  return Object.values(_cache)
}

export function getArtifact(id) {
  _load()
  return _cache[id]
}

export function findByName(name) {
  _load()
  const id = _nameIndex.get(normalizeName(name))
  return id ? _cache[id] : undefined
}

// Returns the existing record for this (normalized) name, or creates one.
// Blank/non-string names return undefined so callers can skip safely.
export function findOrCreate(name) {
  if (typeof name !== 'string') return undefined
  const display = name.trim()
  if (!display) return undefined
  _load()
  const norm = normalizeName(display)
  const existingId = _nameIndex.get(norm)
  if (existingId) return _cache[existingId]
  const id = _freshId()
  const now = new Date().toISOString()
  const rec = { id, name: display, tags: [], createdAt: now, updatedAt: now }
  _cache[id] = rec
  _nameIndex.set(norm, id)
  _persist()
  return rec
}

// Batch find-or-create that persists at most once. Returns a Map of
// normalizedName -> id for every non-blank name. Used by the migration to
// avoid one storage write per name.
export function ensureMany(names) {
  _load()
  const out = new Map()
  let changed = false
  for (const raw of names ?? []) {
    if (typeof raw !== 'string') continue
    const display = raw.trim()
    if (!display) continue
    const norm = normalizeName(display)
    if (out.has(norm)) continue
    let id = _nameIndex.get(norm)
    if (!id) {
      id = _freshId()
      const now = new Date().toISOString()
      _cache[id] = { id, name: display, tags: [], createdAt: now, updatedAt: now }
      _nameIndex.set(norm, id)
      changed = true
    }
    out.set(norm, id)
  }
  if (changed) _persist()
  return out
}

// Resolve a single stored entry to a display name.
//   - a known artifact id -> its name
//   - an unknown artifact id -> undefined (dropped safely)
//   - any other string -> treated as a legacy name and self-healed via findOrCreate
export function resolveEntryToName(entry) {
  if (typeof entry !== 'string') return undefined
  if (isArtifactId(entry)) {
    const rec = getArtifact(entry)
    return rec ? rec.name : undefined
  }
  const rec = findOrCreate(entry)
  return rec ? rec.name : undefined
}

// Resolve an array of stored entries (ids and/or legacy names) to display names,
// dropping unknown ids and de-duplicating by name while preserving order.
export function idsToNames(entries) {
  const out = []
  const seen = new Set()
  for (const entry of entries ?? []) {
    const name = resolveEntryToName(entry)
    if (name && !seen.has(name)) {
      seen.add(name)
      out.push(name)
    }
  }
  return out
}

// Convert display names to artifact ids (find-or-create), de-duplicating ids
// while preserving order. Every input is treated as a name — never as an id —
// so a file literally named like an id is preserved rather than dropped.
export function namesToIds(names) {
  const out = []
  const seen = new Set()
  for (const name of names ?? []) {
    const rec = findOrCreate(name)
    if (rec && !seen.has(rec.id)) {
      seen.add(rec.id)
      out.push(rec.id)
    }
  }
  return out
}

// Update the tags array for an existing artifact record.
// Normalizes to a de-duplicated array of non-empty strings.
// Returns the updated record on success, or false if the id is unknown.
export function updateArtifactTags(id, tags) {
  _load()
  const rec = _cache[id]
  if (!rec) return false
  const deduped = [...new Set((tags ?? []).filter((t) => typeof t === 'string' && t.trim()))]
  rec.tags = deduped
  rec.updatedAt = new Date().toISOString()
  _persist()
  return rec
}

// Force the next access to reload from storage. Primarily for tests and for
// callers that mutate cmmc-artifacts outside this module.
export function _resetCache() {
  _cache = null
  _nameIndex = null
}

// Remove all artifact registry data from localStorage and reset the in-memory
// cache. Called as part of the full project wipe flow.
export function clearRegistry() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* unavailable */ }
  _cache = null
  _nameIndex = null
}
