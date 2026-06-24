import { NavLink } from 'react-router-dom'

function Navigation() {
  return (
    <nav className="nav">
      <NavLink to="/" end>Home</NavLink>
      <NavLink to="/controls">Control Library</NavLink>
      <NavLink to="/evidence">Evidence Library</NavLink>
      <NavLink to="/relationships">Relationship Explorer</NavLink>
      <NavLink to="/dibcac-mode">DIBCAC Mode</NavLink>
      <NavLink to="/artifact-map">Documented Artifacts</NavLink>
      <NavLink to="/about">About</NavLink>
      <NavLink to="/changelog">Changelog</NavLink>
    </nav>
  )
}

export default Navigation
