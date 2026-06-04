
## Version 1.1.1 — Import Hardening and Export Improvements
Date: June 3, 2026

### Summary
Defensive-depth hardening of the CSV and JSON import pipeline. Extension-first file validation, size limits, and a restore confirmation dialog for JSON imports prevent accidental misuse and address supervisor and security-review concerns about file handling. Export filenames now include a local-time `HHMM` component to prevent same-day collisions.

### Features Added
- **JSON restore confirmation dialog** — importing a project backup now shows a confirmation dialog before overwriting any data. The dialog lists exactly what will and will not be affected and confirms that files are processed locally and not uploaded to a server. Cancel discards the pending import with no side effects.
- **Export filename timestamps** — filenames now include `YYYY-MM-DD_HHMM` using local browser time. Multiple exports on the same day no longer collide.

### Fixes / Hardening
- **CSV import: extension validation** — files must have a `.csv` extension; files without it are rejected even if the MIME type is `text/plain`
- **CSV import: MIME type validation** — accepted MIME types: `text/csv`, `application/csv`, `application/vnd.ms-excel`, `text/plain`, empty string (for browsers that do not populate `file.type`); all others rejected with a clear error message
- **CSV import: size limit** — files larger than 1 MB are rejected before reading
- **JSON import: extension validation** — files must have a `.json` extension; files without it are rejected even if the MIME type is `text/plain`
- **JSON import: MIME type validation** — accepted MIME types: `application/json`, `text/plain`, empty string; all others rejected
- **JSON import: size limit** — files larger than 2 MB are rejected before reading
- **JSON import: pre-validation before dialog** — schema version and structural checks run before the confirmation dialog appears; malformed files surface errors immediately without prompting

### Infrastructure
- No changes to data files, routing, validator, theme system, or deployment configuration

### Validation
- Controls: 110
- Evidence Types: 130
- Relationships: 189
- Families: 14/14
- Validator: Pass

### Deployment Status
- GitHub: Yes
- Cloudflare Pages: Yes — auto-deploys on push to `main`

### Notes
Extension is the primary validation control. MIME type is browser-determined and inconsistent across platforms; a `.txt` file will not pass as a `.csv` or `.json` regardless of its MIME type. Size limits (1 MB CSV / 2 MB JSON) are orders of magnitude larger than any legitimate CMMC Companion export (~15 KB for a full 110-control JSON backup).

---

## Version 1.0.1 — First Production Deployment
Date: June 3, 2026

### Summary
First production deployment of CMMC Companion. GitHub repository established, Cloudflare Pages configured, and CI/CD pipeline verified. Includes a bug fix that corrected a silent failure in the bulk Clear Data and bulk Set Status actions.

### Fixes
- **Bulk Clear Data was silently broken** — `writeStatus` was never imported in `ControlLibrary.jsx`; calls to it in `bulkClearData` and `bulkSetStatus` threw a `ReferenceError` at runtime and wrote nothing to localStorage. Added `writeStatus` to the existing status import.
- **Bulk Set Status was silently broken** — same root cause; fixed by the same import correction.
- **Clear Data had no confirmation guard** — clicking Clear Data immediately discarded all selected control data with no warning. Added a confirmation dialog before any data is modified.

### Features Added
- **Clear Data confirmation dialog** — modal overlay with explicit description of what will and will not be cleared: status, inheritance, control notes, and objective notes are reset; scoring metadata, POA&M eligibility, control definitions, evidence, and relationships are untouched. Buttons: Cancel (no-op) and Clear Data (confirms and executes).

### Infrastructure
- GitHub repository connected: `Vinchyyyy/cmmc-companion`
- Cloudflare Pages project configured: framework preset Vite, build command `npm run build`, output directory `dist`
- `public/_redirects` (`/* /index.html 200`) confirmed working — SPA deep-link routing verified on Cloudflare Pages
- Automatic deployment pipeline verified: push to `main` triggers build and deploy
- Production deployment from commit `85ee67d` verified successful

