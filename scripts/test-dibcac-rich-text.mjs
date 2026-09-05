import assert from 'node:assert/strict'
import {
  buildTopicAnchorIndex,
  countAllPlannedAskReferences,
  isRichBlockComplete,
  normalizePlannedAskRichDocument,
  parseTopicAnchorSyntax,
  remapPlannedAskRichDocument,
  resolveTopicNavigationTarget,
  richDocumentFromLegacy,
  richDocumentPlainText,
  richDocumentToEditorHtml,
  richDocumentToLegacyContent,
  stressCloneRichDocument,
} from '../src/utils/dibcacRichText.js'

assert.equal(parseTopicAnchorSyntax('!REMOTE ACCESS!'), 'REMOTE ACCESS')
assert.equal(parseTopicAnchorSyntax(' ! Identity   Verification ! '), 'Identity Verification')
assert.equal(parseTopicAnchorSyntax('Wow! This is normal punctuation.'), null)
assert.equal(parseTopicAnchorSyntax('!!'), null)
assert.equal(parseTopicAnchorSyntax('!?!'), null)

const referenceIndex = [{
  groupId: 'group-1', itemId: 'item-1', displayRef: 'G1-1.1',
  label: 'Demonstrate MFA', groupName: 'Authentication',
}]

const document = normalizePlannedAskRichDocument({
  version: 1,
  blocks: [
    {
      type: 'paragraph', indent: 0, children: [
        { type: 'text', text: 'Opening ', bold: true, color: 'blue', size: 'large' },
        { type: 'checklistRef', groupId: 'group-1', itemId: 'item-1' },
      ],
    },
    { type: 'bullet', indent: 1, children: [{ type: 'text', text: 'Nested follow-up', color: 'amber' }] },
  ],
})

assert.equal(document.blocks[0].children[0].bold, true)
assert.equal(document.blocks[0].children[0].color, 'blue')
assert.equal(document.blocks[0].children[0].size, 'large')
assert.equal(document.blocks[1].type, 'bullet')
assert.equal(document.blocks[1].indent, 1)
assert.equal(richDocumentPlainText(document, referenceIndex), 'Opening @G1-1.1\n  - Nested follow-up')
assert.match(richDocumentPlainText(document, referenceIndex, true), /G1-1\.1 — Demonstrate MFA/)

const legacy = richDocumentToLegacyContent(document)
assert.deepEqual(legacy.find((node) => node.type === 'checklistRef'), { type: 'checklistRef', groupId: 'group-1', itemId: 'item-1' })
const migrated = richDocumentFromLegacy(legacy)
assert.equal(richDocumentPlainText(migrated, referenceIndex), 'Opening @G1-1.1\n  - Nested follow-up')

const remapped = remapPlannedAskRichDocument(document, new Map([['group-1', 'group-new']]), new Map([['item-1', 'item-new']]))
assert.deepEqual(remapped.blocks[0].children[1], { type: 'checklistRef', groupId: 'group-new', itemId: 'item-new' })
assert.equal(countAllPlannedAskReferences([{ plannedAskRichDocument: document }], 'group-1', 'item-1'), 1)
assert.equal(isRichBlockComplete(document.blocks[0], referenceIndex), false)
assert.equal(isRichBlockComplete(document.blocks[0], referenceIndex.map((entry) => ({ ...entry, checked: true }))), true)
assert.equal(isRichBlockComplete(document.blocks[1], referenceIndex.map((entry) => ({ ...entry, checked: true }))), false)

const twoReferenceBlock = {
  type: 'paragraph', indent: 0, children: [
    { type: 'checklistRef', groupId: 'group-1', itemId: 'item-1' },
    { type: 'text', text: ' and ' },
    { type: 'checklistRef', groupId: 'group-2', itemId: 'item-2' },
  ],
}
assert.equal(isRichBlockComplete(twoReferenceBlock, [
  { ...referenceIndex[0], checked: true },
  { groupId: 'group-2', itemId: 'item-2', checked: false },
]), false)
assert.equal(isRichBlockComplete(twoReferenceBlock, [
  { ...referenceIndex[0], checked: true },
  { groupId: 'group-2', itemId: 'item-2', checked: true },
]), true)

