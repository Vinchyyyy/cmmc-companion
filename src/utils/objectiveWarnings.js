// Shared per-objective warning computation, used by DibcacMode's finding
// builder and the Home dashboard's "Needs Attention" panel so both surfaces
// agree on what counts as a warning.

import { readObjectiveArtifacts } from './objectiveArtifacts'
import { readObjectiveResult } from './objectiveResults'
import { readObjectiveInterviewedRoles } from './objectiveInterviewedRoles'
import { getDibcacStandard } from '../data/dibcacAssessmentStandards'

export function getObjectiveWarnings(controlId, objectiveId) {
  const artifacts = readObjectiveArtifacts(controlId, objectiveId)
  const result = readObjectiveResult(controlId, objectiveId)
  const roles = readObjectiveInterviewedRoles(controlId, objectiveId)
  const standard = getDibcacStandard(controlId, objectiveId)?.standard
  const requiresScreenshare = standard === 'screen_share' || standard === 'artifact_and_screen_share'

  const warnings = []
  if (artifacts.length === 0) warnings.push({ key: 'artifacts', text: 'No assigned artifacts.' })
  if (requiresScreenshare && roles.length === 0) warnings.push({ key: 'roles', text: 'Missing interviewed role.', fixable: true })
  if (requiresScreenshare && !result.interviews.trim()) warnings.push({ key: 'interview', text: 'Missing interview comments.', fixable: true })
  if (!result.examine.trim()) warnings.push({ key: 'examine', text: 'Missing examine notes.' })
  return warnings
}

export function controlHasWarnings(control) {
  return (control.objectives ?? []).some((obj) => getObjectiveWarnings(control.id, obj.id).length > 0)
}
