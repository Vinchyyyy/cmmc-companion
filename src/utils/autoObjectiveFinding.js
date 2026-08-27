import { getDibcacStandard } from '../data/dibcacAssessmentStandards.js'
import { readObjectiveArtifacts } from './objectiveArtifacts.js'
import { readObjectiveFinding, writeObjectiveFinding } from './objectiveFindings.js'
import { readObjectiveInterviewedRoles } from './objectiveInterviewedRoles.js'
import { buildFinalText } from './findingStatementBuilder.js'

// Creates the same deterministic, objective-level statement produced by the
// Findings Builder when an assessor marks an objective MET. Existing findings
// are always preserved, so a status click can never overwrite reviewed text.
export function ensureMetObjectiveFinding(control, objective) {
  if (!control?.id || !objective?.id) return null
  if (readObjectiveFinding(control.id, objective.id) !== null) return null

  const includedArtifacts = readObjectiveArtifacts(control.id, objective.id)
  const roles = readObjectiveInterviewedRoles(control.id, objective.id)
  const dibcacStandard = getDibcacStandard(control.id, objective.id)
  const timestamp = new Date().toISOString()
  const finding = {
    includedArtifacts,
    hasDifferences: false,
    differencesText: '',
    finalText: buildFinalText({
      roles,
      includedArtifacts,
      objectiveRef: `${control.id}[${objective.id}]`,
      objectiveText: objective.text,
      dibcacMethod: dibcacStandard?.standard,
      hasDifferences: false,
      differencesText: '',
      statusContext: 'MET',
    }),
    autoCreatedFromMet: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  writeObjectiveFinding(control.id, objective.id, finding)
  return finding
}
