// Per-objective interviewed roles for the Findings Builder Interviewed line.
// Storage key: cmmc-objective-interviewed-roles-{controlId}-{objectiveId}
// Value: JSON array of role label strings.

const PREFIX = 'cmmc-objective-interviewed-roles-'
import { readAssessmentStaff } from './oscProfile.js'
import { syncObjectiveFindingRoles } from './objectiveFindings.js'

function roleKey(controlId, objectiveId) {
  return `${PREFIX}${controlId}-${objectiveId}`
}

export function readStoredObjectiveInterviewedRoles(controlId, objectiveId) {
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

export function readObjectiveInterviewedRoles(controlId, objectiveId) {
  return [...new Set([...readAssessmentStaff(), ...readStoredObjectiveInterviewedRoles(controlId, objectiveId)])]
}

export function writeObjectiveInterviewedRoles(controlId, objectiveId, roles) {
  if (!controlId || !objectiveId) return
  const previous = readObjectiveInterviewedRoles(controlId, objectiveId)
  try {
    const staff = new Set(readAssessmentStaff())
    const valid = (roles ?? []).filter((r) => typeof r === 'string' && r.trim() && !staff.has(r))
    if (valid.length === 0) {
      localStorage.removeItem(roleKey(controlId, objectiveId))
    } else {
      localStorage.setItem(roleKey(controlId, objectiveId), JSON.stringify(valid))
    }
  } catch {
    // storage unavailable
  }
  syncObjectiveFindingRoles(controlId, objectiveId, readObjectiveInterviewedRoles(controlId, objectiveId), previous)
}
