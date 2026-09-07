import assert from 'node:assert/strict'
import { createServer } from 'vite'

const memory = new Map()
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
}
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
try {
  const { createFamilyReviewGroups, buildFamilyReviewGroups } = await vite.ssrLoadModule('/src/utils/familyReviewGroups.js')
  const { writeObjectiveStatus } = await vite.ssrLoadModule('/src/utils/objectiveStatus.js')
  const { getReviewGroups } = await vite.ssrLoadModule('/src/utils/reviewGroups.js')
  const { exportProjectState, importProjectState } = await vite.ssrLoadModule('/src/utils/projectState.js')
  const controls = [
    { id: 'AC.L1-3.1.1', family: 'Access Control', objectives: [{ id: 'a', text: 'Users' }, { id: 'b', text: 'Processes' }, { id: 'c', text: 'Devices' }] },
    { id: 'AT.L2-3.2.1', family: 'Awareness and Training', objectives: [{ id: 'a', text: 'Awareness' }] },
  ]
  writeObjectiveStatus(controls[0].id, 'a', 'MET')
  writeObjectiveStatus(controls[0].id, 'b', 'NOT MET')
  const created = createFamilyReviewGroups(controls)
  assert.equal(created.length, 2)
  assert.deepEqual(created[0].objectives.map((o) => o.objId), ['b', 'c'])
  assert.equal(created[0].name, 'Access Control')
  assert.equal(created[1].name, 'Awareness and Training')
  assert.equal(created[0].objectives[0].key, 'AC.L1-3.1.1[b]')
  assert.deepEqual(created[0].checklist, [])
  const again = createFamilyReviewGroups([controls[0]])
  assert.equal(again[0].name, 'Access Control (2)')
  assert.equal(getReviewGroups().length, 3)
  assert.equal(buildFamilyReviewGroups([controls[0], controls[0]])[0].objectives.length, 2)
  const before = getReviewGroups()
  const backup = JSON.parse(JSON.stringify(exportProjectState(controls)))
  memory.clear()
  importProjectState(backup, controls)
  assert.deepEqual(getReviewGroups(), before)
  for (const control of controls) for (const objective of control.objectives) writeObjectiveStatus(control.id, objective.id, 'MET')
  assert.deepEqual(createFamilyReviewGroups(controls), [])
  assert.deepEqual(getReviewGroups(), before)
  assert.deepEqual(createFamilyReviewGroups([]), [])
  writeObjectiveStatus(controls[0].id, 'b', 'NOT MET')
  globalThis.localStorage.setItem = () => { throw new Error('Storage full') }
  assert.throws(() => createFamilyReviewGroups(controls), /could not be saved/)
  console.log('Family groups passed: non-MET filtering, multiple families, duplicate names, deduplication, JSON restore, empty selections, and storage failure.')
} finally {
  await vite.close()
}
