import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
  const statuses = await load('objectiveStatus')
  const findings = await load('objectiveFindings')
  assert.equal(findings.parseFindingFields('A) Reviewed Record;\nB) Legacy statement.\nC) Full implementation of this objective was not confirmed.\nD) Differences: First line.\nSecond line.\nE) Retest history.').differencesText, 'First line.\nSecond line.', 'legacy D discrepancies retain multiline text without swallowing history')
  assert.equal(findings.parseFindingFields('Freeform assessor narrative.').differencesText, '', 'freeform findings are not reinterpreted')
  const auto = await load('autoObjectiveFinding')
  const artifacts = await load('objectiveArtifacts')
  const results = await load('objectiveResults')
  const project = await load('projectState')
  const { buildFinalText } = await load('findingStatementBuilder')
  const { getDiscrepancyHelper } = await load('discrepancyHelper')
  const { buildCmmcTemplateWorkbook } = await load('exportCmmcTemplate')
  const { parseAssessmentWorkbook, applyWorkbookImport } = await load('importAssessmentWorkbook')
  const { synchronizeAllFindings } = await load('findingSynchronization')
  const { collectExportWarnings } = await load('exportPreflight')
  const template = readFileSync(new URL('../public/templates/CMMC_Level2_AssessmentResults_Template.xlsx', import.meta.url))
  const control = controls.find((item) => item.id === 'CM.L2-3.4.1')
  const [a, b, c, d, e] = control.objectives
  for (const obj of [a, b, c]) statuses.writeObjectiveStatus(control.id, obj.id, 'NOT MET')
  statuses.writeObjectiveStatus(control.id, d.id, 'MET')
  artifacts.writeObjectiveArtifacts(control.id, a.id, ['Policy & baseline <record> 😀', 'Excluded artifact'])
  const binary = auto.ensureNotMetObjectiveFinding(control, a)
  findings.writeObjectiveFinding(control.id, a.id, { ...binary, includedArtifacts: ['Policy & baseline <record> 😀'], finalText: binary.finalText.replace(' Excluded artifact;', '') })
  artifacts.writeObjectiveArtifacts(control.id, b.id, ['Baseline inventory'])
  const discrepancy = `${getDiscrepancyHelper(b.text).build(['software', 'documentation'])}\nObserved: "A&B" <missing> — firmware review 😀.`
  const multipart = auto.ensureNotMetObjectiveFinding(control, b, { differencesText: discrepancy })
  findings.writeObjectiveFinding(control.id, b.id, { ...multipart, helperComponents: ['software', 'documentation'], finalText: `${multipart.finalText}\nD) Assessor retest history.` })
  const incomplete = auto.ensureNotMetObjectiveFinding(control, c, { differencesText: '' })
  auto.ensureMetObjectiveFinding(control, d)
  results.writeObjectiveResult(control.id, a.id, { interviews: 'Interview & notes\nSecond line.', examine: 'Examined <baseline>.', test: 'Test 😀', overallComments: 'Keep all comments.' })
  const expected = Object.fromEntries([a, b, c, d].map((obj) => [obj.id, findings.readObjectiveFinding(control.id, obj.id)]))
  assert.ok(collectExportWarnings([control]).some((warning) => warning.kind === 'missingDiscrepancy' && warning.ref === `${control.id}[c]`), 'export warns about incomplete NOT MET drafts')
  assert.ok(!collectExportWarnings([control]).some((warning) => warning.kind === 'missingDiscrepancy' && warning.ref === `${control.id}[a]`))

  // JSON is the full-fidelity backup, including helper choices and history.
  const backup = JSON.parse(JSON.stringify(project.exportProjectState(controls)))
  project.wipeProjectState()
  project.importProjectState(backup, controls)
  for (const obj of [a, b, c, d]) assert.deepEqual(findings.readObjectiveFinding(control.id, obj.id), expected[obj.id])
  assert.equal(statuses.readObjectiveStatus(control.id, e.id), 'Unreviewed')
  assert.equal(statuses.getTrendingStatusFromStorage(control), 'NOT MET')

  const exportAndParse = async (options) => {
    const { workbook } = await buildCmmcTemplateWorkbook(template, controls, options)
    const parsed = await parseAssessmentWorkbook(await workbook.generateAsync({ type: 'nodebuffer' }), controls)
    assert.equal(parsed.ok, true)
    return parsed
  }
  const parsed = await exportAndParse()
  for (const obj of [a, b, c, d]) assert.equal(parsed.objectiveData[control.id][obj.id].findings, expected[obj.id].finalText, `Excel preserves finding ${obj.id}`)
  assert.equal(parsed.objectiveData[control.id][a.id].examine, 'Examined <baseline>.')
  assert.equal(parsed.objectiveData[control.id][a.id].test, 'Test 😀')
  const filtered = await exportAndParse({ selectedFamilyCodes: ['AC'] })
  assert.equal(filtered.objectiveData[control.id][a.id].findings, '', 'filtered export excludes CM findings')
  project.wipeProjectState()
  applyWorkbookImport(parsed, controls, 'new')
  for (const obj of [a, b, c, d]) assert.equal(findings.readObjectiveFinding(control.id, obj.id).finalText, expected[obj.id].finalText, `Excel import preserves finding ${obj.id}`)
  assert.equal(findings.readObjectiveFinding(control.id, b.id).differencesText, discrepancy, 'editable discrepancy survives Excel import')
  assert.equal(findings.readObjectiveFinding(control.id, b.id).statusContext, 'NOT_MET')
  assert.equal(findings.readObjectiveFinding(control.id, c.id).differencesText, '', 'incomplete placeholder is not treated as a discrepancy')
  assert.deepEqual(findings.readObjectiveFinding(control.id, a.id).includedArtifacts, ['Policy & baseline <record> 😀'], 'deliberately excluded evidence stays excluded')
  assert.equal(statuses.readObjectiveStatus(control.id, e.id), 'Unreviewed')
  assert.equal(statuses.getTrendingStatusFromStorage(control), 'NOT MET')
  // A save from Findings Builder reconstructs the same A–C body using metadata.
  const imported = findings.readObjectiveFinding(control.id, b.id)
  assert.equal(buildFinalText({ includedArtifacts: imported.includedArtifacts, objectiveRef: `${control.id}[b]`, statusContext: imported.statusContext, differencesText: imported.differencesText }) + '\nD) Assessor retest history.', expected.b.finalText)
  artifacts.writeObjectiveArtifacts(control.id, b.id, ['Baseline inventory', 'Evidence after import'])
  const updated = findings.readObjectiveFinding(control.id, b.id)
  assert.match(updated.finalText, /Evidence after import;/)
  assert.equal(updated.differencesText, discrepancy)
  synchronizeAllFindings()
  assert.deepEqual(findings.readObjectiveFinding(control.id, a.id).includedArtifacts, ['Policy & baseline <record> 😀'])
  const second = await exportAndParse()
  assert.equal(second.objectiveData[control.id][b.id].findings, findings.readObjectiveFinding(control.id, b.id).finalText)
  const local = { ...updated, differencesText: 'Local reviewed discrepancy', finalText: updated.finalText.replace(discrepancy, 'Local reviewed discrepancy') }
  findings.writeObjectiveFinding(control.id, b.id, local)
  applyWorkbookImport(parsed, controls, 'merge')
  assert.deepEqual(findings.readObjectiveFinding(control.id, b.id), local, 'merge import preserves existing local findings')
  assert.equal((await parseAssessmentWorkbook(new Uint8Array([1, 2, 3]), controls)).ok, false, 'invalid workbook is rejected')
  const beforeInvalid = [...memory.entries()]
  assert.equal(project.importProjectState({ schemaVersion: 9999, controls: [] }, controls).ok, false, 'unsupported JSON schema is rejected')
  assert.deepEqual([...memory.entries()], beforeInvalid, 'invalid JSON import does not change project data')
  assert.match(incomplete.finalText, /Discrepancy required/)
  console.log('Finding export round trips passed: mixed MET/NOT MET/unreviewed results, binary and multipart discrepancies, incomplete drafts, multiline Unicode text, evidence exclusions, JSON metadata/history, Excel re-import/edit/re-export, filtering, merge protection, and invalid file handling.')
} finally { await vite.close() }
