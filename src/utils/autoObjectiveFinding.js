import { getDibcacStandard } from '../data/dibcacAssessmentStandards.js'
import { readObjectiveArtifacts } from './objectiveArtifacts.js'
import { readObjectiveFinding, writeObjectiveFinding } from './objectiveFindings.js'
import { readObjectiveInterviewedRoles } from './objectiveInterviewedRoles.js'
import { buildFinalText, buildObjectiveValidationStatement } from './findingStatementBuilder.js'

// Only the old generated D confirmation line makes a finding "nonstandard"
// here — an assessor's own D) addendum (e.g. remediation/retest history) must
// never be treated as a reason to regenerate finalText from scratch, which
// would silently drop it from the visible finding. Matches the same legacy
// text objectiveFindings.js strips on read.
const LEGACY_MET_CONFIRMATION_D = /^D\) Assessment team confirmed in interview, testing, and documentation that this objective is (?:not )?implemented\.$/

export function matchesStandardFinding(finding, control, objective) {
  const lines = String(finding?.finalText ?? '').replace(/\r\n/g, '\n').trim().split('\n')
  const start = lines.findIndex((line) => line.startsWith('A) Reviewed '))
  if (start < 0) return false
  const prefix = lines.slice(0, start).join('\n').trim()
  if (prefix && !prefix.startsWith('Interviewed:')) return false
  const sections = lines.slice(start)
  const method = getDibcacStandard(control.id, objective.id)?.standard
  if (sections.length < 3 || sections[1] !== `B) ${buildObjectiveValidationStatement({ objectiveRef: `${control.id}[${objective.id}]`, objectiveText: objective.text, dibcacMethod: method })}`) return false
  if (sections.some((line) => line.startsWith('D) ') && LEGACY_MET_CONFIRMATION_D.test(line))) return false
  return sections[2] === 'C) No noted findings or differences.' || sections[2].startsWith('C) Differences: ')

}

// Creates the same deterministic, objective-level statement produced by the
// Findings Builder when an assessor marks an objective MET. Existing findings
// are preserved unless the caller explicitly requests format normalization.
// MET actions and Excel import normalize nonstandard text and retain the original.
export function ensureMetObjectiveFinding(control, objective, { replaceNonstandard = false } = {}) {
  if (!control?.id || !objective?.id) return null
  const previous = readObjectiveFinding(control.id, objective.id)
  if (previous?.finalText?.trim() && (!replaceNonstandard || matchesStandardFinding(previous, control, objective))) return null

  const includedArtifacts = readObjectiveArtifacts(control.id, objective.id)
  const roles = readObjectiveInterviewedRoles(control.id, objective.id)
  const dibcacStandard = getDibcacStandard(control.id, objective.id)
  const timestamp = new Date().toISOString()
  const finding = {
    includedArtifacts,
    syncedAssignedArtifacts: [...includedArtifacts],
    syncedInterviewRoles: [...roles],
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
    ...(previous?.finalText ? { replacedImportedText: previous.replacedImportedText || previous.finalText } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  writeObjectiveFinding(control.id, objective.id, finding)
  return finding
}
