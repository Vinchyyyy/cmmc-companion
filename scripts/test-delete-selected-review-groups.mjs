import assert from 'node:assert/strict'
import { createServer } from 'vite'
const memory = new Map()
globalThis.localStorage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: (k) => memory.delete(k) }
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
try {
  const { deleteSelectedReviewGroups } = await vite.ssrLoadModule('/src/utils/deleteSelectedReviewGroups.js')
  const { saveReviewGroups, saveReviewFolders, getReviewGroups, getReviewFolders } = await vite.ssrLoadModule('/src/utils/reviewGroups.js')
  const { syncChecklistInterviewNote } = await vite.ssrLoadModule('/src/utils/checklistInterviewNotes.js')
  const { readObjectiveResult } = await vite.ssrLoadModule('/src/utils/objectiveResults.js')
  const groups = ['one', 'two', 'three'].map((id) => ({ id, name: id, folderId: id === 'two' ? 'folder' : null, objectives: [], checklist: [] }))
  groups[0].checklist = [{ id: 'question', type: 'item', text: 'Users identified', objKeys: ['AC.L1-3.1.1[a]'], interviewNote: 'Observed' }]
  groups[2].plannedAskRichDocument = { version: 1, blocks: [{ type: 'paragraph', indent: 0, children: [{ type: 'checklistRef', groupId: 'one', itemId: 'question' }] }] }
  saveReviewFolders([{ id: 'folder', name: 'Keep folder' }])
  saveReviewGroups(groups)
  syncChecklistInterviewNote(groups[0], groups[0].checklist[0], 'Observed')
  const before = new Map(memory)
  let prompt = ''
  assert.equal(deleteSelectedReviewGroups(['one', 'two'], (message) => { prompt = message; return false }), null)
  assert.match(prompt, /delete 2 review groups/)
  assert.match(prompt, /1 Planned Ask reference/)
  assert.deepEqual(memory, before)
  const result = deleteSelectedReviewGroups(['one', 'two', 'one', 'missing'], () => true)
  assert.equal(result.count, 2)
  assert.deepEqual(getReviewGroups().map((g) => g.id), ['three'])
  assert.equal(getReviewFolders().length, 1)
  assert.deepEqual(readObjectiveResult('AC.L1-3.1.1', 'a').checklistInterviewNotes, {})
  assert.equal(deleteSelectedReviewGroups([], () => { throw new Error('must not confirm empty selection') }), null)
  assert.equal(deleteSelectedReviewGroups(['missing'], () => { throw new Error('must not confirm missing targets') }), null)
  assert.equal(deleteSelectedReviewGroups(['three'], (message) => { assert.match(message, /delete 1 review group\?/); return true }).count, 1)
  assert.deepEqual(getReviewGroups(), [])
  assert.equal(getReviewFolders().length, 1)
  console.log('Bulk group deletion passed: confirmation count/cancel, folders, selected targets, reference warnings, linked-note cleanup, and empty/stale selections.')
} finally { await vite.close() }
