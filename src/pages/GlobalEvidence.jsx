import { useState } from 'react'
import { FileText, ShieldCheck, Trash2 } from 'lucide-react'
import DashSidebar from '../components/DashSidebar.jsx'
import controls from '../data/controls/index.js'
import { FAMILY_ORDER } from '../utils/controlOrder.js'
import {
  applyGlobalArtifact,
  readGlobalEvidence,
  removeGlobalArtifact,
  writeGlobalEvidence,
} from '../utils/globalEvidence.js'

function buildFamilies() {
  const byName = new Map()
  for (const control of controls) {
    const code = control.id.slice(0, 2)
    const current = byName.get(control.family) ?? { code, name: control.family, controls: 0, objectives: 0 }
    current.controls++
    current.objectives += control.objectives?.length ?? 0
    byName.set(control.family, current)
  }
  return FAMILY_ORDER.map((name) => byName.get(name)).filter(Boolean)
}

const FAMILIES = buildFamilies()

function GlobalEvidence() {
  const [config, setConfig] = useState(() => readGlobalEvidence())
  const [result, setResult] = useState(null)

  const updateConfig = (updater) => {
    setConfig((current) => {
      const next = updater(current)
      writeGlobalEvidence(next)
      return next
    })
    setResult(null)
  }

  const setSsp = (value) => updateConfig((current) => ({ ...current, ssp: value }))

  const setFamilyValue = (code, field, value) => updateConfig((current) => ({
    ...current,
    families: {
      ...current.families,
      [code]: { policy: '', procedure: '', ...(current.families[code] ?? {}), [field]: value },
    },
  }))

  const apply = (name, type, family = null) => {
    const counts = applyGlobalArtifact(controls, name, type, family?.code)
    setResult({
      ok: true,
      message: `${family ? `${family.name} ${type}` : 'SSP'} applied to ${counts.controls} control${counts.controls === 1 ? '' : 's'} and ${counts.objectives} objective${counts.objectives === 1 ? '' : 's'}.`,
    })
  }

  const clear = (name, type, family = null) => {
    const counts = removeGlobalArtifact(controls, name, family?.code)
    if (type === 'ssp') setSsp('')
    else setFamilyValue(family.code, type, '')
    setResult({
      ok: true,
      message: `${family ? `${family.name} ${type}` : 'SSP'} removed from ${counts.controls} control${counts.controls === 1 ? '' : 's'} and their objectives.`,
    })
  }

  return (
    <div className="dash-root">
      <DashSidebar />
      <main className="dash-main ge-page">
        <div className="ge-header">
          <div>
            <h1 className="set-title">Global Evidence</h1>
            <p className="set-subtitle">Apply common document references across the assessment without entering the same artifact repeatedly.</p>
          </div>
        </div>

        <div className="ge-notice">
          <ShieldCheck size={18} />
          <p>Artifact names only—no files are uploaded. Applying is additive. You can remove an assignment from any individual objective afterward; it will stay removed unless you apply the global document again.</p>
        </div>

        {result && <p className="feedback feedback--ok ge-feedback">{result.message}</p>}

        <section className="set-card ge-ssp-card">
          <div className="set-card-body">
            <div className="ge-section-heading">
              <FileText size={18} />
              <div>
                <h2>System Security Plan</h2>
                <p>Tagged as System Security Plan and applied to every control and objective.</p>
              </div>
            </div>
            <div className="ge-input-row">
              <input
                type="text"
                className="export-dialog-input"
                value={config.ssp}
                onChange={(e) => setSsp(e.target.value)}
                placeholder="e.g. Acme System Security Plan v3.2"
                aria-label="System Security Plan artifact name"
              />
              <button type="button" disabled={!config.ssp.trim()} onClick={() => apply(config.ssp, 'ssp')}>Apply to All</button>
              <button type="button" className="ge-clear-btn" disabled={!config.ssp.trim()} onClick={() => clear(config.ssp, 'ssp')}>
                <Trash2 size={14} /> Clear
              </button>
            </div>
          </div>
        </section>

        <section className="set-card">
          <div className="set-card-body">
            <div className="ge-section-heading">
              <FileText size={18} />
              <div>
                <h2>Family Policies &amp; Procedures</h2>
                <p>Each document is tagged automatically and applied only to controls and objectives in that family.</p>
              </div>
            </div>

            <div className="ge-family-list">
              {FAMILIES.map((family) => {
                const values = { policy: '', procedure: '', ...(config.families[family.code] ?? {}) }
                return (
                  <div className="ge-family-card" key={family.code}>
                    <div className="ge-family-title-row">
                      <div>
                        <h3><span>{family.code}</span> {family.name}</h3>
                        <p>{family.controls} controls · {family.objectives} objectives</p>
                      </div>
                    </div>
                    {['policy', 'procedure'].map((type) => (
                      <div className="ge-document-row" key={type}>
                        <label htmlFor={`${family.code}-${type}`}>{type === 'policy' ? 'Policy' : 'Procedure'}</label>
                        <input
                          id={`${family.code}-${type}`}
                          type="text"
                          className="export-dialog-input"
                          value={values[type]}
                          onChange={(e) => setFamilyValue(family.code, type, e.target.value)}
                          placeholder={`e.g. ${family.name} ${type === 'policy' ? 'Policy' : 'Procedures'}`}
                        />
                        <button type="button" disabled={!values[type].trim()} onClick={() => apply(values[type], type, family)}>Apply</button>
                        <button type="button" className="ge-icon-clear" disabled={!values[type].trim()} onClick={() => clear(values[type], type, family)} aria-label={`Clear ${family.name} ${type}`} title="Remove this global document from the family">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default GlobalEvidence
