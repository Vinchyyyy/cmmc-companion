import { useState, useMemo } from 'react'
import { getObjectiveExpectedTagIds, classifyReuseOpportunity } from '../utils/evidenceTagMatch.js'
import InfoPanel from '../components/InfoPanel.jsx'
import { Link, useSearchParams } from 'react-router-dom'
import controls from '../data/controls/index.js'
import relationships from '../data/relationships/index.js'
import { buildArtifactIndex } from '../utils/artifactIndex.js'
import { inferKillChainCategory } from '../utils/killChainLookup.js'
import { readObjectiveArtifacts, writeObjectiveArtifacts } from '../utils/objectiveArtifacts.js'
import { findByName, findOrCreate, updateArtifactTags } from '../utils/artifactRegistry.js'
import EvidenceTagPickerModal from '../components/EvidenceTagPickerModal.jsx'
import ArtifactTagChipList from '../components/ArtifactTagChipList.jsx'

const SUGGESTION_PAGE_SIZE = 5

function formatControlNumber(controlId) {
  // AC.L1-3.1.1 → 3.1.1
  const match = controlId.match(/[\d.]+$/)
  return match ? match[0] : controlId
}

// Sort comparator for artifact entries
function makeArtifactSorter(sort) {
  return (a, b) => {
    if (sort === 'most') return b.usages.length - a.usages.length
    if (sort === 'least') return a.usages.length - b.usages.length
    if (sort === 'az') return a.artifact.toLowerCase().localeCompare(b.artifact.toLowerCase())
    if (sort === 'za') return b.artifact.toLowerCase().localeCompare(a.artifact.toLowerCase())
    return 0
  }
}

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
// Scoring helpers for reuse suggestions
// -------------------------------------------------------------------------
function relConfScore(confidence) {
  if (confidence === 'high') return 100
  if (confidence === 'medium') return 65
  if (confidence === 'low') return 30
  return 0
}

function objEvidConfScore(evidenceConfidence) {
  if (evidenceConfidence === 'high') return 100
  if (evidenceConfidence === 'medium') return 60
  if (evidenceConfidence === 'low') return 30
  return 0
}

function evidClassScore(evidenceClass) {
  if (evidenceClass === 'artifact') return 100
  if (evidenceClass === 'mixed') return 60
  return 0
}

function relTypeScore(relationshipType) {
  if (relationshipType === 'prerequisite') return 100
  if (relationshipType === 'supports' || relationshipType === 'supported-by') return 80
  return 50
}

function computeSuggestionScore(rel, obj) {
  return (
    relConfScore(rel.confidence) * 0.40 +
    objEvidConfScore(obj.evidenceConfidence) * 0.30 +
    evidClassScore(obj.evidenceClass) * 0.20 +
    relTypeScore(rel.relationshipType) * 0.10
  )
}

