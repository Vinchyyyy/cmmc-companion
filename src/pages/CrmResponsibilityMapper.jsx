import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ClipboardPaste, FileSpreadsheet, Plus, Trash2, TriangleAlert } from 'lucide-react'
import DashSidebar from '../components/DashSidebar.jsx'
import CrmBulkImportModal from '../components/CrmBulkImportModal.jsx'
import controls from '../data/controls/index.js'
import {
  findCrosswalkCandidates,
  NIST53_CROSSWALK_ROWS,
  NIST53_PICKER_OPTIONS,
  nist53Title,
  parseNist53Controls,
} from '../data/nist53Crosswalk.js'
import {
  addInheritanceSourceToObjectives,
  readInheritanceSources,
  writeInheritance,
  writeInheritanceSources,
} from '../utils/inheritance.js'
import { readOscProfile, writeOscProfile } from '../utils/oscProfile.js'

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

const EXAMPLES = [
  {
    sourceSection: 'FedRAMP Tenant Responsibility',
    rawControls: 'AC-2 (1), AC-2 (3), AC-2 (7), AC-2 (12)',
    controlTitle: 'Account Management',
    narrative: "Application-level accounts are managed by tenants using the application's built-in user management system and any external authentication systems.",
    responsibility: 'tenant',
    treatment: 'tenant',
  },
  {
    sourceSection: 'FedRAMP Tenant Responsibility',
    rawControls: 'AC-2 (4)',
    controlTitle: 'Account Management',
    narrative: 'At the application level, the Audit History function records account creation, modification, enabling, disabling, and removal actions.',
    responsibility: 'shared',
    treatment: 'Partial',
  },
]

function createMapping(values = {}) {
  const rawControls = values.rawControls ?? ''
  const parsed = parseNist53Controls(rawControls)
  return {
    id: makeId(), sourceSection: '', rawControls, controls: parsed, controlTitle: '', narrative: '',
    responsibility: 'review', treatment: 'review',
    selectedRequirements: findCrosswalkCandidates(parsed).map((candidate) => candidate.requirement),
    appliedRequirements: [], appliedAt: '', ...values,
  }
}

function findAppControl(requirement) {
  return controls.find((control) => control.id.endsWith(`-${requirement}`))
}

