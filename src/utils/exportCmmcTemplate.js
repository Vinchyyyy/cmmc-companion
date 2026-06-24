// Export CMMC Companion project data into the official CMMC Level 2 Assessment Results Template.
// Populates the "Requirement Objectives" tab only.
//
// Write backend: JSZip surgical XML patch.
//   - Opens the bundled template as a raw ZIP archive.
//   - Resolves the Requirement Objectives worksheet path via workbook.xml + rels.
//   - Patches only editable cells (D/E/F/G/H/K/L/M/O/P) in place using inline strings.
//   - All other ZIP entries (styles, customXml, docMetadata, other sheets, rels, etc.)
//     are passed through completely untouched.
//
// Key rules:
//  - Columns A, B, C are never touched.
//  - Columns I, J, N are never touched.
//  - sharedStrings.xml is read (to resolve B-column template keys) but never written.
//  - Column N (Date Assessed) is left blank by policy.
//  - Column P (Findings) is populated with the saved Findings Builder statement when present.
//  - L1→L2 prefix normalization applied for 17 controls.
//  - Export continues even if a template row has no companion source; a warning summary is returned.

import JSZip from 'jszip'
import { readObjectiveNote } from './objectiveNotes'
import { readObjectiveResult } from './objectiveResults'
import { readObjectiveArtifacts } from './objectiveArtifacts'
import { readObjectiveFinding } from './objectiveFindings'
import { readPool } from './evidencePool'
import { readInheritance, readInheritanceSource } from './inheritance'
import { readAssignedTo } from './assignment'
import { readObjectiveStatus, OBJECTIVE_STATUS_MET, OBJECTIVE_STATUS_NOT_MET } from './objectiveStatus'
import { getDibcacStandard } from '../data/dibcacAssessmentStandards'

// ---------------------------------------------------------------------------
// L1 → L2 prefix normalization
// ---------------------------------------------------------------------------

const L1_TO_L2 = {
  'AC.L1-3.1.1':   'AC.L2-3.1.1',
  'AC.L1-3.1.2':   'AC.L2-3.1.2',
  'AC.L1-3.1.20':  'AC.L2-3.1.20',
  'AC.L1-3.1.22':  'AC.L2-3.1.22',
  'IA.L1-3.5.1':   'IA.L2-3.5.1',
  'IA.L1-3.5.2':   'IA.L2-3.5.2',
  'MP.L1-3.8.3':   'MP.L2-3.8.3',
  'PE.L1-3.10.1':  'PE.L2-3.10.1',
  'PE.L1-3.10.3':  'PE.L2-3.10.3',
  'PE.L1-3.10.4':  'PE.L2-3.10.4',
  'PE.L1-3.10.5':  'PE.L2-3.10.5',
  'SC.L1-3.13.1':  'SC.L2-3.13.1',
  'SC.L1-3.13.5':  'SC.L2-3.13.5',
  'SI.L1-3.14.1':  'SI.L2-3.14.1',
  'SI.L1-3.14.2':  'SI.L2-3.14.2',
  'SI.L1-3.14.4':  'SI.L2-3.14.4',
  'SI.L1-3.14.5':  'SI.L2-3.14.5',
}

function normalizeControlId(companionId) {
  return L1_TO_L2[companionId] ?? companionId
}

// ---------------------------------------------------------------------------
// Evidence formatting — each item ends with ";"
// ---------------------------------------------------------------------------

function formatArtifactList(items) {
  const cleaned = items.map((s) => s.trim()).filter(Boolean)
  if (cleaned.length === 0) return ''
  return cleaned.map((s) => (s.endsWith(';') ? s : `${s};`)).join('\n')
}

// ---------------------------------------------------------------------------
// Time to Assess (Minutes) — column I
// ---------------------------------------------------------------------------

// Deterministic integer in [5, 10] derived from the objective reference string.
// Same objective always gets the same value across exports.
function stableInt5to10(ref) {
  let h = 0
  for (let i = 0; i < ref.length; i++) {
    h = (Math.imul(31, h) + ref.charCodeAt(i)) | 0
  }
  return 5 + (Math.abs(h) % 6)
}

function timeToAssess(templateKey, dibcacStd) {
  if (!dibcacStd) return ''
  switch (dibcacStd.standard) {
    case 'artifact':                return 5
    case 'document':
    case 'screen_share':
    case 'artifact_and_screen_share': return stableInt5to10(templateKey)
    case 'physical_review':         return ''
    default:                        return ''
  }
}

// ---------------------------------------------------------------------------
// Score mapping
// ---------------------------------------------------------------------------

function toTemplateScore(companionStatus) {
  if (companionStatus === OBJECTIVE_STATUS_MET)     return 'Met'
  if (companionStatus === OBJECTIVE_STATUS_NOT_MET) return 'Not Met'
  return ''
}

