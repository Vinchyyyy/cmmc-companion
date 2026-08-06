import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Building2, FileSpreadsheet, MapPin, Plus, Trash2 } from 'lucide-react'
import DashSidebar from '../components/DashSidebar.jsx'
import GlobalEvidence from './GlobalEvidence.jsx'
import controls from '../data/controls/index.js'
import { readProjectMeta, writeProjectMeta } from '../utils/projectMeta'
import { readInheritanceSources } from '../utils/inheritance'
import {
  ensureOscProvider,
  readOscProfile,
  STANDARDS_ACCEPTANCE_VALUES,
  writeOscProfile,
} from '../utils/oscProfile'

const TABS = [
  ['overview', 'Overview'],
  ['providers', 'Service Providers'],
  ['locations', 'Physical Locations'],
  ['walkthrough', 'Environment Walkthrough'],
  ['evidence', 'Global Evidence'],
]

const PROVIDER_CHEAT_SHEET = [
  {
    acronym: 'ESP',
    name: 'External Service Provider',
    role: 'CMMC umbrella term for an outside party providing or managing IT or cybersecurity services when its assets process, store, or transmit CUI or Security Protection Data (SPD).',
    examples: 'An outsourced help desk, IT consultant, colocation operator, MSP, MSSP, or qualifying CSP.',
    cue: 'Ask what its people, tools, or facilities can access—and whether they handle CUI or SPD.',
  },
  {
    acronym: 'CSP',
    name: 'Cloud Service Provider',
    role: 'Provides its own cloud computing service or platform, including hosted infrastructure, platforms, or software.',
    examples: 'Amazon Web Services, Microsoft Azure, Google Cloud; Microsoft 365 is a cloud service.',
    cue: 'Identify the exact service, cloud boundary, data handled, authorization status, and customer responsibilities.',
  },
  {
    acronym: 'MSP',
    name: 'Managed Service Provider',
    role: 'Operates day-to-day IT functions such as endpoints, accounts, patching, backups, networking, cloud administration, and help desk support.',
    examples: 'A regional IT company administering laptops, Microsoft 365, firewalls, backups, and user support.',
    cue: 'An MSP configuring the OSC’s cloud subscription is not automatically the CSP; map both relationships separately.',
  },
  {
    acronym: 'MSSP',
    name: 'Managed Security Service Provider',
    role: 'Specialized provider that monitors or operates security capabilities such as alerts, logs, firewalls, vulnerability tools, and incident response support.',
    examples: 'Arctic Wolf or Secureworks monitoring security telemetry; a third party operating the OSC’s SIEM or firewall.',
    cue: 'Security logs and configurations may be SPD even when the provider never receives CUI.',
  },
]

const RELATED_TERMS = [
  ['SPD', 'Security Protection Data', 'Security-relevant data stored or processed by assets protecting the assessed environment.', 'Security logs, configurations, vulnerability status, and protective-system telemetry'],
  ['SPA', 'Security Protection Asset', 'An asset that provides security functions or capabilities for the CMMC assessment scope.', 'SIEM, EDR, vulnerability scanner, or managed firewall'],
  ['SaaS', 'Software as a Service', 'Ready-to-use hosted application.', 'Microsoft 365, Salesforce'],
  ['PaaS', 'Platform as a Service', 'Hosted platform for deploying applications without managing the underlying OS.', 'Azure App Service, Google App Engine'],
  ['IaaS', 'Infrastructure as a Service', 'Cloud compute, storage, and networking where the customer still manages operating systems and workloads.', 'AWS EC2, Azure Virtual Machines'],
  ['SOC', 'Security Operations Center', 'People and processes that monitor, investigate, and respond to security events.', 'An internal SOC or an outsourced 24/7 SOC'],
  ['SOCaaS', 'SOC as a Service', 'An outsourced SOC delivered as a subscription service.', 'A provider triaging alerts and escalating incidents around the clock'],
  ['MDR', 'Managed Detection and Response', 'A managed service combining security monitoring, investigation, and response assistance.', 'CrowdStrike Falcon Complete, Arctic Wolf MDR'],
  ['SIEM', 'Security Information and Event Management', 'Collects and correlates logs for monitoring, alerting, and investigation.', 'Microsoft Sentinel, Splunk Enterprise Security'],
  ['EDR', 'Endpoint Detection and Response', 'Detects and investigates suspicious activity on laptops, desktops, and servers.', 'Microsoft Defender for Endpoint, CrowdStrike Falcon'],
  ['XDR', 'Extended Detection and Response', 'Correlates detections across endpoints, identity, email, cloud, and network sources.', 'Microsoft Defender XDR, Palo Alto Cortex XDR'],
  ['CRM / CRMA', 'Customer Responsibility Matrix', 'Maps which security requirements belong to the OSC, provider, or both.', 'A provider responsibility matrix referenced by the SSP'],
]

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

