import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'

const memory = new Map()
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
}

const {
  createDibcacTemplateFromCurrent,
  deleteCustomDibcacTemplate,
  extractDibcacTemplate,
  getBuiltInDibcacTemplate,
  instantiateDibcacTemplate,
  readCustomDibcacTemplates,
  saveCustomDibcacTemplate,
  templateStats,
} = await import('../src/utils/dibcacTemplates.js')

const builtIn = await getBuiltInDibcacTemplate()
assert.equal(builtIn.name, 'Default — Complete DIBCAC Baseline')
assert.equal(builtIn.builtIn, true)
assert.deepEqual(templateStats(builtIn), {
  folders: 8,
  groups: 28,
  objectiveAssignments: 477,
  uniqueObjectives: 320,
  checklistItems: 316,
})
assert.ok(builtIn.groups.every((group) => group.checklist.every((entry) => entry.type !== 'item' || entry.checked === false)))

const sampleGroups = [{
  id: 'group-one',
  name: 'Access Control Review',
  folderId: 'folder-one',
  plannedAsk: 'Show how access is approved.',
  comment: 'Assessment-specific comment that must not travel.',
  status: 'MET',
  objectives: [{ key: 'AC.L1-3.1.1::a', controlId: 'AC.L1-3.1.1', objId: 'a', objText: 'Authorized access is limited.', standard: 'CMMC' }],
  checklist: [{ id: 'question-one', type: 'item', text: 'Inspect the approval record.', objKeys: ['AC.L1-3.1.1::a'], checked: true }],
}]
const sampleFolders = [{ id: 'folder-one', name: 'Access Control', comment: 'Do not retain.' }]
const custom = createDibcacTemplateFromCurrent('Reusable AC', sampleGroups, sampleFolders)
assert.equal(custom.groups[0].checklist[0].checked, false)
assert.equal('comment' in custom.groups[0], false)
assert.equal('status' in custom.groups[0], false)
assert.deepEqual(custom.folders[0], { id: 'folder-one', name: 'Access Control' })

const instantiated = instantiateDibcacTemplate(custom)
assert.notEqual(instantiated.groups[0].id, custom.groups[0].id)
assert.notEqual(instantiated.folders[0].id, custom.folders[0].id)
assert.equal(instantiated.groups[0].folderId, instantiated.folders[0].id)
assert.equal(instantiated.groups[0].checklist[0].checked, false)
assert.equal(instantiated.groups[0].plannedAsk, sampleGroups[0].plannedAsk)

saveCustomDibcacTemplate(custom)
assert.equal(readCustomDibcacTemplates().length, 1)
assert.equal(readCustomDibcacTemplates()[0].name, 'Reusable AC')
deleteCustomDibcacTemplate(custom.id)
assert.equal(readCustomDibcacTemplates().length, 0)

const dedicated = extractDibcacTemplate(custom)
assert.equal(dedicated.ok, true)
assert.equal(dedicated.source, 'template')

const projectBackup = extractDibcacTemplate({
  schemaVersion: 8,
  projectMeta: { oscName: 'Example OSC' },
  reviewFolders: sampleFolders,
  reviewGroups: sampleGroups,
  controls: [{ id: 'must-not-import' }],
  findings: [{ id: 'must-not-import' }],
  overallComments: 'must not import',
}, 'Backup')
assert.equal(projectBackup.ok, true)
assert.equal(projectBackup.source, 'project-backup')
assert.equal(projectBackup.template.groups.length, 1)
assert.equal('controls' in projectBackup.template, false)
assert.equal('findings' in projectBackup.template, false)
assert.equal('overallComments' in projectBackup.template, false)
assert.equal(projectBackup.template.groups[0].checklist[0].checked, false)

assert.equal(extractDibcacTemplate({ controls: [] }).ok, false)
assert.equal(extractDibcacTemplate({ groups: [] }).ok, false)

const started = performance.now()
for (let index = 0; index < 250; index += 1) {
  const copy = instantiateDibcacTemplate(builtIn)
  assert.equal(copy.groups.length, 28)
  assert.equal(copy.folders.length, 8)
}
const elapsed = performance.now() - started
assert.ok(elapsed < 5000, `250 full-template instantiations took ${elapsed.toFixed(0)}ms`)

console.log(`DIBCAC template tests passed (250 full-template copies in ${elapsed.toFixed(0)}ms).`)
