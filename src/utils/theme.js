export const THEME_KEY    = 'cmmc-theme'
export const THEME_LIGHT  = 'light'
export const THEME_DARK   = 'dark'
export const THEME_DEFAULT = THEME_LIGHT

export function readTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === THEME_DARK ? THEME_DARK : THEME_LIGHT
  } catch {
    return THEME_DEFAULT
  }
}

export function writeTheme(value) {
  try {
    localStorage.setItem(THEME_KEY, value)
  } catch {
    // localStorage unavailable — proceed silently
  }
}

export function applyTheme(value) {
  document.documentElement.dataset.theme = value
}
