import { readObjectiveStatus } from './objectiveStatus.js'
import { readObjectiveFinding, findingHasManagedSections, parseFindingFields } from './objectiveFindings.js'
import { readObjectiveArtifacts } from './objectiveArtifacts.js'
import { ensureNotMetObjectiveFinding } from './autoObjectiveFinding.js'
import { getDiscrepancyHelper } from './discrepancyHelper.js'
import { buildObjectiveValidationStatement } from './findingStatementBuilder.js'
import { safeSetItem } from './storageWrite.js'

// Run on every startup, rather than keeping a global "done" flag: an older
// JSON backup restored later must receive the same upgrade on its next refresh.
// Objective results, assignments, notes, and status keys are never rewritten.
export function upgradeExistingNotMetFindings(controls) {
  let updated = 0
  for (const control of controls) for (const objective of control.objectives ?? []) {
    if (readObjectiveStatus(control.id, objective.id) !== 'NOT MET') continue
    const key = `cmmc-objective-finding-${control.id}-${objective.id}`
    const raw = localStorage.getItem(key)
    const previous = readObjectiveFinding(control.id, objective.id)
    if (!previous) {
      // Do not replace an unreadable saved record with a generated statement.
      if (!raw && ensureNotMetObjectiveFinding(control, objective)) updated++
      continue
    }
    if (!findingHasManagedSections(previous)) continue
    const original = JSON.parse(raw)
    const text = previous.finalText.replace(/\r\n/g, '\n')
    // Custom assessor conclusions remain theirs. Only the generated envelope
    // and recognized Differences section can be upgraded automatically.
    if (!/^B\) (?:Validation is described in the corresponding|Implementation as described in the corresponding) /m.test(text) ||
        !/^C\) (?:Differences:|No noted findings or differences\.|Assessment is incomplete; full implementation has not been confirmed\.)/m.test(text)) continue
    const fields = parseFindingFields(text)
    const helper = getDiscrepancyHelper(objective.text)
    const discrepancy = previous.differencesText?.trim() || fields.differencesText || (helper.autoDraft ? helper.statement : '')
    const cStart = text.search(/^C\) /m)
    const remainder = text.slice(cStart)
    const addendumStart = remainder.search(/\n[D-Z]\) /)
    const addendum = addendumStart < 0 ? '' : remainder.slice(addendumStart)
    const finalText = text.slice(0, cStart)
      .replace(/^B\) [^\n]+/m, () => `B) ${buildObjectiveValidationStatement({ objectiveRef: `${control.id}[${objective.id}]`, statusContext: 'NOT_MET' })}`) +
      `C) Differences: ${discrepancy || '[Discrepancy required]'}` + addendum
    const next = {
      ...previous,
      ...fields,
      differencesText: discrepancy,
      hasDifferences: true,
      statusContext: 'NOT_MET',
      autoCreatedFromMet: false,
      autoCreatedFromNotMet: true,
      includedArtifacts: fields.includedArtifacts,
      syncedAssignedArtifacts: previous.syncedAssignedArtifacts ?? readObjectiveArtifacts(control.id, objective.id),
      finalText,
    }
    // Compare against the actual stored value, since legacy reads normalize
    // their visible text without persisting the upgraded result.
    if (JSON.stringify(original) === JSON.stringify(next)) continue
    if (finalText !== original.finalText) {
      next.previousFinding = original
      next.updatedAt = new Date().toISOString()
    }
    if (safeSetItem(key, JSON.stringify(next))) updated++
  }
  return updated
}
