import { getReviewGroups, getReviewFolders, commitReviewPlan } from './reviewGroups.js'
import { removeGroupChecklistInterviewNotes } from './checklistInterviewNotes.js'
import { countAllPlannedAskReferences } from './dibcacRichText.js'

export function deleteSelectedReviewGroups(ids, confirmDeletion = (message) => window.confirm(message)) {
  const selected = new Set(ids)
  const groups = getReviewGroups()
  const targets = groups.filter((group) => selected.has(group.id))
  if (!targets.length) return null
  const remaining = groups.filter((group) => !selected.has(group.id))
  const referenceCount = targets.reduce((count, group) => count + countAllPlannedAskReferences(remaining, group.id), 0)
  const label = `${targets.length} review group${targets.length === 1 ? '' : 's'}`
  const confirmed = confirmDeletion(`Are you sure you want to delete ${label}?\n\n${targets.map((group) => group.name).join('\n')}\n\nTheir Planned Ask, checklists, and linked checklist interview notes will be removed. Folders and objective statuses will be kept.${referenceCount ? `\n${referenceCount} Planned Ask reference(s) in remaining groups will lose their destination.` : ''}\n\nThis cannot be undone here. A full project backup can restore deleted groups.`)
  if (!confirmed) return null
  const folders = getReviewFolders()
  const saved = commitReviewPlan({ groups: remaining, folders, baseline: JSON.stringify({ groups, folders }) })
  for (const group of targets) removeGroupChecklistInterviewNotes(group)
  return { groups: saved.groups, count: targets.length }
}
