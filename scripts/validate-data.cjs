#!/usr/bin/env node
// =========================================================================
// CMMC Companion — data integrity validator
// node scripts/validate-data.cjs [--verbose]
// =========================================================================

const fs    = require('node:fs')
const path  = require('node:path')
const verbose = process.argv.includes('--verbose')

const ROOT              = path.resolve(__dirname, '..')
const DATA_DIR          = path.join(ROOT, 'src', 'data')
const CONTROLS_DIR      = path.join(DATA_DIR, 'controls')
const RELATIONSHIPS_DIR = path.join(DATA_DIR, 'relationships')
const EVIDENCE_DIR      = path.join(DATA_DIR, 'evidence')
const SCORING_FILE      = path.join(DATA_DIR, 'scoring.json')

const FAMILY_FILES = {
  'Access Control':                          'access-control.json',
  'Identification and Authentication':       'identification-authentication.json',
  'System and Communications Protection':    'system-communications-protection.json',
  'Audit and Accountability':                'audit-accountability.json',
  'Configuration Management':               'configuration-management.json',
  'Incident Response':                       'incident-response.json',
  'Risk Assessment':                         'risk-assessment.json',
  'Security Assessment':                     'security-assessment.json',
  'System and Information Integrity':        'system-information-integrity.json',
  'Personnel Security':                      'personnel-security.json',
  'Physical Protection':                     'physical-protection.json',
  'Awareness and Training':                  'awareness-training.json',
  'Maintenance':                             'maintenance.json',
  'Media Protection':                        'media-protection.json'
}

const FAMILY_CODE_TO_NAME = {
  AC: 'Access Control',
  IA: 'Identification and Authentication',
  SC: 'System and Communications Protection',
  AU: 'Audit and Accountability',
  CM: 'Configuration Management',
  IR: 'Incident Response',
  RA: 'Risk Assessment',
  CA: 'Security Assessment',
  SI: 'System and Information Integrity',
  PS: 'Personnel Security',
  PE: 'Physical Protection',
  AT: 'Awareness and Training',
  MA: 'Maintenance',
  MP: 'Media Protection',
}

const RELATIONSHIP_FILES = [
  { filename: 'access-control.json',                   family: 'Access Control' },
  { filename: 'identification-authentication.json',    family: 'Identification and Authentication' },
  { filename: 'system-communications-protection.json', family: 'System and Communications Protection' },
  { filename: 'audit-accountability.json',             family: 'Audit and Accountability' },
  { filename: 'configuration-management.json',         family: 'Configuration Management' },
  { filename: 'incident-response.json',                family: 'Incident Response' },
  { filename: 'risk-assessment.json',                  family: 'Risk Assessment' },
  { filename: 'security-assessment.json',              family: 'Security Assessment' },
  { filename: 'system-information-integrity.json',     family: 'System and Information Integrity' },
  { filename: 'personnel-security.json',               family: 'Personnel Security' },
  { filename: 'physical-protection.json',              family: 'Physical Protection' },
  { filename: 'awareness-training.json',               family: 'Awareness and Training' },
  { filename: 'maintenance.json',                      family: 'Maintenance' },
  { filename: 'media-protection.json',                 family: 'Media Protection' },
  { filename: 'cross-family.json',                     family: null },
]

const EVIDENCE_FILES = [
  { filename: 'access-control.json',                   family: 'Access Control' },
  { filename: 'identification-authentication.json',    family: 'Identification and Authentication' },
  { filename: 'system-communications-protection.json', family: 'System and Communications Protection' },
  { filename: 'audit-accountability.json',             family: 'Audit and Accountability' },
  { filename: 'configuration-management.json',         family: 'Configuration Management' },
  { filename: 'incident-response.json',                family: 'Incident Response' },
  { filename: 'risk-assessment.json',                  family: 'Risk Assessment' },
  { filename: 'security-assessment.json',              family: 'Security Assessment' },
  { filename: 'system-information-integrity.json',     family: 'System and Information Integrity' },
  { filename: 'personnel-security.json',               family: 'Personnel Security' },
  { filename: 'physical-protection.json',              family: 'Physical Protection' },
  { filename: 'awareness-training.json',               family: 'Awareness and Training' },
  { filename: 'maintenance.json',                      family: 'Maintenance' },
  { filename: 'media-protection.json',                 family: 'Media Protection' },
  { filename: 'shared.json',                           family: null },
]

