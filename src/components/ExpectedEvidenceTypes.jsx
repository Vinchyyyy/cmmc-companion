import { useState } from 'react'
import { evidenceTags } from '../data/evidenceTags.js'

const TAG_BY_ID = new Map(evidenceTags.map((tag) => [tag.id, tag]))

function resolveTag(id) {
  const found = TAG_BY_ID.get(id)
  return found ?? { id, label: id, category: '', definition: '' }
}

export default function ExpectedEvidenceTypes({ expectedTags, note }) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  const primary    = expectedTags?.primary    ?? []
  const acceptable = expectedTags?.acceptable ?? []
  const hasTags    = primary.length > 0 || acceptable.length > 0

  if (!hasTags && !note) return null

  const allTagIds = [...primary, ...acceptable]

  return (
    <div className="expected-evidence-types">
      <h4 className="expected-evidence-types-header">Expected evidence types</h4>

      {hasTags && (
        <p className="expected-evidence-helper">
          Evidence types commonly reviewed for this objective — guidance only.
        </p>
      )}

      {primary.length > 0 && (
        <div className="expected-evidence-row">
          <span className="expected-evidence-label">Primary</span>
          <div className="expected-evidence-chip-row">
            {primary.map((id) => {
              const tag = resolveTag(id)
              return (
                <span
                  key={id}
                  className="evidence-type-chip evidence-type-chip-primary"
                  title={tag.definition || undefined}
                >
                  {tag.label}
                </span>
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
              return (
                <span
                  key={id}
                  className="evidence-type-chip evidence-type-chip-acceptable"
                  title={tag.definition || undefined}
                >
                  {tag.label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {hasTags && (
        <>
          <div className="evidence-type-details-toggle">
            <button
              type="button"
              onClick={() => setDetailsOpen((o) => !o)}
              aria-expanded={detailsOpen}
            >
              <span aria-hidden="true">{detailsOpen ? '▾' : '▸'}</span>
              {' '}Evidence type details
            </button>
          </div>
          {detailsOpen && (
            <div className="evidence-type-details">
              {allTagIds.map((id) => {
                const tag = resolveTag(id)
                return (
                  <div key={id} className="evidence-type-detail-item">
                    <strong>{tag.label}</strong>
                    {tag.definition && <> — {tag.definition}</>}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {note && (
        <p className="expected-evidence-note">{note}</p>
      )}
    </div>
  )
}
