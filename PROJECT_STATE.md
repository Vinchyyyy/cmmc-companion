# Project State — Durable Reference Notes

This file holds facts that don't belong in the CHANGELOG (locked control-ID
corrections, schema constants, format rules) because they aren't tied to a
single release — they're standing constraints future work must respect.

**For current app state, recent features, and release history, see
[CHANGELOG.md](CHANGELOG.md).** The app is well past initial V1 delivery
(see CHANGELOG's Version 4.x entries for DIBCAC Mode, findings
synchronization, Excel round-trip, and everything since); this file no
longer tracks phase/milestone status to avoid drifting out of sync with it.

## Current Dataset Totals

Run `npm run validate` for live, authoritative counts. As of this writing:

| Dataset | Count |
|---|---|
| Controls | 110 |
| Objectives | 320 |
| Evidence Types | 130 |
| Relationships | 189 |
| Evidence Tags | 66 |
| Non-POA&Mable controls | 6 |

## Non-POA&Mable Controls (confirmed)

| Control | Family | Score | Reason |
|---|---|---|---|
| AC.L1-3.1.20 | Access Control | -1 | Fundamental control — cannot be deferred |
| AC.L1-3.1.22 | Access Control | -1 | Fundamental control — cannot be deferred |
| CA.L2-3.12.4 | Security Assessment | -1 | SSP must exist at time of assessment |
| PE.L1-3.10.3 | Physical Protection | -3 | Level 1 FAR-referenced practice — cannot be deferred |
| PE.L1-3.10.4 | Physical Protection | -1 | Level 1 FAR-referenced practice — cannot be deferred |
| PE.L1-3.10.5 | Physical Protection | -1 | Level 1 FAR-referenced practice — cannot be deferred |

## MP Control ID Note (LOCKED)

MP.L1-3.8.3 (Media Disposal) is a Level 1 FAR-referenced practice (FAR Clause 52.204-21 b.1.vii).
There is NO MP.L2-3.8.3 — the NIST 800-171 practice 3.8.3 carries the L1 designation in the Assessment Guide.
The Level 2 MP controls are: MP.L2-3.8.1, MP.L2-3.8.2, MP.L2-3.8.4, MP.L2-3.8.5, MP.L2-3.8.6, MP.L2-3.8.7, MP.L2-3.8.8, MP.L2-3.8.9.

The CMMC Scoring Methodology text references "MP.L2-3.8.3" in the 5-point basic list — this refers to the same practice 3.8.3 but uses the L2 label loosely. The Assessment Guide control ID is authoritative: MP.L1-3.8.3, scored at -5.

## MA Control ID Note (LOCKED)

All 6 MA practices confirmed against CMMC Assessment Guide Level 2 (pages 149–160):
- MA.L2-3.7.1 (Perform Maintenance)
- MA.L2-3.7.2 (System Maintenance Control)
- MA.L2-3.7.3 (Equipment Sanitization)
- MA.L2-3.7.4 (Media Inspection)
- MA.L2-3.7.5 (Nonlocal Maintenance)
- MA.L2-3.7.6 (Maintenance Personnel)

## PE Control ID Note (LOCKED)

PE Level 1 practices carry L1 designations confirmed against the Assessment Guide. Do not change:
- PE.L1-3.10.1 (Limit Physical Access)
- PE.L1-3.10.3 (Escort Visitors) — non-POA&Mable
- PE.L1-3.10.4 (Physical Access Logs) — non-POA&Mable
- PE.L1-3.10.5 (Manage Physical Access) — non-POA&Mable

Only PE.L2-3.10.2 and PE.L2-3.10.6 are Level 2.

## SI Control ID Note (LOCKED)

SI Level 1 practices retain their L1 ID designations. Do not change:
- SI.L1-3.14.1 (Flaw Remediation)
- SI.L1-3.14.2 (Malicious Code Protection)
- SI.L1-3.14.4 (Update Malicious Code Protection)
- SI.L1-3.14.5 (System and File Scanning)

Only SI.L2-3.14.3, SI.L2-3.14.6, SI.L2-3.14.7 are Level 2.

## Scoring Badge Format (LOCKED)

Score badges display as `(5)`, `(3)`, `(1)` — not `-5`, `-3`, `-1`.
Badge order in ControlLibrary rows: status → inheritance → notes → Non-POA&M → score.
Score metadata intentionally absent from ControlDetail page (removed as UI refinement).

## FILTER_KEYS (LOCKED)

ControlLibrary URL filter keys:

```
['search', 'family', 'status', 'notes', 'artifacts', 'inheritance', 'score', 'poam']
```

Any new filter must be added to this array to be included in Clear Filters behavior.

## Project JSON Schema Version

`SCHEMA_VERSION` and `ACCEPTED_SCHEMA_VERSIONS` are defined in `src/utils/projectState.js` —
check that file for the current value rather than trusting a number here, since it
changes with each schema-affecting feature (currently 11, accepting 1–11).

Import/export coverage per control now spans far more than the original v2 fields
(findings, objective results, inheritance sources/assignments, DIBCAC review groups
and folders, checklist interview notes, provider profiles, etc.) — see
`DEFAULT_IMPORT_OPTIONS` in `projectState.js` for the current category list, and
CHANGELOG.md for when each category was added.

## Deployment

| Target | Status | URL |
|---|---|---|
| GitHub | Live | https://github.com/Vinchyyyy/cmmc-companion |
| Cloudflare Pages | Live | https://cmmc-companion.pages.dev |

CI/CD: push to `main` automatically triggers Cloudflare Pages build and deploy. Build command: `npm run build`. Output: `dist/`. SPA routing handled by `public/_redirects`.
