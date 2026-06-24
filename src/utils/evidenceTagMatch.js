// =========================================================================
// Tag-Aware Reuse Classification (read-only)
// =========================================================================
//
// Pure, null-safe helpers that compare an artifact's controlled evidence tags
// (artifact.tags) against a target objective's expectedTags. Used to add a
// tag-aware ranking tier and a neutral explanatory label to relationship-backed
// reuse suggestions.
//
// These helpers explain and order existing suggestions. They are classification
// aids only — they never decide whether an objective is satisfied, never create
// or suppress candidates, and never write to the registry.

import { findByName } from './artifactRegistry.js'
import { evidenceTags } from '../data/evidenceTags.js'
import { assessmentGuideProfiles } from '../data/assessmentGuideProfiles.js'

// Tag-id → human label lookup, built once at module load.
const EVIDENCE_TAG_LABEL = new Map(evidenceTags.map((t) => [t.id, t.label]))

// Visible tier caps — Suggested Artifacts is an elite, focused list, not an
// exhaustive dump of everything above threshold.
export const STRONG_CAP = 5
export const RELATED_CAP = 8

// Returns the target objective's expected evidence tag ids, split by role.
// Missing/malformed expectedTags resolve to empty arrays without throwing.
// Note/waiver-only objectives (no primary/acceptable ids) yield
// hasExpectedTags: false.
export function getObjectiveExpectedTagIds(objective) {
  const et = objective?.expectedTags
  const primary = Array.isArray(et?.primary)
    ? et.primary.filter((t) => typeof t === 'string' && t)
    : []
  const acceptable = Array.isArray(et?.acceptable)
    ? et.acceptable.filter((t) => typeof t === 'string' && t)
    : []
  return {
    primary,
    acceptable,
    hasExpectedTags: primary.length > 0 || acceptable.length > 0,
  }
}

// Resolves an artifact display name to its controlled evidence tag ids.
// Returns [] if the name is unresolved, has no tags, or has malformed tags.
// Read-only: never creates a record, never writes to the registry.
export function getArtifactTagIdsByName(artifactName) {
  if (typeof artifactName !== 'string' || !artifactName.trim()) return []
  const rec = findByName(artifactName)
  if (!rec || !Array.isArray(rec.tags)) return []
  return rec.tags.filter((t) => typeof t === 'string' && t)
}

// Computes the overlap between artifact tag ids and the objective's expected
// tags. Primary overlap wins over acceptable for the same tag (a tag present in
// both expected roles is reported only under primary). Order follows the
// objective's expectedTags order for determinism.
export function getTagOverlap(artifactTagIds, expectedTags) {
  const artifactSet = new Set(Array.isArray(artifactTagIds) ? artifactTagIds : [])
  const primaryIds = expectedTags?.primary ?? []
  const acceptableIds = expectedTags?.acceptable ?? []

  const primary = primaryIds.filter((id) => artifactSet.has(id))
  const primarySet = new Set(primary)
  const acceptable = acceptableIds.filter(
    (id) => artifactSet.has(id) && !primarySet.has(id)
  )

  return { primary, acceptable, all: [...primary, ...acceptable] }
}

// Classifies a relationship-backed reuse candidate into a tag-aware tier with a
// neutral label. Lower tier = stronger evidence-type alignment.
//
//   Tier 1  tag-primary         primary overlap exists
//   Tier 2  tag-acceptable      acceptable overlap exists, no primary overlap
//   Tier 3  untagged            artifact has no tags
//           no-expected-tags    objective has no expectedTags
//   Tier 4  relationship-only   artifact has tags but no overlap
//
// Tier 3 deliberately ranks above Tier 4: an untagged artifact (or an objective
// without expected tags) is unknown, not misaligned, and should not rank below
// a tagged-but-non-overlapping artifact.
export function classifyReuseOpportunity({ artifactTagIds, expectedTags }) {
  const tags = Array.isArray(artifactTagIds) ? artifactTagIds : []
  const overlap = getTagOverlap(tags, expectedTags)

  if (overlap.primary.length > 0) {
    return {
      tier: 1,
      kind: 'tag-primary',
      label: 'Aligns with a primary expected evidence type',
      overlap,
    }
  }

  if (overlap.acceptable.length > 0) {
    return {
      tier: 2,
      kind: 'tag-acceptable',
      label: 'Aligns with an acceptable supporting evidence type',
      overlap,
    }
  }

  if (tags.length === 0) {
    return {
      tier: 3,
      kind: 'untagged',
      label: 'Untagged artifact — add evidence tags to improve reuse precision',
      overlap,
    }
  }

  if (!expectedTags?.hasExpectedTags) {
    return {
      tier: 3,
      kind: 'no-expected-tags',
      label: 'Related-objective reuse opportunity',
      overlap,
    }
  }

  return {
    tier: 4,
    kind: 'relationship-only',
    label: 'Related-objective reuse opportunity',
    overlap,
  }
}

