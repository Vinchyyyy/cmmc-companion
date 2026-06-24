import { useState, useMemo, useEffect } from 'react'
import {
  buildArtifactEvidenceProfile,
  buildObjectiveEvidenceProfile,
  buildAssessmentGuideProfile,
  scoreArtifactForObjective,
  summarizeReuseScore,
  STRONG_CAP,
  RELATED_CAP,
} from '../utils/evidenceTagMatch.js'
import { Link, useSearchParams } from 'react-router-dom'
import controls from '../data/controls/index.js'
import relationships from '../data/relationships/index.js'
import { evidenceTags } from '../data/evidenceTags.js'
import { buildArtifactIndex } from '../utils/artifactIndex.js'
import { inferKillChainCategory } from '../utils/killChainLookup.js'
import { readObjectiveArtifacts, writeObjectiveArtifacts } from '../utils/objectiveArtifacts.js'
import { listArtifacts, findByName, findOrCreate, updateArtifactTags } from '../utils/artifactRegistry.js'
import EvidenceTagPickerModal from '../components/EvidenceTagPickerModal.jsx'
import ArtifactTagChipList from '../components/ArtifactTagChipList.jsx'

const MAPPINGS_PAGE_SIZE = 5
const SUGGESTION_TIER_PAGE_SIZE = 5

// Build a fast tag-id → label lookup once at module load
const TAG_LABEL = Object.fromEntries(evidenceTags.map((t) => [t.id, t.label]))

// Sort category names: alphabetical, Mixed and Uncategorized last
function categoryRank(name) {
  if (name === 'Mixed') return 1
  if (name === 'Uncategorized') return 2
  return 0
}
function sortCategoryNames(a, b) {
  const diff = categoryRank(a) - categoryRank(b)
  return diff !== 0 ? diff : a.localeCompare(b)
}

// -------------------------------------------------------------------------
// Reuse suggestion helper (Phase 2 — compound scoring)
// -------------------------------------------------------------------------
// Pool-based, per-artifact: scores the artifact against every objective using
// the shared compound scorer (src/utils/evidenceTagMatch.js). Relationship /
// mapping proximity (same control, directly related control, same family) is a
// scoring signal, not a gate. Excludes an objective only while the artifact is
// CURRENTLY assigned to that exact objective, so a removed mapping reappears.
const EMPTY_TIERED = () => ({
  strong: [],
  related: [],
  excluded: { untaggedCount: 0, broadCount: 0, alreadyAssignedCount: 0, cappedCount: 0 },
})

function getReuseSuggestions(artifactName, usages, allControls, allRelationships, artifactTagIds = []) {
  const result = EMPTY_TIERED()
  if (!artifactTagIds || artifactTagIds.length === 0) return result

  const artifactLower = artifactName.toLowerCase()
  const artifactProfile = buildArtifactEvidenceProfile(artifactTagIds)

  // Controls where this artifact is currently mapped (objective-level or pool).
  const sourceControlIds = new Set(usages.map((u) => u.controlId))

  // evidence_reuse adjacency for those source controls.
  const relatedToSource = new Set()
  for (const rel of allRelationships) {
    if (rel.assessmentCategory && rel.assessmentCategory !== 'evidence_reuse') continue
    if (sourceControlIds.has(rel.sourceControl)) relatedToSource.add(rel.targetControl)
    if (sourceControlIds.has(rel.targetControl)) relatedToSource.add(rel.sourceControl)
  }

  const familyById = new Map(allControls.map((c) => [c.id, c.family]))
  const sourceFamilies = new Set(
    [...sourceControlIds].map((id) => familyById.get(id)).filter(Boolean)
  )

  for (const control of allControls) {
    for (const obj of (control.objectives ?? [])) {
      const ec = obj.evidenceClass
      if (ec !== 'artifact' && ec !== 'mixed') continue

      const existing = readObjectiveArtifacts(control.id, obj.id)
      if (existing.some((a) => a.toLowerCase() === artifactLower)) {
        result.excluded.alreadyAssignedCount += 1
        continue
      }

      const sameControl = sourceControlIds.has(control.id)
      const directRelationship = relatedToSource.has(control.id)
      const sameFamily = sourceFamilies.has(control.family)
      const hasConnection = sameControl || directRelationship || sameFamily

      const objectiveProfile = buildObjectiveEvidenceProfile(obj)
      const scored = scoreArtifactForObjective(artifactProfile, objectiveProfile, {
        sameControl, directRelationship, sameFamily,
        guideProfile: buildAssessmentGuideProfile(control.id),
      })

      if (scored.tier === 'hidden') {
        if (scored.relevantMatchCount > 0 || hasConnection) result.excluded.broadCount += 1
        continue
      }

      const cand = {
        controlId: control.id,
        controlTitle: control.title,
        objectiveId: obj.id,
        objectiveText: obj.text || '',
        tier: scored.tier,
        score: scored.score,
        reason: summarizeReuseScore(scored),
        reasons: scored.reasons,
        rationale: '',
        matchedTags: [...scored.matchedPrimaryTags, ...scored.matchedAcceptableTags],
      }
      if (scored.tier === 'strong') result.strong.push(cand)
      else result.related.push(cand)
    }
  }

  const byScore = (a, b) =>
    b.score - a.score ||
    a.controlId.localeCompare(b.controlId) ||
    a.objectiveId.localeCompare(b.objectiveId)
  result.strong.sort(byScore)
  result.related.sort(byScore)

  // Visible caps — keep the Suggested Reuse list elite and focused.
  result.excluded.cappedCount =
    Math.max(0, result.strong.length - STRONG_CAP) +
    Math.max(0, result.related.length - RELATED_CAP)
  result.strong = result.strong.slice(0, STRONG_CAP)
  result.related = result.related.slice(0, RELATED_CAP)
  return result
}

