import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import {
  buildCrmBulkAssignments,
  normalizeCrmControlId,
  normalizeCrmInheritanceStatus,
  parseCrmBulkText,
  summarizeCrmBulkRows,
} from '../src/utils/crmBulkImport.js'

const idCases = new Map([
  ['AC-01(a)', 'AC-1'],
  ['AC-02(01)', 'AC-2(1)'],
  ['AC-02(03)(a)', 'AC-2(3)'],
  ['ac 02 (07) (c)', 'AC-2(7)'],
  ['AC–02(12)(b)', 'AC-2(12)'],
  ['IA-05', 'IA-5'],
  ['not a control', ''],
])

for (const [input, expected] of idCases) {
  assert.equal(normalizeCrmControlId(input), expected, `normalize ${input}`)
}

assert.deepEqual(normalizeCrmInheritanceStatus('Yes'), { kind: 'mapped', treatment: 'Full', label: 'Full' })
assert.deepEqual(normalizeCrmInheritanceStatus('Partial'), { kind: 'mapped', treatment: 'Partial', label: 'Partial' })
assert.equal(normalizeCrmInheritanceStatus('').kind, 'blank')
assert.equal(normalizeCrmInheritanceStatus('No').kind, 'none')
assert.equal(normalizeCrmInheritanceStatus('Maybe').kind, 'review')

const spreadsheetPaste = [
  'Control ID\tCan Be Inherited from CSP',
  'AC-01(a)\tPartial',
  'AC-02(03)(a)\tYes',
  'AC-02(03)(b)\tYes',
  'AC-02(07)(c)\tPartial',
  'AC-02(09)\t',
  'AC-04(21)\tNo',
  'garbage\tYes',
  'AC-05(a)\tMaybe',
].join('\r\n')

const parsed = parseCrmBulkText(spreadsheetPaste)
assert.equal(parsed.length, 8, 'header is ignored')
assert.equal(parsed[0].normalizedControl, 'AC-1')
assert.equal(parsed[0].outcome, 'unmatched', 'valid controls without Appendix D matches remain visible')
assert.equal(parsed[1].normalizedControl, 'AC-2(3)')
assert.equal(parsed[1].treatment, 'Full')
assert.equal(parsed[1].selectable, true)
assert.equal(parsed[2].outcome, 'duplicate', 'same normalized ID and treatment is deduplicated')
assert.equal(parsed[3].normalizedControl, 'AC-2(7)')
assert.equal(parsed[4].outcome, 'blank')
assert.equal(parsed[5].outcome, 'none')
assert.equal(parsed[6].outcome, 'invalid')
assert.equal(parsed[7].outcome, 'review')

const flexibleRows = parseCrmBulkText('"AC-02(01)","Yes"\nAC-02(04) Partial\nIA-02(01)\tFull')
assert.deepEqual(flexibleRows.map((row) => row.normalizedControl), ['AC-2(1)', 'AC-2(4)', 'IA-2(1)'])
assert.deepEqual(flexibleRows.map((row) => row.treatment), ['Full', 'Partial', 'Full'])

const overlapping = parseCrmBulkText('AC-02(03)\tYes\nAC-02(07)\tPartial')
const assignments = buildCrmBulkAssignments(overlapping, new Set(overlapping.map((row) => row.id)))
assert.ok(assignments.length > 0)
assert.ok(assignments.every((assignment) => assignment.treatment === 'Partial'), 'Partial wins overlapping requirements conservatively')

const onlyFirst = buildCrmBulkAssignments(overlapping, new Set([overlapping[0].id]))
assert.ok(onlyFirst.every((assignment) => assignment.treatment === 'Full'), 'deselected rows do not affect aggregation')

const summary = summarizeCrmBulkRows(parsed)
assert.deepEqual(summary, { total: 8, ready: 2, unmatched: 2, review: 1, skipped: 3 })

const largePaste = Array.from({ length: 10_000 }, (_, index) => `AC-02(03)\t${index % 3 === 0 ? 'Partial' : 'Yes'}`).join('\n')
const started = performance.now()
const largeRows = parseCrmBulkText(largePaste)
const elapsed = performance.now() - started
assert.equal(largeRows.length, 10_000)
assert.ok(elapsed < 2_000, `10,000 CRM rows parsed in ${elapsed.toFixed(1)}ms`)

let seed = 0xc0ffee
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 0x100000000
}
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-()\t, \n\r\u00a0\u2013'
for (let run = 0; run < 1_000; run++) {
  let input = ''
  const length = 10 + Math.floor(random() * 400)
  for (let index = 0; index < length; index++) input += alphabet[Math.floor(random() * alphabet.length)]
  const rows = parseCrmBulkText(input)
  const ids = new Set(rows.filter((row) => row.selectable).map((row) => row.id))
  const output = buildCrmBulkAssignments(rows, ids)
  assert.ok(Array.isArray(output), `fuzz ${run} returns assignments`)
  assert.ok(rows.every((row) => typeof row.id === 'string'), `fuzz ${run} returns stable row IDs`)
}

console.log(`CRM bulk import tests passed: ${idCases.size} ID cases, clipboard formats, conflict handling, 10,000-row load (${elapsed.toFixed(1)}ms), and 1,000 fuzz runs.`)