function MappingCard({ mapping, providerName, onChange, onRemove }) {
  const [controlSearch, setControlSearch] = useState('')
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef(null)

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!pickerRef.current?.contains(event.target)) setPickerOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [])
  const candidates = useMemo(() => findCrosswalkCandidates(mapping.controls), [mapping.controls])
  const suggestions = useMemo(() => {
    const term = controlSearch.trim().toLowerCase()
    if (!term) return []
    const compactTerm = term.replace(/[\s-]+/g, '')
    return NIST53_PICKER_OPTIONS
      .filter((id) => multiSelectMode || !mapping.controls.includes(id))
      .filter((id) => {
        const searchable = `${id} ${nist53Title(id)}`.toLowerCase()
        return searchable.includes(term) || searchable.replace(/[\s-]+/g, '').includes(compactTerm)
      })
      .slice(0, 40)
  }, [controlSearch, mapping.controls, multiSelectMode])

  const updateControls = (rawControls) => {
    const parsed = parseNist53Controls(rawControls)
    const nextCandidates = findCrosswalkCandidates(parsed).map((candidate) => candidate.requirement)
    onChange({ ...mapping, rawControls, controls: parsed, selectedRequirements: nextCandidates, appliedAt: '', appliedRequirements: [] })
  }

  const addControl = (id) => {
    const alreadySelected = mapping.controls.includes(id)
    const next = alreadySelected ? mapping.controls.filter((value) => value !== id) : [...mapping.controls, id]
    updateControls(next.join(', '))
    if (!multiSelectMode) setControlSearch('')
  }

  const removeControl = (id) => updateControls(mapping.controls.filter((value) => value !== id).join(', '))
  const selected = new Set(mapping.selectedRequirements)
  const canApply = providerName.trim() && mapping.narrative.trim() && mapping.selectedRequirements.length > 0 && mapping.treatment !== 'review'

  const setResponsibility = (responsibility) => {
    const treatment = responsibility === 'tenant' ? 'tenant' : responsibility === 'review' ? 'review' : 'Partial'
    onChange({ ...mapping, responsibility, treatment, appliedAt: '', appliedRequirements: [] })
  }

  const apply = () => {
    if (!canApply) return
    if (mapping.treatment === 'Partial' || mapping.treatment === 'Full') {
      for (const requirement of mapping.selectedRequirements) {
        const control = findAppControl(requirement)
        if (!control) continue
        writeInheritance(control.id, mapping.treatment)
        const currentSources = readInheritanceSources(control.id)
        if (!currentSources.includes(providerName)) writeInheritanceSources(control.id, [...currentSources, providerName])
        addInheritanceSourceToObjectives(control, providerName)
      }
    }
    onChange({
      ...mapping,
      appliedRequirements: [...mapping.selectedRequirements],
      appliedAt: new Date().toISOString(),
    })
  }

  return (
    <article className="crm-map-card">
      <div className="crm-map-card__header">
        <div>
          <span className="crm-eyebrow">CRM responsibility row</span>
          <input
            className="crm-source-input"
            aria-label="CRM section heading"
            value={mapping.sourceSection}
            placeholder="e.g. FedRAMP Tenant Responsibility"
            onChange={(event) => onChange({ ...mapping, sourceSection: event.target.value, appliedAt: '' })}
          />
        </div>
        <button type="button" className="op-remove" onClick={onRemove}><Trash2 size={15} /> Remove</button>
      </div>

      <div className="crm-selected-controls">
        <div className="crm-selected-controls__heading"><span>Selected NIST SP 800-53 Controls</span><small>Titles are supplied from the official control catalog. Click a pill to remove it.</small></div>
        <div className="crm-token-row">
          {mapping.controls.length === 0 && <span className="crm-token-empty">No controls selected yet.</span>}
          {mapping.controls.map((id) => <button type="button" className="crm-token" key={id} onClick={() => removeControl(id)} title={`Remove ${id}`}><strong>{id}</strong><span>{nist53Title(id)}</span><b aria-hidden="true">×</b></button>)}
        </div>
      </div>
      <div
        ref={pickerRef}
        className="crm-control-picker"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPickerOpen(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setPickerOpen(false)
        }}
      >
        <div className="crm-picker-input-row">
          <input value={controlSearch} onFocus={() => setPickerOpen(true)} onChange={(event) => { setControlSearch(event.target.value); setPickerOpen(true) }} placeholder="Type AC-4, AC 4, AC4, or a title…" autoComplete="off" />
          <label className={`crm-multi-toggle${multiSelectMode ? ' active' : ''}`}>
            <input type="checkbox" checked={multiSelectMode} onChange={(event) => setMultiSelectMode(event.target.checked)} />
            Multi-select
          </label>
        </div>
        {pickerOpen && suggestions.length > 0 && (
          <div className="crm-suggestions" role="listbox" aria-label="Matching NIST SP 800-53 controls">
            <div className="crm-suggestions__summary">{suggestions.length} match{suggestions.length === 1 ? '' : 'es'}{multiSelectMode ? ' · click to toggle selections' : ''}</div>
            {suggestions.map((id) => {
              const isSelected = mapping.controls.includes(id)
              return <button type="button" role="option" aria-selected={isSelected} className={isSelected ? 'selected' : ''} key={id} onClick={() => addControl(id)}><strong>{id}</strong><span>{nist53Title(id)}{id.includes('(') ? ' enhancement' : ''}</span>{isSelected ? <Check size={14} /> : <Plus size={14} />}</button>
            })}
          </div>
        )}
        {pickerOpen && controlSearch.trim() && suggestions.length === 0 && <div className="crm-picker-empty">No catalog match. You can still paste or type the control directly in the field above.</div>}
      </div>

      <label className="op-field crm-narrative">
        <span>Provider / Tenant Responsibility Statement</span>
        <textarea value={mapping.narrative} placeholder="Paste the responsibility statement from the CRM…" onChange={(event) => onChange({ ...mapping, narrative: event.target.value, appliedAt: '' })} />
      </label>

      <div className="crm-classification">
        <label className="op-field"><span>Who Owns This Responsibility?</span><select value={mapping.responsibility} onChange={(event) => setResponsibility(event.target.value)}><option value="review">Unclear / Review</option><option value="tenant">OSC / Tenant</option><option value="provider">Provider</option><option value="shared">Shared</option></select></label>
        <label className="op-field"><span>Proposed Treatment</span><select value={mapping.treatment} onChange={(event) => onChange({ ...mapping, treatment: event.target.value, appliedAt: '' })}><option value="review">Review before applying</option><option value="tenant">Tenant responsibility — no inheritance</option><option value="Partial">Partial inheritance</option><option value="Full">Full inheritance</option></select></label>
      </div>

      <section className="crm-candidates">
        <div className="crm-candidates__header">
          <div><h3>Candidate NIST SP 800-171 Requirements</h3><p>Select what the CRM row actually supports. Candidates are suggestions from Appendix D, not automatic determinations.</p></div>
          <span>{mapping.selectedRequirements.length} selected</span>
        </div>
        {candidates.length === 0 ? (
          <div className="crm-no-match">No Appendix D candidate found for the entered control. Keep the row for review or add a different 800-53 control.</div>
        ) : candidates.map((candidate) => {
          const appControl = findAppControl(candidate.requirement)
          return (
            <label className="crm-candidate" key={candidate.requirement}>
              <input type="checkbox" checked={selected.has(candidate.requirement)} onChange={(event) => onChange({ ...mapping, selectedRequirements: event.target.checked ? [...mapping.selectedRequirements, candidate.requirement] : mapping.selectedRequirements.filter((value) => value !== candidate.requirement), appliedAt: '' })} />
              <span className="crm-candidate__id">{candidate.requirement}</span>
              <span className="crm-candidate__title">{appControl?.title ?? 'NIST SP 800-171 requirement'}</span>
              <span className={`crm-match ${candidate.evidence.some((item) => item.basis.startsWith('Parent')) ? 'crm-match--parent' : ''}`}>{candidate.evidence[0].basis}</span>
            </label>
          )
        })}
      </section>

      <div className="crm-apply-row">
        {!providerName.trim() && <span className="crm-validation">Name the provider in OSC Profile before applying inheritance.</span>}
        {mapping.appliedAt ? (
          <div className="crm-applied"><Check size={17} /> {mapping.treatment === 'tenant'
            ? `Tenant responsibility documented for ${mapping.appliedRequirements.length} requirement${mapping.appliedRequirements.length === 1 ? '' : 's'}; no provider inheritance applied.`
            : `Applied to ${mapping.appliedRequirements.length} requirement${mapping.appliedRequirements.length === 1 ? '' : 's'} and all of their objectives.`}</div>
        ) : (
          <button type="button" disabled={!canApply} onClick={apply}><Check size={16} /> {mapping.treatment === 'tenant' ? 'Document Tenant Mapping' : 'Apply Inheritance'}</button>
        )}
      </div>
    </article>
  )
}

