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
