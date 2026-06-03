
## Current Dataset Totals (as of MP merge — V1 COMPLETE)

| Dataset | Count |
|---|---|
| Controls | 110 |
| Evidence Types | 130 |
| Relationships | 189 |
| Scoring entries | 110 |
| Non-POA&Mable controls | 6 |

## Completed Control Families (14 of 14 in scope — V1 COMPLETE)

| Family | Code | Controls | Status |
|---|---|---|---|
| Access Control | AC | 22 | ✅ Complete |
| Identification and Authentication | IA | 11 | ✅ Complete |
| System and Communications Protection | SC | 16 | ✅ Complete |
| Audit and Accountability | AU | 9 | ✅ Complete |
| Configuration Management | CM | 9 | ✅ Complete |
| Incident Response | IR | 3 | ✅ Complete |
| Risk Assessment | RA | 3 | ✅ Complete |
| Security Assessment | CA | 4 | ✅ Complete |
| System and Information Integrity | SI | 7 | ✅ Complete |
| Personnel Security | PS | 2 | ✅ Complete |
| Physical Protection | PE | 6 | ✅ Complete |
| Awareness and Training | AT | 3 | ✅ Complete |
| Maintenance | MA | 6 | ✅ Complete |
| Media Protection | MP | 9 | ✅ Complete |

## Remaining Families

None. All 14 families complete. V1 control coverage is done.

## MP Control ID Note (LOCKED)

MP.L1-3.8.3 (Media Disposal) is a Level 1 FAR-referenced practice (FAR Clause 52.204-21 b.1.vii).
There is NO MP.L2-3.8.3 — the NIST 800-171 practice 3.8.3 carries the L1 designation in the Assessment Guide.
The Level 2 MP controls are: MP.L2-3.8.1, MP.L2-3.8.2, MP.L2-3.8.4, MP.L2-3.8.5, MP.L2-3.8.6, MP.L2-3.8.7, MP.L2-3.8.8, MP.L2-3.8.9.
PROJECT_STATE.md previously described the range as "MP.L2-3.8.1 through MP.L2-3.8.9" — this was misleading because it implied MP.L2-3.8.3 exists as L2. The count (~9) was correct.

The CMMC Scoring Methodology text references "MP.L2-3.8.3" in the 5-point basic list — this refers to the same practice 3.8.3 but uses the L2 label loosely. The Assessment Guide control ID is authoritative: MP.L1-3.8.3, scored at -5.

## MA Control ID Note (LOCKED)

All 6 MA practices confirmed against CMMC Assessment Guide Level 2 (pages 149–160):
- MA.L2-3.7.1 (Perform Maintenance)
- MA.L2-3.7.2 (System Maintenance Control)
- MA.L2-3.7.3 (Equipment Sanitization)
- MA.L2-3.7.4 (Media Inspection)
- MA.L2-3.7.5 (Nonlocal Maintenance)
- MA.L2-3.7.6 (Maintenance Personnel)

PROJECT_STATE.md previously listed range as "through MA.L2-3.7.5" — MA.L2-3.7.6 was missed in the estimate. All 6 are now implemented.

## Non-POA&Mable Controls (confirmed)

| Control | Family | Score | Reason |
|---|---|---|---|
| AC.L1-3.1.20 | Access Control | -1 | Fundamental control — cannot be deferred |
| AC.L1-3.1.22 | Access Control | -1 | Fundamental control — cannot be deferred |
| CA.L2-3.12.4 | Security Assessment | -1 | SSP must exist at time of assessment |
| PE.L1-3.10.3 | Physical Protection | -3 | Level 1 FAR-referenced practice — cannot be deferred |
| PE.L1-3.10.4 | Physical Protection | -1 | Level 1 FAR-referenced practice — cannot be deferred |
| PE.L1-3.10.5 | Physical Protection | -1 | Level 1 FAR-referenced practice — cannot be deferred |

## PE Control ID Note (LOCKED)