const VALID_SCORE_VALUES = new Set([-1, -3, -5])

// =========================================================================
// Output
// =========================================================================
const failures = [], warnings = [], checkCounts = {}
const recordFailure = (cat, msg) => failures.push({ category: cat, message: msg })
const recordWarning = (cat, msg) => warnings.push({ category: cat, message: msg })
const bumpCheck     = (cat) => { checkCounts[cat] = (checkCounts[cat] || 0) + 1 }

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) }
  catch (err) { recordFailure('Load', `${path.relative(ROOT, filePath)}: ${err.message}`); return null }
}

function requireFields(obj, fields, label, cat) {
  const missing = fields.filter((f) => !(f in obj))
  if (missing.length) recordFailure(cat, `${label}: missing fields ${missing.join(', ')}`)
  for (const f of fields) {
    if (f in obj && ['objectives','commonArtifacts','commonGaps','commonEvidence','likelyControls'].includes(f))
      if (!Array.isArray(obj[f])) recordFailure(cat, `${label}: field "${f}" must be array`)
  }
}

// =========================================================================
// Load
// =========================================================================
console.log('Loading data files...\n')

const controlsByFamily = {}, controlsByFile = {}
for (const [family, filename] of Object.entries(FAMILY_FILES)) {
  const fp = path.join(CONTROLS_DIR, filename)
  if (!fs.existsSync(fp)) { recordFailure('Load', `Missing: controls/${filename}`); continue }
  const data = readJson(fp)
  if (!Array.isArray(data)) { if (data !== null) recordFailure('Load', `controls/${filename} not array`); continue }
  controlsByFamily[family] = data
  controlsByFile[filename] = { family, data }
  if (verbose) console.log(`  controls/${filename}: ${data.length}`)
}
const allControls   = Object.values(controlsByFamily).flat()
const allControlIds = new Set(allControls.map((c) => c?.id).filter(Boolean))

const evidenceByFile = {}, allEvidence = []
for (const { filename, family } of EVIDENCE_FILES) {
  const fp = path.join(EVIDENCE_DIR, filename)
  if (!fs.existsSync(fp)) { recordFailure('Load', `Missing: evidence/${filename}`); continue }
  const data = readJson(fp)
  if (!Array.isArray(data)) { if (data !== null) recordFailure('Load', `evidence/${filename} not array`); continue }
  evidenceByFile[filename] = { family, data }
  for (const ev of data) allEvidence.push({ ...ev, __sourceFile: filename })
  if (verbose) console.log(`  evidence/${filename}: ${data.length}`)
}

const relationshipsByFile = {}, allRelationships = []
for (const { filename, family } of RELATIONSHIP_FILES) {
  const fp = path.join(RELATIONSHIPS_DIR, filename)
  if (!fs.existsSync(fp)) { recordFailure('Load', `Missing: relationships/${filename}`); continue }
  const data = readJson(fp)
  if (!Array.isArray(data)) { if (data !== null) recordFailure('Load', `relationships/${filename} not array`); continue }
  relationshipsByFile[filename] = { family, data }
  for (const r of data) allRelationships.push({ ...r, __sourceFile: filename })
  if (verbose) console.log(`  relationships/${filename}: ${data.length}`)
}

const scoringData = fs.existsSync(SCORING_FILE) ? readJson(SCORING_FILE) : null
if (!scoringData) recordFailure('Load', 'Missing scoring.json')
else if (verbose) console.log(`  scoring.json: ${Object.keys(scoringData).length} entries`)

