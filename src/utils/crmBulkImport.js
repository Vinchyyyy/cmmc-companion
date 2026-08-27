import { findCrosswalkCandidates } from '../data/nist53Crosswalk.js'

const HEADER_RE = /^(?:control\s*id|nist\s*(?:sp\s*)?800[- ]?53(?:\s*control)?|control)$/i
const STATUS_AT_END_RE = /^(.*?)\s{1,}(yes|full|fully inherited|partial|shared|no|none|not inherited|tenant(?: responsibility)?|n\/?a|review|unknown)\s*$/i

export function normalizeCrmControlId(value) {
  const source = String(value ?? '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toUpperCase()

  const match = source.match(/^([A-Z]{2})\s*-?\s*(\d+)((?:\s*\([^)]*\))*)/)
  if (!match) return ''

  const family = match[1]
  const controlNumber = String(Number.parseInt(match[2], 10))
  if (!controlNumber || controlNumber === 'NaN') return ''

  const groups = [...match[3].matchAll(/\(\s*([^)]*?)\s*\)/g)].map((item) => item[1])
  const numericEnhancement = groups.find((group) => /^\d+$/.test(group))
  const enhancement = numericEnhancement == null ? '' : `(${Number.parseInt(numericEnhancement, 10)})`
  return `${family}-${controlNumber}${enhancement}`
}

export function normalizeCrmInheritanceStatus(value) {
  const normalized = String(value ?? '').replace(/\u00a0/g, ' ').trim().toLowerCase()
  if (!normalized) return { kind: 'blank', treatment: '', label: 'Skipped — blank' }
  if (['yes', 'full', 'fully inherited'].includes(normalized)) return { kind: 'mapped', treatment: 'Full', label: 'Full' }
  if (['partial', 'shared'].includes(normalized)) return { kind: 'mapped', treatment: 'Partial', label: 'Partial' }
  if (['no', 'none', 'not inherited', 'tenant', 'tenant responsibility', 'n/a'].includes(normalized)) {
    return { kind: 'none', treatment: 'tenant', label: 'No inheritance' }
  }
  return { kind: 'review', treatment: 'review', label: 'Needs review' }
}

function splitClipboardRow(line) {
  if (line.includes('\t')) {
    const columns = line.split('\t')
    return [columns[0] ?? '', columns.slice(1).join(' ').trim()]
  }

  const comma = line.match(/^\s*("[^"]+"|[^,]+?)\s*,\s*(.*?)\s*$/)
  if (comma) return [comma[1].replace(/^"|"$/g, ''), comma[2].replace(/^"|"$/g, '')]

  const statusMatch = line.match(STATUS_AT_END_RE)
  if (statusMatch) return [statusMatch[1], statusMatch[2]]
  return [line, '']
}

export function parseCrmBulkText(value) {
  const seen = new Set()
  const rows = []
  const lines = String(value ?? '').replace(/\r\n?/g, '\n').split('\n')

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex].replace(/\u00a0/g, ' ').trim()
    if (!line) continue

    const [rawControlValue, rawStatusValue] = splitClipboardRow(line)
    const rawControl = rawControlValue.trim()
    const rawStatus = rawStatusValue.trim()
    if (HEADER_RE.test(rawControl)) continue

    const normalizedControl = normalizeCrmControlId(rawControl)
    const normalizedStatus = normalizeCrmInheritanceStatus(rawStatus)
    const candidates = normalizedControl ? findCrosswalkCandidates([normalizedControl]) : []
    const duplicateKey = `${normalizedControl}|${normalizedStatus.treatment || normalizedStatus.kind}`
    const duplicate = normalizedControl ? seen.has(duplicateKey) : false
    if (normalizedControl) seen.add(duplicateKey)

    let outcome = normalizedStatus.kind
    if (!normalizedControl) outcome = 'invalid'
    else if (duplicate) outcome = 'duplicate'
    else if (normalizedStatus.kind === 'mapped' && candidates.length === 0) outcome = 'unmatched'

    rows.push({
      id: `crm-import-${lineIndex + 1}`,
      lineNumber: lineIndex + 1,
      rawControl,
      rawStatus,
      normalizedControl,
      treatment: normalizedStatus.treatment,
      statusLabel: normalizedStatus.label,
      candidates,
      outcome,
      selectable: outcome === 'mapped' && candidates.length > 0,
    })
  }

  return rows
}

export function buildCrmBulkAssignments(rows, selectedIds) {
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds ?? [])
  const byRequirement = new Map()

  for (const row of rows ?? []) {
    if (!row.selectable || !selected.has(row.id)) continue
    for (const candidate of row.candidates) {
      const current = byRequirement.get(candidate.requirement) ?? {
        requirement: candidate.requirement,
        treatment: 'Full',
        sourceRows: [],
      }
      if (row.treatment === 'Partial') current.treatment = 'Partial'
      current.sourceRows.push(row.id)
      byRequirement.set(candidate.requirement, current)
    }
  }

  return [...byRequirement.values()].sort((a, b) => a.requirement.localeCompare(b.requirement, undefined, { numeric: true }))
}

export function summarizeCrmBulkRows(rows) {
  const summary = { total: 0, ready: 0, unmatched: 0, review: 0, skipped: 0 }
  for (const row of rows ?? []) {
    summary.total++
    if (row.selectable) summary.ready++
    else if (row.outcome === 'unmatched' || row.outcome === 'invalid') summary.unmatched++
    else if (row.outcome === 'review') summary.review++
    else summary.skipped++
  }
  return summary
}
