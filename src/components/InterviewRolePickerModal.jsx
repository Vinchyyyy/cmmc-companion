import { useState, useEffect, useRef } from 'react'
import useFocusTrap from './useFocusTrap'
import { INTERVIEW_ROLE_CATEGORIES } from '../data/interviewRoles'

function filterCategories(query) {
  const q = query.toLowerCase().trim()
  return INTERVIEW_ROLE_CATEGORIES.map((cat) => ({
    ...cat,
    roles: cat.roles.filter(
      (role) =>
        role.label.toLowerCase().includes(q) ||
        role.aliases.some((a) => a.toLowerCase().includes(q))
    ),
  })).filter((cat) => cat.roles.length > 0)
}

export default function InterviewRolePickerModal({ currentRoles, onSave, onClose }) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true)

  const [selected, setSelected] = useState(() => new Set(currentRoles ?? []))
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const toggleRole = (label) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const visibleCategories = query.trim() ? filterCategories(query) : INTERVIEW_ROLE_CATEGORIES

  return (
    <div
      className="cd-edit-modal-overlay cd-role-picker-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-picker-title"
    >
      <div className="cd-edit-modal cd-role-picker-modal" ref={modalRef}>
        <div className="cd-edit-modal-header">
          <span id="role-picker-title" className="cd-edit-modal-title">Add Interviewed Role / Title</span>
          <button type="button" className="cd-edit-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="cd-edit-modal-body cd-role-picker-body">
          {/* Search */}
          <input
            type="text"
            className="cd-role-picker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search roles… (e.g. sysadmin, isso, ciso)"
            autoFocus
          />

          {/* Selected chips */}
          {selected.size > 0 && (
            <div className="cd-role-picker-selected">
              <span className="cd-role-picker-selected-label">Selected ({selected.size}):</span>
              <div className="cd-role-picker-selected-chips">
                {[...selected].map((label) => (
                  <span key={label} className="cd-role-selected-chip">
                    {label}
                    <button
                      type="button"
                      className="cd-role-selected-chip-remove"
                      onClick={() => toggleRole(label)}
                      aria-label={`Remove ${label}`}
                    >×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Role list */}
          <div className="cd-role-picker-list">
            {visibleCategories.length === 0 ? (
              <p className="cd-role-picker-empty">No roles match &ldquo;{query}&rdquo;.</p>
            ) : (
              visibleCategories.map((cat) => (
                <div key={cat.category} className="cd-role-picker-category">
                  <div className="cd-role-picker-category-label">{cat.category}</div>
                  <div className="cd-role-picker-roles">
                    {cat.roles.map((role) => {
                      const isSelected = selected.has(role.label)
                      return (
                        <button
                          key={role.id}
                          type="button"
                          className={`cd-role-picker-btn${isSelected ? ' cd-role-picker-btn--selected' : ''}`}
                          onClick={() => toggleRole(role.label)}
                          aria-pressed={isSelected}
                        >
                          {isSelected && <span className="cd-role-picker-btn-check" aria-hidden="true">✓ </span>}
                          {role.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="cd-edit-modal-footer">
          <button type="button" className="cd-edit-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="cd-edit-btn-primary"
            onClick={() => onSave([...selected])}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
