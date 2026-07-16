// Canonical assessment-order sequencing for controls — grouped by family in
// CMMC Assessment Guide TOC order, sorted within each family by practice
// number (e.g. MP.L1-3.8.3 sorts between MP.L2-3.8.2 and MP.L2-3.8.4, not
// before MP.L2-3.8.1 just because it's Level 1). Both the Control Library
// grouping and the Control Detail Prev/Next nav must use this same order —
// otherwise Prev/Next can walk a different sequence than what an assessor
// sees in the Library, which breaks the assessment flow.

const FAMILY_ORDER = [
  'Access Control',
  'Awareness and Training',
  'Audit and Accountability',
  'Configuration Management',
  'Identification and Authentication',
  'Incident Response',
  'Maintenance',
  'Media Protection',
  'Personnel Security',
  'Physical Protection',
  'Risk Assessment',
  'Security Assessment',
  'System and Communications Protection',
  'System and Information Integrity',
]

function parsePracticeNumber(controlId) {
  const m = String(controlId).match(/-(\d+(?:\.\d+)+)/)
  if (!m) return []
  return m[1].split('.').map(Number)
}

function comparePracticeIds(a, b) {
  const aId = typeof a === 'string' ? a : (a.id ?? '')
  const bId = typeof b === 'string' ? b : (b.id ?? '')
  const aParts = parsePracticeNumber(aId)
  const bParts = parsePracticeNumber(bId)
  const len = Math.max(aParts.length, bParts.length)
  for (let i = 0; i < len; i++) {
    const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0)
    if (diff !== 0) return diff
  }
  return String(aId).localeCompare(String(bId))
}

// Sorts a controls array into assessment order: family (TOC order), then
// practice number within the family.
function sortControlsInAssessmentOrder(controls) {
  const byFamily = new Map()
  for (const c of controls) {
    if (!byFamily.has(c.family)) byFamily.set(c.family, [])
    byFamily.get(c.family).push(c)
  }
  const orderedFamilies = [
    ...FAMILY_ORDER.filter((f) => byFamily.has(f)),
    ...[...byFamily.keys()].filter((f) => !FAMILY_ORDER.includes(f)),
  ]
  return orderedFamilies.flatMap((f) => [...byFamily.get(f)].sort(comparePracticeIds))
}

export { FAMILY_ORDER, parsePracticeNumber, comparePracticeIds, sortControlsInAssessmentOrder }
