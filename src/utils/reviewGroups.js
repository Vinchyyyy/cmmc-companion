import { withCanonicalGroupOrder } from './dibcacReferences.js'
import { normalizePlannedAskRichDocument, richDocumentToLegacyContent } from './dibcacRichText.js'
import { safeSetItem, notifyStorageFailure } from './storageWrite.js'

const STORAGE_KEY  = 'cmmc-companion-dibcac-review-groups'
const FOLDERS_KEY  = 'cmmc-companion-dibcac-review-folders'

function normalizeGroups(groups) {
  return withCanonicalGroupOrder(groups).map((group) => {
    const plannedAskRichDocument = normalizePlannedAskRichDocument(group?.plannedAskRichDocument, group?.plannedAskContent, group?.plannedAsk)
    return {
      ...group,
      plannedAskRichDocument,
      plannedAskContent: richDocumentToLegacyContent(plannedAskRichDocument),
    }
  })
}

export function getReviewGroups() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const normalized = normalizeGroups(parsed)
    if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      safeSetItem(STORAGE_KEY, JSON.stringify(normalized))
    }
    return normalized
  } catch {
    return []
  }
}

export function saveReviewGroups(groups) {
  const normalized = normalizeGroups(groups)
  safeSetItem(STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

// Import commits are scoped to the two DIBCAC stores. Detect stale previews and
// restore the original values if either write fails instead of reporting success.
export function commitReviewPlan(plan) {
  const current = { groups: getReviewGroups(), folders: getReviewFolders() }
  if (JSON.stringify(current) !== plan.baseline) throw new Error('DIBCAC content changed after preview. Preview the file again before applying it.')
  const oldGroups = localStorage.getItem(STORAGE_KEY)
  const oldFolders = localStorage.getItem(FOLDERS_KEY)
  const groups = normalizeGroups(plan.groups)
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(plan.folders))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
  } catch (err) {
    notifyStorageFailure(STORAGE_KEY, err)
    try {
      if (localStorage.getItem(FOLDERS_KEY) !== oldFolders) {
        if (oldFolders === null) localStorage.removeItem(FOLDERS_KEY)
        else localStorage.setItem(FOLDERS_KEY, oldFolders)
      }
      if (localStorage.getItem(STORAGE_KEY) !== oldGroups) {
        if (oldGroups === null) localStorage.removeItem(STORAGE_KEY)
        else localStorage.setItem(STORAGE_KEY, oldGroups)
      }
    } catch { throw new Error('Import storage failed and rollback could not finish. Restore a project backup before continuing.') }
    throw new Error('Import could not be saved. Your previous DIBCAC data was restored. Browser storage may be full or unavailable.', { cause: err })
  }
  return { groups, folders: plan.folders }
}

// Normalize objective ref — groups may use `key` or `objectiveRef` field
function objRef(o) {
  return o.key ?? o.objectiveRef ?? null
}

export function createReviewGroup(group) {
  const groups = getReviewGroups()
  const next = [...groups, { ...group, createdAt: group.createdAt ?? new Date().toISOString() }]
  return saveReviewGroups(next)
}

export function updateReviewGroup(groupId, updates) {
  const groups = getReviewGroups()
  const next = groups.map((g) =>
    g.id === groupId ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
  )
  return saveReviewGroups(next)
}

export function deleteReviewGroup(groupId) {
  const groups = getReviewGroups()
  const next = groups.filter((g) => g.id !== groupId)
  return saveReviewGroups(next)
}

// objectiveData must have a `key` field ("AC.L1-3.1.1[a]") matching saved group shape
export function addObjectiveToGroup(groupId, objectiveData) {
  const groups = getReviewGroups()
  const ref = objRef(objectiveData)
  const next = groups.map((g) => {
    if (g.id !== groupId) return g
    const already = g.objectives.some((o) => objRef(o) === ref)
    if (already) return g
    return { ...g, objectives: [...g.objectives, objectiveData], updatedAt: new Date().toISOString() }
  })
  return saveReviewGroups(next)
}

export function removeObjectiveFromGroup(groupId, ref) {
  const groups = getReviewGroups()
  const next = groups.map((g) => {
    if (g.id !== groupId) return g
    return {
      ...g,
      objectives: g.objectives.filter((o) => objRef(o) !== ref),
      updatedAt: new Date().toISOString(),
    }
  })
  return saveReviewGroups(next)
}

// Returns all groups that contain this objective ref
export function findGroupsForObjective(ref) {
  return getReviewGroups().filter((g) =>
    g.objectives.some((o) => objRef(o) === ref)
  )
}

// ── Folder storage ─────────────────────────────────────────────────────────────

export function getReviewFolders() {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveReviewFolders(folders) {
  safeSetItem(FOLDERS_KEY, JSON.stringify(folders))
}

export function createReviewFolder(name) {
  const folders = getReviewFolders()
  const folder = { id: crypto.randomUUID(), name: name.trim(), createdAt: new Date().toISOString() }
  const next = [...folders, folder]
  saveReviewFolders(next)
  return next
}

export function updateReviewFolder(folderId, updates) {
  const folders = getReviewFolders()
  const next = folders.map((f) => f.id === folderId ? { ...f, ...updates } : f)
  saveReviewFolders(next)
  return next
}

export function deleteReviewFolder(folderId) {
  const folders = getReviewFolders()
  const next = folders.filter((f) => f.id !== folderId)
  saveReviewFolders(next)
  return next
}

// Moves a group into a folder (or clears its folder when folderId is null).
export function assignGroupToFolder(groupId, folderId) {
  return updateReviewGroup(groupId, { folderId: folderId ?? null })
}
