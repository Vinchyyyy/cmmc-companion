import { APP_VERSION } from '../utils/version'

function Changelog() {
  return (
    <div className="page">
      <h1>Version History</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
        A curated release history for CMMC Companion, focused on major milestones rather than every internal development note.
        Current version: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{APP_VERSION}</span>
      </p>

      {/* v1.3.0 — current release, open by default */}
      <details open style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v1.3.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Assessment Workflow &amp; Visibility Update</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 4, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Objective-Level Assessment Tracking</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added Objective Status tracking for every assessment objective</li>
              <li>Objectives can now be marked Unreviewed, MET, or NOT MET</li>
              <li>Objective status selections automatically persist locally</li>
              <li>Controls automatically promote from Not Started to In Progress when objective review begins</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Trending Status</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added derived Trending Status calculations based on objective-level assessments</li>
              <li>Trending Status automatically evaluates objective review results: Not Started, In Progress, MET, NOT MET</li>
              <li>Added visual Trending Status indicators throughout the Control Library</li>
              <li>Trending Status is displayed within Quick Look summaries</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Evidence &amp; Artifact Management</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added Evidence Pool support for controls</li>
              <li>Added Objective Artifact assignment and tracking</li>
              <li>Objective artifacts automatically contribute to Evidence Pool suggestions</li>
              <li>Added visual indicators showing controls that contain artifact references</li>
              <li>Backup and restore now support Evidence Pool and Objective Artifact data</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assessment Warnings Framework</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added Status Consistency Warning system detecting conflicts between Assessment Status and Trending Status</li>
              <li>Detects incomplete inheritance documentation</li>
              <li>Added warning indicators directly in the Control Library</li>
              <li>Added expandable warning panels with detailed explanations</li>
              <li>Added support for multiple warnings per control with aggregation into a single warning panel</li>
              <li>Added warning guidance and explanatory context for each warning type</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Inheritance Documentation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added Inheritance Source tracking for controls using Partial or Full inheritance</li>
              <li>Added "Inherited From" documentation field in Control Detail</li>
              <li>Added inheritance validation warnings when source documentation is missing</li>
              <li>Quick Look now displays inheritance status and source information</li>
              <li>Bulk inheritance assignment now requires inheritance source documentation</li>
              <li>Bulk inheritance operations apply inheritance source data to multiple controls simultaneously</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Control Library Enhancements</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added Quick Look expandable assessment summaries per control</li>
              <li>Added warning filtering: All warnings, Has warnings, No warnings</li>
              <li>Added Trending Status filtering</li>
              <li>Added artifact filtering</li>
              <li>Added inheritance filtering improvements</li>
              <li>Added family-level progress summaries showing Assessment Status breakdown per family</li>
              <li>Added family-level selection actions in Multi-Select mode</li>
              <li>Added Select Family and Deselect Family workflows</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Multi-Select Workflow</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Replaced always-visible row checkboxes with dedicated Multi-Select mode</li>
              <li>Entire row is clickable during normal browsing</li>
              <li>Entire row becomes selectable during Multi-Select mode</li>
              <li>Added Select All Visible controls workflow</li>
              <li>Added family-level bulk selection</li>
              <li>Added cleaner utility bar layout reducing visual clutter</li>
              <li>Improved bulk editing workflows</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>User Guidance &amp; Onboarding</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added first-run acknowledgement notice and Data Handling, Privacy &amp; Limitations workflow</li>
              <li>Added Icon Guide reference modal</li>
              <li>Added explanations for notes, artifact, trending, warning, and scoring indicators</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Backup &amp; Restore</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Upgraded project backup format to Schema Version 2</li>
              <li>Added support for Evidence Pool entries and Objective Artifact assignments in backups</li>
              <li>Added backward compatibility for Version 1 backups</li>
              <li>Improved import validation and reporting</li>
            </ul>
          </section>

          <section>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Validation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Existing assessment data remains compatible</li>
              <li>Existing Version 1 backups remain importable</li>
              <li>Local-only data handling model preserved — no cloud storage, no CUI transmission, no authentication introduced</li>
              <li>Controls: 110 · Evidence types: 130 · Relationships: 189 · Families: 14/14</li>
              <li>Validator: Pass · Build: Pass</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.2.0 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v{APP_VERSION}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Evidence Pool MVP</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 4, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assessment Workflow</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added control-level Evidence Pool for reusable artifact references</li>
              <li>Added objective-level Artifact References for mapping evidence directly to assessment objectives</li>
              <li>Added artifact suggestion/typeahead functionality sourced from the control's Evidence Pool</li>
              <li>Automatic Evidence Pool population when artifacts are entered directly within objectives</li>
              <li>Artifact counters and visual artifact tracking within controls</li>
              <li>Objective artifact assignment workflow designed around real-world assessment usage</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Data Persistence</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Evidence Pool entries persist across browser refreshes</li>
              <li>Objective Artifact references persist across browser refreshes</li>
              <li>Evidence data survives normal browser sessions</li>
              <li>Existing control notes, statuses, and inheritance tracking remain unchanged</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Backup &amp; Restore</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Evidence Pool entries are included in Project JSON exports</li>
              <li>Objective Artifact references are included in Project JSON exports</li>
              <li>Project JSON restore fully restores Evidence Pool and objective artifact assignments</li>
              <li>Backward compatibility maintained — Version 1 backup files continue to import successfully</li>
              <li>Missing Evidence Pool data in older backups does not overwrite existing local Evidence Pool data</li>
              <li>Added Schema Version 2 support for future expansion</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Status Automation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Controls automatically transition from Not Started to In Progress when Evidence Pool activity occurs</li>
              <li>Controls automatically transition from Not Started to In Progress when objective artifact references are added</li>
              <li>Objective artifact creation automatically adds new artifacts to the control-level Evidence Pool</li>
              <li>Existing MET and NOT MET protections remain unchanged</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Control Library</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added 📎 Artifact Indicator for controls containing objective artifact references</li>
              <li>Added Has Artifacts filter to the Control Library</li>
              <li>Artifact filtering integrates with all existing filter systems</li>
              <li>Artifact filters participate in URL-based state persistence</li>
              <li>Artifact filters are included in Clear Filters behavior</li>
              <li>Fixed stale render — Control Library now re-reads localStorage on every navigation event</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Privacy &amp; Security</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>No files are uploaded, stored, or transmitted by the application</li>
              <li>No cloud synchronization or backend database</li>
              <li>Artifact entries are text metadata only (for example: SSP.pdf, RBAC Configuration.png, User Export.xlsx)</li>
              <li>Imported project backups remain local to the user's browser</li>
            </ul>
          </section>

          <section>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Validation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Dataset unchanged — no control, evidence, or relationship modifications</li>
              <li>Controls: 110 · Evidence types: 130 · Relationships: 189 · Families: 14/14</li>
              <li>Validator: Pass · Build: Pass</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.1.2 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v1.1.2</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Workflow &amp; Ownership Update</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 4, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assessment Workflow</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Auto-resizing Assessment Notes textareas — height expands as content grows, shrinks when content is removed, no internal scrollbar during normal use</li>
              <li>Auto-resizing Objective Notes textareas — same behavior for all per-objective note fields</li>
              <li>Automatic Not Started → In Progress promotion — typing into any note field on a Not Started control automatically promotes it to In Progress</li>
              <li>Automatic In Progress → Not Started reversion — clearing all note fields on an In Progress control automatically reverts it to Not Started</li>
              <li>MET and NOT MET statuses protected — automatic status changes never affect controls marked MET or NOT MET; manual dropdown changes are unaffected</li>
              <li>Hide MET Controls toggle added to Control Library — hides MET controls from the list to let assessors focus on remaining work</li>
              <li>Hide MET Controls preference persists between sessions via localStorage</li>
              <li>If Status filter is explicitly set to MET, MET controls are shown regardless of the hide toggle</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Ownership &amp; Disclosure</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added Copyright &amp; Ownership section to About page — copyright notice, proprietary software statement, unauthorized use prohibition</li>
              <li>Added Independence &amp; Affiliation disclosures to About page — six-point statement establishing independence from C3PAOs, The Cyber AB, DIBCAC, DoD, NIST, and government agencies</li>
              <li>Added copyright footer to Home page — muted line beneath version information</li>
              <li>Added affiliation FAQ entry — positioned second (directly after official-assessment-tool question) to address primary reviewer concern early</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Project Personality</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added "Certified CMMC Assessor (CCA), Spider-Man (SM)" credential line to About page author section</li>
            </ul>
          </section>

          <section>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Validation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Dataset unchanged — no control, evidence, or relationship modifications</li>
              <li>Controls: 110 · Evidence types: 130 · Relationships: 189 · Families: 14/14</li>
              <li>Validator: Pass</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.1.1 — collapsed by default */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v1.1.1</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Production Readiness, Security &amp; Usability Update</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 3, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assessment Workflow</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Improved assessment progress dashboard — replaced status list with a 2×2 status card grid showing count and percentage per status</li>
              <li>Status cards are clickable — link to Control Library filtered by status and family</li>
              <li>Added bulk action safeguard — Clear Data now requires confirmation before overwriting any control data</li>
              <li>Fixed bulk status update and bulk Clear Data — both were silently failing due to a missing import</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Import &amp; Export</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>OSC / Client Name and Assessment Name prompts before CSV and JSON exports — pre-filled from previous export</li>
              <li>Timestamped filenames (<code>YYYY-MM-DD_HHMM</code> using local browser time) to prevent same-day collisions</li>
              <li>Last Project Backup indicator on Home page — shows when the most recent JSON backup was created</li>
              <li>CSV import: <code>.csv</code> extension required, MIME allowlist enforced, 1 MB size limit</li>
              <li>JSON import: <code>.json</code> extension required, MIME allowlist enforced, 2 MB size limit</li>
              <li>JSON restore confirmation dialog — shows exactly what will and will not be overwritten before restoring; Cancel discards with no side effects</li>
              <li>Added import/export section descriptions on Home page for first-time orientation</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Security &amp; Privacy</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Reworked About page — consolidated Data &amp; Privacy and Limitations into a single structured section covering intended use, prohibited content, storage architecture, export responsibility, and limitations</li>
              <li>Added explicit guidance against storing CUI, SSPs, network diagrams, system inventories, device configurations, screenshots, or sensitive customer documentation</li>
              <li>Clarified that no assessment data is transmitted to the developer, GitHub, or Cloudflare</li>
              <li>Added FAQ page covering 13 common questions: official tool status, server storage, CUI policy, multi-assessor sharing, browser data loss, import transmission, import protections, export format differences, internet requirements, dataset updates, tool origin, data encryption, and external file sharing</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>User Experience</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Light / Dark theme toggle with localStorage persistence — preference survives page refresh</li>
              <li>Flash prevention on hard reload — theme applied before React boots via inline head script</li>
              <li>Navigation bar permanently dark in both themes for consistent visual identity</li>
              <li>Application version and deployment environment displayed on Home page</li>
              <li>FAQ added to navigation between About and Changelog</li>
            </ul>
          </section>

          <section>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Infrastructure</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>First GitHub production release — <a href="https://github.com/Vinchyyyy/cmmc-companion" target="_blank" rel="noopener noreferrer">github.com/Vinchyyyy/cmmc-companion</a></li>
              <li>First Cloudflare Pages deployment — <a href="https://cmmc-companion.pages.dev" target="_blank" rel="noopener noreferrer">cmmc-companion.pages.dev</a></li>
              <li>Automatic CI/CD deployment enabled — push to <code>main</code> triggers build and deploy</li>
              <li>SPA routing confirmed working via <code>public/_redirects</code></li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.0.0 — collapsed by default */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v1.0.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Initial V1 Release</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 3, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>
          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Dataset</h3>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {[
                  ['Controls (practices)', '110'],
                  ['Evidence types', '130'],
                  ['Control relationships', '189'],
                  ['Control families', '14 of 14'],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{label}</td>
                    <td style={{ padding: 'var(--space-2) var(--space-3)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Features</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Complete CMMC Level 2 control family coverage (all 14 families)</li>
              <li>Dashboard with stacked progress bar and per-family status breakdown</li>
              <li>Quick Search — matches control IDs, titles, objectives, evidence, and scoring terms</li>
              <li>Control Library with family, status, inheritance, score, and POA&amp;M filters</li>
              <li>Scoring metadata — 5-point, 3-point, and 1-point deductions per control</li>
              <li>POA&amp;M eligibility — non-POA&amp;Mable controls flagged in library and filters</li>
              <li>Inheritance tracking — Full / Partial / None with per-control assignment</li>
              <li>Multi-select bulk actions — set status, set inheritance, or clear data across multiple controls</li>
              <li>Project JSON backup and restore — full state export/import</li>
              <li>CSV export — status and notes export for external tracking</li>
              <li>Evidence Lookup — search 130 evidence types by keyword or family</li>
              <li>Relationship Explorer — visualize cross-control dependencies across all 14 families</li>
              <li>Control Detail — full objectives, evidence requirements, and relationship graph per control</li>
              <li>About page</li>
              <li>Version History page (this page)</li>
            </ul>
          </section>

          <section>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assessment Guide Family Order</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              AC → AT → AU → CM → IA → IR → MA → MP → PS → PE → RA → CA → SC → SI
            </p>
          </section>
        </div>
      </details>

      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v0.9.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Final Family Expansion</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>
          <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
            <li><strong>Media Protection (MP)</strong> — 9 controls including MP.L1-3.8.3 (FAR-referenced Level 1 practice); completed V1 family coverage</li>
            <li><strong>Maintenance (MA)</strong> — 6 controls confirmed against CMMC Assessment Guide pages 149–160; MA.L2-3.7.6 added after initial estimate missed it</li>
            <li><strong>Awareness and Training (AT)</strong> — AT.L2-3.2.3 (Insider Threat Awareness) added in correction pass after initial expansion omitted it</li>
            <li><strong>Physical Protection (PE)</strong> — 6 controls; PE.L1-3.10.3, PE.L1-3.10.4, PE.L1-3.10.5 confirmed non-POA&amp;Mable (Level 1 FAR-referenced practices)</li>
            <li>Cross-family deferred edge added: MA.L2-3.7.3 → MP.L1-3.8.3 (shared NIST 800-88 sanitization requirement)</li>
          </ul>
        </div>
      </details>

      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v0.8.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Major Workflow Features</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>
          <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
            <li><strong>Progress dashboard</strong> — stacked bar chart showing MET / NOT MET / In Progress / Not Started distribution with per-family filtering</li>
            <li><strong>Quick Search</strong> — real-time search across control IDs, titles, objectives, evidence, and scoring metadata terms</li>
            <li><strong>Scoring and POA&amp;M metadata</strong> — scoring.json lookup keyed by control ID; score badges, Non-POA&amp;M badge, and filter in Control Library</li>
            <li><strong>Inheritance tracking</strong> — Full / Partial / None per control; badge in library rows; bulk-settable</li>
            <li><strong>Multi-select bulk actions</strong> — select-all with indeterminate state; bulk Set Status, Set Inheritance, Clear Data</li>
            <li><strong>Project JSON backup/restore</strong> — full state export and import via projectState.js</li>
            <li><strong>CSV export</strong> — status and notes per control</li>
            <li><strong>URL-persisted filters</strong> — filter state survives page reload; Clear Filters button</li>
          </ul>
        </div>
      </details>

      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v0.7.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Data Architecture Refactor</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>
          <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
            <li>Controls split into per-family JSON files with a shared index</li>
            <li>Evidence split into per-family and shared JSON files</li>
            <li>Relationships split into per-family and cross-family JSON files</li>
            <li>Validator script added — 8 check categories covering schema, ID format, uniqueness, referential integrity, family consistency, relationship integrity, and scoring</li>
            <li>Scoring metadata layer introduced — scoreValue, practiceType, poamAllowed, poamRestrictionReason per control</li>
            <li>Family expansion process standardized — each family expansion produces discrete data files, scoring patch, and UI patch</li>
          </ul>
        </div>
      </details>

      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v0.1.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Initial Creation</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>
          <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
            <li>React + Vite application scaffolded</li>
            <li>React Router v6 routing with Navigation component</li>
            <li>Home page — assessment status overview</li>
            <li>Control Library — filterable list of all controls with status tracking</li>
            <li>Control Detail — full objectives, evidence, and relationship view per control</li>
            <li>Evidence Lookup — search evidence types by keyword or family</li>
            <li>Relationship Explorer — cross-control dependency visualization</li>
            <li>localStorage persistence for assessment status and notes</li>
          </ul>
        </div>
      </details>
    </div>
  )
}

export default Changelog
