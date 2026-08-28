import { readObjectiveResult, writeObjectiveResult } from './objectiveResults.js'

function parseObjectiveKey(key) {
  const match = typeof key === 'string' ? key.match(/^(.+)\[([^\]]+)\]$/) : null
  return match ? { controlId: match[1], objectiveId: match[2] } : null
}

function sourceId(groupId, itemId) {
  return `${groupId}:${itemId}`
}

function writeSourceNote(objectiveKey, id, entry) {
  const parsed = parseObjectiveKey(objectiveKey)
  if (!parsed) return false
  const current = readObjectiveResult(parsed.controlId, parsed.objectiveId)
  const notes = { ...current.checklistInterviewNotes }
  if (entry?.note?.trim()) notes[id] = { label: entry.label, note: entry.note.trim() }
  else delete notes[id]
  writeObjectiveResult(parsed.controlId, parsed.objectiveId, { ...current, checklistInterviewNotes: notes })
  return true
}

export function syncChecklistInterviewNote(group, item, note, previousObjectiveKeys = item?.objKeys ?? []) {
  if (!group?.id || !item?.id) return { updated: 0, removed: 0 }
  const id = sourceId(group.id, item.id)
  const nextKeys = new Set(Array.isArray(item.objKeys) ? item.objKeys : [])
  const previousKeys = new Set(Array.isArray(previousObjectiveKeys) ? previousObjectiveKeys : [])
  let updated = 0
  let removed = 0

  for (const key of previousKeys) {
    if (!nextKeys.has(key) || !String(note ?? '').trim()) {
      if (writeSourceNote(key, id, null)) removed++
    }
  }
  if (String(note ?? '').trim()) {
    const label = `${group.name} — ${item.text}`
    for (const key of nextKeys) {
      if (writeSourceNote(key, id, { label, note })) updated++
    }
  }
  return { updated, removed }
}

export function reconcileChecklistInterviewNotes(previousGroup, nextGroup) {
  if (!previousGroup?.id || !nextGroup?.id) return
  const previousItems = new Map((previousGroup.checklist ?? []).filter((item) => item.type === 'item').map((item) => [item.id, item]))
  const nextItems = new Map((nextGroup.checklist ?? []).filter((item) => item.type === 'item').map((item) => [item.id, item]))

  for (const previous of previousItems.values()) {
    if (!nextItems.has(previous.id) && previous.interviewNote?.trim()) {
      syncChecklistInterviewNote(previousGroup, previous, '', previous.objKeys)
    }
  }
  for (const next of nextItems.values()) {
    const previous = previousItems.get(next.id)
    if (next.interviewNote?.trim() || previous?.interviewNote?.trim()) {
      syncChecklistInterviewNote(nextGroup, next, next.interviewNote ?? '', previous?.objKeys ?? [])
    }
  }
}

export function removeGroupChecklistInterviewNotes(group) {
  for (const item of group?.checklist ?? []) {
    if (item.type === 'item' && item.interviewNote?.trim()) {
      syncChecklistInterviewNote(group, item, '', item.objKeys)
    }
  }
}