function Field({ label, children, wide = false, hint }) {
  return (
    <label className={`op-field${wide ? ' op-field--wide' : ''}`}>
      <span>{label}</span>
      {hint && <small>{hint}</small>}
      {children}
    </label>
  )
}

function OscProfile() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab') ?? 'overview'
  const activeTab = TABS.some(([id]) => id === requestedTab) ? requestedTab : 'overview'
  const [projectMeta, setProjectMeta] = useState(readProjectMeta)
  const [profile, setProfile] = useState(() => {
    for (const control of controls) {
      for (const source of readInheritanceSources(control.id)) ensureOscProvider(source)
    }
    return readOscProfile()
  })

  const chooseTab = (tab) => setSearchParams(tab === 'overview' ? {} : { tab })
  const saveProfile = (updater) => setProfile((current) => writeOscProfile(updater(current)))
  const updateSection = (section, field, value) => saveProfile((current) => ({
    ...current,
    [section]: { ...current[section], [field]: value },
  }))

  const updateCollection = (collection, id, field, value) => saveProfile((current) => ({
    ...current,
    [collection]: current[collection].map((item) => item.id === id ? { ...item, [field]: value } : item),
  }))

  const removeItem = (collection, id, label) => {
    if (!window.confirm(`Remove this ${label}?`)) return
    saveProfile((current) => ({ ...current, [collection]: current[collection].filter((item) => item.id !== id) }))
  }

  const addProvider = () => saveProfile((current) => ({
    ...current,
    providers: [...current.providers, {
      id: makeId(), name: '', type: 'Other ESP', service: '', handlesCui: 'Unknown',
      handlesSpd: 'Unknown', crmStatus: 'Unknown', standardsAcceptance: '', connectionMethod: '', notes: '',
    }],
  }))

  const addLocation = () => saveProfile((current) => ({
    ...current,
    locations: [...current.locations, {
      id: makeId(), name: '', address: '', purpose: '', userCount: '', cuiActivity: 'Unknown',
      inScopeEquipment: 'Unknown', notes: '',
    }],
  }))

  return (
    <div className="dash-root">
      <DashSidebar />
      <main className="dash-main op-page">
        <header className="op-header">
          <div>
            <h1 className="set-title">OSC Profile</h1>
            <p className="set-subtitle">Engagement context for understanding the OSC and its assessment environment—not an assessment questionnaire.</p>
          </div>
          <div className="op-profile-badge"><Building2 size={17} /> {projectMeta.oscName.trim() || 'Unnamed OSC'}</div>
        </header>

        <nav className="op-tabs" aria-label="OSC profile sections">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" className={activeTab === id ? 'active' : ''} onClick={() => chooseTab(id)}>{label}</button>
          ))}
        </nav>

        {activeTab === 'overview' && (
          <section className="set-card op-section">
            <div className="set-card-body">
              <h2>Organization Overview</h2>
              <p className="op-section-intro">Keep the identifiers and high-level context you want available throughout the engagement.</p>
              <div className="op-grid">
                <Field label="OSC / Client Name" hint="Used on the dashboard and pre-filled in export dialogs.">
                  <input className="export-dialog-input" value={projectMeta.oscName} placeholder="e.g. Acme Corp" autoComplete="organization" onChange={(e) => setProjectMeta(writeProjectMeta({ ...projectMeta, oscName: e.target.value }))} />
                </Field>
                <Field label="Primary Contact"><input className="export-dialog-input" value={profile.overview.primaryContact} onChange={(e) => updateSection('overview', 'primaryContact', e.target.value)} /></Field>
                <Field label="CAGE Code(s)"><input className="export-dialog-input" value={profile.overview.cageCodes} onChange={(e) => updateSection('overview', 'cageCodes', e.target.value)} /></Field>
                <Field label="Approximate Users"><input className="export-dialog-input" value={profile.overview.approximateUsers} onChange={(e) => updateSection('overview', 'approximateUsers', e.target.value)} /></Field>
                <Field label="Workforce Model"><input className="export-dialog-input" value={profile.overview.workforceModel} placeholder="e.g. On-site, remote, hybrid" onChange={(e) => updateSection('overview', 'workforceModel', e.target.value)} /></Field>
                <Field label="Business / Mission Description" wide><textarea value={profile.overview.businessDescription} onChange={(e) => updateSection('overview', 'businessDescription', e.target.value)} /></Field>
                <Field label="Assessment Context" wide><textarea value={profile.overview.assessmentContext} placeholder="What prompted the engagement and what is the expected assessment scope?" onChange={(e) => updateSection('overview', 'assessmentContext', e.target.value)} /></Field>
                <Field label="Boundary Summary" wide><textarea value={profile.overview.boundarySummary} onChange={(e) => updateSection('overview', 'boundarySummary', e.target.value)} /></Field>
                <Field label="How CUI Enters and Moves Through the Environment" wide><textarea value={profile.overview.cuiDescription} onChange={(e) => updateSection('overview', 'cuiDescription', e.target.value)} /></Field>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'providers' && (
          <section className="set-card op-section">
            <div className="set-card-body">
              <div className="op-section-title-row"><div><h2>External Service Providers</h2><p className="op-section-intro">Capture CSPs, MSPs, MSSPs, and other ESP relationships. CRM means Customer Responsibility Matrix; some organizations call it a CRMA.</p></div><button type="button" onClick={addProvider}><Plus size={15} /> Add Provider</button></div>
              <details className="op-cheat-sheet" open>
                <summary>Service Provider Acronym Cheat Sheet</summary>
                <p className="op-cheat-intro"><strong>Fast rule:</strong> classify the actual service—not just the company’s marketing label. One company may fill several roles.</p>
                <h3>Provider Types</h3>
                <div className="op-table-wrap">
                  <table className="op-cheat-table">
                    <thead><tr><th>Acronym</th><th>Stands For</th><th>Typical Function</th><th>Real-world Example</th><th>Scoping Cue</th></tr></thead>
                    <tbody>
                      {PROVIDER_CHEAT_SHEET.map((item) => (
                        <tr key={item.acronym}>
                          <td><span className="op-acronym">{item.acronym}</span></td>
                          <td>{item.name}</td>
                          <td>{item.role}</td>
                          <td>{item.examples}</td>
                          <td>{item.cue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3>Related Cloud &amp; Security Terms</h3>
                <div className="op-table-wrap">
                  <table className="op-cheat-table op-cheat-table--compact">
                    <thead><tr><th>Acronym</th><th>Stands For</th><th>What It Does</th><th>Example</th></tr></thead>
                    <tbody>
                      {RELATED_TERMS.map(([acronym, name, role, example]) => (
                        <tr key={acronym}><td><span className="op-acronym">{acronym}</span></td><td>{name}</td><td>{role}</td><td>{example}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="op-cheat-note">CMMC reminder: the label alone does not determine scope. Confirm the contracted service, data flow, administrative access, security functions, and responsibility matrix.</p>
              </details>
              {profile.providers.length === 0 && <div className="op-empty">No providers recorded yet.</div>}
              <div className="op-collection">
                {profile.providers.map((provider, index) => (
                  <article className="op-item" key={provider.id}>
                    <div className="op-item-header"><div><h3>Provider {index + 1}{provider.name ? ` — ${provider.name}` : ''}</h3>{provider.crmMappings?.length > 0 && <span className="op-mapping-count">{provider.crmMappings.length} CRM row{provider.crmMappings.length === 1 ? '' : 's'} mapped with NIST SP 800-53</span>}</div><div className="op-item-actions"><Link className="op-mapper-link" to={`/osc-profile/providers/${provider.id}/crm-mapper`}><FileSpreadsheet size={15} /> CRM Mapper</Link><button type="button" className="op-remove" onClick={() => removeItem('providers', provider.id, 'provider')}><Trash2 size={15} /> Remove</button></div></div>
                    <div className="op-grid">
                      <Field label="Provider Name"><input value={provider.name} onChange={(e) => updateCollection('providers', provider.id, 'name', e.target.value)} /></Field>
                      <Field label="Provider Type"><select value={provider.type} onChange={(e) => updateCollection('providers', provider.id, 'type', e.target.value)}>{['CSP', 'MSP', 'MSSP', 'Other ESP', 'Unknown'].map((v) => <option key={v}>{v}</option>)}</select></Field>
                      <Field label="Service Provided"><input value={provider.service} onChange={(e) => updateCollection('providers', provider.id, 'service', e.target.value)} /></Field>
                      <Field label="Handles CUI?"><select value={provider.handlesCui} onChange={(e) => updateCollection('providers', provider.id, 'handlesCui', e.target.value)}>{['Unknown', 'Yes', 'No'].map((v) => <option key={v}>{v}</option>)}</select></Field>
                      <Field label="Handles Security Protection Data?"><select value={provider.handlesSpd} onChange={(e) => updateCollection('providers', provider.id, 'handlesSpd', e.target.value)}>{['Unknown', 'Yes', 'No'].map((v) => <option key={v}>{v}</option>)}</select></Field>
                      <Field label="CRM / CRMA Status"><select value={provider.crmStatus} onChange={(e) => updateCollection('providers', provider.id, 'crmStatus', e.target.value)}>{['Unknown', 'Available', 'Requested', 'Not Available', 'Not Applicable'].map((v) => <option key={v}>{v}</option>)}</select></Field>
                      <Field label="Standards Acceptance" hint="Used for every inheritance reference to this provider and in the official Excel export."><select value={provider.standardsAcceptance} onChange={(e) => updateCollection('providers', provider.id, 'standardsAcceptance', e.target.value)}><option value="">Not Specified</option>{STANDARDS_ACCEPTANCE_VALUES.map((v) => <option key={v}>{v}</option>)}</select></Field>
                      <Field label="Connection / Access Method"><input value={provider.connectionMethod} onChange={(e) => updateCollection('providers', provider.id, 'connectionMethod', e.target.value)} /></Field>
                      <Field label="Notes" wide><textarea value={provider.notes} onChange={(e) => updateCollection('providers', provider.id, 'notes', e.target.value)} /></Field>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'locations' && (
          <section className="set-card op-section">
            <div className="set-card-body">
              <div className="op-section-title-row"><div><h2>Physical Locations</h2><p className="op-section-intro">Record the sites that help explain where people, systems, and CUI-related activity are located.</p></div><button type="button" onClick={addLocation}><Plus size={15} /> Add Location</button></div>
              {profile.locations.length === 0 && <div className="op-empty"><MapPin size={17} /> No locations recorded yet.</div>}
              <div className="op-collection">
                {profile.locations.map((location, index) => (
                  <article className="op-item" key={location.id}>
                    <div className="op-item-header"><h3>Location {index + 1}{location.name ? ` — ${location.name}` : ''}</h3><button type="button" className="op-remove" onClick={() => removeItem('locations', location.id, 'location')}><Trash2 size={15} /> Remove</button></div>
                    <div className="op-grid">
                      <Field label="Location Name"><input value={location.name} onChange={(e) => updateCollection('locations', location.id, 'name', e.target.value)} /></Field>
                      <Field label="Approximate Users"><input value={location.userCount} onChange={(e) => updateCollection('locations', location.id, 'userCount', e.target.value)} /></Field>
                      <Field label="Address" wide><input value={location.address} onChange={(e) => updateCollection('locations', location.id, 'address', e.target.value)} /></Field>
                      <Field label="Purpose / Functions"><input value={location.purpose} onChange={(e) => updateCollection('locations', location.id, 'purpose', e.target.value)} /></Field>
                      <Field label="CUI Activity"><select value={location.cuiActivity} onChange={(e) => updateCollection('locations', location.id, 'cuiActivity', e.target.value)}>{['Unknown', 'Accessed', 'Stored', 'Processed', 'Printed', 'Discussed', 'Multiple', 'None'].map((v) => <option key={v}>{v}</option>)}</select></Field>
                      <Field label="In-scope Equipment Present?"><select value={location.inScopeEquipment} onChange={(e) => updateCollection('locations', location.id, 'inScopeEquipment', e.target.value)}>{['Unknown', 'Yes', 'No'].map((v) => <option key={v}>{v}</option>)}</select></Field>
                      <Field label="Notes" wide><textarea value={location.notes} onChange={(e) => updateCollection('locations', location.id, 'notes', e.target.value)} /></Field>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'walkthrough' && (
          <section className="set-card op-section">
            <div className="set-card-body">
              <h2>Environment Walkthrough</h2>
              <p className="op-section-intro">Use this as a structured call notebook for the OSC’s high-level verbal walkthrough.</p>
              <div className="op-grid">
                <Field label="Call Date"><input type="date" value={profile.walkthrough.callDate} onChange={(e) => updateSection('walkthrough', 'callDate', e.target.value)} /></Field>
                <Field label="Attendees"><input value={profile.walkthrough.attendees} onChange={(e) => updateSection('walkthrough', 'attendees', e.target.value)} /></Field>
                {[
                  ['environmentNotes', 'Environment Walkthrough Notes'],
                  ['cuiFlowNotes', 'CUI Flow Summary'],
                  ['openQuestions', 'Open Questions'],
                  ['followUps', 'Follow-up Actions'],
                  ['documentsRequested', 'Documents Requested'],
                ].map(([field, label]) => <Field key={field} label={label} wide><textarea value={profile.walkthrough[field]} onChange={(e) => updateSection('walkthrough', field, e.target.value)} /></Field>)}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'evidence' && <GlobalEvidence embedded />}
      </main>
    </div>
  )
}

export default OscProfile
