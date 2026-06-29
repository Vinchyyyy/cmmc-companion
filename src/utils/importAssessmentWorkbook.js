// Import an official CMMC Level 2 Assessment Results Template workbook (.xlsx)
// and populate local project state.
//
// Parse backend: JSZip surgical XML read (mirrors the export strategy in
// exportCmmcTemplate.js).  Opens the uploaded workbook as a ZIP archive,
// reads the Requirement Objectives worksheet, and extracts populated values
// from the editable columns detected by header name.
//
// Column detection: reads the header row (row 5) by name instead of relying
// on hardcoded column letters. This makes the importer resilient to minor
// template variations.
//
// Key fix over v1: the original extractCellText used a single regex
//   <c r="ADDR"([^>]*)(?:/>|([\s\S]*?)<\/c>)
// The greedy ([^>]*) consumed the "/" in self-closing cells ("/>"), causing
// the alternation to fall through and capture content from later cells up to
// the first </c> in the row. Empty Interview/Examine/Test cells therefore
// returned the raw shared-string index from the Inherited (K) column.
// Fixed by using indexOf-based matching that correctly short-circuits on "/".
//
// All data flows through the existing write utilities — same localStorage
// keys, same shapes, same JSON export/import paths.

import JSZip from 'jszip'
import { wipeProjectState } from './projectState'
import {
  INHERITANCE_VALUES,
  DEFAULT_INHERITANCE,
  readInheritance,
  writeInheritance,
  readInheritanceSource,
  writeInheritanceSources,
} from './inheritance'
import { normalizeAssignee, readAssignedTo, writeAssignedTo } from './assignment'
import {
  OBJECTIVE_STATUS_UNREVIEWED,
  readObjectiveStatus,
  writeObjectiveStatus,
  getTrendingStatusFromStorage,
} from './objectiveStatus'
import { readStatus, writeStatus, DEFAULT_STATUS } from './status'
import { readObjectiveResult, writeObjectiveResult } from './objectiveResults'
import { readObjectiveFinding, writeObjectiveFinding } from './objectiveFindings'
import { readObjectiveArtifactIds, writeObjectiveArtifactIds } from './objectiveArtifacts'
import { findOrCreate, findByName } from './artifactRegistry'

// ---------------------------------------------------------------------------
// L2 → L1 denormalization (inverse of the L1_TO_L2 map in exportCmmcTemplate)
// ---------------------------------------------------------------------------

const L2_TO_L1 = {
  'AC.L2-3.1.1':  'AC.L1-3.1.1',
  'AC.L2-3.1.2':  'AC.L1-3.1.2',
  'AC.L2-3.1.20': 'AC.L1-3.1.20',
  'AC.L2-3.1.22': 'AC.L1-3.1.22',
  'IA.L2-3.5.1':  'IA.L1-3.5.1',
  'IA.L2-3.5.2':  'IA.L1-3.5.2',
  'MP.L2-3.8.3':  'MP.L1-3.8.3',
  'PE.L2-3.10.1': 'PE.L1-3.10.1',
  'PE.L2-3.10.3': 'PE.L1-3.10.3',
  'PE.L2-3.10.4': 'PE.L1-3.10.4',
  'PE.L2-3.10.5': 'PE.L1-3.10.5',
  'SC.L2-3.13.1': 'SC.L1-3.13.1',
  'SC.L2-3.13.5': 'SC.L1-3.13.5',
  'SI.L2-3.14.1': 'SI.L1-3.14.1',
  'SI.L2-3.14.2': 'SI.L1-3.14.2',
  'SI.L2-3.14.4': 'SI.L1-3.14.4',
  'SI.L2-3.14.5': 'SI.L1-3.14.5',
}

function denormalizeControlId(templateId) {
  return L2_TO_L1[templateId] ?? templateId
}

// ---------------------------------------------------------------------------
// XML utilities
// ---------------------------------------------------------------------------

// Parse sharedStrings.xml into a plain string array (index-aligned with the
// workbook's sharedStrings SST). Handles simple <t> and rich-text <r><t> forms.
function parseSharedStrings(xml) {
  const strings = []
  const siRe = /<si>([\s\S]*?)<\/si>/g
  let m
  while ((m = siRe.exec(xml)) !== null) {
    const texts = []
    const tRe = /<t(?:\s[^>]*)?>([^<]*)<\/t>/g
    let tm
    while ((tm = tRe.exec(m[1])) !== null) texts.push(tm[1])
    strings.push(texts.join(''))
  }
  return strings
}

