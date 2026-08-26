const LIST_ITEM_RE = /^\s*(?:[-*•▪◦‣–—]|\d+[.)]|[A-Za-z][.)])\s+/
const LETTER_RE = /[A-Za-z]/

function normalizeLine(line) {
  return line
    .split('\t')
    .map((part) => part.trim().replace(/[ \f\v]+/g, ' '))
    .join('\t')
    .trim()
}

function isHeading(line) {
  if (!line || line.length > 80) return false
  if (line.endsWith(':')) return true
  const letters = [...line].filter((char) => LETTER_RE.test(char))
  return letters.length >= 3 && letters.every((char) => char === char.toUpperCase())
}

function joinWrappedBlock(block) {
  const lines = block.split('\n').map(normalizeLine).filter(Boolean)
  if (lines.length === 0) return ''

  let output = lines[0]
  for (let index = 1; index < lines.length; index++) {
    const previous = lines[index - 1]
    const current = lines[index]
    const preserveBreak =
      LIST_ITEM_RE.test(current) ||
      previous.includes('\t') ||
      current.includes('\t') ||
      isHeading(previous)

    // Keep a visible end-of-line hyphen attached to the following word. This
    // safely preserves compounds such as "role-based" without guessing whether
    // a PDF-inserted hyphen should be deleted.
    const separator = preserveBreak ? '\n' : previous.endsWith('-') ? '' : ' '
    output += separator + current
  }
  return output
}

// Repairs PDF/SSP hard wrapping while preserving intentional paragraphs,
// lists, headings, and tabular rows. A single newline is treated as a visual
// wrap; one or more blank lines remain one paragraph break.
export function normalizePastedText(value) {
  const normalized = String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\u00ad/g, '')
    .replace(/\f/g, '\n\n')

  return normalized
    .split(/\n[ \t]*\n+/)
    .map(joinWrappedBlock)
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

export function buildNormalizedPasteValue(
  currentValue,
  pastedValue,
  selectionStart,
  selectionEnd,
  maxLength,
) {
  const current = String(currentValue ?? '')
  const start = Math.max(0, Math.min(Number(selectionStart) || 0, current.length))
  const end = Math.max(start, Math.min(Number(selectionEnd) || start, current.length))
  let insertion = normalizePastedText(pastedValue)

  if (Number.isFinite(maxLength) && maxLength >= 0) {
    const available = Math.max(0, maxLength - (current.length - (end - start)))
    insertion = insertion.slice(0, available)
  }

  return {
    value: current.slice(0, start) + insertion + current.slice(end),
    cursor: start + insertion.length,
    normalizedPaste: insertion,
  }
}
