import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'

const memory = new Map()
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
}

const { combinedInterviewText, readObjectiveResult, writeObjectiveResult } = await import('../src/utils/objectiveResults.js')
const {
  reconcileChecklistInterviewNotes,
  removeGroupChecklistInterviewNotes,
  syncChecklistInterviewNote,
} = await import('../src/utils/checklistInterviewNotes.js')

const keys = ['AC.L1-3.1.1[a]', 'AC.L1-3.1.1[b]', 'IA.L1-3.5.2[c]']
const group = { id: 'identity', name: 'Identity Review', checklist: [] }
const first = { id: 'users', type: 'item', text: 'Describe identity verification', objKeys: keys }
const second = { id: 'devices', type: 'item', text: 'Describe device verification', objKeys: [keys[0]], interviewNote: 'Managed devices are certificate-bound.' }

writeObjectiveResult('AC.L1-3.1.1', 'a', { interviews: 'Manual interview entry.' })
syncChecklistInterviewNote(group, first, 'Users authenticate with MFA.')
for (const key of keys) {
  const match = key.match(/^(.+)\[([^\]]+)\]$/)
  const result = readObjectiveResult(match[1], match[2])
  assert.equal(Object.keys(result.checklistInterviewNotes).length, 1)
}
let result = readObjectiveResult('AC.L1-3.1.1', 'a')
assert.match(combinedInterviewText(result), /Manual interview entry/)
assert.match(combinedInterviewText(result), /Users authenticate with MFA/)

syncChecklistInterviewNote(group, second, 'Managed devices are certificate-bound.')
result = readObjectiveResult('AC.L1-3.1.1', 'a')
assert.equal(Object.keys(result.checklistInterviewNotes).length, 2)

syncChecklistInterviewNote(group, first, 'Users authenticate with phishing-resistant MFA.')
result = readObjectiveResult('AC.L1-3.1.1', 'a')
assert.equal(Object.keys(result.checklistInterviewNotes).length, 2)
assert.match(combinedInterviewText(result), /phishing-resistant/)
assert.doesNotMatch(combinedInterviewText(result), /Users authenticate with MFA\./)

const moved = { ...first, objKeys: [keys[1]], interviewNote: 'Updated attachment.' }
syncChecklistInterviewNote(group, moved, moved.interviewNote, first.objKeys)
assert.equal(Object.keys(readObjectiveResult('AC.L1-3.1.1', 'a').checklistInterviewNotes).length, 1)
assert.equal(Object.keys(readObjectiveResult('IA.L1-3.5.2', 'c').checklistInterviewNotes).length, 0)

reconcileChecklistInterviewNotes(
  { ...group, checklist: [moved, second] },
  { ...group, name: 'Renamed Review', checklist: [{ ...moved, text: 'Updated question' }] },
)
result = readObjectiveResult('AC.L1-3.1.1', 'b')
assert.match(Object.values(result.checklistInterviewNotes)[0].label, /Renamed Review — Updated question/)

removeGroupChecklistInterviewNotes({ ...group, checklist: [moved, second] })
assert.equal(Object.keys(readObjectiveResult('AC.L1-3.1.1', 'a').checklistInterviewNotes).length, 0)
assert.equal(readObjectiveResult('AC.L1-3.1.1', 'a').interviews, 'Manual interview entry.')

const stressKeys = Array.from({ length: 320 }, (_, index) => `AC.TEST-${index}[a]`)
const stressItem = { id: 'stress', type: 'item', text: 'Stress question', objKeys: stressKeys }
const started = performance.now()
syncChecklistInterviewNote({ id: 'stress-group', name: 'Stress Group' }, stressItem, 'Stress note')
syncChecklistInterviewNote({ id: 'stress-group', name: 'Stress Group' }, stressItem, 'Updated stress note')
syncChecklistInterviewNote({ id: 'stress-group', name: 'Stress Group' }, stressItem, '')
const elapsed = performance.now() - started
assert.ok(elapsed < 3000, `960 objective note writes took ${elapsed.toFixed(0)}ms`)

console.log(`Checklist interview-note tests passed (960 stress writes in ${elapsed.toFixed(0)}ms).`)
