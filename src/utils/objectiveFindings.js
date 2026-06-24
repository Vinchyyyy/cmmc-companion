// Per-objective finding statements for the standardized Findings column.
// Storage key: cmmc-objective-finding-{controlId}-{objectiveId}

const FINDING_PREFIX = 'cmmc-objective-finding-'

function findingKey(controlId, objectiveId) {
  return `${FINDING_PREFIX}${controlId}-${objectiveId}`
}

export function readObjectiveFinding(controlId, objectiveId) {
  if (!controlId || !objectiveId) return null
  try {
    const raw = localStorage.getItem(findingKey(controlId, objectiveId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function writeObjectiveFinding(controlId, objectiveId, finding) {
  if (!controlId || !objectiveId) return
  try {
    localStorage.setItem(findingKey(controlId, objectiveId), JSON.stringify(finding))
  } catch {
    // storage unavailable
  }
}

export function clearObjectiveFinding(controlId, objectiveId) {
  if (!controlId || !objectiveId) return
  try {
    localStorage.removeItem(findingKey(controlId, objectiveId))
  } catch {
    // storage unavailable
  }
}