### Validation
- Controls: 110
- Evidence Types: 130
- Relationships: 189
- Families: 14/14
- Validator: Pass (4 pre-existing bidirectional relationship warnings, unchanged)

### Deployment Status
- GitHub: Yes — https://github.com/Vinchyyyy/cmmc-companion
- Cloudflare Pages: Yes
- Production URL: https://cmmc-companion.pages.dev

### Notes
The `writeStatus` import omission was a silent failure — no console error surfaced in development because the function was never called via a code path that would throw visibly. Both `bulkClearData` and `bulkSetStatus` were affected. The other three bulk write utilities (`writeInheritance`, `writeNote`, `writeObjectiveNote`) were imported correctly and functioned normally. The confirmation dialog uses a CSS overlay pattern consistent with existing bulk toolbar styles; no new dependencies introduced.

---

## [V1 Stabilization — P1 Batch]

### Fixed — Quick Search: Scoring Metadata Now Searchable
- `getScoringSearchTerms()` from `src/utils/scoring.js` wired into `searchControls()` in `Home.jsx`
- Quick Search now matches scoring-related terms: `"basic"`, `"derived"`, `"5 point"`, `"3 point"`, `"1 point"`, `"poam"`, `"non poam"`, `"conditional"`, and others defined in `getScoringSearchTerms()`
- One file changed: `src/pages/Home.jsx` (import + one additional `||` clause in `searchControls()`)
- Validator: all checks passed — 110 controls, 130 evidence types, 189 relationships (4 warnings, unchanged)

### Investigated — EvidenceLookup Physical Protection Filter
- Investigated the known issue: "EvidenceLookup PE filter not returning results"
- Finding: filter was already working correctly
- Root cause of original report: malformed JSX option labels for Personnel Security and Physical Protection were fixed during PE family integration; no additional code change was needed
- `matchesFamily()` correctly uses `familyById[id] === familyFilter` where `familyById` is built from the controls index; all PE control IDs map to `"Physical Protection"` and the dropdown `value` matches exactly
- Known issue closed with no code change

## [Post-Feature-Freeze Expansion] — Sessions 2–N

### Added — Media Protection (MP) Family — V1 FINAL FAMILY
- 9 controls confirmed from CMMC Assessment Guide Level 2 (pages 152–168):
  MP.L1-3.8.3 (Media Disposal), MP.L2-3.8.1 (Media Protection), MP.L2-3.8.2 (Media Access),
  MP.L2-3.8.4 (Media Markings), MP.L2-3.8.5 (Media Accountability), MP.L2-3.8.6 (Portable Storage Encryption),
  MP.L2-3.8.7 (Removable Media), MP.L2-3.8.8 (Shared Media), MP.L2-3.8.9 (Protect Backups)
- **PROJECT_STATE.md mismatch corrected:** Range described as "MP.L2-3.8.1 through MP.L2-3.8.9" implied MP.L2-3.8.3 exists — it does not. The L1 practice 3.8.3 carries the **MP.L1-3.8.3** designation (FAR Clause 52.204-21 b.1.vii). No MP.L2-3.8.3 exists. Count (~9) was correct.
- **MP.L1-3.8.3 ID decision:** Assessment Guide is authoritative. Scoring Methodology references "MP.L2-3.8.3" loosely in the 5-point basic list but the correct ID is MP.L1-3.8.3.
- Scoring (all confirmed from CMMC Scoring Methodology):
  - MP.L1-3.8.3: -5 Basic (listed as "MP.L2-3.8.3" in methodology — same practice, L1 ID is authoritative)
  - MP.L2-3.8.1: -3 Basic
  - MP.L2-3.8.2: -3 Basic
  - MP.L2-3.8.4: -1 Derived
  - MP.L2-3.8.5: -1 Derived
  - MP.L2-3.8.6: -1 Derived
  - MP.L2-3.8.7: -5 Derived
  - MP.L2-3.8.8: -3 Derived
  - MP.L2-3.8.9: -1 Derived
