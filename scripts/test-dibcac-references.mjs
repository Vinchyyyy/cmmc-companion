import assert from 'node:assert/strict'
import {
  buildChecklistReferenceIndex,
  buildGroupNumberMap,
  insertPlannedAskReference,
  normalizePlannedAskContent,
  plannedAskFallbackText,
  renderPlannedAskText,
  resolveChecklistNavigationTarget,
  searchChecklistReferences,
  updatePlannedAskContent,
  withCanonicalGroupOrder,
} from '../src/utils/dibcacReferences.js'

const groups = Array.from({ length: 12 }, (_, groupIndex) => ({
  id: `group-${groupIndex + 1}`,
  name: groupIndex === 0 ? 'Identity and MFA' : `Group ${groupIndex + 1}`,
  checklist: groupIndex === 11
    ? [
        ...Array.from({ length: 9 }, (_, index) => ({ id: `h-${index + 1}`, type: 'header', text: `Header ${index + 1}` })),
        { id: 'h-10', type: 'header', text: 'Header 10' },
        ...Array.from({ length: 5 }, (_, index) => ({ id: `double-${index + 1}`, type: 'item', text: `Double item ${index + 1}` })),
      ]
    : [
        { id: `header-${groupIndex}`, type: 'header', text: 'Authentication' },
        { id: `item-${groupIndex}-a`, type: 'item', text: groupIndex === 0 ? 'MFA configuration covers required access cases' : `Item A ${groupIndex}` },
        { id: `item-${groupIndex}-b`, type: 'item', text: `Item B ${groupIndex}` },
      ],
}))

const canonical = withCanonicalGroupOrder(groups)
const index = buildChecklistReferenceIndex(canonical)
assert.equal(buildGroupNumberMap(canonical).get('group-1'), 1)
assert.equal(index.find((entry) => entry.itemId === 'item-0-a').displayRef, 'G1-1.1')
assert.equal(index.find((entry) => entry.itemId === 'double-5').displayRef, 'G12-10.5')

// Temporary presentation sorting does not mutate the canonical source/index.
const alphabetizedCopy = [...canonical].reverse()
assert.notEqual(alphabetizedCopy[0].id, canonical[0].id)
assert.equal(buildChecklistReferenceIndex(canonical).find((entry) => entry.itemId === 'item-0-a').displayRef, 'G1-1.1')

const reorderedChecklist = canonical.map((group) => group.id === 'group-1'
  ? { ...group, checklist: [group.checklist[0], group.checklist[2], group.checklist[1]] }
  : group)
const reorderedIndex = buildChecklistReferenceIndex(reorderedChecklist)
const sameTarget = reorderedIndex.find((entry) => entry.itemId === 'item-0-a')
assert.equal(sameTarget.displayRef, 'G1-1.2')
assert.equal(sameTarget.groupId, 'group-1')
assert.equal(sameTarget.itemId, 'item-0-a')

assert.equal(searchChecklistReferences(index, 'MFA')[0].itemId, 'item-0-a')
assert.equal(searchChecklistReferences(index, 'Identity')[0].itemId, 'item-0-a')
assert.equal(searchChecklistReferences(index, 'G1-1.1')[0].itemId, 'item-0-a')

const reference = index.find((entry) => entry.itemId === 'item-0-a')
const navigableGroups = canonical.map((group) => group.id === 'group-1' ? { ...group, folderId: 'folder-auth' } : group)
assert.deepEqual(resolveChecklistNavigationTarget(navigableGroups, index, 'group-1', 'item-0-a'), {
  groupId: 'group-1',
  itemId: 'item-0-a',
  folderId: 'folder-auth',
  displayRef: 'G1-1.1',
})
assert.equal(resolveChecklistNavigationTarget(canonical, index, 'missing', 'item-0-a'), null)
assert.equal(resolveChecklistNavigationTarget(canonical, index, 'group-1', 'missing'), null)
const inserted = insertPlannedAskReference([{ type: 'text', text: 'Show ' }], 5, 5, reference, index)
assert.deepEqual(inserted.content[1], { type: 'checklistRef', groupId: 'group-1', itemId: 'item-0-a' })
assert.equal(renderPlannedAskText(inserted.content, index), 'Show @G1-1.1')
assert.match(plannedAskFallbackText(inserted.content, index), /G1-1\.1 — MFA configuration/)

const editedBefore = updatePlannedAskContent(inserted.content, 'Please Show @G1-1.1', index)
assert.equal(editedBefore.some((segment) => segment.type === 'checklistRef'), true)
const editedReference = updatePlannedAskContent(inserted.content, 'Show @changed', index)
assert.equal(editedReference.some((segment) => segment.type === 'checklistRef'), false)

assert.deepEqual(normalizePlannedAskContent(null, 'Legacy plain text'), [{ type: 'text', text: 'Legacy plain text' }])
assert.equal(renderPlannedAskText([{ type: 'checklistRef', groupId: 'missing', itemId: 'missing' }], index), '@Missing checklist reference')

console.log('DIBCAC reference tests passed: canonical G numbering, reorder stability, search, navigation resolution, structured insertion/editing, legacy text, missing targets, and double digits.')
