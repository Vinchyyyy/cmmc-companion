export const PALETTE_KEY     = 'cmmc-theme-palette'
export const PALETTE_DEFAULT = 'midnight'

export const PALETTES = [
  { value: 'midnight',     label: 'Midnight',     swatches: ['#0d1117', '#161b22', '#58a6ff', '#30363d'] },
  { value: 'pure-black',   label: 'Pure Black',   swatches: ['#000000', '#0a0a0a', '#4a95f0', '#222222'] },
  { value: 'slate-blue',   label: 'Slate Blue',   swatches: ['#0e1520', '#162030', '#5090d8', '#2a3850'] },
  { value: 'sage',         label: 'Sage',         swatches: ['#0f1510', '#161e18', '#6a9872', '#2a3830'] },
  { value: 'warm-neutral', label: 'Warm Neutral', swatches: ['#141210', '#1e1c18', '#b89060', '#363028'] },
  { value: 'soft-mauve',   label: 'Soft Mauve',   swatches: ['#130f14', '#1c1620', '#9878c0', '#332838'] },
]

const VALID = new Set(PALETTES.map((p) => p.value))

export function readPalette() {
  try {
    const stored = localStorage.getItem(PALETTE_KEY)
    return VALID.has(stored) ? stored : PALETTE_DEFAULT
  } catch {
    return PALETTE_DEFAULT
  }
}

export function writePalette(value) {
  try {
    localStorage.setItem(PALETTE_KEY, value)
  } catch {
    // localStorage unavailable — proceed silently
  }
}

export function applyPalette(value) {
  document.documentElement.dataset.themePalette = VALID.has(value) ? value : PALETTE_DEFAULT
}
