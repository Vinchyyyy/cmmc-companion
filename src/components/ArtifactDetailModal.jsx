import { useState, useRef, useId } from 'react'
import { updateArtifactTags } from '../utils/artifactRegistry.js'
import ArtifactTagChipList from './ArtifactTagChipList.jsx'
import EvidenceTagPickerModal from './EvidenceTagPickerModal.jsx'
import useFocusTrap from './useFocusTrap.js'

export default function ArtifactDetailModal({ isOpen, artifact, onClose, onTagsUpdated }) {
  // localTags tracks tag changes within this modal session without waiting for
  // a parent re-render. Resets to null on each mount (parent uses key prop).
  const [localTags, setLocalTags] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerKey, setPickerKey] = useState(0)

  const dialogRef = useRef(null)
  const titleId = useId()

  useFocusTrap(dialogRef, isOpen && !pickerOpen)

  if (!isOpen) return null

  const currentTags = localTags ?? (artifact?.tags ?? [])
  const hasArtifact = !!artifact

  const openPicker = () => {
    setPickerKey((k) => k + 1)
    setPickerOpen(true)
  }

  const handlePickerSave = (tagIds) => {
    if (artifact) {
      updateArtifactTags(artifact.id, tagIds)
    }
    setLocalTags(tagIds)
    setPickerOpen(false)
    onTagsUpdated?.()
  }

  return (
    <>
      <div
        className="confirm-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="confirm-dialog artifact-detail-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="artifact-detail-header">
          <h2 id={titleId} className="artifact-detail-title">Artifact details</h2>
          <button
            type="button"
            className="evidence-tag-picker-close"
            onClick={onClose}
            aria-label="Close"
          >×</button>
        </div>

        {hasArtifact ? (
          <>
            <p className="artifact-detail-name">{artifact.name}</p>

            <div className="artifact-detail-tags">
              <div className="artifact-detail-meta">Artifact evidence tags</div>
              <ArtifactTagChipList tagIds={currentTags} />
              <p className="artifact-tag-editor-helper">
                Tags describe what kind of evidence this artifact is — guidance only.
              </p>
            </div>

            <div className="artifact-detail-actions">
              <button type="button" onClick={openPicker}>
                {currentTags.length > 0 ? 'Edit evidence tags' : 'Add evidence tags'}
              </button>
            </div>
          </>
        ) : (
          <p className="artifact-detail-name artifact-detail-name--missing">
            Artifact not found.
          </p>
        )}

        <div className="confirm-dialog-buttons" style={{ marginTop: 'var(--space-4)' }}>
          <button type="button" onClick={onClose}>Done</button>
        </div>
      </div>

      {hasArtifact && (
        <EvidenceTagPickerModal
          key={pickerKey}
          isOpen={pickerOpen}
          artifact={artifact}
          initialSelectedTagIds={currentTags}
          onCancel={() => setPickerOpen(false)}
          onSave={handlePickerSave}
          title="Artifact evidence tags"
        />
      )}
    </>
  )
}