// Resolve the ZIP path for a sheet by name via workbook.xml + .rels.
function resolveSheetPath(wbXml, wbRelsXml, sheetName) {
  const escaped = sheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const rIdM =
    wbXml.match(new RegExp(`<sheet[^>]+name="${escaped}"[^>]+r:id="([^"]+)"`)) ??
    wbXml.match(new RegExp(`<sheet[^>]+r:id="([^"]+)"[^>]+name="${escaped}"`))
  if (!rIdM) throw new Error(`Sheet "${sheetName}" not found in workbook.xml`)
  const rId = rIdM[1]
  const targetM =
    wbRelsXml.match(new RegExp(`<Relationship[^>]+Id="${rId}"[^>]+Target="([^"]+)"`)) ??
    wbRelsXml.match(new RegExp(`<Relationship[^>]+Target="([^"]+)"[^>]+Id="${rId}"`))
  if (!targetM) throw new Error(`Relationship "${rId}" not found in workbook.xml.rels`)
  return 'xl/' + targetM[1]
}

function unescXml(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

// ---------------------------------------------------------------------------
// Cell value extraction — indexOf-based, not regex-based.
//
// The original implementation used a single regex:
//   <c r="ADDR"([^>]*)(?:/>|([\s\S]*?)<\/c>)
//
// BUG: ([^>]*) is greedy and matches "/" because "/" is not ">". In a
// self-closing cell like <c r="E14" s="13"/>, attrs captured " s="13"/"
// (including the slash), leaving only ">" for the alternation. The "/"
// branch failed so the ">([\s\S]*?)<\/c>" branch ran, capturing content
// across multiple subsequent cells until the first </c> in the row.
// Empty Interview/Examine/Test cells therefore returned the raw shared-
// string index from the first non-empty close-tagged cell (K14 Inherited).
//
// Fix: locate the cell by indexOf (exact prefix match), then inspect the
// character immediately before the closing ">" to determine self-closing.
// ---------------------------------------------------------------------------

function extractCellText(rowXml, col, rowNum, sharedStrings) {
  const addr = `${col}${rowNum}`
  const prefix = `<c r="${addr}"`

  const startIdx = rowXml.indexOf(prefix)
  if (startIdx === -1) return ''

  // Guard against partial matches (e.g. "E1" matching inside "E14").
  // The character immediately after the quoted address must be a delimiter.
  const charAfterAddr = rowXml[startIdx + prefix.length]
  if (charAfterAddr !== ' ' && charAfterAddr !== '/' && charAfterAddr !== '>') return ''

  // Find the closing '>' of the opening tag.
  const tagCloseIdx = rowXml.indexOf('>', startIdx)
  if (tagCloseIdx === -1) return ''

  // Self-closing cell: <c r="..." ... />  → empty value
  if (rowXml[tagCloseIdx - 1] === '/') return ''

  // Open cell: extract attributes string and inner content
  const attrs = rowXml.slice(startIdx + prefix.length, tagCloseIdx)
  const innerStart = tagCloseIdx + 1
  const innerEnd   = rowXml.indexOf('</c>', innerStart)
  if (innerEnd === -1) return ''
  const inner = rowXml.slice(innerStart, innerEnd)

  // Shared string (t="s"): <v>INDEX</v> → look up in sharedStrings array
  if (/\bt="s"/.test(attrs)) {
    const vMatch = inner.match(/<v>(\d+)<\/v>/)
    if (!vMatch) return ''
    return unescXml(sharedStrings[parseInt(vMatch[1])] ?? '')
  }

  // Inline string (t="inlineStr"): <is><t ...>TEXT</t></is>
  // Collect all <t> segments to handle rich-text and xml:space="preserve".
  if (/\bt="inlineStr"/.test(attrs)) {
    const texts = []
    const tRe = /<t(?:\s[^>]*)?>([^]*?)<\/t>/g
    let tm
    while ((tm = tRe.exec(inner)) !== null) texts.push(tm[1])
    return unescXml(texts.join(''))
  }

  // Formula-evaluated string (t="str"): value is in <v>TEXT</v>
  if (/\bt="str"/.test(attrs)) {
    const vMatch = inner.match(/<v>([^<]*)<\/v>/)
    return vMatch ? unescXml(vMatch[1]) : ''
  }

  // Numeric / formula-numeric (no t attribute): return raw value string.
  // Callers must decide whether a numeric string is meaningful for the field.
  const vMatch = inner.match(/<v>([^<]*)<\/v>/)
  return vMatch ? unescXml(vMatch[1]) : ''
}

// ---------------------------------------------------------------------------
// Column letter extraction from a row of XML
// ---------------------------------------------------------------------------

// Extract all column-letter → cell-value pairs from a header row.
// Returns Map<colLetter, string>.
function readHeaderRow(rowXml, rowNum, sharedStrings) {
  const result = new Map()
  // Iterate A-Z using extractCellText; official template uses A-Q only.
  // Brute-force is fine for a single header row with ~17 columns.
  const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  for (const col of COLS) {
    const val = extractCellText(rowXml, col, rowNum, sharedStrings).trim()
    if (val) result.set(col, val)
  }
  return result
}

// ---------------------------------------------------------------------------
// Header-based column detection
// ---------------------------------------------------------------------------

// Canonical aliases for each logical field. Keys are the field names used
// internally; values are arrays of lowercase header substrings to match.
// First substring match wins.
const COLUMN_ALIASES = {
  objectiveKey:   ['objective number', 'objective ref', 'objective id', 'objective no'],
  evidence:       ['artifact', 'evidence'],
  interviews:     ['interview'],
  examine:        ['examine'],
  test:           ['test'],
  overallComments:['overall comment'],
  inherited:      ['inherited'],
  inheritedFrom:  ['esp name', 'if dependent', 'inherited from'],
  score:          ['score', 'assessment status'],
  assessedBy:     ['assessed by', 'assigned to', 'owner'],
  findings:       ['finding'],
  // Explicitly skipped fields — no import:
  timeToAssess:   ['time to assess', 'time in minute'],
  standardsAcceptance: ['standards acceptance'],
}

/**
 * Given a Map<colLetter, headerText> from readHeaderRow, returns a
 * Map<fieldName, colLetter> by matching header text to COLUMN_ALIASES.
 */
function detectColumns(headerMap) {
  const colByField = new Map()
  const unrecognisedCols = []

  for (const [col, header] of headerMap) {
    const norm = header.toLowerCase()
    let matched = false
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some((a) => norm.includes(a))) {
        if (!colByField.has(field)) colByField.set(field, col)
        matched = true
        break
      }
    }
    if (!matched) unrecognisedCols.push({ col, header })
  }

  return { colByField, unrecognisedCols }
}

