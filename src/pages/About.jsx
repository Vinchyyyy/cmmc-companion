import { useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_VERSION, APP_DEPLOYMENT } from '../utils/version.js'

// ── FAQ data ──────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Is this an official CMMC assessment tool?',
    a: 'No. CMMC Companion is an independent assessment support and reference tool. It does not replace a C3PAO assessment, CCP, CCA, or official Cyber AB process.',
  },
  {
    q: 'Does this tool store data on a server?',
    a: 'No. Assessment progress is stored locally in your browser using localStorage. There is no backend database for assessment project data. No assessment data is transmitted to the developer, GitHub, or Cloudflare.',
  },
  {
    q: 'Can CUI be stored in this tool?',
    a: 'No. Do not enter CUI, sensitive customer data, system diagrams, real evidence files, screenshots containing customer data, or other sensitive organizational documentation. The tool is designed for artifact names, notes, and reference use only.',
  },
  {
    q: 'What happens if browser data is cleared?',
    a: 'Local project data may be removed. Export a Project JSON backup before clearing browser data or moving work to another machine.',
  },
  {
    q: 'How do I back up a project?',
    a: 'Use the project export action on the Home page to save a Project JSON file. That file can later be imported into the same browser or another browser to restore the project state.',
  },
  {
    q: 'Can multiple assessors share the same project?',
    a: 'Yes, by exporting and sharing Project JSON backups through approved team channels. File handling and distribution remain the responsibility of the assessment team.',
  },
  {
    q: 'Are imported files uploaded anywhere?',
    a: 'No. Imported CSV and JSON files are processed locally in the browser and are never transmitted to a server.',
  },
  {
    q: 'What is Evidence Library?',
    a: 'Evidence Library is a reference catalog of common evidence examples, likely control mappings, and assessor review context. It is a read-only reference — no assessment data is entered there.',
  },
  {
    q: 'What is Documented Artifacts?',
    a: 'Documented Artifacts is the project workspace for managing artifact names, evidence tags, objective mappings, and reuse opportunities across the assessment.',
  },
  {
    q: 'What is Relationship Explorer?',
    a: 'Relationship Explorer shows how controls relate to each other — prerequisites, supports, and supported-by relationships — and which evidence types commonly support a selected control.',
  },
  {
    q: 'Is internet access required?',
    a: 'No. Once loaded, the application functions entirely within the browser. Assessment data remains local.',
  },
  {
    q: 'Is assessment data encrypted?',
    a: 'No. Assessment data is stored in browser localStorage. Users are responsible for protecting exported files and securing the workstation used to access the application.',
  },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function FaqItem({ item, open, onToggle }) {
  return (
    <div className={`about-faq-item${open ? ' about-faq-item--open' : ''}`}>
      <button
        type="button"
        className="about-faq-question"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span>{item.q}</span>
        <span className="about-faq-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="about-faq-answer">
          <p>{item.a}</p>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function About() {
  const [openFaq, setOpenFaq] = useState(null)

  const toggleFaq = (i) => setOpenFaq((prev) => (prev === i ? null : i))

  return (
    <div className="about-page">

      {/* ── Hero ── */}
      <div className="about-hero">
        <h1 className="about-title">About CMMC Companion</h1>
        <p className="about-subtitle">
          A local-first CMMC Level 2 assessment support workspace for control review, evidence planning,
          relationship exploration, documented artifact tracking, and project backup.
        </p>
      </div>

      {/* ── Summary cards ── */}
      <div className="about-summary-cards">
        <div className="about-summary-card">
          <div className="about-summary-card-title">Local-First Workspace</div>
          <p className="about-summary-card-body">
            Your assessment progress is stored in this browser. Export Project JSON files to back up
            or move work between browsers or machines.
          </p>
        </div>
        <div className="about-summary-card">
          <div className="about-summary-card-title">Assessment Support, Not Certification</div>
          <p className="about-summary-card-body">
            Use this as a preparation and workflow tool. It does not replace assessor judgment or an
            official CMMC assessment.
          </p>
        </div>
        <div className="about-summary-card about-summary-card--caution">
          <div className="about-summary-card-title">No CUI Storage</div>
          <p className="about-summary-card-body">
            Use artifact names and notes only. Do not enter CUI, sensitive customer data, system
            diagrams, or real evidence file contents.
          </p>
        </div>
      </div>

      {/* ── Workspace Guide ── */}
      <section className="about-section">
        <h2 className="about-section-heading">Getting Started: Workspace Guide</h2>
        <div className="about-feature-grid">
          {[
            {
              name: 'Control Library',
              to: '/controls',
              desc: 'Review CMMC Level 2 controls, track status, assign ownership, document objective notes, and map artifacts to objectives.',
            },
            {
              name: 'Evidence Library',
              to: '/evidence',
              desc: 'Browse common evidence examples, likely controls, and assessor review context. Read-only reference catalog.',
            },
            {
              name: 'Relationship Explorer',
              to: '/relationships',
              desc: 'Explore how controls support, depend on, or connect to each other, and which evidence types are commonly reviewed alongside a control.',
            },
            {
              name: 'Documented Artifacts',
              to: '/artifact-map',
              desc: 'Manage project artifact names, evidence tags, objective mappings, and reuse opportunities across the assessment.',
            },
            {
              name: 'Project Backup / Export',
              to: '/',
              desc: 'Export Project JSON files from the Home page to preserve local work or move a project between browsers or machines.',
            },
          ].map(({ name, to, desc }) => (
            <div key={name} className="about-feature-card">
              <div className="about-feature-card-name">
                <Link to={to} className="about-feature-link">{name}</Link>
              </div>
              <p className="about-feature-card-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Data & Privacy Model ── */}
      <section className="about-section" id="data-handling">
        <h2 className="about-section-heading">Data &amp; Privacy Model</h2>
        <div className="about-privacy-grid">
          {[
            {
              label: 'Local browser storage',
              detail: 'Assessment progress — statuses, notes, artifacts, tags — is stored in your browser\'s localStorage only.',
            },
            {
              label: 'No backend database',
              detail: 'The app does not transmit assessment project data to a server. No user accounts, sessions, or server-side storage exist.',
            },
            {
              label: 'Project JSON backup',
              detail: 'Export a Project JSON file from the Home page before clearing browser data or moving work to another machine.',
            },
            {
              label: 'No real evidence files',
              detail: 'Document artifact names and references only. Do not upload or store actual evidence files, screenshots, or file contents.',
            },
            {
              label: 'No CUI',
              detail: 'Do not enter Controlled Unclassified Information, SSP content, network diagrams, system inventories, or sensitive organizational data.',
            },
            {
              label: 'Local-only exports',
              detail: 'CSV and JSON exports are generated and downloaded by your browser. No export data passes through any external server.',
            },
          ].map(({ label, detail }) => (
            <div key={label} className="about-privacy-card">
              <div className="about-privacy-card-label">{label}</div>
              <p className="about-privacy-card-detail">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Assessment Boundaries & Disclaimers ── */}
      <section className="about-section">
        <h2 className="about-section-heading">Assessment Boundaries &amp; Disclaimers</h2>
        <div className="about-boundary-card">
          <ul className="about-boundary-list">
            <li>CMMC Companion is an independently developed personal project.</li>
            <li>It is not affiliated with, endorsed by, sponsored by, operated by, or maintained on behalf of any C3PAO, The Cyber AB, DIBCAC, NIST, the Department of Defense, or any government agency.</li>
            <li>The tool is for assessment preparation, workflow organization, and reference support.</li>
            <li>It does not make compliance determinations.</li>
            <li>It does not replace C3PAO assessment activities, assessor judgment, official scoring methodology, or contractual requirements.</li>
            <li>Users remain responsible for assessment decisions, evidence evaluation, documentation, and compliance determinations.</li>
            <li>Unauthorized reproduction, redistribution, resale, or commercial repackaging is prohibited without prior written permission from the author.</li>
          </ul>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="about-section">
        <h2 className="about-section-heading">Support &amp; FAQ</h2>
        <div className="about-faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem
              key={i}
              item={item}
              open={openFaq === i}
              onToggle={() => toggleFaq(i)}
            />
          ))}
        </div>
      </section>

      {/* ── Dataset ── */}
      <section className="about-section">
        <h2 className="about-section-heading">Dataset</h2>
        <p className="about-meta-note">All data is derived from official CMMC and NIST source documents.</p>
        <table className="about-dataset-table">
          <tbody>
            {[
              ['Controls (practices)', '110'],
              ['Evidence types', '130'],
              ['Control relationships', '189'],
              ['Control families', '14 of 14'],
            ].map(([label, value]) => (
              <tr key={label}>
                <td className="about-dataset-label">{label}</td>
                <td className="about-dataset-value">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="about-meta-note" style={{ marginTop: 'var(--space-2)' }}>
          Source: CMMC Level 2 Assessment Guide · NIST SP 800-171 Rev. 2 · CMMC Scoring Methodology
        </p>
      </section>

      {/* ── Project / Author / Version ── */}
      <section className="about-section about-meta">
        <h2 className="about-section-heading">Project</h2>
        <div className="about-meta-grid">
          <div>
            <div className="about-meta-label">Project Author</div>
            <div className="about-meta-value">Vincent Azada, CCA</div>
            <div className="about-meta-sub">Certified CMMC Assessor · BS Cybersecurity &amp; Information Assurance</div>
            <a
              href="https://www.linkedin.com/in/vincent-azada/"
              target="_blank"
              rel="noopener noreferrer"
              className="about-meta-link"
            >
              linkedin.com/in/vincent-azada
            </a>
          </div>
          <div>
            <div className="about-meta-label">Version</div>
            <div className="about-meta-value mono">{APP_VERSION}</div>
            <div className="about-meta-sub">{APP_DEPLOYMENT}</div>
          </div>
          <div>
            <div className="about-meta-label">Copyright &amp; Ownership</div>
            <div className="about-meta-value">Copyright &copy; 2026 Vincent Azada</div>
            <div className="about-meta-sub">Independent personal project. All rights reserved.</div>
          </div>
        </div>
      </section>

    </div>
  )
}

export default About