// ---------------------------------------------------------------------------
// Inherited / ESP columns
// ---------------------------------------------------------------------------

function toTemplateInherited(companionInheritance) {
  if (companionInheritance === 'Full')    return 'Full'
  if (companionInheritance === 'Partial') return 'Partial'
  return 'None'
}

// ---------------------------------------------------------------------------
// Objective data builder
// ---------------------------------------------------------------------------

function readObjectiveData(controlId, objId) {
  const result    = readObjectiveResult(controlId, objId)
  const note      = readObjectiveNote(controlId, objId)
  const artifacts = readObjectiveArtifacts(controlId, objId)
  const status    = readObjectiveStatus(controlId, objId)
  const finding   = readObjectiveFinding(controlId, objId)

  const commentParts = []
  if (result.overallComments?.trim()) commentParts.push(result.overallComments.trim())
  if (note?.trim())                   commentParts.push(note.trim())

  return {
    interviews:      result.interviews?.trim()  ?? '',
    examine:         result.examine?.trim()     ?? '',
    test:            result.test?.trim()        ?? '',
    overallComments: commentParts.join('\n\n'),
    artifacts:       formatArtifactList(artifacts),
    score:           toTemplateScore(status),
    findingText:     finding?.finalText?.trim() ?? '',
  }
}

// ---------------------------------------------------------------------------
// Field map builder
// ---------------------------------------------------------------------------

function buildObjectiveMap(controls) {
  const companionByTemplateId = new Map()
  for (const ctrl of controls) {
    companionByTemplateId.set(normalizeControlId(ctrl.id), ctrl)
  }

  const objectiveData = new Map()
  const controlData   = new Map()

  for (const [templateId, ctrl] of companionByTemplateId) {
    const inheritance = readInheritance(ctrl.id)
    const esp         = readInheritanceSource(ctrl.id)
    const assessedBy  = readAssignedTo(ctrl.id)
    const pool        = readPool(ctrl.id)

    controlData.set(templateId, {
      inherited:  toTemplateInherited(inheritance),
      esp:        (inheritance !== 'None' && esp) ? esp : '',
      assessedBy: assessedBy ?? '',
      pool:       formatArtifactList(pool),
    })

    for (const obj of ctrl.objectives ?? []) {
      const templateKey = `${templateId}[${obj.id}]`
      const dibcacStd   = getDibcacStandard(ctrl.id, obj.id)
      const data        = readObjectiveData(ctrl.id, obj.id)
      data.timeToAssess = timeToAssess(templateKey, dibcacStd)
      objectiveData.set(templateKey, data)
    }
  }

  return { objectiveData, controlData }
}

// ---------------------------------------------------------------------------
// Warning summary
// ---------------------------------------------------------------------------

function buildWarningSummary(controls, objectiveData, templateRows) {
  const warnings = { l1ToL2Normalized: [], blankTemplateRows: [] }

  for (const ctrl of controls) {
    if (L1_TO_L2[ctrl.id]) {
      warnings.l1ToL2Normalized.push(`${ctrl.id} → ${L1_TO_L2[ctrl.id]}`)
    }
  }

  for (const { templateKey } of templateRows) {
    if (!objectiveData.has(templateKey)) {
      warnings.blankTemplateRows.push(`${templateKey} — no companion source (left blank)`)
    }
  }

  return warnings
}

// ---------------------------------------------------------------------------
// XML utilities
// ---------------------------------------------------------------------------

function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Parse sharedStrings.xml into a plain string array.
// Handles both simple <t> and rich-text <r><t> formats.
function parseSharedStrings(xml) {
  const strings = []
  const siRe = /<si>([\s\S]*?)<\/si>/g
  let m
  while ((m = siRe.exec(xml)) !== null) {
    const texts = []
    const tRe = /<t(?:\s[^>]*)?>([^<]*)<\/t>/g
    let tm
    while ((tm = tRe.exec(m[1])) !== null) {
      texts.push(tm[1])
    }
    strings.push(texts.join(''))
  }
  return strings
}

