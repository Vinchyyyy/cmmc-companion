function Changelog() {
  return (
    <div className="page">
      <h1>Version History</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
        A curated release history for CMMC Companion, focused on major milestones rather than every internal development note.
      </p>

      <details open style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v1.0.0</span>
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
