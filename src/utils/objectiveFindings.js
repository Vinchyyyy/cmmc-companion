// Per-objective finding statements for the standardized Findings column.
// Storage key: cmmc-objective-finding-{controlId}-{objectiveId}

import { readObjectiveStatus } from './objectiveStatus.js'
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
    // Remove only the old generated confirmation, never assessor-written D text.
    if (readObjectiveStatus(controlId, objectiveId) === 'MET' && typeof parsed.finalText === 'string') {
      parsed.finalText = parsed.finalText.replace(/\r?\nD\) Assessment team confirmed in interview, testing, and documentation that this objective is (?:not )?implemented\.$/, '')
    }
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

// Only recognize the managed envelope; never reconstruct B/C/D or freeform prose.
export function findingHasManagedSections(finding) {
  return typeof finding?.finalText === 'string' && /^(?:Interviewed:[^\r\n]*\r?\n\s*)?A\) Reviewed [^\r\n]*\r?\nB\) [\s\S]*\r?\nC\) [\s\S]+$/.test(finding.finalText)
}

export function syncObjectiveFindingRoles(controlId, objectiveId, roles, previousRoles = []) {
  const finding = readObjectiveFinding(controlId, objectiveId)
  if (!findingHasManagedSections(finding)) return null
  const oldLine = finding.finalText.match(/^Interviewed:([^\r\n]*)/)
  const oldNames = oldLine ? oldLine[1].split(';').map((name) => name.trim()).filter(Boolean) : []
  const managed = new Set([...(finding.syncedInterviewRoles ?? []), ...previousRoles])
  const nextRoles = [...new Set([...roles, ...oldNames.filter((name) => !managed.has(name))])]
  const body = finding.finalText.replace(/^Interviewed:[^\r\n]*\r?\n\s*/, '')
  const newline = finding.finalText.includes('\r\n') ? '\r\n' : '\n'
  const finalText = nextRoles.length ? `Interviewed: ${nextRoles.join('; ')}${newline}${newline}${body}` : body
  if (finalText === finding.finalText && sameArtifacts(finding.syncedInterviewRoles ?? [], roles)) return null
  const updated = { ...finding, finalText, syncedInterviewRoles: [...roles] }
  if (finalText !== finding.finalText) updated.updatedAt = new Date().toISOString()
  writeObjectiveFinding(controlId, objectiveId, updated)
  return updated
}

// Keeps the reviewed-artifact snapshot in a standardized finding aligned with
// objective assignment changes. Newly assigned artifacts are included by
// default, removed assignments are dropped, and artifacts the assessor had
// already chosen to exclude remain excluded. Standardized imported statements
// are supported too; freeform statements remain untouched.
export function syncObjectiveFindingArtifacts(
  controlId,
  objectiveId,
  previousAssignedArtifacts,
  nextAssignedArtifacts,
) {
  const finding = readObjectiveFinding(controlId, objectiveId)
  if (!findingHasManagedSections(finding)) return null

  const previousKeys = new Set((previousAssignedArtifacts ?? []).map(artifactKey).filter(Boolean))
  const nextKeys = new Set((nextAssignedArtifacts ?? []).map(artifactKey).filter(Boolean))
  const additions = (nextAssignedArtifacts ?? []).filter((name) => {
    const key = artifactKey(name)
    return key && !previousKeys.has(key)
  })

  const importedUntracked = finding.importedFromWorkbook && !Array.isArray(finding.syncedAssignedArtifacts)
  const artifactLine = finding.finalText.match(/^A\) Reviewed ([^\r\n]*)/m)?.[1] ?? ''
  const parsedArtifacts = artifactLine === '[no artifact references entered]' ? [] : artifactLine.split(';').map((name) => name.trim()).filter(Boolean)
  const included = importedUntracked ? parsedArtifacts : (Array.isArray(finding.includedArtifacts) ? finding.includedArtifacts : parsedArtifacts)
  const nextIncluded = []
  const includedKeys = new Set()
  for (const name of [...included, ...additions]) {
    const key = artifactKey(name)
    // Preserve historical references not present in either assignment snapshot.
    if (!key || (previousKeys.has(key) && !nextKeys.has(key)) || includedKeys.has(key)) continue
    includedKeys.add(key)
    nextIncluded.push(name.trim())
  }

  const changed = !sameArtifacts(included, nextIncluded)
  if (!changed && sameArtifacts(finding.syncedAssignedArtifacts ?? [], nextAssignedArtifacts) && !importedUntracked) return null

  const updated = {
    ...finding,
    includedArtifacts: nextIncluded,
    syncedAssignedArtifacts: [...nextAssignedArtifacts],
    finalText: changed ? finding.finalText.replace(/^A\) Reviewed [^\r\n]*/m, () => buildArtifactsLine(nextIncluded)) : finding.finalText,
    ...(changed ? { updatedAt: new Date().toISOString() } : {}),
  }
  writeObjectiveFinding(controlId, objectiveId, updated)
  return updated
}
