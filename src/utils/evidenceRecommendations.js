/**
 * Evidence Reuse Recommendations
 *
 * Suggests existing objective-level artifacts from related controls that may be
 * reusable for the current objective. No AI, no semantic matching, no filename
 * heuristics — purely relationship-graph + artifact-usage data.
 *
 * Relationships are treated bidirectionally: if A → B or B → A, both controls
 * are candidates. Only evidence_reuse relationships are included;
 * interview_reuse, demonstration_reuse, reference, and missing
 * assessmentCategory are all excluded.
 *
 * Results are ranked by a 4-factor score:
 *   relationship confidence (0.40) + objective evidence confidence (0.30)
 *   + evidence class (0.20) + relationship type (0.10)
 */

import relationships from '../data/relationships/index.js'
import { readObjectiveArtifacts } from './objectiveArtifacts.js'
import {
  getObjectiveExpectedTagIds,
  getArtifactTagIdsByName,
  classifyReuseOpportunity,
} from './evidenceTagMatch.js'

function _relConfScore(c) {
  if (c === 'high') return 100
  if (c === 'medium') return 65
  if (c === 'low') return 30
  return 0
}

function _objEvidConfScore(c) {
  if (c === 'high') return 100
  if (c === 'medium') return 60
  if (c === 'low') return 30
  return 0
}

function _evidClassScore(ec) {
  if (ec === 'artifact') return 100
  if (ec === 'mixed') return 60
  return 0
}

function _relTypeScore(t) {
  if (t === 'prerequisite') return 100
  if (t === 'supports' || t === 'supported-by') return 80
  return 50
}

function _computeScore(relMeta, relObj) {
  return (
    _relConfScore(relMeta.confidence) * 0.40 +
    _objEvidConfScore(relObj.evidenceConfidence) * 0.30 +
    _evidClassScore(relObj.evidenceClass) * 0.20 +
    _relTypeScore(relMeta.relationshipType) * 0.10
  )
}

// Returns a copy of a candidate without the internal scoring fields used only
// for ranking. The public `tagAlignment`/`rationale` fields are preserved.
function _stripInternalSuggestionFields(candidate) {
  const result = { ...candidate }
  delete result._score
  delete result._relConf
  delete result._objEvidConf
  return result
}

/**
 * Returns up to `limit` artifact suggestions for a single objective, ranked
 * by the 4-factor scoring model.
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
 *   rationale:           string,
 *   tagAlignment:        { tier: number, kind: string, label: string,
 *                          overlap: { primary: string[], acceptable: string[], all: string[] } },
 * }>}
 *
 * Candidate discovery is unchanged (relationship-gated, evidence_reuse only).
 * Each candidate is additionally classified by how its controlled evidence tags
 * align with the TARGET objective's expectedTags, and results are ordered by
 * tag-aware tier first (lower = stronger alignment) then by the existing score.
 * No tag-only candidates are added and none are suppressed for lacking overlap.
 */
export function getObjectiveArtifactSuggestions({
  control,
  objective,
  allControls,
  limit = 5,
}) {
  // --- 1. Related control IDs + relationship metadata (bidirectional, evidence_reuse only) ---
  const relMetaMap = new Map() // relatedId → { rationale, confidence, relationshipType }
  for (const rel of relationships) {
    if (rel.assessmentCategory !== 'evidence_reuse') continue
    const rationale = rel.assessorRationale || rel.reasoning || ''
    if (rel.sourceControl === control.id && !relMetaMap.has(rel.targetControl)) {
      relMetaMap.set(rel.targetControl, { rationale, confidence: rel.confidence, relationshipType: rel.relationshipType })
    }
    if (rel.targetControl === control.id && !relMetaMap.has(rel.sourceControl)) {
      relMetaMap.set(rel.sourceControl, { rationale, confidence: rel.confidence, relationshipType: rel.relationshipType })
    }
  }
  relMetaMap.delete(control.id)

  if (relMetaMap.size === 0) return []

  // --- 2. Already-assigned artifacts on the current objective (lowercase) ---
  const alreadyAssigned = new Set(
    readObjectiveArtifacts(control.id, objective.id).map((a) => a.toLowerCase())
  )

  // --- 3. Collect all candidate (artifact, source-objective) pairs with scores ---
  // seen: lowercase artifact name → best score so far (keeps highest-scored source)
  const seenKey = new Map()    // artifact key → index in candidates[]
  const candidates = []

  for (const related of allControls) {
    if (!relMetaMap.has(related.id)) continue
    if (!Array.isArray(related.objectives)) continue
    const relMeta = relMetaMap.get(related.id)

    for (const relObj of related.objectives) {
      const ec = relObj.evidenceClass
      if (ec !== 'artifact' && ec !== 'mixed') continue

      const score = _computeScore(relMeta, relObj)
      const artifacts = readObjectiveArtifacts(related.id, relObj.id)

      for (const raw of artifacts) {
        const name = raw.trim()
        if (!name) continue
        const key = name.toLowerCase()
        if (alreadyAssigned.has(key)) continue

        if (seenKey.has(key)) {
          // Keep the highest-scored source for this artifact
          const idx = seenKey.get(key)
          if (score > candidates[idx]._score) {
            candidates[idx] = {
              artifact: name,
              sourceControlId: related.id,
              sourceControlTitle: related.title ?? '',
              sourceObjectiveId: relObj.id,
              sourceObjectiveText: relObj.text ?? '',
              rationale: relMeta.rationale,
              _score: score,
              _relConf: _relConfScore(relMeta.confidence),
              _objEvidConf: _objEvidConfScore(relObj.evidenceConfidence),
            }
          }
        } else {
          seenKey.set(key, candidates.length)
          candidates.push({
            artifact: name,
            sourceControlId: related.id,
            sourceControlTitle: related.title ?? '',
            sourceObjectiveId: relObj.id,
            sourceObjectiveText: relObj.text ?? '',
            rationale: relMeta.rationale,
            _score: score,
            _relConf: _relConfScore(relMeta.confidence),
            _objEvidConf: _objEvidConfScore(relObj.evidenceConfidence),
          })
        }
      }
    }
  }

  // --- 4. Tag-aware classification against the TARGET objective's expectedTags.
  // Read-only: explains and orders existing candidates; adds/suppresses none. ---
  const expectedTags = getObjectiveExpectedTagIds(objective)
  for (const c of candidates) {
    c.tagAlignment = classifyReuseOpportunity({
      artifactTagIds: getArtifactTagIdsByName(c.artifact),
      expectedTags,
    })
  }

  // --- 5. Sort (tag tier asc → existing score desc → existing tie-breakers)
  // and return top `limit` (strip internal scoring fields). ---
  candidates.sort((a, b) => {
    if (a.tagAlignment.tier !== b.tagAlignment.tier) return a.tagAlignment.tier - b.tagAlignment.tier
    if (b._score !== a._score) return b._score - a._score
    if (b._relConf !== a._relConf) return b._relConf - a._relConf
    if (b._objEvidConf !== a._objEvidConf) return b._objEvidConf - a._objEvidConf
    const cmp = a.sourceControlId.localeCompare(b.sourceControlId)
    if (cmp !== 0) return cmp
    return a.sourceObjectiveId.localeCompare(b.sourceObjectiveId)
  })

  return candidates.slice(0, limit).map(_stripInternalSuggestionFields)
}
