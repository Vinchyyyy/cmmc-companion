/**
 * Evidence Reuse Recommendations (Phase 2 — compound scoring)
 *
 * Suggests existing tagged artifacts that may be reusable for a target objective.
 * No AI, no embeddings, no filename heuristics — controlled evidence-tag metadata
 * plus deterministic compound scoring (see scoreArtifactForObjective).
 *
 * Discovery is POOL-BASED, not relationship-gated: every tagged artifact in the
 * registry is a potential candidate and is scored against the target objective's
 * expected-evidence profile. Relationship / mapping proximity (same control,
 * directly related control, same family) is a *scoring signal*, never a gate.
 *
 * This is the Phase-2 fix for the rediscovery bug: an artifact removed from the
 * target objective re-enters the candidate pool immediately (it is excluded only
 * while *currently* assigned to the exact target objective), and strong tag
 * alignment alone is enough to resurface it even with no current mapping.
 */

import relationships from '../data/relationships/index.js'
import { readObjectiveArtifacts } from './objectiveArtifacts.js'
import { buildArtifactIndex } from './artifactIndex.js'
import { listArtifacts } from './artifactRegistry.js'
import {
  buildArtifactEvidenceProfile,
  buildObjectiveEvidenceProfile,
  buildAssessmentGuideProfile,
  scoreArtifactForObjective,
  summarizeReuseScore,
  STRONG_CAP,
  RELATED_CAP,
} from './evidenceTagMatch.js'

const EMPTY_TIERED_RESULT = () => ({
  strong: [],
  related: [],
  excluded: { untaggedCount: 0, broadCount: 0, alreadyAssignedCount: 0, cappedCount: 0 },
})

// Deterministic ordering within a tier: score desc, then primary-match count,
// then artifact name for stability.
function _byScore(a, b) {
  if (b.score !== a.score) return b.score - a.score
  if (b.matchedPrimaryTags.length !== a.matchedPrimaryTags.length) {
    return b.matchedPrimaryTags.length - a.matchedPrimaryTags.length
  }
  return a.artifact.toLowerCase().localeCompare(b.artifact.toLowerCase())
}

/**
 * Returns tiered, compound-scored artifact reuse suggestions for one objective.
 *
 * @param {{
 *   control:     { id: string, family?: string, objectives?: Array<object> },
 *   objective:   { id: string, expectedTags?: object },
 *   allControls: Array<{ id: string, family?: string, title?: string, objectives?: Array<object> }>,
 *   limit?:      number,   // per-tier cap
 * }} params
 *
 * @returns {{
 *   strong:  Candidate[],
 *   related: Candidate[],
 *   excluded: { untaggedCount: number, broadCount: number, alreadyAssignedCount: number },
 * }}
 *
 * where Candidate = {
 *   artifact, tier: 'strong'|'related', score, reason, reasons[], penalties[],
 *   matchedPrimaryTags[], matchedAcceptableTags[], matchedCategoryTags[], matchedTags[],
 *   sourceControlId, sourceControlTitle, sourceObjectiveId, sourceObjectiveText, rationale,
 *   tagAlignment,   // back-compat shape consumed by existing chip rendering
 * }
 */
