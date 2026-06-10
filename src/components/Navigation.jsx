import { NavLink } from 'react-router-dom'

function Navigation() {
  return (
    <nav className="nav">
      <NavLink to="/" end>Home</NavLink>
      <NavLink to="/controls">Control Library</NavLink>
      <NavLink to="/evidence">Evidence Lookup</NavLink>
      <NavLink to="/relationships">Relationship Explorer</NavLink>
      <NavLink to="/artifact-map">Artifact Map</NavLink>
      <NavLink to="/about">About</NavLink>
      <NavLink to="/faq">FAQ</NavLink>
      <NavLink to="/changelog">Changelog</NavLink>
    </nav>
  )
}

export default Navigation
