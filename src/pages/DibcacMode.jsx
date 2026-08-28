import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FolderPlus, Folder, LayoutTemplate } from 'lucide-react'
import DashSidebar from '../components/DashSidebar.jsx'
import DibcacTemplatesModal from '../components/DibcacTemplatesModal.jsx'
import controls from '../data/controls/index'
import { getDibcacStandard, DIBCAC_STANDARDS } from '../data/dibcacAssessmentStandards'
import {
  readObjectiveStatus,
  writeObjectiveStatus,
  syncControlStatusFromObjectives,
  OBJECTIVE_STATUS_MET,
  OBJECTIVE_STATUS_NOT_MET,
  OBJECTIVE_STATUS_UNREVIEWED,
} from '../utils/objectiveStatus'
import { combinedInterviewText, readObjectiveResult, writeObjectiveResult } from '../utils/objectiveResults'
import { readObjectiveArtifacts } from '../utils/objectiveArtifacts'
import { readObjectiveInheritance } from '../utils/inheritance'
import {
  getReviewGroups,
  createReviewGroup,
  updateReviewGroup,
  deleteReviewGroup,
  saveReviewGroups,
  getReviewFolders,
  saveReviewFolders,
  createReviewFolder,
  deleteReviewFolder,
  assignGroupToFolder,
} from '../utils/reviewGroups'
import { readObjectiveFinding, writeObjectiveFinding } from '../utils/objectiveFindings'
import { ensureMetObjectiveFinding } from '../utils/autoObjectiveFinding'
import { readObjectiveInterviewedRoles } from '../utils/objectiveInterviewedRoles'
import { getObjectiveWarnings } from '../utils/objectiveWarnings'
import FixInterviewDetailsModal from '../components/FixInterviewDetailsModal'
import ApplySameInterviewerModal from '../components/ApplySameInterviewerModal'
import { buildFinalText } from '../utils/findingStatementBuilder'
import { reconcileChecklistInterviewNotes, removeGroupChecklistInterviewNotes, syncChecklistInterviewNote } from '../utils/checklistInterviewNotes'
import {
  buildChecklistReferenceIndex,
  buildChecklistReferenceMap,
  buildGroupNumberMap,
  checklistItemDomId,
  numberChecklistEntries,
  reviewGroupDomId,
  resolveChecklistNavigationTarget,
  searchChecklistReferences,
} from '../utils/dibcacReferences.js'
import {
  buildTopicAnchorIndex,
  countAllPlannedAskReferences,
  normalizePlannedAskRichDocument,
  isRichBlockComplete,
  PLANNED_ASK_COLORS,
  parseTopicAnchorSyntax,
  resolveTopicNavigationTarget,
  richDocumentPlainText,
  richDocumentToEditorHtml,
  richDocumentToLegacyContent,
  topicAnchorDomId,
} from '../utils/dibcacRichText.js'

// Persist small sets of ids (open folders, expanded groups) across route
// changes — DibcacMode fully unmounts when navigating away, so plain
// useState alone would reset these to empty every time the page is revisited.
function readIdSet(key) {
  try {
    const raw = localStorage.getItem(key)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function writeIdSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]))
  } catch {
    // localStorage may be unavailable (private browsing, quota, etc.)
  }
}

const METHOD_ORDER = [
  'document',
  'screen_share',
  'artifact',
  'physical_review',
  'artifact_and_screen_share',
]

const METHOD_META = {
  document:                  { label: 'Document',               className: 'dibcac-chip--document',                  dot: '#A78BFA' },
  screen_share:              { label: 'Screen Share',           className: 'dibcac-chip--screen_share',              dot: '#22D3EE' },
  artifact:                  { label: 'Artifact',               className: 'dibcac-chip--artifact',                  dot: '#3FC98A' },
  physical_review:           { label: 'Physical Review',        className: 'dibcac-chip--physical_review',           dot: '#E3A83B' },
  artifact_and_screen_share: { label: 'Artifact + Screen Share', className: 'dibcac-chip--artifact_and_screen_share', dot: '#EC4899' },
  unknown:                   { label: 'Variable',               className: 'dibcac-chip--unknown',                   dot: '#8A8A93' },
}

const ALL_FAMILIES = [...new Set(controls.map((c) => c.family))]
const CONTROL_BY_ID = new Map(controls.map((c) => [c.id, c]))

// ── Shared chips ──────────────────────────────────────────────────────────────

function MethodChip({ standard }) {
  const meta = METHOD_META[standard] ?? METHOD_META.unknown
  return <span className={`dibcac-chip ${meta.className}`}>{meta.label}</span>
}

function ObjStatusChip({ controlId, objId }) {
  const status = readObjectiveStatus(controlId, objId)
  if (status === OBJECTIVE_STATUS_MET)
    return <span className="dibcac-obj-status dibcac-obj-status--met">MET</span>
  if (status === OBJECTIVE_STATUS_NOT_MET)
    return <span className="dibcac-obj-status dibcac-obj-status--not-met">NOT MET</span>
  return null
}

// ── Objective inline preview modal ────────────────────────────────────────────

