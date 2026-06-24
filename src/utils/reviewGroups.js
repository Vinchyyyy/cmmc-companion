const STORAGE_KEY = 'cmmc-companion-dibcac-review-groups'

export function getReviewGroups() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveReviewGroups(groups) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(groups)) } catch { /* storage unavailable */ }
}

// Normalize objective ref — groups may use `key` or `objectiveRef` field
function objRef(o) {
  return o.key ?? o.objectiveRef ?? null
}

export function createReviewGroup(group) {
  const groups = getReviewGroups()
  const next = [{ ...group, createdAt: group.createdAt ?? new Date().toISOString() }, ...groups]
  saveReviewGroups(next)
  return next
}

export function updateReviewGroup(groupId, updates) {
  const groups = getReviewGroups()
  const next = groups.map((g) =>
    g.id === groupId ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
  )
  saveReviewGroups(next)
  return next
}

export function deleteReviewGroup(groupId) {
  const groups = getReviewGroups()
  const next = groups.filter((g) => g.id !== groupId)
  saveReviewGroups(next)
  return next
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
  saveReviewGroups(next)
  return next
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
  saveReviewGroups(next)
  return next
}

// Returns all groups that contain this objective ref
export function findGroupsForObjective(ref) {
  return getReviewGroups().filter((g) =>
    g.objectives.some((o) => objRef(o) === ref)
  )
}
