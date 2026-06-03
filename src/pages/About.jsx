function About() {
  return (
    <div className="page">
      <h1>About CMMC Companion</h1>
      <p>
        CMMC Companion is an offline planning tool for organizations preparing for a CMMC Level 2
        assessment. It provides a structured reference to all 110 Level 2 practices, assessment
        objectives, evidence requirements, control relationships, and scoring impacts — in one
        place, in your browser.
      </p>

      <section>
        <h2>Project Author</h2>
        <p>
          <strong>Vincent Azada, CCA</strong><br />
          Certified CMMC Assessor (CCA)<br />
          Bachelor of Science in Cybersecurity &amp; Information Assurance
        </p>
        <p>
          This project was created to provide a practical companion tool for navigating CMMC Level 2
          controls, evidence mapping, scoring methodology, relationship analysis, and assessment
          preparation workflows.
        </p>
        <p>
          <a href="https://www.linkedin.com/in/vincent-azada/" target="_blank" rel="noopener noreferrer">
            linkedin.com/in/vincent-azada
          </a>
        </p>
      </section>

      <section>
        <h2>Dataset</h2>
        <p>All data is derived from official CMMC and NIST source documents.</p>
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

      <section>
        <h2>How to Use</h2>
        <ul>
          <li><strong>Dashboard (Home)</strong> — Track overall and per-family assessment progress. Use Quick Search to find controls by keyword, status, or scoring term.</li>
          <li><strong>Control Library</strong> — Browse all 110 practices. Filter by family, status, inheritance, score, or POA&amp;M eligibility. Mark controls as MET, NOT MET, or In Progress. Add notes and set inheritance from a shared service.</li>
          <li><strong>Control Detail</strong> — View full assessment objectives, evidence requirements, and cross-control relationships for any practice.</li>
          <li><strong>Evidence Lookup</strong> — Search 130 evidence types to identify artifacts needed for specific controls or families.</li>
          <li><strong>Relationship Explorer</strong> — Visualize how controls support, depend on, or relate to each other across all 14 families.</li>
          <li><strong>Export / Import</strong> — Use the Home page to export your assessment state as CSV or a full project JSON backup, and restore it later.</li>
        </ul>
      </section>

      <section>
        <h2>Data &amp; Privacy</h2>
        <p>
          All project state — assessment status, notes, inheritance assignments — is stored exclusively
          in your browser's <code>localStorage</code>. Nothing is transmitted to any server.
          There is no telemetry, no analytics, and no network calls of any kind.
          Clearing your browser data will erase your project state; use the JSON export on the
          Home page to back up your work.
        </p>
      </section>

      <section>
        <h2>Source Methodology</h2>
        <p>Control data, scoring, and POA&amp;M eligibility are derived from:</p>
        <ul>
          <li>CMMC Level 2 Assessment Guide (DoD, current release)</li>
          <li>NIST SP 800-171 Rev. 2 — Protecting Controlled Unclassified Information in Nonfederal Systems and Organizations</li>
          <li>CMMC Scoring Methodology (DoD, current release) — defines 5-point basic, 3-point, and 1-point derived practice weights</li>
          <li>POA&amp;M requirements as specified in the CMMC Program rule and associated DoD guidance</li>
        </ul>
      </section>

      <section>
        <h2>Limitations</h2>
        <p>
          CMMC Companion is a <strong>planning and preparation companion only</strong>. It is not an
          official assessment record and does not produce documentation that satisfies C3PAO or
          DoD assessment requirements. It does not replace the judgment of a Certified Third-Party
          Assessment Organization (C3PAO) or a Certified CMMC Professional (CCP/CCA).
          All final compliance determinations must be made by a qualified assessor through the
          official CMMC assessment process.
        </p>
      </section>
    </div>
  )
}

export default About
