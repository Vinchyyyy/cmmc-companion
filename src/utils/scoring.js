// Scoring and POA&M eligibility utility.
// Data lives in src/data/scoring.json — a flat lookup keyed by control ID.
// These values are read-only; they are never written to localStorage and are
// not included in project JSON export/import.

import scoringData from '../data/scoring.json'

// Valid score values per the CMMC Level 2 scoring methodology.
export const SCORE_VALUES = [-5, -3, -1]

// CSS modifier classes for score badges.
export const SCORE_BADGE_CLASS = {
  '-5': 'score-badge--neg5',
  '-3': 'score-badge--neg3',
  '-1': 'score-badge--neg1',
}

// Returns the score value for a control, defaulting to -1 (the spec default).
export function getScore(controlId) {
  return scoringData[controlId]?.scoreValue ?? -1
}

// Returns "Basic" or "Derived" per the CMMC scoring methodology.
export function getPracticeType(controlId) {
  return scoringData[controlId]?.practiceType ?? 'Basic'
}

// Returns true if the control may be addressed via a POA&M.
export function isPoamAllowed(controlId) {
  return scoringData[controlId]?.poamAllowed !== false
}

// Returns the POA&M restriction reason string, or null if POA&M is allowed.
export function getPoamReason(controlId) {
  return scoringData[controlId]?.poamRestrictionReason ?? null
}

// Returns the full metadata object for a control.
export function getScoringMeta(controlId) {
  return scoringData[controlId] ?? { scoreValue: -1, practiceType: 'Basic', poamAllowed: true }
}

// Returns an array of search-friendly terms for a control so Quick Search
// can surface controls by score or POA&M status.
// These are matched against the user's search term in Home.jsx.
export function getScoringSearchTerms(controlId) {
  const meta = getScoringMeta(controlId)
  const terms = [
    String(meta.scoreValue),               // "-5", "-3", "-1"
    `${Math.abs(meta.scoreValue)} point`,  // "5 point", "3 point", "1 point"
    meta.practiceType.toLowerCase(),       // "basic", "derived"
  ]
  if (!meta.poamAllowed) {
    terms.push('non poam', 'no poam', 'non-poam', 'not poamable', 'conditional')
  } else {
    terms.push('poam', 'poam allowed', 'poam eligible')
  }
  if (meta.scoreValue === -5) terms.push('critical', 'high impact', 'five point')
  if (meta.scoreValue === -3) terms.push('three point')
  if (meta.scoreValue === -1) terms.push('one point', 'low impact')
  return terms
}
