import { useState, useEffect, useRef, useMemo } from 'react'
import useFocusTrap from './useFocusTrap'
import { INTERVIEW_ROLE_CATEGORIES } from '../data/interviewRoles'
import { readCustomInterviewRoles, addCustomInterviewRole, removeCustomInterviewRole } from '../utils/customInterviewRoles'

function filterCategories(categories, query) {
  const q = query.toLowerCase().trim()
  return categories.map((cat) => ({
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
  const [customRoles, setCustomRoles] = useState(() => readCustomInterviewRoles())
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customInput, setCustomInput] = useState('')

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

  const handleAddCustom = () => {
    const trimmed = customInput.trim()
    if (!trimmed) return
    const updated = addCustomInterviewRole(trimmed)
    setCustomRoles(updated)
    const stored = updated.find((r) => r.toLowerCase() === trimmed.toLowerCase()) ?? trimmed
    setSelected((prev) => new Set(prev).add(stored))
    setCustomInput('')
    setShowCustomInput(false)
  }

  const handleRemoveCustom = (label) => {
    setCustomRoles(removeCustomInterviewRole(label))
  }

  const allCategories = useMemo(() => {
    if (customRoles.length === 0) return INTERVIEW_ROLE_CATEGORIES
    return [
      ...INTERVIEW_ROLE_CATEGORIES,
      {
        category: 'Custom',
        roles: customRoles.map((r) => ({ id: `custom-${r.toLowerCase()}`, label: r, aliases: [] })),
      },
    ]
  }, [customRoles])

  const visibleCategories = query.trim() ? filterCategories(allCategories, query) : allCategories

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
                      const isCustom = cat.category === 'Custom'
                      return (
                        <span key={role.id} className="cd-role-picker-btn-wrap">
                          <button
                            type="button"
                            className={`cd-role-picker-btn${isSelected ? ' cd-role-picker-btn--selected' : ''}`}
                            onClick={() => toggleRole(role.label)}
                            aria-pressed={isSelected}
                          >
                            {isSelected && <span className="cd-role-picker-btn-check" aria-hidden="true">✓ </span>}
                            {role.label}
                          </button>
                          {isCustom && (
                            <button
                              type="button"
                              className="cd-role-picker-custom-remove"
                              onClick={() => handleRemoveCustom(role.label)}
                              aria-label={`Remove ${role.label} from custom roles`}
                              title="Remove from custom roles"
                            >×</button>
                          )}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="cd-role-picker-custom-add">
            {showCustomInput ? (
              <div className="cd-role-picker-custom-input-row">
                <input
                  type="text"
                  className="cd-role-picker-custom-input"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddCustom() }
                    if (e.key === 'Escape') { setShowCustomInput(false); setCustomInput('') }
                  }}
                  placeholder="e.g. Cloud Administrator"
                  autoFocus
                />
                <button
                  type="button"
                  className="cd-edit-btn-primary cd-role-picker-custom-add-btn"
                  onClick={handleAddCustom}
                  disabled={!customInput.trim()}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="cd-edit-btn-secondary"
                  onClick={() => { setShowCustomInput(false); setCustomInput('') }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="cd-role-picker-custom-toggle"
                onClick={() => setShowCustomInput(true)}
              >
                + Enter Custom Role
              </button>
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
