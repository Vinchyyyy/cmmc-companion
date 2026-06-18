import { useState, useRef } from 'react'
import { evidenceTags } from '../data/evidenceTags.js'
import { updateArtifactTags } from '../utils/artifactRegistry.js'

const TAG_BY_ID = Object.fromEntries(evidenceTags.map((t) => [t.id, t]))

// Build grouped suggestion list from a flat array of tag objects.
function groupByCategory(tags) {
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

export default function ArtifactTagEditor({ artifact }) {
  const [tags, setTags] = useState(() =>
    Array.isArray(artifact?.tags) ? artifact.tags : []
  )
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  if (!artifact) {
    return (
      <p className="muted artifact-tag-empty">
        Evidence tagging unavailable for this artifact.
      </p>
    )
  }

  const tagSet = new Set(tags)
  const term = query.trim().toLowerCase()

  const filteredSuggestions = evidenceTags.filter((t) => {
    if (tagSet.has(t.id)) return false
    if (!term) return true
    return (
      t.label.toLowerCase().includes(term) ||
      t.id.includes(term) ||
      t.category.toLowerCase().includes(term)
    )
  })

  const grouped = groupByCategory(filteredSuggestions)

  const addTag = (tagId) => {
    if (tagSet.has(tagId)) return
    const next = [...tags, tagId]
    setTags(next)
    updateArtifactTags(artifact.id, next)
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const removeTag = (tagId) => {
    const next = tags.filter((t) => t !== tagId)
    setTags(next)
    updateArtifactTags(artifact.id, next)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      e.preventDefault()
      addTag(filteredSuggestions[0].id)
    }
  }

  return (
    <div className="artifact-tag-editor">
      <div className="artifact-tag-editor-header">Artifact evidence tags</div>
      <p className="artifact-tag-editor-helper">
        Tags describe what kind of evidence this artifact is — guidance only.
      </p>

      <div className="artifact-tag-chip-row">
        {tags.length === 0 ? (
          <span className="artifact-tag-empty">No evidence tags added yet.</span>
        ) : (
          tags.map((id) => {
            const tag = TAG_BY_ID[id]
            const label = tag ? tag.label : id
            return (
              <span key={id} className="tag-chip">
                {label}
                <button
                  type="button"
                  className="tag-chip-remove"
                  onClick={() => removeTag(id)}
                  aria-label={`Remove ${label}`}
                >
                  ×
                </button>
              </span>
            )
          })
        )}
      </div>

      <div className="tag-input-container artifact-tag-picker">
        <div
          className="tag-input-wrapper"
          onClick={() => inputRef.current?.focus()}
        >
          <input
            ref={inputRef}
            className="tag-input-field artifact-tag-search"
            type="text"
            placeholder="Add evidence tag…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 160)}
            onKeyDown={handleKeyDown}
            aria-label="Search evidence tags"
            aria-autocomplete="list"
            aria-expanded={open && grouped.length > 0}
          />
        </div>

        {open && grouped.length > 0 && (
          <ul className="tag-suggestion-list" role="listbox">
            {grouped.map((group) => (
              <li key={group.category}>
                <div className="artifact-tag-suggestion-category">
                  {group.category}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {group.tags.map((t) => (
                    <li
                      key={t.id}
                      className="tag-suggestion-item artifact-tag-suggestion-item"
                      role="option"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        addTag(t.id)
                      }}
                    >
                      {t.label}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {open && query.trim() && filteredSuggestions.length === 0 && (
          <div className="tag-suggestion-list" style={{ padding: 'var(--space-2) var(--space-3)' }}>
            <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              No matching tags.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
