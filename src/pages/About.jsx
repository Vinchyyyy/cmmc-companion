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

      {/* 1. Project Author */}
      <section>
        <h2>Project Author</h2>
        <p>
          <strong>Vincent Azada, CCA</strong><br />
          Certified CMMC Assessor (CCA), Spider-Man (SM)<br />
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

      {/* 2. Copyright & Ownership */}
      <section>
        <h2>Copyright &amp; Ownership</h2>
        <p>Copyright &copy; 2026 Vincent Azada. All rights reserved.</p>
        <p>
          CMMC Companion is proprietary software and an independent personal project created and
          maintained by Vincent Azada.
        </p>
        <p>
          Unauthorized reproduction, redistribution, resale, commercial repackaging, or creation
          of derivative works is prohibited without prior written permission from the author.
        </p>

        <h3>Independence &amp; Affiliation</h3>
        <ul>
          <li>CMMC Companion is an independently developed software project.</li>
          <li>This project is not affiliated with, endorsed by, sponsored by, operated by, or maintained on behalf of any C3PAO.</li>
          <li>This project is not affiliated with The Cyber AB, DIBCAC, the Department of Defense, NIST, or any government agency.</li>
          <li>References to CMMC, NIST publications, assessment methodologies, controls, objectives, evidence requirements, and assessment workflows are provided solely for educational and workflow-support purposes.</li>
          <li>Use of this software does not constitute an official assessment, certification, validation, consulting engagement, or compliance determination.</li>
          <li>Users remain solely responsible for assessment decisions, evidence evaluation, documentation, and compliance determinations.</li>
        </ul>
      </section>

      {/* 3. Data Handling, Privacy & Limitations */}
      <section id="data-handling">
        <h2>Data Handling, Privacy &amp; Limitations</h2>

        <h3>Intended Use</h3>
        <p>CMMC Companion is intended to assist with:</p>
        <ul>
          <li>Assessment planning and preparation</li>
          <li>Control review and objective analysis</li>
          <li>Evidence mapping and artifact identification</li>
          <li>Control relationship analysis</li>
          <li>Assessment progress tracking</li>
        </ul>
        <p>
          The application is designed as a workflow and reference aid — not as a repository for
          assessment artifacts or sensitive organizational documentation.
        </p>

        <h3>Not Intended For</h3>
        <p>
          Users should not use CMMC Companion to store or document:
        </p>
        <ul>
          <li>Controlled Unclassified Information (CUI)</li>
          <li>System Security Plans (SSPs)</li>
          <li>Assessment artifacts or evidence packages</li>
          <li>Network diagrams or system architecture documentation</li>
          <li>System inventories or asset lists</li>
          <li>Configuration exports or technical baselines</li>
          <li>Customer or organizational documentation</li>
          <li>Screenshots or other materials containing sensitive information</li>
        </ul>

        <h3>Storage Architecture</h3>
        <p>
          All project state — assessment status, notes, inheritance assignments — is stored
          exclusively in your browser's <code>localStorage</code>. Specifically:
        </p>
        <ul>
          <li>No backend database exists</li>
          <li>No user accounts or sessions exist</li>
          <li>No server-side storage exists</li>
          <li>No assessment data is transmitted to the developer, GitHub, or Cloudflare</li>
          <li>No analytics or telemetry collect assessment content</li>
          <li>Clearing browser data will erase your project state — use the JSON export on the Home page to back up your work</li>
        </ul>

        <h3>Export Responsibility</h3>
        <p>
          CSV and JSON exports are generated locally by your browser and downloaded directly to
          your device. No export data passes through any external server. Users are responsible
          for handling exported files in accordance with their organization's data handling
          requirements. Exported files should be reviewed before sharing or transmitting.
        </p>

        <h3>Limitations</h3>
        <ul>
          <li>CMMC Companion is not an official Cyber AB or DoD assessment platform</li>
          <li>It does not produce documentation that satisfies C3PAO or DoD assessment requirements</li>
          <li>It does not replace the judgment of a Certified Third-Party Assessment Organization (C3PAO) or a Certified CMMC Professional (CCP/CCA)</li>
          <li>It does not replace required assessment documentation or official reporting processes</li>
          <li>All final compliance determinations must be made by a qualified assessor through the official CMMC assessment process</li>
        </ul>

        <h3>Important</h3>
        <p>
          CMMC Companion was intentionally designed to support assessment planning and workflow
          management without requiring Controlled Unclassified Information (CUI) for normal
          operation. Users should avoid storing CUI, assessment artifacts, SSPs, network diagrams,
          inventories, screenshots, or other sensitive customer documentation within the
          application.
        </p>
      </section>

      {/* 4. How to Use */}
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

      {/* 5. Dataset */}
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

      {/* 6. Source Methodology */}
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
    </div>
  )
}

export default About