function CrmResponsibilityMapper() {
  const { providerId } = useParams()
  const [profile, setProfile] = useState(readOscProfile)
  const [activeView, setActiveView] = useState('assign')
  const [referenceSearch, setReferenceSearch] = useState('')
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [bulkImportResult, setBulkImportResult] = useState(null)
  const provider = profile.providers.find((item) => item.id === providerId)

  if (!provider) return <Navigate to="/osc-profile?tab=providers" replace />

  const saveMappings = (mappings) => setProfile((current) => writeOscProfile({
    ...current,
    providers: current.providers.map((item) => item.id === providerId ? { ...item, crmMappings: mappings } : item),
  }))

  const updateMapping = (next) => saveMappings(provider.crmMappings.map((mapping) => mapping.id === next.id ? next : mapping))
  const loadExamples = () => saveMappings([...provider.crmMappings, ...EXAMPLES.map(createMapping)])
  const applyBulkImport = (selectedRows, assignments) => {
    const appliedAt = new Date().toISOString()
    const importedMappings = selectedRows.map((row) => createMapping({
      sourceSection: 'Bulk CRM import',
      rawControls: row.rawControl,
      controls: [row.normalizedControl],
      controlTitle: nist53Title(row.normalizedControl),
      narrative: `CRM inheritance value: ${row.rawStatus}`,
      responsibility: row.treatment === 'Full' ? 'provider' : 'shared',
      treatment: row.treatment,
      selectedRequirements: row.candidates.map((candidate) => candidate.requirement),
      appliedRequirements: row.candidates.map((candidate) => candidate.requirement),
      appliedAt,
    }))

    const importedKeys = new Set(importedMappings.map((mapping) => `${mapping.controls.join(',')}|${mapping.treatment}`))
    const retainedMappings = provider.crmMappings.filter((mapping) => (
      mapping.sourceSection !== 'Bulk CRM import' || !importedKeys.has(`${mapping.controls.join(',')}|${mapping.treatment}`)
    ))

    for (const assignment of assignments) {
      const control = findAppControl(assignment.requirement)
      if (!control) continue
      writeInheritance(control.id, assignment.treatment)
      const currentSources = readInheritanceSources(control.id)
      if (!currentSources.includes(provider.name)) writeInheritanceSources(control.id, [...currentSources, provider.name])
      addInheritanceSourceToObjectives(control, provider.name)
    }

    saveMappings([...retainedMappings, ...importedMappings])
    setBulkImportResult({ rows: selectedRows.length, assignments: assignments.length })
    setBulkImportOpen(false)
  }
  const filteredReference = NIST53_CROSSWALK_ROWS.filter((row) => {
    const control = findAppControl(row.requirement)
    return `${row.requirement} ${control?.title ?? ''} ${row.nist53Controls.join(' ')}`.toLowerCase().includes(referenceSearch.toLowerCase())
  })

  return (
    <div className="dash-root">
      <DashSidebar />
      <main className="dash-main op-page crm-page">
        <Link className="crm-back" to="/osc-profile?tab=providers"><ArrowLeft size={16} /> Back to Service Providers</Link>
        <header className="crm-header">
          <div><span className="crm-eyebrow">{provider.type || 'External Service Provider'}</span><h1>{provider.name || 'Unnamed Provider'} CRM Mapper</h1><p>Translate provider responsibility rows into reviewed CMMC inheritance assignments while preserving the original CRM language.</p></div>
          <div className="crm-provider-meta"><span>{provider.standardsAcceptance || 'Acceptance not specified'}</span><span>{provider.crmStatus} CRM</span></div>
        </header>

        <div className="crm-warning"><TriangleAlert size={18} /><div><strong>Crosswalk-assisted review</strong><span>Candidate requirements are derived from NIST SP 800-171 Rev. 2 Appendix D. An 800-53 match does not prove equivalence, scope, implementation, or assessment-objective coverage. Review the CRM narrative before applying inheritance.</span></div></div>

        <nav className="op-tabs crm-tabs"><button type="button" className={activeView === 'assign' ? 'active' : ''} onClick={() => setActiveView('assign')}>Responsibility Assignments</button><button type="button" className={activeView === 'reference' ? 'active' : ''} onClick={() => setActiveView('reference')}>Appendix D Reference</button></nav>

        {activeView === 'assign' && (
          <>
            <div className="crm-toolbar"><div><h2>CRM Responsibility Rows</h2><p>Enter rows individually or paste the Control ID and inheritance columns from a CRM.</p></div><div><button type="button" className="crm-secondary" onClick={loadExamples}><FileSpreadsheet size={16} /> Load 2 Examples</button><button type="button" className="crm-secondary" onClick={() => setBulkImportOpen(true)}><ClipboardPaste size={16} /> Bulk Paste CRM</button><button type="button" onClick={() => saveMappings([...provider.crmMappings, createMapping()])}><Plus size={16} /> Add CRM Row</button></div></div>
            {bulkImportResult && <div className="crm-import-success"><Check size={16} /> Imported {bulkImportResult.rows} CRM row{bulkImportResult.rows === 1 ? '' : 's'} and applied reviewed inheritance to {bulkImportResult.assignments} CMMC requirement{bulkImportResult.assignments === 1 ? '' : 's'}.</div>}
            {provider.crmMappings.length === 0 ? <div className="op-empty crm-empty">No CRM rows yet. Load the supplied AC-2 examples or add a blank row.</div> : <div className="crm-map-list">{provider.crmMappings.map((mapping) => <MappingCard key={mapping.id} mapping={mapping} providerName={provider.name} onChange={updateMapping} onRemove={() => saveMappings(provider.crmMappings.filter((item) => item.id !== mapping.id))} />)}</div>}
          </>
        )}

        {activeView === 'reference' && (
          <section className="set-card crm-reference"><div className="set-card-body"><div className="crm-toolbar"><div><h2>NIST SP 800-171 Rev. 2 Appendix D</h2><p>Educational reverse reference for all 110 requirements included in the app.</p></div><input value={referenceSearch} onChange={(event) => setReferenceSearch(event.target.value)} placeholder="Search 3.1.1, AC-2, access…" /></div><div className="op-table-wrap"><table className="op-cheat-table crm-reference-table"><thead><tr><th>800-171 Requirement</th><th>Requirement Title</th><th>Relevant 800-53 Controls</th></tr></thead><tbody>{filteredReference.map((row) => <tr key={row.requirement}><td><strong>{row.requirement}</strong></td><td>{findAppControl(row.requirement)?.title ?? 'Requirement'}</td><td>{row.nist53Controls.map((id) => <span className="crm-reference-chip" key={id} title={nist53Title(id)}>{id}</span>)}</td></tr>)}</tbody></table></div></div></section>
        )}

        {bulkImportOpen && <CrmBulkImportModal providerName={provider.name} onApply={applyBulkImport} onClose={() => setBulkImportOpen(false)} />}
      </main>
    </div>
  )
}

export default CrmResponsibilityMapper