// -------------------------------------------------------------------------
// Status badge — Untagged / Tagged / Mapped only
// -------------------------------------------------------------------------
function getArtifactStatus(entry) {
  const rec = findByName(entry.artifact)
  const hasTags = (rec?.tags ?? []).length > 0
  if (!hasTags) return { label: 'Untagged', cls: 'am-badge am-badge--untagged', key: 'untagged' }
  if (entry.usages.length > 0) return { label: 'Mapped', cls: 'am-badge am-badge--mapped', key: 'mapped' }
  return { label: 'Tagged', cls: 'am-badge am-badge--tagged', key: 'tagged' }
}

// -------------------------------------------------------------------------
// Sort icon helper
// -------------------------------------------------------------------------
function SortIcon({ active, dir }) {
  if (!active) return <span className="am-sort-icon am-sort-icon--idle" aria-hidden="true">↕</span>
  return <span className="am-sort-icon am-sort-icon--active" aria-hidden="true">{dir === 'asc' ? '↑' : '↓'}</span>
}

// -------------------------------------------------------------------------
// Expanded artifact row
// -------------------------------------------------------------------------
function ArtifactExpandedRow({ entry, onOpenTagPicker, onAcceptSuggestion, refreshKey }) {
  const [mappingPage, setMappingPage] = useState(0)
  const [strongPage, setStrongPage] = useState(0)
  const [relatedPage, setRelatedPage] = useState(0)
  const [relatedExpanded, setRelatedExpanded] = useState(false)

  const rec = findByName(entry.artifact)
  const tagIds = rec?.tags ?? []
  const hasTags = tagIds.length > 0

  const tiered = useMemo(() => {
    if (!hasTags) return EMPTY_TIERED()
    return getReuseSuggestions(entry.artifact, entry.usages, controls, relationships, tagIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.artifact, hasTags, refreshKey])

  const visibleTotal = tiered.strong.length + tiered.related.length
  const excludedTotal = tiered.excluded.untaggedCount + tiered.excluded.broadCount

  // Mappings pagination
  const mappingTotal = entry.usages.length
  const mappingTotalPages = Math.ceil(mappingTotal / MAPPINGS_PAGE_SIZE)
  const mappingSafePage = Math.min(mappingPage, Math.max(mappingTotalPages - 1, 0))
  const mStart = mappingSafePage * MAPPINGS_PAGE_SIZE
  const mEnd = Math.min(mStart + MAPPINGS_PAGE_SIZE, mappingTotal)
  const visibleMappings = entry.usages.slice(mStart, mEnd)

  // Strong tier pagination
  const strongTotal = tiered.strong.length
  const strongTotalPages = Math.ceil(strongTotal / SUGGESTION_TIER_PAGE_SIZE)
  const strongSafePage = Math.min(strongPage, Math.max(strongTotalPages - 1, 0))
  const sStart = strongSafePage * SUGGESTION_TIER_PAGE_SIZE
  const sEnd = Math.min(sStart + SUGGESTION_TIER_PAGE_SIZE, strongTotal)
  const visibleStrong = tiered.strong.slice(sStart, sEnd)

  // Related tier pagination
  const relatedTotal = tiered.related.length
  const relatedTotalPages = Math.ceil(relatedTotal / SUGGESTION_TIER_PAGE_SIZE)
  const relatedSafePage = Math.min(relatedPage, Math.max(relatedTotalPages - 1, 0))
  const rStart = relatedSafePage * SUGGESTION_TIER_PAGE_SIZE
  const rEnd = Math.min(rStart + SUGGESTION_TIER_PAGE_SIZE, relatedTotal)
  const visibleRelated = tiered.related.slice(rStart, rEnd)

  const renderSuggestion = (s) => (
    <li key={`${s.controlId}-${s.objectiveId}`} className="reuse-suggestion-item">
      <button
        type="button"
        className="reuse-suggestion-add"
        title={`Add "${entry.artifact}" to ${s.controlId} [${s.objectiveId}]`}
        onClick={() => onAcceptSuggestion(entry.artifact, s.controlId, s.objectiveId, visibleTotal)}
      >
        +
      </button>
      <div className="reuse-suggestion-detail">
        <Link
          to={`/controls/${encodeURIComponent(s.controlId)}#objective-${s.objectiveId}`}
          className="reuse-suggestion-link"
        >
          <span className="mono">{s.controlId}</span>
          {' '}[{s.objectiveId}]
          {s.objectiveText && <span className="muted"> — {s.objectiveText}</span>}
        </Link>
        {s.reason && (
          <span className="reuse-suggestion-reason">{s.reason}</span>
        )}
        {s.rationale && (
          <details className="reuse-suggestion-details">
            <summary>Details</summary>
            <span className="reuse-suggestion-reason-detail">{s.rationale}</span>
          </details>
        )}
      </div>
    </li>
  )

  return (
    <tr className="am-expanded-row">
      <td colSpan={5} className="am-expanded-cell">
        <div className="am-expanded-body">

          {/* ── Column 1: Evidence Tags ── */}
          <div className="am-exp-section">
            <div className="am-exp-label">Evidence Tags</div>
            {hasTags ? (
              <div className="am-exp-tag-row">
                <ArtifactTagChipList tagIds={tagIds} />
              </div>
            ) : (
              <>
                <p className="am-exp-empty">No evidence tags added yet.</p>
                <p className="artifact-untagged-hint">Add evidence tags to unlock reuse opportunities.</p>
              </>
            )}
            <div className="am-exp-actions">
              <button
                type="button"
                className="am-exp-action-btn"
                onClick={() => onOpenTagPicker(entry.artifact)}
              >
                {hasTags ? 'Edit tags' : 'Add tags'}
              </button>
            </div>
          </div>

          {/* ── Column 2: Current Mappings ── */}
          <div className="am-exp-section">
            <div className="am-exp-label">
              Current Mappings
              {mappingTotal > 0 && <span className="am-exp-count">{mappingTotal}</span>}
            </div>
            {mappingTotal === 0 ? (
              <p className="am-exp-empty">Not mapped to any objectives.</p>
            ) : (
              <>
                <ul className="am-exp-usages">
                  {visibleMappings.map((u, i) => (
                    <li key={mStart + i} className="am-exp-usage">
                      <Link
                        to={`/controls/${encodeURIComponent(u.controlId)}#objective-${u.objectiveId}`}
                        className="am-exp-usage-link"
                      >
                        <span className="mono">{u.controlId}</span>
                        {u.objectiveId && <span className="am-exp-obj"> [{u.objectiveId}]</span>}
                        {u.objectiveText && <span className="muted"> — {u.objectiveText}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
                {mappingTotalPages > 1 && (
                  <div className="am-exp-pagination">
                    <button
                      type="button"
                      className="am-exp-page-btn"
                      disabled={mappingSafePage === 0}
                      onClick={() => setMappingPage(mappingSafePage - 1)}
                    >
                      ‹ Prev
                    </button>
                    <span className="am-exp-page-info">
                      {mStart + 1}–{mEnd} of {mappingTotal}
                    </span>
                    <button
                      type="button"
                      className="am-exp-page-btn"
                      disabled={mappingSafePage >= mappingTotalPages - 1}
                      onClick={() => setMappingPage(mappingSafePage + 1)}
                    >
                      Next ›
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Column 3: Suggested Reuse ── */}
          <div className="am-exp-section am-exp-section--last">
            <div className="am-exp-label">
              Suggested Reuse
              {visibleTotal > 0 && (
                <span className="am-exp-count">
                  Strong {tiered.strong.length} · Related {tiered.related.length}
                </span>
              )}
            </div>
            {!hasTags ? (
              <p className="am-exp-empty">Add evidence tags to see reuse opportunities.</p>
            ) : visibleTotal === 0 ? (
              <>
                <p className="am-exp-empty">No tagged artifact suggestions found. Add evidence tags to artifacts to improve reuse recommendations.</p>
                {excludedTotal > 0 && (
                  <p className="reuse-tag-excluded-note">
                    {excludedTotal} broad or untagged candidate{excludedTotal !== 1 ? 's' : ''} excluded from suggestions.
                  </p>
                )}
              </>
            ) : (
              <>
                {/* Strong Suggestions — expanded by default */}
                <p className="reuse-tier-heading">Strong Suggestions{tiered.strong.length > 0 ? ` (${tiered.strong.length})` : ''}</p>
                {tiered.strong.length === 0 ? (
                  <p className="am-exp-empty">No strong suggestions found.</p>
                ) : (
                  <>
                    <ul className="reuse-suggestions-list">{visibleStrong.map(renderSuggestion)}</ul>
                    {strongTotalPages > 1 && (
                      <div className="am-exp-pagination">
                        <button
                          type="button"
                          className="am-exp-page-btn"
                          disabled={strongSafePage === 0}
                          onClick={() => setStrongPage(strongSafePage - 1)}
                        >‹ Prev</button>
                        <span className="am-exp-page-info">{sStart + 1}–{sEnd} of {strongTotal}</span>
                        <button
                          type="button"
                          className="am-exp-page-btn"
                          disabled={strongSafePage >= strongTotalPages - 1}
                          onClick={() => setStrongPage(strongSafePage + 1)}
                        >Next ›</button>
                      </div>
                    )}
                  </>
                )}

                {/* Related Candidates — collapsed by default */}
                {tiered.related.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="reuse-tier-heading reuse-tier-heading--toggle"
                      onClick={() => setRelatedExpanded((v) => !v)}
                      aria-expanded={relatedExpanded}
                    >
                      Related Candidates ({relatedTotal})
                      <span className="reuse-tier-chevron" aria-hidden="true">{relatedExpanded ? ' ▾' : ' ▸'}</span>
                    </button>
                    {relatedExpanded && (
                      <>
                        <ul className="reuse-suggestions-list">{visibleRelated.map(renderSuggestion)}</ul>
                        {relatedTotalPages > 1 && (
                          <div className="am-exp-pagination">
                            <button
                              type="button"
                              className="am-exp-page-btn"
                              disabled={relatedSafePage === 0}
                              onClick={() => setRelatedPage(relatedSafePage - 1)}
                            >‹ Prev</button>
                            <span className="am-exp-page-info">{rStart + 1}–{rEnd} of {relatedTotal}</span>
                            <button
                              type="button"
                              className="am-exp-page-btn"
                              disabled={relatedSafePage >= relatedTotalPages - 1}
                              onClick={() => setRelatedPage(relatedSafePage + 1)}
                            >Next ›</button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {tiered.excluded.cappedCount > 0 && (
                  <p className="reuse-tag-excluded-note">
                    Additional lower-ranked candidates were hidden to keep suggestions focused.
                  </p>
                )}
                {excludedTotal > 0 && (
                  <p className="reuse-tag-excluded-note">
                    {excludedTotal} broad or untagged candidate{excludedTotal !== 1 ? 's' : ''} excluded from suggestions.
                  </p>
                )}
              </>
            )}
          </div>

        </div>
      </td>
    </tr>
  )
}

// -------------------------------------------------------------------------
// Filter modal
// -------------------------------------------------------------------------
const STATUS_FILTER_OPTIONS = [
  { key: 'mapped',    label: 'Mapped' },
  { key: 'tagged',    label: 'Tagged' },
  { key: 'untagged',  label: 'Untagged' },
]

function ArtifactFilterModal({ onClose, statusFilters, onToggleStatus, tagFilter, onToggleTag, availableTagIds, onClearAll }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      className="am-filter-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="am-filter-modal" role="dialog" aria-modal="true" aria-label="Filters">
        <div className="am-filter-modal-header">
          <span className="am-filter-modal-title">Filters</span>
          <button className="am-filter-modal-close" onClick={onClose} aria-label="Close filters">✕</button>
        </div>

        <div className="am-filter-modal-body">
          <section className="am-filter-modal-section">
            <div className="am-filter-modal-section-title">Status</div>
            <div className="am-filter-modal-pills">
              {STATUS_FILTER_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`am-filter-pill${statusFilters.has(key) ? ' am-filter-pill--active' : ''}`}
                  onClick={() => onToggleStatus(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {availableTagIds.length > 0 && (
            <section className="am-filter-modal-section am-filter-modal-section--tags">
              <div className="am-filter-modal-section-title">Evidence Tags</div>
              <div className="am-filter-modal-pills">
                {availableTagIds.map((tagId) => (
                  <button
                    key={tagId}
                    type="button"
                    className={`am-filter-pill${tagFilter.has(tagId) ? ' am-filter-pill--active' : ''}`}
                    onClick={() => onToggleTag(tagId)}
                  >
                    {TAG_LABEL[tagId] ?? tagId}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="am-filter-modal-footer">
          <button type="button" className="am-filter-modal-clear" onClick={onClearAll}>
            Clear all filters
          </button>
          <button type="button" className="am-filter-modal-done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------
function ArtifactMap() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilters, setStatusFilters] = useState(() => new Set())  // Set<'mapped'|'tagged'|'untagged'>
  const [tagFilter, setTagFilter] = useState(() => new Set())          // Set<tagId>
  const [filterModalOpen, setFilterModalOpen] = useState(false)

  // Unified sort state — single object avoids nested-setState race
  const [sortConfig, setSortConfig] = useState({ key: 'mappings', dir: 'desc' })
  const { key: sortKey, dir: sortDir } = sortConfig

  const [expandedArtifact, setExpandedArtifact] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [pickerArtifact, setPickerArtifact] = useState(null)
  const [modalKey, setModalKey] = useState(0)

  const handleSearchChange = (value) => {
    setSearch(value)
    setSearchParams(value ? { search: value } : {}, { replace: true })
  }

  const toggleRow = (artifactName) => {
    setExpandedArtifact((prev) => (prev === artifactName ? null : artifactName))
  }

  const openTagPicker = (artifactName) => {
    setPickerArtifact(findOrCreate(artifactName))
    setModalKey((k) => k + 1)
  }

  const acceptSuggestion = (artifactName, controlId, objectiveId) => {
    const existing = readObjectiveArtifacts(controlId, objectiveId)
    writeObjectiveArtifacts(controlId, objectiveId, [...existing, artifactName])
    setRefreshKey((k) => k + 1)
  }

  // Column sort toggle — single setState keeps key+dir in sync
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      }
      return { key, dir: key === 'name' ? 'asc' : 'desc' }
    })
  }

  // Status filter helpers (multi-select)
  const toggleStatusFilter = (key) => {
    setStatusFilters((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Tag filter helpers
  const toggleTagFilter = (tagId) => {
    setTagFilter((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  // -----------------------------------------------------------------------
  // Data pipeline
  // Registry is the source of truth for which artifacts exist.
  // buildArtifactIndex provides mapping (pool + objective) enrichment.
  // -----------------------------------------------------------------------

  // All artifacts ever registered — survives removal from objectives/pool
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const registryList = useMemo(() => listArtifacts(), [refreshKey])

  // Mapping data from controls (pool + objective assignments)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const index = useMemo(() => buildArtifactIndex(controls), [refreshKey])

  // Fast lookup: normalized name → index entry (for mapping enrichment)
  const indexByName = useMemo(() => {
    const m = new Map()
    for (const e of index) m.set(e.artifact.toLowerCase(), e)
    return m
  }, [index])

  // Full artifact list: every registry artifact enriched with mapping data
  const allArtifacts = useMemo(
    () => registryList.map((rec) => {
      const entry = indexByName.get(rec.name.toLowerCase())
      return {
        artifact: entry?.artifact ?? rec.name,
        usages: entry?.usages ?? [],
      }
    }),
    [registryList, indexByName]
  )

  const allWithCategory = useMemo(
    () => allArtifacts.map((entry) => ({
      ...entry,
      category: inferKillChainCategory(entry.usages.map((u) => u.controlId)),
    })),
    [allArtifacts]
  )

  const term = search.trim().toLowerCase()

  const searched = useMemo(
    () => allWithCategory.filter((entry) => {
      if (!term) return true
      if (entry.artifact.toLowerCase().includes(term)) return true
      return entry.usages.some(
        (u) =>
          u.controlId.toLowerCase().includes(term) ||
          u.controlTitle.toLowerCase().includes(term) ||
          u.objectiveText.toLowerCase().includes(term)
      )
    }),
    [allWithCategory, term]
  )

  const availableCategories = useMemo(
    () => [...new Set(searched.map((e) => e.category))].sort(sortCategoryNames),
    [searched]
  )

  // Reset category filter if it disappears from available options
  if (categoryFilter !== 'all' && !availableCategories.includes(categoryFilter)) {
    setCategoryFilter('all')
  }

  const categoryFiltered = useMemo(
    () => categoryFilter === 'all' ? searched : searched.filter((e) => e.category === categoryFilter),
    [searched, categoryFilter]
  )

  // Strip Evidence Pool usages; all registry artifacts remain visible regardless of mapping count
  const displayFiltered = useMemo(
    () => categoryFiltered.map((entry) => ({
      ...entry,
      usages: entry.usages.filter((u) => u.location !== 'Evidence Pool'),
    })),
    [categoryFiltered]
  )

  // Status filter — OR within selected set; empty set = show all
  const statusFiltered = useMemo(
    () => {
      if (statusFilters.size === 0) return displayFiltered
      return displayFiltered.filter((entry) => {
        const s = getArtifactStatus(entry)
        return statusFilters.has(s.key)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayFiltered, statusFilters, refreshKey]
  )

  // Tag filter — OR within selected tags
  const tagFiltered = useMemo(
    () => {
      if (tagFilter.size === 0) return statusFiltered
      return statusFiltered.filter((entry) => {
        const rec = findByName(entry.artifact)
        const artTags = rec?.tags ?? []
        return artTags.some((t) => tagFilter.has(t))
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusFiltered, tagFilter, refreshKey]
  )

  // Collect unique tag IDs present across all displayFiltered artifacts for the filter dropdown
  const availableTagIds = useMemo(() => {
    const ids = new Set()
    for (const entry of displayFiltered) {
      const rec = findByName(entry.artifact)
      for (const t of rec?.tags ?? []) ids.add(t)
    }
    return [...ids].sort((a, b) => (TAG_LABEL[a] ?? a).localeCompare(TAG_LABEL[b] ?? b))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayFiltered, refreshKey])

  // Pre-compute reuse counts for sortable Reuse column
  const reuseCountMap = useMemo(() => {
    const map = new Map()
    for (const entry of tagFiltered) {
      const rec = findByName(entry.artifact)
      const artTagIds = rec?.tags ?? []
      if (artTagIds.length === 0) {
        map.set(entry.artifact, 0)
      } else {
        const tiered = getReuseSuggestions(entry.artifact, entry.usages, controls, relationships, artTagIds)
        map.set(entry.artifact, tiered.strong.length + tiered.related.length)
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagFiltered, refreshKey])

  // Sort
  const finalList = useMemo(() => {
    const multiplier = sortDir === 'asc' ? 1 : -1
    return [...tagFiltered].sort((a, b) => {
      if (sortKey === 'name') {
        return multiplier * a.artifact.toLowerCase().localeCompare(b.artifact.toLowerCase())
      }
      if (sortKey === 'mappings') {
        return multiplier * (a.usages.length - b.usages.length)
      }
      if (sortKey === 'reuse') {
        const ra = reuseCountMap.get(a.artifact) ?? 0
        const rb = reuseCountMap.get(b.artifact) ?? 0
        return multiplier * (ra - rb)
      }
      return 0
    })
  }, [tagFiltered, sortKey, sortDir, reuseCountMap])

  // Stats — mutually exclusive: Mapped > Tagged > Untagged
  const totalArtifacts = displayFiltered.length
  const mappedCount = useMemo(
    () => displayFiltered.filter((e) => {
      const rec = findByName(e.artifact)
      return (rec?.tags ?? []).length > 0 && e.usages.length > 0
    }).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayFiltered, refreshKey]
  )
  const taggedCount = useMemo(
    () => displayFiltered.filter((e) => {
      const rec = findByName(e.artifact)
      return (rec?.tags ?? []).length > 0 && e.usages.length === 0
    }).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayFiltered, refreshKey]
  )
  const untaggedCount = useMemo(
    () => displayFiltered.filter((e) => (findByName(e.artifact)?.tags ?? []).length === 0).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayFiltered, refreshKey]
  )

  const hasModalFilters = statusFilters.size > 0 || tagFilter.size > 0
  const hasActiveFilters = categoryFilter !== 'all' || hasModalFilters || term
  const modalFilterCount = statusFilters.size + tagFilter.size

  const clearModalFilters = () => {
    setStatusFilters(new Set())
    setTagFilter(new Set())
  }

  const clearAllFilters = () => {
    handleSearchChange('')
    setCategoryFilter('all')
    clearModalFilters()
  }

  return (
    <div className="am-page">
      {/* Header */}
      <div className="am-header">
        <div className="am-header-title">
          <h1 className="am-title">Documented Artifacts</h1>
          <p className="am-subtitle">Manage documented project artifacts, evidence tags, mappings, and reuse opportunities.</p>
        </div>
        <div className="am-stat-row">
          <div className="am-stat">
            <span className="am-stat-value">{totalArtifacts}</span>
            <span className="am-stat-label">Total</span>
          </div>
          <div className="am-stat">
            <span className="am-stat-value am-stat-value--mapped">{mappedCount}</span>
            <span className="am-stat-label">Mapped</span>
          </div>
          <div className="am-stat">
            <span className="am-stat-value am-stat-value--tagged">{taggedCount}</span>
            <span className="am-stat-label">Tagged</span>
          </div>
          <div className="am-stat">
            <span className="am-stat-value am-stat-value--untagged">{untaggedCount}</span>
            <span className="am-stat-label">Untagged</span>
          </div>
        </div>
      </div>

      {/* 2-column workspace */}
      <div className="am-workspace">

        {/* ── Left filter rail ── */}
        <aside className="am-filter-rail">
          <div className="am-rail-section">
            <div className="am-rail-heading">Category</div>
            <button
              type="button"
              className={`am-rail-item${categoryFilter === 'all' ? ' am-rail-item--active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              All
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`am-rail-item${categoryFilter === cat ? ' am-rail-item--active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

        </aside>

        {/* ── Main table ── */}
        <div className="am-main">

          {/* Toolbar row */}
          <div className="am-toolbar">
            <input
              type="text"
              className="am-search"
              placeholder="Search artifacts, controls, objectives…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />

            {/* Filters button — opens modal */}
            <button
              type="button"
              className={`am-filters-btn${hasModalFilters ? ' am-filters-btn--active' : ''}`}
              onClick={() => setFilterModalOpen(true)}
            >
              Filters{modalFilterCount > 0 ? ` (${modalFilterCount})` : ''}
            </button>
          </div>

          {/* Active filter chips — status + tag */}
          {hasModalFilters && (
            <div className="am-active-tag-chips">
              {[...statusFilters].map((key) => {
                const opt = STATUS_FILTER_OPTIONS.find((o) => o.key === key)
                return (
                  <span key={key} className="am-active-tag-chip">
                    {opt?.label ?? key}
                    <button
                      type="button"
                      className="am-active-tag-chip-remove"
                      onClick={() => toggleStatusFilter(key)}
                      aria-label={`Remove status filter: ${opt?.label ?? key}`}
                    >
                      ×
                    </button>
                  </span>
                )
              })}
              {[...tagFilter].map((tagId) => (
                <span key={tagId} className="am-active-tag-chip">
                  {TAG_LABEL[tagId] ?? tagId}
                  <button
                    type="button"
                    className="am-active-tag-chip-remove"
                    onClick={() => toggleTagFilter(tagId)}
                    aria-label={`Remove tag filter: ${TAG_LABEL[tagId] ?? tagId}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="am-result-bar">
            <span className="am-result-count">
              {finalList.length} of {registryList.length} artifact{registryList.length !== 1 ? 's' : ''}
            </span>
            {hasActiveFilters && (
              <button type="button" className="am-clear-filters" onClick={clearAllFilters}>
                Clear filters
              </button>
            )}
          </div>

          {registryList.length === 0 ? (
            <p className="muted am-empty">No artifacts documented yet. Add artifacts to control objectives or the evidence pool to see them here.</p>
          ) : finalList.length === 0 ? (
            <p className="muted am-empty">
              No artifacts match the current filters.{' '}
              {hasActiveFilters && (
                <button type="button" className="am-clear-filters" onClick={clearAllFilters}>Clear filters</button>
              )}
            </p>
          ) : (
            <div className="am-table-wrap">
              <table className="am-table">
                <thead>
                  <tr>
                    <th className="am-th am-th-name">
                      <button type="button" className="am-th-sort-btn" onClick={() => handleSort('name')} title="Sort by name">
                        Artifact <SortIcon active={sortKey === 'name'} dir={sortDir} />
                      </button>
                    </th>
                    <th className="am-th am-th-tags">Evidence Tags</th>
                    <th className="am-th am-th-mappings">
                      <button type="button" className="am-th-sort-btn" onClick={() => handleSort('mappings')} title="Sort by mapped controls">
                        Mapped <SortIcon active={sortKey === 'mappings'} dir={sortDir} />
                      </button>
                    </th>
                    <th className="am-th am-th-reuse">
                      <button type="button" className="am-th-sort-btn" onClick={() => handleSort('reuse')} title="Sort by reuse opportunities">
                        Reuse <SortIcon active={sortKey === 'reuse'} dir={sortDir} />
                      </button>
                    </th>
                    <th className="am-th am-th-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {finalList.map((entry) => {
                    const status = getArtifactStatus(entry)
                    const isExpanded = entry.artifact === expandedArtifact
                    const isUntagged = status.key === 'untagged'
                    const rec = findByName(entry.artifact)
                    const tagIds = rec?.tags ?? []
                    const reuseCount = reuseCountMap.get(entry.artifact) ?? 0
                    return (
                      <>
                        <tr
                          key={entry.artifact}
                          className={[
                            'am-row',
                            isExpanded ? 'am-row--expanded' : '',
                            isUntagged ? 'am-row--untagged' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={() => toggleRow(entry.artifact)}
                          aria-expanded={isExpanded}
                        >
                          <td className="am-td am-td-name">
                            <span className="am-row-chevron" aria-hidden="true">
                              {isExpanded ? '▾' : '▸'}
                            </span>
                            <span className="am-artifact-name" title={entry.artifact}>
                              {entry.artifact}
                            </span>
                          </td>
                          <td className="am-td am-td-tags">
                            {tagIds.length > 0 ? (
                              <ArtifactTagChipList tagIds={tagIds} />
                            ) : (
                              <span className="am-no-tags">—</span>
                            )}
                          </td>
                          <td className="am-td am-td-mappings">
                            <span className="am-mapping-count">{entry.usages.length}</span>
                          </td>
                          <td className="am-td am-td-reuse">
                            {isUntagged ? (
                              <span className="am-reuse-count am-reuse-count--none">—</span>
                            ) : (
                              <span className={`am-reuse-count${reuseCount > 0 ? ' am-reuse-count--has' : ''}`}>
                                {reuseCount}
                              </span>
                            )}
                          </td>
                          <td className="am-td am-td-status">
                            <span className={status.cls}>{status.label}</span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <ArtifactExpandedRow
                            key={`${entry.artifact}-detail`}
                            entry={entry}
                            onOpenTagPicker={openTagPicker}
                            onAcceptSuggestion={acceptSuggestion}
                            refreshKey={refreshKey}
                          />
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {filterModalOpen && (
        <ArtifactFilterModal
          onClose={() => setFilterModalOpen(false)}
          statusFilters={statusFilters}
          onToggleStatus={toggleStatusFilter}
          tagFilter={tagFilter}
          onToggleTag={toggleTagFilter}
          availableTagIds={availableTagIds}
          onClearAll={clearModalFilters}
        />
      )}

      {pickerArtifact && (
        <EvidenceTagPickerModal
          key={modalKey}
          isOpen={true}
          artifact={pickerArtifact}
          initialSelectedTagIds={pickerArtifact.tags ?? []}
          onCancel={() => setPickerArtifact(null)}
          onSave={(tagIds) => {
            updateArtifactTags(pickerArtifact.id, tagIds)
            setPickerArtifact(null)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}
    </div>
  )
}

export default ArtifactMap
