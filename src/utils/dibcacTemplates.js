import { DEFAULT_DIBCAC_TEMPLATE_BASE64 } from '../data/defaultDibcacTemplate.js'
import { normalizePlannedAskContent, remapPlannedAskContent } from './dibcacReferences.js'
import { normalizePlannedAskRichDocument, remapPlannedAskRichDocument, richDocumentToLegacyContent } from './dibcacRichText.js'

const STORAGE_KEY = 'cmmc-dibcac-templates'
export const DIBCAC_TEMPLATE_KIND = 'cmmc-dibcac-template'
export const DIBCAC_TEMPLATE_SCHEMA_VERSION = 4

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

function cleanObjective(item) {
  if (!item || typeof item !== 'object') return null
  const key = typeof item.key === 'string' ? item.key : typeof item.objectiveRef === 'string' ? item.objectiveRef : ''
  const controlId = typeof item.controlId === 'string' ? item.controlId : ''
  const objId = typeof item.objId === 'string' ? item.objId : typeof item.objectiveKey === 'string' ? item.objectiveKey : ''
  const objText = typeof item.objText === 'string' ? item.objText : typeof item.objectiveText === 'string' ? item.objectiveText : ''
  if (!key || !controlId || !objId || !objText) return null
  return { key, controlId, objId, objText, standard: typeof item.standard === 'string' ? item.standard : null }
}

function cleanChecklistEntry(item) {
  if (!item || typeof item !== 'object') return null
  if (item.type === 'header' && typeof item.text === 'string' && item.text.trim()) {
    return { id: typeof item.id === 'string' ? item.id : makeId(), type: 'header', text: item.text.trim() }
  }
  if (item.type === 'item' && typeof item.text === 'string' && item.text.trim()) {
    return {
      id: typeof item.id === 'string' ? item.id : makeId(),
      type: 'item',
      text: item.text.trim(),
      objKeys: Array.isArray(item.objKeys) ? [...new Set(item.objKeys.filter((value) => typeof value === 'string' && value))] : [],
      checked: false,
    }
  }
  return null
}

export function normalizeDibcacTemplate(value, fallbackName = 'Imported DIBCAC Template') {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const rawFolders = Array.isArray(raw.folders) ? raw.folders : Array.isArray(raw.reviewFolders) ? raw.reviewFolders : []
  const rawGroups = Array.isArray(raw.groups) ? raw.groups : Array.isArray(raw.reviewGroups) ? raw.reviewGroups : []
  const folders = rawFolders
    .filter((folder) => folder && typeof folder === 'object' && typeof folder.name === 'string' && folder.name.trim())
    .map((folder) => ({ id: typeof folder.id === 'string' && folder.id ? folder.id : makeId(), name: folder.name.trim() }))
  const folderIds = new Set(folders.map((folder) => folder.id))
  const groups = rawGroups
    .filter((group) => group && typeof group === 'object' && typeof group.name === 'string' && group.name.trim())
    .map((group) => {
      const fallback = typeof group.plannedAsk === 'string' ? group.plannedAsk : ''
      const legacyContent = normalizePlannedAskContent(group.plannedAskContent, fallback)
      const plannedAskRichDocument = normalizePlannedAskRichDocument(group.plannedAskRichDocument, legacyContent, fallback)
      return {
        id: typeof group.id === 'string' && group.id ? group.id : makeId(),
        name: group.name.trim(),
        folderId: typeof group.folderId === 'string' && folderIds.has(group.folderId) ? group.folderId : null,
        plannedAsk: fallback,
        plannedAskContent: richDocumentToLegacyContent(plannedAskRichDocument),
        plannedAskRichDocument,
        objectives: Array.isArray(group.objectives) ? group.objectives.map(cleanObjective).filter(Boolean) : [],
        checklist: Array.isArray(group.checklist) ? group.checklist.map(cleanChecklistEntry).filter(Boolean) : [],
      }
    })

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : makeId(),
    kind: DIBCAC_TEMPLATE_KIND,
    templateSchemaVersion: DIBCAC_TEMPLATE_SCHEMA_VERSION,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : fallbackName,
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    folders,
    groups,
  }
}

export function extractDibcacTemplate(value, fallbackName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'Invalid JSON: expected an object.' }
  }

  const hasDedicatedShape = value.kind === DIBCAC_TEMPLATE_KIND || Array.isArray(value.groups)
  const hasProjectShape = Array.isArray(value.reviewGroups)
  if (!hasDedicatedShape && !hasProjectShape) {
    return { ok: false, error: 'No DIBCAC template or review-group data was found in this JSON file.' }
  }

  const source = hasDedicatedShape ? value : {
    name: fallbackName || `${value.projectMeta?.oscName || 'Project'} DIBCAC Template`,
    description: 'Extracted from a full CMMC Companion project backup.',
    folders: value.reviewFolders,
    groups: value.reviewGroups,
  }
  const template = normalizeDibcacTemplate(source, fallbackName)
  if (template.groups.length === 0) return { ok: false, error: 'The JSON contains no usable DIBCAC review groups.' }
  return { ok: true, template, source: hasDedicatedShape ? 'template' : 'project-backup' }
}

