import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { createServer } from 'vite'

const memory = new Map()
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key), key: (index) => [...memory.keys()][index] ?? null,
  get length() { return memory.size },
}
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
try {
  const load = (name) => vite.ssrLoadModule(`/src/utils/${name}.js`)
  const { default: controls } = await vite.ssrLoadModule('/src/data/controls/index.js')
  const findings = await load('objectiveFindings')
  const artifacts = await load('objectiveArtifacts')
  const roles = await load('objectiveInterviewedRoles')
  const osc = await load('oscProfile')
  const { synchronizeAllFindings } = await load('findingSynchronization')
  const project = await load('projectState')
  const { buildFinalText } = await load('findingStatementBuilder')
  const args = [controls[0].id, controls[0].objectives[0].id]
  const text = buildFinalText({ roles: [], includedArtifacts: ['Policy'], objectiveRef: `${args[0]}[${args[1]}]`, objectiveText: 'access is controlled', hasDifferences: true, differencesText: 'Keep this assessor detail.\nAnd this second line.', statusContext: 'NOT_MET' })
  artifacts.writeObjectiveArtifacts(...args, ['Policy'])
  findings.writeObjectiveFinding(...args, { finalText: text, importedFromWorkbook: true, includedArtifacts: [], hasDifferences: true, differencesText: 'Keep this assessor detail.\nAnd this second line.', replacedImportedText: 'Original source', updatedAt: '2026-01-01' })
  osc.writeOscProfile({ staffNames: ['John S.', 'Jane D.'] })
  let current = findings.readObjectiveFinding(...args)
  assert.equal(current.finalText, `Interviewed: John S.; Jane D.\n\n${text}`, 'save staff updates imported finding immediately')
  assert.equal(current.differencesText, 'Keep this assessor detail.\nAnd this second line.')
  osc.writeOscProfile({ ...osc.readOscProfile(), staffNames: ['John Updated'] })
  current = findings.readObjectiveFinding(...args)
  assert.equal(current.finalText, `Interviewed: John Updated\n\n${text}`, 'rename/removal does not retain stale staff')
  roles.writeObjectiveInterviewedRoles(...args, ['Local Interviewee'])
  assert.match(findings.readObjectiveFinding(...args).finalText, /^Interviewed: John Updated; Local Interviewee/)
  roles.writeObjectiveInterviewedRoles(...args, [])
  assert.doesNotMatch(findings.readObjectiveFinding(...args).finalText, /Local Interviewee/)
  osc.writeOscProfile({ ...osc.readOscProfile(), staffNames: [] })
  assert.equal(findings.readObjectiveFinding(...args).finalText, text, 'last participant removal removes only Interviewed line')

  artifacts.writeObjectiveArtifacts(...args, ['Policy', 'Screenshot $& example'])
  current = findings.readObjectiveFinding(...args)
  assert.match(current.finalText, /A\) Reviewed Policy; Screenshot \$& example;/)
  assert.equal(current.finalText.slice(current.finalText.indexOf('\nB)')), text.slice(text.indexOf('\nB)')), 'B/C/D byte-for-byte preserved')
  artifacts.writeObjectiveArtifacts(...args, ['Screenshot $& example'])
  assert.doesNotMatch(findings.readObjectiveFinding(...args).finalText, /Reviewed Policy;/)

  // Save a curated finding that deliberately excludes an assigned artifact.
  artifacts.writeObjectiveArtifacts(...args, ['Policy', 'Excluded'])
  findings.writeObjectiveFinding(...args, { finalText: text, includedArtifacts: ['Policy'], syncedAssignedArtifacts: ['Policy', 'Excluded'], updatedAt: 'stable' })
  synchronizeAllFindings()
  assert.deepEqual(findings.readObjectiveFinding(...args).includedArtifacts, ['Policy'])
  const beforeRepeat = JSON.stringify(findings.readObjectiveFinding(...args))
  synchronizeAllFindings()
  assert.equal(JSON.stringify(findings.readObjectiveFinding(...args)), beforeRepeat, 'catch-up is idempotent')
  // Simulate a missed legacy write, then the startup catch-up path.
  localStorage.setItem(`cmmc-obj-artifacts-${args[0]}-${args[1]}`, JSON.stringify(['Policy', 'Excluded', 'Late Evidence']))
  localStorage.setItem('cmmc-osc-profile', JSON.stringify({ staffNames: ['Refresh Staff'] }))
  synchronizeAllFindings()
  current = findings.readObjectiveFinding(...args)
  assert.deepEqual(current.includedArtifacts, ['Policy', 'Late Evidence'])
  assert.match(current.finalText, /^Interviewed: Refresh Staff/)

  const other = [controls[0].id, controls[0].objectives[1].id]
  findings.writeObjectiveFinding(...other, { finalText: 'Freeform assessor narrative', updatedAt: 'unchanged' })
  const preserved = findings.readObjectiveFinding(...other)
  osc.writeOscProfile({ staffNames: ['New Staff'] })
  artifacts.writeObjectiveArtifacts(...other, ['Other Evidence'])
  synchronizeAllFindings()
  assert.deepEqual(findings.readObjectiveFinding(...other), preserved, 'freeform findings never rewritten')
  assert.equal(findings.readObjectiveFinding(controls[1].id, controls[1].objectives[0].id), null, 'does not create findings')

  synchronizeAllFindings()
  const expected = findings.readObjectiveFinding(...args)
  const backup = JSON.parse(JSON.stringify(project.exportProjectState(controls)))
  project.wipeProjectState()
  project.importProjectState(backup, controls)
  synchronizeAllFindings()
  assert.deepEqual(findings.readObjectiveFinding(...args), expected, 'sync metadata and text survive JSON restore')

  const started = performance.now()
  for (const control of controls) for (const objective of control.objectives) {
    findings.writeObjectiveFinding(control.id, objective.id, { finalText: text, includedArtifacts: ['Policy'] })
  }
  osc.writeOscProfile({ staffNames: ['All Objectives Staff'] })
  synchronizeAllFindings()
  assert.equal(synchronizeAllFindings(), 0)
  for (const control of controls) for (const objective of control.objectives) assert.match(findings.readObjectiveFinding(control.id, objective.id).finalText, /^Interviewed: All Objectives Staff/)
  console.log(`Finding synchronization passed: staff/role updates, imported findings, artifact changes, exclusions, protected prose, refresh, JSON restore, idempotency; 320-objective sweep in ${(performance.now() - started).toFixed(0)}ms.`)
} finally { await vite.close() }
