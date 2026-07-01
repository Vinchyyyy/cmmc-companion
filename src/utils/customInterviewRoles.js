// User-defined interviewed roles/titles, kept locally so they persist across
// refresh and are available for every control/objective in this browser.
// Storage key: cmmc-custom-interview-roles
// Value: JSON array of role label strings (deduped case-insensitively, first
// casing entered wins, sorted alphabetically).

const STORAGE_KEY = 'cmmc-custom-interview-roles'

export function readCustomInterviewRoles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((r) => typeof r === 'string' && r.trim())
  } catch {
    return []
  }
}

function writeCustomInterviewRoles(roles) {
  try {
    if (roles.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(roles))
    }
  } catch {
    // storage unavailable
  }
}

// Adds a custom role (trimmed, case-insensitive dedupe, first casing wins,
// sorted alphabetically) and returns the updated list. Blank input is a no-op.
export function addCustomInterviewRole(role) {
  const trimmed = String(role || '').trim()
  const existing = readCustomInterviewRoles()
  if (!trimmed) return existing

  const alreadyExists = existing.some((r) => r.toLowerCase() === trimmed.toLowerCase())
  const updated = alreadyExists
    ? existing
    : [...existing, trimmed].sort((a, b) => a.localeCompare(b))

  writeCustomInterviewRoles(updated)
  return updated
}

// Removes a custom role by exact label. Any objective that already has this
// role saved in its own interviewed-roles list is unaffected.
export function removeCustomInterviewRole(role) {
  const existing = readCustomInterviewRoles()
  const updated = existing.filter((r) => r !== role)
  writeCustomInterviewRoles(updated)
  return updated
}
