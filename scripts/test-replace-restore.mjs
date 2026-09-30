import assert from 'node:assert/strict'
import { createServer } from 'vite'

const memory = new Map()
globalThis.localStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
  key: (i) => [...memory.keys()][i] ?? null,
  get length() { return memory.size },
}
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
try {
  const controls = (await vite.ssrLoadModule('/src/data/controls/index.js')).default
  const ps = await vite.ssrLoadModule('/src/utils/projectState.js')
  const st = await vite.ssrLoadModule('/src/utils/objectiveStatus.js')
  const status = await vite.ssrLoadModule('/src/utils/status.js')
  const fd = await vite.ssrLoadModule('/src/utils/objectiveFindings.js')
  const art = await vite.ssrLoadModule('/src/utils/objectiveArtifacts.js')
  const res = await vite.ssrLoadModule('/src/utils/objectiveResults.js')
  const notes = await vite.ssrLoadModule('/src/utils/notes.js')
  const inh = await vite.ssrLoadModule('/src/utils/inheritance.js')
  const C = 'AC.L1-3.1.1', D = 'AC.L1-3.1.2'

  // Project A: one MET objective with a finding on D only.
  st.writeObjectiveStatus(D, 'a', 'MET')
  fd.writeObjectiveFinding(D, 'a', { finalText: 'Project A finding' })
  const backupA = ps.exportProjectState(controls)

  // Workspace becomes Project B with work on C.
  const loadProjectB = () => {
    memory.clear()
    status.writeStatus(C, 'In Progress')
    notes.writeNote(C, 'Project B control note')
    st.writeObjectiveStatus(C, 'a', 'MET')
    fd.writeObjectiveFinding(C, 'a', { finalText: 'Project B finding' })
    art.writeObjectiveArtifacts(C, 'a', ['Project B Policy.pdf'])
    res.writeObjectiveResult(C, 'a', { examine: 'Project B examine', checklistInterviewNotes: { 'g:i': { label: 'x', note: 'Project B checklist note' } } })
    inh.writeInheritanceSources(C, ['Project B Cloud'])
    inh.writeObjectiveInheritance(C, 'a', ['Project B Cloud'])
  }

  // Replace: nothing from Project B survives in any category.
  loadProjectB()
  ps.importProjectState(backupA, controls, { mode: 'replace' })
  assert.equal(st.readObjectiveStatus(C, 'a'), 'Unreviewed', 'B objective status cleared')
  assert.equal(status.readStatus(C), 'Not Started', 'B control status replaced')
  assert.equal(fd.readObjectiveFinding(C, 'a'), null, 'B finding cleared')
  assert.deepEqual(art.readObjectiveArtifacts(C, 'a'), [], 'B artifacts cleared')
  assert.ok(res.objectiveResultIsEmpty(res.readObjectiveResult(C, 'a')), 'B results and checklist notes cleared')
  assert.equal(notes.readNote(C), '', 'B control note cleared')
  assert.deepEqual(inh.readInheritanceSources(C), [], 'B inheritance sources cleared')
  assert.deepEqual(inh.readObjectiveInheritance(C, 'a'), [], 'B objective inheritance cleared')
  assert.equal(st.readObjectiveStatus(D, 'a'), 'MET', 'A status restored')
  assert.equal(fd.readObjectiveFinding(D, 'a')?.finalText, 'Project A finding', 'A finding restored')

  // Replace with categories deselected: those local values are left alone.
  loadProjectB()
  ps.importProjectState(backupA, controls, { mode: 'replace', categories: { objectiveFindings: false, objectiveArtifacts: false } })
  assert.equal(fd.readObjectiveFinding(C, 'a')?.finalText, 'Project B finding', 'deselected findings preserved')
  assert.deepEqual(art.readObjectiveArtifacts(C, 'a'), ['Project B Policy.pdf'], 'deselected artifacts preserved')
  assert.equal(st.readObjectiveStatus(C, 'a'), 'Unreviewed', 'selected statuses still replaced')

  // Fill-empty mode is unchanged: existing local work stays.
  loadProjectB()
  ps.importProjectState(backupA, controls, { mode: 'fill-empty' })
  assert.equal(fd.readObjectiveFinding(C, 'a')?.finalText, 'Project B finding', 'fill-empty keeps local finding')
  assert.equal(fd.readObjectiveFinding(D, 'a')?.finalText, 'Project A finding', 'fill-empty fills blanks')

  // Round trip: restoring a workspace's own backup changes nothing.
  loadProjectB()
  const backupB = ps.exportProjectState(controls)
  ps.importProjectState(backupB, controls, { mode: 'replace' })
  const again = ps.exportProjectState(controls)
  delete backupB.exportedAt; delete again.exportedAt
  assert.deepEqual(again, backupB, 'self-restore is lossless')

  console.log('Replace restore passed: no cross-project leakage, deselected categories preserved, fill-empty unchanged, lossless self-restore.')
} finally { await vite.close() }
