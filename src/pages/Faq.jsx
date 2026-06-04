function Faq() {
  return (
    <div className="page">
      <h1>FAQ</h1>
      <p>
        This page answers common questions about CMMC Companion, its intended use, privacy model,
        import/export behavior, and assessment support capabilities.
      </p>

      <section>
        <h2>Is this an official CMMC assessment tool?</h2>
        <p>
          No. CMMC Companion is an assessment support and reference tool. It does not replace a
          C3PAO assessment, CCP, CCA, or any official Cyber AB process.
        </p>
      </section>

      <section>
        <h2>Does this tool store data on a server?</h2>
        <p>
          No. Assessment data is stored locally within the browser using <code>localStorage</code>.
          No backend database exists and no assessment data is transmitted to a server.
        </p>
      </section>

      <section>
        <h2>Can CUI be stored in this tool?</h2>
        <p>
          No. The tool is intended for assessment tracking, evidence planning, relationship
          analysis, scoring preparation, and note taking that does not contain Controlled
          Unclassified Information (CUI).
        </p>
        <p>Users should not store:</p>
        <ul>
          <li>CUI</li>
          <li>SSP content</li>
          <li>Network diagrams</li>
          <li>System inventories</li>
          <li>Device configurations</li>
          <li>Screenshots containing customer data</li>
          <li>Sensitive customer documentation</li>
        </ul>
      </section>

      <section>
        <h2>Can multiple assessors share the same project?</h2>
        <p>
          Yes. Assessment progress can be shared through CSV exports or complete JSON project
          backups. File handling and distribution remain the responsibility of the assessment team.
        </p>
      </section>

      <section>
        <h2>What happens if browser data is cleared?</h2>
        <p>
          Locally stored assessment progress will be removed. Export Project JSON should be used
          periodically to create backups.
        </p>
      </section>

      <section>
        <h2>Are imported files uploaded anywhere?</h2>
        <p>
          No. Imported CSV and JSON files are processed locally in the browser and are never
          transmitted to a server.
        </p>
      </section>

      <section>
        <h2>What protections exist against invalid imports?</h2>
        <p>The application includes:</p>
        <ul>
          <li>Extension validation</li>
          <li>MIME validation</li>
          <li>File size limits</li>
          <li>Schema validation</li>
          <li>Restore confirmation dialogs</li>
          <li>Local-only processing</li>
        </ul>
      </section>

      <section>
        <h2>Why are there both CSV and JSON exports?</h2>
        <p><strong>CSV Export</strong> is intended for:</p>
        <ul>
          <li>Assessment progress sharing</li>
          <li>Excel review</li>
          <li>Statuses, inheritance selections, and notes</li>
        </ul>
        <p><strong>JSON Export</strong> is intended for:</p>
        <ul>
          <li>Full project backup and recovery</li>
          <li>Includes objective notes in addition to all CSV fields</li>
        </ul>
      </section>

      <section>
        <h2>Is internet access required?</h2>
        <p>
          No. Once loaded, the application functions entirely within the browser. Assessment
          data remains local.
        </p>
      </section>

      <section>
        <h2>How often is the dataset updated?</h2>
        <p>
          The dataset is updated when controls, evidence mappings, relationship mappings, scoring
          guidance, or usability improvements are released.
        </p>
      </section>

      <section>
        <h2>Why was this tool created?</h2>
        <p>
          CMMC Companion was created to provide assessors and assessment teams with an
          offline-first reference for controls, evidence mapping, relationship analysis, scoring
          preparation, and assessment tracking without requiring assessment data to be uploaded to
          a third-party service.
        </p>
      </section>

      <section>
        <h2>Is assessment data encrypted?</h2>
        <p>
          No. Assessment data is stored in browser <code>localStorage</code>. Users are responsible
          for protecting exported files and securing the workstation used to access the application.
        </p>
      </section>

      <section>
        <h2>Can exported files be shared externally?</h2>
        <p>
          Only after appropriate review. Users are responsible for ensuring exported files do not
          contain sensitive customer information, CUI, or other protected data.
        </p>
      </section>
    </div>
  )
}

export default Faq
