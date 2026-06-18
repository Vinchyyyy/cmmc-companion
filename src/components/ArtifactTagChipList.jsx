import { evidenceTags } from '../data/evidenceTags.js'

const TAG_BY_ID = Object.fromEntries(evidenceTags.map((t) => [t.id, t]))

// Read-only display of artifact evidence tag chips.
// Pass onRemove to make chips removable (not used in modal flow).
export default function ArtifactTagChipList({ tagIds }) {
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    return <span className="artifact-tag-empty">No evidence tags added yet.</span>
  }
  return (
    <div className="artifact-tag-chip-row">
      {tagIds.map((id) => {
        const tag = TAG_BY_ID[id]
        const label = tag ? tag.label : id
        return (
          <span key={id} className="tag-chip">
            {label}
          </span>
        )
      })}
    </div>
  )
}
