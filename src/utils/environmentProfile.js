const STORAGE_KEY = 'cmmc-environment-profile'

export const DEFAULT_ENVIRONMENT_PROFILE = {
  businessOverview: '',
  environmentOverview: '',
  technologies: {
    identityProvider: [],
    endpointProtection: [],
    firewall: [],
    vpn: [],
    vulnerabilityManagement: [],
    backupSolution: [],
  },
  esps: [],
  locationsAndCui: {
    physicalLocations: '',
    cuiStored: '',
    cuiProcessed: '',
    cuiTransmitted: '',
  },
}

// Normalizes a technology field value from any stored format to string[].
// Handles: missing/null → [], string → split on comma, array → kept as-is.
// This provides backward compatibility with the previous string storage format.
function normalizeTechValue(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.trim() !== '')
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

export function readEnvironmentProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_ENVIRONMENT_PROFILE)
    const parsed = JSON.parse(raw)
    const rawTech = parsed.technologies ?? {}
    return {
      ...DEFAULT_ENVIRONMENT_PROFILE,
      ...parsed,
      technologies: {
        identityProvider:        normalizeTechValue(rawTech.identityProvider),
        endpointProtection:      normalizeTechValue(rawTech.endpointProtection),
        firewall:                normalizeTechValue(rawTech.firewall),
        vpn:                     normalizeTechValue(rawTech.vpn),
        vulnerabilityManagement: normalizeTechValue(rawTech.vulnerabilityManagement),
        backupSolution:          normalizeTechValue(rawTech.backupSolution),
      },
      locationsAndCui: { ...DEFAULT_ENVIRONMENT_PROFILE.locationsAndCui, ...(parsed.locationsAndCui ?? {}) },
      esps: Array.isArray(parsed.esps) ? parsed.esps : [],
    }
  } catch {
    return structuredClone(DEFAULT_ENVIRONMENT_PROFILE)
  }
}

export function writeEnvironmentProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}

// Returns all non-empty technology tag strings across all six tech fields.
// Used to seed inheritance source suggestions with environment context.
export function getEnvironmentTechTags() {
  try {
    const profile = readEnvironmentProfile()
    const tags = []
    for (const arr of Object.values(profile.technologies)) {
      for (const tag of arr) {
        if (tag.trim()) tags.push(tag.trim())
      }
    }
    return tags
  } catch {
    return []
  }
}

// Completion logic for the Home status card.
// Complete when: businessOverview + environmentOverview filled,
// at least one technology tag present, and at least one ESP row
// OR at least one locationsAndCui field filled.
export function isEnvironmentProfileComplete(profile) {
  if (!profile.businessOverview.trim()) return false
  if (!profile.environmentOverview.trim()) return false
  const hasTech = Object.values(profile.technologies).some((arr) => arr.length > 0)
  if (!hasTech) return false
  const hasEsp = profile.esps.length > 0
  const hasLocations = Object.values(profile.locationsAndCui).some((v) => v.trim() !== '')
  return hasEsp || hasLocations
}

// TODO: When a formal New Project / Clear Project flow is added, call
// localStorage.removeItem(STORAGE_KEY) as part of that reset sequence.
