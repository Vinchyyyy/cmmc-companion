import { useEffect, useRef } from 'react'
import { buildNormalizedPasteValue, normalizePastedText } from '../utils/pasteFormatting'

export default function AutoResizeTextarea({ value, onChange, onPaste, rows = 3, maxLength, spellCheck = true, ...props }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const handlePaste = (event) => {
    onPaste?.(event)
    if (event.defaultPrevented) return

    const pasted = event.clipboardData?.getData('text/plain') ?? ''
    const normalized = normalizePastedText(pasted)
    if (!pasted || normalized === pasted) return

    event.preventDefault()
    const element = event.currentTarget
    const result = buildNormalizedPasteValue(
      value,
      pasted,
      element.selectionStart,
      element.selectionEnd,
      maxLength,
    )
    onChange?.({ target: { value: result.value }, currentTarget: { value: result.value } })

    requestAnimationFrame(() => {
      ref.current?.setSelectionRange(result.cursor, result.cursor)
    })
  }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onPaste={handlePaste}
      rows={rows}
      maxLength={maxLength}
      spellCheck={spellCheck}
      style={{ overflow: 'hidden', resize: 'none' }}
      {...props}
    />
  )
}
