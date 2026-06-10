const ASSIGNMENT_PREFIX = 'cmmc-assigned-to-'

/**
 * Normalizes an assignee name to Title Case with trimmed whitespace.
 * Each whitespace-separated word is capitalized; all other letters lowercased.
 *
 * Examples:
 *   'vince'      → 'Vince'
 *   'VINCE'      → 'Vince'
 *   'alex smith' → 'Alex Smith'
 *   '  vince  '  → 'Vince'
 *   ''           → ''
 */
export function normalizeAssignee(value) {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

// Returns the stored assignee string, or '' if unset or storage unavailable.
export function readAssignedTo(controlId) {
  if (!controlId) return ''
  try {
    return localStorage.getItem(`${ASSIGNMENT_PREFIX}${controlId}`) ?? ''
  } catch {
    return ''
  }
}

// Normalizes then persists the assignee string. Removes the key when blank.
export function writeAssignedTo(controlId, value) {
  if (!controlId) return
  try {
    const normalized = normalizeAssignee(value)
    if (!normalized) {
      localStorage.removeItem(`${ASSIGNMENT_PREFIX}${controlId}`)
    } else {
      localStorage.setItem(`${ASSIGNMENT_PREFIX}${controlId}`, normalized)
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}
