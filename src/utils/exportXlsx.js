import * as XLSX from 'xlsx'
import { readStatus } from './status'
import { readInheritance, readInheritanceSource, getInheritanceSourceWarning } from './inheritance'
import {
  getTrendingStatusFromStorage,
  getStatusConsistencyWarning,
  readObjectiveStatus,
  OBJECTIVE_STATUS_MET,
  OBJECTIVE_STATUS_NOT_MET,
} from './objectiveStatus'
import { readObjectiveArtifacts } from './objectiveArtifacts'
import { readObjectiveResult } from './objectiveResults'
import { getDibcacStandard } from '../data/dibcacAssessmentStandards'
import { getReviewGroups } from './reviewGroups'

// ---------------------------------------------------------------------------
// Warning helper
// ---------------------------------------------------------------------------

function getControlWarnings(control) {
  const status      = readStatus(control.id)
  const trending    = getTrendingStatusFromStorage(control)
  const inheritance = readInheritance(control.id)
  const source      = readInheritanceSource(control.id)
  const out = []
  const sw = getStatusConsistencyWarning(status, trending)
  if (sw) out.push(sw)
  const iw = getInheritanceSourceWarning(inheritance, source)
  if (iw) out.push(iw)
  return out
}

// ---------------------------------------------------------------------------
// Executive Summary sheet
// ---------------------------------------------------------------------------

function computeSummaryMetrics(controls) {
  let met = 0, inProgress = 0, notMet = 0, notStarted = 0
  let inherited = 0, withWarnings = 0
  let totalObjectives = 0, reviewedObjectives = 0

  for (const c of controls) {
    const status = readStatus(c.id)
    if (status === 'MET')              met++
    else if (status === 'In Progress') inProgress++
    else if (status === 'NOT MET')     notMet++
    else                               notStarted++

    if (readInheritance(c.id) !== 'None') inherited++
    if (getControlWarnings(c).length > 0) withWarnings++

    for (const obj of (c.objectives ?? [])) {
      totalObjectives++
      const s = readObjectiveStatus(c.id, obj.id)
      if (s === OBJECTIVE_STATUS_MET || s === OBJECTIVE_STATUS_NOT_MET) reviewedObjectives++
    }
  }

  return { total: controls.length, met, inProgress, notMet, notStarted, inherited, withWarnings, totalObjectives, reviewedObjectives }
}

function buildExecSummaryData(controls) {
  const m = computeSummaryMetrics(controls)
  const pct = m.totalObjectives > 0
    ? Math.round((m.reviewedObjectives / m.totalObjectives) * 100)
    : 0
  const generated = new Date().toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })

  return [
    ['CMMC Consulting Report Snapshot'],
    [`Generated: ${generated}`],
    [],
    ['ASSESSMENT STATUS'],
    ['Total Controls',           m.total],
    ['MET',                      m.met],
    ['In Progress',              m.inProgress],
    ['NOT MET',                  m.notMet],
    ['Not Started',              m.notStarted],
    [],
    ['INHERITANCE'],
    ['Inherited Controls',       m.inherited],
    [],
    ['WARNINGS'],
    ['Controls with Warnings',   m.withWarnings],
    [],
    ['OBJECTIVE REVIEW'],
    ['Total Objectives',         m.totalObjectives],
    ['Reviewed',                 `${m.reviewedObjectives} / ${m.totalObjectives} reviewed`],
    ['Completion',               `${pct}%`],
  ]
}

// ---------------------------------------------------------------------------
// Family sheet
// ---------------------------------------------------------------------------

function buildFamilyData(controls) {
  const rows = []

  for (const c of controls) {
    const status      = readStatus(c.id)
    const trending    = getTrendingStatusFromStorage(c)
    const inheritance = readInheritance(c.id)
    const source      = readInheritanceSource(c.id)
    const objectives  = c.objectives ?? []

    rows.push([`${c.id} — ${c.title}`])
    rows.push(['Assessment Status', status])
    rows.push(['Trending Status',   trending])
    rows.push(['Inheritance',       inheritance])
    rows.push(['Inherited From',    source ?? ''])

    if (objectives.length > 0) {
      rows.push([])
      rows.push(['Objective', 'Obj Status', 'DIBCAC Standard', 'Artifacts', 'Interviews', 'Examine', 'Test', 'Overall Comments'])

      for (const obj of objectives) {
        const objStatus = readObjectiveStatus(c.id, obj.id)
        const artifacts = readObjectiveArtifacts(c.id, obj.id)
        const result    = readObjectiveResult(c.id, obj.id)
        const dibcac    = getDibcacStandard(c.id, obj.id)
        rows.push([
          `[${obj.id}] ${obj.text}`,
          objStatus,
          dibcac ? dibcac.label : '',
          artifacts.join(', '),
          result.interviews,
          result.examine,
          result.test,
          result.overallComments,
        ])
      }
    }

    rows.push([]) // blank row between controls
  }

  return rows
}

// ---------------------------------------------------------------------------
// Review Groups sheet
// ---------------------------------------------------------------------------

function buildReviewGroupsData() {
  const groups = getReviewGroups()
  if (groups.length === 0) return null

  const rows = [['Group Name', 'Planned Ask', 'Objective Ref', 'Control ID', 'Objective Text', 'DIBCAC Standard']]

  for (const g of groups) {
    if (!g.objectives || g.objectives.length === 0) {
      rows.push([g.name, g.plannedAsk ?? '', '', '', '', ''])
      continue
    }
    for (const obj of g.objectives) {
      const controlId  = obj.controlId ?? ''
      const objId      = obj.objId ?? ''
      const objRef     = obj.key ?? obj.objectiveRef ?? ''
      const objText    = obj.objText ?? ''
      const dibcac     = controlId && objId ? getDibcacStandard(controlId, objId) : null
      rows.push([g.name, g.plannedAsk ?? '', objRef, controlId, objText, dibcac ? dibcac.label : ''])
    }
  }

  return rows
}

// ---------------------------------------------------------------------------
// Workbook assembly
// ---------------------------------------------------------------------------

export function buildAssessmentWorkbook(controls) {
  const wb = XLSX.utils.book_new()

  // Executive Summary
  const summaryWs = XLSX.utils.aoa_to_sheet(buildExecSummaryData(controls))
  summaryWs['!cols'] = [{ wch: 32 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Executive Summary')

  // Family sheets
  const byFamily = new Map()
  for (const c of controls) {
    const code = c.id.split('.')[0]
    if (!byFamily.has(code)) byFamily.set(code, [])
    byFamily.get(code).push(c)
  }
  for (const code of [...byFamily.keys()].sort()) {
    const members = byFamily.get(code)
    if (members.length === 0) continue
    const ws = XLSX.utils.aoa_to_sheet(buildFamilyData(members))
    ws['!cols'] = [{ wch: 70 }, { wch: 16 }, { wch: 20 }, { wch: 50 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(wb, ws, code)
  }

  // Review Groups tab (omitted when no groups exist)
  const rgData = buildReviewGroupsData()
  if (rgData) {
    const rgWs = XLSX.utils.aoa_to_sheet(rgData)
    rgWs['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 28 }, { wch: 14 }, { wch: 60 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, rgWs, 'Review Groups')
  }

  return wb
}

export function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename)
}
