import { APP_VERSION } from '../utils/version'

function Changelog() {
  return (
    <div className="page">
      <h1>Version History</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
        A curated release history for CMMC Companion, focused on major milestones rather than every internal development note.
        Current version: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{APP_VERSION}</span>
      </p>

      {/* v3.2.0 — current release, open by default */}
      <details open style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v3.2.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Findings Builder, Guide-Aware Reuse, and Export Integrity</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 24, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds the objective-level Findings Builder, findings export into the official Assessment Results Template, guide-aware compound artifact reuse scoring, tiered/collapsible/paginated suggested artifact reuse, Project JSON artifact tag export/import integrity, and a Wipe Entire Project safety action.
          </p>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Findings Builder</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added an objective-level Findings Builder for standardized Assessment Validation Statements</li>
              <li>Added interviewed role/title chips using controlled assessment role categories</li>
              <li>Added generated Findings Preview with Interviewed, Reviewed, Validation Reference, Findings/Differences, and Confirmation sections</li>
              <li>Added support for finding differences, including alternate "not implemented" confirmation language when differences are noted</li>
              <li>Findings are saved per objective and can be edited or cleared without overwriting Interview, Examine, Test, or Overall Comments notes</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Official Assessment Results Template Export</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Restored the Assessment Workbook export to use the official CMMC Level 2 Assessment Results Template format</li>
              <li>Wired saved objective Findings Builder statements into the official template Findings column</li>
              <li>Preserved finding statement line breaks in the export</li>
              <li>Updated evidence/artifact formatting so each evidence item ends with a semicolon</li>
              <li>Populated Time to Assess in minutes using objective-level DIBCAC assessment standard logic</li>
              <li>Kept the exporter focused on the official results template rather than a custom consultation workbook</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Project JSON Export / Import Integrity</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Fixed Project JSON export/import so artifact evidence tags are preserved and restored correctly</li>
              <li>Ensured artifact mappings and artifact tags both survive wipe/export/import round trips</li>
              <li>Preserved safe import behavior for older project JSON files without artifact tag data</li>
              <li>Confirmed restored tags are available to Documented Artifacts and reuse suggestion logic after import</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Guide-Aware Artifact Reuse</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Refactored Suggested Artifacts reuse logic into a stricter deterministic evidence-profile scoring model</li>
              <li>Added Assessment Guide evidence-object context as a reuse scoring signal</li>
              <li>Added guide-derived assessment profile metadata for all 110 Level 2 practices</li>
              <li>Improved artifact matching using evidence tags, expected tags, compound tag combinations, guide evidence objects, existing mappings, and relationship context</li>
              <li>Preserved the rule that untagged artifacts are excluded from primary reuse suggestions</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Tiered Suggested Reuse UX</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Tuned Strong Suggestions and Related Candidates so Strong Suggestions remain high-confidence</li>
              <li>Kept broad or weak Tier 3 candidates hidden from assessor-facing suggestion lists</li>
              <li>Added per-tier result caps to keep suggestions focused</li>
              <li>Added collapsible Related Candidates and per-tier pagination (5 items per page)</li>
              <li>Preserved assignment behavior while making suggestion lists more assessment-useful</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Evidence Tag Picker</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Redesigned the evidence tag picker into a categorized chip/pill selector</li>
              <li>Added selected tag chips, clearer category segmentation, and improved tag search</li>
              <li>Added alias/related-word search support for common terms such as VPN, MFA, Entra, firewall, logs, risk, visitor, and training</li>
              <li>Preserved the controlled evidence tag taxonomy and avoided free-form tags</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Project Safety Actions</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added a Wipe Entire Project action in Project Actions</li>
              <li>Added a two-stage confirmation flow requiring explicit final confirmation before clearing local project state</li>
              <li>Preserved static app data while clearing local assessment/project state</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Control Detail Suggested Artifacts</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added a View Suggested Artifacts popup near Assigned Artifacts</li>
              <li>Suggested artifacts now appear in a floating modal instead of disrupting the Control Detail layout</li>
              <li>Suggestions remain tag-informed guidance and do not determine assessment outcomes</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Validation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>No scoring determination, POA&amp;M, Sheet2 scoring, or compliance outcome automation was added</li>
              <li>DIBCAC assessment standards remain supplemental objective-level metadata</li>
              <li>Project data remains local-first and browser-based</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v3.1.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v3.1.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>DIBCAC Mode &amp; Assessment Planning</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 23, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds the DIBCAC Mode assessment planning workspace, objective-level DIBCAC assessment standard metadata, review group workflows, a redesigned evidence tag picker, and Assessment Guide Discussion on Control Detail.
          </p>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>DIBCAC Mode</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added a new DIBCAC Mode workspace for objective-level assessment planning</li>
              <li>Added objective grouping by DIBCAC assessment standard: Document, Screen Share, Artifact, Physical Review, Artifact + Screen Share, and Unmapped</li>
              <li>Added method, family, and search filters for assessment objective planning</li>
              <li>Added collapsible method, family, and control groupings for compact review</li>
              <li>Added review group creation, editing, objective selection, planned ask notes, and saved local review groups</li>
              <li>Added objective preview behavior inside DIBCAC Mode without navigating away</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Objective-Level DIBCAC Assessment Standards</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added supplemental objective-level DIBCAC assessment standard metadata</li>
              <li>Added DIBCAC Standard chips to Control Detail objectives</li>
              <li>Preserved current control/objective data as the source of truth</li>
              <li>Unmapped objectives remain visible where the source data does not provide a standard</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Control Detail — Review Group Integration</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added Review Group display to the Control Detail objective header</li>
              <li>Added centered modal workflow to add an objective to an existing review group or create a new review group from Control Detail</li>
              <li>Review groups remain local browser planning data and are not included in project exports yet</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assessment Guide Discussion</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added Assessment Guide Discussion content to the Control Detail top summary area</li>
              <li>Split the upper Control Detail area so Evidence Pool / Expected Evidence Types and Assessment Guide Discussion are visible together</li>
              <li>Extended the Assessment Guide Discussion panel for visual balance</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Evidence Tag Picker</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Redesigned the evidence tag picker into a modern categorized chip/pill selector</li>
              <li>Added selected tag chips, clearer category segmentation, and improved search</li>
              <li>Added related-word / alias matching so searches like VPN, MFA, Entra, firewall, logs, risk, visitor, and training surface more intuitive controlled tags</li>
              <li>Preserved controlled tag taxonomy — free-form tags are not supported</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Validation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>No scoring, POA&amp;M, or Sheet2 DIBCAC scoring logic was added in this release</li>
              <li>Project import/export behavior was not changed</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v3.0.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v3.0.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>UI Workspace Overhaul</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 23, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            A major interface overhaul that turns CMMC Companion into a cleaner assessment workspace with redesigned dashboards, libraries, relationship views, documented artifact workflows, and a merged About/FAQ page.
          </p>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Home — Assessment Dashboard</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Redesigned Home into a full assessment dashboard with control, objective, artifact, and attention summaries</li>
              <li>Added assessment progress, family progress, needs attention, inheritance source, continue review, and project action sections</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Control Library</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Refined the main Control Library layout and filter experience</li>
              <li>Added a consolidated filter modal with clearer chip-based filter selection</li>
              <li>Improved family navigation and active filter visibility</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Control Detail</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Redesigned the control detail workspace for wider responsive layouts</li>
              <li>Added cleaner stacked metadata for status, inheritance, inherited-from sources, trending, and assignment</li>
              <li>Added objective-level inheritance chips</li>
              <li>Replaced objective status dropdowns with MET / NOT MET pill controls</li>
              <li>Refined expected evidence, guidance, assigned artifacts, and suggested artifact sections</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Evidence Library</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Renamed Evidence Lookup to Evidence Library</li>
              <li>Redesigned the page into a categorized evidence reference library</li>
              <li>Added category navigation, improved evidence cards, likely control links, and assessor context</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Relationship Explorer</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Redesigned the empty state into a family/control launcher</li>
              <li>Added a more visual relationship exploration workflow</li>
              <li>Improved relationship board/card layout and supporting evidence presentation</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Documented Artifacts</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Renamed Artifact Map to Documented Artifacts</li>
              <li>Redesigned artifact management into a table-based workspace</li>
              <li>Added category filtering, chip-based filter modal, evidence tag filtering, sortable mappings/reuse columns, expandable artifact rows, mapping pagination, and clearer status logic</li>
              <li>Updated status logic: Untagged, Tagged, and Mapped</li>
              <li>Preserved tag-driven reuse opportunities and artifact registry source-of-truth behavior</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>About + FAQ</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Merged About and FAQ into one About page</li>
              <li>Added workspace guide, privacy model, assessment boundaries, FAQ accordion, dataset summary, and project/version information</li>
              <li>Removed the redundant FAQ navigation item</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Validation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Validator: Passed — 110 controls, 320 objectives, 130 evidence types, 189 relationships, 66 evidence tags</li>
              <li>Build: Passed</li>
              <li>No changes to CMMC controls, evidence types, relationship data, or scoring logic</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v2.0 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v2.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Evidence Tag Registry &amp; Artifact Reuse</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 19, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Evidence Tags</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added controlled evidence tag taxonomy — 66 tags across 17 categories covering all 14 CMMC control families</li>
              <li>All 320 assessment objectives now have expected evidence tag mappings (one objective intentionally waived: IA.L2-3.5.11[a])</li>
              <li>Tags classify artifact evidence types — guidance only; they do not determine objective outcomes</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Artifact Tag Editing</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Artifact evidence tags are now editable from the Artifact Map via a tag picker modal</li>
              <li>Artifact evidence tags are also editable from ControlDetail artifact suggestion modals</li>
              <li>Tag picker supports search, category browsing, checkbox selection, and removable chip selections</li>
              <li>Assigned-tags chip area shows at the top of the picker with individual chip X-removal</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>ControlDetail — Suggested Existing Artifacts</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Each assessment objective now surfaces a collapsed list of existing artifacts from related controls</li>
              <li>Suggestions are relationship-gated — only controls linked via evidence_reuse relationships contribute candidates</li>
              <li>Tag alignment is computed against the target objective's expected tags and used to rank and label candidates</li>
              <li>Tags explain and rank suggestions — they do not filter or suppress candidates</li>
              <li>Tag-only candidate discovery (no relationship backing) remains deferred</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Artifact Map — Tag-Gated Reuse</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Tagged artifacts show a collapsed Potential Reuse Opportunities section sourced from existing relationship data</li>
              <li>Untagged artifacts show a compact prompt inside the evidence tags card; reuse section is hidden</li>
              <li>Untagged artifact titles are visually highlighted in red</li>
              <li>Reuse pagination: 5 candidates per page with range display and Previous / Next controls</li>
              <li>Relationship gating remains the source of truth — no tag-only discovery added</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>ControlDetail — Common Artifacts</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Common Artifacts section removed from ControlDetail UI</li>
              <li>Underlying data is preserved in full — search indexing and Evidence Lookup remain unaffected</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Validation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Validator: Passed — 110 controls, 320 objectives, 130 evidence types, 189 relationships, 66 evidence tags</li>
              <li>Build: Passed</li>
              <li>No changes to scoring, assessment status, control definitions, or validator logic</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.6 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v1.6</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Official Assessment Template Export &amp; Assessment Guide Reconciliation</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 13, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Official Assessment Template Export</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Bundled official CMMC Level 2 Assessment Results Template into the application</li>
              <li>Removed template upload requirement — export is now one click</li>
              <li>Added OSC Name and Assessment Name export dialog</li>
              <li>Added standardized export filename: <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>CMMC_Companion_&#123;OSC&#125;_&#123;Assessment&#125;_Assessment_Results.xlsx</span></li>
              <li>Promoted as the primary assessment deliverable in the export UI</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Export Engine Rewrite</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Replaced SheetJS workbook reconstruction with JSZip-based XML patching</li>
              <li>Previous approach rebuilt the workbook from scratch, stripping all formatting, styles, CUI metadata, data validation dropdowns, and compliance markings</li>
              <li>New approach opens the official workbook package directly, locates the Requirement Objectives worksheet, and patches only target cells</li>
              <li>Exported workbook is now visually identical to the official template</li>
              <li>Preserved: styles.xml, sharedStrings.xml, customXml, docMetadata (CUI sensitivity labels), printerSettings, data validations, merged cells, hidden sheets, and full workbook structure</li>
              <li>File size reduced from ~1.2 MB (SheetJS reconstruction) to ~78 KB (surgical patch)</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assessment Guide Reconciliation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Performed objective-by-objective comparison against the official CMMC Assessment Guide Level 2</li>
              <li><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>RA.L2-3.11.1</span> — corrected from 5 objectives to official 2 objectives</li>
              <li><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>RA.L2-3.11.2</span> — corrected from 4 objectives to official 5 objectives</li>
              <li><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>RA.L2-3.11.3</span> — corrected from 1 objective to official 2 objectives</li>
              <li><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>SI.L1-3.14.5</span> — corrected objective wording to match official guide</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Objective Standardization</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Restored official assessment guide punctuation formatting across all objectives</li>
              <li>Final objectives end with <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>.</span></li>
              <li>Penultimate objectives end with <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>; and</span></li>
              <li>Intermediate objectives end with <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>;</span></li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Objective Count Alignment</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Previous objective count: 321</li>
              <li>Current objective count: 320</li>
              <li>Official Assessment Guide: 320</li>
              <li>Tool objective inventory now aligns with the official assessment guide</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Export Simplification</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Removed all temporary Risk Assessment export workaround logic</li>
              <li>Direct objective mapping — no RA-specific translation layer</li>
              <li>Cleaner export pipeline with reduced maintenance surface</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Validation Improvements</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added validation checks for official objective counts</li>
              <li>Added RA control structure validation</li>
              <li>Added SI.L1-3.14.5 structure validation</li>
              <li>Added objective punctuation standards validation</li>
              <li>Added template alignment requirement checks</li>
              <li>All validation checks passing</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>UI Improvements</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Official Assessment Template export promoted as the primary assessment deliverable</li>
              <li>Backup and recovery workflows separated from deliverable generation</li>
              <li>Export experience simplified and streamlined</li>
              <li>Validator: Passed — 110 controls, 320 objectives, 130 evidence types, 189 relationships</li>
              <li>Build: Passed</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.5.1 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v1.5.1</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Artifact Intelligence &amp; Usability Update</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 10, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Artifact Map</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added direct objective-level navigation using <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>/controls/&#123;controlId&#125;#objective-&#123;objectiveId&#125;</span></li>
              <li>Artifact usages now link directly to the specific objective instead of only the parent control</li>
              <li>Added Potential Reuse Opportunities section for artifacts</li>
              <li>Added relationship-driven evidence reuse suggestions</li>
              <li>Added collapsible reuse suggestion sections</li>
              <li>Added one-click artifact reuse assignment via +</li>
              <li>Accepted suggestions immediately disappear after assignment</li>
              <li>Added per-artifact suggestion pagination</li>
              <li>Added Previous / Next navigation with page indicators (5 results per page)</li>
              <li>Added category-based artifact grouping (collapsed by default)</li>
              <li>Added Expand All / Collapse All controls</li>
              <li>Added artifact sorting: Most Connections, Least Connections, Name A–Z, Name Z–A</li>
              <li>Removed Evidence Pool-only entries from Artifact Map display</li>
              <li>Artifact Map statistics now reflect objective-level usage only</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Relationship-Driven Recommendations</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Implemented Phase 1 relationship-driven evidence reuse recommendations</li>
              <li>Suggestions are generated directly from the relationship dataset</li>
              <li>Added explanation text showing relationship source and type</li>
              <li>Added direct navigation from suggestions to target objectives</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Navigation &amp; Deep Linking</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added objective anchor support for direct objective navigation</li>
              <li>Artifact Map and reuse recommendations now support direct objective navigation</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Informational Panels</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added reusable InfoPanel component</li>
              <li>Deployed page purpose panels to: Home, Control Library, Environment Profile, Artifact Map, Relationship Explorer, Evidence Lookup</li>
              <li>Panels provide page purpose, assessment context, and common usage guidance</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assignment Improvements</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added assignee normalization — names stored consistently in Title Case</li>
              <li>Eliminates duplicate assignee variants caused by capitalization differences</li>
              <li>Examples: vince → Vince, VINCE → Vince, alex smith → Alex Smith</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Quality of Life</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Improved assessment navigation flow</li>
              <li>Reduced Artifact Map clutter</li>
              <li>Improved evidence reuse discovery</li>
              <li>Improved objective-level workflow efficiency</li>
              <li>Added page-level orientation for new users</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Validation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Validator: Passed — 110 controls, 130 evidence types, 189 relationships</li>
              <li>Build: Passed</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.5.0 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v1.5.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Assessment Intelligence &amp; Artifact Analysis</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 9, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assessment Intelligence &amp; Artifact Analysis</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Introduced Artifact Map as a centralized evidence analysis workspace</li>
              <li>Added global artifact indexing across controls and objectives</li>
              <li>Added artifact search and usage tracking</li>
              <li>Added Most Connections and Least Connections sorting</li>
              <li>Added reused-artifact filtering</li>
              <li>Added artifact usage statistics and summary metrics</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Kill Chain Categorization</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added ComplianceForge Kill Chain category framework</li>
              <li>Mapped all 110 controls into operational assessment categories</li>
              <li>Added control-to-kill-chain lookup dataset</li>
              <li>Added kill chain utility helpers for future workflow expansion</li>
              <li>Added category grouping within Artifact Map</li>
              <li>Added category-level artifact and usage summaries</li>
              <li>Added category filtering support</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Artifact Navigation &amp; Traceability</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added direct navigation from Artifact Map usages to source objectives</li>
              <li>Added objective anchor navigation support</li>
              <li>Added hover context showing source control titles</li>
              <li>Improved cross-control evidence traceability</li>
              <li>Added objective-level deep linking support</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Evidence Reuse Recommendations</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added relationship-driven evidence reuse recommendations</li>
              <li>Suggestions generated from related controls and objectives</li>
              <li>Existing artifacts can be reused with a single click</li>
              <li>Suggestions automatically exclude already-assigned artifacts</li>
              <li>Added source control and objective attribution</li>
              <li>Added direct navigation to source objectives</li>
              <li>Added collapsible recommendation sections per objective</li>
              <li>Recommendations remain optional and non-destructive</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Artifact Map UX Improvements</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Removed Evidence Pool entries from Artifact Map display</li>
              <li>Artifact counts now reflect objective usage only</li>
              <li>Reduced duplicate artifact visibility</li>
              <li>Improved signal-to-noise ratio for evidence analysis</li>
              <li>Added category collapse and expand workflow</li>
              <li>Improved artifact browsing experience</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assessment Chain Foundation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Established foundation for future kill-chain workflows</li>
              <li>Created reusable operational-category data model</li>
              <li>Prepared platform for future assessment acceleration features</li>
              <li>Prepared platform for future evidence reuse intelligence</li>
              <li>Prepared platform for future chain-based assessment workflows</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Validation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Existing project data remains compatible</li>
              <li>Existing backups remain importable</li>
              <li>No schema migration required</li>
              <li>No storage format changes introduced</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.4.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v1.4.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span>Assessment Collaboration &amp; Provider Catalog Update</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 8, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assignment Tracking</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added Assigned To field in Control Detail — assign any control to a named assessor or team member</li>
              <li>Assignments are free-text with name suggestions drawn from existing local assignments</li>
              <li>Blank assignment clears the field and removes the storage key</li>
              <li>Added Assigned To display in Quick Look panel — shows assignee or "Unassigned"</li>
              <li>Added bulk Set Assignment action in Multi-Select toolbar — write or clear assignments across multiple controls simultaneously</li>
              <li>Assignment suggestions in the bulk modal reflect currently used names</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assignment Import/Export</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Assignments are included in Project JSON exports when nonblank</li>
              <li>Assignments are restored during Project JSON import</li>
              <li>Added Assignments category to Advanced Import Options</li>
              <li>Import summary reports the number of assignments written</li>
              <li>Replace and Fill Empty Only modes both supported for assignments</li>
              <li>Older backups without assignment data import normally — backward compatible</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assignment Coverage Dashboard</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added Assignment Coverage section to Home page dashboard</li>
              <li>Displays Assigned Controls count and Unassigned Controls count</li>
              <li>Assigned Controls count links to Control Library filtered to assigned controls</li>
              <li>Unassigned Controls count links to Control Library filtered to unassigned controls</li>
              <li>Section is read-only — no localStorage writes from the dashboard</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Provider Catalog</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added provider catalog with 31 curated entries across 7 categories: Identity &amp; Access, Endpoint Management, Microsoft 365, Cloud, Security Operations, Backup, and Network/Infrastructure</li>
              <li>Inheritance Source field in Control Detail now shows searchable provider suggestions while typing</li>
              <li>Suggestions match provider name and category — case-insensitive</li>
              <li>Clicking a suggestion writes the exact canonical provider name</li>
              <li>Custom provider names and free-text values remain fully supported — no forced selection</li>
              <li>Provider suggestions also available in the bulk inheritance modal</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Inheritance Sources Dashboard</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added Inheritance Sources summary to Home page dashboard</li>
              <li>Displays providers and sources currently in use with proportional bar visualization</li>
              <li>Counts sourced directly from local data — custom providers appear automatically</li>
              <li>Includes Top 5 / Top 10 / All view selector</li>
              <li>Each row is clickable — links to Control Library filtered by that source</li>
              <li>Section placed directly below assessment status cards for immediate visibility</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Advanced Filtering Expansion</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added Inheritance Source filter in Advanced Filters — shows only sources actively used in local data</li>
              <li>Added Assigned To filter in Advanced Filters — options: All assignees, Assigned, Unassigned, or specific assignee name</li>
              <li>Both filters participate in URL-based filter state persistence</li>
              <li>Both filters are included in Clear Filters behavior</li>
              <li>Both filters contribute to the More Filters active count badge</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Inheritance Badge Improvements</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Inheritance badges in Control Library rows now display the source alongside the status</li>
              <li>Format: Partial — AWS GovCloud / Full — Microsoft 365 GCC High</li>
              <li>Badge tooltip includes full inheritance label for long source names</li>
              <li>Falls back to status-only label when no source is documented</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Objective Results Framework</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added structured assessment result fields per objective: Interview, Examine, Test, and Overall Comments</li>
              <li>Objective result fields persist locally per control and objective</li>
              <li>Objective results included in Project JSON export and import</li>
              <li>Import summary reports objective results written</li>
              <li>Older backups without objective result data import normally</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Sticky Multi-Select Toolbar</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Multi-Select bulk action toolbar is now sticky — remains visible while scrolling through the Control Library</li>
              <li>Toolbar pins to the top of the viewport when the user scrolls past it</li>
              <li>All bulk actions remain accessible without scrolling back to the top</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Copy From Control Workflow</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Added Copy From Control action in Multi-Select toolbar</li>
              <li>Allows copying assessment attributes from one source control to multiple selected controls</li>
              <li>Copyable attributes: Assessment Status, Inheritance Status, Inheritance Source, Evidence Pool</li>
              <li>Source control is selected using a searchable picker</li>
              <li>Copy operation is scoped to selected controls only — no unintended writes</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Assessment Notes &amp; Objective Notes Simplification</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Assessment Notes field hidden from Control Detail UI to reduce clutter — field data and storage are fully preserved</li>
              <li>Objective Notes section streamlined for focus on objective-level assessment work</li>
              <li>All note data remains accessible via export/import and is not removed from storage</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Import Summary Improvements</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Import result summary now reports assignments written</li>
              <li>Import summary reports objective results written</li>
              <li>Fill Empty Only mode skips count reported when values are not overwritten</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Searchable Source Pickers</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Inheritance Source field uses a provider-catalog-backed suggestion dropdown</li>
              <li>Assigned To field uses a local-name-backed suggestion dropdown</li>
              <li>Copy From Control uses a control-search picker with ID and title matching</li>
              <li>All pickers use onMouseDown to avoid focus-loss issues during selection</li>
              <li>All pickers support keyboard-accessible custom entry — no forced catalog selection</li>
            </ul>
          </section>

          <section>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Validation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              <li>Existing assessment data remains compatible — no migration required</li>
              <li>Existing project backups remain importable</li>
              <li>Assignment storage uses separate localStorage key prefix — no conflicts with existing data</li>
              <li>Local-only data handling model preserved — no cloud storage, no CUI transmission, no authentication introduced</li>
              <li>Controls: 110 · Evidence types: 130 · Relationships: 189 · Families: 14/14</li>
              <li>Validator: Pass · Build: Pass</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.3.0 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v1.3.0</span>
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
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v1.2.0</span>
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
