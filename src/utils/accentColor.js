export const ACCENT_KEY = 'cmmc-accent-color'
export const ACCENT_DEFAULT = 'violet'

export const ACCENT_PALETTES = [
  { value: 'violet',  label: 'Violet',  accent: '#7C5CFC', accent2: '#A78BFA', soft: '#221D3D' },
  { value: 'blue',    label: 'Blue',    accent: '#4C8DFF', accent2: '#7FB0FF', soft: '#182740' },
  { value: 'emerald', label: 'Emerald', accent: '#10B981', accent2: '#5EEAD4', soft: '#0F2A24' },
  { value: 'rose',    label: 'Rose',    accent: '#F43F5E', accent2: '#FB7185', soft: '#3A1620' },
  { value: 'gold',    label: 'Gold',    accent: '#D4A017', accent2: '#F0C55E', soft: '#332708' },
  { value: 'cyan',    label: 'Cyan',    accent: '#22D3EE', accent2: '#67E8F9', soft: '#0F2C33' },
]

const VALID = new Set(ACCENT_PALETTES.map((p) => p.value))

export function readAccent() {
  try {
    const stored = localStorage.getItem(ACCENT_KEY)
    return VALID.has(stored) ? stored : ACCENT_DEFAULT
  } catch {
    return ACCENT_DEFAULT
  }
}

export function writeAccent(value) {
  try {
    localStorage.setItem(ACCENT_KEY, value)
  } catch {
    // localStorage unavailable — proceed silently
  }
}

// Sets the three root-level override variables that --dash-accent / --dash-accent2
// / --dash-accent-soft fall back to (see .dash-root in styles.css), so every
// redesigned page picks up the new accent without a per-page rebuild.
export function applyAccent(value) {
  const p = ACCENT_PALETTES.find((a) => a.value === value) ?? ACCENT_PALETTES[0]
  const root = document.documentElement.style
  root.setProperty('--user-accent', p.accent)
  root.setProperty('--user-accent2', p.accent2)
  root.setProperty('--user-accent-soft', p.soft)
}
