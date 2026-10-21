import { combinedInterviewText } from './objectiveResults.js'
import { readObjectiveInterviewedRoles } from './objectiveInterviewedRoles.js'

export function formatInterviewNotesExport(controlId, objectiveId, result) {
  const notes = combinedInterviewText(result).trim()
  const names = new Set(readObjectiveInterviewedRoles(controlId, objectiveId).map((name) => name.trim()))
  // Excel re-import can leave the exported participant block at the start of
  // the interview field. Remove only exact leading participant lines, not names
  // mentioned as part of the actual interview narrative.
  const lines = notes.split(/\r?\n/)
  while (lines.length && (names.has(lines[0].trim()) || !lines[0].trim())) lines.shift()
  return lines.join('\n').trim()
}

export function formatInterviewExport(controlId, objectiveId, result) {
  const names = readObjectiveInterviewedRoles(controlId, objectiveId).join('\n')
  const notes = combinedInterviewText(result).trim()
  // A previously exported participant block may already be present after Excel import.
  if (!names || notes === names || notes.startsWith(`${names}\n`)) return notes
  return [names, notes].filter(Boolean).join('\n\n')
}
