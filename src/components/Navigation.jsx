import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { THEME_LIGHT, THEME_DARK, readTheme, writeTheme, applyTheme } from '../utils/theme'

function Navigation() {
  const [theme, setTheme] = useState(() => readTheme())

  const toggleTheme = () => {
    const next = theme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT
    writeTheme(next)
    applyTheme(next)
    setTheme(next)
  }

  return (
    <nav className="nav">
      <NavLink to="/" end>Home</NavLink>
      <NavLink to="/controls">Control Library</NavLink>
      <NavLink to="/evidence">Evidence Lookup</NavLink>
      <NavLink to="/relationships">Relationship Explorer</NavLink>
      <NavLink to="/about">About</NavLink>
      <NavLink to="/changelog">Changelog</NavLink>
      <button
        className="nav-theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === THEME_LIGHT ? 'Switch to dark mode' : 'Switch to light mode'}
        title={theme === THEME_LIGHT ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === THEME_LIGHT ? 'Dark' : 'Light'}
      </button>
    </nav>
  )
}

export default Navigation
