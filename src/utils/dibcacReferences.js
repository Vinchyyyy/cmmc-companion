export function withCanonicalGroupOrder(groups) {
  return (Array.isArray(groups) ? groups : []).map((group, index) => ({ ...group, order: index + 1 }))
}

export function numberChecklistEntries(checklist) {
  const numbers = new Map()
  let topLevel = 0
  let currentHeader = 0
  let child = 0

  for (const entry of checklist ?? []) {
    if (entry.type === 'header') {
      topLevel += 1
      currentHeader = topLevel
      child = 0
      numbers.set(entry.id, String(currentHeader))
    } else if (currentHeader > 0) {
      child += 1
      numbers.set(entry.id, `${currentHeader}.${child}`)
    } else {
      topLevel += 1
      numbers.set(entry.id, String(topLevel))
    }
  }
  return numbers
}

export function buildChecklistReferenceIndex(groups) {
  const index = []
  for (const [groupIndex, group] of (groups ?? []).entries()) {
    const groupNumber = groupIndex + 1
    const localNumbers = numberChecklistEntries(group.checklist)
    for (const item of group.checklist ?? []) {
      if (item.type !== 'item') continue
      const localNumber = localNumbers.get(item.id)
      index.push({
        groupId: group.id,
        groupNumber,
        groupName: group.name,
        itemId: item.id,
        localNumber,
        displayRef: `G${groupNumber}-${localNumber}`,
        label: item.text,
        folderId: group.folderId ?? null,
      })
    }
  }
  return index
}

export function buildGroupNumberMap(groups) {
  return new Map((groups ?? []).map((group, index) => [group.id, index + 1]))
}

export function checklistReferenceKey(groupId, itemId) {
  return `${groupId}:${itemId}`
}

export function buildChecklistReferenceMap(index) {
  return new Map((index ?? []).map((entry) => [checklistReferenceKey(entry.groupId, entry.itemId), entry]))
}

export function resolveChecklistNavigationTarget(groups, referenceIndex, groupId, itemId) {
  const group = (groups ?? []).find((entry) => entry.id === groupId)
  const reference = (referenceIndex ?? []).find((entry) => entry.groupId === groupId && entry.itemId === itemId)
  if (!group || !reference) return null
  return {
    groupId,
    itemId,
    folderId: group.folderId ?? null,
    displayRef: reference.displayRef,
  }
}

export function searchChecklistReferences(index, query, limit = 8) {
  const term = String(query ?? '').trim().toLowerCase()
  const words = term.split(/\s+/).filter(Boolean)
  return (index ?? []).filter((entry) => {
    if (words.length === 0) return true
    const haystack = `${entry.displayRef} ${entry.label} ${entry.groupName}`.toLowerCase()
    return words.every((word) => haystack.includes(word))
  }).slice(0, limit)
}

export function normalizePlannedAskContent(content, fallback = '') {
  if (!Array.isArray(content)) return fallback ? [{ type: 'text', text: String(fallback) }] : []
  const normalized = []
  for (const segment of content) {
    if (!segment || typeof segment !== 'object') continue
    if (segment.type === 'text' && typeof segment.text === 'string' && segment.text) {
      const previous = normalized.at(-1)
      if (previous?.type === 'text') previous.text += segment.text
      else normalized.push({ type: 'text', text: segment.text })
    } else if (segment.type === 'checklistRef' && typeof segment.groupId === 'string' && typeof segment.itemId === 'string') {
      normalized.push({ type: 'checklistRef', groupId: segment.groupId, itemId: segment.itemId })
    }
  }
  return normalized
}

function referenceText(segment, referenceMap) {
  const entry = referenceMap.get(checklistReferenceKey(segment.groupId, segment.itemId))
  return entry ? `@${entry.displayRef}` : '@Missing checklist reference'
}

export function renderPlannedAskText(content, referenceIndex) {
  const referenceMap = buildChecklistReferenceMap(referenceIndex)
  return normalizePlannedAskContent(content).map((segment) => segment.type === 'text'
    ? segment.text
    : referenceText(segment, referenceMap)).join('')
}

export function plannedAskFallbackText(content, referenceIndex) {
  const referenceMap = buildChecklistReferenceMap(referenceIndex)
  return normalizePlannedAskContent(content).map((segment) => {
    if (segment.type === 'text') return segment.text
    const entry = referenceMap.get(checklistReferenceKey(segment.groupId, segment.itemId))
    return entry ? `${entry.displayRef} — ${entry.label}` : '[Missing checklist reference]'
  }).join('')
}