- POA&M: all 9 MP controls allowed — none appear in the prohibited POA&M list
- 8 MP-specific evidence types
- 7 intra-MP relationship edges
- 7 cross-family edges: MP↔MA (×1, deferred edge now added), MP↔SI (×1), MP↔SC (×2), MP↔PE (×1), MP↔AC (×2)
- **Deferred MA→MP edge added:** MA.L2-3.7.3 → MP.L1-3.8.3 (both use NIST 800-88 sanitization; deferred from MA expansion pending MP controls)
- MP added to all four family dropdowns: ControlLibrary.jsx, Home.jsx, EvidenceLookup.jsx, RelationshipExplorer.jsx
- MP registered in validator: FAMILY_FILES, FAMILY_CODE_TO_NAME, RELATIONSHIP_FILES, EVIDENCE_FILES
- Validator passes: 110 controls, 130 evidence types, 189 relationships (4 bidirectional warnings only)
- **All 14 CMMC Level 2 control families now complete. V1 control coverage done.**

### Added — Awareness and Training (AT) Family
- 2 controls: AT.L2-3.2.1 (Role-Based Risk Awareness), AT.L2-3.2.2 (Role-Based Training)
- Control IDs and titles confirmed against CMMC Assessment Guide Level 2 (pages 60–64)
- 4 objectives for AT.L2-3.2.1 [a][b][c][d]; 3 objectives for AT.L2-3.2.2 [a][b][c]
- 7 AT-specific evidence types across both controls
- 1 AT↔AT relationship edge (AT.L2-3.2.1 is prerequisite for AT.L2-3.2.2)
- 7 cross-family edges: AT↔IR (×2), AT↔PS (×1), AT↔CA (×2), AT↔AC (×2)
- Scoring: AT.L2-3.2.1=-5 Basic, AT.L2-3.2.2=-5 Basic; both POA&M allowed
  - Confirmed from CMMC Scoring Methodology: both listed explicitly in 5-point basic requirement list
  - Neither control appears in the POA&M prohibited list
- AT added to all four family dropdowns: ControlLibrary.jsx, Home.jsx, EvidenceLookup.jsx, RelationshipExplorer.jsx
- AT registered in validator: FAMILY_FILES, FAMILY_CODE_TO_NAME, RELATIONSHIP_FILES, EVIDENCE_FILES
- Validator passes: 94 controls, 112 evidence types, 161 relationships (4 bidirectional warnings only)

**Note:** AT.L2-3.2.3 was initially omitted because PROJECT_STATE.md incorrectly listed only two AT controls. It was added in the correction pass below.

### Added — Maintenance (MA) Family
- 6 controls confirmed from CMMC Assessment Guide Level 2 (pages 149–160):
  MA.L2-3.7.1 (Perform Maintenance), MA.L2-3.7.2 (System Maintenance Control), MA.L2-3.7.3 (Equipment Sanitization), MA.L2-3.7.4 (Media Inspection), MA.L2-3.7.5 (Nonlocal Maintenance), MA.L2-3.7.6 (Maintenance Personnel)
- **PROJECT_STATE.md mismatch corrected:** Previous estimate listed range "through MA.L2-3.7.5" — MA.L2-3.7.6 was missed. All 6 controls were present in the Assessment Guide and are now implemented.
- Scoring (all confirmed from CMMC Scoring Methodology):
  - MA.L2-3.7.1: -3 Basic (explicitly in 3-point basic list)
  - MA.L2-3.7.2: -5 Basic (explicitly in 5-point basic list)
  - MA.L2-3.7.3: -1 Derived (not in 5-pt or 3-pt lists)
  - MA.L2-3.7.4: -3 Derived (explicitly in 3-point derived list)
  - MA.L2-3.7.5: -5 Derived (explicitly in 5-point derived list)
  - MA.L2-3.7.6: -1 Derived (not in 5-pt or 3-pt lists)
