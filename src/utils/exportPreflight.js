import { readObjectiveStatus } from './objectiveStatus.js'
import { readObjectiveFinding } from './objectiveFindings.js'
import { readObjectiveArtifacts } from './objectiveArtifacts.js'
import { readPool } from './evidencePool.js'
import { findByName } from './artifactRegistry.js'
import { getObjectiveWarnings } from './objectiveWarnings.js'
import { readInheritance, readInheritanceSources } from './inheritance.js'
import { readProviderStandardsAcceptance } from './oscProfile.js'
import { readObjectiveResult } from './objectiveResults.js'
import { readObjectiveNote } from './objectiveNotes.js'
import { formatInterviewExport } from './interviewExport.js'

// Read-only checks, scoped to precisely the families being exported.
export function collectExportWarnings(controls) {
  const warnings = []
  const artifacts = new Map()
  for (const control of controls) {
    const addArtifact = (name, ref) => {
      if (findByName(name)?.tags?.length) return
      const key = name.trim().toLowerCase()
      if (!artifacts.has(key)) artifacts.set(key, { name, refs: new Set() })
      artifacts.get(key).refs.add(ref)
    }
    for (const name of readPool(control.id)) addArtifact(name, control.id)
    if (readInheritance(control.id) !== 'None') {
      const sources = readInheritanceSources(control.id)
      if (!sources.length) warnings.push({ kind: 'provider', ref: control.id, text: 'Inheritance is enabled, but no service provider is selected.', href: `/controls/${control.id}` })
      for (const source of sources) if (!readProviderStandardsAcceptance(source)) {
        warnings.push({ kind: 'provider', ref: control.id, text: `${source}: no standards acceptance selected in OSC Profile.`, href: '/osc-profile?tab=providers' })
      }
    }
    for (const objective of control.objectives ?? []) {
      const ref = `${control.id}[${objective.id}]`
      const href = `/controls/${control.id}#objective-${encodeURIComponent(objective.id)}`
      for (const name of readObjectiveArtifacts(control.id, objective.id)) addArtifact(name, ref)
      const result = readObjectiveResult(control.id, objective.id)
      const fields = {
        Interviews: formatInterviewExport(control.id, objective.id, result),
        Examine: result.examine.trim(), Test: result.test.trim(),
        'Overall comments': [result.overallComments.trim(), readObjectiveNote(control.id, objective.id).trim()].filter(Boolean).join('\n\n'),
        Finding: readObjectiveFinding(control.id, objective.id)?.finalText?.trim() ?? '',
      }
      for (const [field, value] of Object.entries(fields)) if (value.length > 4000) {
        warnings.push({ kind: 'length', ref, text: `${field} has ${value.length} characters. The workbook exporter will shorten it to 4,000 characters; the full text remains in the project JSON.`, href })
      }
      if (readObjectiveStatus(control.id, objective.id) !== 'MET') continue
      if (!readObjectiveFinding(control.id, objective.id)?.finalText?.trim()) {
        warnings.push({ kind: 'missingFinding', ref, text: 'Objective is MET but has no drafted finding.', href })
      }
      for (const warning of getObjectiveWarnings(control.id, objective.id)) {
        warnings.push({ kind: warning.key, ref, text: warning.text, href })
      }
    }
  }
  for (const { name, refs } of artifacts.values()) warnings.unshift({ kind: 'untagged', ref: name, text: `No evidence tags. Used by ${[...refs].slice(0, 4).join(', ')}${refs.size > 4 ? ` and ${refs.size - 4} more` : ''}.`, href: '/artifact-map' })
  return warnings
}
