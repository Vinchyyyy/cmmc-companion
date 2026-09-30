// Per-objective interviewed roles for the Findings Builder Interviewed line.
// Storage key: cmmc-objective-interviewed-roles-{controlId}-{objectiveId}
// Value: JSON array of role label strings.

const PREFIX = 'cmmc-objective-interviewed-roles-'
import { readAssessmentStaff } from './oscProfile.js'
import { syncObjectiveFindingRoles } from './objectiveFindings.js'
import { safeSetItem } from './storageWrite.js'

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
  const staff = new Set(readAssessmentStaff())
  const valid = (roles ?? []).filter((r) => typeof r === 'string' && r.trim() && !staff.has(r))
  if (valid.length === 0) {
    try { localStorage.removeItem(roleKey(controlId, objectiveId)) } catch { /* unavailable */ }
  } else {
    safeSetItem(roleKey(controlId, objectiveId), JSON.stringify(valid))
  }
  syncObjectiveFindingRoles(controlId, objectiveId, readObjectiveInterviewedRoles(controlId, objectiveId), previous)
}
