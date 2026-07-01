// Shared, deterministic finding-statement builder used by the Findings Builder
// modal, DIBCAC group findings, and the bulk "Create Findings" workflow.
// No AI/automation — every sentence is produced from fixed templates plus the
// existing DIBCAC method tag and objective text already in the app's data.

// Collapse whitespace and strip a trailing terminator so the phrase can be
// dropped cleanly into a new sentence ("...support that <phrase>.").
export function normalizeObjectivePhrase(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[.;:]$/, '')
    .trim()
}

const FALLBACK_SENTENCE = 'Additional assessment evidence was reviewed to support the objective.'

// dibcacMethod: the `standard` value from getDibcacStandard() —
// 'document' | 'screen_share' | 'artifact' | 'physical_review' |
// 'artifact_and_screen_share' | null/unknown (treated as "Variable").
export function buildMethodValidationSentence(dibcacMethod, objectiveText) {
  const phrase = normalizeObjectivePhrase(objectiveText)
  if (!phrase) return FALLBACK_SENTENCE

  switch (dibcacMethod) {
    case 'document':
      return `Additional documentation was reviewed to support that ${phrase}.`
    case 'screen_share':
      return `A screen share was conducted to show that ${phrase}.`
    case 'artifact':
      return `Artifact evidence was reviewed to support that ${phrase}.`
    case 'artifact_and_screen_share':
      return `Artifact evidence and a screen share were reviewed to support that ${phrase}.`
    case 'physical_review':
      return `Physical review was performed to support that ${phrase}.`
    default:
      // Variable / unrecognized method
      return `Additional assessment evidence was reviewed to support that ${phrase}.`
  }
}

// Full SSP validation line: existing generic sentence + the new method-aware sentence.
export function buildObjectiveValidationStatement({ objectiveRef, objectiveText, dibcacMethod }) {
  const methodSentence = buildMethodValidationSentence(dibcacMethod, objectiveText)
  return `Validation is described in the corresponding ${objectiveRef} section of the SSP. ${methodSentence}`
}

function buildArtifactsText(artifacts) {
  const valid = (artifacts ?? []).filter((a) => a && a.trim())
  if (valid.length === 0) return null
  return valid.map((a) => `${a.trim()};`).join(' ')
}

// D-line confirmation language. Differences always take priority (existing
// behavior — "not implemented"). Otherwise the language is chosen by
// statusContext so non-MET/override-generated findings never falsely claim
// the objective is implemented.
//
// statusContext: 'MET' (default) | 'NOT_MET' | 'IN_PROGRESS' | 'UNREVIEWED'
function buildConfirmationLine({ hasDifferences, statusContext }) {
  if (hasDifferences) {
    return 'D) Assessment team confirmed in interview, testing, and documentation that this objective is not implemented.'
  }
  if (statusContext === 'NOT_MET') {
    return 'D) Assessment team did not confirm full implementation of this objective based on the reviewed evidence.'
  }
  if (statusContext === 'IN_PROGRESS' || statusContext === 'UNREVIEWED') {
    return 'D) Assessment team has not confirmed full implementation of this objective at the time of this finding statement.'
  }
  return 'D) Assessment team confirmed in interview, testing, and documentation that this objective is implemented.'
}

// Full finding statement text (Interviewed / A / B / C / D), shared across
// FindingsBuilderModal, DIBCAC group findings, and bulk findings generation.
export function buildFinalText({
  roles,
  includedArtifacts,
  objectiveRef,
  objectiveText,
  dibcacMethod,
  hasDifferences,
  differencesText,
  statusContext = 'MET',
}) {
  const lines = []

  if (roles && roles.length > 0) {
    lines.push(`Interviewed: ${roles.join('; ')}`)
    lines.push('')
  }

  const artifactsText = buildArtifactsText(includedArtifacts)
  lines.push(`A) Reviewed ${artifactsText ?? '[no artifact references entered]'}`)
  lines.push(`B) ${buildObjectiveValidationStatement({ objectiveRef, objectiveText, dibcacMethod })}`)

  if (hasDifferences) {
    lines.push(`C) Differences: ${(differencesText ?? '').trim()}`)
  } else {
    lines.push('C) No noted findings or differences.')
  }

  lines.push(buildConfirmationLine({ hasDifferences, statusContext }))

  return lines.join('\n')
}