// =========================================================================
// Strict tiered reuse bucketing (assessor-facing precision over recall)
// =========================================================================
//
// Maps a tag-alignment classification onto the assessor-facing reuse tier.
// Suggested Artifacts is intentionally narrow: only artifacts whose evidence
// tags align with the target objective's expected evidence types surface.
//
//   'strong'  → tier 1, primary expected-tag overlap (use these first)
//   'related' → tier 2, acceptable expected-tag overlap (review before assigning)
//   'hidden'  → everything else: untagged, no expected tags, or tagged but with
//               no expected-tag overlap (relationship-only / broad). These are
//               below threshold and must NOT be rendered as an assessor list.
//
// This is the hard gate that prevents broad relationship traversal from
// flooding suggestions: a relationship between two controls helps only when the
// artifact's tags also align with the target objective's expected evidence.
export function reuseTierBucket(tagAlignment) {
  if (!tagAlignment) return 'hidden'
  if (tagAlignment.tier === 1) return 'strong'
  if (tagAlignment.tier === 2) return 'related'
  return 'hidden'
}

// Identifies why a hidden candidate was excluded, for muted helper counts only.
//   'untagged'        → artifact carries no evidence tags
//   'broad'           → tagged (or relationship-backed) but no expected-tag overlap
export function reuseExclusionReason(tagAlignment) {
  if (!tagAlignment || tagAlignment.kind === 'untagged') return 'untagged'
  return 'broad'
}

// Concise, assessor-safe reason string for a visible (strong/related) candidate.
// Long relationship rationale is shown separately/collapsed by the UI.
export function reuseConciseReason(tagAlignment) {
  if (!tagAlignment) return ''
  const labels = (tagAlignment.overlap?.all ?? []).map(
    (id) => EVIDENCE_TAG_LABEL.get(id) ?? id
  )
  if (tagAlignment.tier === 1) {
    return labels.length
      ? `Matched expected evidence tag: ${labels.join(', ')}`
      : 'Matches a primary expected evidence type'
  }
  if (tagAlignment.tier === 2) {
    return labels.length
      ? `Acceptable evidence tag alignment: ${labels.join(', ')} — review before assigning`
      : 'Acceptable evidence tag alignment — review before assigning'
  }
  return ''
}

// =========================================================================
// Phase 2 — Deterministic compound evidence-profile scoring
// =========================================================================
//
// Replaces the single-tier-overlap model with a compound score that weighs:
//   1. how strongly an artifact's evidence tags match the objective's expected
//      evidence (primary > acceptable > shared-category),
//   2. whether multiple tags align (compound evidence profile),
//   3. whether the tags form a known complementary combination relevant to the
//      objective's evidence context,
//   4. relationship / mapping proximity (same control, directly related control,
//      same family), and
//   5. broadness — a few weak matches buried in a many-tagged artifact are
//      penalised so broad artifacts don't dominate.
//
// No AI, no embeddings — controlled tag metadata + arithmetic only. The score is
// internal; the UI consumes `tier` and concise reason strings.

// tag id → governance category (a weaker, secondary signal than an exact tag id)
const TAG_CATEGORY = new Map(evidenceTags.map((t) => [t.id, t.category]))

// Known complementary evidence combinations, keyed by an internal group name.
// These reuse EXISTING tag ids only — no new taxonomy. A combo bonus is awarded
// only when an artifact carries 2+ tags from a group AND the target objective's
// expected evidence also belongs to that same group (contextual relevance gate).
export const TAG_COMBO_GROUPS = {
  identity_access: [
    'identity_roster', 'privileged_account_inventory', 'account_lifecycle_record',
    'access_review_record', 'access_authorization_record', 'role_permission_matrix',
    'mfa_configuration', 'access_enforcement_configuration',
  ],
  network_boundary: [
    'network_diagram', 'data_flow_diagram', 'firewall_ruleset',
    'remote_access_configuration', 'wireless_configuration',
  ],
  configuration: [
    'configuration_baseline_record', 'configuration_compliance_report',
    'configuration_standard', 'change_management_record', 'mdm_enrollment_list',
    'software_inventory', 'asset_inventory',
  ],
  audit: [
    'audit_log_configuration', 'audit_log_sample', 'log_review_record',
    'monitoring_tool_configuration', 'alert_record',
  ],
  incident_response: [
    'incident_response_plan', 'incident_record', 'incident_response_test_record',
  ],
  personnel_physical: [
    'physical_access_authorization', 'physical_access_record',
    'physical_security_configuration', 'personnel_screening_record',
    'personnel_action_record',
  ],
}

