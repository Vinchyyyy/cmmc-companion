import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

const memory = new Map()
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key), key: (index) => [...memory.keys()][index] ?? null,
  get length() { return memory.size },
}
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
try {
  const load = (name) => vite.ssrLoadModule(`/src/utils/${name}.js`)
  const { default: controls } = await vite.ssrLoadModule('/src/data/controls/index.js')
  const { EXCEL_EXPORT_COLUMNS, highestAcceptanceStandard, formatProviderList, parseProviderList } = await load('excelExportOptions')
  const { buildCmmcTemplateWorkbook } = await load('exportCmmcTemplate')
  const { parseAssessmentWorkbook, applyWorkbookImport } = await load('importAssessmentWorkbook')
  const { writeOscProfile, readProviderStandardsAcceptance } = await load('oscProfile')
  const { writeInheritance, writeInheritanceSources, readInheritanceSources } = await load('inheritance')
  const { writeObjectiveResult } = await load('objectiveResults')
  const { writeObjectiveInterviewedRoles } = await load('objectiveInterviewedRoles')
  const { writeObjectiveNote } = await load('objectiveNotes')
  const { formatInterviewNotesExport } = await load('interviewExport')
  const { writeObjectiveArtifacts } = await load('objectiveArtifacts')
  const { writeObjectiveStatus } = await load('objectiveStatus')
  const { ensureMetObjectiveFinding } = await load('autoObjectiveFinding')
  const { writeDateAssessed } = await load('dateAssessed')
  const { collectExportWarnings } = await load('exportPreflight')
  const c = controls.find((item) => item.id === 'AC.L1-3.1.1')
  const providers = [
    { name: 'CrowdStrike Falcon', standardsAcceptance: 'FedRAMP Moderate' },
    { name: 'Company, Inc. $& "Cloud"', standardsAcceptance: 'FedRAMP High' },
    { name: 'Microsoft Intune', standardsAcceptance: 'FedRAMP Moderate' },
  ]
  writeOscProfile({ providers })
  writeInheritance(c.id, 'Partial')
  writeInheritanceSources(c.id, providers.map((item) => item.name))
  writeObjectiveResult(c.id, 'a', { interviews: 'Interview notes', examine: 'Examined policy', test: 'Testing record', overallComments: 'PRIVATE OMITTED COMMENTS' })
  writeObjectiveArtifacts(c.id, 'a', ['Evidence $& <one>'])
  writeObjectiveStatus(c.id, 'a', 'MET')
  writeDateAssessed(c.id, '2026-10-15')
  ensureMetObjectiveFinding(c, c.objectives[0])
  assert.equal(highestAcceptanceStandard(['FedRAMP Moderate', 'FedRAMP Moderate']), 'FedRAMP Moderate')
  assert.equal(highestAcceptanceStandard(['FedRAMP Moderate', 'DIBCAC High']), 'DIBCAC High')
  assert.equal(highestAcceptanceStandard(['', 'invalid']), '')
  const names = providers.map((item) => item.name)
  assert.deepEqual(parseProviderList(formatProviderList(names)), names)
  assert.deepEqual(parseProviderList('Provider One\nProvider Two'), ['Provider One', 'Provider Two'])
  const template = readFileSync(new URL('../public/templates/CMMC_Level2_AssessmentResults_Template.xlsx', import.meta.url))
  const originalZip = await JSZip.loadAsync(template)
  const originalXml = await originalZip.file('xl/worksheets/sheet3.xml').async('string')
  const exportWorkbook = async (options = {}) => {
    const { workbook } = await buildCmmcTemplateWorkbook(template, controls, options)
    const bytes = await workbook.generateAsync({ type: 'nodebuffer' })
    const parsed = await parseAssessmentWorkbook(bytes, controls)
    assert.equal(parsed.ok, true)
    const excel = XLSX.read(bytes, { type: 'buffer' })
    return { workbook, parsed, sheet: excel.Sheets['Requirement Objectives'] }
  }
  const beforeExport = [...memory.entries()]
  const full = await exportWorkbook()
  assert.equal(full.sheet.J6.v, 'FedRAMP High', 'one highest standard, with no repeats')
  assert.equal(full.sheet.L6.v, formatProviderList(names), 'provider names are separated with commas and quoted when needed')
  assert.match(full.sheet.D6.v, /Evidence \$& <one>/, 'replacement characters remain literal')
  assert.equal(full.sheet.H6.v, 'PRIVATE OMITTED COMMENTS')
  const savedBeforeInterviewCases = [...memory.entries()]
  try {
    writeObjectiveInterviewedRoles(c.id, 'a', ['Alice — Administrator', 'Bob — Security Officer'])
    writeObjectiveNote(c.id, 'a', 'LEGACY OVERALL NOTE')
    writeObjectiveResult(c.id, 'a', {
      interviews: 'Interview narrative $& <observed>', overallComments: 'ORIGINAL COMMENTS',
      checklistInterviewNotes: { sample: { label: 'Access review', note: 'DIBCAC interview observation' } },
    })
    const snapshot = [...memory.entries()]
    const replacement = await exportWorkbook({ overallCommentsFromInterviewNotes: true })
    assert.equal(replacement.sheet.H6.v, 'Interview narrative $& <observed>\n\nDIBCAC interview observation')
    assert.match(replacement.sheet.E6.v, /Alice — Administrator/)
    assert.match(replacement.sheet.E6.v, /Bob — Security Officer/)
    assert(!replacement.sheet.H6.v.includes('Alice'))
    assert(!replacement.sheet.H6.v.includes('ORIGINAL COMMENTS'))
    assert(!replacement.sheet.H6.v.includes('LEGACY OVERALL NOTE'))
    assert.equal(replacement.parsed.objectiveData[c.id].a.overallComments, replacement.sheet.H6.v)
    assert.deepEqual([...memory.entries()], snapshot, 'replacement is export-only')
    assert.equal((await exportWorkbook()).sheet.H6.v, 'ORIGINAL COMMENTS\n\nLEGACY OVERALL NOTE', 'default comments unchanged')
    const noInterviewColumn = await exportWorkbook({ overallCommentsFromInterviewNotes: true, omittedColumns: ['interviews'] })
    assert.equal(noInterviewColumn.sheet.E6.v, 'Alice — Administrator\nBob — Security Officer', 'unchecked Interviews keeps names only')
    assert.equal(noInterviewColumn.sheet.H6.v, replacement.sheet.H6.v)
    const namesOnly = await exportWorkbook({ omittedColumns: ['interviews'] })
    assert.equal(namesOnly.sheet.E6.v, 'Alice — Administrator\nBob — Security Officer')
    assert.equal(namesOnly.sheet.H6.v, 'ORIGINAL COMMENTS\n\nLEGACY OVERALL NOTE')
    const allBlankWithNames = await exportWorkbook({ omittedColumns: EXCEL_EXPORT_COLUMNS.map(({ key }) => key) })
    assert.equal(allBlankWithNames.sheet.E6.v, 'Alice — Administrator\nBob — Security Officer', 'names survive all columns being unchecked')
    for (const { key, column } of EXCEL_EXPORT_COLUMNS) if (key !== 'interviews') assert.ok(!allBlankWithNames.sheet[`${column}6`]?.v)
    assert.ok(!(await exportWorkbook({ overallCommentsFromInterviewNotes: true, omittedColumns: ['overallComments'] })).sheet.H6?.v)
    const excluded = await exportWorkbook({ overallCommentsFromInterviewNotes: true, selectedFamilyCodes: ['IA'] })
    assert.ok(!excluded.sheet.H6?.v, 'family selection remains effective')
    writeObjectiveResult(c.id, 'a', { interviews: 'Alice — Administrator\r\nBob — Security Officer\r\n\r\nRe-imported interview text', overallComments: 'OLD' })
    assert.equal((await exportWorkbook({ overallCommentsFromInterviewNotes: true })).sheet.H6.v, 'Re-imported interview text')
    assert.equal(formatInterviewNotesExport(c.id, 'a', { interviews: 'Alice — Administrator reviewed the console.' }), 'Alice — Administrator reviewed the console.', 'do not redact narrative text')
    writeObjectiveResult(c.id, 'a', { interviews: 'Alice — Administrator\nBob — Security Officer', overallComments: 'OLD' })
    assert.ok(!(await exportWorkbook({ overallCommentsFromInterviewNotes: true })).sheet.H6?.v, 'participant-only interview produces blank comments')
    writeObjectiveResult(c.id, 'a', { overallComments: 'ORIGINAL COMMENTS' })
    assert.ok(!(await exportWorkbook({ overallCommentsFromInterviewNotes: true })).sheet.H6?.v, 'no interview means no fallback to original comments')
    writeObjectiveResult(c.id, 'a', { interviews: 'Short interview', overallComments: 'x'.repeat(4500) })
    assert(!collectExportWarnings([c], { overallCommentsFromInterviewNotes: true, omittedColumns: ['interviews'] }).some((w) => w.kind === 'length' && w.text.startsWith('Overall comments')))
    writeObjectiveResult(c.id, 'a', { interviews: 'n'.repeat(4500) })
    assert(collectExportWarnings([c], { overallCommentsFromInterviewNotes: true, omittedColumns: ['interviews'] }).some((w) => w.kind === 'length' && w.text.startsWith('Overall comments')))
    assert.equal((await exportWorkbook({ overallCommentsFromInterviewNotes: true })).sheet.H6.v.length, 4000)
  } finally {
    memory.clear()
    for (const [key, value] of savedBeforeInterviewCases) memory.set(key, value)
  }
  const omitted = await exportWorkbook({ omittedColumns: ['overallComments', 'test'] })
  assert.ok(!omitted.sheet.H6?.v)
  assert.ok(!omitted.sheet.G6?.v)
  assert.equal(omitted.sheet.F6.v, 'Examined policy')
  assert.equal(omitted.sheet.P6.v, full.sheet.P6.v, 'Findings is an independently selectable column')
  assert.equal(omitted.parsed.objectiveData[c.id].a.overallComments, '')
  for (const { key, column } of EXCEL_EXPORT_COLUMNS) {
    const one = await exportWorkbook({ omittedColumns: [key] })
    assert.ok(!one.sheet[`${column}6`]?.v, `${key} is blank when omitted`)
    assert.equal(one.sheet[`${column}5`]?.v, full.sheet[`${column}5`]?.v, `${key} heading remains in place`)
  }
  const all = await exportWorkbook({ omittedColumns: EXCEL_EXPORT_COLUMNS.map((item) => item.key) })
  for (const { column } of EXCEL_EXPORT_COLUMNS) assert.ok(!all.sheet[`${column}6`]?.v)
  assert.ok(all.sheet.B6.v, 'objective reference remains')
  const allXml = await all.workbook.file('xl/worksheets/sheet3.xml').async('string')
  assert.deepEqual([...allXml.matchAll(/<row r="([1-5])"[^>]*>[\s\S]*?<\/row>/g)].map((item) => item[0]), [...originalXml.matchAll(/<row r="([1-5])"[^>]*>[\s\S]*?<\/row>/g)].map((item) => item[0]), 'template headers are byte-for-byte unchanged')
  for (const [path, entry] of Object.entries(originalZip.files)) {
    if (entry.dir || ['xl/worksheets/sheet3.xml', 'docProps/custom.xml'].includes(path)) continue
    assert.deepEqual(await full.workbook.file(path).async('nodebuffer'), await entry.async('nodebuffer'), `${path} remains unchanged`)
  }
  assert.ok(!(await all.workbook.file('docProps/custom.xml').async('string')).includes('CMMCCompanionProviderStandards'), 'omitted provider data is not retained in metadata')
  assert.deepEqual([...memory.entries()], beforeExport, 'export options do not alter saved project data')
  applyWorkbookImport(full.parsed, controls, 'new')
  assert.deepEqual(readInheritanceSources(c.id), names)
  for (const provider of providers) assert.equal(readProviderStandardsAcceptance(provider.name), provider.standardsAcceptance, 'Excel re-import restores each original provider standard')
  assert.equal((await exportWorkbook()).sheet.J6.v, 'FedRAMP High')
  // A user editing the visible cell invalidates the saved mapping.
  const editZip = full.workbook
  editZip.file('xl/worksheets/sheet3.xml', (await editZip.file('xl/worksheets/sheet3.xml').async('string')).replaceAll('FedRAMP High', 'FedRAMP Moderate'))
  const edited = await parseAssessmentWorkbook(await editZip.generateAsync({ type: 'nodebuffer' }), controls)
  assert.equal(edited.controlData[c.id].providerStandards, undefined)
  const warnings = collectExportWarnings([c], { omittedColumns: ['artifacts', 'findingText', 'examine', 'interviews'] })
  assert.ok(!warnings.some((item) => ['untagged', 'missingFinding', 'examine', 'interview', 'roles'].includes(item.kind)))
  console.log('Excel options passed: highest standards, comma-separated/quoted providers, accurate provider re-import, each omitted column and all blank, unchanged headings/template, independent Findings, literal XML/replacement characters, no saved-data mutations, edited-cell metadata invalidation, and interview-only Overall Comments including name-block removal, blank notes, preflight lengths, and truncation.')
} finally { await vite.close() }