function renderedRanges(content, referenceIndex) {
  const normalized = normalizePlannedAskContent(content)
  const referenceMap = buildChecklistReferenceMap(referenceIndex)
  const ranges = []
  let text = ''
  for (const segment of normalized) {
    const value = segment.type === 'text' ? segment.text : referenceText(segment, referenceMap)
    const start = text.length
    text += value
    ranges.push({ segment, start, end: text.length })
  }
  return { text, ranges }
}

function contentFromTextAndReferences(text, references) {
  const content = []
  let cursor = 0
  for (const reference of [...references].sort((a, b) => a.start - b.start)) {
    if (reference.start > cursor) content.push({ type: 'text', text: text.slice(cursor, reference.start) })
    content.push({ type: 'checklistRef', groupId: reference.groupId, itemId: reference.itemId })
    cursor = reference.end
  }
  if (cursor < text.length) content.push({ type: 'text', text: text.slice(cursor) })
  return normalizePlannedAskContent(content)
}

export function updatePlannedAskContent(content, nextText, referenceIndex) {
  const previous = renderedRanges(content, referenceIndex)
  if (previous.text === nextText) return normalizePlannedAskContent(content)
  let prefix = 0
  while (prefix < previous.text.length && prefix < nextText.length && previous.text[prefix] === nextText[prefix]) prefix += 1
  let suffix = 0
  while (
    suffix < previous.text.length - prefix && suffix < nextText.length - prefix &&
    previous.text[previous.text.length - 1 - suffix] === nextText[nextText.length - 1 - suffix]
  ) suffix += 1
  const oldEnd = previous.text.length - suffix
  const delta = nextText.length - previous.text.length
  const references = previous.ranges
    .filter(({ segment }) => segment.type === 'checklistRef')
    .filter(({ start, end }) => end <= prefix || start >= oldEnd)
    .map(({ segment, start, end }) => ({
      groupId: segment.groupId,
      itemId: segment.itemId,
      start: start >= oldEnd ? start + delta : start,
      end: end >= oldEnd ? end + delta : end,
    }))
  return contentFromTextAndReferences(nextText, references)
}

export function insertPlannedAskReference(content, selectionStart, selectionEnd, reference, referenceIndex) {
  const rendered = renderedRanges(content, referenceIndex)
  const insertText = `@${reference.displayRef}`
  const nextText = rendered.text.slice(0, selectionStart) + insertText + rendered.text.slice(selectionEnd)
  const delta = insertText.length - (selectionEnd - selectionStart)
  const references = rendered.ranges
    .filter(({ segment }) => segment.type === 'checklistRef')
    .filter(({ start, end }) => end <= selectionStart || start >= selectionEnd)
    .map(({ segment, start, end }) => ({
      groupId: segment.groupId,
      itemId: segment.itemId,
      start: start >= selectionEnd ? start + delta : start,
      end: end >= selectionEnd ? end + delta : end,
    }))
  references.push({
    groupId: reference.groupId,
    itemId: reference.itemId,
    start: selectionStart,
    end: selectionStart + insertText.length,
  })
  return {
    content: contentFromTextAndReferences(nextText, references),
    caret: selectionStart + insertText.length,
  }
}

export function remapPlannedAskContent(content, groupIdMap, itemIdMap) {
  return normalizePlannedAskContent(content).map((segment) => segment.type === 'checklistRef'
    ? {
        ...segment,
        groupId: groupIdMap.get(segment.groupId) ?? segment.groupId,
        itemId: itemIdMap.get(segment.itemId) ?? segment.itemId,
      }
    : segment)
}

export function countPlannedAskReferences(groups, targetGroupId, targetItemId = null) {
  let count = 0
  for (const group of groups ?? []) {
    for (const segment of normalizePlannedAskContent(group.plannedAskContent)) {
      if (segment.type !== 'checklistRef' || segment.groupId !== targetGroupId) continue
      if (targetItemId === null || segment.itemId === targetItemId) count += 1
    }
  }
  return count
}

export function checklistItemDomId(itemId) {
  return `dibcac-checklist-item-${encodeURIComponent(itemId)}`
}

export function reviewGroupDomId(groupId) {
  return `dibcac-review-group-${encodeURIComponent(groupId)}`
}