// Resolve the worksheet ZIP path for a given sheet name.
// Returns a path relative to the ZIP root, e.g. "xl/worksheets/sheet3.xml".
function resolveSheetPath(wbXml, wbRelsXml, sheetName) {
  const escaped = sheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Match <sheet name="..." ... r:id="rIdN"/> in either attribute order
  const rIdM = wbXml.match(
    new RegExp(`<sheet[^>]+name="${escaped}"[^>]+r:id="([^"]+)"`)
  ) ?? wbXml.match(
    new RegExp(`<sheet[^>]+r:id="([^"]+)"[^>]+name="${escaped}"`)
  )
  if (!rIdM) throw new Error(`Sheet "${sheetName}" not found in workbook.xml`)
  const rId = rIdM[1]

  // Match <Relationship Id="rIdN" ... Target="..."/>
  const targetM = wbRelsXml.match(
    new RegExp(`<Relationship[^>]+Id="${rId}"[^>]+Target="([^"]+)"`)
  ) ?? wbRelsXml.match(
    new RegExp(`<Relationship[^>]+Target="([^"]+)"[^>]+Id="${rId}"`)
  )
  if (!targetM) throw new Error(`Relationship "${rId}" not found in workbook.xml.rels`)

  // Target is relative to xl/, e.g. "worksheets/sheet3.xml"
  return 'xl/' + targetM[1]
}

// ---------------------------------------------------------------------------
// Cell-level XML patching
// ---------------------------------------------------------------------------

// Build an inline-string cell element, preserving the existing s= (style) attribute.
function makeInlineCell(addr, sAttr, value) {
  const s = sAttr != null ? ` s="${sAttr}"` : ''
  return `<c r="${addr}"${s} t="inlineStr"><is><t>${escXml(value)}</t></is></c>`
}

// Build a numeric cell element, preserving the existing s= (style) attribute.
function makeNumericCell(addr, sAttr, value) {
  const s = sAttr != null ? ` s="${sAttr}"` : ''
  return `<c r="${addr}"${s}><v>${value}</v></c>`
}

// Build an inline-string cell that preserves newlines (xml:space="preserve" on <t>).
// Suitable for multi-line finding statements written to the Findings column.
// The OOXML spec allows literal LF (\n) inside <t> elements when xml:space="preserve"
// is set; Excel renders them as in-cell line breaks when wrapText is active on the cell.
function makeMultilineInlineCell(addr, sAttr, value) {
  const s = sAttr != null ? ` s="${sAttr}"` : ''
  return `<c r="${addr}"${s} t="inlineStr"><is><t xml:space="preserve">${escXml(value)}</t></is></c>`
}

// Replace a single cell with a multiline inline string, preserving the s= style attribute.
// Uses xml:space="preserve" on <t> so that \n characters survive the round-trip to Excel.
// If value is empty the cell is left untouched.
function patchMultilineCell(rowContent, addr, value) {
  if (!value) return rowContent
  const cellRe = new RegExp(
    `<c r="${addr}"([^>]*?)(?:\\s*/>|>[\\s\\S]*?<\\/c>)`
  )
  const m = rowContent.match(cellRe)
  if (!m) return rowContent
  const sMatch = m[1].match(/s="(\d+)"/)
  return rowContent.replace(cellRe, makeMultilineInlineCell(addr, sMatch?.[1], value))
}

// Replace a single cell with a numeric value.
function patchNumericCell(rowContent, addr, value) {
  if (value === '' || value === null || value === undefined) return rowContent
  const cellRe = new RegExp(
    `<c r="${addr}"([^>]*?)(?:\\s*/>|>[\\s\\S]*?<\\/c>)`
  )
  const m = rowContent.match(cellRe)
  if (!m) return rowContent
  const sMatch = m[1].match(/s="(\d+)"/)
  return rowContent.replace(cellRe, makeNumericCell(addr, sMatch?.[1], value))
}

// Replace a single cell within a row's inner XML.
// The cell may be:
//   self-closing:  <c r="D6" s="13"/>
//   with content:  <c r="D6" s="13" t="s"><v>42</v></c>
// If value is empty, the cell is left untouched.
function patchCell(rowContent, addr, value) {
  if (!value) return rowContent

  const cellRe = new RegExp(
    `<c r="${addr}"([^>]*?)(?:\\s*/>|>[\\s\\S]*?<\\/c>)`
  )
  const m = rowContent.match(cellRe)
  if (!m) return rowContent

  const sMatch = m[1].match(/s="(\d+)"/)
  return rowContent.replace(cellRe, makeInlineCell(addr, sMatch?.[1], value))
}

// ---------------------------------------------------------------------------
// Worksheet XML patcher
// ---------------------------------------------------------------------------

