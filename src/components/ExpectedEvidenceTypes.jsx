import { useState, useId } from 'react'
import { evidenceTags } from '../data/evidenceTags.js'

const TAG_BY_ID = new Map(evidenceTags.map((tag) => [tag.id, tag]))

function resolveTag(id) {
  const found = TAG_BY_ID.get(id)
  return found ?? { id, label: id, category: '', definition: '' }
}

export default function ExpectedEvidenceTypes({ expectedTags, note }) {
  const instanceId = useId()
  const [selectedTagId, setSelectedTagId] = useState(null)

  const primary    = expectedTags?.primary    ?? []
  const acceptable = expectedTags?.acceptable ?? []
  const hasTags    = primary.length > 0 || acceptable.length > 0

  if (!hasTags && !note) return null

  const handleChipClick = (id) => {
    setSelectedTagId((prev) => (prev === id ? null : id))
  }

  const panelId = `expected-tag-panel-${instanceId}`
  const selectedTag  = selectedTagId ? resolveTag(selectedTagId) : null
  const selectedRole = selectedTagId
    ? primary.includes(selectedTagId)
      ? 'Primary evidence type'
      : 'Acceptable supporting evidence type'
    : null

  return (
    <div className="expected-evidence-types">
      <h4 className="expected-evidence-types-header">Expected evidence types</h4>

      {hasTags && (
        <p className="expected-evidence-helper">
          Evidence types commonly reviewed for this objective — guidance only. Click a chip for details.
        </p>
      )}

      {primary.length > 0 && (
        <div className="expected-evidence-row">
          <span className="expected-evidence-label">Primary</span>
          <div className="expected-evidence-chip-row">
            {primary.map((id) => {
              const tag = resolveTag(id)
              const isSelected = selectedTagId === id
              return (
                <button
                  key={id}
                  type="button"
                  className={`evidence-type-chip evidence-type-chip-primary${isSelected ? ' evidence-type-chip--selected' : ''}`}
                  onClick={() => handleChipClick(id)}
                  aria-expanded={isSelected}
                  aria-controls={panelId}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {acceptable.length > 0 && (
        <div className="expected-evidence-row">
          <span className="expected-evidence-label">Acceptable supporting</span>
          <div className="expected-evidence-chip-row">
            {acceptable.map((id) => {
              const tag = resolveTag(id)
              const isSelected = selectedTagId === id
              return (
                <button
                  key={id}
                  type="button"
                  className={`evidence-type-chip evidence-type-chip-acceptable${isSelected ? ' evidence-type-chip--selected' : ''}`}
                  onClick={() => handleChipClick(id)}
                  aria-expanded={isSelected}
                  aria-controls={panelId}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selectedTag && (
        <div
          id={panelId}
          className="expected-tag-panel"
          role="region"
          aria-label={`Evidence type details: ${selectedTag.label}`}
        >
          <div className="expected-tag-panel-header">
            <span className="expected-tag-panel-title">{selectedTag.label}</span>
            <span className="expected-tag-panel-role">{selectedRole}</span>
          </div>
          {selectedTag.category && (
            <div className="expected-tag-panel-meta">
              Category: {selectedTag.category}
            </div>
          )}
          {selectedTag.definition && (
            <div className="expected-tag-panel-definition">
              {selectedTag.definition}
            </div>
          )}
          <div className="expected-tag-panel-footer">
            Guidance only.
          </div>
        </div>
      )}

      {note && (
        <p className="expected-evidence-note">{note}</p>
      )}
    </div>
  )
}