- POA&M: all 6 controls allowed — none appear in the prohibited POA&M list
- 8 MA-specific evidence types
- 5 intra-MA relationship edges
- 9 cross-family edges: MA↔SI (×2, Assessment Guide explicit), MA↔IA (×1, Assessment Guide explicit), MA↔AC (×2, Assessment Guide explicit), MA↔PE (×1, Assessment Guide explicit), MA↔CM (×1), MA↔IR (×1)
- MA↔MP edge (MA.L2-3.7.3 ↔ MP.L1-3.8.3) deferred until MP expansion — MP controls not yet in the dataset
- MA added to all four family dropdowns: ControlLibrary.jsx, Home.jsx, EvidenceLookup.jsx, RelationshipExplorer.jsx
- MA registered in validator: FAMILY_FILES, FAMILY_CODE_TO_NAME, RELATIONSHIP_FILES, EVIDENCE_FILES
- Validator passes: 101 controls, 122 evidence types, 175 relationships (4 bidirectional warnings only)

### Fixed — AT.L2-3.2.3 (Insider Threat Awareness) Added
- AT.L2-3.2.3 confirmed in CMMC Assessment Guide Level 2 (pages 65–66); NIST SP 800-171 R2 practice 3.2.3
- 2 objectives: [a] insider threat indicators identified, [b] awareness training provided to managers and employees
- Scoring: AT.L2-3.2.3=-1 Derived — not listed in 5-point or 3-point scoring lists; falls under "all remaining derived requirements" per CMMC Scoring Methodology
- POA&M: allowed — AT.L2-3.2.3 does not appear in the POA&M prohibited controls list
- 2 new evidence entries added: Insider Threat Awareness Training Materials and Records; Insider Threat Indicator Reference Documentation
- 1 new intra-AT relationship: AT.L2-3.2.1 supports AT.L2-3.2.3 (awareness program is the delivery vehicle for insider threat content)
- PROJECT_STATE.md corrected: AT shows 3 controls; dataset totals updated
- Validator passes: 95 controls, 114 evidence types, 162 relationships (4 warnings — unchanged)

### Added — Home Dashboard (Visual Progress Tracking)
- Stacked progress bar showing status distribution (MET / NOT MET / In Progress / Not Started)
- Family selector dropdown to filter progress stats to a specific control family
- Status count rows now link to Control Library filtered by status + family combination
- Progress bar uses existing CSS color variables; segments animate on family switch
- Empty-state handling when selected family has no controls

### Fixed — Progress Bar Rendering
- Progress bar was invisible due to missing CSS (`height: 12px` not in styles.css)
- CSS additions documented in `progress-bar-styles.css` and required manual append to `styles.css`

### Added — Inheritance Tracking
- `src/utils/inheritance.js` — INHERITANCE_VALUES, DEFAULT_INHERITANCE, INHERITANCE_BADGE_CLASS, readInheritance, writeInheritance
- Storage key: `cmmc-inheritance-{controlId}`
- ControlDetail: Inheritance dropdown alongside Assessment Status in `.control-meta-row`
- ControlLibrary: Inheritance badge (hidden when None), inheritance filter dropdown
- projectState.js: inheritance exported and imported with case-insensitive normalization
- Badge colors: None=gray, Full=purple, Partial=blue
- `FILTER_KEYS` extended to include `'inheritance'`