// Walks every data row (row ≥ 6), reads the template key from the B column
// (shared string), looks up field data, and patches editable columns in place.
// Returns the modified worksheet XML string.
function patchWorksheetXml(wsXml, sharedStrings, objectiveData, controlData) {
  return wsXml.replace(
    /<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g,
    (full, rowNum, rowAttrs, rowContent) => {
      const r = parseInt(rowNum)
      if (r < 6) return full

      // Read the B-column shared string to get the template objective key
      const bMatch = rowContent.match(/<c r="B\d+"[^>]*t="s"[^>]*><v>(\d+)<\/v><\/c>/)
      if (!bMatch) return full

      const templateKey = sharedStrings[parseInt(bMatch[1])]
      if (!templateKey) return full

      const templateControlId = templateKey.replace(/\[[^\]]+\]$/, '')
      const ctrl   = controlData.get(templateControlId)
      const objDat = objectiveData.get(templateKey)

      let content = rowContent

      // Control-level columns (same value for every objective row of this control)
      if (ctrl) {
        content = patchCell(content, `K${r}`, ctrl.inherited)
        content = patchCell(content, `L${r}`, ctrl.esp)
        content = patchCell(content, `O${r}`, ctrl.assessedBy)
      }

      // Objective-level columns
      if (objDat) {
        const artifactParts = []
        if (objDat.artifacts) artifactParts.push(objDat.artifacts)
        if (ctrl?.pool)       artifactParts.push(ctrl.pool)

        // Evidence column D — each item already ends with ";"
        content = patchCell(content, `D${r}`, artifactParts.join('\n'))
        content = patchCell(content, `E${r}`, objDat.interviews)
        content = patchCell(content, `F${r}`, objDat.examine)
        content = patchCell(content, `G${r}`, objDat.test)
        content = patchCell(content, `H${r}`, objDat.overallComments)
        // Column I — Time to Assess (Minutes), numeric
        content = patchNumericCell(content, `I${r}`, objDat.timeToAssess)
        content = patchCell(content, `M${r}`, objDat.score)
        // Column P — Findings: saved Findings Builder statement (multiline, blank if none)
        content = patchMultilineCell(content, `P${r}`, objDat.findingText)
      }

      return `<row r="${rowNum}"${rowAttrs}>${content}</row>`
    }
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Opens the official CMMC Level 2 Assessment Results Template from an
 * ArrayBuffer using JSZip, patches the Requirement Objectives worksheet
 * in place, and returns { workbook: JSZip, warnings }.
 *
 * Nothing outside the Requirement Objectives worksheet XML is modified.
 *
 * @param {ArrayBuffer} templateBuffer
 * @param {Array}       controls
 * @returns {Promise<{ workbook: JSZip, warnings: object }>}
 */
export async function buildCmmcTemplateWorkbook(templateBuffer, controls) {
  const zip = await JSZip.loadAsync(templateBuffer)

  // Resolve worksheet path dynamically from workbook relationships
  const wbXml    = await zip.file('xl/workbook.xml').async('string')
  const wbRelsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string')
  const sheetPath = resolveSheetPath(wbXml, wbRelsXml, 'Requirement Objectives')
  // Confirmed path for this template: xl/worksheets/sheet3.xml

  // Read sharedStrings to map B-column indices to template keys
  const ssXml = await zip.file('xl/sharedStrings.xml').async('string')
  const sharedStrings = parseSharedStrings(ssXml)

  // Build field maps from app state
  const { objectiveData, controlData } = buildObjectiveMap(controls)

  // Collect template row list for warning summary (before patching)
  const wsXml = await zip.file(sheetPath).async('string')
  const allTemplateRows = []
  const rowRe = /<row r="(\d+)"[^>]*>[\s\S]*?<\/row>/g
  let rm
  while ((rm = rowRe.exec(wsXml)) !== null) {
    const r = parseInt(rm[1])
    if (r < 6) continue
    const bMatch = rm[0].match(/<c r="B\d+"[^>]*t="s"[^>]*><v>(\d+)<\/v><\/c>/)
    if (!bMatch) continue
    const key = sharedStrings[parseInt(bMatch[1])]
    if (key) allTemplateRows.push({ templateKey: key })
  }

  // Patch and store the modified worksheet XML
  const patchedXml = patchWorksheetXml(wsXml, sharedStrings, objectiveData, controlData)
  zip.file(sheetPath, patchedXml)

  const warnings = buildWarningSummary(controls, objectiveData, allTemplateRows)

  return { workbook: zip, warnings }
}

/**
 * Generates the patched workbook as a Blob and triggers a browser download.
 *
 * @param {JSZip}  workbook
 * @param {string} filename
 */
export async function downloadCmmcTemplate(workbook, filename) {
  const blob = await workbook.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Formats the warning summary as a human-readable string for display.
 */
export function formatWarningSummary(warnings) {
  const lines = []

  if (warnings.l1ToL2Normalized.length > 0) {
    lines.push(`L1→L2 normalized (${warnings.l1ToL2Normalized.length} controls):`)
    for (const w of warnings.l1ToL2Normalized) lines.push(`  • ${w}`)
  }

  if (warnings.blankTemplateRows.length > 0) {
    lines.push(`Template rows with no companion source — left blank (${warnings.blankTemplateRows.length}):`)
    for (const w of warnings.blankTemplateRows) lines.push(`  • ${w}`)
  }

  return lines.length > 0 ? lines.join('\n') : 'No warnings.'
}
