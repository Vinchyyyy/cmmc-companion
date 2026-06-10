/**
 * Evidence Reuse Recommendations — v1
 *
 * Suggests existing objective-level artifacts from related controls that may be
 * reusable for the current objective. No AI, no semantic matching, no filename
 * heuristics — purely relationship-graph + artifact-usage data.
 *
 * Relationships are treated bidirectionally: if A → B or B → A, both controls
 * are candidates. All relationship types (prerequisite, supports, …) are included.
 */

import relationships from '../data/relationships/index.js'
import { readObjectiveArtifacts } from './objectiveArtifacts.js'

/**
 * Returns up to `limit` artifact suggestions for a single objective.
 *
 * @param {{
 *   control:     { id: string, objectives?: Array<{ id: string, text?: string }> },
 *   objective:   { id: string },
 *   allControls: Array<{ id: string, objectives?: Array<{ id: string, text?: string }> }>,
 *   limit?:      number,
 * }} params
 *
 * @returns {Array<{
 *   artifact:            string,
 *   sourceControlId:     string,
 *   sourceControlTitle:  string,
 *   sourceObjectiveId:   string,
 *   sourceObjectiveText: string,
 * }>}
 */
export function getObjectiveArtifactSuggestions({
  control,
  objective,
  allControls,
  limit = 5,
}) {
  // --- 1. Related control IDs (bidirectional, all types) -------------------
  const relatedIds = new Set()
  for (const rel of relationships) {
    if (rel.sourceControl === control.id) relatedIds.add(rel.targetControl)
    if (rel.targetControl === control.id) relatedIds.add(rel.sourceControl)
  }
  // Never suggest from the control itself
  relatedIds.delete(control.id)

  // --- 2. Already-assigned artifacts on the current objective (lowercase) --
  const alreadyAssigned = new Set(
    readObjectiveArtifacts(control.id, objective.id).map((a) => a.toLowerCase())
  )

  // --- 3. Walk related controls, collect objective artifacts ----------------
  // seen: lowercase artifact name → first-source-wins
  const seen = new Map()
  const results = []

  for (const related of allControls) {
    if (!relatedIds.has(related.id)) continue
    if (!Array.isArray(related.objectives)) continue

    for (const relObj of related.objectives) {
      const artifacts = readObjectiveArtifacts(related.id, relObj.id)
      for (const raw of artifacts) {
        const name = raw.trim()
        if (!name) continue

        const key = name.toLowerCase()
        if (alreadyAssigned.has(key)) continue  // already on this objective
        if (seen.has(key)) continue             // duplicate — first source wins

        seen.set(key, true)
        results.push({
          artifact: name,
          sourceControlId: related.id,
          sourceControlTitle: related.title ?? '',
          sourceObjectiveId: relObj.id,
          sourceObjectiveText: relObj.text ?? '',
        })

        if (results.length >= limit) return results
      }
    }
  }

  return results
}