### Added — Multi-Select Bulk Actions (ControlLibrary)
- Checkbox column on every control row; select-all header with indeterminate state
- Bulk toolbar (visible only when selection > 0): selected count, Set Status dropdown, Set Inheritance dropdown, Clear Data button, Clear Selection button
- Bulk Set Status: writes to all selected controls, forces re-render via updateKey bump
- Bulk Set Inheritance: same pattern
- Bulk Clear Data: resets status → Not Started, inheritance → None, control note → '', all objective notes → ''
- Selection persists across filter changes and bulk actions
- Checkbox click stops propagation; row Link still navigates normally
- CSS additions: `.bulk-toolbar`, `.bulk-toolbar-*`, `.control-list-item--selected`, `.control-list-checkbox-label`, `.control-list-select-all`

### Added — Scoring and POA&M Metadata
- `src/data/scoring.json` — flat lookup keyed by control ID; fields: scoreValue, practiceType, poamAllowed, poamRestrictionReason
- `src/utils/scoring.js` — SCORE_VALUES, SCORE_BADGE_CLASS, getScore, getPracticeType, isPoamAllowed, getPoamReason, getScoringMeta, getScoringSearchTerms
- ControlLibrary: score badge `(n)`, Non-POA&M badge, score filter, POA&M filter
- Badge order: status → inheritance → notes → Non-POA&M → score
- Score and POA&M filters added to FILTER_KEYS
- Validator Category 7 (Scoring): checks every control has scoring.json entry, valid scoreValue, boolean poamAllowed, poamRestrictionReason when poamAllowed=false

### Changed — Score Badge Format
- Score badges display as `(5)`, `(3)`, `(1)` instead of raw `-5`, `-3`, `-1`
- Score filter dropdown labels updated to match: `(5) pts`, `(3) pts`, `(1) pts`
- `title` attribute retains `"5-point deduction if not met"` for tooltip context

### Removed — Scoring Section from ControlDetail
- `Scoring & POA&M Eligibility` card removed from ControlDetail page by design decision
- scoring.js import removed from ControlDetail.jsx
- Scoring metadata remains accessible via Library badges, filters, and Quick Search

### Added — Incident Response (IR) Family
- 3 controls: IR.L2-3.6.1, IR.L2-3.6.2, IR.L2-3.6.3
- 7 IR-only evidence entries
- 3 IR↔IR relationship edges
- 8 cross-family edges (IR↔AU, IR↔CM, IR↔SC)
- Scoring: IR.L2-3.6.1=-5, IR.L2-3.6.2=-5, IR.L2-3.6.3=-1; all POA&M allowed
- IR added to all family dropdowns and validator

### Added — Risk Assessment (RA) Family
- 3 controls: RA.L2-3.11.1, RA.L2-3.11.2, RA.L2-3.11.3
- 9 RA-only evidence entries
- 3 RA↔RA relationship edges
- 9 cross-family edges (RA↔CM, RA↔AU, RA↔IR, RA↔SC)
- Scoring: RA.L2-3.11.1=-3 Basic, RA.L2-3.11.2=-5 Derived, RA.L2-3.11.3=-1 Basic; all POA&M allowed
- RA added to all family dropdowns and validator

### Added — Security Assessment (CA) Family
- 4 controls: CA.L2-3.12.1, CA.L2-3.12.2, CA.L2-3.12.3, CA.L2-3.12.4
- 8 CA-only evidence entries
- 5 CA↔CA relationship edges
- 8 cross-family edges (CA↔RA, CA↔AU, CA↔IR, CA↔AC, CA↔CM)
- Scoring: CA.L2-3.12.1=-5, CA.L2-3.12.2=-3, CA.L2-3.12.3=-5, CA.L2-3.12.4=-1
- CA.L2-3.12.4 is **non-POA&Mable** (SSP must exist at time of assessment)
- CA added to all family dropdowns and validator

