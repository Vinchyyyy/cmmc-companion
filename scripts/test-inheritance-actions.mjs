import assert from 'node:assert/strict'
import { createServer } from 'vite'
const memory = new Map()
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
  key: (index) => [...memory.keys()][index] ?? null,
  get length() { return memory.size },
}
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
try {
  const api = await vite.ssrLoadModule('/src/utils/inheritance.js')
  const control = { id: 'AC.L2-3.1.1', objectives: [{ id: 'a' }, { id: 'b' }] }
  api.writeInheritance(control.id, 'Partial')
  api.writeInheritanceSource(control.id, 'Microsoft')
  api.addInheritanceSourceToObjectives(control, 'Microsoft')
  api.applyControlInheritance(control, 'Full', 'Example ESP', 'add')
  assert.deepEqual(api.readInheritanceSources(control.id), ['Microsoft', 'Example ESP'])
  assert.deepEqual(api.readInheritanceAssignments(control.id).map((item) => item.level), ['Partial', 'Full'])
  assert.equal(api.readInheritance(control.id), 'Partial')
  for (const objective of control.objectives) assert.deepEqual(api.readObjectiveInheritance(control.id, objective.id), ['Microsoft', 'Example ESP'])
  api.applyControlInheritance(control, 'Partial', 'example esp', 'add')
  assert.equal(api.readInheritanceSources(control.id).length, 2, 'case-insensitive duplicate updates existing source')
  api.applyControlInheritance(control, 'Full', 'Replacement', 'replace')
  assert.deepEqual(api.readInheritanceSources(control.id), ['Replacement'])
  assert.equal(api.readInheritance(control.id), 'Full')
  for (const objective of control.objectives) assert.deepEqual(api.readObjectiveInheritance(control.id, objective.id), ['Replacement'])
  const osc = await vite.ssrLoadModule('/src/utils/oscProfile.js')
  assert.equal(osc.readOscProfile().providers.length, 3, 'replacement retains provider registry')
  const project = await vite.ssrLoadModule('/src/utils/projectState.js')
  const snapshot = project.exportProjectState([control])
  memory.clear()
  project.importProjectState(snapshot, [control])
  assert.deepEqual(api.readInheritanceAssignments(control.id), [{ source: 'Replacement', level: 'Full' }], 'project roundtrip preserves assignments')
  api.applyControlInheritance(control, 'None')
  assert.deepEqual(api.readInheritanceSources(control.id), [])
  assert.deepEqual(api.readInheritanceAssignments(control.id), [])
  for (const objective of control.objectives) assert.deepEqual(api.readObjectiveInheritance(control.id, objective.id), [])
  console.log('Inheritance add, replace, duplicate, legacy and objective synchronization checks passed.')
} finally { await vite.close() }