if (verbose) console.log(`\n  totals: ${allControls.length} controls, ${allEvidence.length} evidence, ${allRelationships.length} relationships\n`)

// =========================================================================
// 1 – Schema
// =========================================================================
const CTRL_REQ = ['id','family','title','controlText','plainEnglish','objectives','commonArtifacts','commonGaps']
const OBJ_REQ  = ['id','text','whatToLookFor','commonEvidence']
const EV_REQ   = ['name','description','likelyControls','reasoning']
const REL_REQ  = ['sourceControl','targetControl','relationshipType','reasoning']

for (const c of allControls) {
  bumpCheck('Schema')
  requireFields(c, CTRL_REQ, `control "${c?.id}"`, 'Schema')
  if (Array.isArray(c?.objectives))
    for (const o of c.objectives) {
      bumpCheck('Schema')
      requireFields(o, OBJ_REQ, `control "${c.id}" obj "${o?.id}"`, 'Schema')
    }
}
for (const ev of allEvidence)      { bumpCheck('Schema'); requireFields(ev, EV_REQ, `evidence "${ev?.name}" (${ev.__sourceFile})`, 'Schema') }
for (const r  of allRelationships) { bumpCheck('Schema'); requireFields(r, REL_REQ, `rel ${r?.sourceControl}->${r?.targetControl} (${r.__sourceFile})`, 'Schema') }

// =========================================================================
// 2 – ID format
// =========================================================================
const CTRL_ID_RE = /^[A-Z]{2}\.L[12]-\d+(\.\d+)+$/
const OBJ_ID_RE  = /^[a-z]+$/

for (const c of allControls) {
  bumpCheck('ID Format')
  if (!CTRL_ID_RE.test(c?.id || '')) recordFailure('ID Format', `control "${c?.id}" invalid format`)
  if (Array.isArray(c?.objectives))
    for (const o of c.objectives) {
      bumpCheck('ID Format')
      if (!OBJ_ID_RE.test(o?.id || '')) recordFailure('ID Format', `control "${c.id}" obj "${o?.id}" invalid`)
    }
}

// =========================================================================
// 3 – Uniqueness
// =========================================================================
const ctrlIdCounts = new Map()
for (const c of allControls) ctrlIdCounts.set(c?.id, (ctrlIdCounts.get(c?.id) || 0) + 1)
for (const [id, n] of ctrlIdCounts) { bumpCheck('Uniqueness'); if (n > 1) recordFailure('Uniqueness', `control "${id}" ×${n}`) }

for (const c of allControls) {
  const seen = new Set()
  for (const o of c?.objectives || []) {
    bumpCheck('Uniqueness')
    if (seen.has(o?.id)) recordFailure('Uniqueness', `control "${c.id}" duplicate obj "${o.id}"`)
    seen.add(o?.id)
  }
}

const evNameCounts = new Map(), evNameFiles = new Map()
for (const ev of allEvidence) {
  evNameCounts.set(ev.name, (evNameCounts.get(ev.name) || 0) + 1)
  if (!evNameFiles.has(ev.name)) evNameFiles.set(ev.name, [])
  evNameFiles.get(ev.name).push(ev.__sourceFile)
}
for (const [name, n] of evNameCounts) {
  bumpCheck('Uniqueness')
  if (n > 1) recordFailure('Uniqueness', `evidence "${name}" ×${n} in: ${[...new Set(evNameFiles.get(name))].join(', ')}`)
}

const edgeCounts = new Map(), edgeFiles = new Map()
for (const r of allRelationships) {
  const k = `${r.sourceControl}|${r.targetControl}|${r.relationshipType}`
  edgeCounts.set(k, (edgeCounts.get(k) || 0) + 1)
  if (!edgeFiles.has(k)) edgeFiles.set(k, [])
  edgeFiles.get(k).push(r.__sourceFile)
}
for (const [k, n] of edgeCounts) {
  bumpCheck('Uniqueness')
  if (n > 1) { const [s,t,tp] = k.split('|'); recordFailure('Uniqueness', `duplicate edge ${s}->${t} (${tp}) ×${n}`) }
}

