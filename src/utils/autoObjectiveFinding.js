import { getDibcacStandard } from '../data/dibcacAssessmentStandards.js'
import { readObjectiveArtifacts } from './objectiveArtifacts.js'
import { readObjectiveFinding, writeObjectiveFinding } from './objectiveFindings.js'
import { readObjectiveInterviewedRoles } from './objectiveInterviewedRoles.js'
import { buildFinalText, buildObjectiveValidationStatement } from './findingStatementBuilder.js'

export function matchesStandardFinding(finding, control, objective) {
  const lines = String(finding?.finalText ?? '').replace(/\r\n/g, '\n').trim().split('\n')
  const start = lines.findIndex((line) => line.startsWith('A) Reviewed '))
  if (start < 0) return false
  const prefix = lines.slice(0, start).join('\n').trim()
  if (prefix && !prefix.startsWith('Interviewed:')) return false
  const sections = lines.slice(start)
  const method = getDibcacStandard(control.id, objective.id)?.standard
  if (sections.length < 4 || sections[1] !== `B) ${buildObjectiveValidationStatement({ objectiveRef: `${control.id}[${objective.id}]`, objectiveText: objective.text, dibcacMethod: method })}`) return false
  if (sections[2] !== 'C) No noted findings or differences.' && !sections[2].startsWith('C) Differences: ')) return false
  if (sections.length > 4 && !sections[2].startsWith('C) Differences: ')) return false
  return /^D\) Assessment team confirmed in interview, testing, and documentation that this objective is (not )?implemented\.$/.test(sections.at(-1))
}

// Creates the same deterministic, objective-level statement produced by the
// Findings Builder when an assessor marks an objective MET. Existing findings
// are preserved on status clicks; Excel import can explicitly replace a
// nonstandard imported statement, retaining its original text for reference.
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
    ...(previous?.finalText ? { replacedImportedText: previous.finalText } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  writeObjectiveFinding(control.id, objective.id, finding)
  return finding
}
