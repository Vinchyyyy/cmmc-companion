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
  const load = (name) => vite.ssrLoadModule(`/src/utils/${name}.js`)
  const { default: controls } = await vite.ssrLoadModule('/src/data/controls/index.js')
  const { applyEvidencePoolToFamily } = await load('familyEvidencePool')
  const { readPool, writePool } = await load('evidencePool')
  const { readObjectiveArtifacts, writeObjectiveArtifacts } = await load('objectiveArtifacts')
  const { readObjectiveFinding } = await load('objectiveFindings')
  const { ensureNotMetObjectiveFinding } = await load('autoObjectiveFinding')
  const { readObjectiveStatus, writeObjectiveStatus } = await load('objectiveStatus')
  const { readStatus, writeStatus } = await load('status')
  const { exportProjectState, importProjectState, wipeProjectState } = await load('projectState')
  const source = controls.find((control) => control.id === 'AC.L1-3.1.1')
  const last = controls.find((control) => control.id === 'AC.L1-3.1.22')
  const other = controls.find((control) => control.id === 'CM.L2-3.4.1')
  writePool(source.id, ['AC policy', 'Access roster'])
  writePool(last.id, ['Existing pool artifact'])
  writeObjectiveArtifacts(last.id, 'a', ['Existing objective artifact', 'AC policy'])
  writeObjectiveStatus(last.id, 'a', 'NOT MET')
  writeStatus(last.id, 'NOT MET')
  ensureNotMetObjectiveFinding(last, last.objectives[0], { differencesText: 'Preserve the assessor discrepancy.' })
  writeStatus(source.id, 'MET')
  writePool(other.id, ['CM-only artifact'])
  writeObjectiveArtifacts(other.id, 'a', ['CM-only artifact'])
  const otherBefore = [...memory.entries()].filter(([key]) => key.includes(other.id))
  const result = applyEvidencePoolToFamily(controls, source.id)
  assert.equal(result.controls, 22)
  assert.equal(result.artifacts, 2)
  const ac = controls.filter((control) => control.id.startsWith('AC.'))
  assert.equal(result.objectives, ac.reduce((count, control) => count + control.objectives.length, 0))
  for (const control of ac) {
    assert.ok(readPool(control.id).includes('AC policy'))
    assert.ok(readPool(control.id).includes('Access roster'))
    for (const objective of control.objectives) {
      assert.ok(readObjectiveArtifacts(control.id, objective.id).includes('AC policy'), `${control.id}[${objective.id}] receives pool evidence`)
      assert.ok(readObjectiveArtifacts(control.id, objective.id).includes('Access roster'))
    }
  }
  assert.ok(readPool(last.id).includes('Existing pool artifact'))
  assert.ok(readObjectiveArtifacts(last.id, 'a').includes('Existing objective artifact'))
  assert.equal(readStatus(source.id), 'MET')
  assert.equal(readStatus(last.id), 'NOT MET')
  assert.equal(readObjectiveStatus(last.id, 'a'), 'NOT MET')
  assert.equal(readObjectiveStatus(source.id, 'a'), 'Unreviewed')
  assert.equal(readObjectiveFinding(last.id, 'a').differencesText, 'Preserve the assessor discrepancy.')
  assert.match(readObjectiveFinding(last.id, 'a').finalText, /Access roster;/)
  assert.deepEqual([...memory.entries()].filter(([key]) => key.includes(other.id)), otherBefore, 'other families are unchanged')
  const firstPass = [...memory.entries()]
  applyEvidencePoolToFamily(controls, source.id)
  assert.deepEqual([...memory.entries()], firstPass, 'repeated clicks produce no duplicate evidence or timestamp churn')
  const backup = JSON.parse(JSON.stringify(exportProjectState(controls)))
  wipeProjectState()
  importProjectState(backup, controls)
  for (const control of ac) for (const objective of control.objectives) assert.ok(readObjectiveArtifacts(control.id, objective.id).includes('Access roster'), 'family assignments survive JSON restore')
  assert.deepEqual(applyEvidencePoolToFamily(controls, other.id).controls, 9, 'scope follows the current family')
  assert.deepEqual(applyEvidencePoolToFamily(controls, 'unknown'), { controls: 0, objectives: 0, artifacts: 0 })
  console.log(`Family evidence pool passed: all 22 AC controls/${result.objectives} objectives, preserved evidence and assessment results, findings synchronization, no cross-family changes, repeat clicks, and JSON restore.`)
} finally { await vite.close() }