// tag id → Set of combo group names it participates in
const TAG_TO_COMBO_GROUPS = (() => {
  const m = new Map()
  for (const [group, ids] of Object.entries(TAG_COMBO_GROUPS)) {
    for (const id of ids) {
      if (!m.has(id)) m.set(id, new Set())
      m.get(id).add(group)
    }
  }
  return m
})()

function _labels(ids) {
  return (ids ?? []).map((id) => EVIDENCE_TAG_LABEL.get(id) ?? id).join(', ')
}

// Builds the evidence profile of an artifact from its controlled tag ids:
// the de-duplicated tag set, the categories it spans, and the combo groups it
// participates in. Pure / null-safe.
export function buildArtifactEvidenceProfile(artifactTagIds) {
  const tagSet = new Set((artifactTagIds ?? []).filter((t) => typeof t === 'string' && t))
  const categories = new Set()
  const comboGroups = new Set()
  for (const id of tagSet) {
    const c = TAG_CATEGORY.get(id)
    if (c) categories.add(c)
    const gs = TAG_TO_COMBO_GROUPS.get(id)
    if (gs) for (const g of gs) comboGroups.add(g)
  }
  return { tagIds: [...tagSet], tagSet, categories, comboGroups, tagCount: tagSet.size }
}

// Builds the expected-evidence profile of a target objective: primary and
// acceptable expected tag ids, the categories they span, and their combo groups.
export function buildObjectiveEvidenceProfile(objective) {
  const { primary, acceptable, hasExpectedTags } = getObjectiveExpectedTagIds(objective)
  const primarySet = new Set(primary)
  const acceptableSet = new Set(acceptable.filter((id) => !primarySet.has(id)))
  const expectedCategories = new Set()
  const comboGroups = new Set()
  for (const id of [...primarySet, ...acceptableSet]) {
    const c = TAG_CATEGORY.get(id)
    if (c) expectedCategories.add(c)
    const gs = TAG_TO_COMBO_GROUPS.get(id)
    if (gs) for (const g of gs) comboGroups.add(g)
  }
  return {
    primary: [...primarySet], primarySet,
    acceptable: [...acceptableSet], acceptableSet,
    expectedCategories, comboGroups, hasExpectedTags,
  }
}

// Builds the Assessment Guide evidence profile for a CONTROL: the set of evidence
// tag ids the official guide lists as examine objects for the practice, plus the
// categories they span. Null-safe: unknown control ⇒ empty profile.
export function buildAssessmentGuideProfile(controlId) {
  const p = assessmentGuideProfiles[controlId]
  const hints = Array.isArray(p?.evidenceTagHints) ? p.evidenceTagHints : []
  const hintSet = new Set(hints.filter((t) => typeof t === 'string' && t))
  const categories = new Set()
  for (const id of hintSet) {
    const c = TAG_CATEGORY.get(id)
    if (c) categories.add(c)
  }
  return { hintSet, categories, hasProfile: hintSet.size > 0 }
}

// Proximity/relationship context flags supplied by the discovery layer. All
// optional. `guideProfile` is the target control's Assessment Guide profile.
const DEFAULT_CONTEXT = {
  sameControl: false,          // artifact mapped elsewhere within the target control
  directRelationship: false,   // artifact mapped to a control evidence_reuse-related to target
  sameFamily: false,           // artifact mapped to another control in the same family
  guideProfile: null,          // buildAssessmentGuideProfile(targetControlId)
}

