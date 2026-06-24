// Per-objective interviewed roles for the Findings Builder Interviewed line.
// Storage key: cmmc-objective-interviewed-roles-{controlId}-{objectiveId}
// Value: JSON array of role label strings.

const PREFIX = 'cmmc-objective-interviewed-roles-'

function roleKey(controlId, objectiveId) {
  return `${PREFIX}${controlId}-${objectiveId}`
}

export function readObjectiveInterviewedRoles(controlId, objectiveId) {
  if (!controlId || !objectiveId) return []
  try {
    const raw = localStorage.getItem(roleKey(controlId, objectiveId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((r) => typeof r === 'string' && r.trim())
  } catch {
    return []
  }
}

export function writeObjectiveInterviewedRoles(controlId, objectiveId, roles) {
  if (!controlId || !objectiveId) return
  try {
    const valid = (roles ?? []).filter((r) => typeof r === 'string' && r.trim())
    if (valid.length === 0) {
      localStorage.removeItem(roleKey(controlId, objectiveId))
    } else {
      localStorage.setItem(roleKey(controlId, objectiveId), JSON.stringify(valid))
    }
  } catch {
    // storage unavailable
  }
}
