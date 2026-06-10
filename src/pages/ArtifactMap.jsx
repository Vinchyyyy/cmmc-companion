import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import controls from '../data/controls/index.js'
import { buildArtifactIndex } from '../utils/artifactIndex.js'
import { inferKillChainCategory } from '../utils/killChainLookup.js'

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

  const handleSearchChange = (value) => {
    setSearch(value)
    setSearchParams(value ? { search: value } : {}, { replace: true })
  }

  // Build artifact index once, then attach inferred kill chain category to each entry
  const index = useMemo(() => buildArtifactIndex(controls), [])

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

  // Reset category filter if it is no longer present after a search change
  useEffect(() => {
    if (categoryFilter !== 'all' && !availableCategories.includes(categoryFilter)) {
      setCategoryFilter('all')
    }
  }, [availableCategories.join(','), categoryFilter]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Auto-expand when search/filter narrows to exactly one artifact
  const singleResult = displayFiltered.length === 1 ? displayFiltered[0].artifact : null
  useEffect(() => {
    if (singleResult) {
      setExpandedSet((prev) => {
        if (prev.has(singleResult)) return prev
        const next = new Set(prev)
        next.add(singleResult)
        return next
      })
    }
  }, [singleResult])

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
      <p className="muted">
        See where artifacts and evidence references are reused across controls and objectives.
      </p>

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
                            <span className="artifact-card-name">{entry.artifact}</span>
                            <span className="artifact-card-count">
                              ({entry.usages.length})
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="artifact-card-body">
                              <p className="muted" style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
                                Used in {entry.usages.length} location{entry.usages.length !== 1 ? 's' : ''}
                              </p>
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
    </div>
  )
}

export default ArtifactMap
