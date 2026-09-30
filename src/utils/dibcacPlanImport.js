import controls from '../data/controls/index.js'
import { getDibcacStandard } from '../data/dibcacAssessmentStandards.js'
import { buildChecklistReferenceIndex } from './dibcacReferences.js'
import { normalizePlannedAskRichDocument, richDocumentToLegacyContent, richDocumentPlainText, remapPlannedAskRichDocument, parseTopicAnchorSyntax, PLANNED_ASK_COLORS, PLANNED_ASK_SIZES } from './dibcacRichText.js'

export const PLAN_KIND = 'cmmc-dibcac-plan'
export const PLAN_VERSION = 1
export const MAX_PLAN_BYTES = 3 * 1024 * 1024
export const objectiveCatalog = controls.flatMap((control) => (control.objectives ?? []).map((obj) => ({
  key: `${control.id}[${obj.id}]`, controlId: control.id, objId: obj.id, objText: obj.text,
  standard: getDibcacStandard(control.id, obj.id)?.standard ?? 'unknown',
})))
const catalog = new Map(objectiveCatalog.map((obj) => [obj.key, obj]))
const fail = (path, message) => { throw new Error(`${path}: ${message}`) }
function fields(value, allowed, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'expected an object')
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(path, `unsupported field “${key}”`)
}
function text(value, path, max = 40000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(path, `expected nonempty text (up to ${max} characters)`)
  return value
}
function id(value, path) {
  text(value, path, 160)
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) fail(path, 'use letters, digits, underscores, or hyphens')
  return value
}
function array(value, path, max = 5000) {
  if (!Array.isArray(value) || value.length > max) fail(path, `expected an array with at most ${max} entries`)
  return value
}
function unique(values, path) {
  if (new Set(values).size !== values.length) fail(path, 'duplicate IDs or objective references')
}
function objectives(values, path) {
  return array(values, path).map((key) => {
    if (!catalog.has(key)) fail(path, `unknown objective “${String(key)}”; use an exact catalog ID`)
    return key
  })
}

function validateRichDocument(value, path) {
  fields(value, ['version', 'blocks'], path)
  if (value.version !== 1) fail(path, 'rich document version must be 1')
  array(value.blocks, `${path}.blocks`, 2000).forEach((block, i) => {
    const p = `${path}.blocks[${i}]`
    fields(block, ['type', 'indent', 'topicAnchorId', 'children'], p)
    if (!['paragraph', 'bullet', 'topic'].includes(block.type)) fail(p, 'invalid block type')
    if (!Number.isInteger(block.indent) || block.indent < 0 || block.indent > 4) fail(p, 'indent must be 0–4')
    if (block.type === 'topic') {
      id(block.topicAnchorId, `${p}.topicAnchorId`)
      if (block.indent !== 0) fail(p, 'topics must have indent 0')
    }
    array(block.children, `${p}.children`, 1000).forEach((node) => {
      if (node?.type === 'text') {
        fields(node, ['type', 'text', 'bold', 'color', 'size'], p)
        if (typeof node.text !== 'string' || node.text.length > 40000) fail(p, 'invalid text')
        if (node.bold !== undefined && typeof node.bold !== 'boolean') fail(p, 'bold must be boolean')
        if (node.color !== undefined && !PLANNED_ASK_COLORS.includes(node.color)) fail(p, 'unsupported color')
        if (node.size !== undefined && !PLANNED_ASK_SIZES.includes(node.size)) fail(p, 'unsupported size')
        if (/@G\d+-\d/.test(node.text)) fail(p, 'use a checklistRef node for links in a rich document')
      } else if (node?.type === 'checklistRef') {
        fields(node, ['type', 'groupId', 'itemId'], p)
        id(node.groupId, p); id(node.itemId, p)
        if (block.type === 'topic') fail(p, 'topics cannot contain checklist references')
      } else fail(p, 'unknown inline node type')
    })
    if (block.type === 'topic') {
      const label = block.children.map((node) => node.text).join('')
      if (!parseTopicAnchorSyntax(`!${label}!`)) fail(p, 'topic label must contain letters or digits, be at most 120 characters, and exclude ! and line breaks')
    }
  })
  return normalizePlannedAskRichDocument(value)
}

