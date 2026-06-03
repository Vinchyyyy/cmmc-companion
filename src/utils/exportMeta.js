const OSC_KEY        = 'cmmc-export-osc'
const ASSESSMENT_KEY = 'cmmc-export-assessment'

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

// Build an export filename from optional OSC and assessment name.
//
// suffix: 'AssessmentProgress' | 'ProjectBackup'
// ext:    'csv' | 'json'
//
// Examples:
//   ('Acme Corp', 'Q2 2026', 'AssessmentProgress', 'csv')
//     → 'Acme_Corp_Q2_2026_AssessmentProgress_2026-06-03.csv'
//   ('Acme Corp', '', 'ProjectBackup', 'json')
//     → 'Acme_Corp_ProjectBackup_2026-06-03.json'
//   ('', '', 'AssessmentProgress', 'csv')
//     → 'CMMC_Companion_AssessmentProgress_2026-06-03.csv'
export function buildExportFilename(osc, assessment, suffix, ext) {
  const date           = new Date().toISOString().split('T')[0]
  const cleanOsc       = sanitizeSegment(osc)
  const cleanAssessment = sanitizeSegment(assessment)

  if (!cleanOsc) {
    return `CMMC_Companion_${suffix}_${date}.${ext}`
  }

  const parts = [cleanOsc]
  if (cleanAssessment) parts.push(cleanAssessment)
  parts.push(suffix, date)

  return parts.join('_') + '.' + ext
}
