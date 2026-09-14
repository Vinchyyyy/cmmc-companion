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
  const [inheritance, osc, excel, importer, preflight] = await Promise.all(['inheritance', 'oscProfile', 'exportCmmcTemplate', 'importAssessmentWorkbook', 'exportPreflight'].map(load))
  const { default: controls } = await vite.ssrLoadModule('/src/data/controls/index.js')
  const selected = controls.slice(0, 2)
  const template = readFileSync(new URL('../public/templates/CMMC_Level2_AssessmentResults_Template.xlsx', import.meta.url))
  for (const standards of [['', 'FedRAMP High'], ['FedRAMP Moderate', ''], ['DIBCAC High', 'FedRAMP High'], ['', '']]) {
    memory.clear()
    for (const control of selected) {
      inheritance.applyControlInheritance(control, 'Partial', 'Microsoft 365 GCC High', 'add')
      inheritance.applyControlInheritance(control, 'Partial', 'Example ESP', 'add')
    }
    osc.writeOscProfile({ ...osc.readOscProfile(), providers: osc.readOscProfile().providers.map((provider, index) => ({ ...provider, standardsAcceptance: standards[index] })) })
    const warnings = preflight.collectExportWarnings(selected).filter((item) => item.kind === 'provider')
    assert.equal(warnings.length, standards.filter((item) => !item).length)
    for (const warning of warnings) assert.equal(warning.refs.length, 2, 'one provider warning covers both controls')
    const { workbook } = await excel.buildCmmcTemplateWorkbook(template, selected)
    const parsed = await importer.parseAssessmentWorkbook(await workbook.generateAsync({ type: 'nodebuffer' }), selected)
    assert.ok(parsed.ok)
    for (const control of selected) {
      const cell = parsed.controlData[control.id].standardsAcceptance ?? ''
      assert.ok(!cell.includes('Microsoft') && !cell.includes('Example'))
      assert.ok(cell.split('\n').every((value) => !value || osc.STANDARDS_ACCEPTANCE_VALUES.includes(value)))
    }
    memory.clear()
    importer.applyWorkbookImport(parsed, selected, 'new')
    assert.deepEqual(osc.readOscProfile().providers.map((provider) => provider.standardsAcceptance), standards, 'blank and populated standards stay aligned with providers')
    parsed.controlData[selected[0].id].standardsAcceptance = 'Microsoft 365 GCC High: FedRAMP High\nExample ESP: DIBCAC High'
    memory.clear()
    importer.applyWorkbookImport(parsed, [selected[0]], 'new')
    assert.equal(osc.readProviderStandardsAcceptance('Microsoft 365 GCC High'), 'FedRAMP High', 'legacy named standards import')
  }
  console.log('Standards-only Excel export, optional standards roundtrip, legacy import and provider warning grouping passed.')
} finally { await vite.close() }