function parsePlainAsk(value, referenceIndex, path) {
  const refs = new Map(referenceIndex.map((ref) => [ref.displayRef, ref]))
  return { version: 1, blocks: value.split(/\r?\n/).map((line) => {
    const topic = parseTopicAnchorSyntax(line)
    if (topic) return { type: 'topic', indent: 0, topicAnchorId: crypto.randomUUID(), children: [{ type: 'text', text: topic }] }
    const bullet = line.match(/^( *)[-*] (.*)$/)
    if (bullet && (bullet[1].length % 2 || bullet[1].length > 8)) fail(path, 'use two spaces per bullet nesting level, up to four levels')
    const source = bullet ? bullet[2] : line
    const children = []
    let position = 0
    // Requires the "-N" group/item separator before treating a token as an
    // attempted reference — a bare "@G4" in ordinary prose (no such syntax
    // intended) would otherwise fail the stricter check below as "malformed"
    // and block the entire plan import over incidental text.
    for (const match of source.matchAll(/@G\d+-[\w.]*/g)) {
      const token = match[0].replace(/\.+$/, '')
      if (!/^@G\d+-\d+(?:\.\d+)?$/.test(token)) fail(path, `malformed checklist reference ${token}`)
      if (match.index > position) children.push({ type: 'text', text: source.slice(position, match.index) })
      const ref = refs.get(token.slice(1))
      if (!ref) fail(path, `unresolved checklist reference ${token}`)
      children.push({ type: 'checklistRef', groupId: ref.groupId, itemId: ref.itemId })
      position = match.index + token.length
    }
    if (position < source.length) children.push({ type: 'text', text: source.slice(position) })
    return { type: bullet ? 'bullet' : 'paragraph', indent: bullet ? bullet[1].length / 2 : 0, children }
  }) }
}

// Dedicated plan exports deliberately omit live assessment results and notes.
export function exportDibcacPlan(groups, folders) {
  return {
    kind: PLAN_KIND, version: PLAN_VERSION,
    folders: folders.map((folder) => ({ id: folder.id, name: folder.name })),
    groups: groups.map((group) => ({
      id: group.id, name: group.name, folderId: group.folderId ?? null,
      objectives: (group.objectives ?? []).map((obj) => obj.key ?? obj.objectiveRef),
      checklist: (group.checklist ?? []).map((item) => ({
        id: item.id, type: item.type, text: item.text,
        ...(item.type === 'item' ? { objKeys: item.objKeys ?? [] } : {}),
      })),
      plannedAskRichDocument: normalizePlannedAskRichDocument(group.plannedAskRichDocument, group.plannedAskContent, group.plannedAsk),
    })),
  }
}