let builtInPromise = null
export function getBuiltInDibcacTemplate() {
  if (builtInPromise) return builtInPromise
  builtInPromise = (async () => {
    const binary = atob(DEFAULT_DIBCAC_TEMPLATE_BASE64.replace(/\s+/g, ''))
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    const decoded = JSON.parse(await new Response(stream).text())
    return { ...normalizeDibcacTemplate(decoded), id: 'builtin-default', builtIn: true }
  })()
  return builtInPromise
}

export function readCustomDibcacTemplates() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.map((item) => normalizeDibcacTemplate(item)).filter((item) => item.groups.length > 0) : []
  } catch {
    return []
  }
}

export function writeCustomDibcacTemplates(templates) {
  const normalized = Array.isArray(templates)
    ? templates.map((item) => normalizeDibcacTemplate(item)).filter((item) => item.groups.length > 0)
    : []
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)) } catch { /* storage unavailable */ }
  return normalized
}

export function saveCustomDibcacTemplate(template) {
  const normalized = normalizeDibcacTemplate(template)
  const current = readCustomDibcacTemplates()
  const next = [normalized, ...current.filter((item) => item.id !== normalized.id)]
  return writeCustomDibcacTemplates(next)
}

export function deleteCustomDibcacTemplate(templateId) {
  return writeCustomDibcacTemplates(readCustomDibcacTemplates().filter((item) => item.id !== templateId))
}

export function createDibcacTemplateFromCurrent(name, groups, folders) {
  return normalizeDibcacTemplate({
    id: makeId(),
    name,
    description: 'Created from the current DIBCAC review-group workspace.',
    folders,
    groups,
    createdAt: new Date().toISOString(),
  })
}

export function instantiateDibcacTemplate(template) {
  const normalized = normalizeDibcacTemplate(template)
  const createdAt = new Date().toISOString()
  const folderIdMap = new Map(normalized.folders.map((folder) => [folder.id, makeId()]))
  const groupIdMap = new Map(normalized.groups.map((group) => [group.id, makeId()]))
  const itemIdMap = new Map(normalized.groups.flatMap((group) => group.checklist.map((item) => [item.id, makeId()])))
  const topicAnchorIdMap = new Map(normalized.groups.flatMap((group) => (
    group.plannedAskRichDocument.blocks
      .filter((block) => block.type === 'topic' && block.topicAnchorId)
      .map((block) => [block.topicAnchorId, makeId()])
  )))
  const folders = normalized.folders.map((folder) => ({ id: folderIdMap.get(folder.id), name: folder.name, createdAt }))
  const groups = normalized.groups.map((group) => ({
    id: groupIdMap.get(group.id),
    name: group.name,
    folderId: group.folderId ? folderIdMap.get(group.folderId) ?? null : null,
    plannedAsk: group.plannedAsk,
    plannedAskContent: remapPlannedAskContent(group.plannedAskContent, groupIdMap, itemIdMap),
    plannedAskRichDocument: remapPlannedAskRichDocument(group.plannedAskRichDocument, groupIdMap, itemIdMap, topicAnchorIdMap),
    objectives: group.objectives.map((item) => ({ ...item })),
    checklist: group.checklist.map((item) => ({ ...item, id: itemIdMap.get(item.id), ...(item.type === 'item' ? { checked: false, objKeys: [...item.objKeys] } : {}) })),
    createdAt,
  }))
  return { groups, folders }
}

export function templateStats(template) {
  const normalized = normalizeDibcacTemplate(template)
  const refs = new Set(normalized.groups.flatMap((group) => group.objectives.map((objective) => objective.key)))
  return {
    folders: normalized.folders.length,
    groups: normalized.groups.length,
    objectiveAssignments: normalized.groups.reduce((sum, group) => sum + group.objectives.length, 0),
    uniqueObjectives: refs.size,
    checklistItems: normalized.groups.reduce((sum, group) => sum + group.checklist.filter((item) => item.type === 'item').length, 0),
  }
}

export function downloadDibcacTemplate(template) {
  const normalized = normalizeDibcacTemplate(template)
  const payload = { ...normalized, exportedAt: new Date().toISOString() }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${normalized.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'dibcac-template'}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
