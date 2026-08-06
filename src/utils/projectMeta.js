const STORAGE_KEY = 'cmmc-project-meta'

export const DEFAULT_PROJECT_META = {
  oscName: '',
}

export function readProjectMeta() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // Carry forward the OSC name saved by pre-v5 export dialogs. Once the
      // project metadata key exists (including an intentionally blank name),
      // it becomes authoritative.
      return { oscName: localStorage.getItem('cmmc-export-osc') ?? '' }
    }
    const parsed = JSON.parse(raw)
    return {
      oscName: typeof parsed?.oscName === 'string' ? parsed.oscName : '',
    }
  } catch {
    return { ...DEFAULT_PROJECT_META }
  }
}

export function writeProjectMeta(meta) {
  const normalized = {
    oscName: typeof meta?.oscName === 'string' ? meta.oscName : '',
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // localStorage unavailable — proceed silently
  }
  return normalized
}
