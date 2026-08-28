import assert from 'node:assert/strict'
import { createServer } from 'vite'

const memory = new Map()
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })

try {
  const { exportProjectState, importProjectState, SCHEMA_VERSION } = await vite.ssrLoadModule('/src/utils/projectState.js')
  const { getReviewGroups, getReviewFolders, saveReviewGroups, saveReviewFolders } = await vite.ssrLoadModule('/src/utils/reviewGroups.js')
  const { readObjectiveResult, writeObjectiveResult } = await vite.ssrLoadModule('/src/utils/objectiveResults.js')
  const { readCustomDibcacTemplates, writeCustomDibcacTemplates } = await vite.ssrLoadModule('/src/utils/dibcacTemplates.js')

  const controls = [{
    id: 'AC.L1-3.1.1',
    objectives: [
      { id: 'a', text: 'authorized users are identified;' },
      { id: 'b', text: 'processes acting on behalf of authorized users are identified;' },
    ],
  }]
  const folders = [{ id: 'folder-auth', name: 'Authentication', createdAt: '2026-01-01T00:00:00.000Z' }]
  const groups = [
    {
      id: 'group-primary',
      name: 'Primary Review',
      folderId: 'folder-auth',
      plannedAsk: 'Show authentication controls.',
      objectives: [{ key: 'AC.L1-3.1.1[a]', controlId: 'AC.L1-3.1.1', objId: 'a', objText: controls[0].objectives[0].text, standard: 'screen_share' }],
      checklist: [
        { id: 'header-users', type: 'header', text: 'User authentication' },
        { id: 'item-mfa', type: 'item', text: 'MFA shown and explained', objKeys: ['AC.L1-3.1.1[a]'], checked: true, interviewNote: 'MFA was demonstrated live.' },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'group-destination',
      name: 'Destination Review',
      folderId: null,
      plannedAsk: '',
      objectives: [{ key: 'AC.L1-3.1.1[b]', controlId: 'AC.L1-3.1.1', objId: 'b', objText: controls[0].objectives[1].text, standard: 'document' }],
      checklist: [],
      createdAt: '2026-01-02T00:00:00.000Z',
    },
  ]
  const templates = [{
    id: 'template-auth',
    kind: 'cmmc-dibcac-template',
    templateSchemaVersion: 1,
    name: 'Authentication Template',
    folders,
    groups,
  }]

  saveReviewFolders(folders)
  saveReviewGroups(groups)
  writeCustomDibcacTemplates(templates)
  writeObjectiveResult('AC.L1-3.1.1', 'a', {
    interviews: 'Manual objective interview text.',
    checklistInterviewNotes: {
      'group-primary:item-mfa': { label: 'Primary Review — MFA shown and explained', note: 'MFA was demonstrated live.' },
    },
  })

  const exported = exportProjectState(controls)
  assert.equal(SCHEMA_VERSION, 9)
  assert.deepEqual(exported.reviewGroups, groups)
  assert.deepEqual(exported.reviewFolders, folders)
  assert.equal(exported.controls[0].objectiveResults.a.interviews, 'Manual objective interview text.')
  assert.equal(exported.controls[0].objectiveResults.a.checklistInterviewNotes['group-primary:item-mfa'].note, 'MFA was demonstrated live.')
  assert.equal(exported.dibcacTemplates[0].groups[0].checklist[1].checked, false)
  assert.equal('interviewNote' in exported.dibcacTemplates[0].groups[0].checklist[1], false)

  memory.clear()
  const imported = importProjectState(exported, controls)
  assert.equal(imported.ok, true)
  assert.deepEqual(getReviewGroups(), groups)
  assert.deepEqual(getReviewFolders(), folders)
  assert.equal(readCustomDibcacTemplates()[0].name, 'Authentication Template')
  const restoredResult = readObjectiveResult('AC.L1-3.1.1', 'a')
  assert.equal(restoredResult.interviews, 'Manual objective interview text.')
  assert.equal(restoredResult.checklistInterviewNotes['group-primary:item-mfa'].note, 'MFA was demonstrated live.')

  console.log('Full-project DIBCAC JSON round-trip passed: groups, folders, assignments, checklist structure, notes, and templates restored.')
} finally {
  await vite.close()
}
