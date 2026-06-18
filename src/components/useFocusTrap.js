import { useEffect } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

// Traps keyboard focus within `ref.current` while `isActive` is true.
// Cycles Tab forward and Shift-Tab backward through focusable descendants.
export default function useFocusTrap(ref, isActive) {
  useEffect(() => {
    if (!isActive || !ref.current) return
    const el = ref.current

    const getFocusable = () => [...el.querySelectorAll(FOCUSABLE)]

    const handler = (e) => {
      if (e.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    el.addEventListener('keydown', handler)
    return () => el.removeEventListener('keydown', handler)
  }, [isActive, ref])
}
