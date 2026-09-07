import { sortControlsInAssessmentOrder } from './controlOrder.js'
import { readObjectiveStatus, OBJECTIVE_STATUS_MET } from './objectiveStatus.js'
import { getDibcacStandard } from '../data/dibcacAssessmentStandards.js'
import { getReviewGroups, saveReviewGroups } from './reviewGroups.js'

export function buildFamilyReviewGroups(controls, existingGroups = []) {
  const families = new Map()
  const seen = new Set()
  for (const control of sortControlsInAssessmentOrder(controls)) {
    for (const objective of control.objectives ?? []) {
      const key = `${control.id}[${objective.id}]`
      if (seen.has(key) || readObjectiveStatus(control.id, objective.id) === OBJECTIVE_STATUS_MET) continue
      seen.add(key)
      if (!families.has(control.family)) families.set(control.family, [])
      families.get(control.family).push({
        key, controlId: control.id, objId: objective.id, objText: objective.text,
        standard: getDibcacStandard(control.id, objective.id)?.standard ?? 'unknown',
      })
    }
  }
  const names = new Set(existingGroups.map((group) => group.name))
  return [...families].map(([family, objectives]) => {
    let name = family
    let suffix = 2
    while (names.has(name)) name = `${family} (${suffix++})`
    names.add(name)
    return {
      id: crypto.randomUUID(), name, objectives, checklist: [], plannedAsk: '',
      createdAt: new Date().toISOString(),
    }
  })
}

export function createFamilyReviewGroups(controls) {
  const existing = getReviewGroups()
  const created = buildFamilyReviewGroups(controls, existing)
  if (!created.length) return created
  saveReviewGroups([...existing, ...created])
  const savedIds = new Set(getReviewGroups().map((group) => group.id))
  if (created.some((group) => !savedIds.has(group.id))) {
    throw new Error('Groups could not be saved. Browser storage may be full or unavailable.')
  }
  return created
}