// =========================================================================
// 4 – Referential integrity
// =========================================================================
for (const ev of allEvidence) {
  for (const ref of ev?.likelyControls || []) {
    bumpCheck('Referential')
    if (!allControlIds.has(ref)) recordFailure('Referential', `evidence "${ev.name}" unknown ref "${ref}"`)
  }
}
for (const r of allRelationships) {
  bumpCheck('Referential')
  if (r?.sourceControl && !allControlIds.has(r.sourceControl))
    recordFailure('Referential', `rel in ${r.__sourceFile} unknown source "${r.sourceControl}"`)
  bumpCheck('Referential')
  if (r?.targetControl && !allControlIds.has(r.targetControl))
    recordFailure('Referential', `rel in ${r.__sourceFile} unknown target "${r.targetControl}"`)
}

// =========================================================================
// 5 – Family-file integrity
// =========================================================================
const KNOWN_FAMILIES = new Set(Object.keys(FAMILY_FILES))

for (const [filename, { family, data }] of Object.entries(controlsByFile)) {
  for (const c of data) {
    bumpCheck('Family')
    if (!c?.family) continue
    if (!KNOWN_FAMILIES.has(c.family))
      recordFailure('Family', `control "${c.id}" in controls/${filename} unknown family "${c.family}"`)
    else if (c.family !== family)
      recordFailure('Family', `control "${c.id}" in controls/${filename} family="${c.family}" expected "${family}"`)
  }
}

for (const [filename, { family, data }] of Object.entries(evidenceByFile)) {
  for (const ev of data) {
    bumpCheck('Family')
    const refs = Array.isArray(ev?.likelyControls) ? ev.likelyControls : []
    const fams = new Set(refs.map((r) => FAMILY_CODE_TO_NAME[r?.slice(0,2)]).filter(Boolean))
    if (family === null) {
      if (fams.size === 1)
        recordFailure('Family', `evidence "${ev.name}" in shared.json is single-family "${[...fams][0]}"`)
    } else {
      const off = refs.filter((r) => FAMILY_CODE_TO_NAME[r?.slice(0,2)] !== family)
      if (off.length)
        recordFailure('Family', `evidence "${ev.name}" in evidence/${filename} refs outside "${family}": ${off.join(', ')}`)
    }
  }
}

for (const [filename, { family, data }] of Object.entries(relationshipsByFile)) {
  for (const r of data) {
    if (!r?.sourceControl || !r?.targetControl) continue
    const sf = FAMILY_CODE_TO_NAME[r.sourceControl.slice(0,2)]
    const tf = FAMILY_CODE_TO_NAME[r.targetControl.slice(0,2)]
    if (family === null) {
      bumpCheck('Family')
      if (sf && tf && sf === tf)
        recordFailure('Family', `same-family edge ${r.sourceControl}->${r.targetControl} in cross-family.json`)
    } else {
      bumpCheck('Family')
      if (sf !== family || tf !== family)
        recordFailure('Family', `edge ${r.sourceControl}->${r.targetControl} in relationships/${filename} — both must be "${family}"`)
    }
  }
}

// =========================================================================
// 6 – Relationship sanity
// =========================================================================
const VALID_REL = new Set(['prerequisite','supports'])
for (const r of allRelationships) {
  bumpCheck('Relationships')
  if (r?.sourceControl && r?.targetControl && r.sourceControl === r.targetControl)
    recordFailure('Relationships', `self-loop on "${r.sourceControl}" in ${r.__sourceFile}`)
  bumpCheck('Relationships')
  if (r?.relationshipType && !VALID_REL.has(r.relationshipType))
    recordFailure('Relationships', `invalid type "${r.relationshipType}" on ${r.sourceControl}->${r.targetControl}`)
}
const supportPairs = new Set()
for (const r of allRelationships) {
  if (r?.relationshipType !== 'supports' || !r.sourceControl || !r.targetControl) continue
  const fwd = `${r.sourceControl}|${r.targetControl}`, rev = `${r.targetControl}|${r.sourceControl}`
  bumpCheck('Relationships')
  if (supportPairs.has(rev))
    recordWarning('Relationships', `bidirectional "supports" between ${r.sourceControl} and ${r.targetControl}`)
  supportPairs.add(fwd)
}

