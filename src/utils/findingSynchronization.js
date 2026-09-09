import { readObjectiveFinding, syncObjectiveFindingRoles, syncObjectiveFindingArtifacts } from './objectiveFindings.js'
import { readObjectiveInterviewedRoles } from './objectiveInterviewedRoles.js'
import { readObjectiveArtifacts } from './objectiveArtifacts.js'

// Runtime-only reads avoid startup dependency cycles. No statuses are changed,
// no missing findings are created, and unchanged statements keep their timestamps.
export function synchronizeAllFindings({ artifacts = true, previousStaff = [] } = {}) {
  let updated = 0
  const targets = []
  for (let index = 0; index < localStorage.length; index++) {
    const match = localStorage.key(index)?.match(/^cmmc-objective-finding-(.+)-([a-z]+)$/)
    if (match) targets.push([match[1], match[2]])
  }
  for (const [controlId, objectiveId] of targets) {
    const rolesChanged = syncObjectiveFindingRoles(controlId, objectiveId, readObjectiveInterviewedRoles(controlId, objectiveId), previousStaff)
    let artifactsChanged = null
    if (artifacts) {
      const finding = readObjectiveFinding(controlId, objectiveId)
      const assigned = readObjectiveArtifacts(controlId, objectiveId)
      // Legacy manually curated findings have no assignment baseline: initialize
      // conservatively rather than adding artifacts the assessor excluded.
      const previous = finding?.syncedAssignedArtifacts ?? (finding?.autoCreatedFromMet ? finding.includedArtifacts : assigned) ?? assigned
      artifactsChanged = syncObjectiveFindingArtifacts(controlId, objectiveId, previous, assigned)
    }
    if (rolesChanged || artifactsChanged) updated++
  }
  return updated
}
