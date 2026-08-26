// Per-objective finding statements for the standardized Findings column.
// Storage key: cmmc-objective-finding-{controlId}-{objectiveId}

import { buildArtifactsLine } from './findingStatementBuilder'

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

function artifactKey(value) {
  return String(value ?? '').trim().toLowerCase()
}

function sameArtifacts(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

// Keeps the reviewed-artifact snapshot in a standardized finding aligned with
// objective assignment changes. Newly assigned artifacts are included by
// default, removed assignments are dropped, and artifacts the assessor had
// already chosen to exclude remain excluded. Imported workbook findings are
// source text and are intentionally never rewritten.
export function syncObjectiveFindingArtifacts(
  controlId,
  objectiveId,
  previousAssignedArtifacts,
  nextAssignedArtifacts,
) {
  const finding = readObjectiveFinding(controlId, objectiveId)
  if (!finding || finding.importedFromWorkbook) return null
  if (typeof finding.finalText !== 'string' || !/^A\) Reviewed .*$/m.test(finding.finalText)) return null

  const previousKeys = new Set((previousAssignedArtifacts ?? []).map(artifactKey).filter(Boolean))
  const nextKeys = new Set((nextAssignedArtifacts ?? []).map(artifactKey).filter(Boolean))
  const additions = (nextAssignedArtifacts ?? []).filter((name) => {
    const key = artifactKey(name)
    return key && !previousKeys.has(key)
  })

  const included = Array.isArray(finding.includedArtifacts) ? finding.includedArtifacts : []
  const nextIncluded = []
  const includedKeys = new Set()
  for (const name of [...included, ...additions]) {
    const key = artifactKey(name)
    if (!key || !nextKeys.has(key) || includedKeys.has(key)) continue
    includedKeys.add(key)
    nextIncluded.push(name.trim())
  }

  if (sameArtifacts(included, nextIncluded)) return null

  const updated = {
    ...finding,
    includedArtifacts: nextIncluded,
    finalText: finding.finalText.replace(/^A\) Reviewed .*$/m, buildArtifactsLine(nextIncluded)),
    updatedAt: new Date().toISOString(),
  }
  writeObjectiveFinding(controlId, objectiveId, updated)
  return updated
}
