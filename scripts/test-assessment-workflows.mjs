import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { createServer } from 'vite'
import JSZip from 'jszip'

const memory = new Map()
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
  clear: () => memory.clear(),
  key: (index) => [...memory.keys()][index] ?? null,
  get length() { return memory.size },
}
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
const load = (name) => vite.ssrLoadModule(`/src/utils/${name}.js`)
try {
  const { default: controls } = await vite.ssrLoadModule('/src/data/controls/index.js')
  const bulk = await load('bulkAssessmentActions')
  const status = await load('objectiveStatus')
  const findings = await load('objectiveFindings')
  const auto = await load('autoObjectiveFinding')
  const results = await load('objectiveResults')
  const artifacts = await load('objectiveArtifacts')
  const registry = await load('artifactRegistry')
  const osc = await load('oscProfile')
  const roles = await load('objectiveInterviewedRoles')
  const inheritance = await load('inheritance')
  const project = await load('projectState')
  const preflight = await load('exportPreflight')
  const excel = await load('exportCmmcTemplate')
  const importer = await load('importAssessmentWorkbook')
  const interview = await load('interviewExport')
  const ir = controls.find((control) => control.id.endsWith('3.6.1'))
  const ac = controls.find((control) => control.id === 'AC.L1-3.1.1')
  const first = ac.objectives[0]
  const args = [ac.id, first.id]
  const names = ['John S.', 'Jane D.']
  osc.writeOscProfile({ staffNames: [...names, ' John S. ', '', 42], overview: { businessDescription: 'Preserve old context' } })
  assert.deepEqual(osc.readAssessmentStaff(), names)
  roles.writeObjectiveInterviewedRoles(...args, [...names, 'IT Administrator'])
  assert.deepEqual(roles.readStoredObjectiveInterviewedRoles(...args), ['IT Administrator'])
  assert.deepEqual(roles.readObjectiveInterviewedRoles(...args), [...names, 'IT Administrator'])

  bulk.bulkSetControlStatus([ir], 'MET')
  for (const objective of ir.objectives) {
    assert.equal(status.readObjectiveStatus(ir.id, objective.id), 'MET')
    assert.ok(findings.readObjectiveFinding(ir.id, objective.id)?.finalText)
  }
  assert.equal(status.readObjectiveStatus(...args), 'Unreviewed', 'unselected control unchanged')
  const original = findings.readObjectiveFinding(ir.id, ir.objectives[0].id)
  bulk.bulkSetControlStatus([ir], 'MET')
  assert.deepEqual(findings.readObjectiveFinding(ir.id, ir.objectives[0].id), original)

  artifacts.writeObjectiveArtifacts(...args, ['Policy & Procedures', 'Device Inventory'])
  const record = registry.findByName('Policy & Procedures')
  registry.updateArtifactTags(record.id, ['policy_document'])
  results.writeObjectiveResult(...args, { interviews: 'Demonstrated login.', examine: 'Policy examined.', test: 'MFA tested.', overallComments: 'Keep this.' })
  bulk.bulkSetControlStatus([ac], 'MET')
  bulk.clearSelectedControlFields([ac], ['examine'])
  assert.equal(results.readObjectiveResult(...args).examine, '')
  assert.equal(results.readObjectiveResult(...args).test, 'MFA tested.')
  assert.equal(results.readObjectiveResult(...args).overallComments, 'Keep this.')
  assert.equal(status.readObjectiveStatus(...args), 'MET')
  assert.ok(findings.readObjectiveFinding(...args))
  findings.clearObjectiveFinding(...args)
  let warnings = preflight.collectExportWarnings([ac])
  assert.ok(warnings.some((warning) => warning.kind === 'missingFinding' && warning.ref === `${ac.id}[${first.id}]`))
  assert.ok(warnings.some((warning) => warning.kind === 'untagged' && warning.ref === 'Device Inventory'))
  assert.ok(!warnings.some((warning) => warning.kind === 'untagged' && warning.ref === 'Policy & Procedures'))
  assert.ok(!warnings.some((warning) => warning.ref.startsWith(ir.id)))
  assert.equal(bulk.createMissingMetFindings([ac]), 1)
  assert.equal(bulk.createMissingMetFindings([ac]), 0)
  const longResult = results.readObjectiveResult(...args)
  results.writeObjectiveResult(...args, { ...longResult, test: 'x'.repeat(4100) })
  assert.ok(preflight.collectExportWarnings([ac]).some((warning) => warning.kind === 'length' && warning.text.startsWith('Test')))
  results.writeObjectiveResult(...args, longResult)
  const standard = findings.readObjectiveFinding(...args)
  const multiline = { ...standard, finalText: standard.finalText.replace('C) No noted findings or differences.', 'C) Differences: First line\nSecond line') }
  assert.ok(auto.matchesStandardFinding(multiline, ac, first), 'multiline standard findings remain recognized')

  inheritance.writeInheritance(ac.id, 'Partial')
  inheritance.writeInheritanceSources(ac.id, ['Example CSP', 'Example MSP'])
  osc.writeOscProfile({ ...osc.readOscProfile(), providers: osc.readOscProfile().providers.map((provider, index) => ({ ...provider, standardsAcceptance: index ? 'DIBCAC High' : 'FedRAMP High' })) })
  const before = project.exportProjectState(controls)
  const json = JSON.parse(JSON.stringify(before))
  project.wipeProjectState()
  project.importProjectState(json, controls)
  assert.deepEqual(osc.readAssessmentStaff(), names, 'staff survives JSON')
  assert.equal(osc.readOscProfile().overview.businessDescription, 'Preserve old context')
  assert.equal(osc.readProviderStandardsAcceptance('Example CSP'), 'FedRAMP High')
  assert.deepEqual(registry.findByName('Policy & Procedures').tags, ['policy_document'])
  assert.deepEqual(findings.readObjectiveFinding(...args), before.controls.find((control) => control.id === ac.id).objectiveFindings[first.id])
  osc.writeOscProfile({ ...osc.readOscProfile(), staffNames: ['Updated Staff'] })
  assert.deepEqual(roles.readObjectiveInterviewedRoles(...args), ['Updated Staff', 'IT Administrator'], 'staff edits do not leave copied old names')
  osc.writeOscProfile({ ...osc.readOscProfile(), staffNames: names })

  const template = readFileSync(new URL('../public/templates/CMMC_Level2_AssessmentResults_Template.xlsx', import.meta.url))
  const { workbook } = await excel.buildCmmcTemplateWorkbook(template, controls)
  const originalZip = await JSZip.loadAsync(template)
  for (const [path, entry] of Object.entries(originalZip.files)) {
    if (entry.dir || path === 'xl/worksheets/sheet3.xml') continue
    assert.deepEqual(await workbook.file(path).async('nodebuffer'), await entry.async('nodebuffer'), `template component unchanged: ${path}`)
  }
  const bytes = await workbook.generateAsync({ type: 'nodebuffer' })
  const parsed = await importer.parseAssessmentWorkbook(bytes, controls)
  assert.equal(parsed.ok, true)
  assert.equal(parsed.controlData[ac.id].inheritanceSource, 'Example CSP\nExample MSP')
  assert.match(parsed.controlData[ac.id].standardsAcceptance, /Example CSP: FedRAMP High/)
  assert.match(parsed.controlData[ac.id].standardsAcceptance, /Example MSP: DIBCAC High/)
  const interviewText = 'John S.\nJane D.\nIT Administrator\n\nDemonstrated login.'
  assert.equal(parsed.objectiveData[ac.id][first.id].interviews, interviewText)
  const filtered = await excel.buildCmmcTemplateWorkbook(template, controls, { selectedFamilyCodes: ['IR'] })
  const filteredParsed = await importer.parseAssessmentWorkbook(await filtered.workbook.generateAsync({ type: 'nodebuffer' }), controls)
  assert.equal(filteredParsed.objectiveData[ac.id][first.id].interviews, '', 'unselected family remains blank even with shared staff')
  assert.match(filteredParsed.objectiveData[ir.id][ir.objectives[0].id].interviews, /John S\./)
  assert.equal(interview.formatInterviewExport(...args, { interviews: interviewText }), interviewText, 'names not duplicated')
  const malformed = 'Yes, implemented. Wrong finding format.'
  parsed.objectiveData[ac.id][first.id].findings = malformed
  parsed.objectiveData[ac.id][ac.objectives[1].id].findings = ''
  const standardBefore = parsed.objectiveData[ac.id][ac.objectives[2].id].findings
  const summary = importer.applyWorkbookImport(parsed, controls, 'new')
  assert.equal(summary.findingsReformatted, 1)
  assert.equal(summary.findingsCreated, 1)
  assert.equal(findings.readObjectiveFinding(...args).replacedImportedText, malformed)
  assert.ok(auto.matchesStandardFinding(findings.readObjectiveFinding(...args), ac, first))
  assert.equal(findings.readObjectiveFinding(ac.id, ac.objectives[2].id).finalText, standardBefore)
  assert.equal(osc.readProviderStandardsAcceptance('Example CSP'), 'FedRAMP High', 'FedRAMP restored from Excel')
  assert.equal(osc.readProviderStandardsAcceptance('Example MSP'), 'DIBCAC High')
  assert.equal(results.readObjectiveResult(...args).interviews, interviewText)
  assert.deepEqual(artifacts.readObjectiveArtifacts(...args), ['Policy & Procedures', 'Device Inventory'])
  const replacementBackup = JSON.parse(JSON.stringify(project.exportProjectState(controls)))
  project.wipeProjectState()
  project.importProjectState(replacementBackup, controls)
  assert.equal(findings.readObjectiveFinding(...args).replacedImportedText, malformed, 'original replaced text survives backup/restore')
  findings.writeObjectiveFinding(...args, { finalText: 'Existing locally reviewed statement' })
  importer.applyWorkbookImport(parsed, controls, 'merge')
  assert.equal(findings.readObjectiveFinding(...args).finalText, 'Existing locally reviewed statement', 'merge preserves local findings')

  // Every real objective, repeat MET, then selective clear; exercises the full assessment.
  const started = performance.now()
  bulk.bulkSetControlStatus(controls, 'MET')
  bulk.bulkSetControlStatus(controls, 'MET')
  bulk.clearSelectedControlFields(controls, ['test', 'examine'])
  for (const control of controls) for (const objective of control.objectives) {
    assert.equal(status.readObjectiveStatus(control.id, objective.id), 'MET')
    assert.ok(findings.readObjectiveFinding(control.id, objective.id)?.finalText)
  }
  console.log(`Assessment workflow checks passed: bulk MET, selective clearing, staff, tags, warning repairs, provider/FedRAMP Excel round trip, finding replacement/preservation, JSON restore; full ${controls.length}-control sweep in ${(performance.now() - started).toFixed(0)}ms.`)
} finally {
  await vite.close()
}
