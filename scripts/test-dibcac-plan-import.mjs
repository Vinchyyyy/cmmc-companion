import assert from 'node:assert/strict'
import { createServer } from 'vite'

const memory = new Map()
const storage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
}
globalThis.localStorage = storage
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
const clone = (value) => JSON.parse(JSON.stringify(value))
try {
  const { prepareDibcacPlan, exportDibcacPlan, objectiveCatalog } = await vite.ssrLoadModule('/src/utils/dibcacPlanImport.js')
  const { exampleDibcacPlan, buildDibcacImportInstructions } = await vite.ssrLoadModule('/src/utils/dibcacImportInstructions.js')
  const { getReviewGroups, getReviewFolders, commitReviewPlan, saveReviewGroups } = await vite.ssrLoadModule('/src/utils/reviewGroups.js')
  const { exportProjectState, importProjectState } = await vite.ssrLoadModule('/src/utils/projectState.js')
  const { buildChecklistReferenceIndex } = await vite.ssrLoadModule('/src/utils/dibcacReferences.js')
  const { isRichBlockComplete, richDocumentToEditorHtml } = await vite.ssrLoadModule('/src/utils/dibcacRichText.js')
  const { default: controls } = await vite.ssrLoadModule('/src/data/controls/index.js')
  memory.set('unrelated-assessment-data', 'keep this')
  const plan = prepareDibcacPlan(clone(exampleDibcacPlan))
  assert.equal(plan.summary.length, 2)
  assert.equal(plan.groups[0].plannedAskRichDocument.blocks[0].type, 'topic')
  assert.equal(plan.groups[0].plannedAskRichDocument.blocks[2].indent, 1)
  assert.equal(plan.groups[0].plannedAskRichDocument.blocks[2].children.at(-1).groupId, plan.groups[1].id)
  assert.equal(plan.groups[1].plannedAskRichDocument.blocks[2].children.at(-1).itemId, plan.groups[0].checklist[1].id)
  assert.notEqual(plan.groups[0].id, exampleDibcacPlan.groups[0].id)
  const saved = commitReviewPlan(plan)
  assert.equal(memory.get('unrelated-assessment-data'), 'keep this')
  assert.deepEqual([...memory.keys()].sort(), ['cmmc-companion-dibcac-review-folders', 'cmmc-companion-dibcac-review-groups', 'unrelated-assessment-data'].sort())
  const firstGroup = saved.groups[0]
  firstGroup.checklist[1].checked = true
  firstGroup.checklist[1].interviewNote = 'Existing interview note'
  saveReviewGroups(saved.groups)
  const current = getReviewGroups()
  const exported = exportDibcacPlan(current, saved.folders)
  assert.equal(exported.groups[0].checklist[1].checked, undefined)
  assert.equal(exported.groups[0].checklist[1].interviewNote, undefined)
  exported.groups[0].name = 'Revised identity'
  const update = prepareDibcacPlan(exported, current, saved.folders, 'update')
  assert.equal(update.groups[0].id, firstGroup.id)
  assert.equal(update.groups[0].checklist[1].checked, true)
  assert.equal(update.groups[0].checklist[1].interviewNote, 'Existing interview note')
  assert.equal(update.summary[0].action, 'Update')
  commitReviewPlan(update)
  const completedIndex = buildChecklistReferenceIndex(update.groups)
  assert.equal(isRichBlockComplete(update.groups[0].plannedAskRichDocument.blocks[1], completedIndex), true)
  assert.match(richDocumentToEditorHtml(update.groups[1].plannedAskRichDocument, completedIndex), /data-color="blue"/)

  const secondCopy = prepareDibcacPlan(exportDibcacPlan(getReviewGroups(), getReviewFolders()), getReviewGroups(), getReviewFolders())
  assert.equal(secondCopy.groups.length, 4)
  assert.match(secondCopy.groups[2].name, /\(2\)$/)
  assert.equal(secondCopy.groups[2].checklist[1].checked, false)
  assert.equal(secondCopy.groups[2].checklist[1].interviewNote, undefined)
  const beforeInvalid = new Map(memory)
  const invalid = (mutate, pattern = /./) => {
    const value = clone(exampleDibcacPlan)
    mutate(value)
    assert.throws(() => prepareDibcacPlan(value), pattern)
    assert.deepEqual(memory, beforeInvalid)
  }
  invalid((v) => { v.version = 99 }, /version/)
  invalid((v) => { v.statuses = {} }, /unsupported/)
  invalid((v) => { v.groups[0].objectives = ['AC.L1-3.1.1[z]'] }, /unknown objective/)
  invalid((v) => { v.groups[0].checklist[1].checked = true }, /unsupported/)
  invalid((v) => { v.groups[0].id = v.groups[1].id }, /duplicate/)
  invalid((v) => { v.groups[1].checklist[0].id = v.groups[0].checklist[0].id }, /duplicate/)
  invalid((v) => { v.groups[0].folderId = 'missing' }, /folder/)
  invalid((v) => { v.groups[0].plannedAsk = '@G9-1.1' }, /unresolved/)
  invalid((v) => { v.groups[0].plannedAsk = '@G1-1.1.2' }, /malformed/)
  invalid((v) => { v.groups[0].plannedAsk = '@G1-1.1wrong' }, /malformed/)
  invalid((v) => { v.groups[0].plannedAsk = '@G1-1' }, /unresolved/)
  invalid((v) => { v.groups[1].plannedAskRichDocument.blocks[1].children[1].itemId = 'missing' }, /unresolved/)
  invalid((v) => { v.groups[1].plannedAskRichDocument.blocks[1].children[0].color = '#123456' }, /color/)
  invalid((v) => { v.groups[1].plannedAskRichDocument.blocks[1].children[0].text = '@G1-1.1' }, /checklistRef/)
  invalid((v) => { v.groups[1].plannedAskRichDocument.blocks[1].indent = 5 }, /indent/)
  invalid((v) => { v.groups[1].plannedAsk = 'Conflicting plain text' }, /not both/)
  invalid((v) => { v.groups[0].plannedAsk = '   - odd indentation' }, /two spaces/)
  // Regression: ordinary prose mentioning "@G4" (no "-N" item suffix, so not
  // an attempted checklist-reference token) must not block the whole import
  // by being misread as a malformed reference.
  const plainMention = clone(exampleDibcacPlan)
  plainMention.groups[0].plannedAsk = 'Confirm firmware rev @G4 on the switch stack'
  const plainMentionPlan = prepareDibcacPlan(plainMention)
  const plainMentionText = plainMentionPlan.groups[0].plannedAskRichDocument.blocks[0].children.map((c) => c.text ?? '').join('')
  assert.match(plainMentionText, /@G4/, 'a bare "@G4" mention passes through as plain text instead of throwing')
  const now = getReviewGroups()
  const removed = exportDibcacPlan(now, getReviewFolders())
  removed.groups[0].checklist.pop()
  assert.throws(() => prepareDibcacPlan(removed, now, getReviewFolders(), 'update'), /cannot remove/)
  const remapped = exportDibcacPlan(now, getReviewFolders())
  remapped.groups[0].checklist[1].objKeys = []
  assert.throws(() => prepareDibcacPlan(remapped, now, getReviewFolders(), 'update'), /cannot remap/)
  // A partial update can keep a stable reference into an existing group.
  const partial = exportDibcacPlan(now.slice(1), getReviewFolders())
  assert.equal(prepareDibcacPlan(partial, now, getReviewFolders(), 'update').groups.length, 2)
  assert.throws(() => prepareDibcacPlan(partial, now, getReviewFolders(), 'add'), /add mode/)
  // A reference in an untouched group protects its destination from deletion.
  const noNotes = clone(now)
  noNotes[0].checklist[1].checked = false
  delete noNotes[0].checklist[1].interviewNote
  const deleteTarget = exportDibcacPlan(noNotes.slice(0, 1), getReviewFolders())
  deleteTarget.groups[0].checklist.pop()
  deleteTarget.groups[0].plannedAskRichDocument.blocks = []
  assert.throws(() => prepareDibcacPlan(deleteTarget, noNotes, getReviewFolders(), 'update'), /unresolved/)
  // Detect concurrent changes, and prove a second-write failure rolls back folders.
  assert.throws(() => commitReviewPlan(plan), /changed after preview/)
  const quotaPlan = prepareDibcacPlan(exampleDibcacPlan, getReviewGroups(), getReviewFolders())
  const beforeQuota = new Map(memory)
  let calls = 0
  storage.setItem = (key, value) => { if (++calls === 2) throw new Error('quota'); memory.set(key, String(value)) }
  assert.throws(() => commitReviewPlan(quotaPlan), /previous DIBCAC data was restored/)
  assert.deepEqual(memory, beforeQuota)
  storage.setItem = (key, value) => memory.set(key, String(value))
  // Full Settings JSON retains the imported plan AND existing work.
  const beforeBackup = getReviewGroups()
  const backup = clone(exportProjectState(controls))
  memory.clear()
  importProjectState(backup, controls)
  assert.deepEqual(getReviewGroups(), beforeBackup)
  const md = buildDibcacImportInstructions()
  assert.match(md, /Assessment-method guidance/)
  assert.match(md, /canonical home/)
  assert.match(md, /AC.L1-3.1.1\[a\]/)
  assert.doesNotMatch(md, /\bAI\b/)
  const embeddedExample = JSON.parse(md.match(/```json\n([\s\S]*?)\n```/)[1])
  assert.equal(prepareDibcacPlan(embeddedExample).groups.length, 2)
  assert.equal(objectiveCatalog.length, 320)
  const start = performance.now()
  for (let i = 0; i < 150; i++) {
    const roundTrip = prepareDibcacPlan(clone(exportDibcacPlan(plan.groups, plan.folders)))
    assert.equal(roundTrip.groups[0].plannedAskRichDocument.blocks[2].children.at(-1).groupId, roundTrip.groups[1].id)
  }
  console.log(`DIBCAC plan import passed: validation, add/update, cross-links, formatting, note/progress preservation, isolated writes, rollback, full backup, instructions/example, and 150 remapping cycles (${Math.round(performance.now() - start)}ms).`)
} finally { await vite.close() }
