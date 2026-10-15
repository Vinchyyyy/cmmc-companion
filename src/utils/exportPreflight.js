import { readObjectiveStatus } from './objectiveStatus.js'
import { readObjectiveFinding, parseFindingFields } from './objectiveFindings.js'
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
export function collectExportWarnings(controls, { omittedColumns = [] } = {}) {
  const included = (key) => !omittedColumns.includes(key)
  const warnings = []
  const artifacts = new Map()
  const providers = new Map()
  for (const control of controls) {
    const addArtifact = (name, ref) => {
      if (!included('artifacts')) return
      if (findByName(name)?.tags?.length) return
      const key = name.trim().toLowerCase()
      if (!artifacts.has(key)) artifacts.set(key, { name, refs: new Set() })
      artifacts.get(key).refs.add(ref)
    }
    for (const name of readPool(control.id)) addArtifact(name, control.id)
    if (readInheritance(control.id) !== 'None') {
      const sources = readInheritanceSources(control.id)
      if (!sources.length) warnings.push({ kind: 'missingProvider', ref: control.id, text: 'Inheritance is enabled, but no service provider is selected.', href: `/controls/${control.id}` })
      for (const source of sources) if (included('standardsAcceptance') && !readProviderStandardsAcceptance(source)) {
        const key = source.trim().toLowerCase()
        if (!providers.has(key)) providers.set(key, { name: source, refs: new Set() })
        providers.get(key).refs.add(control.id)
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
      const fieldKeys = { Interviews: 'interviews', Examine: 'examine', Test: 'test', 'Overall comments': 'overallComments', Finding: 'findingText' }
      for (const [field, value] of Object.entries(fields)) if (value.length > 4000) {
        if (!included(fieldKeys[field])) continue
        warnings.push({ kind: 'length', ref, text: `${field} has ${value.length} characters. The workbook exporter will shorten it to 4,000 characters; the full text remains in the project JSON.`, href })
      }
      const status = readObjectiveStatus(control.id, objective.id)
      if (status === 'NOT MET' && included('findingText')) {
        const finding = readObjectiveFinding(control.id, objective.id)
        if (!finding?.finalText?.trim()) warnings.push({ kind: 'missingFinding', ref, text: 'Objective is NOT MET but has no drafted finding.', href })
        else if (!finding.differencesText?.trim() && !parseFindingFields(finding.finalText).differencesText) {
          warnings.push({ kind: 'missingDiscrepancy', ref, text: 'Objective is NOT MET but its discrepancy has not been entered. The finding is incomplete.', href })
        }
      }
      if (status !== 'MET') continue
      if (included('findingText') && !readObjectiveFinding(control.id, objective.id)?.finalText?.trim()) {
        warnings.push({ kind: 'missingFinding', ref, text: 'Objective is MET but has no drafted finding.', href })
      }
      for (const warning of getObjectiveWarnings(control.id, objective.id)) {
        if (!included(({ interview: 'interviews', roles: 'interviews' })[warning.key] ?? warning.key)) continue
        warnings.push({ kind: warning.key, ref, text: warning.text, href })
      }
    }
  }
  for (const { name, refs } of artifacts.values()) warnings.unshift({ kind: 'untagged', ref: name, text: `No evidence tags. Used by ${[...refs].slice(0, 4).join(', ')}${refs.size > 4 ? ` and ${refs.size - 4} more` : ''}.`, href: '/artifact-map' })
  for (const { name, refs } of providers.values()) warnings.push({ kind: 'provider', ref: name, text: `Used by ${refs.size} control${refs.size === 1 ? '' : 's'}.`, refs: [...refs], href: '/osc-profile?tab=providers' })
  return warnings
}

const WARNING_CATEGORIES = {
  examine: { title: 'Missing examine notes', description: 'These MET objectives have no examine notes.' },
  interview: { title: 'Missing interview comments', description: 'These MET objectives require interview comments.' },
  roles: { title: 'Missing interviewed roles', description: 'These MET objectives require an interviewed role.' },
  missingFinding: { title: 'Missing findings', description: 'These assessed objectives have no drafted finding.' },
  missingDiscrepancy: { title: 'Incomplete NOT MET findings', description: 'These NOT MET objectives still need a discrepancy.' },
  artifacts: { title: 'Missing objective artifacts', description: 'These MET objectives have no assigned artifacts.' },
  untagged: { title: 'Evidence missing tags', description: 'These artifacts have no evidence tags.' },
  missingProvider: { title: 'Missing inheritance providers', description: 'Inheritance is enabled for these controls, but no provider is selected.' },
  provider: { title: 'Missing standards acceptance', description: 'These providers have no standard selected in the OSC Profile. A standard is optional when none applies.' },
  length: { title: 'Text exceeds Excel limits', description: 'Excel shortens these fields to 4,000 characters. The full text remains in the JSON backup.' },
}

export function groupExportWarnings(warnings) {
  const groups = new Map()
  for (const warning of warnings) {
    const category = WARNING_CATEGORIES[warning.kind] ?? { title: 'Other warnings', description: 'Review these items before exporting.' }
    if (!groups.has(warning.kind)) groups.set(warning.kind, { kind: warning.kind, ...category, items: [] })
    const group = groups.get(warning.kind)
    if (!group.items.some((item) => item.ref === warning.ref && item.text === warning.text && item.href === warning.href)) group.items.push(warning)
  }
  return [...groups.values()]
}
