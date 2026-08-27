import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { createServer } from 'vite'

const controls = JSON.parse(readFileSync(new URL('../src/data/controls/access-control.json', import.meta.url), 'utf8'))

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
  key: (index) => [...storage.keys()][index] ?? null,
  get length() { return storage.size },
}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
const { ensureMetObjectiveFinding } = await vite.ssrLoadModule('/src/utils/autoObjectiveFinding.js')
const { readObjectiveFinding, writeObjectiveFinding } = await vite.ssrLoadModule('/src/utils/objectiveFindings.js')
const { writeObjectiveArtifacts } = await vite.ssrLoadModule('/src/utils/objectiveArtifacts.js')
const { writeObjectiveInterviewedRoles } = await vite.ssrLoadModule('/src/utils/objectiveInterviewedRoles.js')

const control = controls.find((item) => item.id === 'AC.L1-3.1.1')
assert.ok(control, 'known control exists')
const objective = control.objectives.find((item) => item.id === 'a')
assert.ok(objective, 'known objective exists')

writeObjectiveArtifacts(control.id, objective.id, ['Access Control Policy', 'User Access Roster'])
writeObjectiveInterviewedRoles(control.id, objective.id, ['IT Administrator', 'Security Officer'])

const created = ensureMetObjectiveFinding(control, objective)
assert.ok(created, 'MET transition creates a finding')
assert.equal(created.autoCreatedFromMet, true)
assert.deepEqual(created.includedArtifacts, ['Access Control Policy', 'User Access Roster'])
assert.match(created.finalText, /Interviewed: IT Administrator; Security Officer/)
assert.match(created.finalText, /A\) Reviewed Access Control Policy; User Access Roster;/)
assert.match(created.finalText, /AC\.L1-3\.1\.1\[a\]/)
assert.match(created.finalText, /Additional documentation was reviewed/)
assert.match(created.finalText, /C\) No noted findings or differences\./)
assert.match(created.finalText, /this objective is implemented\./)
assert.ok(created.createdAt && created.updatedAt)
assert.deepEqual(readObjectiveFinding(control.id, objective.id), created, 'created finding is persisted')

const secondAttempt = ensureMetObjectiveFinding(control, objective)
assert.equal(secondAttempt, null, 'repeated MET actions are idempotent')
assert.deepEqual(readObjectiveFinding(control.id, objective.id), created, 'repeated MET does not overwrite the finding')

writeObjectiveArtifacts(control.id, objective.id, ['Access Control Policy', 'User Access Roster', 'Quarterly Review Record'])
const evidenceUpdatedFinding = readObjectiveFinding(control.id, objective.id)
assert.deepEqual(evidenceUpdatedFinding.includedArtifacts, ['Access Control Policy', 'User Access Roster', 'Quarterly Review Record'])
assert.match(evidenceUpdatedFinding.finalText, /Quarterly Review Record;/, 'later artifact assignments update the automatic finding')

const secondObjective = control.objectives.find((item) => item.id === 'b')
const reviewedFinding = {
  includedArtifacts: ['Reviewed Evidence'],
  hasDifferences: true,
  differencesText: 'Assessor-authored detail',
  finalText: 'Assessor-authored finding must remain unchanged.',
  updatedAt: '2026-01-01T00:00:00.000Z',
}
writeObjectiveFinding(control.id, secondObjective.id, reviewedFinding)
assert.equal(ensureMetObjectiveFinding(control, secondObjective), null, 'existing manual findings are preserved')
assert.deepEqual(readObjectiveFinding(control.id, secondObjective.id), reviewedFinding)

assert.equal(ensureMetObjectiveFinding(null, objective), null, 'missing control is ignored safely')
assert.equal(ensureMetObjectiveFinding(control, null), null, 'missing objective is ignored safely')

const emptyObjective = control.objectives.find((item) => item.id === 'c')
const emptyFinding = ensureMetObjectiveFinding(control, emptyObjective)
assert.match(emptyFinding.finalText, /\[no artifact references entered\]/, 'missing artifacts use the standard placeholder')

const stressControl = { id: 'ZZ.L2-9.9.9', objectives: [] }
for (let index = 0; index < 1_000; index++) stressControl.objectives.push({ id: `obj-${index}`, text: `test objective ${index} is defined;` })
const started = performance.now()
for (const item of stressControl.objectives) assert.ok(ensureMetObjectiveFinding(stressControl, item))
const elapsed = performance.now() - started
assert.ok(elapsed < 2_000, `1,000 objective findings created in ${elapsed.toFixed(1)}ms`)
assert.equal(ensureMetObjectiveFinding(stressControl, stressControl.objectives[999]), null, 'stress findings remain idempotent')

console.log(`Automatic MET finding tests passed: snapshots, manual preservation, idempotency, empty evidence, and 1,000-objective stress run (${elapsed.toFixed(1)}ms).`)
await vite.close()
