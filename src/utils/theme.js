import { safeSetItem } from './storageWrite.js'

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
  safeSetItem(THEME_KEY, value)
}

export function applyTheme(value) {
  document.documentElement.dataset.theme = value
}