// -------------------------------------------------------------------------
// Relationship-driven reuse suggestions
//
// Steps:
//   1. Source controls = controls already using this artifact at objective level.
//   2. Related controls = bidirectional relationship partners of source controls.
//      Only evidence_reuse relationships are considered; interview_reuse,
//      demonstration_reuse, reference, and missing assessmentCategory are excluded.
//      The first-seen relationship entry per related control is kept as the reason.
//   3. Candidate objectives = all objectives of related controls.
//   4. Filter: skip objectives where artifact is already assigned (case-insensitive).
//   5. Deduplicate by controlId+objectiveId; keep first reason.
//   6. Score each suggestion and sort: score desc → relConf desc → objEvidConf desc
//      → controlId asc → objectiveId asc.
//   Returns all matching suggestions (no cap — caller handles pagination).
// -------------------------------------------------------------------------
function getReuseSuggestions(artifactName, usages, allControls, allRelationships, artifactTagIds = []) {
  const artifactLower = artifactName.toLowerCase()

  // Source control IDs — only objective-level usages count (not Evidence Pool)
  const sourceControlIds = new Set(
    usages
      .filter((u) => u.location === 'Objective Artifact' && u.objectiveId)
      .map((u) => u.controlId)
  )

  if (sourceControlIds.size === 0) return []

  // Map related control ID → first relationship metadata (bidirectional traversal).
  // Only operational relationships; reference and missing-category are excluded.
  const relatedMap = new Map()
  for (const rel of allRelationships) {
    if (rel.assessmentCategory !== 'evidence_reuse') continue

    const srcIsSource = sourceControlIds.has(rel.sourceControl)
    const tgtIsSource = sourceControlIds.has(rel.targetControl)
    const reason =
      rel.assessorRationale ||
      rel.reasoning ||
      `Related via ${rel.relationshipType}`

    if (srcIsSource && !sourceControlIds.has(rel.targetControl) && !relatedMap.has(rel.targetControl)) {
      relatedMap.set(rel.targetControl, { reason, confidence: rel.confidence, relationshipType: rel.relationshipType })
    }
    if (tgtIsSource && !sourceControlIds.has(rel.sourceControl) && !relatedMap.has(rel.sourceControl)) {
      relatedMap.set(rel.sourceControl, { reason, confidence: rel.confidence, relationshipType: rel.relationshipType })
    }
  }

  if (relatedMap.size === 0) return []

  const suggestions = []
  const seen = new Set()

  for (const control of allControls) {
    if (!relatedMap.has(control.id)) continue
    const rel = relatedMap.get(control.id)

    for (const obj of (control.objectives ?? [])) {
      const ec = obj.evidenceClass
      if (ec !== 'artifact' && ec !== 'mixed') continue

      const key = `${control.id}-${obj.id}`
      if (seen.has(key)) continue
      seen.add(key)

      // Skip if artifact already assigned to this objective
      const existing = readObjectiveArtifacts(control.id, obj.id)
      if (existing.some((a) => a.toLowerCase() === artifactLower)) continue

      const expectedTags = getObjectiveExpectedTagIds(obj)
      const tagMatch = classifyReuseOpportunity({ artifactTagIds, expectedTags })

      suggestions.push({
        controlId: control.id,
        controlTitle: control.title,
        objectiveId: obj.id,
        objectiveText: obj.text || '',
        reason: rel.reason,
        _score: computeSuggestionScore(rel, obj),
        _relConf: relConfScore(rel.confidence),
        _objEvidConf: objEvidConfScore(obj.evidenceConfidence),
        _tagTier: tagMatch.tier,
      })
    }
  }

  suggestions.sort((a, b) => {
    if (a._tagTier !== b._tagTier) return a._tagTier - b._tagTier
    if (b._score !== a._score) return b._score - a._score
    if (b._relConf !== a._relConf) return b._relConf - a._relConf
    if (b._objEvidConf !== a._objEvidConf) return b._objEvidConf - a._objEvidConf
    const cmp = a.controlId.localeCompare(b.controlId)
    if (cmp !== 0) return cmp
    return a.objectiveId.localeCompare(b.objectiveId)
  })

  return suggestions
}

