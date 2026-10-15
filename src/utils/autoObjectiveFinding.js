import { getDibcacStandard } from '../data/dibcacAssessmentStandards.js'
import { readObjectiveArtifacts } from './objectiveArtifacts.js'
import { readObjectiveFinding, writeObjectiveFinding, findingHasManagedSections } from './objectiveFindings.js'
import { getDiscrepancyHelper } from './discrepancyHelper.js'
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
  const wasNotMet = previous?.statusContext === 'NOT_MET' || previous?.autoCreatedFromNotMet
  if (!wasNotMet && previous?.finalText?.trim() && (!replaceNonstandard || matchesStandardFinding(previous, control, objective))) return null

  const includedArtifacts = wasNotMet && Array.isArray(previous?.includedArtifacts) ? previous.includedArtifacts : readObjectiveArtifacts(control.id, objective.id)
  const roles = readObjectiveInterviewedRoles(control.id, objective.id)
  const dibcacStandard = getDibcacStandard(control.id, objective.id)
  const timestamp = new Date().toISOString()
  const finding = {
    includedArtifacts,
    syncedAssignedArtifacts: readObjectiveArtifacts(control.id, objective.id),
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
    }) + (wasNotMet && findingHasManagedSections(previous) ? previous.finalText.match(/\nD\) (?!Differences:)[\s\S]*/)?.[0] ?? '' : ''),
    autoCreatedFromMet: true,
    statusContext: 'MET',
    ...(previous ? { previousFinding: previous } : {}),
    ...(previous?.finalText ? { replacedImportedText: previous.replacedImportedText || previous.finalText } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  writeObjectiveFinding(control.id, objective.id, finding)
  return finding
}

// A NOT MET result immediately has a draft, even before a discrepancy is entered.
// Preserve the prior finding for review, and preserve custom addenda in the text.
export function ensureNotMetObjectiveFinding(control, objective, { differencesText } = {}) {
  if (!control?.id || !objective?.id) return null
  const previous = readObjectiveFinding(control.id, objective.id)
  const wasNotMet = previous?.statusContext === 'NOT_MET' || previous?.autoCreatedFromNotMet ||
    /\nC\) Full implementation of this objective was not confirmed\./.test(previous?.finalText ?? '')
  const helper = getDiscrepancyHelper(objective.text)
  const automaticDiscrepancy = helper.autoDraft ? helper.statement : ''
  if (wasNotMet && differencesText === undefined && (previous?.differencesText?.trim() || !automaticDiscrepancy)) return null
  const includedArtifacts = previous?.includedArtifacts ?? readObjectiveArtifacts(control.id, objective.id)
  const roles = readObjectiveInterviewedRoles(control.id, objective.id)
  const discrepancy = differencesText ?? (wasNotMet && previous?.differencesText?.trim() ? previous.differencesText : automaticDiscrepancy)
  const addendum = findingHasManagedSections(previous) ? previous.finalText.match(/\nD\) (?!Differences:)[\s\S]*/)?.[0] ?? '' : ''
  const timestamp = new Date().toISOString()
  const finding = {
    ...previous,
    includedArtifacts,
    syncedAssignedArtifacts: readObjectiveArtifacts(control.id, objective.id),
    syncedInterviewRoles: [...roles],
    statusContext: 'NOT_MET',
    autoCreatedFromMet: false,
    autoCreatedFromNotMet: true,
    hasDifferences: true,
    differencesText: discrepancy,
    helperComponents: [],
    finalText: buildFinalText({ roles, includedArtifacts, objectiveRef: `${control.id}[${objective.id}]`, statusContext: 'NOT_MET', differencesText: discrepancy }) + addendum,
    ...(!wasNotMet && previous ? { previousFinding: previous } : {}),
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  writeObjectiveFinding(control.id, objective.id, finding)
  return finding
}
