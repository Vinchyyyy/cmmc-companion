// Shared status utility for CMMC control assessment tracking.
// All status-related logic lives here so the three pages that need it
// (ControlDetail, ControlLibrary, Home) stay in sync automatically.

const STORAGE_PREFIX = 'cmmc-status-'

export const STATUSES = ['Not Started', 'In Progress', 'MET', 'NOT MET']

export const DEFAULT_STATUS = 'Not Started'

// Hex color values — kept for any consumer that still wants them
// (CSV export coloring, charts, etc.). Pages now prefer STATUS_BADGE_CLASS.
export const STATUS_COLORS = {
  'MET': '#1a7f37',
  'NOT MET': '#c92a2a',
  'In Progress': '#d97706',
  'Not Started': '#6b7280',
}

// Map status -> CSS class name used by the .status-badge component in
// styles.css. Lets pages render <span className={`status-badge ${cls}`}>
// instead of inline style hex values.
export const STATUS_BADGE_CLASS = {
  'MET': 'status-badge--met',
  'NOT MET': 'status-badge--not-met',
  'In Progress': 'status-badge--in-progress',
  'Not Started': 'status-badge--not-started',
}

export function readStatus(controlId) {
  if (!controlId) return DEFAULT_STATUS
  try {
    const value = localStorage.getItem(`${STORAGE_PREFIX}${controlId}`)
    return STATUSES.includes(value) ? value : DEFAULT_STATUS
  } catch {
    return DEFAULT_STATUS
  }
}

export function writeStatus(controlId, value) {
  if (!controlId) return
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${controlId}`, value)
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}
