const OSC_KEY        = 'cmmc-export-osc'
const ASSESSMENT_KEY = 'cmmc-export-assessment'
const LAST_BACKUP_KEY = 'cmmc-last-backup'

export function readLastBackup() {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY) ?? null
  } catch {
    return null
  }
}

export function writeLastBackup() {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
  } catch {
    // localStorage unavailable — proceed silently
  }
}

export function formatLastBackup(isoString) {
  if (!isoString) return 'Never'
  try {
    return new Date(isoString).toLocaleString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  } catch {
    return 'Unknown'
  }
}

export function readExportMeta() {
  try {
    return {
      osc:        localStorage.getItem(OSC_KEY)        ?? '',
      assessment: localStorage.getItem(ASSESSMENT_KEY) ?? '',
    }
  } catch {
    return { osc: '', assessment: '' }
  }
}

export function writeExportMeta(osc, assessment) {
  try {
    localStorage.setItem(OSC_KEY,        osc)
    localStorage.setItem(ASSESSMENT_KEY, assessment)
  } catch {
    // localStorage unavailable — proceed silently
  }
}

// Sanitize a user-supplied name segment for use in a filename:
//   - strip characters that are unsafe in filenames (keep alphanumeric, space, hyphen, underscore)
//   - collapse whitespace to underscores
//   - collapse repeated underscores
//   - trim leading/trailing underscores
function sanitizeSegment(s) {
  return String(s ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function pad2(n) { return String(n).padStart(2, '0') }

// Build an export filename from optional OSC and assessment name.
// Timestamp uses local browser time in YYYY-MM-DD_HHMM format.
//
// suffix: 'AssessmentProgress' | 'ProjectBackup'
// ext:    'csv' | 'json'
//
// Examples:
//   ('Acme Corp', 'Q2 2026', 'AssessmentProgress', 'csv')
//     → 'Acme_Corp_Q2_2026_AssessmentProgress_2026-06-03_1642.csv'
//   ('Acme Corp', '', 'ProjectBackup', 'json')
//     → 'Acme_Corp_ProjectBackup_2026-06-03_1642.json'
//   ('', '', 'AssessmentProgress', 'csv')
//     → 'CMMC_Companion_AssessmentProgress_2026-06-03_1642.csv'
export function buildExportFilename(osc, assessment, suffix, ext) {
  const now  = new Date()
  const date = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
  const hhmm = `${pad2(now.getHours())}${pad2(now.getMinutes())}`
  const ts   = `${date}_${hhmm}`

  const cleanOsc        = sanitizeSegment(osc)
  const cleanAssessment = sanitizeSegment(assessment)

  if (!cleanOsc) {
    return `CMMC_Companion_${suffix}_${ts}.${ext}`
  }

  const parts = [cleanOsc]
  if (cleanAssessment) parts.push(cleanAssessment)
  parts.push(suffix, ts)

  return parts.join('_') + '.' + ext
}
