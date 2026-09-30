import { synchronizeAllFindings } from './findingSynchronization.js'
import { safeSetItem } from './storageWrite.js'
const STORAGE_KEY = 'cmmc-osc-profile'

export const STANDARDS_ACCEPTANCE_VALUES = ['DIBCAC High', 'FedRAMP Moderate', 'FedRAMP High']
export const PROVIDER_INHERITANCE_LEVELS = ['Partial', 'Full']

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

function normalizeProvider(item) {
  const raw = objectOrEmpty(item)
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : makeId(),
    name: typeof raw.name === 'string' ? raw.name : '',
    type: typeof raw.type === 'string' ? raw.type : 'Other ESP',
    service: typeof raw.service === 'string' ? raw.service : '',
    handlesCui: ['Unknown', 'Yes', 'No'].includes(raw.handlesCui) ? raw.handlesCui : 'Unknown',
    handlesSpd: ['Unknown', 'Yes', 'No'].includes(raw.handlesSpd) ? raw.handlesSpd : 'Unknown',
    crmStatus: ['Unknown', 'Available', 'Requested', 'Not Available', 'Not Applicable'].includes(raw.crmStatus) ? raw.crmStatus : 'Unknown',
    inheritanceLevel: PROVIDER_INHERITANCE_LEVELS.includes(raw.inheritanceLevel) ? raw.inheritanceLevel : 'Partial',
    standardsAcceptance: STANDARDS_ACCEPTANCE_VALUES.includes(raw.standardsAcceptance) ? raw.standardsAcceptance : '',
    connectionMethod: typeof raw.connectionMethod === 'string' ? raw.connectionMethod : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    crmMappings: Array.isArray(raw.crmMappings) ? raw.crmMappings.filter((mapping) => mapping && typeof mapping === 'object').map(normalizeCrmMapping) : [],
  }
}

function normalizeCrmMapping(item) {
  const raw = objectOrEmpty(item)
  const responsibility = ['tenant', 'provider', 'shared', 'review'].includes(raw.responsibility) ? raw.responsibility : 'review'
  const treatment = ['tenant', 'Partial', 'Full', 'review'].includes(raw.treatment) ? raw.treatment : 'review'
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : makeId(),
    sourceSection: typeof raw.sourceSection === 'string' ? raw.sourceSection : '',
    rawControls: typeof raw.rawControls === 'string' ? raw.rawControls : '',
    controls: Array.isArray(raw.controls) ? raw.controls.filter((value) => typeof value === 'string') : [],
    controlTitle: typeof raw.controlTitle === 'string' ? raw.controlTitle : '',
    narrative: typeof raw.narrative === 'string' ? raw.narrative : '',
    responsibility,
    treatment,
    selectedRequirements: Array.isArray(raw.selectedRequirements) ? raw.selectedRequirements.filter((value) => typeof value === 'string') : [],
    appliedRequirements: Array.isArray(raw.appliedRequirements) ? raw.appliedRequirements.filter((value) => typeof value === 'string') : [],
    appliedAt: typeof raw.appliedAt === 'string' ? raw.appliedAt : '',
  }
}

export const DEFAULT_OSC_PROFILE = {
  overview: {
    primaryContact: '',
    cageCodes: '',
    businessDescription: '',
    assessmentContext: '',
    approximateUsers: '',
    workforceModel: '',
    boundarySummary: '',
    cuiDescription: '',
  },
  providers: [],
  locations: [],
  walkthrough: {
    callDate: '',
    attendees: '',
    environmentNotes: '',
    cuiFlowNotes: '',
    openQuestions: '',
    followUps: '',
    documentsRequested: '',
  },
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function normalizeOscProfile(value) {
  const raw = objectOrEmpty(value)
  return {
    staffNames: [...new Set((Array.isArray(raw.staffNames) ? raw.staffNames : []).filter((name) => typeof name === 'string').map((name) => name.trim()).filter(Boolean))],
    overview: { ...DEFAULT_OSC_PROFILE.overview, ...objectOrEmpty(raw.overview) },
    providers: Array.isArray(raw.providers) ? raw.providers.filter((item) => item && typeof item === 'object').map(normalizeProvider) : [],
    locations: Array.isArray(raw.locations) ? raw.locations.filter((item) => item && typeof item === 'object') : [],
    walkthrough: { ...DEFAULT_OSC_PROFILE.walkthrough, ...objectOrEmpty(raw.walkthrough) },
  }
}

// Cache only decoded data, never pending writes. Checking the saved string on
// every read catches changes from imports, project wipes and other tabs without
// relying on event delivery. Consumers receive copies so unsaved edits cannot
// leak into subsequent reads.
let profileSnapshot = null

function readProfileSnapshot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (profileSnapshot && profileSnapshot.raw === raw) return profileSnapshot
    const profile = raw ? normalizeOscProfile(JSON.parse(raw)) : normalizeOscProfile(DEFAULT_OSC_PROFILE)
    const providersByName = new Map()
    for (const provider of profile.providers) {
      const name = provider.name.trim().toLowerCase()
      if (!providersByName.has(name)) providersByName.set(name, provider)
    }
    profileSnapshot = { raw, profile, providersByName }
    return profileSnapshot
  } catch {
    // Never return stale assessment data when storage cannot be read.
    profileSnapshot = null
    return { profile: normalizeOscProfile(DEFAULT_OSC_PROFILE), providersByName: new Map() }
  }
}

export function readAssessmentStaff() {
  return [...readProfileSnapshot().profile.staffNames]
}

export function readOscProfile() {
  return structuredClone(readProfileSnapshot().profile)
}

export function writeOscProfile(value) {
  const previousStaff = readAssessmentStaff()
  const normalized = normalizeOscProfile(value)
  safeSetItem(STORAGE_KEY, JSON.stringify(normalized))
  if (JSON.stringify(previousStaff) !== JSON.stringify(normalized.staffNames)) {
    synchronizeAllFindings({ artifacts: false, previousStaff })
  }
  return normalized
}

export function ensureOscProvider(name) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return null
  const profile = readOscProfile()
  const existing = profile.providers.find((provider) => provider.name.trim().toLowerCase() === trimmed.toLowerCase())
  if (existing) return existing
  const provider = normalizeProvider({ name: trimmed })
  writeOscProfile({ ...profile, providers: [...profile.providers, provider] })
  return provider
}

export function readProviderStandardsAcceptance(name) {
  const normalizedName = String(name ?? '').trim().toLowerCase()
  if (!normalizedName) return ''
  return readProfileSnapshot().providersByName.get(normalizedName)?.standardsAcceptance ?? ''
}

export function findOscProvider(name) {
  const normalizedName = String(name ?? '').trim().toLowerCase()
  if (!normalizedName) return null
  const provider = readProfileSnapshot().providersByName.get(normalizedName)
  return provider ? structuredClone(provider) : null
}

export function formatProviderReference(name) {
  const standard = readProviderStandardsAcceptance(name)
  return standard ? `${name} — ${standard}` : name
}
