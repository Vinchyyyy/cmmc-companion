const STORAGE_PREFIX = 'cmmc-date-assessed-'

function normalizeDate(value) {
  const trimmed = String(value ?? '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!match) return ''
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
    ? trimmed
    : ''
}

export function readDateAssessed(controlId) {
  if (!controlId) return ''
  try {
    return normalizeDate(localStorage.getItem(`${STORAGE_PREFIX}${controlId}`))
  } catch {
    return ''
  }
}

export function writeDateAssessed(controlId, value) {
  if (!controlId) return
  const normalized = normalizeDate(value)
  try {
    if (normalized) localStorage.setItem(`${STORAGE_PREFIX}${controlId}`, normalized)
    else localStorage.removeItem(`${STORAGE_PREFIX}${controlId}`)
  } catch {
    // localStorage may be unavailable.
  }
}

export function formatDateAssessed(value) {
  const normalized = normalizeDate(value)
  if (!normalized) return ''
  const [year, month, day] = normalized.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

// Convert an ISO calendar date into Excel's default 1900-date-system serial.
export function dateAssessedToExcelSerial(value) {
  const normalized = normalizeDate(value)
  if (!normalized) return ''
  const [year, month, day] = normalized.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000) + 25569
}
