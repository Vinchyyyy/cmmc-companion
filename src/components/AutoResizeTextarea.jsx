import { useEffect, useRef } from 'react'

export default function AutoResizeTextarea({ value, onChange, rows = 3, ...props }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={rows}
      style={{ overflow: 'hidden', resize: 'none' }}
      {...props}
    />
  )
}
