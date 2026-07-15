# Documented Artifacts — Page Inventory

Source: `src/pages/ArtifactMap.jsx`, `src/utils/artifactIndex.js`, `src/utils/artifactRegistry.js`,
`src/utils/evidenceTagMatch.js`, `src/utils/killChainLookup.js`, `src/data/killChains.js`,
`src/data/evidenceTags.js`, `src/components/EvidenceTagPickerModal.jsx`, `src/components/ArtifactTagChipList.jsx`.

## 1. Mapped vs. Reuse — what determines each

**Mapped = a real, existing assignment.** It has nothing to do with tags. An artifact is "mapped" to `N`
control/objective pairs whenever its name string appears in either:
- an objective's artifact list (`readObjectiveArtifacts(controlId, objectiveId)`), or
- a control's Evidence Pool (`readPool(controlId)`) — though Evidence Pool usages are filtered out before
  they reach the table (`displayFiltered` strips any usage with `location === 'Evidence Pool'`), so the
  visible Mapped count and the Current Mappings list only ever show **objective-level** assignments.

This is why `conditional-access-policy.pdf` can show `Mapped: 43` while `Untagged` and `Reuse: —`: mapping
is assigned directly (someone typed/selected that filename into an objective's artifact list), independent
of whether the artifact has ever been tagged.

**Reuse = a computed suggestion count, only available once tagged.** It is the number of *additional*
control/objective pairs the artifact is **not** currently mapped to, but which score well against its
evidence tags via `getReuseSuggestions()` (a compound scorer in `evidenceTagMatch.js`). Zero tags →
Reuse is not computed at all and the column shows `—`. This is enforced explicitly:
`if (!artifactTagIds || artifactTagIds.length === 0) return EMPTY_TIERED()`.

Mapped and Reuse are independent axes:
- Mapped can be non-zero with zero tags (as in the example).
- Reuse can be non-zero with zero mappings (a brand-new tagged artifact with no assignments yet, if it
  scores well against some objective).
- An objective the artifact is *already* mapped to is explicitly excluded from its own Reuse count
  (`existing.some(a => a.toLowerCase() === artifactLower)` skips it), so Reuse never double-counts a
  current mapping.

## 2. Suggested Reuse — what it shows once tags exist

Populated content is a two-tier list, each item a candidate control/objective the artifact is *not yet*
mapped to:

- **Strong Suggestions** (capped at 5, `STRONG_CAP = 5`) — expanded by default.
- **Related Candidates** (capped at 8, `RELATED_CAP = 8`) — collapsed by default behind a toggle button
  showing `Related Candidates (N)` with a chevron (`▸`/`▾`).

Each row (`renderSuggestion`) shows:
- A small `+` "add" button (title: `Add "{artifact}" to {controlId} [{objectiveId}]`) that immediately
  assigns the artifact to that objective via `writeObjectiveArtifacts` — no confirmation modal.
- A link (`mono` control ID + `[objectiveId]` + em-dash + objective text) that routes to
  `/controls/{controlId}#objective-{objectiveId}` (Control Detail, deep-linked to that objective).
- A one-line **reason** string from `summarizeReuseScore()`, e.g. `"Matched guide profile and primary
  expected tag: Firewall / Boundary Ruleset"`, `"Matched 2 evidence tags for this objective profile: …"`,
  or `"Matched Assessment Guide evidence object: …"` — human-readable justification of why it scored.
- An optional collapsed `<details>` "Details" disclosure for a longer `rationale` string (currently always
  empty string in this build — the field exists but nothing populates it yet, so this disclosure is
  effectively unused/hidden today).

Both tiers paginate independently at 5 items/page (`SUGGESTION_TIER_PAGE_SIZE = 5`) with `‹ Prev` / `Next ›`
controls and an `X–Y of Z` label — same pagination pattern as Current Mappings.

Empty/excluded-state footnotes appear below the lists:
- If nothing scored at all: `"No tagged artifact suggestions found. Add evidence tags to artifacts to
  improve reuse recommendations."`
- If items were hidden by the visible caps: `"Additional lower-ranked candidates were hidden to keep
  suggestions focused."`
- If candidates were excluded as broad/untagged matches: `"{N} broad or untagged candidate(s) excluded
  from suggestions."`

The scorer itself (not asked for in detail, but relevant context): it builds a tag profile for the
artifact and for each objective (`buildArtifactEvidenceProfile` / `buildObjectiveEvidenceProfile`), scores
using tag overlap plus proximity signals (same control / directly related control via an
`evidence_reuse`-category relationship / same control family) and Assessment Guide evidence-object
matches, then buckets into `strong` / `related` / `hidden` tiers. `hidden`-tier candidates are dropped
entirely from the list (only contribute to the excluded counters).

## 3. Status column — Total = Mapped + Tagged + Untagged (confirmed, strict partition)

Yes, mutually exclusive by explicit design comment in the code (`// Stats — mutually exclusive: Mapped >
Tagged > Untagged`). Per-artifact logic (`getArtifactStatus`):

```
no tags               → Untagged
has tags AND usages>0  → Mapped
has tags AND usages=0  → Tagged
```

So an artifact that is **both tagged and mapped** always displays as **Mapped** — tags do not surface as a
separate visible state once the artifact also has a mapping. "Tagged" specifically means "has evidence
tags but zero current objective mappings." Every artifact falls into exactly one of the three buckets, and
`Total` is always the sum of the three stat counters (all four numbers are independently computed over the
same `displayFiltered` list, so the identity Total = Mapped + Tagged + Untagged always holds for the
current filter set).

## 4. Clicking a control/objective line in Current Mappings

Yes — it's a `<Link>` to `/controls/{encodeURIComponent(controlId)}#objective-{objectiveId}`, i.e. it
navigates to Control Detail and deep-links/anchors to that specific objective. Same destination pattern is
used for Suggested Reuse links.

## 5. "Filters" button — separate from the category sidebar

Opens a modal (`ArtifactFilterModal`) with two independent filter groups, both **multi-select, OR-within-group**:

- **Status** — pill toggles for `Mapped` / `Tagged` / `Untagged` (same three states as the Status column).
  Any artifact matching *any* selected status passes.
- **Evidence Tags** — pill toggles, one per tag currently present on at least one *currently visible*
  artifact (`availableTagIds`, derived from `displayFiltered`, i.e. respects category/search but not the
  status/tag filters themselves — so the tag list doesn't shrink as you select tags). Section is hidden
  entirely if no artifact in the current view has any tags. Any artifact carrying *any* selected tag
  passes.

Selected filters render as removable chips (`×`) in an "active filter chips" row below the toolbar, and the
Filters button itself shows an active-state style plus a `(N)` count badge when any modal filter is set.
Footer has "Clear all filters" (clears both groups) and "Done" (just closes the modal — filters are live as
you toggle them, no separate apply step).

This is fully independent of and stacks with the left-sidebar **Category** filter (single-select) and the
free-text search box — all three narrow the same list simultaneously (search → category → status → tag →
sort, in that pipeline order).

## 6. Colored left-edge bar on rows

Two distinct things, not the same mechanism:

- **Amber/orange left border (`border-left: 3px solid var(--color-in-progress)`)** — applied only to
  `.am-row--untagged`, i.e. rows whose status is Untagged. This is a real, meaningful status indicator (a
  "needs attention" cue), not category color-coding and not a hover state. Tagged/Mapped rows never get a
  left border.
- **Background tint on hover or when expanded (`var(--color-accent-bg)`, the app's violet-tinted accent
  background)** — applied via `.am-row:hover` and `.am-row--expanded`. This is a full-row background wash,
  not a left border, and carries no semantic meaning beyond "currently hovered/open." The expanded row's
  chevron also switches to the accent color while open.

There is no separate category-color-coding mechanism on rows.

## 7. Full category list

Categories are **not a fixed static list with fixed counts** — they're the 19 "kill chain" names defined in
`src/data/killChains.js`, and the sidebar only ever shows categories that are actually present among the
*currently searched* artifacts (`availableCategories`, recomputed from `searched`, sorted alphabetically
with `Mixed` and `Uncategorized` always pinned last). Counts next to each name in your screenshot aren't
literal per-category badges in the code — the sidebar renders name only, no count. (If the redesign wants
per-category counts, that'd be new — currently absent.)

The 19 possible category names (from `KILL_CHAINS`, in `killChains.js` declaration order — not the sidebar's
alphabetical display order):

1. Documentation
2. Secure Architecture
3. Procedures / Rules of Behavior
4. Change Management
5. Incident Response Operations
6. Situational Awareness
7. Baseline Security Configurations
8. Centralized Controls Management
9. Identity & Access Management (IAM)
10. Maintenance
11. Vulnerability Management
12. Asset Management
13. Personnel Security
14. Network Security
15. Business Continuity
16. Encryption
17. Physical Security
18. Security Awareness Training
19. Internal Audit

Plus two synthetic buckets computed per-artifact by `inferKillChainCategory()`, based on the kill chain(s)
associated with the controls the artifact is mapped to:
- **`Mixed`** — the artifact's mapped controls tie across ≥2 kill chains (no single dominant category).
- **`Uncategorized`** — none of the artifact's mapped controls belong to any kill chain (or it has zero
  objective-level mappings at all).

So an artifact's category is derived, not manually assigned, and an unmapped/untagged artifact will always
land in `Uncategorized`.

## 8. Full tag taxonomy

17 categories (`EVIDENCE_TAG_CATEGORIES` in `src/data/evidenceTags.js`, in file-declared order — this *is*
the order tags render in the picker modal), 65 tags total:

**Governance & Documentation** (7): Policy Document, Procedure Document, System Security Plan, Plan of
Action & Milestones (POA&M), Configuration Standard, Signed Agreement, Management Review Record

**Identity & Account Management** (6): Identity / User Roster, Service Account Inventory, Privileged
Account Inventory, Account Lifecycle Record, Access Review Record, Access Authorization Record

**Authentication** (6): Authentication Configuration, MFA Configuration, Password Policy Configuration,
Account Lockout Configuration, Session Control Configuration, Credential Protection Evidence

**Authorization & Access Enforcement** (4): Role / Permission Matrix, Access Enforcement Configuration,
Remote Access Configuration, Device Access List

**Asset & Configuration Management** (6): Asset Inventory, Software Inventory, MDM Enrollment List,
Configuration Baseline Record, Configuration Compliance Report, Change Management Record

**Network & Boundary** (4): Network Diagram, Data Flow Diagram, Firewall / Boundary Ruleset, Wireless
Configuration

**Cryptography & Transmission** (3): Encryption Configuration, Certificate Inventory, FIPS Validation
Evidence

**Logging & Audit** (3): Audit Log Configuration, Audit Log Sample, Log Review Record

**Monitoring & Detection** (5): Monitoring Tool Configuration, Alert Record, Malware Protection
Configuration, Data Loss Prevention Configuration, Security Advisory / Threat Intelligence Record

**Vulnerability & Patch** (4): Vulnerability Scan Report, Vulnerability Scan Configuration, Remediation
Record, Patch Management Record

**Risk & Security Assessment** (2): Risk Assessment Report, Security Assessment Report

**Incident Response** (3): Incident Response Plan, Incident Record, Incident Response Test Record

**Media Protection** (3): Media Sanitization Record, Media Inventory, Media Marking Evidence

**Physical Protection** (3): Physical Access Authorization, Physical Access Record, Physical Security
Configuration

**Personnel Security** (2): Personnel Screening Record, Personnel Action Record

**Awareness & Training** (3): Training Completion Record, Training Content, Acknowledgment Record

**Maintenance** (2): Maintenance Record, Maintenance Tool Control Record

Each tag also carries (not shown as UI text but relevant to search behavior): a stable `id`, `producedBy`
examples, and `aliases` — the modal's search matches against label, id, category, *and* aliases, and shows
a `· {matchedAlias}` hint suffix on chips that matched via alias rather than label.

The modal (`EvidenceTagPickerModal`) renders category groups in the fixed order above, but **only groups
that have ≥1 matching tag for the current search term** — so "Governance & Documentation, Identity &
Account Management, Authentication, and presumably more below the fold" is exactly right; the full 17
groups are all present, just below the visible fold, unfiltered by default.

## 9. Other per-artifact actions

Beyond expand (row click) and Add/Edit Tags (button in the expanded Evidence Tags column), the only other
action is the **`+` accept button on each Suggested Reuse row**, which immediately maps the artifact to
that objective (no separate "map" action elsewhere). There is:
- **No delete/remove artifact action** anywhere on this page.
- **No rename action.**
- **No "remove this mapping" action** from this page — mappings can only be added here (via accept
  suggestion); removing a mapping would have to happen from Control Detail's own artifact-list UI.
- **No "view underlying file" action** — artifacts are metadata-only name references (explicitly, per the
  registry's own doc comment: "These are metadata references only — names/labels, no file contents, no
  CUI"), so there is no file to open.

## 10. Does saving tags immediately recompute Mapped/Reuse/Status?

Yes, immediately, no refresh/re-navigation needed. `onSave` in the modal calls `updateArtifactTags(id,
tagIds)` then `setRefreshKey(k => k + 1)`. `refreshKey` is a dependency of essentially every derived memo
in the page (registry list, index, status counts, reuse-count map, tag-filtered list, available tag
options), so bumping it forces a full recompute and re-render of the table, stats row, and (if that row is
expanded) the Suggested Reuse / Current Mappings panels — all synchronously on save, in-page.

## 11. Sorting

Three sortable columns, each toggles asc/desc on repeat click of the same header (click a different column
resets direction to that column's default):

- **Artifact** (`name`) — alphabetical, case-insensitive `localeCompare`. Default direction when first
  selected: **ascending**.
- **Mapped** (`mappings`) — by `usages.length`. Default direction when first selected: **descending**.
- **Reuse** (`reuse`) — by the precomputed reuse-suggestion count (strong + related, from
  `reuseCountMap`). Default direction when first selected: **descending**.

**Evidence Tags** and **Status** columns are not sortable (plain `<th>`, no sort button/icon).

**Page's actual default sort on load**: `{ key: 'mappings', dir: 'desc' }` — i.e. the table opens sorted by
Mapped, highest first, not by Artifact name. Each sortable header shows a `SortIcon`: a neutral `↕` when
inactive, or `↑`/`↓` when that column is the active sort key.
