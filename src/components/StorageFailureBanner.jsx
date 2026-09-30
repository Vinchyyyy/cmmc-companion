import { useEffect, useState } from 'react'
import { subscribeToStorageFailures } from '../utils/storageWrite.js'

// Global, route-independent warning: this app has no backend, so a
// localStorage write failure (quota exceeded, private browsing, disk full)
// means an assessor's change was not saved. Any failure reopens the banner
// even if a prior one was dismissed, since each failed write is a distinct
// loss of data.
export default function StorageFailureBanner() {
  const [failure, setFailure] = useState(null)

  useEffect(() => subscribeToStorageFailures(() => {
    setFailure((prev) => ({ count: (prev?.count ?? 0) + 1, dismissed: false }))
  }), [])

  if (!failure || failure.dismissed) return null

  return (
    <section role="alert" className="storage-failure-banner">
      <span>
        A change could not be saved to this browser&apos;s local storage
        {failure.count > 1 ? ` (${failure.count} failed writes)` : ''}. This
        usually means storage is full or unavailable (e.g. private browsing).
        Export a backup now from Settings and free up space before continuing
        — further changes may not be saved.
      </span>
      <button
        type="button"
        onClick={() => setFailure((prev) => prev && { ...prev, dismissed: true })}
      >
        Dismiss
      </button>
    </section>
  )
}