// Scores a single artifact against a single target objective and assigns a tier.
//
// Positive: +5 per primary tag, +3 per acceptable tag, +1 per shared-category tag
//   (capped at 2), +4 guide evidence-object match (+2 more if a primary tag also
//   matches), +2 guide theme/category match, +2/+3 compound bonus for 2/3+ aligned
//   tags, +2/+3 combo bonus, +3 same control, +3 direct relationship, +2/+1 same
//   family (strong/moderate).
// Negative: broadness penalty (-2 at 6+ tags, -4 at 10+ tags) only when the lone
//   alignment is weak (no primary tag and no guide-object match).
//
// Tier gates (guide-aware, score is for RANKING not Tier-1 entry):
//   untagged                       → hidden (kind 'untagged')
//   no tag/category/guide alignment→ hidden (kind 'no-alignment'); relationship-only
//   Strong : DIRECT match — an exact primary expected-tag match, OR a guide
//            evidence-object match reinforced by an exact (primary/acceptable) tag.
//            Category-only, combo-only, family-only, relationship-only, acceptable-
//            only, and guide-theme-only can NEVER reach Strong.
//   Related: score >= 4 with some tag/category/guide alignment, not Strong
//   else                           → hidden (kind 'below-threshold')
export function scoreArtifactForObjective(artifactProfile, objectiveProfile, context = {}) {
  const ctx = { ...DEFAULT_CONTEXT, ...context }
  const reasons = []
  const penalties = []
  let score = 0

  if (!artifactProfile || artifactProfile.tagCount === 0) {
    return {
      score: 0, tier: 'hidden', kind: 'untagged',
      reasons, penalties,
      matchedPrimaryTags: [], matchedAcceptableTags: [], matchedCategoryTags: [],
      relevantMatchCount: 0, comboBonus: 0,
    }
  }

  const matchedPrimaryTags = objectiveProfile.primary.filter((id) => artifactProfile.tagSet.has(id))
  const matchedAcceptableTags = objectiveProfile.acceptable.filter((id) => artifactProfile.tagSet.has(id))
  const exact = new Set([...matchedPrimaryTags, ...matchedAcceptableTags])

  // Shared-category tags: artifact tags (not already an exact match) whose
  // category is one the objective expects. Weaker signal, capped at 2.
  const matchedCategoryTags = []
  for (const id of artifactProfile.tagIds) {
    if (exact.has(id)) continue
    const c = TAG_CATEGORY.get(id)
    if (c && objectiveProfile.expectedCategories.has(c)) matchedCategoryTags.push(id)
  }
  const cappedCategoryTags = matchedCategoryTags.slice(0, 2)

  score += 5 * matchedPrimaryTags.length
  score += 3 * matchedAcceptableTags.length
  score += cappedCategoryTags.length // +1 each, max +2

  if (matchedPrimaryTags.length) {
    reasons.push(`Matched primary expected evidence tag${matchedPrimaryTags.length > 1 ? 's' : ''}: ${_labels(matchedPrimaryTags)}`)
  }
  if (matchedAcceptableTags.length) {
    reasons.push(`Matched acceptable evidence tag${matchedAcceptableTags.length > 1 ? 's' : ''}: ${_labels(matchedAcceptableTags)}`)
  }
  if (cappedCategoryTags.length) {
    reasons.push(`Related evidence category: ${_labels(cappedCategoryTags)}`)
  }

  const alignedCount = matchedPrimaryTags.length + matchedAcceptableTags.length
  const relevantMatchCount = alignedCount + cappedCategoryTags.length
  const hasPrimary = matchedPrimaryTags.length > 0
  const hasAnyAlignment = relevantMatchCount > 0

  // Compound evidence profile bonus — only counts genuinely-aligned tags.
  if (alignedCount >= 3) {
    score += 3
    reasons.push(`Strong compound evidence profile (${alignedCount} expected tags matched)`)
  } else if (alignedCount >= 2) {
    score += 2
    reasons.push(`Compound evidence profile (${alignedCount} expected tags matched)`)
  }

  // Complementary tag combo bonus — only when the objective shares the group.
  let comboBonus = 0
  let comboTags = null
  for (const g of artifactProfile.comboGroups) {
    if (!objectiveProfile.comboGroups.has(g)) continue
    const inGroup = TAG_COMBO_GROUPS[g].filter((id) => artifactProfile.tagSet.has(id))
    if (inGroup.length >= 2) {
      const b = inGroup.length >= 3 ? 3 : 2
      if (b > comboBonus) { comboBonus = b; comboTags = inGroup }
    }
  }
  if (comboBonus > 0) {
    score += comboBonus
    reasons.push(`Complementary evidence combination: ${_labels(comboTags)}`)
  }

  // Assessment Guide evidence-object signal (control-level, official context).
  // Object match (artifact tag IS a guide examine object) is stronger than a
  // theme/category match. Guide signals SUPPORT but never, alone, create Tier 1.
  const guide = ctx.guideProfile
  const guideObjectMatches = guide
    ? artifactProfile.tagIds.filter((id) => guide.hintSet.has(id))
    : []
  const hasGuideObject = guideObjectMatches.length > 0
  let guideThemeMatch = false
  if (guide && !hasGuideObject) {
    for (const id of artifactProfile.tagIds) {
      const c = TAG_CATEGORY.get(id)
      if (c && guide.categories.has(c)) { guideThemeMatch = true; break }
    }
  }
  if (hasGuideObject) {
    score += 4
    reasons.push(`Matched Assessment Guide evidence object: ${_labels(guideObjectMatches.slice(0, 2))}`)
    if (hasPrimary) { score += 2; reasons.push('Guide evidence object and primary expected tag both matched') }
  } else if (guideThemeMatch) {
    score += 2
    reasons.push('Assessment Guide theme alignment')
  }

  // Relationship / mapping proximity.
  if (ctx.sameControl) { score += 3; reasons.push('Already mapped within this control') }
  if (ctx.directRelationship) { score += 3; reasons.push('Mapped to a directly related control') }
  if (ctx.sameFamily) {
    if (hasPrimary) { score += 2; reasons.push('Same control family with strong tag alignment') }
    else if (hasAnyAlignment) { score += 1; reasons.push('Same control family with supporting tag alignment') }
  }

  // relevant alignment now also counts a guide-object match (so a guide-listed
  // artifact is not treated as a lone weak match for the broadness penalty).
  const relevantWithGuide = relevantMatchCount + (hasGuideObject ? 1 : 0)

  // Broadness penalty — only when the alignment is weak (no primary, no guide object).
  if (!hasPrimary && !hasGuideObject && relevantMatchCount <= 1) {
    if (artifactProfile.tagCount >= 10) { score -= 4; penalties.push('Broad artifact, minimal alignment (-4)') }
    else if (artifactProfile.tagCount >= 6) { score -= 2; penalties.push('Broad artifact, minimal alignment (-2)') }
  }

  const base = {
    score,
    reasons, penalties,
    matchedPrimaryTags, matchedAcceptableTags, matchedCategoryTags: cappedCategoryTags,
    matchedGuideObjects: guideObjectMatches,
    relevantMatchCount: relevantWithGuide, comboBonus,
  }

  const hasAnyAlignmentOrGuide = hasAnyAlignment || hasGuideObject

  // Hard gate: no tag/category/guide-object alignment ⇒ relationship-only ⇒ hidden.
  if (!hasAnyAlignmentOrGuide) {
    return { ...base, tier: 'hidden', kind: 'no-alignment' }
  }

  // ---- Stricter Tier 1 gate (guide-aware) ---------------------------------
  // Strong requires a DIRECT evidence-profile match — an exact PRIMARY expected
  // tag match, or a guide evidence-object match reinforced by an exact (primary
  // or acceptable) tag alignment. Category-only, combo-only, same-family-only,
  // relationship-only, acceptable-only, or guide-theme-only can never reach
  // Tier 1; they fall to Related or Hidden. This is the over-promotion fix.
  const hasExactAlignment = hasPrimary || matchedAcceptableTags.length > 0
  const directStrong = hasPrimary || (hasGuideObject && hasExactAlignment)

  let tier
  if (directStrong) tier = 'strong'
  else if (score >= 4 && hasAnyAlignmentOrGuide) tier = 'related'
  else tier = 'hidden'

  return { ...base, tier, kind: tier === 'hidden' ? 'below-threshold' : 'scored' }
}

