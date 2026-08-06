import { useState } from 'react'
import { CheckCircle2, FileText, ShieldCheck, Trash2 } from 'lucide-react'
import DashSidebar from '../components/DashSidebar.jsx'
import controls from '../data/controls/index.js'
import { FAMILY_ORDER } from '../utils/controlOrder.js'
import {
  applyGlobalArtifact,
  isGlobalArtifactApplied,
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

function readConfigWithAppliedMigration() {
  const saved = readGlobalEvidence()
  const next = {
    ...saved,
    applied: {
      ...saved.applied,
      families: { ...saved.applied.families },
    },
  }
  let changed = false

  if (!next.applied.ssp && next.ssp.trim() && isGlobalArtifactApplied(controls, next.ssp)) {
    next.applied.ssp = next.ssp
    changed = true
  }

  for (const family of FAMILIES) {
    const values = { policy: '', procedure: '', ...(next.families[family.code] ?? {}) }
    const appliedValues = { policy: '', procedure: '', ...(next.applied.families[family.code] ?? {}) }
    for (const type of ['policy', 'procedure']) {
      if (!appliedValues[type] && values[type].trim() && isGlobalArtifactApplied(controls, values[type], family.code)) {
        appliedValues[type] = values[type]
        changed = true
      }
    }
    if (appliedValues.policy || appliedValues.procedure) next.applied.families[family.code] = appliedValues
  }

  return changed ? writeGlobalEvidence(next) : saved
}

function GlobalEvidence() {
  const [config, setConfig] = useState(readConfigWithAppliedMigration)
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

  const setAppliedValue = (current, type, value, family = null) => {
    if (type === 'ssp') {
      return { ...current, applied: { ...current.applied, ssp: value } }
    }
    return {
      ...current,
      applied: {
        ...current.applied,
        families: {
          ...current.applied.families,
          [family.code]: {
            policy: '',
            procedure: '',
            ...(current.applied.families[family.code] ?? {}),
            [type]: value,
          },
        },
      },
    }
  }

  const apply = (name, type, family = null, previousApplied = '') => {
    if (previousApplied.trim() && previousApplied !== name) {
      removeGlobalArtifact(controls, previousApplied, family?.code)
    }
    const counts = applyGlobalArtifact(controls, name, type, family?.code)
    updateConfig((current) => setAppliedValue(current, type, name, family))
    setResult({
      ok: true,
      message: `${family ? `${family.name} ${type}` : 'SSP'} applied to ${counts.controls} control${counts.controls === 1 ? '' : 's'} and ${counts.objectives} objective${counts.objectives === 1 ? '' : 's'}.`,
    })
  }

  const clear = (draftName, type, family = null, appliedName = '') => {
    const nameToRemove = appliedName.trim() ? appliedName : draftName
    const counts = removeGlobalArtifact(controls, nameToRemove, family?.code)
    updateConfig((current) => {
      let next
      if (type === 'ssp') next = { ...current, ssp: '' }
      else {
        next = {
          ...current,
          families: {
            ...current.families,
            [family.code]: { policy: '', procedure: '', ...(current.families[family.code] ?? {}), [type]: '' },
          },
        }
      }
      return setAppliedValue(next, type, '', family)
    })
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
              {config.ssp.trim() && config.ssp === config.applied.ssp ? (
                <span className="ge-applied-state" role="status" title="This exact artifact name has been applied">
                  <CheckCircle2 size={17} /> Applied
                </span>
              ) : (
                <button type="button" disabled={!config.ssp.trim()} onClick={() => apply(config.ssp, 'ssp', null, config.applied.ssp)}>Apply to All</button>
              )}
              <button type="button" className="ge-clear-btn" disabled={!config.ssp.trim() && !config.applied.ssp.trim()} onClick={() => clear(config.ssp, 'ssp', null, config.applied.ssp)}>
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
                const appliedValues = { policy: '', procedure: '', ...(config.applied.families[family.code] ?? {}) }
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
                        {values[type].trim() && values[type] === appliedValues[type] ? (
                          <span className="ge-applied-state ge-applied-state--compact" role="status" title="This exact artifact name has been applied">
                            <CheckCircle2 size={17} />
                            <span>Applied</span>
                          </span>
                        ) : (
                          <button type="button" disabled={!values[type].trim()} onClick={() => apply(values[type], type, family, appliedValues[type])}>Apply</button>
                        )}
                        <button type="button" className="ge-icon-clear" disabled={!values[type].trim() && !appliedValues[type].trim()} onClick={() => clear(values[type], type, family, appliedValues[type])} aria-label={`Clear ${family.name} ${type}`} title="Remove this global document from the family">
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
