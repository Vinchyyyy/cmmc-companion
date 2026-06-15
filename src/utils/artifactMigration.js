// One-shot, idempotent migration that promotes artifact storage from bare name
// strings to artifact-id references backed by the artifact registry.
//
// Legacy storage (data version < 3):
//   cmmc-pool-{controlId}                       -> ["Name.xlsx", ...]
//   cmmc-obj-artifacts-{controlId}-{objId}      -> ["Name.xlsx", ...]
//
// After migration (data version 3):
//   the same keys hold ["art_xxxxxxxx", ...] and cmmc-artifacts holds the records.
//
// Safety properties:
//   - Idempotent: no-op once cmmc-data-version >= 3.
//   - A one-time snapshot is written to cmmc-backup-pre-v3 before any rewrite.
//   - The version is bumped only after a fully successful pass; on error the
//     legacy data is left intact (and reads still self-heal via the registry).
//   - Re-runnable after a partial/interrupted pass: entries already converted to
//     ids are passed through, names are (re)resolved.

import { ensureMany, isArtifactId, normalizeName, listArtifacts } from './artifactRegistry'

export const CURRENT_DATA_VERSION = 3
const DATA_VERSION_KEY = 'cmmc-data-version'
const BACKUP_KEY = 'cmmc-backup-pre-v3'
const POOL_PREFIX = 'cmmc-pool-'
const OBJ_PREFIX = 'cmmc-obj-artifacts-'

export function getDataVersion() {
  try {
    const raw = localStorage.getItem(DATA_VERSION_KEY)
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function listKeysByPrefix(prefix) {
  const keys = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(prefix)) keys.push(k)
    }
  } catch {
    // localStorage unavailable — nothing to migrate.
  }
  return keys
}

function readStringArray(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}

// Runs the migration. Returns a small result object; never throws.
export function runArtifactRegistryMigration() {
  if (getDataVersion() >= CURRENT_DATA_VERSION) {
    return { migrated: false, reason: 'up-to-date' }
  }

  try {
    const poolKeys = listKeysByPrefix(POOL_PREFIX)
    const objKeys = listKeysByPrefix(OBJ_PREFIX)
    const allKeys = [...poolKeys, ...objKeys]

    // Snapshot the original legacy values before touching anything. Guarded so a
    // re-run after a partial pass cannot overwrite the true pre-migration state.
    if (localStorage.getItem(BACKUP_KEY) === null) {
      const backup = {}
      for (const key of allKeys) {
        const raw = localStorage.getItem(key)
        if (raw !== null) backup[key] = raw
      }
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup))
    }

    // Collect every legacy name across both layers (ids are passed through later),
    // then create all records in a single persisted batch.
    const parsedByKey = new Map()
    const names = []
    for (const key of allKeys) {
      const entries = readStringArray(key)
      parsedByKey.set(key, entries)
      for (const e of entries) {
        if (!isArtifactId(e)) names.push(e)
      }
    }
    const normToId = ensureMany(names)

    // Rewrite each key's array from names (and any pre-existing ids) to ids,
    // de-duplicating while preserving order.
    let keysRewritten = 0
    for (const [key, entries] of parsedByKey) {
      const ids = []
      const seen = new Set()
      for (const e of entries) {
        const id = isArtifactId(e) ? e : normToId.get(normalizeName(e))
        if (id && !seen.has(id)) {
          seen.add(id)
          ids.push(id)
        }
      }
      if (ids.length === 0) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, JSON.stringify(ids))
      }
      keysRewritten++
    }

    localStorage.setItem(DATA_VERSION_KEY, String(CURRENT_DATA_VERSION))

    return {
      migrated: true,
      counts: {
        poolKeys: poolKeys.length,
        objectiveKeys: objKeys.length,
        keysRewritten,
        artifacts: listArtifacts().length,
      },
    }
  } catch (err) {
    // Leave legacy data and the version untouched; reads self-heal via the registry.
    return { migrated: false, error: err?.message ?? String(err) }
  }
}