function ArtifactMap() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [reusedOnly, setReusedOnly] = useState(false)
  const [sort, setSort] = useState('most')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Category-level: expanded set. Empty = all categories collapsed (default).
  const [expandedCategories, setExpandedCategories] = useState(() => new Set())
  // Artifact-level: expanded set. Empty = all artifacts collapsed (default).
  const [expandedSet, setExpandedSet] = useState(() => new Set())
  // Tracks the artifact last auto-expanded when results narrowed to one, so the
  // auto-expand fires once per transition without re-expanding a manual collapse.
  const [autoExpandedFor, setAutoExpandedFor] = useState(null)
  // Suggestion section: expanded set per artifact name.
  const [expandedSuggestions, setExpandedSuggestions] = useState(() => new Set())
  // Current suggestion page (0-based) keyed by artifact name.
  const [reuseSuggestionPages, setReuseSuggestionPages] = useState({})

  // Incremented after accepting a suggestion or saving tags to force re-render.
  const [refreshKey, setRefreshKey] = useState(0)

  // Artifact record currently open in the tag picker modal (null = closed).
  const [pickerArtifact, setPickerArtifact] = useState(null)
  // Incremented each time the picker opens so EvidenceTagPickerModal remounts
  // with fresh state (even when the same artifact is reopened after a cancel).
  const [modalKey, setModalKey] = useState(0)

  const handleSearchChange = (value) => {
    setSearch(value)
    setSearchParams(value ? { search: value } : {}, { replace: true })
  }

  // Build artifact index; refreshKey as dep so accepting a suggestion
  // causes a fresh read from localStorage on the next render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const index = useMemo(() => buildArtifactIndex(controls), [refreshKey])

  const indexWithCategory = useMemo(
    () =>
      index.map((entry) => ({
        ...entry,
        category: inferKillChainCategory(entry.usages.map((u) => u.controlId)),
      })),
    [index]
  )

  const term = search.trim().toLowerCase()

  // Step 1 + 2: search and reused-only filters
  const filtered = indexWithCategory.filter((entry) => {
    if (reusedOnly && entry.usages.length < 2) return false
    if (!term) return true
    if (entry.artifact.toLowerCase().includes(term)) return true
    return entry.usages.some(
      (u) =>
        u.controlId.toLowerCase().includes(term) ||
        u.controlTitle.toLowerCase().includes(term) ||
        u.objectiveText.toLowerCase().includes(term)
    )
  })

  // Derive available category options from post-search/reused results
  const availableCategories = [...new Set(filtered.map((e) => e.category))]
    .sort(sortCategoryNames)

  // Reset category filter if it is no longer present after a search change.
  // Adjusted during render (React's recommended pattern for correcting state from
  // a derived value) rather than in an effect: the guard becomes false once the
  // filter is 'all', so the immediate re-render self-terminates with no extra
  // commit and no frame showing the now-invalid filter.
  if (categoryFilter !== 'all' && !availableCategories.includes(categoryFilter)) {
    setCategoryFilter('all')
  }

  // Step 3: category filter
  const categoryFiltered =
    categoryFilter === 'all'
      ? filtered
      : filtered.filter((entry) => entry.category === categoryFilter)

  // Step 4: strip Evidence Pool usages for display only.
  // Artifacts whose only usages are pool entries are dropped entirely.
  // The full index (including pool usages) is preserved for global suggestions
  // and future reuse recommendation logic.
  const displayFiltered = categoryFiltered
    .map((entry) => ({
      ...entry,
      usages: entry.usages.filter((u) => u.location !== 'Evidence Pool'),
    }))
    .filter((entry) => entry.usages.length > 0)

  // Stats — all derived from displayFiltered (objective usages only)
  const totalArtifacts = displayFiltered.length
  const reusedArtifacts = displayFiltered.filter((e) => e.usages.length > 1).length
  const singleUseArtifacts = displayFiltered.filter((e) => e.usages.length === 1).length
  const totalUsages = displayFiltered.reduce((sum, e) => sum + e.usages.length, 0)

  // Build groups: group by category, sort artifacts within, sort groups
  const cmp = makeArtifactSorter(sort)
  const groupMap = new Map()
  for (const entry of displayFiltered) {
    if (!groupMap.has(entry.category)) groupMap.set(entry.category, [])
    groupMap.get(entry.category).push(entry)
  }
  const groups = [...groupMap.entries()]
    .sort(([a], [b]) => sortCategoryNames(a, b))
    .map(([category, artifacts]) => ({
      category,
      artifacts: [...artifacts].sort(cmp),
      totalUsages: artifacts.reduce((s, e) => s + e.usages.length, 0),
    }))

  // Auto-expand when search/filter narrows to exactly one artifact.
  // Applied during render via a "previous value" guard (React's recommended
  // pattern for reacting to a derived-value change) instead of an effect. It
  // fires once each time the single result changes — including re-entering the
  // same artifact after the result set widened and narrowed again — and leaves
  // the card collapsible afterward, matching the prior effect's behavior.
  const singleResult = displayFiltered.length === 1 ? displayFiltered[0].artifact : null
  if (singleResult && singleResult !== autoExpandedFor) {
    setAutoExpandedFor(singleResult)
    setExpandedSet((prev) => (prev.has(singleResult) ? prev : new Set(prev).add(singleResult)))
  } else if (!singleResult && autoExpandedFor !== null) {
    setAutoExpandedFor(null)
  }

  // Category accordion
  const toggleCategory = (cat) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Artifact accordion
  const toggleArtifact = (artifact) => {
    setExpandedSet((prev) => {
      const next = new Set(prev)
      if (next.has(artifact)) next.delete(artifact)
      else next.add(artifact)
      return next
    })
  }

  // Suggestion section accordion per artifact
  const toggleSuggestions = (artifact) => {
    setExpandedSuggestions((prev) => {
      const next = new Set(prev)
      if (next.has(artifact)) next.delete(artifact)
      else next.add(artifact)
      return next
    })
  }

  // Accept a reuse suggestion: add artifact to the objective, then refresh.
  // Page is clamped after the suggestion count drops by one.
  const acceptSuggestion = (artifactName, controlId, objectiveId, currentSuggestionCount) => {
    const existing = readObjectiveArtifacts(controlId, objectiveId)
    writeObjectiveArtifacts(controlId, objectiveId, [...existing, artifactName])
    // Clamp page: after removal the list shrinks by one, so recompute safe page.
    setReuseSuggestionPages((prev) => {
      const currentPage = prev[artifactName] ?? 0
      const newTotal = currentSuggestionCount - 1
      const newTotalPages = Math.ceil(newTotal / SUGGESTION_PAGE_SIZE)
      const safePage = Math.min(currentPage, Math.max(newTotalPages - 1, 0))
      return { ...prev, [artifactName]: safePage }
    })
    setRefreshKey((k) => k + 1)
  }

  // Expand All: open all categories + all visible artifact cards
  const expandAll = () => {
    setExpandedCategories(new Set(groups.map((g) => g.category)))
    setExpandedSet(new Set(displayFiltered.map((e) => e.artifact)))
  }

  // Collapse All: close all categories + all artifact cards
  const collapseAll = () => {
    setExpandedCategories(new Set())
    setExpandedSet(new Set())
  }

  return (
    <div className="page">
      <h1>Artifact Map</h1>
      <InfoPanel
        description="The Artifact Map provides a centralized view of evidence usage across the assessment. Use it to identify reused artifacts, discover evidence overlap, and understand how documentation supports multiple controls and objectives."
        bullets={[
          'Identify evidence reuse opportunities',
          'Find heavily used artifacts',
          'Discover supporting objectives',
          'Review assessment coverage',
          'Navigate directly to evidence locations',
        ]}
      />

      <div className="artifact-stats-grid">
        <div className="status-card">
          <span className="status-card-label">Total Artifacts</span>
          <span className="status-card-count">{totalArtifacts}</span>
        </div>
        <div className="status-card">
          <span className="status-card-label">Reused Artifacts</span>
          <span className="status-card-count">{reusedArtifacts}</span>
        </div>
        <div className="status-card">
          <span className="status-card-label">Single-Use Artifacts</span>
          <span className="status-card-count">{singleUseArtifacts}</span>
        </div>
        <div className="status-card">
          <span className="status-card-label">Total Usages</span>
          <span className="status-card-count">{totalUsages}</span>
        </div>
      </div>

      <div className="filter-row">
        <input
          type="text"
          placeholder="Search artifacts..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="most">Most connections</option>
          <option value="least">Least connections</option>
          <option value="az">Artifact name A–Z</option>
          <option value="za">Artifact name Z–A</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All categories</option>
          {availableCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label className="control-utility-toggle">
          <input
            type="checkbox"
            checked={reusedOnly}
            onChange={(e) => setReusedOnly(e.target.checked)}
          />
          Show only reused artifacts
        </label>
        <button type="button" onClick={expandAll}>Expand All</button>
        <button type="button" onClick={collapseAll}>Collapse All</button>
      </div>

      <p className="result-count">
        Showing {displayFiltered.length} of {index.length} artifact{index.length !== 1 ? 's' : ''}
      </p>

      {index.length === 0 ? (
        <p className="muted">No artifacts documented yet.</p>
      ) : displayFiltered.length === 0 ? (
        <p className="muted">No artifacts match your filters.</p>
      ) : (
        groups.map((group) => {
          const isCategoryOpen = expandedCategories.has(group.category)
          return (
            <div key={group.category} className="artifact-category-group">
              <button
                type="button"
                className="artifact-category-header"
                onClick={() => toggleCategory(group.category)}
                aria-expanded={isCategoryOpen}
              >
                <span className="artifact-category-chevron" aria-hidden="true">
                  {isCategoryOpen ? '▼' : '▶'}
                </span>
                <span className="artifact-category-name">{group.category}</span>
                <span className="artifact-category-meta">
                  ({group.artifacts.length} artifact{group.artifacts.length !== 1 ? 's' : ''}, {group.totalUsages} usage{group.totalUsages !== 1 ? 's' : ''})
                </span>
              </button>

              {isCategoryOpen && (
                <div className="artifact-category-body">
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {group.artifacts.map((entry) => {
                      const isExpanded = expandedSet.has(entry.artifact)
                      const artifactRecord = findByName(entry.artifact)
                      const artifactTagIds = artifactRecord?.tags ?? []
                      const hasTags = artifactTagIds.length > 0
                      const suggestions = isExpanded && hasTags
                        ? getReuseSuggestions(entry.artifact, entry.usages, controls, relationships, artifactTagIds)
                        : []
                      const suggestionsOpen = expandedSuggestions.has(entry.artifact)

                      return (
                        <li key={entry.artifact} className="card artifact-card">
                          <button
                            type="button"
                            className={`artifact-card-header${isExpanded ? ' artifact-card-header--open' : ''}`}
                            onClick={() => toggleArtifact(entry.artifact)}
                            aria-expanded={isExpanded}
                          >
                            <span className="artifact-card-chevron" aria-hidden="true">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            <span className={`artifact-card-name${hasTags ? '' : ' artifact-card-name--untagged'}`}>{entry.artifact}</span>
                            <span className="artifact-card-count">
                              ({entry.usages.length})
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="artifact-card-body">
                              <p className="muted" style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
                                Used in {entry.usages.length} location{entry.usages.length !== 1 ? 's' : ''}
                              </p>

                              {/* ------------------------------------------ */}
                              {/* Artifact evidence tags                        */}
                              {/* ------------------------------------------ */}
                              <div className="artifact-tag-editor">
                                <div className="artifact-tag-editor-header">Artifact evidence tags</div>
                                <ArtifactTagChipList tagIds={artifactTagIds} />
                                {!hasTags && (
                                  <p className="artifact-untagged-hint">
                                    Add evidence tags to see reuse opportunities.
                                  </p>
                                )}
                                <p className="artifact-tag-editor-helper">
                                  Tags describe what kind of evidence this artifact is — guidance only.
                                </p>
                                <div className="artifact-tag-editor-actions">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPickerArtifact(findOrCreate(entry.artifact))
                                      setModalKey((k) => k + 1)
                                    }}
                                  >
                                    {hasTags ? 'Edit evidence tags' : 'Add evidence tags'}
                                  </button>
                                </div>
                              </div>

                              {/* ------------------------------------------ */}
                              {/* Potential Reuse Opportunities                */}
                              {/* ------------------------------------------ */}
                              {suggestions.length > 0 ? (() => {
                                const page = reuseSuggestionPages[entry.artifact] ?? 0
                                const totalPages = Math.ceil(suggestions.length / SUGGESTION_PAGE_SIZE)
                                const safePage = Math.min(page, Math.max(totalPages - 1, 0))
                                const start = safePage * SUGGESTION_PAGE_SIZE
                                const end = Math.min(start + SUGGESTION_PAGE_SIZE, suggestions.length)
                                const visibleSuggestions = suggestions.slice(start, end)
                                const setPage = (p) =>
                                  setReuseSuggestionPages((prev) => ({ ...prev, [entry.artifact]: p }))

                                return (
                                  <div className="reuse-suggestions-wrap">
                                    <button
                                      type="button"
                                      className="reuse-suggestions-toggle"
                                      onClick={() => toggleSuggestions(entry.artifact)}
                                      aria-expanded={suggestionsOpen}
                                    >
                                      <span className="reuse-suggestions-chevron" aria-hidden="true">
                                        {suggestionsOpen ? '▼' : '▶'}
                                      </span>
                                      Potential Reuse Opportunities ({suggestions.length})
                                    </button>

                                    {suggestionsOpen && (
                                      <>
                                        <ul className="reuse-suggestions-list">
                                          {visibleSuggestions.map((s) => (
                                            <li key={`${s.controlId}-${s.objectiveId}`} className="reuse-suggestion-item">
                                              <button
                                                type="button"
                                                className="reuse-suggestion-add"
                                                title={`Add "${entry.artifact}" to ${s.controlId} [${s.objectiveId}]`}
                                                onClick={() => acceptSuggestion(entry.artifact, s.controlId, s.objectiveId, suggestions.length)}
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
                                                  {s.objectiveText && (
                                                    <span className="muted"> — {s.objectiveText}</span>
                                                  )}
                                                </Link>
                                                <span className="reuse-suggestion-reason"><span className="reuse-suggestion-reason-label">Rationale:</span> {s.reason}</span>
                                              </div>
                                            </li>
                                          ))}
                                        </ul>
                                        {totalPages > 1 && (
                                          <div className="reuse-suggestions-pagination">
                                            <button
                                              type="button"
                                              className="reuse-suggestions-page-btn"
                                              disabled={safePage === 0}
                                              onClick={() => setPage(safePage - 1)}
                                            >
                                              Previous
                                            </button>
                                            <span className="reuse-suggestions-page-info">
                                              Showing {start + 1}–{end} of {suggestions.length}
                                            </span>
                                            <button
                                              type="button"
                                              className="reuse-suggestions-page-btn"
                                              disabled={safePage >= totalPages - 1}
                                              onClick={() => setPage(safePage + 1)}
                                            >
                                              Next
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )
                              })() : null}

                              <ul className="artifact-card-usages">
                                {entry.usages.map((u, i) => (
                                  <li key={i} className="artifact-card-usage">
                                    <Link
                                      to={`/controls/${encodeURIComponent(u.controlId)}#objective-${u.objectiveId}`}
                                      title={`${u.controlId} — ${u.controlTitle}`}
                                    >
                                      {u.controlId} — {u.controlTitle}
                                      <br />
                                      <span className="muted">
                                        {formatControlNumber(u.controlId)} [{u.objectiveId}]{u.objectiveText ? ` — ${u.objectiveText}` : ''}
                                      </span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )
        })
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