PE Level 1 practices carry L1 designations confirmed against the Assessment Guide. Do not change:
- PE.L1-3.10.1 (Limit Physical Access)
- PE.L1-3.10.3 (Escort Visitors) — non-POA&Mable
- PE.L1-3.10.4 (Physical Access Logs) — non-POA&Mable
- PE.L1-3.10.5 (Manage Physical Access) — non-POA&Mable

Only PE.L2-3.10.2 and PE.L2-3.10.6 are Level 2.

Note: An earlier draft of this file incorrectly listed these as PE.L2-3.10.3/4/5. The correct IDs with L1 designations are confirmed from the CMMC Assessment Guide Level 2, pages 177–181.

## SI Control ID Note (LOCKED)

SI Level 1 practices retain their L1 ID designations. Do not change:
- SI.L1-3.14.1 (Flaw Remediation)
- SI.L1-3.14.2 (Malicious Code Protection)
- SI.L1-3.14.4 (Update Malicious Code Protection)
- SI.L1-3.14.5 (System and File Scanning)

Only SI.L2-3.14.3, SI.L2-3.14.6, SI.L2-3.14.7 are Level 2.

## Known Issues (open)

None.

## Known Issues (resolved)

| Issue | Resolution |
|---|---|
| EvidenceLookup PE filter not returning results | Investigated — filter was already working correctly. `familyById` maps all PE control IDs to "Physical Protection" and the dropdown value matches exactly. Malformed JSX labels were fixed during PE integration; no additional code change needed. |
| Verify all family dropdowns synchronized | Confirmed during PE integration — all four UI files (ControlLibrary, Home, EvidenceLookup, RelationshipExplorer) have consistent family lists through MP. |

## Feature Implementation Status

| Feature | Status | Files |
|---|---|---|
| Assessment status tracking | ✅ Complete | status.js |
| Control-level notes | ✅ Complete | notes.js |
| Objective-level notes | ✅ Complete | objectiveNotes.js |
| Inheritance tracking | ✅ Complete | inheritance.js |
| Scoring metadata | ✅ Complete | scoring.json, scoring.js |
| POA&M eligibility | ✅ Complete | scoring.json, scoring.js |
| Multi-select bulk actions | ✅ Complete | ControlLibrary.jsx |
| Progress dashboard with family selector | ✅ Complete | Home.jsx |
| CSV export/import | ✅ Complete | Home.jsx |
| Project JSON backup/restore | ✅ Complete | projectState.js, Home.jsx |
| Quick Search | ✅ Complete | Home.jsx |
| Scoring search term indexing | ✅ Complete | getScoringSearchTerms() wired into Home.jsx searchControls(); Quick Search now matches "basic", "derived", "5 point", "poam", etc. |
| URL-persisted filters | ✅ Complete | ControlLibrary.jsx |
| Clear Filters button | ✅ Complete | ControlLibrary.jsx |
| Score badge (n) format | ✅ Complete | ControlLibrary.jsx |
| Scoring section in ControlDetail | ❌ Removed by design | — |
| Validator (8 categories) | ✅ Complete | scripts/validate-data.cjs |

## Remaining V1 Work (post-family-completion)

1. Reorder controls into official CMMC assessment order
2. Add About page
3. Add Version History / Changelog page
4. Final V1 cleanup pass

## Scoring Badge Format (LOCKED)

Score badges display as `(5)`, `(3)`, `(1)` — not `-5`, `-3`, `-1`.
Badge order in ControlLibrary rows: status → inheritance → notes → Non-POA&M → score.
Score metadata intentionally absent from ControlDetail page (removed as UI refinement).

## FILTER_KEYS (LOCKED)

ControlLibrary URL filter keys:

['search', 'family', 'status', 'notes', 'inheritance', 'score', 'poam']

```
Any new filter must be added to this array to be included in Clear Filters behavior.

## Project JSON Schema Version

SCHEMA_VERSION = 1

Exports per control: status, note, objectiveNotes, inheritance.
Does NOT export: scoring metadata (read-only, never stored in localStorage).
```
