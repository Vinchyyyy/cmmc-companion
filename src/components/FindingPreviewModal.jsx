import { useEffect, useRef } from 'react'
import useFocusTrap from './useFocusTrap.js'

export default function FindingPreviewModal({ finding, objectiveRef, onClose }) {
  const ref = useRef(null)
  useFocusTrap(ref, true)
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector('button')?.focus()
    const handler = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [onClose])
  return <div className="confirm-overlay" role="presentation">
    <section ref={ref} className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="finding-preview-title" style={{ maxWidth: 760, width: '90vw' }}>
      <h2 id="finding-preview-title">Finding Preview — {objectiveRef}</h2>
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '65vh', overflowY: 'auto', textAlign: 'left' }}>{finding.finalText || 'This finding has no saved text.'}</p>
      <div className="confirm-dialog-buttons"><button type="button" onClick={onClose}>Close</button></div>
    </section>
  </div>
}
