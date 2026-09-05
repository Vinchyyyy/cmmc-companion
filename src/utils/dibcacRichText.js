import { buildChecklistReferenceMap, checklistReferenceKey, countPlannedAskReferences, normalizePlannedAskContent } from './dibcacReferences.js'

export const PLANNED_ASK_RICH_VERSION = 1
export const PLANNED_ASK_COLORS = ['default', 'blue', 'green', 'amber', 'red']
export const PLANNED_ASK_SIZES = ['small', 'normal', 'large']

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `topic-${Date.now()}-${Math.random().toString(16).slice(2)}`

export function parseTopicAnchorSyntax(value) {
  const match = String(value ?? '').trim().match(/^!([^!\n]{1,120})!$/)
  if (!match) return null
  const label = match[1].trim().replace(/\s+/g, ' ')
  return /[\p{L}\p{N}]/u.test(label) ? label : null
}

export const topicAnchorDomId = (groupId, topicAnchorId) => `dibcac-topic-${String(groupId).replace(/[^a-zA-Z0-9_-]/g, '-')}-${String(topicAnchorId).replace(/[^a-zA-Z0-9_-]/g, '-')}`

const makeText = (text, marks = {}) => ({
  type: 'text',
  text: String(text ?? ''),
  ...(marks.bold ? { bold: true } : {}),
  ...(PLANNED_ASK_COLORS.includes(marks.color) && marks.color !== 'default' ? { color: marks.color } : {}),
  ...(PLANNED_ASK_SIZES.includes(marks.size) && marks.size !== 'normal' ? { size: marks.size } : {}),
})

function normalizeInline(node) {
  if (!node || typeof node !== 'object') return null
  if (node.type === 'text' && typeof node.text === 'string') return makeText(node.text, node)
  if (node.type === 'checklistRef' && typeof node.groupId === 'string' && typeof node.itemId === 'string') {
    return { type: 'checklistRef', groupId: node.groupId, itemId: node.itemId }
  }
  return null
}

function mergeTextNodes(nodes) {
  const result = []
  for (const node of nodes) {
    const previous = result.at(-1)
    if (
      node.type === 'text' && previous?.type === 'text' &&
      !!node.bold === !!previous.bold && (node.color ?? '') === (previous.color ?? '') &&
      (node.size ?? '') === (previous.size ?? '')
    ) previous.text += node.text
    else result.push(node)
  }
  return result
}

export function richDocumentFromLegacy(content, fallback = '') {
  const source = normalizePlannedAskContent(content, fallback).map(normalizeInline).filter(Boolean)
  const blocks = []
  let children = []
  const flush = () => {
    const label = children.every((node) => node.type === 'text')
      ? parseTopicAnchorSyntax(children.map((node) => node.text).join(''))
      : null
    blocks.push(label
      ? { type: 'topic', indent: 0, topicAnchorId: makeId(), children: [makeText(label)] }
      : { type: 'paragraph', indent: 0, children: mergeTextNodes(children) })
    children = []
  }
  for (const node of source) {
    if (node.type !== 'text' || !node.text.includes('\n')) {
      children.push(node)
      continue
    }
    const parts = node.text.split('\n')
    parts.forEach((part, index) => {
      if (part) children.push(makeText(part, node))
      if (index < parts.length - 1) flush()
    })
  }
  if (children.length) flush()
  return { version: PLANNED_ASK_RICH_VERSION, blocks }
}

export function normalizePlannedAskRichDocument(document, legacyContent, fallback = '') {
  if (!document || typeof document !== 'object' || !Array.isArray(document.blocks)) {
    return richDocumentFromLegacy(legacyContent, fallback)
  }
  const blocks = document.blocks.map((block) => {
    if (!block || typeof block !== 'object') return null
    const type = block.type === 'bullet' ? 'bullet' : block.type === 'topic' ? 'topic' : 'paragraph'
    const indent = Math.max(0, Math.min(4, Number.isInteger(block.indent) ? block.indent : 0))
    const children = mergeTextNodes((Array.isArray(block.children) ? block.children : []).map(normalizeInline).filter(Boolean))
    if (type === 'topic') {
      const rawLabel = children.filter((node) => node.type === 'text').map((node) => node.text).join('')
      const label = parseTopicAnchorSyntax(rawLabel) ?? rawLabel.trim().replace(/\s+/g, ' ')
      return { type, indent: 0, topicAnchorId: typeof block.topicAnchorId === 'string' && block.topicAnchorId ? block.topicAnchorId : makeId(), children: label ? [makeText(label)] : [] }
    }
    const legacyLabel = children.every((node) => node.type === 'text')
      ? parseTopicAnchorSyntax(children.map((node) => node.text).join(''))
      : null
    if (legacyLabel) return { type: 'topic', indent: 0, topicAnchorId: makeId(), children: [makeText(legacyLabel)] }
    return { type, indent, children }
  }).filter(Boolean)
  return { version: PLANNED_ASK_RICH_VERSION, blocks }
}

export function richDocumentToLegacyContent(document) {
  const normalized = normalizePlannedAskRichDocument(document)
  const content = []
  normalized.blocks.forEach((block, blockIndex) => {
    if (blockIndex > 0) content.push({ type: 'text', text: '\n' })
    if (block.type === 'bullet') content.push({ type: 'text', text: `${'  '.repeat(block.indent)}- ` })
    if (block.type === 'topic') content.push({ type: 'text', text: '!' })
    content.push(...block.children.map((node) => node.type === 'text' ? { type: 'text', text: node.text } : { ...node }))
    if (block.type === 'topic') content.push({ type: 'text', text: '!' })
  })
  return normalizePlannedAskContent(content)
}

