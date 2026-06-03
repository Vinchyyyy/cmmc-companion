import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import evidenceTypes from '../data/evidence/index.js'
import controls from '../data/controls/index.js'
import ControlLink from '../components/ControlLink.jsx'

const familyById = Object.fromEntries(
  controls.map((control) => [control.id, control.family])
)

function EvidenceLookup() {
  const [searchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') || ''

  const [search, setSearch] = useState(initialSearch)
  const [familyFilter, setFamilyFilter] = useState('All')

  const term = search.trim().toLowerCase()

  const matchesSearch = (ev) => {
    if (term === '') return true
    return (
      ev.name.toLowerCase().includes(term) ||
      ev.description.toLowerCase().includes(term) ||
      ev.reasoning.toLowerCase().includes(term) ||
      ev.likelyControls.some((id) => id.toLowerCase().includes(term))
    )
  }

  const matchesFamily = (ev) => {
    if (familyFilter === 'All') return true
    return ev.likelyControls.some((id) => familyById[id] === familyFilter)
  }

  const results = evidenceTypes.filter((ev) => matchesSearch(ev) && matchesFamily(ev))

  return (
    <div className="page">
      <h1>Evidence Lookup</h1>

      <div className="filter-row">
        <input
          type="text"
          placeholder="Search by name, description, reasoning, or control ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={familyFilter}
          onChange={(e) => setFamilyFilter(e.target.value)}
        >
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
        Showing {results.length} of {evidenceTypes.length} evidence types
      </p>

      {results.length === 0 ? (
        <p className="muted">No matching evidence types found.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {results.map((ev) => (
            <li key={ev.name} className="card">
              <h2 style={{ marginTop: 0 }}>{ev.name}</h2>
              <p>{ev.description}</p>
              <p>
                <strong>Likely Controls:</strong>{' '}
                {ev.likelyControls.map((id, i) => (
                  <span key={id}>
                    <ControlLink id={id} />
                    {i < ev.likelyControls.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
              <p style={{ marginBottom: 0 }}>
                <strong>Reasoning:</strong> {ev.reasoning}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default EvidenceLookup
