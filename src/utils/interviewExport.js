import { combinedInterviewText } from './objectiveResults.js'
import { readObjectiveInterviewedRoles } from './objectiveInterviewedRoles.js'

export function formatInterviewExport(controlId, objectiveId, result) {
  const names = readObjectiveInterviewedRoles(controlId, objectiveId).join('\n')
  const notes = combinedInterviewText(result).trim()
  // A previously exported participant block may already be present after Excel import.
  if (!names || notes === names || notes.startsWith(`${names}\n`)) return notes
  return [names, notes].filter(Boolean).join('\n\n')
}