// ---------------------------------------------------------------------------
// Artifact splitting
// ---------------------------------------------------------------------------

// Split an evidence/artifact cell into individual artifact names.
// Splits on semicolons, newlines, and carriage returns per spec.
// Does NOT split on commas (filenames may contain commas).
function splitArtifacts(text) {
  if (!text.trim()) return []
  return text
    .split(/[;\n\r]+/)
    .map((s) => s.trim().replace(/;+$/, '').trim())
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Status normalization
// ---------------------------------------------------------------------------

function normalizeObjectiveStatus(raw) {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s === 'met') return 'MET'
  if (s === 'not met') return 'NOT MET'
  return null
}

function normalizeInheritance(raw) {
  const s = String(raw ?? '').trim()
  return INHERITANCE_VALUES.find((v) => v.toLowerCase() === s.toLowerCase()) ?? null
}

// Returns true if the value is purely numeric (integer or decimal).
// Used to guard text fields against accidental numeric cell contamination.
function isPurelyNumeric(val) {
  return /^-?\d+(\.\d+)?$/.test(String(val ?? '').trim())
}

// ---------------------------------------------------------------------------
// String normalization for fuzzy matching
// ---------------------------------------------------------------------------

// Lowercases, trims, collapses whitespace, strips punctuation — used for
// case/punctuation-insensitive comparisons during reconciliation.
function normStr(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// Inheritance source fuzzy / alias matching
// ---------------------------------------------------------------------------

// Alias table: normalized pattern substrings → canonical display name.
// Matching is done against normStr(raw). Patterns are tried in order;
// the first match wins.
const INHERITANCE_SOURCE_ALIASES = [
  {
    patterns: ['microsoft entra id', 'entra id', 'azure active directory', 'azure ad', 'aad', 'entra'],
    canonical: 'Microsoft Entra ID',
  },
  {
    patterns: ['microsoft 365 gcc high', 'm365 gcc high', 'office 365 gcc high', 'o365 gcc high', 'gcc high'],
    canonical: 'Microsoft 365 GCC High',
  },
  {
    patterns: ['jamf pro', 'jamf mdm', 'jamf'],
    canonical: 'Jamf Pro',
  },
  {
    patterns: ['aws govcloud', 'amazon govcloud', 'govcloud'],
    canonical: 'AWS GovCloud',
  },
  {
    patterns: ['microsoft azure government', 'azure government', 'microsoft azure'],
    canonical: 'Microsoft Azure',
  },
]

/**
 * Attempt to match a raw source string against existing project sources
 * or well-known alias patterns.
 *
 * Returns one of:
 *   { type: 'exact',            resolvedTo: string }   — exact case-insensitive match
 *   { type: 'alias',            resolvedTo: string }   — alias matched to an existing source
 *   { type: 'alias_suggestion', suggestion: string }   — alias matched; canonical not yet in project
 *   null                                               — no match
 */
function fuzzyMatchSource(raw, existingSources) {
  if (!raw || !raw.trim()) return null
  const norm = normStr(raw)

  // Exact case-insensitive match against existing project sources
  const exactMatch = existingSources.find((s) => normStr(s) === norm)
  if (exactMatch) return { type: 'exact', resolvedTo: exactMatch }

  // Alias-based match
  for (const { patterns, canonical } of INHERITANCE_SOURCE_ALIASES) {
    const hit = patterns.some((p) => {
      const np = normStr(p)
      return norm === np || norm.includes(np) || np.includes(norm)
    })
    if (hit) {
      const inProject = existingSources.find((s) => normStr(s) === normStr(canonical))
      if (inProject) return { type: 'alias', resolvedTo: inProject }
      return { type: 'alias_suggestion', suggestion: canonical }
    }
  }
  return null
}

/**
 * Match a raw assignee string against existing project assignees.
 * Uses normalizeAssignee (Title Case) for both sides.
 * Returns the matched existing value string, or null.
 */
function fuzzyMatchAssignee(raw, existingAssignees) {
  if (!raw || !raw.trim()) return null
  const normRaw = normalizeAssignee(raw)
  return existingAssignees.find((a) => normalizeAssignee(a) === normRaw) ?? null
}

// ---------------------------------------------------------------------------
// Collect current project values for reconciliation seeds
// ---------------------------------------------------------------------------

function collectExistingAssignees() {
  try {
    const results = []
    const seen = new Set()
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('cmmc-assigned-to-')) {
        const val = localStorage.getItem(key)
        if (val && !seen.has(val)) { seen.add(val); results.push(val) }
      }
    }
    return results.sort()
  } catch {
    return []
  }
}

