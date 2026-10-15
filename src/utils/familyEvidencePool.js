import { readPool } from './evidencePool.js'
import { applyGlobalArtifact } from './globalEvidence.js'
import { readStatus, writeStatus } from './status.js'

// Copy the current control's pool across its family, using the same additive
// assignment path as global evidence so findings stay synchronized.
export function applyEvidencePoolToFamily(controls, sourceControlId) {
  const source = controls.find((control) => control.id === sourceControlId)
  const pool = source ? readPool(source.id) : []
  if (!pool.length) return { controls: 0, objectives: 0, artifacts: 0 }
  const familyCode = source.id.split('.')[0]
  const targets = controls.filter((control) => control.id.split('.')[0] === familyCode)
  for (const artifact of pool) applyGlobalArtifact(targets, artifact, 'general', familyCode)
  for (const control of targets) {
    if (readStatus(control.id) === 'Not Started') writeStatus(control.id, 'In Progress')
  }
  return {
    controls: targets.length,
    objectives: targets.reduce((count, control) => count + (control.objectives?.length ?? 0), 0),
    artifacts: pool.length,
  }
}