function ObjectivePreview({ previewKey, onClose }) {
  const ref = useRef(null)

  const [controlId, objId] = useMemo(() => {
    if (!previewKey) return [null, null]
    const m = previewKey.match(/^(.+)\[([a-z0-9]+)\]$/)
    return m ? [m[1], m[2]] : [null, null]
  }, [previewKey])

  const control    = controlId ? CONTROL_BY_ID.get(controlId) : null
  const obj        = control?.objectives.find((o) => o.id === objId) ?? null
  const std        = controlId && objId ? getDibcacStandard(controlId, objId) : null
  const status     = controlId && objId ? readObjectiveStatus(controlId, objId) : null
  const result     = controlId && objId ? readObjectiveResult(controlId, objId) : null
  const artifacts  = controlId && objId ? readObjectiveArtifacts(controlId, objId) : []
  const objInherit = controlId && objId ? readObjectiveInheritance(controlId, objId) : []

  if (!previewKey || !control || !obj) return null

  const statusLabel = status === OBJECTIVE_STATUS_MET ? 'MET'
    : status === OBJECTIVE_STATUS_NOT_MET ? 'NOT MET'
    : 'Unreviewed'

  return (
    <div
      className="dibcac-preview-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`Objective preview: ${previewKey}`}
    >
      <div className="dibcac-preview-panel" ref={ref}>
        <div className="dibcac-preview-header">
          <div className="dibcac-preview-header-id">
            <span className="dibcac-preview-control-id mono">{controlId}</span>
            <span className="dibcac-preview-control-title">— {control.title}</span>
          </div>
          <button
            type="button"
            className="dibcac-preview-close"
            onClick={onClose}
            aria-label="Close preview"
          >✕</button>
        </div>

        <div className="dibcac-preview-body">
          <div className="dibcac-preview-obj-heading">
            <span className="mono dibcac-preview-obj-letter">[{obj.id}]</span>
            <span className="dibcac-preview-obj-text">{obj.text}</span>
          </div>

          <div className="dibcac-preview-meta-row">
            <div className="dibcac-preview-meta-item">
              <span className="dibcac-preview-meta-label">Objective Status</span>
              <span className={`dibcac-preview-status dibcac-preview-status--${status === OBJECTIVE_STATUS_MET ? 'met' : status === OBJECTIVE_STATUS_NOT_MET ? 'not-met' : 'unreviewed'}`}>
                {statusLabel}
              </span>
            </div>
            <div className="dibcac-preview-meta-item">
              <span className="dibcac-preview-meta-label">DIBCAC Standard</span>
              {std ? <MethodChip standard={std.standard} /> : <span className="dibcac-preview-na">Not mapped</span>}
            </div>
          </div>

          {objInherit.length > 0 && (
            <div className="dibcac-preview-section">
              <span className="dibcac-preview-section-label">Inheritance</span>
              <div className="dibcac-preview-chips">
                {objInherit.map((src) => (
                  <span key={src} className="dibcac-preview-inherit-chip">{src}</span>
                ))}
              </div>
            </div>
          )}

          {artifacts.length > 0 && (
            <div className="dibcac-preview-section">
              <span className="dibcac-preview-section-label">Assigned Artifacts ({artifacts.length})</span>
              <ul className="dibcac-preview-artifact-list">
                {artifacts.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {result && (combinedInterviewText(result) || result.examine || result.test || result.overallComments) && (
            <div className="dibcac-preview-result-fields">
              {combinedInterviewText(result) && (
                <div className="dibcac-preview-section">
                  <span className="dibcac-preview-section-label">Interviews</span>
                  <p className="dibcac-preview-result-text">{combinedInterviewText(result)}</p>
                </div>
              )}
              {result.examine && (
                <div className="dibcac-preview-section">
                  <span className="dibcac-preview-section-label">Examine</span>
                  <p className="dibcac-preview-result-text">{result.examine}</p>
                </div>
              )}
              {result.test && (
                <div className="dibcac-preview-section">
                  <span className="dibcac-preview-section-label">Test</span>
                  <p className="dibcac-preview-result-text">{result.test}</p>
                </div>
              )}
              {result.overallComments && (
                <div className="dibcac-preview-section">
                  <span className="dibcac-preview-section-label">Overall Comments</span>
                  <p className="dibcac-preview-result-text">{result.overallComments}</p>
                </div>
              )}
            </div>
          )}

          {artifacts.length === 0 && objInherit.length === 0 &&
            !(result && (combinedInterviewText(result) || result.examine || result.test || result.overallComments)) && (
            <p className="dibcac-preview-none">No assessment data recorded for this objective yet.</p>
          )}
        </div>

        <div className="dibcac-preview-footer">
          <span className="dibcac-preview-readonly-note">Read-only reference</span>
          <Link
            to={`/controls/${controlId}#objective-${objId}`}
            className="dibcac-preview-open-link"
          >
            Open in Control Detail →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Objective row (browse + builder left-panel) ───────────────────────────────

function ObjectiveRow({ obj, builderMode, checked, onCheck, onPreview }) {
  const std = obj.standard ?? 'unknown'
  const handleRowClick = builderMode
    ? (e) => {
        // Don't toggle if the click was on the ref button or checkbox itself
        if (e.target.closest('.dibcac-obj-ref-btn') || e.target.closest('.dibcac-obj-checkbox')) return
        onCheck(obj.key)
      }
    : undefined

  return (
    <div
      className={`dibcac-obj-row${checked ? ' dibcac-obj-row--selected' : ''}${builderMode ? ' dibcac-obj-row--selectable' : ''}`}
      onClick={handleRowClick}
      role={builderMode ? 'checkbox' : undefined}
      aria-checked={builderMode ? checked : undefined}
    >
      {builderMode && (
        <input
          type="checkbox"
          className="dibcac-obj-checkbox"
          checked={checked}
          onChange={() => onCheck(obj.key)}
          aria-label={`Select ${obj.controlId}[${obj.objId}]`}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div className="dibcac-obj-body">
        <div className="dibcac-obj-main">
          <button
            type="button"
            className="dibcac-obj-ref-btn mono"
            onClick={(e) => { e.stopPropagation(); onPreview(obj.key) }}
            title="Click to preview objective"
          >
            {obj.controlId}[{obj.objId}]
          </button>
          <span className="dibcac-obj-text">{obj.objText}</span>
        </div>
        <div className="dibcac-obj-meta">
          <MethodChip standard={std} />
          <ObjStatusChip controlId={obj.controlId} objId={obj.objId} />
        </div>
      </div>
    </div>
  )
}

// ── Grouped browser ───────────────────────────────────────────────────────────

function GroupedBrowser({ flatObjs, builderMode, checkedKeys, onCheck, onPreview }) {
  const [openMethods,  setOpenMethods]  = useState(new Set())
  const [openFamilies, setOpenFamilies] = useState(new Set())
  const [openControls, setOpenControls] = useState(new Set())

  const toggleMethod  = (m) => setOpenMethods((s)  => { const n = new Set(s); n.has(m) ? n.delete(m) : n.add(m); return n })
  const toggleFamily  = (k) => setOpenFamilies((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const toggleControl = (k) => setOpenControls((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })

  const grouped = useMemo(() => {
    const byMethod = new Map()
    for (const obj of flatObjs) {
      const m = obj.standard ?? 'unknown'
      if (!byMethod.has(m)) byMethod.set(m, new Map())
      const byFamily = byMethod.get(m)
      if (!byFamily.has(obj.family)) byFamily.set(obj.family, new Map())
      const byControl = byFamily.get(obj.family)
      if (!byControl.has(obj.controlId)) byControl.set(obj.controlId, { title: obj.controlTitle, objs: [] })
      byControl.get(obj.controlId).objs.push(obj)
    }
    return byMethod
  }, [flatObjs])

  const orderedMethods = [
    ...METHOD_ORDER.filter((m) => grouped.has(m)),
    ...[...grouped.keys()].filter((m) => !METHOD_ORDER.includes(m)),
  ]

  const expansionKeys = useMemo(() => {
    const methods = []
    const families = []
    const controls = []
    for (const [method, byFamily] of grouped) {
      methods.push(method)
      for (const [family, byControl] of byFamily) {
        families.push(`${method}:${family}`)
        for (const controlId of byControl.keys()) controls.push(`${method}:${family}:${controlId}`)
      }
    }
    return { methods, families, controls }
  }, [grouped])

  const allExpanded = expansionKeys.methods.length > 0 &&
    expansionKeys.methods.every((key) => openMethods.has(key)) &&
    expansionKeys.families.every((key) => openFamilies.has(key)) &&
    expansionKeys.controls.every((key) => openControls.has(key))

  const expandAll = () => {
    setOpenMethods(new Set(expansionKeys.methods))
    setOpenFamilies(new Set(expansionKeys.families))
    setOpenControls(new Set(expansionKeys.controls))
  }

  const collapseAll = () => {
    setOpenMethods(new Set())
    setOpenFamilies(new Set())
    setOpenControls(new Set())
  }

  if (flatObjs.length === 0) {
    return <div className="dibcac-empty">No objectives match the current filters.</div>
  }

  return (
    <div className="dibcac-browser">
      <div className="dibcac-browser-expand-row">
        <span>{flatObjs.length} matching objective{flatObjs.length === 1 ? '' : 's'}</span>
        <button type="button" onClick={allExpanded ? collapseAll : expandAll}>
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      {orderedMethods.map((method) => {
        const meta = METHOD_META[method] ?? METHOD_META.unknown
        const byFamily = grouped.get(method)
        const isOpen = openMethods.has(method)
        const totalObjs = [...byFamily.values()].flatMap((bf) => [...bf.values()]).flatMap((c) => c.objs).length

        return (
          <section key={method} className={`dibcac-method-section${method === 'unknown' ? ' dibcac-method-section--variable' : ''}`}>
            <button
              type="button"
              className="dibcac-method-header"
              onClick={() => toggleMethod(method)}
              aria-expanded={isOpen}
            >
              <span className="dibcac-method-dot" style={{ background: meta.dot }} />
              <span className="dibcac-method-label">{meta.label}</span>
              <span className="dibcac-method-count">{totalObjs} objective{totalObjs !== 1 ? 's' : ''}</span>
              <span className="dibcac-collapse-icon">{isOpen ? '▼' : '▶'}</span>
            </button>

            {isOpen && (
              <div className="dibcac-method-body">
                {[...byFamily.entries()].map(([family, byControl]) => {
                  const familyKey = `${method}:${family}`
                  const isFamilyOpen = openFamilies.has(familyKey)
                  const familyObjCount = [...byControl.values()].flatMap((c) => c.objs).length

                  return (
                    <div key={family} className="dibcac-family-group">
                      <button
                        type="button"
                        className="dibcac-family-header"
                        onClick={() => toggleFamily(familyKey)}
                        aria-expanded={isFamilyOpen}
                      >
                        <span className="dibcac-family-name">{family}</span>
                        <span className="dibcac-family-count">{familyObjCount} obj</span>
                        <span className="dibcac-collapse-icon">{isFamilyOpen ? '▼' : '▶'}</span>
                      </button>

                      {isFamilyOpen && (
                        <div className="dibcac-family-body">
                          {[...byControl.entries()].map(([controlId, { title, objs }]) => {
                            const ctrlKey = `${method}:${family}:${controlId}`
                            const isCtrlOpen = openControls.has(ctrlKey)

                            return (
                              <div key={controlId} className="dibcac-control-group">
                                <button
                                  type="button"
                                  className="dibcac-control-header"
                                  onClick={() => toggleControl(ctrlKey)}
                                  aria-expanded={isCtrlOpen}
                                >
                                  <span className="dibcac-control-id mono">{controlId}</span>
                                  <span className="dibcac-control-title">{title}</span>
                                  <span className="dibcac-control-obj-count">{objs.length} obj</span>
                                  <span className="dibcac-collapse-icon">{isCtrlOpen ? '▼' : '▶'}</span>
                                </button>

                                {isCtrlOpen && (
                                  <div className="dibcac-control-body">
                                    {objs.map((obj) => (
                                      <ObjectiveRow
                                        key={obj.key}
                                        obj={obj}
                                        builderMode={builderMode}
                                        checked={checkedKeys.has(obj.key)}
                                        onCheck={onCheck}
                                        onPreview={onPreview}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

// ── Builder panel (new group OR editing existing) ─────────────────────────────

const RICH_COLOR_VALUES = {
  default: '#d4d4d8',
  blue: '#60a5fa',
  green: '#4ade80',
  amber: '#fbbf24',
  red: '#f87171',
}

function closestRichBlock(node, editor) {
  const element = node?.nodeType === 1 ? node : node?.parentElement
  const block = element?.closest?.('[data-pa-block="true"]')
  return block && editor.contains(block) ? block : null
}

function rangeForTextOffsets(root, start, end) {
  const range = document.createRange()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let position = 0
  let startSet = false
  let node = walker.nextNode()
  while (node) {
    const next = position + node.data.length
    if (!startSet && start <= next) {
      range.setStart(node, Math.max(0, start - position))
      startSet = true
    }
    if (startSet && end <= next) {
      range.setEnd(node, Math.max(0, end - position))
      return range
    }
    position = next
    node = walker.nextNode()
  }
  range.selectNodeContents(root)
  range.collapse(false)
  return range
}

function markFromElement(element, inherited) {
  const marks = { ...inherited }
  const tag = element.tagName?.toLowerCase()
  if (tag === 'strong' || tag === 'b' || Number.parseInt(element.style?.fontWeight, 10) >= 600) marks.bold = true
  const color = element.dataset?.color
  if (PLANNED_ASK_COLORS.includes(color) && color !== 'default') marks.color = color
  const size = element.dataset?.size
  if (['small', 'large'].includes(size)) marks.size = size
  if (tag === 'font') {
    const fontSize = element.getAttribute('size')
    if (fontSize === '2') marks.size = 'small'
    if (fontSize === '3') delete marks.size
    if (fontSize === '5') marks.size = 'large'
    const rawColor = String(element.getAttribute('color') ?? '').toLowerCase()
    const match = Object.entries(RICH_COLOR_VALUES).find(([, value]) => value.toLowerCase() === rawColor)
    if (match?.[0] === 'default') delete marks.color
    else if (match) marks.color = match[0]
  }
  const inlineColor = String(element.style?.color ?? '').replace(/\s+/g, '').toLowerCase()
  const styleColorMap = {
    '#d4d4d8': 'default', 'rgb(212,212,216)': 'default',
    '#60a5fa': 'blue', 'rgb(96,165,250)': 'blue',
    '#4ade80': 'green', 'rgb(74,222,128)': 'green',
    '#fbbf24': 'amber', 'rgb(251,191,36)': 'amber',
    '#f87171': 'red', 'rgb(248,113,113)': 'red',
  }
  if (styleColorMap[inlineColor] === 'default') delete marks.color
  else if (styleColorMap[inlineColor]) marks.color = styleColorMap[inlineColor]
  const inlineSize = String(element.style?.fontSize ?? '').toLowerCase()
  if (inlineSize.includes('small') || (inlineSize.endsWith('px') && Number.parseFloat(inlineSize) <= 13)) marks.size = 'small'
  if (inlineSize.includes('large') || (inlineSize.endsWith('px') && Number.parseFloat(inlineSize) >= 18)) marks.size = 'large'
  return marks
}

function inlineNodesFromDom(root, inherited = {}) {
  const nodes = []
  for (const child of root.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      if (child.data) nodes.push({ type: 'text', text: child.data, ...inherited })
      continue
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    if (child.dataset?.paRef === 'true') {
      nodes.push({ type: 'checklistRef', groupId: child.dataset.groupId ?? '', itemId: child.dataset.itemId ?? '' })
      continue
    }
    if (child.tagName === 'BR') {
      nodes.push({ type: 'text', text: '\n', ...inherited })
      continue
    }
    nodes.push(...inlineNodesFromDom(child, markFromElement(child, inherited)))
  }
  return nodes
}

function richDocumentFromEditor(editor) {
  const elements = [...editor.children]
  const blocks = elements.length ? elements.map((element) => ({
    type: element.dataset?.type === 'bullet' ? 'bullet' : element.dataset?.type === 'topic' ? 'topic' : 'paragraph',
    indent: Math.max(0, Math.min(4, Number.parseInt(element.dataset?.indent ?? '0', 10) || 0)),
    ...(element.dataset?.type === 'topic' ? { topicAnchorId: element.dataset.topicAnchorId } : {}),
    children: inlineNodesFromDom(element),
  })) : (editor.textContent ? [{ type: 'paragraph', indent: 0, children: inlineNodesFromDom(editor) }] : [])
  return normalizePlannedAskRichDocument({ version: 1, blocks })
}

function RichInline({ node, referenceMap, onNavigate }) {
  if (node.type === 'checklistRef') {
    const reference = referenceMap.get(`${node.groupId}:${node.itemId}`)
    if (!reference) return <span className="dibcac-planned-ask-ref dibcac-planned-ask-ref--missing">Missing checklist reference</span>
    return (
      <button type="button" className="dibcac-planned-ask-ref" onClick={() => onNavigate?.({ groupId: node.groupId, itemId: node.itemId })} title={`Open ${reference.groupName}: ${reference.label}`}>
        <strong>{reference.displayRef}</strong><span>— {reference.label}</span>
      </button>
    )
  }
  const style = {
    ...(node.color ? { color: RICH_COLOR_VALUES[node.color] } : {}),
    ...(node.size === 'small' ? { fontSize: '0.85em' } : {}),
    ...(node.size === 'large' ? { fontSize: '1.2em' } : {}),
    ...(node.bold ? { fontWeight: 700 } : {}),
  }
  return <span style={style}>{node.text}</span>
}

function PlannedAskEditor({ document: richDocument, onChange, referenceIndex }) {
  const editorRef = useRef(null)
  const savedRangeRef = useRef(null)
  const [listActive, setListActive] = useState(false)
  const [mention, setMention] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const suggestions = mention ? searchChecklistReferences(referenceIndex, mention.query) : []
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || !editorRef.current) return
    editorRef.current.innerHTML = richDocumentToEditorHtml(richDocument, referenceIndex)
    editorRef.current.dataset.empty = richDocument.blocks.length === 0 ? 'true' : 'false'
    initialized.current = true
  }, [referenceIndex, richDocument])

  useEffect(() => {
    const rememberRange = () => {
      const editor = editorRef.current
      const selection = window.getSelection()
      if (editor && selection?.rangeCount && editor.contains(selection.anchorNode)) {
        savedRangeRef.current = selection.getRangeAt(0).cloneRange()
        setListActive(closestRichBlock(selection.anchorNode, editor)?.dataset.type === 'bullet')
      }
    }
    document.addEventListener('selectionchange', rememberRange)
    return () => document.removeEventListener('selectionchange', rememberRange)
  }, [])

  const emitChange = () => {
    if (editorRef.current) {
      editorRef.current.dataset.empty = (!editorRef.current.innerText.trim() && !editorRef.current.querySelector('[data-pa-ref="true"]')) ? 'true' : 'false'
      onChange(richDocumentFromEditor(editorRef.current))
    }
  }

  const normalizeDashShortcut = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    const block = selection?.rangeCount ? closestRichBlock(selection.getRangeAt(0).startContainer, editor) : null
    if (!block || block.dataset.type === 'bullet' || !block.textContent?.startsWith('- ')) return
    const prefix = rangeForTextOffsets(block, 0, 2)
    prefix.deleteContents()
    block.dataset.type = 'bullet'
    block.dataset.indent = block.dataset.indent ?? '0'
    setListActive(true)
  }

  const normalizeTopicShortcut = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    const block = selection?.rangeCount ? closestRichBlock(selection.getRangeAt(0).startContainer, editor) : null
    if (!block || block.dataset.type === 'topic' || block.querySelector('[data-pa-ref="true"]')) return
    const label = parseTopicAnchorSyntax(block.textContent)
    if (!label) return
    block.dataset.type = 'topic'
    block.dataset.indent = '0'
    block.dataset.topicAnchorId = globalThis.crypto?.randomUUID?.() ?? `topic-${Date.now()}-${Math.random().toString(16).slice(2)}`
    block.textContent = label
    const caret = document.createRange()
    caret.selectNodeContents(block)
    caret.collapse(false)
    selection.removeAllRanges()
    selection.addRange(caret)
  }

  const detectMention = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount || !selection.isCollapsed) return setMention(null)
    const selectionRange = selection.getRangeAt(0)
    const block = closestRichBlock(selectionRange.endContainer, editor)
    if (!block) return setMention(null)
    const before = document.createRange()
    before.selectNodeContents(block)
    before.setEnd(selectionRange.endContainer, selectionRange.endOffset)
    const text = before.toString()
    const start = text.lastIndexOf('@')
    if (start === -1 || (start > 0 && !/\s/.test(text[start - 1]))) return setMention(null)
    const query = text.slice(start + 1)
    if (query.includes('\n') || query.length > 100) return setMention(null)
    const startsAtCompletedReference = [...block.querySelectorAll('[data-pa-ref="true"]')].some((referenceNode) => {
      const beforeReference = document.createRange()
      beforeReference.selectNodeContents(block)
      beforeReference.setEndBefore(referenceNode)
      return beforeReference.toString().length === start
    })
    if (startsAtCompletedReference) return setMention(null)
    const replacementRange = rangeForTextOffsets(block, start, text.length)
    const startElement = replacementRange.startContainer.parentElement
    if (startElement?.closest?.('[data-pa-ref="true"]')) return setMention(null)
    setMention({ query, range: replacementRange })
    setActiveIndex(0)
  }

  const chooseReference = (reference) => {
    if (!mention) return
    const ref = document.createElement('span')
    ref.className = 'dibcac-rich-ref'
    ref.dataset.paRef = 'true'
    ref.dataset.groupId = reference.groupId
    ref.dataset.itemId = reference.itemId
    ref.contentEditable = 'false'
    ref.textContent = `@${reference.displayRef}`
    const trailing = document.createTextNode(' ')
    mention.range.deleteContents()
    mention.range.insertNode(trailing)
    mention.range.insertNode(ref)
    const selection = window.getSelection()
    const caret = document.createRange()
    caret.setStartAfter(trailing)
    caret.collapse(true)
    selection.removeAllRanges()
    selection.addRange(caret)
    editorRef.current?.focus()
    emitChange()
    setMention(null)
    setActiveIndex(0)
  }

  const applyCommand = (command, value = null) => {
    const editor = editorRef.current
    const selection = window.getSelection()
    let selectionIsInEditor = !!(editor && selection?.rangeCount && editor.contains(selection.anchorNode))
    if (!selectionIsInEditor && savedRangeRef.current) {
      selection?.removeAllRanges()
      selection?.addRange(savedRangeRef.current)
      selectionIsInEditor = true
    }
    if (!selectionIsInEditor) editor?.focus()
    if (command === 'foreColor') document.execCommand('styleWithCSS', false, true)
    document.execCommand(command, false, value)
    if (selection?.rangeCount && editor?.contains(selection.anchorNode)) savedRangeRef.current = selection.getRangeAt(0).cloneRange()
    emitChange()
  }

  const applyColor = (color) => {
    const editor = editorRef.current
    const selection = window.getSelection()
    const range = savedRangeRef.current?.cloneRange()
    if (!editor || !range || range.collapsed || !editor.contains(range.commonAncestorContainer)) return
    selection?.removeAllRanges()
    selection?.addRange(range)
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
    const targets = []
    let textNode = walker.nextNode()
    while (textNode) {
      if (range.intersectsNode(textNode) && !textNode.parentElement?.closest('[data-pa-ref="true"]')) {
        const start = textNode === range.startContainer ? range.startOffset : 0
        const end = textNode === range.endContainer ? range.endOffset : textNode.data.length
        if (end > start) targets.push({ textNode, start, end })
      }
      textNode = walker.nextNode()
    }
    const wrapped = []
    for (const target of targets.reverse()) {
      let selectedNode = target.textNode
      if (target.end < selectedNode.data.length) selectedNode.splitText(target.end)
      if (target.start > 0) selectedNode = selectedNode.splitText(target.start)
      const span = document.createElement('span')
      span.dataset.color = color
      span.style.color = RICH_COLOR_VALUES[color]
      selectedNode.parentNode.insertBefore(span, selectedNode)
      span.append(selectedNode)
      wrapped.unshift(span)
    }
    if (wrapped.length) {
      const nextRange = document.createRange()
      nextRange.setStartBefore(wrapped[0])
      nextRange.setEndAfter(wrapped.at(-1))
      selection?.removeAllRanges()
      selection?.addRange(nextRange)
      savedRangeRef.current = nextRange.cloneRange()
      emitChange()
    }
  }

  const updateCurrentBlock = (updater) => {
    const selection = window.getSelection()
    const block = selection?.rangeCount ? closestRichBlock(selection.getRangeAt(0).startContainer, editorRef.current) : null
    if (!block) return
    updater(block)
    setListActive(block.dataset.type === 'bullet')
    emitChange()
    editorRef.current?.focus()
  }

  const insertRichBlockBreak = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount) return false
    const caret = selection.getRangeAt(0)
    const block = closestRichBlock(caret.startContainer, editor)
    if (!block) return false
    const isEmpty = !block.textContent?.trim() && !block.querySelector('[data-pa-ref="true"]')
    if (block.dataset.type === 'bullet' && isEmpty) {
      block.dataset.type = 'paragraph'
      block.dataset.indent = '0'
      delete block.dataset.topicAnchorId
      if (!block.childNodes.length) block.append(document.createElement('br'))
      const paragraphCaret = document.createRange()
      paragraphCaret.selectNodeContents(block)
      paragraphCaret.collapse(true)
      selection.removeAllRanges()
      selection.addRange(paragraphCaret)
      setListActive(false)
      emitChange()
      return true
    }
    const tail = document.createRange()
    tail.setStart(caret.startContainer, caret.startOffset)
    tail.setEnd(block, block.childNodes.length)
    const trailingContent = tail.extractContents()
    const nextBlock = document.createElement('div')
    nextBlock.dataset.paBlock = 'true'
    nextBlock.dataset.type = block.dataset.type === 'bullet' ? 'bullet' : 'paragraph'
    nextBlock.dataset.indent = block.dataset.indent ?? '0'
    nextBlock.append(trailingContent)
    if (!nextBlock.textContent && !nextBlock.querySelector('[data-pa-ref="true"]')) nextBlock.append(document.createElement('br'))
    if (!block.textContent && !block.querySelector('[data-pa-ref="true"]')) block.append(document.createElement('br'))
    block.after(nextBlock)
    const nextCaret = document.createRange()
    nextCaret.selectNodeContents(nextBlock)
    nextCaret.collapse(true)
    selection.removeAllRanges()
    selection.addRange(nextCaret)
    setListActive(nextBlock.dataset.type === 'bullet')
    emitChange()
    return true
  }

  const handleKeyDown = (event) => {
    if (mention && suggestions.length > 0 && event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % suggestions.length)
    } else if (mention && suggestions.length > 0 && event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length)
    } else if (mention && suggestions.length > 0 && event.key === 'Enter') {
      event.preventDefault()
      chooseReference(suggestions[activeIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setMention(null)
    } else if (event.key === 'Enter' && insertRichBlockBreak()) {
      event.preventDefault()
      setMention(null)
    } else if (event.key === 'Tab') {
      const block = closestRichBlock(window.getSelection()?.anchorNode, editorRef.current)
      if (block?.dataset.type === 'bullet') {
        event.preventDefault()
        const current = Number.parseInt(block.dataset.indent ?? '0', 10) || 0
        block.dataset.indent = String(Math.max(0, Math.min(4, current + (event.shiftKey ? -1 : 1))))
        setListActive(true)
        emitChange()
      } else if (block?.dataset.type === 'paragraph' && !event.shiftKey) {
        event.preventDefault()
        block.dataset.type = 'bullet'
        block.dataset.indent = '0'
        delete block.dataset.topicAnchorId
        setListActive(true)
        emitChange()
      }
    }
  }

  return (
    <div className="dibcac-planned-ask-editor">
      <div className="dibcac-rich-toolbar" aria-label="Planned Ask formatting">
        <button type="button" title="Bold" onMouseDown={(event) => { event.preventDefault(); applyCommand('bold') }}><strong>B</strong></button>
        <button type="button" className={listActive ? 'dibcac-rich-toolbar-btn--active' : ''} aria-pressed={listActive} title="Bulleted list" onMouseDown={(event) => { event.preventDefault(); updateCurrentBlock((block) => {
          const exitingList = block.dataset.type === 'bullet'
          block.dataset.type = exitingList ? 'paragraph' : 'bullet'
          if (exitingList) block.dataset.indent = '0'
          delete block.dataset.topicAnchorId
        }) }}>• List</button>
        <button type="button" title="Outdent" onMouseDown={(event) => { event.preventDefault(); updateCurrentBlock((block) => { block.dataset.indent = String(Math.max(0, (Number.parseInt(block.dataset.indent ?? '0', 10) || 0) - 1)) }) }}>←</button>
        <button type="button" title="Indent" onMouseDown={(event) => { event.preventDefault(); updateCurrentBlock((block) => { block.dataset.indent = String(Math.min(4, (Number.parseInt(block.dataset.indent ?? '0', 10) || 0) + 1)) }) }}>→</button>
        <span className="dibcac-rich-toolbar-separator" />
        <button type="button" title="Small text" onMouseDown={(event) => { event.preventDefault(); applyCommand('fontSize', '2') }}>A−</button>
        <button type="button" title="Normal text" onMouseDown={(event) => { event.preventDefault(); applyCommand('fontSize', '3') }}>A</button>
        <button type="button" title="Large text" onMouseDown={(event) => { event.preventDefault(); applyCommand('fontSize', '5') }}>A+</button>
        <span className="dibcac-rich-toolbar-separator" />
        {PLANNED_ASK_COLORS.map((color) => (
          <button key={color} type="button" className="dibcac-rich-color" title={`${color} text`} aria-label={`${color} text`} style={{ '--rich-color': RICH_COLOR_VALUES[color] }} onMouseDown={(event) => { event.preventDefault(); applyColor(color) }} />
        ))}
      </div>
      <div
        ref={editorRef}
        id="planned-ask"
        className="dibcac-builder-textarea dibcac-rich-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Planned Ask"
        data-placeholder="Describe what you plan to ask or review during this session… Type @ to reference a checklist item."
        onInput={() => { normalizeDashShortcut(); normalizeTopicShortcut(); emitChange(); detectMention() }}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        aria-expanded={!!mention}
      />
      {mention && (
        <div className="dibcac-planned-ask-suggestions" role="listbox" aria-label="Checklist references">
          {suggestions.length === 0 ? (
            <div className="dibcac-planned-ask-suggestion-empty">No matching checklist items.</div>
          ) : suggestions.map((reference, index) => (
            <button
              key={`${reference.groupId}:${reference.itemId}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={`dibcac-planned-ask-suggestion${index === activeIndex ? ' dibcac-planned-ask-suggestion--active' : ''}`}
              onMouseDown={(event) => { event.preventDefault(); chooseReference(reference) }}
            >
              <span><strong>{reference.displayRef}</strong> — {reference.label}</span>
              <small>{reference.groupName}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PlannedAskReadOnly({ document, content, fallback, referenceIndex, onNavigate, groupId, highlightedTopicAnchorId }) {
  const normalized = normalizePlannedAskRichDocument(document, content, fallback)
  const referenceMap = buildChecklistReferenceMap(referenceIndex)
  return (
    <div className="dibcac-group-card-ask-text dibcac-rich-readonly">
      {normalized.blocks.map((block, blockIndex) => block.type === 'topic' ? (
        <div
          key={block.topicAnchorId ?? blockIndex}
          id={topicAnchorDomId(groupId, block.topicAnchorId)}
          data-topic-anchor-id={block.topicAnchorId}
          tabIndex={-1}
          className={`dibcac-rich-topic${highlightedTopicAnchorId === `${groupId}:${block.topicAnchorId}` ? ' dibcac-rich-topic--highlighted' : ''}`}
        >
          {block.children.map((node, nodeIndex) => <RichInline key={nodeIndex} node={node} referenceMap={referenceMap} onNavigate={onNavigate} />)}
        </div>
      ) : (
        <div
          key={blockIndex}
          className={`dibcac-rich-block dibcac-rich-block--${block.type}${isRichBlockComplete(block, referenceIndex) ? ' dibcac-rich-block--complete' : ''}`}
          style={{ '--rich-indent': block.indent }}
        >
          {block.children.map((node, nodeIndex) => <RichInline key={nodeIndex} node={node} referenceMap={referenceMap} onNavigate={onNavigate} />)}
        </div>
      ))}
    </div>
  )
}

// ── Objective attach picker (checklist items) ─────────────────────────────────
// Search-and-attach control for checklist items — matches any objective in
// the whole catalog (e.g. typing "3.5.3" finds IA.L2-3.5.3 objectives), not
// just objectives already in this review group.

function ObjectiveAttachPicker({ attachedKeys, onAdd, onRemove, flatObjs, hideMet }) {
  const [query, setQuery] = useState('')

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const attached = new Set(attachedKeys)
    return flatObjs
      .filter((o) => !attached.has(o.key))
      .filter((o) => !hideMet || readObjectiveStatus(o.controlId, o.objId) !== OBJECTIVE_STATUS_MET)
      .filter((o) =>
        o.controlId.toLowerCase().includes(q) ||
        o.objId.toLowerCase().includes(q) ||
        o.objText.toLowerCase().includes(q) ||
        (o.controlTitle ?? '').toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [query, flatObjs, attachedKeys, hideMet])

  const visibleAttachedKeys = useMemo(() => {
    if (!hideMet) return attachedKeys
    return attachedKeys.filter((key) => {
      const o = flatObjs.find((x) => x.key === key)
      return !o || readObjectiveStatus(o.controlId, o.objId) !== OBJECTIVE_STATUS_MET
    })
  }, [attachedKeys, flatObjs, hideMet])

  return (
    <div className="dibcac-checklist-attach">
      {visibleAttachedKeys.length > 0 && (
        <div className="dibcac-checklist-attach-chips">
          {visibleAttachedKeys.map((key) => {
            const o = flatObjs.find((x) => x.key === key)
            return (
              <span key={key} className="dibcac-checklist-attach-chip">
                <span className="mono">{o ? `${o.controlId}[${o.objId}]` : key}</span>
                <button
                  type="button"
                  className="dibcac-checklist-attach-chip-remove"
                  onClick={() => onRemove(key)}
                  aria-label={`Detach ${key}`}
                >×</button>
              </span>
            )
          })}
        </div>
      )}
      <div className="provider-picker-wrapper">
        <input
          type="text"
          className="dibcac-builder-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search controls or objectives (e.g. 3.5.3)…"
        />
        {suggestions.length > 0 && (
          <ul className="provider-picker-results">
            {suggestions.map((o) => (
              <li
                key={o.key}
                className="provider-picker-result"
                onMouseDown={(e) => { e.preventDefault(); onAdd(o.key) }}
              >
                <span className="mono">{o.controlId}[{o.objId}]</span> — {o.objText}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function BuilderPanel({ checkedKeys, flatObjs, allGroups, onSave, onCancel, editingGroup, hideMet, onToggleHideMet }) {
  const isEditing = !!editingGroup

  const [groupId] = useState(() => editingGroup?.id ?? crypto.randomUUID())
  const [groupName, setGroupName] = useState(() => editingGroup?.name ?? '')
  const [plannedAskRichDocument, setPlannedAskRichDocument] = useState(() => normalizePlannedAskRichDocument(
    editingGroup?.plannedAskRichDocument,
    editingGroup?.plannedAskContent,
    editingGroup?.plannedAsk ?? '',
  ))
  const [selectedObjs, setSelectedObjs] = useState(() =>
    editingGroup ? [...editingGroup.objectives] : []
  )
  const [checklist, setChecklist] = useState(() => editingGroup?.checklist ?? [])
  const checklistNumbers = useMemo(() => numberChecklistEntries(checklist), [checklist])
  const [addingChecklistItem, setAddingChecklistItem] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const [newItemObjKeys, setNewItemObjKeys] = useState(() => new Set())
  const [addingChecklistHeader, setAddingChecklistHeader] = useState(false)
  const [newHeaderText, setNewHeaderText] = useState('')
  const referenceGroups = useMemo(() => {
    const draft = { ...(editingGroup ?? {}), id: groupId, name: groupName || 'Untitled group', checklist, plannedAskRichDocument }
    const existingIndex = allGroups.findIndex((group) => group.id === groupId)
    if (existingIndex === -1) return [...allGroups, draft]
    return allGroups.map((group) => group.id === groupId ? draft : group)
  }, [allGroups, checklist, editingGroup, groupId, groupName, plannedAskRichDocument])
  const referenceIndex = useMemo(() => buildChecklistReferenceIndex(referenceGroups), [referenceGroups])

  const objMap = useMemo(() => {
    const m = new Map()
    for (const o of flatObjs) m.set(o.key, o)
    return m
  }, [flatObjs])

  const handleAddChecked = () => {
    const toAdd = [...checkedKeys]
      .map((k) => objMap.get(k))
      .filter(Boolean)
      .filter((o) => !selectedObjs.some((s) => (s.key ?? s.objectiveRef) === o.key))
    setSelectedObjs((prev) => [...prev, ...toAdd])
  }

  const removeObj = (key) =>
    setSelectedObjs((prev) => prev.filter((o) => (o.key ?? o.objectiveRef) !== key))

  const metCount = selectedObjs.filter((o) =>
    readObjectiveStatus(o.controlId, o.objId ?? o.objectiveKey) === OBJECTIVE_STATUS_MET
  ).length

  const removeAllMet = () => {
    setSelectedObjs((prev) => prev.filter((o) =>
      readObjectiveStatus(o.controlId, o.objId ?? o.objectiveKey) !== OBJECTIVE_STATUS_MET
    ))
  }

  const toggleNewItemObj = (key) => {
    setNewItemObjKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const resetNewChecklistItem = () => {
    setNewItemText('')
    setNewItemObjKeys(new Set())
  }

  const cancelAddChecklistItem = () => {
    setAddingChecklistItem(false)
    resetNewChecklistItem()
  }

  const addChecklistItem = () => {
    if (!newItemText.trim()) return
    setChecklist((prev) => [...prev, {
      id: crypto.randomUUID(),
      type: 'item',
      text: newItemText.trim(),
      objKeys: [...newItemObjKeys],
      checked: false,
    }])
    resetNewChecklistItem()
  }

  const cancelAddChecklistHeader = () => {
    setAddingChecklistHeader(false)
    setNewHeaderText('')
  }

  const addChecklistHeader = () => {
    if (!newHeaderText.trim()) return
    setChecklist((prev) => [...prev, {
      id: crypto.randomUUID(),
      type: 'header',
      text: newHeaderText.trim(),
    }])
    setNewHeaderText('')
    setAddingChecklistHeader(false)
    setAddingChecklistItem(true)
  }

  const removeChecklistItem = (id) => {
    const referenceCount = countAllPlannedAskReferences(referenceGroups, groupId, id)
    if (referenceCount > 0 && !window.confirm(`This checklist item is used by ${referenceCount} Planned Ask reference${referenceCount === 1 ? '' : 's'}. Delete it and leave those references marked as missing?`)) return
    setChecklist((prev) => prev.filter((i) => i.id !== id))
  }

  const updateChecklistItemText = (id, text) =>
    setChecklist((prev) => prev.map((i) => i.id === id ? { ...i, text } : i))

  const toggleChecklistItemObj = (id, key) =>
    setChecklist((prev) => prev.map((i) => {
      if (i.id !== id) return i
      const has = (i.objKeys ?? []).includes(key)
      return { ...i, objKeys: has ? i.objKeys.filter((k) => k !== key) : [...(i.objKeys ?? []), key] }
    }))

  // Reordering: dropping a row onto another moves it to right before that
  // row's current position. Since headers and items share one flat list,
  // dropping an item just after a different header is how it moves into
  // that header's section — no separate "section" concept to keep in sync.
  const [draggedChecklistId, setDraggedChecklistId] = useState(null)
  const [dragOverChecklistId, setDragOverChecklistId] = useState(null)

  const reorderChecklist = (draggedId, targetId) => {
    if (!draggedId || draggedId === targetId) return
    setChecklist((prev) => {
      const dragIndex = prev.findIndex((i) => i.id === draggedId)
      if (dragIndex === -1) return prev
      const moved = prev[dragIndex]
      const without = prev.filter((i) => i.id !== draggedId)
      const targetIndex = targetId ? without.findIndex((i) => i.id === targetId) : without.length
      if (targetIndex === -1) return prev
      const next = [...without]
      next.splice(targetIndex, 0, moved)
      return next
    })
  }

  const handleSave = () => {
    if (!groupName.trim()) return
    const plannedAskContent = richDocumentToLegacyContent(plannedAskRichDocument)
    const plannedAsk = richDocumentPlainText(plannedAskRichDocument, referenceIndex, true).trim()
    const normObjs = selectedObjs.map((o) => ({
      key: o.key ?? o.objectiveRef,
      controlId: o.controlId,
      objId: o.objId ?? o.objectiveKey,
      objText: o.objText ?? o.objectiveText,
      standard: o.standard ?? 'unknown',
    }))
    // Checklist items can attach any objective in the catalog, not just ones
    // in this group, so checklist is saved as-is (no pruning against normObjs).
    if (isEditing) {
      onSave({
        ...editingGroup,
        name: groupName.trim(),
        plannedAsk,
        plannedAskContent,
        plannedAskRichDocument,
        objectives: normObjs,
        checklist,
      })
    } else {
      onSave({
        id: groupId,
        name: groupName.trim(),
        plannedAsk,
        plannedAskContent,
        plannedAskRichDocument,
        objectives: normObjs,
        checklist,
        createdAt: new Date().toISOString(),
      })
    }
  }

  return (
    <div className="dibcac-builder-panel">
      <div className="dibcac-builder-header">
        <span className="dibcac-builder-title">
          {isEditing ? 'Edit Review Group' : 'Review Group Builder'}
        </span>
        <div className="dibcac-builder-header-actions">
          <button
            type="button"
            className="dibcac-builder-save"
            onClick={handleSave}
            disabled={!groupName.trim()}
          >
            {isEditing ? 'Save Changes' : 'Save Group'}
          </button>
          <button type="button" className="dibcac-builder-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>

      <div className="dibcac-builder-body">
        <div className="dibcac-builder-field">
          <label className="dibcac-builder-label" htmlFor="group-name">Group name</label>
          <input
            id="group-name"
            type="text"
            className="dibcac-builder-input"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Identity Inventory Document Review"
          />
        </div>

        <div className="dibcac-builder-field">
          <div className="dibcac-builder-label">
            Selected Objectives
            <span className="dibcac-builder-count">{selectedObjs.length}</span>
            {metCount > 0 && (
              <button
                type="button"
                className="dibcac-remove-met-btn"
                onClick={removeAllMet}
                title="Remove every objective already marked MET from this group"
              >
                Remove all MET ({metCount})
              </button>
            )}
          </div>
          {selectedObjs.length === 0 ? (
            <p className="dibcac-builder-empty-hint">
              {isEditing ? 'No objectives yet. Check objectives on the left, then click Add.' : 'Check objectives on the left, then click Add.'}
            </p>
          ) : (
            <div className="dibcac-builder-obj-list">
              {selectedObjs.map((o) => {
                const key = o.key ?? o.objectiveRef
                const objId = o.objId ?? o.objectiveKey
                const text = o.objText ?? o.objectiveText
                const std = o.standard ?? 'unknown'
                return (
                  <div key={key} className="dibcac-builder-obj-row">
                    <div className="dibcac-builder-obj-main">
                      <div className="dibcac-builder-obj-info">
                        <span className="mono dibcac-builder-obj-id">{o.controlId}[{objId}]</span>
                        <span className="dibcac-builder-obj-text">{text}</span>
                      </div>
                      <div className="dibcac-builder-obj-chips">
                        <MethodChip standard={std} />
                        <ObjStatusChip controlId={o.controlId} objId={objId} />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="dibcac-builder-obj-remove"
                      onClick={() => removeObj(key)}
                      aria-label={`Remove ${o.controlId}[${objId}]`}
                    >×</button>
                  </div>
                )
              })}
            </div>
          )}
          <button
            type="button"
            className="dibcac-builder-add-btn"
            onClick={handleAddChecked}
            disabled={checkedKeys.size === 0}
          >
            Add {checkedKeys.size > 0 ? checkedKeys.size : ''} selected objective{checkedKeys.size !== 1 ? 's' : ''}
          </button>
        </div>

        <div className="dibcac-builder-field">
          <label className="dibcac-builder-label" htmlFor="planned-ask">Planned Ask</label>
          <PlannedAskEditor document={plannedAskRichDocument} onChange={setPlannedAskRichDocument} referenceIndex={referenceIndex} />
        </div>

        <div className="dibcac-builder-field">
          <div className="dibcac-builder-label">
            Checklist
            <button
              type="button"
              className="control-utility-toggle dibcac-checklist-hide-met-toggle"
              onClick={onToggleHideMet}
              aria-pressed={hideMet}
            >
              <span className="cl2-toggle-track" style={{ background: hideMet ? 'var(--dash-accent)' : '#1C1C20' }}>
                <span className="cl2-toggle-thumb" style={{ transform: hideMet ? 'translateX(14px)' : 'translateX(0)' }} />
              </span>
              Hide MET objectives
            </button>
            {!addingChecklistHeader && (
              <button
                type="button"
                className="dibcac-sort-btn"
                onClick={() => { setAddingChecklistHeader(true); cancelAddChecklistItem() }}
              >
                + Add section header
              </button>
            )}
            {!addingChecklistItem && (
              <button
                type="button"
                className="dibcac-sort-btn"
                onClick={() => { setAddingChecklistItem(true); cancelAddChecklistHeader() }}
              >
                + Create new list item
              </button>
            )}
          </div>

          {checklist.length === 0 && !addingChecklistItem && !addingChecklistHeader && (
            <p className="dibcac-builder-empty-hint">No checklist items yet.</p>
          )}

          {checklist.length > 0 && (
            <div className="dibcac-checklist-list">
              {checklist.map((item) => {
                const dragProps = {
                  draggable: true,
                  onDragStart: (e) => { setDraggedChecklistId(item.id); e.dataTransfer.effectAllowed = 'move' },
                  onDragEnd: () => { setDraggedChecklistId(null); setDragOverChecklistId(null) },
                  onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverChecklistId(item.id) },
                  onDragLeave: () => setDragOverChecklistId((prev) => prev === item.id ? null : prev),
                  onDrop: (e) => { e.preventDefault(); reorderChecklist(draggedChecklistId, item.id); setDragOverChecklistId(null) },
                }
                const dragState =
                  `${draggedChecklistId === item.id ? ' dibcac-checklist-dragging' : ''}` +
                  `${dragOverChecklistId === item.id && draggedChecklistId !== item.id ? ' dibcac-checklist-drag-over' : ''}`
                return item.type === 'header' ? (
                  <div key={item.id} className={`dibcac-checklist-header-edit-row${dragState}`} {...dragProps}>
                    <span className="dibcac-checklist-drag-handle" aria-hidden="true" title="Drag to reorder">⠿</span>
                    <span className="dibcac-checklist-number dibcac-checklist-number--header">{checklistNumbers.get(item.id)}</span>
                    <input
                      type="text"
                      className="dibcac-builder-input dibcac-checklist-header-input"
                      value={item.text}
                      onChange={(e) => updateChecklistItemText(item.id, e.target.value)}
                    />
                    <button
                      type="button"
                      className="dibcac-builder-obj-remove"
                      onClick={() => removeChecklistItem(item.id)}
                      aria-label={`Remove section header "${item.text}"`}
                    >×</button>
                  </div>
                ) : (
                  <div key={item.id} className={`dibcac-checklist-edit-row${dragState}`} {...dragProps}>
                    <div className="dibcac-checklist-row-main">
                      <span className="dibcac-checklist-drag-handle" aria-hidden="true" title="Drag to reorder">⠿</span>
                      <span className="dibcac-checklist-number">{checklistNumbers.get(item.id)}</span>
                      <input
                        type="text"
                        className="dibcac-builder-input"
                        value={item.text}
                        onChange={(e) => updateChecklistItemText(item.id, e.target.value)}
                      />
                      <button
                        type="button"
                        className="dibcac-builder-obj-remove"
                        onClick={() => removeChecklistItem(item.id)}
                        aria-label={`Remove checklist item "${item.text}"`}
                      >×</button>
                    </div>
                    <div className="dibcac-checklist-attach-label">Attached objective(s):</div>
                    <ObjectiveAttachPicker
                      attachedKeys={item.objKeys ?? []}
                      onAdd={(key) => toggleChecklistItemObj(item.id, key)}
                      onRemove={(key) => toggleChecklistItemObj(item.id, key)}
                      flatObjs={flatObjs}
                      hideMet={hideMet}
                    />
                  </div>
                )
              })}
              {draggedChecklistId && (
                <div
                  className={`dibcac-checklist-drop-end${dragOverChecklistId === '__end__' ? ' dibcac-checklist-drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverChecklistId('__end__') }}
                  onDragLeave={() => setDragOverChecklistId((prev) => prev === '__end__' ? null : prev)}
                  onDrop={(e) => { e.preventDefault(); reorderChecklist(draggedChecklistId, null); setDragOverChecklistId(null) }}
                >
                  Drop here to move to end
                </div>
              )}
            </div>
          )}

          {addingChecklistHeader && (
            <div className="dibcac-checklist-add-form">
              <input
                type="text"
                className="dibcac-builder-input"
                value={newHeaderText}
                onChange={(e) => setNewHeaderText(e.target.value)}
                placeholder="Section header…"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Escape') cancelAddChecklistHeader() }}
              />
              <div className="dibcac-checklist-add-actions">
                <button type="button" className="dibcac-builder-save" onClick={addChecklistHeader} disabled={!newHeaderText.trim()}>Add</button>
                <button type="button" className="dibcac-builder-cancel" onClick={cancelAddChecklistHeader}>Cancel</button>
                <button
                  type="button"
                  className="dibcac-checklist-add-switch"
                  onClick={() => { cancelAddChecklistHeader(); setAddingChecklistItem(true) }}
                >+ Add checklist item instead</button>
              </div>
            </div>
          )}

          {addingChecklistItem && (
            <div className="dibcac-checklist-add-form">
              <input
                type="text"
                className="dibcac-builder-input"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="Checklist item…"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Escape') cancelAddChecklistItem() }}
              />
              <div className="dibcac-checklist-attach-label">Attach objective(s):</div>
              <ObjectiveAttachPicker
                attachedKeys={[...newItemObjKeys]}
                onAdd={(key) => toggleNewItemObj(key)}
                onRemove={(key) => toggleNewItemObj(key)}
                flatObjs={flatObjs}
                hideMet={hideMet}
              />
              <div className="dibcac-checklist-add-actions">
                <button type="button" className="dibcac-builder-save" onClick={addChecklistItem} disabled={!newItemText.trim()}>Add</button>
                <button type="button" className="dibcac-builder-cancel" onClick={cancelAddChecklistItem}>Cancel</button>
                <button
                  type="button"
                  className="dibcac-checklist-add-switch"
                  onClick={() => { cancelAddChecklistItem(); setAddingChecklistHeader(true) }}
                >+ Add section header instead</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="dibcac-builder-footer">
        <button
          type="button"
          className="dibcac-builder-save"
          onClick={handleSave}
          disabled={!groupName.trim()}
        >
          {isEditing ? 'Save Changes' : 'Save Group'}
        </button>
        <button type="button" className="dibcac-builder-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Overall Comments popover ──────────────────────────────────────────────────

function OverallCommentsPopover({ controlId, objId, onClose }) {
  const existing = useMemo(() => readObjectiveResult(controlId, objId), [controlId, objId])
  const [text, setText] = useState(existing.overallComments ?? '')
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSave = useCallback(() => {
    writeObjectiveResult(controlId, objId, { ...existing, overallComments: text })
    onClose()
  }, [controlId, objId, existing, text, onClose])

  return (
    <div
      className="dibcac-comments-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Overall Comments"
    >
      <div className="dibcac-comments-panel">
        <div className="dibcac-comments-header">
          <span className="dibcac-comments-title">Overall Comments</span>
          <span className="dibcac-comments-id mono">{controlId}[{objId}]</span>
          <button type="button" className="dibcac-preview-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <textarea
          ref={textareaRef}
          className="dibcac-comments-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Add overall assessment comments for this objective…"
        />
        <div className="dibcac-comments-footer">
          <button type="button" className="dibcac-builder-save" onClick={handleSave}>Save</button>
          <button type="button" className="dibcac-builder-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Bulk group findings helpers ───────────────────────────────────────────────

function GroupFindingsModal({ group, onClose }) {
  const [overwrite, setOverwrite] = useState(false)
  const [done, setDone] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [fixTarget, setFixTarget] = useState(null) // { controlId, objId, key, text }
  const [showApplyInterviewerModal, setShowApplyInterviewerModal] = useState(false)

  const rows = useMemo(() => group.objectives.map((o) => {
    const objId     = o.objId ?? o.objectiveKey
    const key       = o.key  ?? o.objectiveRef
    const status    = readObjectiveStatus(o.controlId, objId)
    const existing  = readObjectiveFinding(o.controlId, objId)
    const artifacts = readObjectiveArtifacts(o.controlId, objId)
    const roles     = readObjectiveInterviewedRoles(o.controlId, objId)
    const isMet         = status === OBJECTIVE_STATUS_MET
    const hasExisting   = existing !== null
    const warnings = getObjectiveWarnings(o.controlId, objId)
    return { o, objId, key, status, hasExisting, artifacts, roles, isMet, warnings, objText: o.objText ?? o.objectiveText, standard: o.standard }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [group.objectives, refreshKey])

  const eligibleRows = useMemo(
    () => rows.filter((r) => r.isMet && (!r.hasExisting || overwrite)),
    [rows, overwrite]
  )

  const handleGenerate = () => {
    for (const row of eligibleRows) {
      writeObjectiveFinding(row.o.controlId, row.objId, {
        includedArtifacts: row.artifacts,
        hasDifferences: false,
        differencesText: '',
        finalText: buildFinalText({
          roles: row.roles,
          includedArtifacts: row.artifacts,
          objectiveRef: row.key,
          objectiveText: row.objText,
          dibcacMethod: row.standard,
          hasDifferences: false,
          differencesText: '',
        }),
        updatedAt: new Date().toISOString(),
      })
    }
    setDone(eligibleRows.length)
  }

  // Also used for onClose (not just onSave/"Apply Same Interviewer"): Apply
  // Same Interviewer writes roles straight to storage for other objectives
  // as soon as it's applied, independent of whether the current objective's
  // own edits are saved — so closing without clicking Save must still
  // refresh the row list, or those objectives keep showing stale warnings.
  const handleFixSave = () => {
    setFixTarget(null)
    setRefreshKey((k) => k + 1)
  }

  const handleApplyInterviewerApplied = () => {
    setShowApplyInterviewerModal(false)
    setRefreshKey((k) => k + 1)
  }

  const scopeObjectives = useMemo(
    () => rows.map((r) => ({
      controlId: r.o.controlId,
      objId: r.objId,
      objText: r.objText,
      status: r.status,
      key: r.key,
      eligible: r.isMet,
    })),
    [rows]
  )

  // When a fix target is active, replace this modal entirely with FixInterviewDetailsModal.
  // This prevents two overlays from stacking on screen at the same time.
  if (fixTarget) {
    return (
      <FixInterviewDetailsModal
        controlId={fixTarget.controlId}
        objId={fixTarget.objId}
        objKey={fixTarget.key}
        objText={fixTarget.text}
        scopeObjectives={scopeObjectives}
        onSave={handleFixSave}
        onClose={handleFixSave}
      />
    )
  }

  // While Apply Same Interviewer is active, it is the only rendered modal
  // step — the Group Findings surface is not kept mounted underneath it.
  if (showApplyInterviewerModal) {
    return (
      <ApplySameInterviewerModal
        scopeObjectives={scopeObjectives}
        onClose={() => setShowApplyInterviewerModal(false)}
        onApplied={handleApplyInterviewerApplied}
      />
    )
  }

  return (
    <div
      className="dibcac-comments-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Create Group Findings"
    >
      <div className="dibcac-group-findings-panel">
        <div className="dibcac-comments-header">
          <span className="dibcac-comments-title">Create Group Findings</span>
          <span className="dibcac-comments-id">{group.name}</span>
          <button type="button" className="dibcac-preview-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {done !== null ? (
          <>
            <div className="dibcac-group-findings-body">
              <p className="dibcac-group-findings-done">
                {done} finding{done !== 1 ? 's' : ''} generated. Open each objective in Control Detail to review or refine.
              </p>
            </div>
            <div className="dibcac-comments-footer">
              <button type="button" className="dibcac-builder-save" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <>
            <div className="dibcac-group-findings-body">
              <div className="bulk-findings-filters-row">
                <label className="dibcac-group-findings-overwrite">
                  <input
                    type="checkbox"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                  />
                  Overwrite existing findings
                </label>
                <button
                  type="button"
                  className="dibcac-action-btn bulk-findings-apply-interviewer-btn"
                  onClick={() => setShowApplyInterviewerModal(true)}
                >
                  Apply Same Interviewer
                </button>
              </div>
              <div className="dibcac-group-findings-list">
                {rows.map((row) => {
                  const eligible = row.isMet && (!row.hasExisting || overwrite)
                  let skipReason = null
                  if (!row.isMet) {
                    skipReason = row.status === OBJECTIVE_STATUS_NOT_MET ? 'NOT MET — skipped' : 'not MET — skipped'
                  } else if (row.hasExisting && !overwrite) {
                    skipReason = 'existing finding preserved'
                  }
                  return (
                    <div key={row.key} className={`dibcac-group-findings-row${eligible ? '' : ' dibcac-group-findings-row--skip'}`}>
                      <div className="dibcac-group-findings-row-header">
                        <span className="mono dibcac-group-findings-ref">{row.key}</span>
                        {skipReason
                          ? <span className="dibcac-group-findings-skip">{skipReason}</span>
                          : <span className="dibcac-group-findings-generate">will generate</span>
                        }
                      </div>
                      {eligible && row.warnings.length > 0 && (
                        <div className="dibcac-group-findings-warnings">
                          {row.warnings.map((w) => (
                            <span key={w.key} className="dibcac-group-findings-warning">
                              ⚠ {w.text}
                              {w.fixable && (
                                <button
                                  type="button"
                                  className="dibcac-fix-btn"
                                  onClick={() => setFixTarget({ controlId: row.o.controlId, objId: row.objId, key: row.key, text: row.objText })}
                                >Fix</button>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="dibcac-comments-footer">
              <button
                type="button"
                className="dibcac-builder-save"
                onClick={handleGenerate}
                disabled={eligibleRows.length === 0}
              >
                Generate {eligibleRows.length > 0 ? `${eligibleRows.length} finding${eligibleRows.length !== 1 ? 's' : ''}` : '0 findings'}
              </button>
              <button type="button" className="dibcac-builder-cancel" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Saved group card ──────────────────────────────────────────────────────────

function ChecklistInterviewNoteEditor({ item, onSave, onClose }) {
  const [note, setNote] = useState(item.interviewNote ?? '')
  const objectiveCount = item.objKeys?.length ?? 0

  return (
    <div className="dibcac-checklist-note-editor">
      <label htmlFor={`checklist-note-${item.id}`}>Interview notes</label>
      <textarea
        id={`checklist-note-${item.id}`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Capture what was said during the interview…"
        rows={4}
      />
      <p>Syncs to {objectiveCount} attached objective{objectiveCount === 1 ? '' : 's'} without replacing manually entered interview text.</p>
      <div className="dibcac-checklist-note-actions">
        <button type="button" className="dibcac-builder-save" onClick={() => onSave(note)}>Save note</button>
        {item.interviewNote?.trim() && (
          <button type="button" className="dibcac-action-btn dibcac-action-btn--delete" onClick={() => { setNote(''); onSave('') }}>Clear note</button>
        )}
        <button type="button" className="dibcac-builder-cancel" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

function SavedGroupCard({
  group, savedFolders, allGroups, onDelete, onEditRequest, onPreview, onMoveToFolder,
  onMoveObjectives, onRemoveObjectives, onUpdateChecklist, selectionMode, isSelected, onToggleSelect, isExpanded, onToggleExpanded,
  objectiveSelectionMode = false, selectedCrossGroupObjectives, onToggleCrossGroupObjective,
  onSelectAllCrossGroupObjectives, onDeselectAllCrossGroupObjectives,
  groupNumber, referenceIndex, onNavigateChecklistItem, onNavigateTopic, highlightedChecklistItemId, highlightedTopicAnchorId, onReorderGroup,
}) {
  const expanded = isExpanded ?? false
  const [commentsKey, setCommentsKey] = useState(null) // `${controlId}[${objId}]`
  const [showFindingsModal, setShowFindingsModal] = useState(false)
  const [, forceUpdate] = useState(0)
  const [objSelectMode, setObjSelectMode] = useState(false)
  const [selectedObjKeys, setSelectedObjKeys] = useState(() => new Set())
  const [confirmingGroupDelete, setConfirmingGroupDelete] = useState(false)
  const [confirmingObjectiveRemove, setConfirmingObjectiveRemove] = useState(false)
  const [openChecklistNoteIds, setOpenChecklistNoteIds] = useState(() => new Set())
  const [objView, setObjView] = useState(() => localStorage.getItem('cmmc-dibcac-group-obj-view') === 'cards' ? 'cards' : 'list')
  const isObjectiveSelecting = objectiveSelectionMode || objSelectMode

  const setObjViewPersisted = (view) => {
    setObjView(view)
    try { localStorage.setItem('cmmc-dibcac-group-obj-view', view) } catch { /* ignore */ }
  }

  const checklist = useMemo(() => group.checklist ?? [], [group.checklist])
  const checklistNumbers = useMemo(() => numberChecklistEntries(checklist), [checklist])
  const navigatorTopics = useMemo(() => buildTopicAnchorIndex(allGroups?.length ? allGroups : [group]), [allGroups, group])

  // Checklist items may attach objectives outside this group's own objective
  // list (any control in the catalog), so keys are parsed directly rather
  // than looked up in group.objectives — the key format is always
  // "${controlId}[${objId}]", which is already the display label too.
  const parseObjKey = (key) => {
    const m = key.match(/^(.+)\[([^[\]]+)\]$/)
    return m ? { controlId: m[1], objId: m[2] } : null
  }
  const objectiveDetailsFor = (key) => {
    const parsed = parseObjKey(key)
    const objective = parsed
      ? CONTROL_BY_ID.get(parsed.controlId)?.objectives?.find((entry) => entry.id === parsed.objId)
      : null
    return { reference: key, statement: objective?.text ?? 'Objective statement unavailable.' }
  }

  // For items with attached objectives, "checked" is derived live from
  // objective status rather than the stored flag — this is what makes an
  // item auto-strike when its objective(s) get marked MET from elsewhere
  // (another checklist item, another group, the objectives list, etc.),
  // and un-strike if any of them stop being MET. An item tied to multiple
  // objectives only shows complete once every one of them is MET, so a
  // partial match (one objective MET via a different item, the rest not)
  // never renders as a false "done". Items with no attached objectives have
  // nothing to derive from, so they keep their own manually-toggled flag.
  const isItemMet = (item) => {
    const keys = item.objKeys ?? []
    if (keys.length === 0) return !!item.checked
    return keys.every((key) => {
      const parsed = parseObjKey(key)
      return !!parsed && readObjectiveStatus(parsed.controlId, parsed.objId) === OBJECTIVE_STATUS_MET
    })
  }

  // Wording and attached objectives are only editable via Edit Review Group
  // (same as Planned Ask) — outside of edit, checking an item on/off is the
  // only interaction available here.
  // Checking an item marks every attached objective MET; unchecking reverts
  // them to Unreviewed. This is the whole point of the checklist — ticking
  // it off is how an objective gets marked done during a live session.
  const toggleChecklistItem = (item) => {
    const willBeChecked = !isItemMet(item)
    const next = checklist.map((i) => i.id === item.id ? { ...i, checked: willBeChecked } : i)
    onUpdateChecklist?.(group.id, next)
    const touchedControlIds = new Set()
    for (const key of item.objKeys ?? []) {
      const parsed = parseObjKey(key)
      if (!parsed) continue
      writeObjectiveStatus(parsed.controlId, parsed.objId, willBeChecked ? OBJECTIVE_STATUS_MET : OBJECTIVE_STATUS_UNREVIEWED)
      if (willBeChecked) {
        const control = CONTROL_BY_ID.get(parsed.controlId)
        const objective = control?.objectives?.find((item) => item.id === parsed.objId)
        ensureMetObjectiveFinding(control, objective)
      }
      touchedControlIds.add(parsed.controlId)
    }
    // A checklist item's objectives can span multiple controls, so each
    // touched control's own Status needs its own resync.
    for (const controlId of touchedControlIds) {
      syncControlStatusFromObjectives(CONTROL_BY_ID.get(controlId))
    }
    forceUpdate((n) => n + 1)
  }

  const saveChecklistInterviewNote = (item, note) => {
    const trimmed = note.trim()
    syncChecklistInterviewNote(group, item, trimmed, item.objKeys)
    const next = checklist.map((entry) => entry.id === item.id
      ? { ...entry, interviewNote: trimmed }
      : entry)
    onUpdateChecklist?.(group.id, next)
    forceUpdate((n) => n + 1)
  }

  const toggleChecklistNote = (itemId) => {
    setOpenChecklistNoteIds((previous) => {
      const next = new Set(previous)
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return next
    })
  }

  const otherGroups = useMemo(
    () => (allGroups ?? []).filter((g) => g.id !== group.id),
    [allGroups, group.id]
  )

  const toggleObjSelectMode = () => {
    setObjSelectMode((v) => !v)
    setSelectedObjKeys(new Set())
    setConfirmingObjectiveRemove(false)
  }

  const toggleObjSelected = (key) => {
    setSelectedObjKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const allObjectiveKeys = useMemo(
    () => group.objectives.map((objective) => objective.key ?? objective.objectiveRef),
    [group.objectives]
  )

  const selectedInThisGroup = objectiveSelectionMode
    ? allObjectiveKeys.filter((key) => selectedCrossGroupObjectives?.has(crossGroupSelectionKey(group.id, key))).length
    : selectedObjKeys.size

  const handleMoveSelected = (targetGroupId) => {
    if (!targetGroupId || selectedObjKeys.size === 0) return
    onMoveObjectives?.(group.id, targetGroupId, [...selectedObjKeys])
    setObjSelectMode(false)
    setSelectedObjKeys(new Set())
  }

  const handleRemoveSelected = () => {
    if (selectedObjKeys.size === 0) return
    onRemoveObjectives?.(group.id, [...selectedObjKeys])
    setConfirmingObjectiveRemove(false)
    setObjSelectMode(false)
    setSelectedObjKeys(new Set())
  }

  const familySummary = useMemo(() => {
    const codes = new Set(group.objectives.map((o) => o.controlId.split('.')[0]))
    return [...codes].sort().join(' · ')
  }, [group.objectives])
  const incomingReferenceCount = useMemo(() => countAllPlannedAskReferences(allGroups, group.id), [allGroups, group.id])

  const cycleStatus = useCallback((controlId, objId) => {
    const current = readObjectiveStatus(controlId, objId)
    const next =
      current === OBJECTIVE_STATUS_UNREVIEWED ? OBJECTIVE_STATUS_MET
      : current === OBJECTIVE_STATUS_MET      ? OBJECTIVE_STATUS_NOT_MET
      :                                          OBJECTIVE_STATUS_UNREVIEWED
    writeObjectiveStatus(controlId, objId, next)
    if (next === OBJECTIVE_STATUS_MET) {
      const control = CONTROL_BY_ID.get(controlId)
      const objective = control?.objectives?.find((item) => item.id === objId)
      ensureMetObjectiveFinding(control, objective)
    }
    syncControlStatusFromObjectives(CONTROL_BY_ID.get(controlId))
    forceUpdate((n) => n + 1)
  }, [])

  const [commentsObjId, commentsControlId] = useMemo(() => {
    if (!commentsKey) return [null, null]
    const m = commentsKey.match(/^(.+)\[([a-z0-9]+)\]$/)
    return m ? [m[2], m[1]] : [null, null]
  }, [commentsKey])

  return (
    <div id={reviewGroupDomId(group.id)} data-group-id={group.id} className={`dibcac-group-card${isSelected ? ' dibcac-group-card--selected' : ''}`}>
      {commentsKey && commentsObjId && (
        <OverallCommentsPopover
          controlId={commentsControlId}
          objId={commentsObjId}
          onClose={() => { setCommentsKey(null); forceUpdate((n) => n + 1) }}
        />
      )}
      {showFindingsModal && (
        <GroupFindingsModal
          group={group}
          onClose={() => setShowFindingsModal(false)}
        />
      )}

      <div className="dibcac-group-card-header">
        {selectionMode && (
          <input
            type="checkbox"
            className="dibcac-group-select-checkbox"
            checked={!!isSelected}
            onChange={() => onToggleSelect?.(group.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${group.name}`}
          />
        )}
        <button
          type="button"
          className="dibcac-group-card-toggle"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
        >
          <span className="dibcac-collapse-icon dibcac-group-card-chevron">{expanded ? '▼' : '▶'}</span>
          <div className="dibcac-group-card-info">
            <span className="dibcac-group-card-name"><span className="dibcac-group-display-number">G{groupNumber}</span>{group.name}</span>
            <span className="dibcac-group-card-meta">
              {group.objectives.length} objective{group.objectives.length !== 1 ? 's' : ''}
              {familySummary ? ` · ${familySummary}` : ''}
            </span>
          </div>
        </button>

        <div className="dibcac-group-card-actions">
          <button type="button" className="dibcac-action-btn" disabled={groupNumber <= 1} onClick={() => onReorderGroup?.(group.id, -1)} title="Move group earlier in canonical order" aria-label={`Move ${group.name} earlier`}>↑</button>
          <button type="button" className="dibcac-action-btn" disabled={groupNumber >= allGroups.length} onClick={() => onReorderGroup?.(group.id, 1)} title="Move group later in canonical order" aria-label={`Move ${group.name} later`}>↓</button>
          <button
            type="button"
            className="dibcac-action-btn"
            onClick={() => onEditRequest(group)}
          >Edit</button>
          <button
            type="button"
            className="dibcac-action-btn"
            onClick={() => setShowFindingsModal(true)}
            title="Generate findings for MET objectives in this group"
          >Findings</button>
          {confirmingGroupDelete ? (
            <div className="dibcac-inline-delete-confirm">
              <span>Delete this group?{incomingReferenceCount > 0 ? ` ${incomingReferenceCount} Planned Ask reference${incomingReferenceCount === 1 ? '' : 's'} will be marked missing.` : ''}</span>
              <button type="button" className="dibcac-action-btn dibcac-action-btn--delete" onClick={() => onDelete(group.id)}>Yes, delete</button>
              <button type="button" className="dibcac-action-btn" onClick={() => setConfirmingGroupDelete(false)}>Cancel</button>
            </div>
          ) : (
            <button
              type="button"
              className="dibcac-action-btn dibcac-action-btn--delete"
              onClick={() => setConfirmingGroupDelete(true)}
            >Delete</button>
          )}
          {savedFolders && savedFolders.length > 0 && onMoveToFolder && (
            <select
              className="dibcac-folder-select"
              value={group.folderId ?? ''}
              onChange={(e) => onMoveToFolder(group.id, e.target.value || null)}
              onClick={(e) => e.stopPropagation()}
              title="Move to folder"
              aria-label="Move to folder"
            >
              <option value="">No folder</option>
              {savedFolders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {expanded && (
        <div className="dibcac-group-card-body">
          {(group.plannedAsk || group.plannedAskContent?.length > 0 || group.plannedAskRichDocument?.blocks?.length > 0) && (
            <div className="dibcac-group-card-ask-block">
              <span className="dibcac-preview-section-label">Planned Ask</span>
              <PlannedAskReadOnly
                document={group.plannedAskRichDocument}
                content={group.plannedAskContent}
                fallback={group.plannedAsk}
                referenceIndex={referenceIndex}
                onNavigate={onNavigateChecklistItem}
                groupId={group.id}
                highlightedTopicAnchorId={highlightedTopicAnchorId}
              />
            </div>
          )}

          {navigatorTopics.length > 0 && <TopicNavigator topics={navigatorTopics} onNavigate={onNavigateTopic} compact />}

          {checklist.length > 0 && (
            <div className="dibcac-checklist">
              <div className="dibcac-group-card-objs-header">
                <span className="dibcac-preview-section-label">Checklist</span>
              </div>
              <div className="dibcac-checklist-list">
                {checklist.map((item) => item.type === 'header' ? (
                  <div key={item.id} className="dibcac-checklist-header-row">
                    <span className="dibcac-checklist-number dibcac-checklist-number--header">{checklistNumbers.get(item.id)}</span>
                    <span>{item.text}</span>
                  </div>
                ) : (
                  <div
                    key={item.id}
                    id={checklistItemDomId(item.id)}
                    data-checklist-item-id={item.id}
                    tabIndex={-1}
                    className={`dibcac-checklist-row${highlightedChecklistItemId === item.id ? ' dibcac-checklist-row--highlighted' : ''}`}
                  >
                    <div className="dibcac-checklist-row-main">
                      <input
                        type="checkbox"
                        className="dibcac-obj-checkbox dibcac-checklist-checkbox"
                        checked={isItemMet(item)}
                        onChange={() => toggleChecklistItem(item)}
                        aria-label={`Mark "${item.text}" complete`}
                      />
                      <span className="dibcac-checklist-number">{checklistNumbers.get(item.id)}</span>
                      <span className={`dibcac-checklist-text${isItemMet(item) ? ' dibcac-checklist-text--done' : ''}`}>
                        {item.text}
                      </span>
                    </div>
                    {(item.objKeys ?? []).length > 0 && (
                      <ul className="dibcac-checklist-obj-list">
                        {item.objKeys.map((key) => {
                          const details = objectiveDetailsFor(key)
                          return (
                            <li key={key} className="dibcac-checklist-obj-item">
                              <span className="dibcac-checklist-obj-ref mono">{details.reference}</span>
                              <span className="dibcac-checklist-obj-statement">{details.statement}</span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    <button
                      type="button"
                      className={`dibcac-checklist-note-toggle${item.interviewNote?.trim() ? ' dibcac-checklist-note-toggle--has-note' : ''}`}
                      onClick={() => toggleChecklistNote(item.id)}
                      aria-expanded={openChecklistNoteIds.has(item.id)}
                    >
                      {item.interviewNote?.trim() ? 'Edit Interview Notes' : '+ Interview Notes'}
                    </button>
                    {openChecklistNoteIds.has(item.id) && (
                      <ChecklistInterviewNoteEditor
                        key={`${item.id}:${item.interviewNote ?? ''}`}
                        item={item}
                        onSave={(note) => saveChecklistInterviewNote(item, note)}
                        onClose={() => toggleChecklistNote(item.id)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dibcac-group-card-objs">
            <div className="dibcac-group-card-objs-header">
              <span className="dibcac-preview-section-label">Objectives</span>
              <div className="dibcac-group-card-objs-header-actions">
                <div className="dibcac-obj-view-toggle">
                  <button
                    type="button"
                    className={`dibcac-obj-view-btn${objView === 'list' ? ' dibcac-obj-view-btn--active' : ''}`}
                    onClick={() => setObjViewPersisted('list')}
                  >List</button>
                  <button
                    type="button"
                    className={`dibcac-obj-view-btn${objView === 'cards' ? ' dibcac-obj-view-btn--active' : ''}`}
                    onClick={() => setObjViewPersisted('cards')}
                  >Cards</button>
                </div>
                {!objectiveSelectionMode && group.objectives.length > 0 && (
                  objSelectMode ? (
                    <button type="button" className="dibcac-sort-btn" onClick={toggleObjSelectMode}>Cancel</button>
                  ) : (
                    <button type="button" className="dibcac-sort-btn" onClick={toggleObjSelectMode}>Select</button>
                  )
                )}
              </div>
            </div>
            {objSelectMode && !objectiveSelectionMode && (
              <div className="dibcac-obj-move-bar">
                {confirmingObjectiveRemove ? (
                  <div className="dibcac-objective-remove-confirm">
                    <span>Remove {selectedObjKeys.size} selected objective{selectedObjKeys.size === 1 ? '' : 's'} from this group? Assessment data will remain intact.</span>
                    <button type="button" className="dibcac-action-btn dibcac-action-btn--delete" onClick={handleRemoveSelected}>Yes, remove</button>
                    <button type="button" className="dibcac-action-btn" onClick={() => setConfirmingObjectiveRemove(false)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className="dibcac-selection-count">
                      {selectedObjKeys.size} selected
                    </span>
                    <button type="button" className="dibcac-sort-btn" disabled={selectedObjKeys.size === allObjectiveKeys.length} onClick={() => setSelectedObjKeys(new Set(allObjectiveKeys))}>Select All</button>
                    <button type="button" className="dibcac-sort-btn" disabled={selectedObjKeys.size === 0} onClick={() => setSelectedObjKeys(new Set())}>Deselect All</button>
                    {otherGroups.length > 0 && (
                      <select
                        className="dibcac-folder-select"
                        value=""
                        disabled={selectedObjKeys.size === 0}
                        onChange={(e) => handleMoveSelected(e.target.value)}
                        aria-label="Move selected objectives to group"
                      >
                        <option value="">Move to group…</option>
                        {otherGroups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      className="dibcac-action-btn dibcac-action-btn--delete"
                      disabled={selectedObjKeys.size === 0}
                      onClick={() => setConfirmingObjectiveRemove(true)}
                    >Remove selected</button>
                  </>
                )}
              </div>
            )}
            {objectiveSelectionMode && (
              <div className="dibcac-obj-move-bar">
                <span className="dibcac-selection-count">{selectedInThisGroup} selected in this group</span>
                <button
                  type="button"
                  className="dibcac-sort-btn"
                  disabled={selectedInThisGroup === allObjectiveKeys.length}
                  onClick={() => onSelectAllCrossGroupObjectives?.(group.id, allObjectiveKeys)}
                >Select All</button>
                <button
                  type="button"
                  className="dibcac-sort-btn"
                  disabled={selectedInThisGroup === 0}
                  onClick={() => onDeselectAllCrossGroupObjectives?.(group.id, allObjectiveKeys)}
                >Deselect All</button>
              </div>
            )}
            <div className={objView === 'cards' ? 'dibcac-group-card-objs-grid' : undefined}>
              {group.objectives.map((o) => {
                const key = o.key ?? o.objectiveRef
                const objId = o.objId ?? o.objectiveKey
                const status = readObjectiveStatus(o.controlId, objId)
                const result = readObjectiveResult(o.controlId, objId)
                const hasComments = !!result.overallComments
                const commentPreview = result.overallComments?.trim() ?? ''
                const crossGroupRef = crossGroupSelectionKey(group.id, key)
                const objectiveSelected = objectiveSelectionMode
                  ? selectedCrossGroupObjectives?.has(crossGroupRef)
                  : selectedObjKeys.has(key)
                const toggleCurrentObjective = () => objectiveSelectionMode
                  ? onToggleCrossGroupObjective?.(group.id, key)
                  : toggleObjSelected(key)
                const handleObjRowClick = isObjectiveSelecting
                  ? (e) => {
                      if (e.target.closest('.dibcac-group-card-obj-actions') || e.target.closest('.dibcac-obj-ref-btn')) return
                      toggleCurrentObjective()
                    }
                  : undefined
                return (
                  <div
                    key={key}
                    className={`${objView === 'cards' ? 'dibcac-group-card-obj-card' : 'dibcac-group-card-obj-row'}${isObjectiveSelecting ? ' dibcac-group-card-obj-row--selectable' : ''}${objectiveSelected ? ' dibcac-group-card-obj-row--selected' : ''}`}
                    onClick={handleObjRowClick}
                  >
                    <div className="dibcac-group-card-obj-main-row">
                      <div className="dibcac-group-card-obj-left">
                        {isObjectiveSelecting && (
                          <input
                            type="checkbox"
                            className="dibcac-group-select-checkbox"
                            checked={!!objectiveSelected}
                            onChange={toggleCurrentObjective}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select ${o.controlId}[${objId}] from ${group.name}`}
                          />
                        )}
                        <button
                          type="button"
                          className="dibcac-obj-ref-btn mono"
                          onClick={() => onPreview(key)}
                          title="Click to preview objective"
                        >
                          {o.controlId}[{objId}]
                        </button>
                        <span className="dibcac-group-card-obj-text">{o.objText ?? o.objectiveText}</span>
                      </div>
                      <div className="dibcac-group-card-obj-actions">
                        <MethodChip standard={o.standard} />
                        <button
                          type="button"
                          className={`dibcac-status-cycle-btn dibcac-status-cycle-btn--${status === OBJECTIVE_STATUS_MET ? 'met' : status === OBJECTIVE_STATUS_NOT_MET ? 'not-met' : 'unreviewed'}`}
                          onClick={() => cycleStatus(o.controlId, objId)}
                          title="Click to cycle: Unreviewed → MET → NOT MET"
                        >
                          {status === OBJECTIVE_STATUS_MET ? 'MET' : status === OBJECTIVE_STATUS_NOT_MET ? 'NOT MET' : '—'}
                        </button>
                        <button
                          type="button"
                          className={`dibcac-comments-btn${hasComments ? ' dibcac-comments-btn--has-content' : ''}`}
                          onClick={() => setCommentsKey(key)}
                          title="Add/edit overall comments"
                        >
                          {hasComments ? '💬' : '○'}
                        </button>
                      </div>
                    </div>
                    {commentPreview && (
                      <p className="dibcac-group-card-obj-comment">{commentPreview}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function parseGroupSortKey(name) {
  return String(name ?? '').toLowerCase().replace(/(\d+)/g, (n) => n.padStart(10, '0'))
}

function crossGroupSelectionKey(groupId, objectiveKey) {
  return `${groupId}::${objectiveKey}`
}

function parseCrossGroupSelectionKey(value) {
  const separator = value.indexOf('::')
  return separator === -1 ? null : { groupId: value.slice(0, separator), objectiveKey: value.slice(separator + 2) }
}

// ── Folder section ────────────────────────────────────────────────────────────

function FolderSection({
  folder, groups, savedFolders, allGroups, onDelete, onEditRequest, onPreview,
  onMoveToFolder, onDeleteFolder, onMoveObjectives, onRemoveObjectives, onUpdateChecklist, selectionMode, selectedIds, onToggleSelect,
  isOpen, onToggleOpen, expandedGroupIds, onToggleGroupExpanded,
  objectiveSelectionMode, selectedCrossGroupObjectives, onToggleCrossGroupObjective,
  onSelectAllCrossGroupObjectives, onDeselectAllCrossGroupObjectives,
  groupNumberMap, referenceIndex, onNavigateChecklistItem, onNavigateTopic, highlightedChecklistItemId, highlightedTopicAnchorId, onReorderGroup,
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="dibcac-folder-section">
      <div className="dibcac-folder-header">
        <button type="button" className="dibcac-folder-toggle" onClick={onToggleOpen}>
          <span className="dibcac-collapse-icon">{isOpen ? '▼' : '▶'}</span>
          <Folder size={13} className="dibcac-folder-icon" />
          <span className="dibcac-folder-name">{folder.name}</span>
          <span className="dibcac-folder-count">{groups.length}</span>
        </button>
        {confirming ? (
          <div className="dibcac-folder-delete-confirm">
            <span>Delete this folder? Its groups will become ungrouped.</span>
            <button type="button" className="dibcac-action-btn dibcac-action-btn--delete" onClick={() => { onDeleteFolder(folder.id); setConfirming(false) }}>Yes, delete</button>
            <button type="button" className="dibcac-action-btn" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="dibcac-action-btn dibcac-action-btn--delete" onClick={() => setConfirming(true)}>Delete</button>
        )}
      </div>
      {isOpen && (
        <div className="dibcac-folder-body">
          {groups.length === 0 ? (
            <p className="dibcac-folder-empty">No groups in this folder.</p>
          ) : (
            groups.map((group) => (
              <SavedGroupCard
                key={group.id}
                group={group}
                savedFolders={savedFolders}
                allGroups={allGroups}
                onDelete={onDelete}
                onEditRequest={onEditRequest}
                onPreview={onPreview}
                onMoveToFolder={onMoveToFolder}
                onMoveObjectives={onMoveObjectives}
                onRemoveObjectives={onRemoveObjectives}
                onUpdateChecklist={onUpdateChecklist}
                selectionMode={selectionMode}
                isSelected={selectedIds?.has(group.id)}
                onToggleSelect={onToggleSelect}
                isExpanded={expandedGroupIds?.has(group.id)}
                onToggleExpanded={() => onToggleGroupExpanded(group.id)}
                objectiveSelectionMode={objectiveSelectionMode}
                selectedCrossGroupObjectives={selectedCrossGroupObjectives}
                onToggleCrossGroupObjective={onToggleCrossGroupObjective}
                onSelectAllCrossGroupObjectives={onSelectAllCrossGroupObjectives}
                onDeselectAllCrossGroupObjectives={onDeselectAllCrossGroupObjectives}
                groupNumber={groupNumberMap.get(group.id)}
                referenceIndex={referenceIndex}
                onNavigateChecklistItem={onNavigateChecklistItem}
                onNavigateTopic={onNavigateTopic}
                highlightedChecklistItemId={highlightedChecklistItemId}
                highlightedTopicAnchorId={highlightedTopicAnchorId}
                onReorderGroup={onReorderGroup}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Saved groups panel (right rail) ───────────────────────────────────────────

function SavedGroupsPanel({
  savedGroups, savedFolders, onDelete, onEditRequest, onPreview, onEnterBuilder,
  onCreateFolder, onDeleteFolder, onMoveGroupToFolder, onBatchMove, onMoveObjectives, onRemoveObjectives, onUpdateChecklist,
  onCreateFromSelectedObjectives, onMoveSelectedObjectives,
  openFolderIds, onToggleFolderOpen, expandedGroupIds, onToggleGroupExpanded,
  railExpanded, onToggleRailExpanded,
  groupNumberMap, referenceIndex, onNavigateChecklistItem, onNavigateTopic, highlightedChecklistItemId, highlightedTopicAnchorId, onReorderGroup,
}) {
  const [groupSort, setGroupSort] = useState('order') // 'order' | 'name' | 'created'
  const [sortDir,   setSortDir]   = useState('asc')      // 'asc' | 'desc'
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName,  setNewFolderName]  = useState('')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds,   setSelectedIds]   = useState(() => new Set())
  const [showMoveMenu,  setShowMoveMenu]  = useState(false)
  const [objectiveSelectionMode, setObjectiveSelectionMode] = useState(false)
  const [selectedCrossGroupObjectives, setSelectedCrossGroupObjectives] = useState(() => new Set())
  const [showCreateFromSelected, setShowCreateFromSelected] = useState(false)
  const [selectedGroupName, setSelectedGroupName] = useState('')
  const [removeFromOriginals, setRemoveFromOriginals] = useState(false)

  const selectedUniqueObjectiveCount = useMemo(() => {
    const keys = new Set()
    for (const value of selectedCrossGroupObjectives) {
      const parsed = parseCrossGroupSelectionKey(value)
      if (parsed) keys.add(parsed.objectiveKey)
    }
    return keys.size
  }, [selectedCrossGroupObjectives])

  const toggleCrossGroupObjective = (groupId, objectiveKey) => {
    const value = crossGroupSelectionKey(groupId, objectiveKey)
    setSelectedCrossGroupObjectives((current) => {
      const next = new Set(current)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  const selectAllCrossGroupObjectives = (groupId, objectiveKeys) => {
    setSelectedCrossGroupObjectives((current) => {
      const next = new Set(current)
      for (const key of objectiveKeys) next.add(crossGroupSelectionKey(groupId, key))
      return next
    })
  }

  const deselectAllCrossGroupObjectives = (groupId, objectiveKeys) => {
    setSelectedCrossGroupObjectives((current) => {
      const next = new Set(current)
      for (const key of objectiveKeys) next.delete(crossGroupSelectionKey(groupId, key))
      return next
    })
  }

  const exitObjectiveSelectionMode = () => {
    setObjectiveSelectionMode(false)
    setSelectedCrossGroupObjectives(new Set())
    setShowCreateFromSelected(false)
    setSelectedGroupName('')
    setRemoveFromOriginals(false)
  }

  const startObjectiveSelectionMode = () => {
    exitSelectionMode()
    setObjectiveSelectionMode(true)
    setSelectedCrossGroupObjectives(new Set())
  }

  const submitSelectedObjectivesGroup = () => {
    if (!selectedGroupName.trim() || selectedCrossGroupObjectives.size === 0) return
    const selections = [...selectedCrossGroupObjectives].map(parseCrossGroupSelectionKey).filter(Boolean)
    onCreateFromSelectedObjectives(selections, selectedGroupName.trim(), removeFromOriginals)
    exitObjectiveSelectionMode()
  }

  const submitMoveSelectedObjectives = (targetGroupId) => {
    if (!targetGroupId || selectedCrossGroupObjectives.size === 0) return
    const selections = [...selectedCrossGroupObjectives].map(parseCrossGroupSelectionKey).filter(Boolean)
    onMoveSelectedObjectives(selections, targetGroupId)
    exitObjectiveSelectionMode()
  }

  const handleSortClick = (sortType) => {
    if (sortType === groupSort) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setGroupSort(sortType)
      setSortDir(sortType === 'name' ? 'asc' : 'desc')
    }
  }

  const toggleGroupSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const enterSelectionMode = () => {
    setObjectiveSelectionMode(false)
    setSelectedCrossGroupObjectives(new Set())
    setShowCreateFromSelected(false)
    setSelectionMode(true)
    setSelectedIds(new Set())
    setShowMoveMenu(false)
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setShowMoveMenu(false)
  }

  const applyBatchMove = (folderId) => {
    if (selectedIds.size > 0) onBatchMove([...selectedIds], folderId)
    setShowMoveMenu(false)
    exitSelectionMode()
  }

  const sortedGroups = useMemo(() => {
    const copy = [...savedGroups]
    if (groupSort === 'order') {
      return copy
    }
    if (groupSort === 'name') {
      copy.sort((a, b) => {
        const cmp = parseGroupSortKey(a.name).localeCompare(parseGroupSortKey(b.name))
        return sortDir === 'asc' ? cmp : -cmp
      })
    } else {
      copy.sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0
        if (!a.createdAt) return sortDir === 'asc' ? 1 : -1
        if (!b.createdAt) return sortDir === 'asc' ? -1 : 1
        const cmp = a.createdAt.localeCompare(b.createdAt)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return copy
  }, [savedGroups, groupSort, sortDir])

  const submitNewFolder = () => {
    if (!newFolderName.trim()) return
    onCreateFolder(newFolderName.trim())
    setNewFolderName('')
    setCreatingFolder(false)
  }

  // Partition groups into folder buckets
  const groupsByFolder = useMemo(() => {
    const map = new Map()
    map.set(null, [])
    for (const f of savedFolders) map.set(f.id, [])
    for (const g of sortedGroups) {
      const fid = g.folderId ?? null
      if (map.has(fid)) map.get(fid).push(g)
      else map.get(null).push(g) // folder deleted — treat as ungrouped
    }
    return map
  }, [savedFolders, sortedGroups])

  const hasFolders = savedFolders.length > 0
  const ungrouped  = groupsByFolder.get(null) ?? []

  const sortDirArrow = (type) => groupSort === type ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div className="dibcac-rail-panel">
      <div className="dibcac-rail-header">
        <div className="dibcac-rail-title-group">
          {onToggleRailExpanded && (
            <button
              type="button"
              className="dibcac-rail-expand-btn"
              onClick={onToggleRailExpanded}
              aria-pressed={railExpanded}
              title={railExpanded ? 'Collapse — show the objective browser again' : 'Expand — fill the workspace with Review Groups'}
            >
              {railExpanded ? '«' : '»'}
            </button>
          )}
          <h2 className="dibcac-rail-title">
            Review Groups
            {savedGroups.length > 0 && (
              <span className="dibcac-saved-count">{savedGroups.length}</span>
            )}
          </h2>
        </div>
        <div className="dibcac-rail-header-actions">
          <button type="button" className="dibcac-create-btn" onClick={onEnterBuilder}>
            + Create
          </button>
          <button type="button" className="dibcac-create-folder-btn" onClick={() => setCreatingFolder((v) => !v)} title="Create a group folder">
            <FolderPlus size={13} /> Folder
          </button>
          <button
            type="button"
            className={`dibcac-create-folder-btn${objectiveSelectionMode ? ' active' : ''}`}
            onClick={objectiveSelectionMode ? exitObjectiveSelectionMode : startObjectiveSelectionMode}
            disabled={savedGroups.every((group) => group.objectives.length === 0)}
            title="Select objectives across multiple review groups"
          >
            {objectiveSelectionMode ? 'Cancel Multi-Select' : 'Multi-Select Objectives'}
          </button>
        </div>
      </div>

      {objectiveSelectionMode && (
        <div className="dibcac-cross-group-selection-bar">
          <div className="dibcac-cross-group-selection-summary">
            <strong>{selectedCrossGroupObjectives.size} selection{selectedCrossGroupObjectives.size === 1 ? '' : 's'}</strong>
            <span>{selectedUniqueObjectiveCount} unique objective{selectedUniqueObjectiveCount === 1 ? '' : 's'} across open groups</span>
          </div>
          <div className="dibcac-cross-group-selection-actions">
            <button
              type="button"
              className="dibcac-builder-save dibcac-cross-group-primary-action"
              disabled={selectedCrossGroupObjectives.size === 0}
              onClick={() => setShowCreateFromSelected(true)}
            >Create Group from Selected</button>
            <select
              className="dibcac-folder-select dibcac-cross-group-move-select"
              value=""
              disabled={selectedCrossGroupObjectives.size === 0}
              onChange={(event) => submitMoveSelectedObjectives(event.target.value)}
              aria-label="Destination group for selected objectives"
            >
              <option value="">Move to group…</option>
              {savedGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {showCreateFromSelected && (
        <div className="dibcac-cross-group-create" role="dialog" aria-labelledby="dibcac-cross-group-create-title">
          <div>
            <h3 id="dibcac-cross-group-create-title">Create group from selected objectives</h3>
            <p>{selectedUniqueObjectiveCount} unique objective{selectedUniqueObjectiveCount === 1 ? '' : 's'} will be added. Duplicate selections are included only once.</p>
          </div>
          <input
            type="text"
            className="dibcac-builder-input"
            value={selectedGroupName}
            onChange={(event) => setSelectedGroupName(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') submitSelectedObjectivesGroup() }}
            placeholder="New group name…"
            aria-label="New group name"
            autoFocus
          />
          <label className="dibcac-cross-group-remove-option">
            <input type="checkbox" checked={removeFromOriginals} onChange={(event) => setRemoveFromOriginals(event.target.checked)} />
            <span><strong>Remove selected objectives from their original groups</strong><small>Leave unchecked to copy them. Check this to move them and avoid overlap.</small></span>
          </label>
          <div className="dibcac-cross-group-create-actions">
            <button type="button" className="dibcac-builder-save" disabled={!selectedGroupName.trim()} onClick={submitSelectedObjectivesGroup}>Create Group</button>
            <button type="button" className="dibcac-builder-cancel" onClick={() => { setShowCreateFromSelected(false); setSelectedGroupName(''); setRemoveFromOriginals(false) }}>Back</button>
          </div>
        </div>
      )}

      {creatingFolder && (
        <div className="dibcac-create-folder-form">
          <input
            type="text"
            className="dibcac-builder-input"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitNewFolder()}
            placeholder="Folder name…"
            autoFocus
          />
          <button type="button" className="dibcac-builder-save" onClick={submitNewFolder} disabled={!newFolderName.trim()}>Create</button>
          <button type="button" className="dibcac-builder-cancel" onClick={() => { setCreatingFolder(false); setNewFolderName('') }}>Cancel</button>
        </div>
      )}

      {savedGroups.length === 0 && savedFolders.length === 0 ? (
        <p className="dibcac-rail-empty">
          No review groups yet. Create one to plan your assessment sessions.
        </p>
      ) : (
        <>
          <div className="dibcac-sort-row">
            <span className="dibcac-sort-label">Sort:</span>
            <button
              type="button"
              className={`dibcac-sort-btn${groupSort === 'order' ? ' dibcac-sort-btn--active' : ''}`}
              onClick={() => setGroupSort('order')}
            >Canonical Order</button>
            <button
              type="button"
              className={`dibcac-sort-btn${groupSort === 'name' ? ' dibcac-sort-btn--active' : ''}`}
              onClick={() => handleSortClick('name')}
            >Name{sortDirArrow('name')}</button>
            <button
              type="button"
              className={`dibcac-sort-btn${groupSort === 'created' ? ' dibcac-sort-btn--active' : ''}`}
              onClick={() => handleSortClick('created')}
            >Date Created{sortDirArrow('created')}</button>
            <div className="dibcac-sort-spacer" />
            {!selectionMode ? (
              <button type="button" className="dibcac-select-groups-btn" onClick={enterSelectionMode}>
                Select Groups
              </button>
            ) : (
              <button type="button" className="dibcac-sort-btn" onClick={exitSelectionMode}>
                Cancel
              </button>
            )}
          </div>

          {selectionMode && (
            <div className="dibcac-selection-bar">
              <span className="dibcac-selection-count">
                {selectedIds.size} group{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="dibcac-selection-actions">
                <div className="dibcac-move-menu-wrapper">
                  <button
                    type="button"
                    className="dibcac-builder-save dibcac-move-btn"
                    disabled={selectedIds.size === 0}
                    onClick={() => setShowMoveMenu((v) => !v)}
                  >
                    Move to Folder ▾
                  </button>
                  {showMoveMenu && (
                    <div className="dibcac-move-menu">
                      <button type="button" className="dibcac-move-menu-item" onClick={() => applyBatchMove(null)}>
                        No Folder / Ungrouped
                      </button>
                      {savedFolders.length === 0 && (
                        <p className="dibcac-move-menu-hint">Create a folder first to organize selected groups.</p>
                      )}
                      {savedFolders.map((f) => (
                        <button key={f.id} type="button" className="dibcac-move-menu-item" onClick={() => applyBatchMove(f.id)}>
                          <Folder size={12} /> {f.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="dibcac-saved-hint">Saved locally · included in Settings project backups.</p>

          {hasFolders ? (
            <>
              {savedFolders.map((folder) => (
                <FolderSection
                  key={folder.id}
                  folder={folder}
                  groups={groupsByFolder.get(folder.id) ?? []}
                  savedFolders={savedFolders}
                  allGroups={savedGroups}
                  onDelete={onDelete}
                  onEditRequest={onEditRequest}
                  onPreview={onPreview}
                  onMoveToFolder={onMoveGroupToFolder}
                  onDeleteFolder={onDeleteFolder}
                  onMoveObjectives={onMoveObjectives}
                  onRemoveObjectives={onRemoveObjectives}
                  onUpdateChecklist={onUpdateChecklist}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleGroupSelect}
                  isOpen={openFolderIds.has(folder.id)}
                  onToggleOpen={() => onToggleFolderOpen(folder.id)}
                  expandedGroupIds={expandedGroupIds}
                  onToggleGroupExpanded={onToggleGroupExpanded}
                  objectiveSelectionMode={objectiveSelectionMode}
                  selectedCrossGroupObjectives={selectedCrossGroupObjectives}
                  onToggleCrossGroupObjective={toggleCrossGroupObjective}
                  onSelectAllCrossGroupObjectives={selectAllCrossGroupObjectives}
                  onDeselectAllCrossGroupObjectives={deselectAllCrossGroupObjectives}
                  groupNumberMap={groupNumberMap}
                  referenceIndex={referenceIndex}
                  onNavigateChecklistItem={onNavigateChecklistItem}
                  onNavigateTopic={onNavigateTopic}
                  highlightedChecklistItemId={highlightedChecklistItemId}
                  highlightedTopicAnchorId={highlightedTopicAnchorId}
                  onReorderGroup={onReorderGroup}
                />
              ))}
              {ungrouped.length > 0 && (
                <div className="dibcac-folder-section dibcac-folder-section--ungrouped">
                  <div className="dibcac-folder-header dibcac-folder-header--ungrouped">
                    <span className="dibcac-folder-name">Ungrouped</span>
                    <span className="dibcac-folder-count">{ungrouped.length}</span>
                  </div>
                  <div className="dibcac-folder-body">
                    {ungrouped.map((group) => (
                      <SavedGroupCard
                        key={group.id}
                        group={group}
                        savedFolders={savedFolders}
                        allGroups={savedGroups}
                        onDelete={onDelete}
                        onEditRequest={onEditRequest}
                        onPreview={onPreview}
                        onMoveToFolder={onMoveGroupToFolder}
                        onMoveObjectives={onMoveObjectives}
                        onRemoveObjectives={onRemoveObjectives}
                        onUpdateChecklist={onUpdateChecklist}
                        selectionMode={selectionMode}
                        isSelected={selectedIds.has(group.id)}
                        onToggleSelect={toggleGroupSelect}
                        isExpanded={expandedGroupIds.has(group.id)}
                        onToggleExpanded={() => onToggleGroupExpanded(group.id)}
                        objectiveSelectionMode={objectiveSelectionMode}
                        selectedCrossGroupObjectives={selectedCrossGroupObjectives}
                        onToggleCrossGroupObjective={toggleCrossGroupObjective}
                        onSelectAllCrossGroupObjectives={selectAllCrossGroupObjectives}
                        onDeselectAllCrossGroupObjectives={deselectAllCrossGroupObjectives}
                        groupNumber={groupNumberMap.get(group.id)}
                        referenceIndex={referenceIndex}
                        onNavigateChecklistItem={onNavigateChecklistItem}
                        onNavigateTopic={onNavigateTopic}
                        highlightedChecklistItemId={highlightedChecklistItemId}
                        highlightedTopicAnchorId={highlightedTopicAnchorId}
                        onReorderGroup={onReorderGroup}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="dibcac-saved-list">
              {sortedGroups.map((group) => (
                <SavedGroupCard
                  key={group.id}
                  group={group}
                  savedFolders={savedFolders}
                  allGroups={savedGroups}
                  onDelete={onDelete}
                  onEditRequest={onEditRequest}
                  onPreview={onPreview}
                  onMoveToFolder={onMoveGroupToFolder}
                  onMoveObjectives={onMoveObjectives}
                  onRemoveObjectives={onRemoveObjectives}
                  onUpdateChecklist={onUpdateChecklist}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(group.id)}
                  onToggleSelect={toggleGroupSelect}
                  isExpanded={expandedGroupIds.has(group.id)}
                  onToggleExpanded={() => onToggleGroupExpanded(group.id)}
                  objectiveSelectionMode={objectiveSelectionMode}
                  selectedCrossGroupObjectives={selectedCrossGroupObjectives}
                  onToggleCrossGroupObjective={toggleCrossGroupObjective}
                  onSelectAllCrossGroupObjectives={selectAllCrossGroupObjectives}
                  onDeselectAllCrossGroupObjectives={deselectAllCrossGroupObjectives}
                  groupNumber={groupNumberMap.get(group.id)}
                  referenceIndex={referenceIndex}
                  onNavigateChecklistItem={onNavigateChecklistItem}
                  onNavigateTopic={onNavigateTopic}
                  highlightedChecklistItemId={highlightedChecklistItemId}
                  highlightedTopicAnchorId={highlightedTopicAnchorId}
                  onReorderGroup={onReorderGroup}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TopicNavigator({ topics, onNavigate, compact = false }) {
  const [query, setQuery] = useState('')
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return normalized ? topics.filter((topic) => topic.label.toLowerCase().includes(normalized)) : topics
  }, [query, topics])
  return (
    <section className={`dibcac-topic-navigator${compact ? ' dibcac-topic-navigator--compact' : ''}`} aria-label="Topic Navigator">
      <div className="dibcac-topic-navigator-header">
        <span>Topic Navigator</span>
        {topics.length > 8 && (
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a topic…" aria-label="Search topics" />
        )}
      </div>
      <div className="dibcac-topic-navigator-chips">
        {visible.length > 0 ? visible.map((topic) => (
          <button
            key={`${topic.groupId}:${topic.topicAnchorId}`}
            type="button"
            onClick={() => onNavigate(topic)}
            title={`Open topic in ${topic.groupName}`}
          >{topic.label}</button>
        )) : <span className="dibcac-topic-navigator-empty">{topics.length ? 'No matching topics.' : 'Add a heading such as !REMOTE ACCESS! in Planned Ask.'}</span>}
      </div>
    </section>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function DibcacMode() {
  const [mode, setMode] = useState('browse')        // 'browse' | 'builder'
  const [editingGroup, setEditingGroup] = useState(null) // null = new group; group obj = edit mode
  const [search, setSearch] = useState('')
  const [familyFilter, setFamilyFilter] = useState('All')
  const [methodFilter, setMethodFilter] = useState('all')
  const [checkedKeys, setCheckedKeys] = useState(new Set())
  const [hideMet, setHideMet] = useState(() => localStorage.getItem('cmmc-dibcac-hide-met') === 'true')
  const toggleHideMet = () => setHideMet((prev) => {
    const next = !prev
    localStorage.setItem('cmmc-dibcac-hide-met', String(next))
    return next
  })
  const [savedGroups,  setSavedGroups]  = useState(getReviewGroups)
  const [savedFolders, setSavedFolders] = useState(getReviewFolders)
  const referenceIndex = useMemo(() => buildChecklistReferenceIndex(savedGroups), [savedGroups])
  const topicIndex = useMemo(() => buildTopicAnchorIndex(savedGroups), [savedGroups])
  const groupNumberMap = useMemo(() => buildGroupNumberMap(savedGroups), [savedGroups])
  // Lifted out of FolderSection/SavedGroupCard so open/expanded state survives
  // SavedGroupsPanel unmounting when entering builder mode to edit a group —
  // previously editing a group and saving would collapse every open folder.
  // Also persisted to localStorage (not just component state) so navigating
  // away to another page and back doesn't collapse everything — DibcacMode
  // fully unmounts on route change, which would otherwise reset these to empty.
  const [openFolderIds, setOpenFolderIds] = useState(() => readIdSet('cmmc-dibcac-open-folder-ids'))
  const [expandedGroupIds, setExpandedGroupIds] = useState(() => readIdSet('cmmc-dibcac-expanded-group-ids'))
  const toggleFolderOpen = (id) => setOpenFolderIds((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    writeIdSet('cmmc-dibcac-open-folder-ids', next)
    return next
  })
  const toggleGroupExpanded = (id) => setExpandedGroupIds((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    writeIdSet('cmmc-dibcac-expanded-group-ids', next)
    return next
  })
  const [previewKey, setPreviewKey] = useState(null)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [railExpanded, setRailExpanded] = useState(() => localStorage.getItem('cmmc-dibcac-rail-expanded') === 'true')
  const [highlightedChecklistItemId, setHighlightedChecklistItemId] = useState(null)
  const [highlightedTopicAnchorId, setHighlightedTopicAnchorId] = useState(null)
  const highlightTimerRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => () => clearTimeout(highlightTimerRef.current), [])

  const revealSavedGroupTarget = useCallback((target, elementId, setHighlight, highlightKey) => {
    if (!target) return false
    setMode('browse')
    setEditingGroup(null)
    setRailExpanded(true)
    localStorage.setItem('cmmc-dibcac-rail-expanded', 'true')
    if (target.folderId) {
      setOpenFolderIds((current) => {
        const next = new Set(current).add(target.folderId)
        writeIdSet('cmmc-dibcac-open-folder-ids', next)
        return next
      })
    }
    setExpandedGroupIds((current) => {
      const next = new Set(current).add(target.groupId)
      writeIdSet('cmmc-dibcac-expanded-group-ids', next)
      return next
    })
    setHighlight(highlightKey)
    clearTimeout(highlightTimerRef.current)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const element = document.getElementById(elementId)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element?.focus({ preventScroll: true })
      highlightTimerRef.current = setTimeout(() => setHighlight(null), 1800)
    }))
    return true
  }, [])

  const navigateToChecklistItem = useCallback(({ groupId, itemId }) => {
    const target = resolveChecklistNavigationTarget(savedGroups, referenceIndex, groupId, itemId)
    return revealSavedGroupTarget(target, checklistItemDomId(itemId), setHighlightedChecklistItemId, itemId)
  }, [referenceIndex, revealSavedGroupTarget, savedGroups])

  const navigateToTopic = useCallback(({ groupId, topicAnchorId }) => {
    const target = resolveTopicNavigationTarget(savedGroups, topicIndex, groupId, topicAnchorId)
    return revealSavedGroupTarget(target, topicAnchorDomId(groupId, topicAnchorId), setHighlightedTopicAnchorId, `${groupId}:${topicAnchorId}`)
  }, [revealSavedGroupTarget, savedGroups, topicIndex])

  const allObjs = useMemo(() => {
    const list = []
    for (const control of controls) {
      for (const obj of (control.objectives ?? [])) {
        const std = getDibcacStandard(control.id, obj.id)
        list.push({
          key: `${control.id}[${obj.id}]`,
          controlId: control.id,
          controlTitle: control.title,
          family: control.family,
          objId: obj.id,
          objText: obj.text,
          standard: std?.standard ?? null,
          standardLabel: std?.label ?? 'Variable',
        })
      }
    }
    return list
  }, [])

  const unmappedCount = useMemo(() => allObjs.filter((o) => o.standard === null).length, [allObjs])

  const filteredObjs = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allObjs.filter((o) => {
      if (methodFilter !== 'all') {
        if (methodFilter === 'unknown' && o.standard !== null) return false
        if (methodFilter !== 'unknown' && o.standard !== methodFilter) return false
      }
      if (familyFilter !== 'All' && o.family !== familyFilter) return false
      if (hideMet && readObjectiveStatus(o.controlId, o.objId) === OBJECTIVE_STATUS_MET) return false
      if (q) {
        return (
          o.controlId.toLowerCase().includes(q) ||
          o.controlTitle.toLowerCase().includes(q) ||
          o.family.toLowerCase().includes(q) ||
          o.objText.toLowerCase().includes(q) ||
          o.objId.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [allObjs, search, familyFilter, methodFilter, hideMet])

  const methodCounts = useMemo(() => {
    const m = {}
    for (const o of allObjs) {
      if (o.standard === null) { m.unknown = (m.unknown ?? 0) + 1; continue }
      m[o.standard] = (m[o.standard] ?? 0) + 1
    }
    return m
  }, [allObjs])

  const toggleCheck = (key) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const enterBuilder = () => {
    setEditingGroup(null)
    setMode('builder')
    setCheckedKeys(new Set())
  }

  const handleEditRequest = (group) => {
    setEditingGroup(group)
    setMode('builder')
    setCheckedKeys(new Set())
  }

  const cancelBuilder = () => {
    setMode('browse')
    setEditingGroup(null)
    setCheckedKeys(new Set())
  }

  const handleSaveGroup = (group) => {
    let next
    if (editingGroup) {
      reconcileChecklistInterviewNotes(editingGroup, group)
      // Update existing group
      next = updateReviewGroup(group.id, {
        name: group.name,
        plannedAsk: group.plannedAsk,
        plannedAskContent: group.plannedAskContent,
        plannedAskRichDocument: group.plannedAskRichDocument,
        objectives: group.objectives,
        checklist: group.checklist,
      })
    } else {
      // Create new group
      next = createReviewGroup(group)
    }
    setSavedGroups(next)
    setMode('browse')
    setEditingGroup(null)
    setCheckedKeys(new Set())
    // Keep the saved group (and its folder, if any) expanded/open on return
    // to the browse view, instead of resetting to fully collapsed.
    const saved = next.find((g) => g.id === group.id)
    setExpandedGroupIds((prev) => new Set(prev).add(group.id))
    if (saved?.folderId) {
      setOpenFolderIds((prev) => new Set(prev).add(saved.folderId))
    }
  }

  const handleDeleteGroup = (id) => {
    const group = savedGroups.find((entry) => entry.id === id)
    if (group) removeGroupChecklistInterviewNotes(group)
    const next = deleteReviewGroup(id)
    setSavedGroups(next)
  }

  // Moves the given objective keys out of one saved group and into another.
  // Skips any objective already present in the target group (no duplicates).
  // Operates on the in-memory savedGroups state directly (rather than
  // round-tripping through getReviewGroups()/updateReviewGroup() twice) so
  // the UI reflects the move immediately instead of needing a refresh.
  const handleMoveObjectives = (sourceGroupId, targetGroupId, objKeys) => {
    if (sourceGroupId === targetGroupId || objKeys.length === 0) return
    const source = savedGroups.find((g) => g.id === sourceGroupId)
    const target = savedGroups.find((g) => g.id === targetGroupId)
    if (!source || !target) return
    const keySet = new Set(objKeys)
    const moving = source.objectives.filter((o) => keySet.has(o.key ?? o.objectiveRef))
    const targetKeys = new Set(target.objectives.map((o) => o.key ?? o.objectiveRef))
    const toAdd = moving.filter((o) => !targetKeys.has(o.key ?? o.objectiveRef))
    const next = savedGroups.map((g) => {
      if (g.id === sourceGroupId) {
        return { ...g, objectives: g.objectives.filter((o) => !keySet.has(o.key ?? o.objectiveRef)), updatedAt: new Date().toISOString() }
      }
      if (g.id === targetGroupId) {
        return { ...g, objectives: [...g.objectives, ...toAdd], updatedAt: new Date().toISOString() }
      }
      return g
    })
    saveReviewGroups(next)
    setSavedGroups(next)
    setExpandedGroupIds((prev) => new Set(prev).add(sourceGroupId).add(targetGroupId))
  }

  const handleRemoveObjectives = (groupId, objKeys) => {
    if (objKeys.length === 0) return
    const keySet = new Set(objKeys)
    const next = savedGroups.map((group) => group.id === groupId
      ? {
          ...group,
          objectives: group.objectives.filter((objective) => !keySet.has(objective.key ?? objective.objectiveRef)),
          updatedAt: new Date().toISOString(),
        }
      : group)
    saveReviewGroups(next)
    setSavedGroups(next)
  }

  const handleCreateFromSelectedObjectives = (selections, name, removeOriginals) => {
    const selectedByGroup = new Map()
    const uniqueObjectives = new Map()

    for (const { groupId, objectiveKey } of selections) {
      const source = savedGroups.find((group) => group.id === groupId)
      const objective = source?.objectives.find((item) => (item.key ?? item.objectiveRef) === objectiveKey)
      if (!objective) continue
      if (!selectedByGroup.has(groupId)) selectedByGroup.set(groupId, new Set())
      selectedByGroup.get(groupId).add(objectiveKey)
      if (!uniqueObjectives.has(objectiveKey)) uniqueObjectives.set(objectiveKey, { ...objective })
    }

    if (uniqueObjectives.size === 0) return
    const now = new Date().toISOString()
    const retainedGroups = removeOriginals
      ? savedGroups.map((group) => {
          const keys = selectedByGroup.get(group.id)
          return keys
            ? { ...group, objectives: group.objectives.filter((item) => !keys.has(item.key ?? item.objectiveRef)), updatedAt: now }
            : group
        })
      : savedGroups
    const newGroup = {
      id: crypto.randomUUID(),
      name,
      plannedAsk: '',
      objectives: [...uniqueObjectives.values()],
      checklist: [],
      createdAt: now,
    }
    const next = [...retainedGroups, newGroup]
    setSavedGroups(saveReviewGroups(next))
    setExpandedGroupIds((current) => new Set(current).add(newGroup.id))
  }

  const handleMoveSelectedObjectives = (selections, targetGroupId) => {
    const target = savedGroups.find((group) => group.id === targetGroupId)
    if (!target || selections.length === 0) return

    const selectedByGroup = new Map()
    const uniqueObjectives = new Map()
    for (const { groupId, objectiveKey } of selections) {
      const source = savedGroups.find((group) => group.id === groupId)
      const objective = source?.objectives.find((item) => (item.key ?? item.objectiveRef) === objectiveKey)
      if (!objective) continue
      if (!selectedByGroup.has(groupId)) selectedByGroup.set(groupId, new Set())
      selectedByGroup.get(groupId).add(objectiveKey)
      if (!uniqueObjectives.has(objectiveKey)) uniqueObjectives.set(objectiveKey, objective)
    }
    if (uniqueObjectives.size === 0) return

    const targetKeys = new Set(target.objectives.map((item) => item.key ?? item.objectiveRef))
    const additions = [...uniqueObjectives.entries()]
      .filter(([key]) => !targetKeys.has(key))
      .map(([, objective]) => objective)
    const now = new Date().toISOString()
    const next = savedGroups.map((group) => {
      if (group.id === targetGroupId) {
        return additions.length > 0
          ? { ...group, objectives: [...group.objectives, ...additions], updatedAt: now }
          : group
      }
      const selectedKeys = selectedByGroup.get(group.id)
      return selectedKeys
        ? { ...group, objectives: group.objectives.filter((item) => !selectedKeys.has(item.key ?? item.objectiveRef)), updatedAt: now }
        : group
    })
    saveReviewGroups(next)
    setSavedGroups(next)
    setExpandedGroupIds((current) => new Set(current).add(targetGroupId))
  }

  // Persists a group's checklist (add/remove/check/uncheck items) straight
  // to state + storage, same pattern as handleMoveObjectives above.
  const handleUpdateChecklist = (groupId, checklist) => {
    const next = savedGroups.map((g) => g.id === groupId ? { ...g, checklist } : g)
    saveReviewGroups(next)
    setSavedGroups(next)
  }

  const handleReorderGroup = (groupId, direction) => {
    const index = savedGroups.findIndex((group) => group.id === groupId)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= savedGroups.length) return
    const next = [...savedGroups]
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    setSavedGroups(saveReviewGroups(next))
  }

  const handleCreateFolder = (name) => {
    const next = createReviewFolder(name)
    setSavedFolders(next)
  }

  const handleDeleteFolder = (folderId) => {
    // Unassign all groups in the deleted folder
    const groups = getReviewGroups()
    for (const g of groups) {
      if (g.folderId === folderId) assignGroupToFolder(g.id, null)
    }
    const nextFolders = deleteReviewFolder(folderId)
    setSavedFolders(nextFolders)
    setSavedGroups(getReviewGroups())
  }

  const handleMoveGroupToFolder = (groupId, folderId) => {
    const next = assignGroupToFolder(groupId, folderId)
    setSavedGroups(next)
  }

  const handleBatchMoveGroups = (groupIds, folderId) => {
    for (const id of groupIds) assignGroupToFolder(id, folderId)
    setSavedGroups(getReviewGroups())
  }

  const handleApplyTemplate = ({ groups, folders }) => {
    const orderedGroups = saveReviewGroups(groups)
    saveReviewFolders(folders)
    setSavedGroups(orderedGroups)
    setSavedFolders(folders)
    const nextOpenFolders = new Set(folders.map((folder) => folder.id))
    setOpenFolderIds(nextOpenFolders)
    setExpandedGroupIds(new Set())
    writeIdSet('cmmc-dibcac-open-folder-ids', nextOpenFolders)
    writeIdSet('cmmc-dibcac-expanded-group-ids', new Set())
    setMode('browse')
    setEditingGroup(null)
    setCheckedKeys(new Set())
  }


  return (
    <div className="dash-root">
      <DashSidebar />

      <main className="dash-main dibcac-page">

      {previewKey && (
        <ObjectivePreview previewKey={previewKey} onClose={() => setPreviewKey(null)} />
      )}
      {templatesOpen && (
        <DibcacTemplatesModal
          currentGroups={savedGroups}
          currentFolders={savedFolders}
          onApply={handleApplyTemplate}
          onClose={() => setTemplatesOpen(false)}
        />
      )}

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="dibcac-page-header">
        <div className="dibcac-page-header-row">
          <h1>DIBCAC Mode</h1>
          <button type="button" className="dibcac-templates-btn" onClick={() => setTemplatesOpen(true)}><LayoutTemplate size={16} /> Templates</button>
        </div>
        <p className="dibcac-page-subtitle">
          Plan objective review sequences by DIBCAC assessment method.
          Use this workspace to group objectives efficiently before a live assessment session.
          Final assessment decisions remain the responsibility of the assessor.
        </p>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="dibcac-toolbar">
        <div className="dibcac-toolbar-row">
          <input
            ref={searchRef}
            type="search"
            className="dibcac-search"
            placeholder="Search controls, objectives, families…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search objectives"
          />
          <select
            className="dibcac-family-select"
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
            aria-label="Filter by family"
          >
            <option value="All">All Families</option>
            {ALL_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <button type="button" className="control-utility-toggle" onClick={toggleHideMet} aria-pressed={hideMet}>
            <span className="cl2-toggle-track" style={{ background: hideMet ? 'var(--dash-accent)' : '#1C1C20' }}>
              <span className="cl2-toggle-thumb" style={{ transform: hideMet ? 'translateX(14px)' : 'translateX(0)' }} />
            </span>
            Hide MET objectives
          </button>
        </div>

        <div className="dibcac-method-filters" role="group" aria-label="Filter by assessment method">
          <button
            type="button"
            className={`dibcac-method-filter-btn${methodFilter === 'all' ? ' dibcac-method-filter-btn--active' : ''}`}
            onClick={() => setMethodFilter('all')}
          >All</button>
          {DIBCAC_STANDARDS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`dibcac-method-filter-btn${methodFilter === s.value ? ' dibcac-method-filter-btn--active' : ''}`}
              onClick={() => setMethodFilter(s.value)}
            >
              {s.label}
              <span className="dibcac-method-filter-count">{methodCounts[s.value] ?? 0}</span>
            </button>
          ))}
          {unmappedCount > 0 && (
            <button
              type="button"
              className={`dibcac-method-filter-btn dibcac-method-filter-btn--muted${methodFilter === 'unknown' ? ' dibcac-method-filter-btn--active' : ''}`}
              onClick={() => setMethodFilter('unknown')}
              title="Objectives not yet covered by DIBCAC standard metadata"
            >
              Variable
              <span className="dibcac-method-filter-count">{unmappedCount}</span>
            </button>
          )}
        </div>

        {unmappedCount > 0 && methodFilter === 'all' && (
          <p className="dibcac-unmapped-note">
            {unmappedCount} objective{unmappedCount !== 1 ? 's have' : ' has'} a Variable assessment standard — no single method is fixed.{' '}
            <button type="button" className="dibcac-unmapped-link" onClick={() => setMethodFilter('unknown')}>View variable</button>
          </p>
        )}
      </div>

      {/* ── Builder mode hint ─────────────────────────────────────────────── */}
      {mode === 'builder' && (
        <div className="dibcac-builder-hint">
          Check objectives on the left, then click <strong>Add selected objectives</strong> in the builder panel.
        </div>
      )}

      {/* ── Main workspace (always split) ─────────────────────────────────── */}
      <div className={`dibcac-workspace dibcac-workspace--split${railExpanded && mode === 'browse' ? ' dibcac-workspace--rail-expanded' : ''}`}>
        {/* Left: objective browser */}
        {!(railExpanded && mode === 'browse') && (
          <div className="dibcac-browser-pane">
            <GroupedBrowser
              flatObjs={filteredObjs}
              builderMode={mode === 'builder'}
              checkedKeys={checkedKeys}
              onCheck={toggleCheck}
              onPreview={setPreviewKey}
            />
          </div>
        )}

        {/* Right rail */}
        <div className="dibcac-right-rail">
          {mode === 'builder' ? (
            <>
              <BuilderPanel
                checkedKeys={checkedKeys}
                flatObjs={allObjs}
                allGroups={savedGroups}
                onSave={handleSaveGroup}
                onCancel={cancelBuilder}
                editingGroup={editingGroup}
                hideMet={hideMet}
                onToggleHideMet={toggleHideMet}
              />
              {savedGroups.length > 0 && (
                <div className="dibcac-rail-saved-below">
                  <p className="dibcac-rail-saved-below-label">
                    Saved Groups <span className="dibcac-saved-count">{savedGroups.length}</span>
                  </p>
                  <div className="dibcac-saved-list">
                    {savedGroups.map((group) => (
                      <SavedGroupCard
                        key={group.id}
                        group={group}
                        allGroups={savedGroups}
                        onDelete={handleDeleteGroup}
                        onEditRequest={handleEditRequest}
                        onPreview={setPreviewKey}
                        onMoveObjectives={handleMoveObjectives}
                        onRemoveObjectives={handleRemoveObjectives}
                        onUpdateChecklist={handleUpdateChecklist}
                        isExpanded={expandedGroupIds.has(group.id)}
                        onToggleExpanded={() => toggleGroupExpanded(group.id)}
                        groupNumber={groupNumberMap.get(group.id)}
                        referenceIndex={referenceIndex}
                        onNavigateChecklistItem={navigateToChecklistItem}
                        onNavigateTopic={navigateToTopic}
                        highlightedChecklistItemId={highlightedChecklistItemId}
                        highlightedTopicAnchorId={highlightedTopicAnchorId}
                        onReorderGroup={handleReorderGroup}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <SavedGroupsPanel
              savedGroups={savedGroups}
              savedFolders={savedFolders}
              onDelete={handleDeleteGroup}
              onEditRequest={handleEditRequest}
              onPreview={setPreviewKey}
              onEnterBuilder={enterBuilder}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onMoveGroupToFolder={handleMoveGroupToFolder}
              onBatchMove={handleBatchMoveGroups}
              onMoveObjectives={handleMoveObjectives}
              onRemoveObjectives={handleRemoveObjectives}
              onCreateFromSelectedObjectives={handleCreateFromSelectedObjectives}
              onMoveSelectedObjectives={handleMoveSelectedObjectives}
              onUpdateChecklist={handleUpdateChecklist}
              openFolderIds={openFolderIds}
              onToggleFolderOpen={toggleFolderOpen}
              expandedGroupIds={expandedGroupIds}
              onToggleGroupExpanded={toggleGroupExpanded}
              railExpanded={railExpanded}
              onToggleRailExpanded={() => setRailExpanded((v) => {
                const next = !v
                localStorage.setItem('cmmc-dibcac-rail-expanded', String(next))
                return next
              })}
              groupNumberMap={groupNumberMap}
              referenceIndex={referenceIndex}
              onNavigateChecklistItem={navigateToChecklistItem}
              onNavigateTopic={navigateToTopic}
              highlightedChecklistItemId={highlightedChecklistItemId}
              highlightedTopicAnchorId={highlightedTopicAnchorId}
              onReorderGroup={handleReorderGroup}
            />
          )}
        </div>
      </div>
      </main>
    </div>
  )
}

export default DibcacMode
