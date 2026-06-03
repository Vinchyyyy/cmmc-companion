# CMMC Companion

A browser-based planning tool for organizations preparing for a CMMC Level 2 assessment. Covers all 110 Level 2 practices with assessment objectives, evidence requirements, control relationships, and scoring impacts — offline, no backend.

## V1 Dataset

| | |
|---|---|
| Controls (practices) | 110 |
| Evidence types | 130 |
| Control relationships | 189 |
| Control families | 14 of 14 |

## Features

- **Dashboard** — stacked progress bar with per-family filtering; Quick Search across control IDs, titles, objectives, evidence, and scoring terms
- **Control Library** — filter by family, status, inheritance, score, or POA&M eligibility; multi-select bulk actions (set status, set inheritance, clear data)
- **Control Detail** — full assessment objectives, evidence requirements, and cross-control relationships; per-objective notes
- **Evidence Lookup** — search 130 evidence types by keyword or control family
- **Relationship Explorer** — visualize prerequisites, supports, and supported-by relationships across all 14 families
- **Scoring metadata** — 5-point, 3-point, and 1-point deductions per control; Non-POA&Mable controls flagged
- **Inheritance tracking** — Full / Partial / None per control
- **Export / Import** — CSV status export; full project JSON backup and restore

## Local Development

```bash
npm install
npm run dev        # start dev server
npm run validate   # run data integrity validator
npm run build      # production build to dist/
```

## Deployment

Static React/Vite app. Compatible with Cloudflare Pages.

`public/_redirects` is included and contains `/* /index.html 200` to support client-side SPA routing on Cloudflare Pages. No additional configuration needed.

## Privacy

All assessment data — status, notes, inheritance assignments — is stored exclusively in your browser's `localStorage`. Nothing is transmitted to any server. There is no telemetry, no analytics, and no network calls of any kind.

CSV and JSON exports are generated and downloaded entirely client-side. Files stay on your machine.

## Disclaimer

CMMC Companion is a **planning and preparation companion only**. It is not an official assessment record and does not produce documentation that satisfies C3PAO or DoD assessment requirements. It does not replace the judgment of a Certified Third-Party Assessment Organization (C3PAO) or a Certified CMMC Professional (CCP/CCA). All final compliance determinations must be made by a qualified assessor through the official CMMC assessment process.
