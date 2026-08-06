import { readPool, writePool } from './evidencePool'
import { readObjectiveArtifacts, writeObjectiveArtifacts } from './objectiveArtifacts'
import { findOrCreate, normalizeName, updateArtifactTags } from './artifactRegistry'

const STORAGE_KEY = 'cmmc-global-evidence'

export const GLOBAL_EVIDENCE_TYPES = {
  ssp: { label: 'System Security Plan', tag: 'system_security_plan' },
  policy: { label: 'Policy Document', tag: 'policy_document' },
  procedure: { label: 'Procedure Document', tag: 'procedure_document' },
}

export const DEFAULT_GLOBAL_EVIDENCE = {
  ssp: '',
  families: {},
  applied: {
    ssp: '',
    families: {},
  },
}

function normalizeFamilyEntry(entry) {
  return {
    policy: typeof entry?.policy === 'string' ? entry.policy : '',
    procedure: typeof entry?.procedure === 'string' ? entry.procedure : '',
  }
}

export function normalizeGlobalEvidence(value) {
  const families = {}
  const appliedFamilies = {}
  if (value?.families && typeof value.families === 'object' && !Array.isArray(value.families)) {
    for (const [code, entry] of Object.entries(value.families)) {
      families[code] = normalizeFamilyEntry(entry)
    }
  }
  if (value?.applied?.families && typeof value.applied.families === 'object' && !Array.isArray(value.applied.families)) {
    for (const [code, entry] of Object.entries(value.applied.families)) {
      appliedFamilies[code] = normalizeFamilyEntry(entry)
    }
  }
  return {
    ssp: typeof value?.ssp === 'string' ? value.ssp : '',
    families,
    applied: {
      ssp: typeof value?.applied?.ssp === 'string' ? value.applied.ssp : '',
      families: appliedFamilies,
    },
  }
}

export function readGlobalEvidence() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalizeGlobalEvidence(JSON.parse(raw)) : normalizeGlobalEvidence(DEFAULT_GLOBAL_EVIDENCE)
  } catch {
    return normalizeGlobalEvidence(DEFAULT_GLOBAL_EVIDENCE)
  }
}

export function writeGlobalEvidence(value) {
  const normalized = normalizeGlobalEvidence(value)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // localStorage unavailable — proceed silently
  }
  return normalized
}

function controlsForScope(controls, familyCode) {
  if (!familyCode) return controls
  return controls.filter((control) => control.id.slice(0, 2) === familyCode)
}

function includesArtifact(items, name) {
  const target = normalizeName(name)
  return items.some((item) => normalizeName(item) === target)
}

function withoutArtifact(items, name) {
  const target = normalizeName(name)
  return items.filter((item) => normalizeName(item) !== target)
}

export function applyGlobalArtifact(controls, name, type, familyCode = '') {
  const trimmed = String(name ?? '').trim()
  const definition = GLOBAL_EVIDENCE_TYPES[type]
  if (!trimmed || !definition) return { controls: 0, objectives: 0 }

  const artifact = findOrCreate(trimmed)
  if (artifact) updateArtifactTags(artifact.id, [...(artifact.tags ?? []), definition.tag])

  let controlCount = 0
  let objectiveCount = 0
  for (const control of controlsForScope(controls, familyCode)) {
    const pool = readPool(control.id)
    if (!includesArtifact(pool, trimmed)) writePool(control.id, [...pool, trimmed])
    controlCount++

    for (const objective of control.objectives ?? []) {
      const assigned = readObjectiveArtifacts(control.id, objective.id)
      if (!includesArtifact(assigned, trimmed)) {
        writeObjectiveArtifacts(control.id, objective.id, [...assigned, trimmed])
      }
      objectiveCount++
    }
  }

  return { controls: controlCount, objectives: objectiveCount }
}

export function removeGlobalArtifact(controls, name, familyCode = '') {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return { controls: 0, objectives: 0 }

  let controlCount = 0
  let objectiveCount = 0
  for (const control of controlsForScope(controls, familyCode)) {
    const pool = readPool(control.id)
    if (includesArtifact(pool, trimmed)) writePool(control.id, withoutArtifact(pool, trimmed))
    controlCount++

    for (const objective of control.objectives ?? []) {
      const assigned = readObjectiveArtifacts(control.id, objective.id)
      if (includesArtifact(assigned, trimmed)) {
        writeObjectiveArtifacts(control.id, objective.id, withoutArtifact(assigned, trimmed))
      }
      objectiveCount++
    }
  }

  return { controls: controlCount, objectives: objectiveCount }
}

// Used when upgrading projects created before applied-state tracking existed.
// Only reports true when the artifact is present everywhere in its intended
// scope, so an un-applied draft is never mistaken for a completed operation.
export function isGlobalArtifactApplied(controls, name, familyCode = '') {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return false
  const scopedControls = controlsForScope(controls, familyCode)
  if (scopedControls.length === 0) return false

  return scopedControls.every((control) => {
    if (!includesArtifact(readPool(control.id), trimmed)) return false
    return (control.objectives ?? []).every((objective) =>
      includesArtifact(readObjectiveArtifacts(control.id, objective.id), trimmed)
    )
  })
}
