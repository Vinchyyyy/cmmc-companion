import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, FileText, GitBranch, ShieldCheck, Archive, Info, History,
  Settings as SettingsIcon,
} from 'lucide-react'

const navItems = [
  { label: 'Home', to: '/', icon: LayoutDashboard, match: (p) => p === '/' },
  { label: 'Control Library', to: '/controls', icon: BookOpen, match: (p) => p.startsWith('/controls') },
  { label: 'Evidence Library', to: '/evidence', icon: FileText, match: (p) => p.startsWith('/evidence') },
  { label: 'Relationship Explorer', to: '/relationships', icon: GitBranch, match: (p) => p.startsWith('/relationships') },
  { label: 'DIBCAC Mode', to: '/dibcac-mode', icon: ShieldCheck, match: (p) => p.startsWith('/dibcac-mode') },
  { label: 'Documented Artifacts', to: '/artifact-map', icon: Archive, match: (p) => p.startsWith('/artifact-map') },
  { label: 'About', to: '/about', icon: Info, match: (p) => p.startsWith('/about') || p.startsWith('/faq') },
  { label: 'Changelog', to: '/changelog', icon: History, match: (p) => p.startsWith('/changelog') },
  { label: 'Settings', to: '/settings', icon: SettingsIcon, match: (p) => p.startsWith('/settings') },
]

// Shared violet dark sidebar for every redesigned page (Home, Control Library,
// Control Detail, …). Active item is derived from the current route so each
// page doesn't have to duplicate the nav list or active-state logic.
function DashSidebar() {
  const location = useLocation()
  return (
    <aside className="dash-sidebar">
      <div className="dash-brand">
        <div className="dash-brand-icon">CC</div>
        <div>
          <div className="dash-brand-title">CMMC Companion</div>
          <div className="dash-brand-subtitle">Assessment Workspace</div>
        </div>
      </div>
      <nav className="dash-nav">
        {navItems.map((item) => {
          const active = item.match(location.pathname)
          return (
            <Link
              key={item.label}
              to={item.to}
              className="dash-nav-item"
              style={active ? { background: 'linear-gradient(135deg, var(--dash-accent) 0%, var(--dash-accent2) 100%)', color: '#fff' } : {}}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export default DashSidebar
