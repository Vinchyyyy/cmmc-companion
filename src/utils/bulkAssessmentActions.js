import { writeStatus } from './status.js'
import { readObjectiveStatus, writeObjectiveStatus, OBJECTIVE_STATUS_UNREVIEWED } from './objectiveStatus.js'
import { ensureMetObjectiveFinding } from './autoObjectiveFinding.js'
import { readObjectiveResult, writeObjectiveResult } from './objectiveResults.js'
import { writeObjectiveArtifacts } from './objectiveArtifacts.js'
import { clearObjectiveFinding } from './objectiveFindings.js'
import { writeObjectiveNote } from './objectiveNotes.js'
import { writeNote } from './notes.js'
import { writePool } from './evidencePool.js'
import { writeInheritance, writeInheritanceSource, writeObjectiveInheritance } from './inheritance.js'
import { writeDateAssessed } from './dateAssessed.js'
import { writeObjectiveInterviewedRoles } from './objectiveInterviewedRoles.js'
import { writeAssignedTo } from './assignment.js'

export const CLEAR_FIELDS = [
  ['status', 'Control and objective statuses'], ['examine', 'Examine'], ['test', 'Test'],
  ['interviews', 'Objective interview text'], ['overallComments', 'Overall comments'],
  ['findings', 'Findings'], ['artifacts', 'Objective artifact assignments'], ['evidencePool', 'Control evidence pool'],
  ['controlNotes', 'Control notes'], ['objectiveNotes', 'Objective notes'], ['inheritance', 'Inheritance'],
  ['dateAssessed', 'Date assessed'], ['interviewRoles', 'Objective-specific interview participants'], ['assignment', 'Assigned assessor'],
]

export function bulkSetControlStatus(controls, status) {
  for (const control of controls) {
    writeStatus(control.id, status)
    if (status === 'MET') for (const objective of control.objectives ?? []) {
      writeObjectiveStatus(control.id, objective.id, 'MET')
      ensureMetObjectiveFinding(control, objective, { replaceNonstandard: true })
    }
  }
}

export function clearSelectedControlFields(controls, fields) {
  const selected = new Set(fields)
  for (const control of controls) {
    if (selected.has('status')) writeStatus(control.id, 'Not Started')
    if (selected.has('assignment')) writeAssignedTo(control.id, '')
    if (selected.has('dateAssessed')) writeDateAssessed(control.id, '')
    if (selected.has('controlNotes')) writeNote(control.id, '')
    if (selected.has('evidencePool')) writePool(control.id, [])
    if (selected.has('inheritance')) {
      writeInheritance(control.id, 'None'); writeInheritanceSource(control.id, '')
    }
    for (const objective of control.objectives ?? []) {
      const args = [control.id, objective.id]
      if (selected.has('inheritance')) writeObjectiveInheritance(...args, [])
      if (selected.has('status')) writeObjectiveStatus(...args, OBJECTIVE_STATUS_UNREVIEWED)
      if (selected.has('objectiveNotes')) writeObjectiveNote(...args, '')
      if (selected.has('artifacts')) writeObjectiveArtifacts(...args, [])
      if (selected.has('interviewRoles')) writeObjectiveInterviewedRoles(...args, [])
      const resultFields = ['interviews', 'examine', 'test', 'overallComments'].filter((field) => selected.has(field))
      if (resultFields.length) {
        const result = readObjectiveResult(...args)
        for (const field of resultFields) result[field] = ''
        writeObjectiveResult(...args, result)
      }
      if (selected.has('findings')) clearObjectiveFinding(...args)
    }
  }
}

export function createMissingMetFindings(controls) {
  let count = 0
  for (const control of controls) for (const objective of control.objectives ?? []) {
    if (readObjectiveStatus(control.id, objective.id) === 'MET' && ensureMetObjectiveFinding(control, objective)) count++
  }
  return count
}