function collectExistingInheritanceSources() {
  try {
    const results = []
    const seen = new Set()
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('cmmc-inheritance-sources-')) {
        try {
          const arr = JSON.parse(localStorage.getItem(key))
          if (Array.isArray(arr)) {
            for (const s of arr) {
              if (s && !seen.has(s)) { seen.add(s); results.push(s) }
            }
          }
        } catch { /* skip malformed */ }
      } else if (key && key.startsWith('cmmc-inheritance-source-')) {
        const val = localStorage.getItem(key)
        if (val && val.trim() && !seen.has(val)) { seen.add(val); results.push(val) }
      }
    }
    return results.sort()
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Sheet detection
// ---------------------------------------------------------------------------

const SHEET_NAME_ALIASES = ['Requirement Objectives', 'Requirement Objective', 'Requirements']

// Row number where column headers appear in the official template.
const HEADER_ROW = 5

// Data rows start at this row (≥ DATA_ROW_START).
const DATA_ROW_START = 6

// ---------------------------------------------------------------------------
// Public API: parse workbook
// ---------------------------------------------------------------------------

/**
 * Opens an official CMMC L2 Assessment Results Template workbook from an
 * ArrayBuffer, parses the Requirement Objectives sheet, and returns a
 * structured parse result.
 *
 * Does NOT write to localStorage — safe to call before the confirm modal.
 *
 * @param {ArrayBuffer} fileBuffer
 * @param {Array}       controls — app control list for ID and objective validation
 * @returns {Promise<{ ok: boolean, error?: string, ...parsedData }>}
 */
