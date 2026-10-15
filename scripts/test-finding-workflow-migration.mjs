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
  const { upgradeExistingNotMetFindings: upgrade } = await load('findingWorkflowMigration')
  const { writeObjectiveStatus, readObjectiveStatus } = await load('objectiveStatus')
  const { writeObjectiveFinding, readObjectiveFinding } = await load('objectiveFindings')
  const { writeObjectiveArtifacts } = await load('objectiveArtifacts')
  const { writeObjectiveResult, readObjectiveResult } = await load('objectiveResults')
  const { synchronizeAllFindings } = await load('findingSynchronization')
  const { exportProjectState, importProjectState, wipeProjectState } = await load('projectState')
  const cm = controls.find((item) => item.id === 'CM.L2-3.4.1')
  const args = (id) => [cm.id, id]
  const finding = (id) => readObjectiveFinding(...args(id))
  for (const obj of cm.objectives) writeObjectiveStatus(...args(obj.id), 'NOT MET')
  writeObjectiveArtifacts(...args('b'), ['Reviewed record', 'Deliberately excluded'])
  writeObjectiveResult(...args('b'), { examine: 'Preserve examine notes', interviews: 'Preserve interview notes', test: 'Preserve test notes', overallComments: 'Preserve comments' })
  const old = {
    finalText: 'Interviewed: Historical assessor\n\nA) Reviewed Reviewed record;\nB) Validation is described in the corresponding CM.L2-3.4.1[b] section of the SSP. Additional documentation was reviewed.\nC) Full implementation of this objective was not confirmed.\nD) Differences: Software and documentation were missing.\nSecond line of observed evidence.\nE) Retest history retained.',
    importedFromWorkbook: true, includedArtifacts: [], differencesText: '', updatedAt: '2025-01-01', helperComponents: ['software', 'documentation'],
  }
  writeObjectiveFinding(...args('b'), old)
  const staleMet = { finalText: 'A) Reviewed [no artifact references entered]\nB) Validation is described in the corresponding CM.L2-3.4.1[c] section of the SSP. Assessment team confirmed in interview, testing, and documentation that this objective is implemented.\nC) No noted findings or differences.\nD) Manual history.', differencesText: '' }
  writeObjectiveFinding(...args('c'), staleMet)
  const freeform = { finalText: 'Assessor-authored narrative must stay exact.', differencesText: 'Custom text', updatedAt: '2025-01-01' }
  writeObjectiveFinding(...args('d'), freeform)
  const custom = { finalText: 'A) Reviewed Record;\nB) My custom assessment conclusion.\nC) My custom differences.', updatedAt: '2025-01-01' }
  writeObjectiveFinding(...args('e'), custom)
  const untouchedMet = controls.find((item) => item.id === 'AC.L1-3.1.1')
  writeObjectiveStatus(untouchedMet.id, 'a', 'MET')
  const beforeNotes = readObjectiveResult(...args('b'))
  const assignmentKeys = [...memory.entries()].filter(([key]) => !key.startsWith('cmmc-objective-finding-'))
  assert.equal(upgrade(controls), 4, 'missing binary and nonbinary drafts, legacy finding, and stale positive finding upgraded')
  assert.match(finding('a').finalText, /C\) Differences: A baseline configuration is not established\./)
  assert.equal(finding('b').differencesText, 'Software and documentation were missing.\nSecond line of observed evidence.')
  assert.match(finding('b').finalText, /B\) Implementation as described in the corresponding CM.L2-3.4.1\[b\]/)
  assert.match(finding('b').finalText, /E\) Retest history retained\.$/)
  assert.match(finding('b').finalText, /Interviewed: Historical assessor/)
  assert.deepEqual(finding('b').includedArtifacts, ['Reviewed record'])
  assert.deepEqual(finding('b').helperComponents, ['software', 'documentation'])
  assert.deepEqual(finding('b').previousFinding, old, 'exact original finding retained for review and JSON backup')
  assert.match(finding('c').finalText, /C\) Differences: The baseline configuration is not maintained/)
  assert.doesNotMatch(finding('c').finalText, /this objective is implemented|No noted findings/)
  assert.match(finding('c').finalText, /D\) Manual history/)
  assert.deepEqual(finding('d'), freeform)
  assert.deepEqual(finding('e'), custom)
  assert.equal(readObjectiveFinding(untouchedMet.id, 'a'), null, 'MET objectives are untouched')
  assert.equal(readObjectiveStatus(untouchedMet.id, 'b'), 'Unreviewed')
  assert.deepEqual(readObjectiveResult(...args('b')), beforeNotes)
  assert.deepEqual([...memory.entries()].filter(([key]) => !key.startsWith('cmmc-objective-finding-')), assignmentKeys, 'statuses, assignments, and notes are unchanged')
  const firstPass = [...memory.entries()]
  assert.equal(upgrade(controls), 0)
  assert.deepEqual([...memory.entries()], firstPass, 'repeated refresh makes no changes, including timestamps and history')
  synchronizeAllFindings()
  const afterSync = [...memory.entries()]
  assert.equal(upgrade(controls), 0)
  synchronizeAllFindings()
  assert.deepEqual([...memory.entries()], afterSync, 'startup upgrade and synchronization settle without repeated writes')
  const backup = JSON.parse(JSON.stringify(exportProjectState(controls)))
  wipeProjectState()
  importProjectState(backup, controls)
  assert.equal(upgrade(controls), 0)
  // An old backup restored after a prior upgrade is upgraded on next refresh.
  writeObjectiveFinding(...args('b'), old)
  assert.equal(upgrade(controls), 1)
  assert.equal(finding('b').differencesText, 'Software and documentation were missing.\nSecond line of observed evidence.')
  const safeBefore = memory.get(`cmmc-objective-finding-${cm.id}-b`)
  writeObjectiveFinding(...args('b'), old)
  const normalSet = localStorage.setItem
  localStorage.setItem = () => { throw new Error('Storage full') }
  assert.equal(upgrade(controls), 0, 'failed persistence does not report a successful upgrade')
  localStorage.setItem = normalSet
  assert.deepEqual(JSON.parse(memory.get(`cmmc-objective-finding-${cm.id}-b`)), old, 'failed upgrade leaves original intact')
  assert.equal(upgrade(controls), 1, 'failed persistence retries on the next refresh')
  assert.equal(JSON.parse(safeBefore).differencesText, finding('b').differencesText)
  console.log('Existing-data upgrade passed: legacy NOT MET, missing findings, stale MET prose, automatic binary drafts, multipart drafts, preserved discrepancies/evidence/notes/history/custom text, repeated refresh, JSON restore, and storage-failure retry.')
} finally { await vite.close() }
