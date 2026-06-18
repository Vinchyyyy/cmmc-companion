import { useState, useEffect, useRef, useId } from 'react'
import { evidenceTags } from '../data/evidenceTags.js'
import useFocusTrap from './useFocusTrap.js'

// Pre-compute grouped structure once at module load — evidenceTags is static.
function buildGroups(tags) {
  const catMap = new Map()
  const groups = []
  for (const t of tags) {
    if (!catMap.has(t.category)) {
      const group = { category: t.category, tags: [] }
      catMap.set(t.category, group)
      groups.push(group)
    }
    catMap.get(t.category).tags.push(t)
  }
  return groups
}

const ALL_GROUPS = buildGroups(evidenceTags)

export default function EvidenceTagPickerModal({
  isOpen,
  artifact,
  initialSelectedTagIds = [],
  onCancel,
  onSave,
  title = 'Artifact evidence tags',
}) {
  const [selected, setSelected] = useState(() => new Set(initialSelectedTagIds))
  const [query, setQuery] = useState('')
  const dialogRef = useRef(null)
  const searchRef = useRef(null)
  const titleId = useId()
  const descId = useId()

  useFocusTrap(dialogRef, isOpen)

  // Defer focus to the search input once the modal is painted.
  // State is initialized fresh on each mount via lazy initializers above;
  // the parent resets state by passing a new key when reopening the modal.
  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => searchRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [isOpen])

  // Escape closes as Cancel.
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const term = query.trim().toLowerCase()

  const visibleGroups = ALL_GROUPS
    .map((group) => ({
      category: group.category,
      tags: term
        ? group.tags.filter(
            (t) =>
              t.label.toLowerCase().includes(term) ||
              t.id.includes(term) ||
              t.category.toLowerCase().includes(term)
          )
        : group.tags,
    }))
    .filter((g) => g.tags.length > 0)

  const toggle = (tagId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  const selectedCount = selected.size

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        className="confirm-dialog evidence-tag-picker-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header row */}
        <div className="evidence-tag-picker-header">
          <h2 id={titleId} className="evidence-tag-picker-title">{title}</h2>
          <button
            type="button"
            className="evidence-tag-picker-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {artifact && (
          <p className="evidence-tag-picker-artifact-name">{artifact.name}</p>
        )}

        <p id={descId} className="evidence-tag-picker-helper">
          Tags describe what kind of evidence this artifact is — guidance only.
        </p>

        {/* Search */}
        <div className="evidence-tag-picker-search-wrap">
          <input
            ref={searchRef}
            type="text"
            className="evidence-tag-picker-search"
            placeholder="Search evidence tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search evidence tags"
          />
        </div>

        {/* Scrollable tag list */}
        <div className="evidence-tag-picker-body">
          {visibleGroups.length === 0 ? (
            <p className="evidence-tag-picker-empty">No matching tags.</p>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.category} className="evidence-tag-category">
                <div className="evidence-tag-category-title">{group.category}</div>
                {group.tags.map((tag) => {
                  const isChecked = selected.has(tag.id)
                  return (
                    <label
                      key={tag.id}
                      className={`evidence-tag-option${isChecked ? ' evidence-tag-option-selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(tag.id)}
                      />
                      <span className="evidence-tag-option-label">{tag.label}</span>
                    </label>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Selected count */}
        <div className="evidence-tag-picker-selected">
          {selectedCount === 0
            ? 'No tags selected.'
            : `${selectedCount} tag${selectedCount !== 1 ? 's' : ''} selected.`}
        </div>

        {/* Actions */}
        <div className="confirm-dialog-buttons evidence-tag-picker-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={() => onSave([...selected])}>Done</button>
        </div>
      </div>
    </div>
  )
}