const hostile = normalizePlannedAskRichDocument({ blocks: [{ type: 'bullet', indent: 99, children: [{ type: 'text', text: '<script>alert(1)</script>', color: 'not-real', size: 'huge' }] }] })
assert.equal(hostile.blocks[0].indent, 4)
assert.equal('color' in hostile.blocks[0].children[0], false)
assert.equal('size' in hostile.blocks[0].children[0], false)
const html = richDocumentToEditorHtml(hostile, referenceIndex)
assert.doesNotMatch(html, /<script>/)
assert.match(html, /&lt;script&gt;/)

const stressed = stressCloneRichDocument(document, 1000)
assert.deepEqual(stressed, document)

const topicDocument = normalizePlannedAskRichDocument({
  version: 1,
  blocks: [
    { type: 'topic', topicAnchorId: 'topic-remote', children: [{ type: 'text', text: 'REMOTE ACCESS' }] },
    { type: 'paragraph', children: [{ type: 'text', text: 'Verify ' }, { type: 'checklistRef', groupId: 'group-1', itemId: 'item-1' }] },
    { type: 'topic', topicAnchorId: 'topic-duplicate', children: [{ type: 'text', text: 'REMOTE ACCESS' }] },
  ],
})
const renamedTopicDocument = normalizePlannedAskRichDocument({
  ...topicDocument,
  blocks: topicDocument.blocks.map((block) => block.topicAnchorId === 'topic-remote'
    ? { ...block, children: [{ type: 'text', text: 'REMOTE CONNECTIVITY' }] }
    : block),
})
assert.equal(renamedTopicDocument.blocks[0].topicAnchorId, 'topic-remote')
assert.equal(richDocumentPlainText(topicDocument, referenceIndex), '!REMOTE ACCESS!\nVerify @G1-1.1\n!REMOTE ACCESS!')
assert.deepEqual(richDocumentToLegacyContent(topicDocument).slice(0, 3), [
  { type: 'text', text: '!REMOTE ACCESS!\nVerify ' },
  { type: 'checklistRef', groupId: 'group-1', itemId: 'item-1' },
  { type: 'text', text: '\n!REMOTE ACCESS!' },
])

const groupsWithTopics = [
  { id: 'group-1', name: 'First', folderId: 'folder-1', plannedAskRichDocument: topicDocument },
  { id: 'group-2', name: 'Second', plannedAskRichDocument: { version: 1, blocks: [{ type: 'topic', topicAnchorId: 'topic-second', children: [{ type: 'text', text: 'IDENTITY' }] }] } },
]
const topics = buildTopicAnchorIndex(groupsWithTopics)
assert.deepEqual(topics.map((topic) => topic.topicAnchorId), ['topic-remote', 'topic-duplicate', 'topic-second'])
assert.deepEqual(topics.map((topic) => topic.groupNumber), [1, 1, 2])
assert.deepEqual(topics.map((topic) => topic.groupName), ['First', 'First', 'Second'])
assert.equal(topics.filter((topic) => topic.label === 'REMOTE ACCESS').length, 2)
assert.equal(resolveTopicNavigationTarget(groupsWithTopics, topics, 'group-1', 'topic-duplicate').folderId, 'folder-1')
assert.equal(resolveTopicNavigationTarget([...groupsWithTopics].reverse(), buildTopicAnchorIndex([...groupsWithTopics].reverse()), 'group-1', 'topic-remote').topicAnchorId, 'topic-remote')
assert.equal(resolveTopicNavigationTarget(groupsWithTopics, topics.filter((topic) => topic.topicAnchorId !== 'topic-remote'), 'group-1', 'topic-remote'), null)

const remappedTopics = remapPlannedAskRichDocument(topicDocument, new Map([['group-1', 'group-new']]), new Map([['item-1', 'item-new']]), new Map([['topic-remote', 'topic-new']]))
assert.equal(remappedTopics.blocks[0].topicAnchorId, 'topic-new')
assert.deepEqual(remappedTopics.blocks[1].children[1], { type: 'checklistRef', groupId: 'group-new', itemId: 'item-new' })

const mixedLegacy = richDocumentFromLegacy([{ type: 'text', text: '!ACCESS!\nCheck ' }, { type: 'checklistRef', groupId: 'group-1', itemId: 'item-1' }])
assert.equal(mixedLegacy.blocks[0].type, 'topic')
assert.equal(mixedLegacy.blocks[1].children[1].type, 'checklistRef')

console.log('DIBCAC rich-text tests passed: formatting, Topic Anchors, duplicates, rename/reorder/delete safety, mixed @ references, template remapping, HTML escaping, and 1,000 serialization cycles.')