// =========================================================================
// 7 – Scoring
// =========================================================================
if (scoringData && typeof scoringData === 'object') {
  for (const control of allControls) {
    bumpCheck('Scoring')
    const entry = scoringData[control.id]
    if (!entry) {
      recordFailure('Scoring', `control "${control.id}" missing from scoring.json`)
      continue
    }
    if (!VALID_SCORE_VALUES.has(entry.scoreValue))
      recordFailure('Scoring', `control "${control.id}" scoreValue="${entry.scoreValue}" must be -1, -3, or -5`)
    if (typeof entry.poamAllowed !== 'boolean')
      recordFailure('Scoring', `control "${control.id}" poamAllowed must be boolean`)
    if (entry.poamAllowed === false && !entry.poamRestrictionReason)
      recordFailure('Scoring', `control "${control.id}" poamAllowed=false but poamRestrictionReason missing`)
  }
  for (const id of Object.keys(scoringData)) {
    bumpCheck('Scoring')
    if (!allControlIds.has(id))
      recordWarning('Scoring', `scoring.json entry "${id}" not in controls dataset`)
  }
  if (verbose) {
    const n5 = Object.values(scoringData).filter((e) => e.scoreValue === -5).length
    const n3 = Object.values(scoringData).filter((e) => e.scoreValue === -3).length
    const n1 = Object.values(scoringData).filter((e) => e.scoreValue === -1).length
    const np = Object.values(scoringData).filter((e) => !e.poamAllowed).length
    console.log(`  scoring: -5:${n5}  -3:${n3}  -1:${n1}  non-POA&M:${np}`)
  }
}

// =========================================================================
// Report
// =========================================================================
const CATEGORIES = ['Load','Schema','ID Format','Uniqueness','Referential','Family','Relationships','Scoring']
console.log('='.repeat(60))
console.log('Validation Results')
console.log('='.repeat(60))

const failByCat = {}, warnByCat = {}
for (const f of failures) (failByCat[f.category]  ||= []).push(f.message)
for (const w of warnings) (warnByCat[w.category]  ||= []).push(w.message)

for (const cat of CATEGORIES) {
  const count = checkCounts[cat] || 0
  const fails = failByCat[cat] || []
  console.log(`\n[${fails.length === 0 ? 'PASS' : 'FAIL'}] ${cat}  (${count} checks, ${fails.length} failures)`)
  for (const msg of fails) console.log(`  - ${msg}`)
}

if (warnings.length) {
  console.log('\n' + '-'.repeat(60))
  console.log(`Warnings (${warnings.length})`)
  console.log('-'.repeat(60))
  for (const cat of CATEGORIES) {
    const warns = warnByCat[cat] || []
    if (!warns.length) continue
    console.log(`\n[WARN] ${cat}`)
    for (const msg of warns) console.log(`  - ${msg}`)
  }
}

console.log('\n' + '='.repeat(60))
if (failures.length === 0) {
  let s = `All checks passed — ${allControls.length} controls, ${allEvidence.length} evidence types, ${allRelationships.length} relationships`
  if (warnings.length) s += ` (${warnings.length} warning${warnings.length === 1 ? '' : 's'})`
  console.log(s)
} else {
  console.log(`${failures.length} failure${failures.length === 1 ? '' : 's'} across ${Object.keys(failByCat).length} categor${Object.keys(failByCat).length === 1 ? 'y' : 'ies'}` +
    (warnings.length ? ` (+${warnings.length} warnings)` : ''))
}
console.log('='.repeat(60))
process.exit(failures.length === 0 ? 0 : 1)
