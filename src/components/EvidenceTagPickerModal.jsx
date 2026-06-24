import { useState, useEffect, useRef, useId } from 'react'
import { evidenceTags } from '../data/evidenceTags.js'
import useFocusTrap from './useFocusTrap.js'

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
const TAG_LOOKUP = Object.fromEntries(evidenceTags.map((t) => [t.id, t]))

function matchTag(tag, term) {
  if (!term) return { matches: true, isAliasMatch: false, matchedAlias: null }
  if (
    tag.label.toLowerCase().includes(term) ||
    tag.id.replace(/_/g, ' ').includes(term) ||
    tag.category.toLowerCase().includes(term)
  ) {
    return { matches: true, isAliasMatch: false, matchedAlias: null }
  }
  const matchedAlias = (tag.aliases ?? []).find((a) => a.toLowerCase().includes(term))
  if (matchedAlias) return { matches: true, isAliasMatch: true, matchedAlias }
  return { matches: false, isAliasMatch: false, matchedAlias: null }
}

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

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => searchRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [isOpen])

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
      tags: group.tags
        .map((tag) => ({ ...tag, ...matchTag(tag, term) }))
        .filter((t) => t.matches),
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
        {/* Header */}
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
          Tags classify what kind of evidence this artifact is. Tags do not determine assessment outcomes.
        </p>

        {/* Selected tags area */}
        <div className="evidence-tag-picker-selected-wrap">
          <div className="etp-selected-row">
            <span className="evidence-tag-picker-selected-label">
              Selected tags{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </span>
            {selectedCount > 0 && (
              <button
                type="button"
                className="etp-clear-btn"
                onClick={() => setSelected(new Set())}
              >
                Clear all
              </button>
            )}
          </div>
          {selectedCount === 0 ? (
            <span className="evidence-tag-picker-selected-empty">No tags selected yet.</span>
          ) : (
            <div className="etp-selected-chips">
              {[...selected].map((id) => {
                const tag = TAG_LOOKUP[id]
                const label = tag ? tag.label : id
                return (
                  <span key={id} className="tag-chip">
                    {label}
                    <button
                      type="button"
                      className="tag-chip-remove"
                      aria-label={`Remove ${label}`}
                      onClick={() => toggle(id)}
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="evidence-tag-picker-search-wrap">
          <input
            ref={searchRef}
            type="search"
            className="evidence-tag-picker-search"
            placeholder="Search — try 'vpn', 'mfa', 'firewall', 'logs', 'training'…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search evidence tags"
          />
        </div>

        {/* Pill grid body */}
        <div className="evidence-tag-picker-body">
          {visibleGroups.length === 0 ? (
            <p className="evidence-tag-picker-empty">No matching tags. Try a broader or related term.</p>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.category} className="etp-category">
                <div className="etp-category-title">{group.category}</div>
                <div className="etp-chip-grid">
                  {group.tags.map((tag) => {
                    const isSelected = selected.has(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`etp-chip${isSelected ? ' etp-chip--selected' : ''}`}
                        onClick={() => toggle(tag.id)}
                        aria-pressed={isSelected}
                        title={tag.definition}
                      >
                        {isSelected && (
                          <span className="etp-chip-check" aria-hidden="true">✓</span>
                        )}
                        <span className="etp-chip-label">{tag.label}</span>
                        {tag.isAliasMatch && (
                          <span className="etp-chip-hint" aria-hidden="true">
                            · {tag.matchedAlias}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="confirm-dialog-buttons evidence-tag-picker-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={() => onSave([...selected])}>Apply</button>
        </div>
      </div>
    </div>
  )
}
