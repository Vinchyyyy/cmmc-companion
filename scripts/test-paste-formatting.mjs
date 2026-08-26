import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import {
  buildNormalizedPasteValue,
  normalizePastedText,
} from '../src/utils/pasteFormatting.js'

const cases = [
  {
    name: 'SSP hard wraps become one paragraph',
    input: 'Physical access devices used at the facility, including electronic\nbadge credentials, are actively managed through the physical access\ncontrol program. Access devices are tracked within the system.',
    expected: 'Physical access devices used at the facility, including electronic badge credentials, are actively managed through the physical access control program. Access devices are tracked within the system.',
  },
  {
    name: 'sentence-ending punctuation does not create false paragraphs',
    input: 'The inventory is maintained.\nAccess is reviewed quarterly.\nExceptions are documented.',
    expected: 'The inventory is maintained. Access is reviewed quarterly. Exceptions are documented.',
  },
  {
    name: 'blank lines preserve paragraphs',
    input: 'First paragraph wraps\nonto another line.\n\nSecond paragraph also\nwraps.',
    expected: 'First paragraph wraps onto another line.\n\nSecond paragraph also wraps.',
  },
  {
    name: 'bullets and wrapped bullet continuations are preserved',
    input: 'Evidence reviewed:\n• Access roster covering all users\nand privileged roles\n• Quarterly review records\nwith approvals',
    expected: 'Evidence reviewed:\n• Access roster covering all users and privileged roles\n• Quarterly review records with approvals',
  },
  {
    name: 'numbered lists are preserved',
    input: 'Steps:\n1. Identify authorized users\n2) Review access permissions\n3. Document exceptions',
    expected: 'Steps:\n1. Identify authorized users\n2) Review access permissions\n3. Document exceptions',
  },
  {
    name: 'all-caps headings are preserved',
    input: 'ACCESS CONTROL\nThe organization limits access\nto authorized personnel.',
    expected: 'ACCESS CONTROL\nThe organization limits access to authorized personnel.',
  },
  {
    name: 'Windows line endings, non-breaking spaces, and soft hyphens normalize',
    input: 'Access\u00a0devices are config\u00adured.\r\nThey are reviewed.',
    expected: 'Access devices are configured. They are reviewed.',
  },
  {
    name: 'visible end-of-line hyphen remains a safe compound',
    input: 'Role-\nbased access is enforced.',
    expected: 'Role-based access is enforced.',
  },
  {
    name: 'tabular rows stay on separate lines',
    input: 'Control\tStatus\nAC.1\tMet\nAC.2\tNot Met',
    expected: 'Control\tStatus\nAC.1\tMet\nAC.2\tNot Met',
  },
  {
    name: 'line boundary prevents concatenated words',
    input: 'access\ndevices',
    expected: 'access devices',
  },
  {
    name: 'already clean prose remains unchanged',
    input: 'Access devices are managed through the physical access control program.',
    expected: 'Access devices are managed through the physical access control program.',
  },
]

for (const testCase of cases) {
  assert.equal(normalizePastedText(testCase.input), testCase.expected, testCase.name)
}

const replacement = buildNormalizedPasteValue(
  'Before OLD after',
  'access\ndevices',
  7,
  10,
  100,
)
assert.equal(replacement.value, 'Before access devices after', 'selection replacement')
assert.equal(replacement.cursor, 'Before access devices'.length, 'cursor placement')

const limited = buildNormalizedPasteValue('12345', 'access\ndevices', 5, 5, 10)
assert.equal(limited.value, '12345acces', 'maxLength is enforced after normalization')
assert.equal(limited.cursor, 10, 'limited paste cursor placement')

const largeInput = Array.from(
  { length: 10_000 },
  (_, index) => `Line ${index} contains representative SSP assessment narrative.`,
).join('\n')
const started = performance.now()
const largeOutput = normalizePastedText(largeInput)
const elapsed = performance.now() - started
assert.ok(largeOutput.startsWith('Line 0 contains'), 'large paste start retained')
assert.ok(largeOutput.endsWith('Line 9999 contains representative SSP assessment narrative.'), 'large paste end retained')
assert.equal((largeOutput.match(/\n/g) ?? []).length, 0, 'large hard-wrapped paste is flattened')
assert.ok(elapsed < 2_000, `large paste completed in ${elapsed.toFixed(1)}ms`)

let seed = 0x5eed1234
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 0x100000000
}
const alphabet = 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;-\n\r\t\u00a0\u00ad•'
for (let run = 0; run < 1_000; run++) {
  let input = ''
  const length = 20 + Math.floor(random() * 500)
  for (let index = 0; index < length; index++) {
    input += alphabet[Math.floor(random() * alphabet.length)]
  }
  const output = normalizePastedText(input)
  assert.ok(!output.includes('\r'), `fuzz run ${run}: carriage return removed`)
  assert.ok(!output.includes('\u00a0'), `fuzz run ${run}: non-breaking space removed`)
  assert.ok(!output.includes('\u00ad'), `fuzz run ${run}: soft hyphen removed`)
  assert.ok(!output.includes('\n\n\n'), `fuzz run ${run}: excessive blank lines collapsed`)
}

console.log(`Paste formatting tests passed: ${cases.length} scenarios, 1 large paste, 1,000 fuzz runs (${elapsed.toFixed(1)}ms large-paste normalization).`)
