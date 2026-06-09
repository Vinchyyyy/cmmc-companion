const ASSIGNMENT_PREFIX = 'cmmc-assigned-to-'

// Returns the stored assignee string, or '' if unset or storage unavailable.
export function readAssignedTo(controlId) {
  if (!controlId) return ''
  try {
    return localStorage.getItem(`${ASSIGNMENT_PREFIX}${controlId}`) ?? ''
  } catch {
    return ''
  }
}

// Persists the assignee string trimmed. Removes the key when blank.
export function writeAssignedTo(controlId, value) {
  if (!controlId) return
  try {
    const trimmed = typeof value === 'string' ? value.trim() : ''
    if (!trimmed) {
      localStorage.removeItem(`${ASSIGNMENT_PREFIX}${controlId}`)
    } else {
      localStorage.setItem(`${ASSIGNMENT_PREFIX}${controlId}`, trimmed)
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}