### Added — System and Information Integrity (SI) Family
- 7 controls: SI.L1-3.14.1, SI.L1-3.14.2, SI.L2-3.14.3, SI.L1-3.14.4, SI.L1-3.14.5, SI.L2-3.14.6, SI.L2-3.14.7
- L1 controls retain L1 ID designations (SI.L1-3.14.x) — do not change
- 12 SI-only evidence entries
- 6 SI↔SI relationship edges
- 9 cross-family edges (SI↔RA, SI↔AU, SI↔IR, SI↔AC, SI↔CA, SI↔CM)
- Scoring: SI.L1-3.14.1/2/3/4/6=-5; SI.L1-3.14.5=-3; SI.L2-3.14.7=-3; all POA&M allowed
- SI added to all family dropdowns and validator

### Added — Personnel Security (PS) Family
- 2 controls: PS.L2-3.9.1, PS.L2-3.9.2
- 8 PS-only evidence entries
- 1 PS↔PS relationship edge
- 7 cross-family edges (PS↔AC, PS↔IA, PS↔AU, PS↔IR, PS↔CA)
- Scoring: PS.L2-3.9.1=-3 Basic, PS.L2-3.9.2=-5 Basic; all POA&M allowed
- PS added to all family dropdowns and validator
- Cross-family relationships grounded directly in Assessment Guide language (IA.L1-3.5.1 and IA.L1-3.5.2 explicitly named as PS building blocks)

### Added — Physical Protection (PE) Family
- 6 controls: PE.L1-3.10.1, PE.L1-3.10.3, PE.L1-3.10.4, PE.L1-3.10.5, PE.L2-3.10.2, PE.L2-3.10.6
- All IDs confirmed against CMMC Assessment Guide Level 2 (pages 175–186)
- PE evidence entries added
- PE↔PE relationship edges added
- PE cross-family edges added (PE↔AC, PE↔AU, PE↔IR, PE↔CA, PE↔SC, PE↔PS); MA edge excluded pending MA expansion
- Scoring: PE.L1-3.10.1=-5 Basic; PE.L1-3.10.3=-3 Basic; PE.L1-3.10.4=-1 Basic; PE.L1-3.10.5=-1 Basic; PE.L2-3.10.2=-3 Derived; PE.L2-3.10.6=-1 Basic
- PE.L1-3.10.3, PE.L1-3.10.4, PE.L1-3.10.5 are **non-POA&Mable** (Level 1 FAR-referenced practices)
- PE added to all family dropdowns: ControlLibrary.jsx, Home.jsx, EvidenceLookup.jsx, RelationshipExplorer.jsx
- PE registered in validator: FAMILY_FILES, FAMILY_CODE_TO_NAME, RELATIONSHIP_FILES, EVIDENCE_FILES
- Validator passes: 92 controls, 105 evidence types, 153 relationships (4 bidirectional warnings only)

### Fixed — PE Control ID Typo in PROJECT_STATE.md
- Previous note incorrectly listed non-POA&Mable PE controls as PE.L2-3.10.3/4/5
- Corrected to PE.L1-3.10.3, PE.L1-3.10.4, PE.L1-3.10.5 per Assessment Guide
- L1 designation confirmed: all three carry FAR Clause 52.204-21 Partial b.1.ix reference

### Fixed — RelationshipExplorer and EvidenceLookup Family Dropdowns
- Personnel Security and Physical Protection options were missing or had malformed JSX option labels
- Corrected during PE integration; all four UI files now have consistent family lists

### Changed — Family Expansion Process (Standardized)
- All family expansions now use micro-patches (UI-PATCHES-{FAMILY}.md) rather than full page rewrites for page files
- Each expansion produces: controls JSON, evidence JSON, relationships JSON, cross-family patch JSON, scoring patch JSON, updated index.js files, updated validator, UI patch instructions
- Validator runs after every merge to confirm exit 0

### Changed — Validator
- Category 7 (Scoring) added: validates scoreValue ∈ {-1,-3,-5}, poamAllowed is boolean, poamRestrictionReason present when poamAllowed=false
- Extra scoring.json entries (future families not yet in controls) produce warnings not failures
- All 11 completed families registered in FAMILY_FILES and FAMILY_CODE_TO_NAME
