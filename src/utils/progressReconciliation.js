// Reconciles control-level status after data is imported or hydrated from storage.
//
// Problem: workbook import and project JSON import write objective-level data
// (notes, results, artifacts, findings) but may not write the control-level
// "cmmc-status-{id}" key that the dashboard reads. Controls with real work remain
// "Not Started" until the user manually touches a note field, which triggers the
// same promotion in ControlDetail.
//
// This module provides a single idempotent sweep that promotes "Not Started"
// controls to "In Progress" whenever any objective-level work exists in storage.
// It never demotes, never touches MET/NOT MET, and never runs unless status is
// still the default.

import { readObjectiveNote }   from './objectiveNotes'
import { readObjectiveResult } from './objectiveResults'
import { readObjectiveArtifacts } from './objectiveArtifacts'
import { readObjectiveFinding }   from './objectiveFindings'
import {
  readObjectiveStatus,
  OBJECTIVE_STATUS_UNREVIEWED,
  OBJECTIVE_STATUS_MET,
  OBJECTIVE_STATUS_NOT_MET,
} from './objectiveStatus'
import { readStatus, writeStatus, DEFAULT_STATUS } from './status'

function objectiveHasWork(controlId, objId) {
  // General objective notes
  if (readObjectiveNote(controlId, objId).trim()) return true
  // Interview / Examine / Test / Overall Comments
  const result = readObjectiveResult(controlId, objId)
  if (Object.values(result).some((v) => v.trim())) return true
  // Assigned artifact references
  if (readObjectiveArtifacts(controlId, objId).length > 0) return true
  // Saved finding statement
  if (readObjectiveFinding(controlId, objId) !== null) return true
  // Explicit objective status (MET or NOT MET)
  if (readObjectiveStatus(controlId, objId) !== OBJECTIVE_STATUS_UNREVIEWED) return true
  return false
}

// Sweeps all controls and derives the correct control-level status from
// objective-level data. Returns the number of controls corrected.
// Safe to call multiple times — idempotent.
//
// Rules:
//   MET/NOT MET terminal statuses are never overwritten (assessor set them explicitly).
//   For Not Started / In Progress controls:
//     All objectives MET  → MET
//     Any objective NOT MET → NOT MET
//     Any objective has work (notes/artifacts/finding/status) → In Progress
//     Otherwise → leave unchanged (Not Started stays Not Started)
export function reconcileProgressFromStoredWork(controls) {
  if (!Array.isArray(controls)) return 0
  let corrected = 0
  for (const control of controls) {
    if (!control?.id || !Array.isArray(control.objectives)) continue
    const currentStatus = readStatus(control.id)
    // Never demote explicit terminal statuses — assessor owns these
    if (currentStatus === 'MET' || currentStatus === 'NOT MET') continue

    const objStatuses = control.objectives.map((obj) =>
      readObjectiveStatus(control.id, obj.id)
    )

    if (
      control.objectives.length > 0 &&
      objStatuses.every((s) => s === OBJECTIVE_STATUS_MET)
    ) {
      writeStatus(control.id, 'MET')
      corrected++
    } else if (objStatuses.some((s) => s === OBJECTIVE_STATUS_NOT_MET)) {
      writeStatus(control.id, 'NOT MET')
      corrected++
    } else if (currentStatus === DEFAULT_STATUS) {
      const hasWork = control.objectives.some((obj) => objectiveHasWork(control.id, obj.id))
      if (hasWork) {
        writeStatus(control.id, 'In Progress')
        corrected++
      }
    }
  }
  return corrected
}