export async function parseAssessmentWorkbook(fileBuffer, controls) {
  const controlMap = new Map(controls.map((c) => [c.id, c]))

  // Open as ZIP
  let zip
  try {
    zip = await JSZip.loadAsync(fileBuffer)
  } catch {
    return { ok: false, error: 'This file does not appear to be a supported CMMC Assessment Results Template.' }
  }

  // Load workbook XML and its relationships
  let wbXml, wbRelsXml
  try {
    wbXml     = await zip.file('xl/workbook.xml')?.async('string')
    wbRelsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string')
  } catch {
    return { ok: false, error: 'This file does not appear to be a supported CMMC Assessment Results Template.' }
  }
  if (!wbXml || !wbRelsXml) {
    return { ok: false, error: 'This file does not appear to be a supported CMMC Assessment Results Template.' }
  }

  // Locate the Requirement Objectives sheet
  let sheetPath = null
  for (const alias of SHEET_NAME_ALIASES) {
    try {
      sheetPath = resolveSheetPath(wbXml, wbRelsXml, alias)
      break
    } catch {
      // try next alias
    }
  }
  if (!sheetPath) {
    return { ok: false, error: 'This file does not appear to be a supported CMMC Assessment Results Template.' }
  }

  // Load shared strings (user-added values extend the original array)
  let sharedStrings = []
  try {
    const ssXml = await zip.file('xl/sharedStrings.xml')?.async('string')
    if (ssXml) sharedStrings = parseSharedStrings(ssXml)
  } catch { /* use empty array */ }

  // Load worksheet XML
  let wsXml
  try {
    wsXml = await zip.file(sheetPath)?.async('string')
  } catch {
    return { ok: false, error: 'This file does not appear to be a supported CMMC Assessment Results Template.' }
  }
  if (!wsXml) {
    return { ok: false, error: 'This file does not appear to be a supported CMMC Assessment Results Template.' }
  }

  // ---------------------------------------------------------------------------
  // Step 1: Find the header row and detect columns
  // ---------------------------------------------------------------------------
  const rowRe = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g
  let headerRowXml = null
  let rowMatch
  rowRe.lastIndex = 0
  while ((rowMatch = rowRe.exec(wsXml)) !== null) {
    if (parseInt(rowMatch[1]) === HEADER_ROW) {
      headerRowXml = rowMatch[2]
      break
    }
  }

  let colByField = new Map()
  const headerWarnings = []

  if (headerRowXml) {
    const headerMap = readHeaderRow(headerRowXml, HEADER_ROW, sharedStrings)
    const detected  = detectColumns(headerMap)
    colByField      = detected.colByField

    const requiredFields = ['objectiveKey', 'evidence', 'interviews', 'examine', 'test', 'score']
    for (const field of requiredFields) {
      if (!colByField.has(field)) {
        headerWarnings.push(`Column for "${field}" not found in header row — field will not be imported.`)
      }
    }
  } else {
    // Fall back to known official template column letters if header row missing
    colByField.set('objectiveKey',    'B')
    colByField.set('evidence',        'D')
    colByField.set('interviews',      'E')
    colByField.set('examine',         'F')
    colByField.set('test',            'G')
    colByField.set('overallComments', 'H')
    colByField.set('inherited',       'K')
    colByField.set('inheritedFrom',   'L')
    colByField.set('score',           'M')
    colByField.set('assessedBy',      'O')
    colByField.set('findings',        'P')
    headerWarnings.push('Header row not found — using default official template column layout.')
  }

  const colObjectiveKey    = colByField.get('objectiveKey')    ?? 'B'
  const colEvidence        = colByField.get('evidence')        ?? null
  const colInterviews      = colByField.get('interviews')      ?? null
  const colExamine         = colByField.get('examine')         ?? null
  const colTest            = colByField.get('test')            ?? null
  const colOverallComments = colByField.get('overallComments') ?? null
  const colInherited       = colByField.get('inherited')       ?? null
  const colInheritedFrom   = colByField.get('inheritedFrom')   ?? null
  const colScore           = colByField.get('score')           ?? null
  const colAssessedBy      = colByField.get('assessedBy')      ?? null
  const colFindings        = colByField.get('findings')        ?? null

  // ---------------------------------------------------------------------------
  // Step 2: Parse all data rows
  // ---------------------------------------------------------------------------
  const controlData   = {}
  const objectiveData = {}

  const counts = {
    controlsFound:          0,
    objectivesFound:        0,
    objectiveStatusesFound: 0,
    findingsFound:          0,
    artifactRefsFound:      0,
    interviewNotesFound:    0,
    examineNotesFound:      0,
    testNotesFound:         0,
    overallCommentsFound:   0,
    unrecognizedStatuses:   0,
  }

  // Collect unique raw values for reconciliation
  const uniqueAssessedBy    = new Set()
  const uniqueInheritedFrom = new Set()

  let matchedRows = 0
  rowRe.lastIndex = 0
  while ((rowMatch = rowRe.exec(wsXml)) !== null) {
    const rowNum = parseInt(rowMatch[1])
    const rowXml = rowMatch[2]
    if (rowNum < DATA_ROW_START) continue

    const templateKey = extractCellText(rowXml, colObjectiveKey, rowNum, sharedStrings)
    if (!templateKey) continue

    const keyMatch = templateKey.match(/^(.+)\[([^\]]+)\]$/)
    if (!keyMatch) continue

    const templateControlId  = keyMatch[1]
    const objectiveId        = keyMatch[2]
    const companionControlId = denormalizeControlId(templateControlId)

    if (!controlMap.has(companionControlId)) continue

    matchedRows++

    const readCol = (col) =>
      col ? extractCellText(rowXml, col, rowNum, sharedStrings) : ''

    // Guard text fields against accidental numeric cell contamination
    const readTextCol = (col) => {
      const val = readCol(col)
      if (isPurelyNumeric(val) && val.length > 4) return ''
      return val
    }

    const evidence        = readCol(colEvidence)
    const interviews      = readTextCol(colInterviews)
    const examine         = readTextCol(colExamine)
    const test            = readTextCol(colTest)
    const overallComments = readTextCol(colOverallComments)
    const inherited       = readCol(colInherited)
    const inheritedFrom   = readCol(colInheritedFrom)
    const score           = readCol(colScore)
    const assessedBy      = readCol(colAssessedBy)
    const findings        = readTextCol(colFindings)

    // Accumulate raw values for reconciliation (set deduplicates automatically)
    if (assessedBy.trim())   uniqueAssessedBy.add(assessedBy.trim())
    if (inheritedFrom.trim()) uniqueInheritedFrom.add(inheritedFrom.trim())

    // Control-level data
    if (!controlData[companionControlId]) {
      controlData[companionControlId] = {}
      counts.controlsFound++
    }
    const normInheritance = normalizeInheritance(inherited)
    if (normInheritance)      controlData[companionControlId].inheritance      = normInheritance
    if (inheritedFrom.trim()) controlData[companionControlId].inheritanceSource = inheritedFrom.trim()
    if (assessedBy.trim())   controlData[companionControlId].assignedTo        = assessedBy.trim()

    // Objective-level data
    if (!objectiveData[companionControlId]) objectiveData[companionControlId] = {}
    counts.objectivesFound++

    const status = score.trim() ? normalizeObjectiveStatus(score) : null
    if (score.trim()) {
      if (status) counts.objectiveStatusesFound++
      else counts.unrecognizedStatuses++
    }

    const artifacts = splitArtifacts(evidence)
    counts.artifactRefsFound    += artifacts.length
    if (interviews.trim())       counts.interviewNotesFound++
    if (examine.trim())          counts.examineNotesFound++
    if (test.trim())             counts.testNotesFound++
    if (overallComments.trim())  counts.overallCommentsFound++
    if (findings.trim())         counts.findingsFound++

    objectiveData[companionControlId][objectiveId] = {
      status,
      interviews:      interviews.trim(),
      examine:         examine.trim(),
      test:            test.trim(),
      overallComments: overallComments.trim(),
      findings:        findings.trim(),
      artifacts,
    }
  }

  if (matchedRows < 3) {
    return { ok: false, error: 'This file does not appear to be a supported CMMC Assessment Results Template.' }
  }

  // ---------------------------------------------------------------------------
  // Step 3: Compute derived-status counts
  // ---------------------------------------------------------------------------
  // The app's objective status vocab is MET / NOT MET / Unreviewed.
  // There is no "In Progress" status value. Objectives with imported content
  // but no explicit workbook status are left as Unreviewed; their data
  // (notes, artifacts, findings) is still imported and visible in the app.

  let derivedFromWorkbook = 0
  let derivedFromContent  = 0
  let derivedNoData       = 0

  for (const objMap of Object.values(objectiveData)) {
    for (const objEntry of Object.values(objMap)) {
      const hasContent =
        objEntry.artifacts.length > 0 ||
        objEntry.interviews ||
        objEntry.examine ||
        objEntry.test ||
        objEntry.overallComments ||
        objEntry.findings
      if (objEntry.status) {
        derivedFromWorkbook++
      } else if (hasContent) {
        derivedFromContent++
      } else {
        derivedNoData++
      }
    }
  }

  const derivedStatusCounts = {
    fromWorkbook: derivedFromWorkbook,
    fromContent:  derivedFromContent,
    noData:       derivedNoData,
  }

  // ---------------------------------------------------------------------------
  // Step 4: Build reconciliation structures
  // ---------------------------------------------------------------------------
  const existingAssignees = collectExistingAssignees()
  const existingSources   = collectExistingInheritanceSources()

  const reconAssignedTo = { matched: [], unmatched: [] }
  for (const raw of uniqueAssessedBy) {
    const match = fuzzyMatchAssignee(raw, existingAssignees)
    if (match) {
      reconAssignedTo.matched.push({ raw, resolvedTo: match })
    } else {
      reconAssignedTo.unmatched.push({ raw })
    }
  }

  const reconSources = { matched: [], unmatched: [] }
  for (const raw of uniqueInheritedFrom) {
    const result = fuzzyMatchSource(raw, existingSources)
    if (!result) {
      reconSources.unmatched.push({ raw, suggestion: null })
    } else if (result.type === 'exact' || result.type === 'alias') {
      reconSources.matched.push({ raw, resolvedTo: result.resolvedTo })
    } else {
      // alias_suggestion — canonical exists but not in this project yet
      reconSources.unmatched.push({ raw, suggestion: result.suggestion })
    }
  }

  // ---------------------------------------------------------------------------
  // Step 5: Build summary and warnings
  // ---------------------------------------------------------------------------
  const allArtifactNames = []
  const artifactNameSet  = new Set()
  for (const objMap of Object.values(objectiveData)) {
    for (const objEntry of Object.values(objMap)) {
      for (const name of objEntry.artifacts) {
        if (!artifactNameSet.has(name)) {
          artifactNameSet.add(name)
          allArtifactNames.push(name)
        }
      }
    }
  }

  let newArtifacts = 0
  for (const name of allArtifactNames) {
    if (!findByName(name)) newArtifacts++
  }

  let existingObjectivesWithData = 0
  for (const [controlId, objMap] of Object.entries(objectiveData)) {
    for (const objId of Object.keys(objMap)) {
      const hasStatus  = readObjectiveStatus(controlId, objId) !== OBJECTIVE_STATUS_UNREVIEWED
      const hasResult  = Object.values(readObjectiveResult(controlId, objId)).some((v) => v.trim() !== '')
      const hasFinding = readObjectiveFinding(controlId, objId) !== null
      if (hasStatus || hasResult || hasFinding) existingObjectivesWithData++
    }
  }

  const warnings = [...headerWarnings]
  if (newArtifacts > 0) {
    warnings.push(
      `${newArtifacts} artifact${newArtifacts === 1 ? ' is' : 's are'} new and will be added to Documented Artifacts.`
    )
  }
  if (counts.unrecognizedStatuses > 0) {
    warnings.push(
      `${counts.unrecognizedStatuses} status value${counts.unrecognizedStatuses === 1 ? '' : 's'} could not be recognized and will be left blank.`
    )
  }
  if (existingObjectivesWithData > 0) {
    warnings.push(
      `${existingObjectivesWithData} current objective${existingObjectivesWithData === 1 ? '' : 's'} already contain app data.`
    )
  }

  return {
    ok: true,
    controlData,
    objectiveData,
    counts,
    warnings,
    allArtifactNames,
    derivedStatusCounts,
    reconciliation: {
      assignedTo:       reconAssignedTo,
      inheritanceSources: reconSources,
      existingAssignees,
      existingSources,
    },
  }
}

