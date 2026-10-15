export const EXCEL_EXPORT_COLUMNS = [
  { key: 'artifacts', column: 'D', label: 'Evidence / Artifacts' },
  { key: 'interviews', column: 'E', label: 'Interviews' },
  { key: 'examine', column: 'F', label: 'Examine' },
  { key: 'test', column: 'G', label: 'Test' },
  { key: 'overallComments', column: 'H', label: 'Overall Comments' },
  { key: 'timeToAssess', column: 'I', label: 'Time to Assess' },
  { key: 'standardsAcceptance', column: 'J', label: 'Standards Acceptance' },
  { key: 'inherited', column: 'K', label: 'Inherited' },
  { key: 'esp', column: 'L', label: 'Inherited From / ESP' },
  { key: 'score', column: 'M', label: 'Score' },
  { key: 'dateAssessed', column: 'N', label: 'Date Assessed' },
  { key: 'assessedBy', column: 'O', label: 'Assessed By' },
  { key: 'findingText', column: 'P', label: 'Findings' },
]
export const ALL_EXCEL_COLUMN_KEYS = EXCEL_EXPORT_COLUMNS.map(({ key }) => key)

export function highestAcceptanceStandard(values) {
  const rank = { 'FedRAMP Moderate': 1, 'FedRAMP High': 2, 'DIBCAC High': 2 }
  // Keep the first provider's label on a tie between High standards.
  return values.reduce((best, value) => (rank[value] ?? 0) > (rank[best] ?? 0) ? value : best, '')
}

export function formatProviderList(names) {
  return names.map((name) => /[,"\n\r]/.test(name) ? `"${name.replace(/"/g, '""')}"` : name).join(', ')
}

export function parseProviderList(value) {
  const text = String(value ?? '')
  // Preserve legacy exports that separated names with line breaks.
  if (/\r?\n/.test(text) && !text.includes('"')) return text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
  const result = []
  let name = '', quoted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { name += '"'; index++ }
      else quoted = !quoted
    } else if (char === ',' && !quoted) { if (name.trim()) result.push(name.trim()); name = '' }
    else name += char
  }
  if (name.trim()) result.push(name.trim())
  return result
}