export function richDocumentPlainText(document, referenceIndex, includeLabels = false) {
  const referenceMap = buildChecklistReferenceMap(referenceIndex)
  return normalizePlannedAskRichDocument(document).blocks.map((block) => {
    const prefix = block.type === 'bullet' ? `${'  '.repeat(block.indent)}- ` : block.type === 'topic' ? '!' : ''
    return prefix + block.children.map((node) => {
      if (node.type === 'text') return node.text
      const reference = referenceMap.get(checklistReferenceKey(node.groupId, node.itemId))
      if (!reference) return '[Missing checklist reference]'
      return includeLabels ? `${reference.displayRef} — ${reference.label}` : `@${reference.displayRef}`
    }).join('') + (block.type === 'topic' ? '!' : '')
  }).join('\n')
}

export function isRichBlockComplete(block, referenceIndex) {
  const referenceMap = buildChecklistReferenceMap(referenceIndex)
  const references = (block?.children ?? []).filter((node) => node?.type === 'checklistRef')
  if (references.length === 0) return false
  return references.every((node) => referenceMap.get(checklistReferenceKey(node.groupId, node.itemId))?.checked === true)
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function richDocumentToEditorHtml(document, referenceIndex) {
  const referenceMap = buildChecklistReferenceMap(referenceIndex)
  const blocks = normalizePlannedAskRichDocument(document).blocks
  if (blocks.length === 0) return '<div data-pa-block="true" data-type="paragraph" data-indent="0"><br></div>'
  return blocks.map((block) => {
    const children = block.children.map((node) => {
      if (node.type === 'checklistRef') {
        const reference = referenceMap.get(checklistReferenceKey(node.groupId, node.itemId))
        const label = reference ? `@${reference.displayRef}` : '@Missing reference'
        return `<span class="dibcac-rich-ref${reference ? '' : ' dibcac-rich-ref--missing'}" data-pa-ref="true" data-group-id="${escapeHtml(node.groupId)}" data-item-id="${escapeHtml(node.itemId)}" contenteditable="false">${escapeHtml(label)}</span>`
      }
      let text = escapeHtml(node.text).replace(/\n/g, '<br>')
      if (!text) return ''
      if (node.bold) text = `<strong>${text}</strong>`
      if (node.color || node.size) {
        text = `<span${node.color ? ` data-color="${escapeHtml(node.color)}"` : ''}${node.size ? ` data-size="${escapeHtml(node.size)}"` : ''}>${text}</span>`
      }
      return text
    }).join('') || '<br>'
    return `<div data-pa-block="true" data-type="${block.type}" data-indent="${block.indent}"${block.type === 'topic' ? ` data-topic-anchor-id="${escapeHtml(block.topicAnchorId)}"` : ''}>${children}</div>`
  }).join('')
}

export function remapPlannedAskRichDocument(document, groupIdMap, itemIdMap, topicAnchorIdMap = new Map()) {
  const normalized = normalizePlannedAskRichDocument(document)
  return {
    ...normalized,
    blocks: normalized.blocks.map((block) => ({
      ...block,
      ...(block.type === 'topic' ? { topicAnchorId: topicAnchorIdMap.get(block.topicAnchorId) ?? block.topicAnchorId } : {}),
      children: block.children.map((node) => node.type === 'checklistRef' ? {
        ...node,
        groupId: groupIdMap.get(node.groupId) ?? node.groupId,
        itemId: itemIdMap.get(node.itemId) ?? node.itemId,
      } : node),
    })),
  }
}

export function buildTopicAnchorIndex(groups) {
  const topics = []
  for (const [groupIndex, group] of (groups ?? []).entries()) {
    const document = normalizePlannedAskRichDocument(group?.plannedAskRichDocument, group?.plannedAskContent, group?.plannedAsk)
    document.blocks.forEach((block, blockIndex) => {
      if (block.type !== 'topic' || !block.topicAnchorId) return
      const label = block.children.filter((node) => node.type === 'text').map((node) => node.text).join('').trim()
      if (!label) return
      topics.push({ topicAnchorId: block.topicAnchorId, groupId: group.id, groupNumber: groupIndex + 1, label, groupName: group.name ?? '', folderId: group.folderId ?? null, blockIndex })
    })
  }
  return topics
}

export function resolveTopicNavigationTarget(groups, topicIndex, groupId, topicAnchorId) {
  const group = (groups ?? []).find((entry) => entry.id === groupId)
  const topic = (topicIndex ?? []).find((entry) => entry.groupId === groupId && entry.topicAnchorId === topicAnchorId)
  return group && topic ? { ...topic, folderId: group.folderId ?? null } : null
}

export function countRichDocumentReferences(document, targetGroupId, targetItemId = null) {
  let count = 0
  for (const block of normalizePlannedAskRichDocument(document).blocks) {
    for (const node of block.children) {
      if (node.type !== 'checklistRef' || node.groupId !== targetGroupId) continue
      if (targetItemId === null || node.itemId === targetItemId) count += 1
    }
  }
  return count
}

export function countAllPlannedAskReferences(groups, targetGroupId, targetItemId = null) {
  return (groups ?? []).reduce((count, group) => count + (
    group?.plannedAskRichDocument?.blocks
      ? countRichDocumentReferences(group.plannedAskRichDocument, targetGroupId, targetItemId)
      : countPlannedAskReferences([group], targetGroupId, targetItemId)
  ), 0)
}

export function stressCloneRichDocument(document, iterations = 1) {
  let value = document
  for (let index = 0; index < iterations; index += 1) {
    value = normalizePlannedAskRichDocument(JSON.parse(JSON.stringify(value)))
  }
  return value
}