// ---------------------------------------------------------------------------
// Public API: apply parsed data to localStorage
// ---------------------------------------------------------------------------

/**
 * Applies previously parsed workbook data to local project state.
 *
 * mode 'new'   — wipes current state first, then writes all imported values.
 * mode 'merge' — conservative merge: writes only where current fields are
 *                empty / default. Existing non-empty fields are preserved.
 *
 * reconciliationChoices — user decisions for unmatched assignedTo/source values:
 *   {
 *     assignedTo:         { [rawValue]: string }   — '' = ignore, else use this string
 *     inheritanceSources: { [rawValue]: string }   — '' = ignore, else use this string
 *   }
 *
 * @param {object}        parsedData
 * @param {Array}         controls
 * @param {'new'|'merge'} mode
 * @param {object}        [reconciliationChoices={}]
 * @returns {object} summary of what was written
 */
export function applyWorkbookImport(parsedData, controls, mode, reconciliationChoices = {}) {
  const { controlData, objectiveData, allArtifactNames, reconciliation } = parsedData
  const controlMap = new Map(controls.map((c) => [c.id, c]))
  const isNew = mode === 'new'

  if (isNew) wipeProjectState()

  const summary = {
    controlsApplied:           0,
    objectivesApplied:         0,
    statusesWritten:           0,
    resultsWritten:            0,
    findingsWritten:           0,
    artifactSetsWritten:       0,
    inheritanceWritten:        0,
    inheritanceSourcesWritten: 0,
    assignmentsWritten:        0,
  }

  // ---------------------------------------------------------------------------
  // Build unified value-resolution maps from reconciliation data + user choices
  // ---------------------------------------------------------------------------

  // Assigned To resolution: raw value → resolved string (or null to ignore)
  const assignedToResolution = new Map()
  for (const { raw, resolvedTo } of (reconciliation?.assignedTo?.matched ?? [])) {
    assignedToResolution.set(raw, resolvedTo)
  }
  for (const { raw } of (reconciliation?.assignedTo?.unmatched ?? [])) {
    const choice = reconciliationChoices?.assignedTo?.[raw]
    // '' or undefined → ignore (null); any non-empty string → use it
    assignedToResolution.set(raw, choice || null)
  }

  // Inheritance source resolution: raw value → resolved string (or null to ignore)
  const sourceResolution = new Map()
  for (const { raw, resolvedTo } of (reconciliation?.inheritanceSources?.matched ?? [])) {
    sourceResolution.set(raw, resolvedTo)
  }
  for (const { raw, suggestion } of (reconciliation?.inheritanceSources?.unmatched ?? [])) {
    const choice = reconciliationChoices?.inheritanceSources?.[raw]
    if (choice !== undefined) {
      // User made a choice: '' = ignore, non-empty = use it
      sourceResolution.set(raw, choice || null)
    } else {
      // No user choice recorded — apply suggestion or raw (default behavior)
      sourceResolution.set(raw, suggestion ?? raw)
    }
  }

  // Helper: resolve an assignedTo raw value via the resolution map
  const resolveAssignedTo = (raw) => {
    if (!raw) return null
    if (assignedToResolution.has(raw)) return assignedToResolution.get(raw)
    return raw  // no reconciliation data — use as-is (raw not tracked)
  }

  // Helper: resolve an inheritance source raw value via the resolution map
  const resolveSource = (raw) => {
    if (!raw) return null
    if (sourceResolution.has(raw)) return sourceResolution.get(raw)
    return raw
  }

  // ---------------------------------------------------------------------------
  // Ensure all artifact names exist in the registry
  // ---------------------------------------------------------------------------
  const nameToId = new Map()
  for (const name of allArtifactNames ?? []) {
    const rec = findOrCreate(name)
    if (rec) nameToId.set(name, rec.id)
  }

  // ---------------------------------------------------------------------------
  // Apply control-level data
  // ---------------------------------------------------------------------------
  for (const [controlId, ctrlData] of Object.entries(controlData)) {
    if (!controlMap.has(controlId)) continue
    summary.controlsApplied++

    if (ctrlData.inheritance && ctrlData.inheritance !== DEFAULT_INHERITANCE) {
      if (isNew || readInheritance(controlId) === DEFAULT_INHERITANCE) {
        writeInheritance(controlId, ctrlData.inheritance)
        summary.inheritanceWritten++
      }
    }

    if (ctrlData.inheritanceSource) {
      const resolved = resolveSource(ctrlData.inheritanceSource)
      if (resolved && (isNew || !readInheritanceSource(controlId).trim())) {
        writeInheritanceSources(controlId, [resolved])
        summary.inheritanceSourcesWritten++
      }
    }

    if (ctrlData.assignedTo) {
      const resolved = resolveAssignedTo(ctrlData.assignedTo)
      if (resolved && (isNew || !readAssignedTo(controlId))) {
        writeAssignedTo(controlId, resolved)
        summary.assignmentsWritten++
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Apply objective-level data
  // ---------------------------------------------------------------------------
  for (const [controlId, objMap] of Object.entries(objectiveData)) {
    const control = controlMap.get(controlId)
    if (!control) continue
    const knownObjectiveIds = new Set((control.objectives ?? []).map((o) => o.id))

    let contentAppliedThisControl = false

    for (const [objId, objEntry] of Object.entries(objMap)) {
      if (!knownObjectiveIds.has(objId)) continue
      summary.objectivesApplied++

      // Objective status
      if (objEntry.status) {
        if (isNew || readObjectiveStatus(controlId, objId) === OBJECTIVE_STATUS_UNREVIEWED) {
          writeObjectiveStatus(controlId, objId, objEntry.status)
          summary.statusesWritten++
          contentAppliedThisControl = true
        }
      }

      // Objective results (interviews / examine / test / overallComments)
      const hasResults =
        objEntry.interviews || objEntry.examine || objEntry.test || objEntry.overallComments
      if (hasResults) {
        const current      = readObjectiveResult(controlId, objId)
        const currentEmpty = Object.values(current).every((v) => v.trim() === '')
        if (isNew || currentEmpty) {
          writeObjectiveResult(controlId, objId, {
            interviews:      objEntry.interviews,
            examine:         objEntry.examine,
            test:            objEntry.test,
            overallComments: objEntry.overallComments,
          })
          summary.resultsWritten++
          contentAppliedThisControl = true
        }
      }

      // Findings — preserve finalText as the source of truth
      if (objEntry.findings) {
        if (isNew || readObjectiveFinding(controlId, objId) === null) {
          writeObjectiveFinding(controlId, objId, {
            finalText:            objEntry.findings,
            importedFromWorkbook: true,
            updatedAt:            new Date().toISOString(),
            interviewedRoles:     [],
            includedArtifacts:    [],
            hasDifferences:       false,
            differencesText:      '',
          })
          summary.findingsWritten++
          contentAppliedThisControl = true
        }
      }

      // Objective artifacts — map display names → registry IDs
      if (objEntry.artifacts.length > 0) {
        if (isNew || readObjectiveArtifactIds(controlId, objId).length === 0) {
          const ids = [...new Set(
            objEntry.artifacts.map((n) => nameToId.get(n)).filter(Boolean)
          )]
          if (ids.length > 0) {
            writeObjectiveArtifactIds(controlId, objId, ids)
            summary.artifactSetsWritten++
            contentAppliedThisControl = true
          }
        }
      }
    }

    // Derive and write control-level status so dashboard shows In Progress
    // immediately after import rather than leaving the control as Not Started.
    if (contentAppliedThisControl && (isNew || readStatus(controlId) === DEFAULT_STATUS)) {
      const trending = getTrendingStatusFromStorage(control)
      writeStatus(controlId, trending !== 'Not Started' ? trending : 'In Progress')
    }
  }

  return summary
}
