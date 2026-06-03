import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import controls from '../data/controls/index.js'
import relationships from '../data/relationships/index.js'
import evidenceTypes from '../data/evidence/index.js'
import ControlLink from '../components/ControlLink.jsx'
import { compareIds } from '../utils/sort'

function RelationshipExplorer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('control') || ''

  const [search, setSearch] = useState('')
  const [familyFilter, setFamilyFilter] = useState('All')

  useEffect(() => {
    if (selectedId && !controls.find((c) => c.id === selectedId)) {
      setSearchParams({})
    }
  }, [selectedId, setSearchParams])

  const handleChange = (e) => {
    const value = e.target.value
    if (value) setSearchParams({ control: value })
    else setSearchParams({})
  }

  const term = search.trim().toLowerCase()

  const matchesSearch = (c) => {
    if (term === '') return true
    return (
      c.id.toLowerCase().includes(term) ||
      c.title.toLowerCase().includes(term) ||
      c.plainEnglish.toLowerCase().includes(term)
    )
  }

  const matchesFamily = (c) =>
    familyFilter === 'All' || c.family === familyFilter

  const filteredControls = controls
    .filter((c) => matchesSearch(c) && matchesFamily(c))
    .slice()
    .sort(compareIds)

  const selectedControl = controls.find((c) => c.id === selectedId)
  const dropdownOptions =
    selectedControl && !filteredControls.find((c) => c.id === selectedId)
      ? [selectedControl, ...filteredControls]
      : filteredControls

  const getControl = (id) => controls.find((c) => c.id === id)

  const sortByOtherControl = (items, key) =>
    items.slice().sort((a, b) => compareIds(a[key], b[key]))

  const prerequisites = selectedId
    ? sortByOtherControl(
        relationships.filter((r) => r.targetControl === selectedId && r.relationshipType === 'prerequisite'),
        'sourceControl'
      )
    : []

  const supports = selectedId
    ? sortByOtherControl(
        relationships.filter((r) => r.sourceControl === selectedId && r.relationshipType === 'supports'),
        'targetControl'
      )
    : []

  const supportedBy = selectedId
    ? sortByOtherControl(
        relationships.filter((r) => r.targetControl === selectedId && r.relationshipType === 'supports'),
        'sourceControl'
      )
    : []

  const supportingEvidence = selectedId
    ? evidenceTypes.filter((e) => e.likelyControls.includes(selectedId))
    : []

  const renderRelList = (items, otherKey) => {
    if (items.length === 0) return <p className="muted">None.</p>
    return (
      <ul>
        {items.map((r, i) => {
          const otherId = r[otherKey]
          const other = getControl(otherId)
          return (
            <li key={i}>
              <strong>
                <ControlLink id={otherId} />
                {' — '}{other ? other.title : '(unknown)'}
              </strong>
              <p>{r.reasoning}</p>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="page">
      <h1>Relationship Explorer</h1>

      <div className="filter-row">
        <input
          type="text"
          placeholder="Search by ID, title, or plain English..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)}>
          <option value="All">All families</option>
          <option value="Access Control">Access Control</option>
          <option value="Awareness and Training">Awareness and Training</option>
          <option value="Audit and Accountability">Audit &amp; Accountability</option>
          <option value="Configuration Management">Configuration Management</option>
          <option value="Identification and Authentication">Identification &amp; Authentication</option>
          <option value="Incident Response">Incident Response</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Media Protection">Media Protection</option>
          <option value="Personnel Security">Personnel Security</option>
          <option value="Physical Protection">Physical Protection</option>
          <option value="Risk Assessment">Risk Assessment</option>
          <option value="Security Assessment">Security Assessment</option>
          <option value="System and Communications Protection">System &amp; Communications Protection</option>
          <option value="System and Information Integrity">System and Information Integrity</option>
        </select>
      </div>

      <p className="result-count">
        Showing {filteredControls.length} of {controls.length} controls
      </p>

      <div className="card">
        <label>
          <strong>Select a control:</strong>{' '}
          <select value={selectedId} onChange={handleChange}>
            <option value="">— Choose a control —</option>
            {dropdownOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedId && (
        <>
          <p>
            <Link to={`/controls/${selectedId}`}>
              View {selectedId} detail page →
            </Link>
          </p>
          <section>
            <h2>Prerequisites</h2>
            <p className="muted">Controls that must be in place before this one can function.</p>
            {renderRelList(prerequisites, 'sourceControl')}
          </section>
          <section>
            <h2>Supports</h2>
            <p className="muted">Other controls that benefit when this one is implemented well.</p>
            {renderRelList(supports, 'targetControl')}
          </section>
          <section>
            <h2>Supported By</h2>
            <p className="muted">Other controls that strengthen this one when implemented well.</p>
            {renderRelList(supportedBy, 'sourceControl')}
          </section>
          <section>
            <h2>Supporting Evidence</h2>
            <p className="muted">Evidence types that demonstrate compliance with this control.</p>
            {supportingEvidence.length === 0 ? (
              <p className="muted">None.</p>
            ) : (
              <ul>
                {supportingEvidence.map((e) => (
                  <li key={e.name}>
                    <strong>{e.name}</strong>
                    <p>{e.reasoning}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default RelationshipExplorer