// Concise, assessor-safe one-line reason derived from a compound score result.
// The reason is tier-appropriate: Strong reasons cite a direct primary/guide
// signal; Related reasons use softer "review before assigning" language. Long
// detail (full reasons[], penalties) stays out of the default UI.
export function summarizeReuseScore(result) {
  if (!result) return ''
  const primary = result.matchedPrimaryTags ?? []
  const acceptable = result.matchedAcceptableTags ?? []
  const guide = result.matchedGuideObjects ?? []
  const category = result.matchedCategoryTags ?? []
  const aligned = primary.length + acceptable.length

  // Strong-tier reasons (a direct primary, or guide-object + exact alignment).
  if (primary.length) {
    if (guide.length) {
      return `Matched guide profile and primary expected tag: ${_labels(primary)}`
    }
    if (aligned >= 2) {
      return `Matched ${aligned} evidence tags for this objective profile: ${_labels([...primary, ...acceptable])}`
    }
    return `Matched primary expected evidence tag: ${_labels(primary)}`
  }
  if (guide.length && acceptable.length) {
    return `Matched Assessment Guide evidence object: ${_labels(guide)}`
  }

  // Related-tier reasons.
  if (acceptable.length) {
    return `Acceptable evidence tag alignment: ${_labels(acceptable)} — review before assigning`
  }
  if (guide.length) {
    return `Assessment Guide evidence object — review before assigning`
  }
  if (category.length) {
    return `Related evidence category alignment — review before assigning`
  }
  return 'Related candidate — review before assigning'
}