export function getObjectiveArtifactSuggestions({
  control,
  objective,
  allControls,
  limit = 50,
}) {
  const result = EMPTY_TIERED_RESULT()
  if (!control || !objective) return result

  const objectiveProfile = buildObjectiveEvidenceProfile(objective)
  const guideProfile = buildAssessmentGuideProfile(control.id)

  // --- Related control ids (evidence_reuse, bidirectional) — context signal only ---
  const relatedControlIds = new Set()
  const relRationaleByControl = new Map()
  for (const rel of relationships) {
    if (rel.assessmentCategory && rel.assessmentCategory !== 'evidence_reuse') continue
    const rationale = rel.assessorRationale || rel.reasoning || ''
    if (rel.sourceControl === control.id) {
      relatedControlIds.add(rel.targetControl)
      if (!relRationaleByControl.has(rel.targetControl)) relRationaleByControl.set(rel.targetControl, rationale)
    }
    if (rel.targetControl === control.id) {
      relatedControlIds.add(rel.sourceControl)
      if (!relRationaleByControl.has(rel.sourceControl)) relRationaleByControl.set(rel.sourceControl, rationale)
    }
  }
  relatedControlIds.delete(control.id)

  // --- Family lookup + current mappings index ---
  const familyById = new Map(allControls.map((c) => [c.id, c.family]))
  const targetFamily = control.family

  const usageByName = new Map()
  for (const entry of buildArtifactIndex(allControls)) {
    usageByName.set(entry.artifact.toLowerCase(), entry.usages)
  }

  // --- Currently-assigned artifacts on the EXACT target objective (excluded) ---
  const assignedHere = new Set(
    readObjectiveArtifacts(control.id, objective.id).map((a) => a.toLowerCase())
  )

  // --- Score every registry artifact against the target objective ---
  for (const rec of listArtifacts()) {
    const name = typeof rec.name === 'string' ? rec.name.trim() : ''
    if (!name) continue
    const key = name.toLowerCase()
    const tags = Array.isArray(rec.tags) ? rec.tags.filter((t) => typeof t === 'string' && t) : []

    const usages = usageByName.get(key) ?? []

    // Proximity context from CURRENT mappings (recomputed from live state).
    let sameControl = false
    let directRelationship = false
    let sameFamily = false
    let relatedSource = null
    let familySource = null
    let anySource = null
    for (const u of usages) {
      if (!anySource) anySource = u
      if (u.controlId === control.id) {
        if (u.objectiveId === null || u.objectiveId !== objective.id) sameControl = true
        continue
      }
      if (relatedControlIds.has(u.controlId)) { directRelationship = true; if (!relatedSource) relatedSource = u }
      if (familyById.get(u.controlId) === targetFamily) { sameFamily = true; if (!familySource) familySource = u }
    }
    const hasConnection = sameControl || directRelationship || sameFamily

    // Currently assigned to the exact target objective → excluded (counted), never suggested.
    if (assignedHere.has(key)) {
      result.excluded.alreadyAssignedCount += 1
      continue
    }

    // Untagged → never eligible. Counted only when it is connected to the target
    // (a real, in-play artifact), to avoid inflating the count with the whole library.
    if (tags.length === 0) {
      if (hasConnection) result.excluded.untaggedCount += 1
      continue
    }

    const artifactProfile = buildArtifactEvidenceProfile(tags)
    const scored = scoreArtifactForObjective(artifactProfile, objectiveProfile, {
      sameControl, directRelationship, sameFamily, guideProfile,
    })

    if (scored.tier === 'hidden') {
      // Near-miss (some alignment) or relationship-only connected artifact → broad.
      // Tagged-but-unrelated-and-unaligned artifacts are not candidates at all.
      if (scored.relevantMatchCount > 0 || hasConnection) result.excluded.broadCount += 1
      continue
    }

    const src = relatedSource ?? familySource ?? anySource
    const matchedTags = [...scored.matchedPrimaryTags, ...scored.matchedAcceptableTags]
    const candidate = {
      artifact: name,
      tier: scored.tier,
      score: scored.score,
      reason: summarizeReuseScore(scored),
      reasons: scored.reasons,
      penalties: scored.penalties,
      matchedPrimaryTags: scored.matchedPrimaryTags,
      matchedAcceptableTags: scored.matchedAcceptableTags,
      matchedCategoryTags: scored.matchedCategoryTags,
      matchedGuideObjects: scored.matchedGuideObjects,
      matchedTags,
      sourceControlId: src?.controlId ?? '',
      sourceControlTitle: src?.controlTitle ?? '',
      sourceObjectiveId: src?.objectiveId ?? '',
      sourceObjectiveText: src?.objectiveText ?? '',
      rationale: (src && relatedControlIds.has(src.controlId))
        ? (relRationaleByControl.get(src.controlId) ?? '')
        : '',
      // Back-compat shape so existing matched-tag chip rendering keeps working.
      tagAlignment: {
        overlap: {
          primary: scored.matchedPrimaryTags,
          acceptable: scored.matchedAcceptableTags,
          all: matchedTags,
        },
      },
    }

    if (scored.tier === 'strong') result.strong.push(candidate)
    else result.related.push(candidate)
  }

  result.strong.sort(_byScore)
  result.related.sort(_byScore)

  // Visible caps — Suggested Artifacts is an elite, focused list. Candidates above
  // the cap are still eligible (and ranked) but hidden to keep the list useful.
  const strongCap = Math.min(STRONG_CAP, limit)
  const relatedCap = Math.min(RELATED_CAP, limit)
  result.excluded.cappedCount =
    Math.max(0, result.strong.length - strongCap) +
    Math.max(0, result.related.length - relatedCap)
  result.strong = result.strong.slice(0, strongCap)
  result.related = result.related.slice(0, relatedCap)
  return result
}