export function prepareDibcacPlan(value, existingGroups = [], existingFolders = [], mode = 'add') {
  if (!['add', 'update'].includes(mode)) fail('Mode', 'invalid import mode')
  fields(value, ['kind', 'version', 'groups', 'folders'], 'File')
  if (value.kind !== PLAN_KIND || value.version !== PLAN_VERSION) fail('File', `expected kind ${PLAN_KIND} and version ${PLAN_VERSION}`)
  const folders = array(value.folders ?? [], 'folders', 500).map((folder, i) => {
    fields(folder, ['id', 'name'], `folders[${i}]`)
    return { id: id(folder.id, `folders[${i}].id`), name: text(folder.name, `folders[${i}].name`, 200).trim() }
  })
  unique(folders.map((folder) => folder.id), 'folders')
  const rawGroups = array(value.groups, 'groups', 500)
  if (!rawGroups.length) fail('groups', 'include at least one group')
  const warnings = []
  const groups = rawGroups.map((group, i) => {
    const p = `groups[${i}]`
    fields(group, ['id', 'name', 'folderId', 'objectives', 'checklist', 'plannedAsk', 'plannedAskRichDocument'], p)
    const objectiveKeys = objectives(group.objectives ?? [], `${p}.objectives`)
    unique(objectiveKeys, `${p}.objectives`)
    const checklist = array(group.checklist ?? [], `${p}.checklist`).map((item, j) => {
      const q = `${p}.checklist[${j}]`
      fields(item, ['id', 'type', 'text', 'objKeys'], q)
      if (!['header', 'item'].includes(item.type)) fail(q, 'type must be header or item')
      const result = { id: id(item.id, `${q}.id`), type: item.type, text: text(item.text, `${q}.text`, 4000) }
      if (item.type === 'item') {
        result.objKeys = objectives(item.objKeys ?? [], `${q}.objKeys`)
        unique(result.objKeys, `${q}.objKeys`)
        result.checked = false
        if (!result.objKeys.length) warnings.push(`${group.name}: “${item.text}” has no attached objectives.`)
      } else if (item.objKeys?.length) fail(q, 'headers cannot have objective mappings')
      return result
    })
    if (group.plannedAsk !== undefined && group.plannedAskRichDocument !== undefined) fail(p, 'provide plannedAsk OR plannedAskRichDocument, not both')
    if (group.plannedAsk !== undefined && (typeof group.plannedAsk !== 'string' || group.plannedAsk.length > 100000)) fail(p, 'plannedAsk must be text up to 100,000 characters')
    const rich = group.plannedAskRichDocument === undefined ? null : validateRichDocument(group.plannedAskRichDocument, `${p}.plannedAskRichDocument`)
    if (group.folderId != null) id(group.folderId, `${p}.folderId`)
    const attached = new Set(checklist.flatMap((item) => item.objKeys ?? []))
    const uncovered = objectiveKeys.filter((key) => !attached.has(key))
    if (uncovered.length) warnings.push(`${group.name}: ${uncovered.length} group objectives are not attached to checklist questions yet.`)
    return { id: id(group.id, `${p}.id`), name: text(group.name, `${p}.name`, 200).trim(), folderId: group.folderId ?? null,
      objectives: objectiveKeys.map((key) => ({ ...catalog.get(key) })), checklist,
      plannedAskRichDocument: rich, plannedAsk: group.plannedAsk ?? '',
    }
  })
  unique(groups.map((group) => group.id), 'groups')
  unique(groups.flatMap((group) => group.checklist.map((item) => item.id)), 'checklist IDs across the file')
  unique(groups.flatMap((group) => (group.plannedAskRichDocument?.blocks ?? []).filter((block) => block.type === 'topic').map((block) => block.topicAnchorId)), 'topic IDs across the file')
  // Display references in plain text are relative to this file, never the destination workspace.
  const referenceIndex = buildChecklistReferenceIndex(groups)
  for (const group of groups) if (!group.plannedAskRichDocument) group.plannedAskRichDocument = parsePlainAsk(group.plannedAsk, referenceIndex, group.name)
  const groupMap = new Map(groups.map((group) => [group.id, mode === 'add' ? crypto.randomUUID() : group.id]))
  const folderMap = new Map(folders.map((folder) => [folder.id, mode === 'add' ? crypto.randomUUID() : folder.id]))
  const itemMap = new Map(groups.flatMap((group) => group.checklist.map((item) => [item.id, mode === 'add' ? crypto.randomUUID() : item.id])))
  const topicMap = new Map(groups.flatMap((group) => group.plannedAskRichDocument.blocks.filter((block) => block.type === 'topic').map((block) => [block.topicAnchorId, mode === 'add' ? crypto.randomUUID() : block.topicAnchorId])))
  const existingById = new Map(existingGroups.map((group) => [group.id, group]))
  const allowedFolders = new Set([...folders.map((folder) => folder.id), ...(mode === 'update' ? existingFolders.map((folder) => folder.id) : [])])
  const names = new Set(existingGroups.map((group) => group.name))
  const summary = []
  const imported = groups.map((group) => {
    if (group.folderId && !allowedFolders.has(group.folderId)) fail(group.name, `unknown folder ${group.folderId}`)
    const previous = mode === 'update' ? existingById.get(group.id) : null
    const previousItems = new Map((previous?.checklist ?? []).map((item) => [item.id, item]))
    // Keep live notes in their original objective fields. Do not detach or rewrite their sources.
    for (const old of previousItems.values()) {
      const next = group.checklist.find((item) => item.id === old.id)
      if ((old.checked || old.interviewNote?.trim()) && (!next || next.type !== old.type)) fail(group.name, `cannot remove completed/noted item “${old.text}”; edit it in DIBCAC Mode first`)
      if (old.interviewNote?.trim() && JSON.stringify([...(old.objKeys ?? [])].sort()) !== JSON.stringify([...(next?.objKeys ?? [])].sort())) fail(group.name, `cannot remap noted item “${old.text}”; edit it in DIBCAC Mode first`)
    }
    let name = group.name
    if (mode === 'add') { let suffix = 2; while (names.has(name)) name = `${group.name} (${suffix++})` }
    names.add(name)
    summary.push({ name, action: previous ? 'Update' : 'Add', objectives: group.objectives.length, questions: group.checklist.filter((item) => item.type === 'item').length })
    return {
      ...previous, ...group, id: groupMap.get(group.id), name,
      folderId: folderMap.get(group.folderId) ?? group.folderId,
      checklist: group.checklist.map((item) => ({ ...previousItems.get(item.id), ...item, id: itemMap.get(item.id),
        ...(item.type === 'item' ? { checked: previousItems.get(item.id)?.checked ?? false } : {}),
      })),
      plannedAskRichDocument: remapPlannedAskRichDocument(group.plannedAskRichDocument, groupMap, itemMap, topicMap),
      createdAt: previous?.createdAt ?? new Date().toISOString(),
    }
  })
  const importedById = new Map(imported.map((group) => [group.id, group]))
  const mergedGroups = [...existingGroups.map((group) => importedById.get(group.id) ?? group), ...imported.filter((group) => !existingById.has(group.id))]
  unique(mergedGroups.flatMap((group) => (group.checklist ?? []).map((item) => item.id)), 'Checklist IDs in resulting workspace')
  const mergedFolderMap = new Map(existingFolders.map((folder) => [folder.id, folder]))
  for (const folder of folders) mergedFolderMap.set(folderMap.get(folder.id), { ...mergedFolderMap.get(folderMap.get(folder.id)), ...folder, id: folderMap.get(folder.id) })
  const finalIndex = buildChecklistReferenceIndex(mergedGroups)
  const targets = new Set(finalIndex.map((ref) => `${ref.groupId}:${ref.itemId}`))
  // Also guard against an update deleting a destination used by an untouched group.
  for (const group of mergedGroups) {
    const document = normalizePlannedAskRichDocument(group.plannedAskRichDocument, group.plannedAskContent, group.plannedAsk)
    for (const block of document.blocks) for (const node of block.children) {
      if (node.type === 'checklistRef' && !targets.has(`${node.groupId}:${node.itemId}`)) fail(group.name, `unresolved link to ${node.groupId} / ${node.itemId}`)
      if (mode === 'add' && importedById.has(group.id) && node.type === 'checklistRef' && !importedById.has(node.groupId)) fail(group.name, 'add mode references must target groups included in the file')
    }
  }
  for (const group of imported) {
    group.plannedAskContent = richDocumentToLegacyContent(group.plannedAskRichDocument)
    group.plannedAsk = richDocumentPlainText(group.plannedAskRichDocument, finalIndex)
  }
  return { groups: mergedGroups, folders: [...mergedFolderMap.values()], summary, warnings,
    baseline: JSON.stringify({ groups: existingGroups, folders: existingFolders }) }
}

export function downloadPlanFile(name, content, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
