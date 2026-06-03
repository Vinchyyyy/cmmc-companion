// Shared natural-sort utility for CMMC control IDs.
//
// CMMC control IDs follow the pattern "{FAMILY}.{LEVEL}-{SECTION}", e.g.
// "AC.L1-3.1.1", "SC.L2-3.13.10". A naive alphabetic sort puts 3.13.10
// before 3.13.2 because string comparison is character-by-character. The
// helpers below sort by family code first, then by the trailing dotted
// section number parsed as integers — ignoring L1/L2 for sort purposes.
//
// This means within a family, controls appear in strict section-number
// order with L1 and L2 entries interleaved (e.g. SC.L1-3.13.1, SC.L2-3.13.2,
// ..., SC.L1-3.13.5, SC.L2-3.13.6, ...).

// Extract sortable parts from a control ID like "SC.L1-3.13.5":
//   family: "SC"        — first 2 chars (the family code)
//   nums:   [3, 13, 5]  — trailing dotted section number parsed as integers
export function parseId(id) {
  if (!id || typeof id !== 'string') {
    return { family: '', nums: [] }
  }
  const family = id.slice(0, 2)
  // Everything after the first '-' is the dotted section number.
  // For "SC.L1-3.13.5" → "3.13.5"; for "AC.L2-3.1.22" → "3.1.22".
  const tail = id.includes('-') ? id.slice(id.indexOf('-') + 1) : ''
  const nums = tail
    .split('.')
    .map((n) => parseInt(n, 10))
    .filter((n) => !Number.isNaN(n))
  return { family, nums }
}

// Comparator for two control objects: sorts by family code alphabetically,
// then by section-number array element-by-element. Returns the standard
// negative/zero/positive triplet expected by Array.prototype.sort.
//
// Usage:
//   const sorted = controls.slice().sort(compareIds)
//   const sortedIds = ids.slice().sort(compareIdStrings)
//
// Accepts either control objects ({ id, ...}) or raw ID strings.
export function compareIds(a, b) {
  const aId = typeof a === 'string' ? a : a?.id
  const bId = typeof b === 'string' ? b : b?.id
  const pa = parseId(aId)
  const pb = parseId(bId)
  if (pa.family !== pb.family) {
    return pa.family.localeCompare(pb.family)
  }
  const len = Math.max(pa.nums.length, pb.nums.length)
  for (let i = 0; i < len; i++) {
    const av = pa.nums[i] ?? 0
    const bv = pb.nums[i] ?? 0
    if (av !== bv) return av - bv
  }
  return 0
}
