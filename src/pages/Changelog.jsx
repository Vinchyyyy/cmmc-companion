import { APP_VERSION } from '../utils/version'
import DashSidebar from '../components/DashSidebar.jsx'

function Changelog() {
  return (
    <div className="dash-root">
      <DashSidebar />
      <main className="dash-main page">
      <h1>Version History</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
        A curated release history for CMMC Companion, focused on major milestones rather than every internal development note.
        Current version: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{APP_VERSION}</span>
      </p>

      {/* v4.8.0 — current release, open by default */}
      <details open style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v4.8.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Checklist Sections, Drag Reorder, and Card View</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>July 19, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-accent)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds organizational tools for larger DIBCAC review groups: section headers and free reordering for checklists, a card layout for objective lists, and a way to give the Review Groups panel the full workspace.
          </p>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>DIBCAC Mode</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Checklist items in a review group can now be organized under section headers ("+ Add section header"), rendered as bold dividers in both the editor and the saved group view.</li>
            <li>Checklist rows (items and headers) can be dragged and dropped to reorder freely, or dragged past a header to move an item into a different section — including a drop zone to move an item to the very end of the list.</li>
            <li>Added a List / Cards view toggle for a saved group's Objectives list. Cards view uses a responsive grid that adds or removes columns as the browser window is resized, cutting down on scrolling for groups with many objectives. The choice persists across sessions.</li>
            <li>Added an expand arrow next to "Review Groups" that lets the panel fill the full workspace width, temporarily hiding the objective browser on the left — useful when reviewing a large saved group.</li>
            <li>The Home dashboard's "Warnings" tab no longer counts a control as a warning while its status is "In Progress" — only Not Started, MET, and NOT MET controls with real gaps show up.</li>
          </ul>

        </div>
      </details>

      {/* v4.7.1 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v4.7.1</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>DIBCAC Mode Fixes and Home Warnings Tab</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>July 19, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-accent)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            A small patch covering a checklist toggle bug, duplicate artifacts in the Excel export, a new Home dashboard tab, and finding-warning refinements.
          </p>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>DIBCAC Mode</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Fixed the "Hide MET objectives" toggle on a checklist item's objective picker: it now hides/reveals already-attached MET objectives in both directions, not just new search results.</li>
            <li>Adding a new checklist item now shows it in the list immediately and clears the input for the next item, instead of closing the add form.</li>
            <li>"Missing interviewed role" and "Missing interview comments" warnings in Generate Findings no longer appear for objectives whose DIBCAC standard doesn't require a screenshare/interview.</li>
            <li>Added a "Missing examine notes" warning in Generate Findings for objectives with an empty Examine text box.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Excel Export</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Duplicate artifacts are now removed from the Evidence column, including duplicates between an objective's own artifacts and the control's shared artifact pool.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Home Dashboard</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Added a "Warnings" tab under Needs Attention, listing controls with an objective warning (missing artifacts, missing interview details, or missing examine notes).</li>
          </ul>

        </div>
      </details>

      {/* v4.7.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v4.7.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Hide MET Objectives in DIBCAC Mode</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>July 17, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-accent)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds a "Hide MET objectives" toggle to DIBCAC Mode's toolbar, alongside the same toggle already available on the Control Library's DIBCAC filter.
          </p>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>DIBCAC Mode</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>New "Hide MET objectives" toggle in the toolbar, next to the family filter. Filters MET objectives out of the Document/Screen Share/Artifact/etc. browser lists and the group-builder's checkbox picker. Persists across sessions.</li>
          </ul>

        </div>
      </details>

      {/* v4.6.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v4.6.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Delete Saved Filters</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>July 17, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds a way to delete a saved filter from the Control Library's Filters modal — previously there was no way to remove one once saved.
          </p>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Control Library</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Each saved filter chip in Filters now has a small "×" to delete it. Deleting only removes that saved shortcut — it doesn't touch whatever filters are currently applied.</li>
          </ul>

        </div>
      </details>

      {/* v4.5.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v4.5.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Hide MET Objectives in the DIBCAC Filter</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>July 17, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds a "Hide MET objectives" toggle to the Control Library's DIBCAC Method filter, so a focused review pass can skip objectives that are already done.
          </p>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>DIBCAC Filter</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>New "Hide MET objectives" pill under the DIBCAC Method filter in the Control Library. With it on, a control only matches if it has a non-MET objective in the selected method(s).</li>
            <li>The setting carries through to Control Detail the same way the method filter does — the Objective Rail also drops MET objectives from the filtered view, and the banner reads "…filtered by Artifact, hiding MET."</li>
          </ul>

        </div>
      </details>

      {/* v4.4.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v4.4.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>DIBCAC Method Filter for Control Library</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>July 17, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds a DIBCAC assessment method filter to the Control Library that carries through to Control Detail, narrowing the Objective Rail to just the objectives that need that method.
          </p>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>DIBCAC Method Filter</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>New "DIBCAC Method" filter in the Control Library (Document, Screen Share, Artifact, Physical Review, Artifact + Screen Share, Variable). A control matches if any of its objectives use the selected method(s), so it still shows up in the list.</li>
            <li>Opening a control from a DIBCAC-filtered Library view now narrows the Objective Rail to only the matching objectives, auto-selects the first one, and shows a "Showing X of Y objectives — filtered by …" banner with a Clear button.</li>
            <li>The filter carries across Prev/Next navigation between controls, and back to the same filtered Library view via "Back to Control Library."</li>
          </ul>

        </div>
      </details>

      {/* v4.3.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v4.3.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Custom Inheritance Pool, DIBCAC Family Summary &amp; Progress Sort</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>July 16, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds a shareable pool for custom inheritance sources, replaces the DIBCAC method summary on review group cards with a family-code summary, and adds sortable Progress on the Home dashboard's Continue Review table.
          </p>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Custom Inheritance Provider Pool</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Typing a provider name that isn't in the built-in catalog now shows a "Custom" badge on its Inherited From chip. Clicking the chip opens a small editor to rename it, delete it from the control, or add it to a shared pool.</li>
            <li>Pooled custom providers now show up as suggestions when adding inheritance sources on any control, and in the Control Library's bulk "Set Inheritance Source" suggestions — previously a custom name only ever lived on the one control it was typed into.</li>
            <li>Added a way to remove a name from the pool entirely (distinct from deleting it off one control) — fixes a bug where deleting a custom source chip left it still suggested everywhere else because the pool entry was never cleared.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>DIBCAC Mode</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Review group cards now show the CMMC families covered (e.g. "AC · IA · MP") instead of the DIBCAC assessment methods, making it easier to see at a glance what's grouped together.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Home Dashboard</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>The Progress column header in the Continue Review table is now clickable, cycling between highest-first, lowest-first, and the default review-priority order.</li>
          </ul>

        </div>
      </details>

      {/* v4.2.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v4.2.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Status/Trending Merge, Assessment Order Fix &amp; Library Improvements</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>July 16, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Merges the Trending indicator into a single auto-syncing Status field, fixes a Control Detail Prev/Next bug that could walk controls out of assessment order, and adds filter persistence and collapsible family groups to the Control Library.
          </p>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Status &amp; Trending Merge</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Removed the separate Trending indicator everywhere (Control Detail, Control Library filters/legend/quick-look, xlsx export). Status is now the single field, and it automatically recomputes from objective MET/NOT MET progress every time an objective's call changes.</li>
            <li>Fixed a bug where flipping an objective from NOT MET back to MET wouldn't re-sync Status once it had already been auto-set to NOT MET.</li>
            <li>Manually overriding Status is still supported via Edit Details; a warning now appears next to the Status badge (and in the Edit Details modal) when a manual pick disagrees with objective progress, until the next objective change resyncs it.</li>
            <li>Added an "In Progress" indicator to the Objective Rail for objectives with recorded work (interviews, examine, test, artifacts, or a finding) that haven't been marked MET/NOT MET yet.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Assessment Order Fix</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Fixed Control Detail's Prev/Next navigation, which was walking controls in raw data-file order instead of practice-number order — this put Level 1 controls ahead of lower-numbered Level 2 controls in the same family (e.g. MP.L1-3.8.3 appeared before MP.L2-3.8.1). Affected Media Protection, Physical Protection, and System &amp; Communications Protection. Prev/Next now matches the same family → practice-number order shown in the Control Library.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Control Library</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Filters (family tab, assignedTo, status, etc.) now persist across navigation — leaving the Control Library and coming back no longer silently resets to the Access Control tab.</li>
            <li>Family group headers in the "All" view are now collapsible, with the collapsed/expanded state remembered per family.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Other</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Added a non-intrusive character counter (N / 400) to the Interviews, Examine, and Test fields, flagging when a field exceeds eMASS's 400-character import limit.</li>
          </ul>

        </div>
      </details>

      {/* v4.1.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v4.1.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Evidence Pool Fixes &amp; Backup Completeness</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>July 15, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Patch release fixing a stale-suggestion bug between the Evidence Pool and Assigned Artifacts, adding a one-click way to apply pooled evidence to every objective on a control, and closing a real gap in Project JSON backups.
          </p>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Evidence Pool &amp; Assigned Artifacts</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Fixed a bug where a newly added Evidence Pool or Assigned Artifact entry wouldn't appear in suggestion dropdowns elsewhere on the same control until the page was refreshed — suggestions now update live as you type.</li>
            <li>Added an "Apply to All Objectives" button on the Evidence Pool: one click assigns every pooled artifact to every objective on the control. It's additive only — existing per-objective assignments and overlapping artifacts are left untouched, so it's safe to click again after the pool changes.</li>
            <li>Added an "Apply Inheritance to All Objectives" button in the control header (next to View Relationships / Search Related Evidence / Create Findings), shown whenever the control has at least one inheritance source. It applies every control-level inheritance source to every objective in one click, additive-only just like the Evidence Pool button.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Backup Completeness</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Fixed Project JSON export/import so DIBCAC review group folders are included — previously only the review groups themselves were backed up, so restoring on a new browser silently dropped folder organization and left groups Ungrouped.</li>
            <li>Wipe Entire Project now also clears review group folders, matching how it already clears the groups themselves.</li>
            <li>The restore confirmation message now explicitly reports how many DIBCAC review groups and folders were restored.</li>
          </ul>

        </div>
      </details>

      {/* v4.0.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v4.0.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Workspace Redesign: DIBCAC Mode, Documented Artifacts, Settings &amp; Accent Color</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>July 14, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Completes the visual redesign pass across the entire application — every page now shares the same violet-accented dark workspace shell, sidebar navigation, and typography. Adds a real Accent Color picker, and closes out a batch of pre-production cleanup fixes.
          </p>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Full Workspace Shell Rollout</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>DIBCAC Mode, Documented Artifacts, Settings, About, and Changelog all moved onto the shared redesigned shell (sidebar navigation, dark surface tokens, Plus Jakarta Sans / Inter / JetBrains Mono type system) — previously only Home, Control Library, Control Detail, Evidence Library, and Relationship Explorer had it.</li>
            <li>Every page in the app is now on one consistent visual system; the legacy top-nav shell is no longer used anywhere.</li>
            <li>DIBCAC Mode's objective browser gained a proper three-level accordion (method → family → control → objective) with colored method indicators and flat, borderless rows.</li>
            <li>Documented Artifacts' expanded row and table columns were rebalanced for readability, with capped evidence-tag chips and a trimmed Suggested Reuse panel.</li>
            <li>Settings' Project Actions were reorganized into labeled Backup &amp; Restore / Official Templates groups with per-action icons and descriptions; Danger Zone copy now sits directly under the action it describes.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Accent Color</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Added an Accent Color picker in Settings with six presets (Violet, Blue, Emerald, Rose, Gold, Cyan).</li>
            <li>Selecting a color updates the app's accent tokens globally and persists locally, so the whole workspace — nav, buttons, highlights, charts — re-themes instantly and stays that way across sessions.</li>
            <li>Removed the Theme (light/dark) toggle and Background Palette control from Settings — every page now runs on the single redesigned dark shell, so the old light-mode system no longer applied to anything and the toggle had stopped doing anything visible.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Pre-Production Cleanup</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Fixed several hardcoded accent colors (sidebar logo, active nav pill, dashboard section labels, the inheritance-source heatmap gradient) that were silently ignoring the new Accent Color picker.</li>
            <li>Removed leftover debug logging from the Control Library bulk copy-attributes flow.</li>
            <li>Fixed a React key warning in Documented Artifacts' table rows.</li>
            <li>Restored a visible keyboard-focus indicator on the Home dashboard's Controls/Objectives toggle, and made the global button focus ring accent-aware instead of a fixed blue.</li>
            <li>Confirmed shared modals (Interview Role Picker, Apply Same Interviewer, Fix Interview Details) remain single, reused components with no drifted duplicates.</li>
          </ul>

        </div>
      </details>

      {/* v3.3.1 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v3.3.1</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Findings and DIBCAC Workflow Patch</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>July 1, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Patch release covering method-aware finding statements, bulk findings generation, a refined interview details/Apply Same Interviewer workflow, and DIBCAC Mode workflow improvements for live assessments.
          </p>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Method-Aware Findings, at Scale</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Generated finding statements now use validation language tailored to each objective's DIBCAC assessment method (Document, Screen Share, Artifact, Physical Review, Artifact + Screen Share, or Variable), through one shared statement builder used everywhere findings are generated.</li>
            <li>Added bulk finding generation from three entry points — all objectives, a single control, or a Control Library multi-select — with a readiness review (Ready / Needs Attention / Skipped / Existing) and safe defaults that only auto-generate for MET objectives unless you opt in to more.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Interview &amp; Review Group Workflow</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Reworked Fix Interview Details and Apply Same Interviewer into a shared, reusable workflow for applying interviewed roles across multiple objectives at once, with custom role support and preloaded existing selections.</li>
            <li>DIBCAC saved review groups gained folder organization (with multi-select move and sort controls), inline comment previews, and one-click Create Group Findings for the whole group.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Progress Accuracy</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Fixed control-level progress reconciliation so a control's status correctly derives from its objectives — all-MET rolls up to MET, any NOT MET rolls up to NOT MET — and made Control Library's bulk clear also reset Findings Builder data.</li>
          </ul>

        </div>
      </details>

      {/* v3.3.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v3.3.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Assessment Workbook Import, DIBCAC Workflow, Guide-Aware Reuse, and Workspace Personalization</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 28, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds official CMMC Level 2 Assessment Results Template workbook import with reconciliation, expanded DIBCAC workflow controls, guide-aware reuse refinements, Control Library numeric sorting, and muted theme palettes for workspace personalization.
          </p>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Official Workbook Import</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Added direct <code>.xlsx</code> import of existing official CMMC Level 2 Assessment Results Template workbooks, with a staged preview and a choice to merge into the current project or start a new one — notes, artifacts, findings, statuses, assignments, and inheritance metadata all carry over.</li>
            <li>Unrecognized workbook values (assignees, inheritance sources) go through a reconciliation step where you can ignore, add as new, or map each one to an existing value, with fuzzy matching for common provider names like Entra and M365 GCC High.</li>
            <li>Fixed artifact, note, and finding import so evidence references, interview/examine/test notes, and findings text all import correctly, and added a progress-reconciliation sweep for older imported/restored projects that were stuck showing Not Started.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Reuse &amp; Data Integrity</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Artifact reuse scoring now factors in Assessment Guide evidence-object context across all 110 Level 2 practices, keeping Strong Suggestions high-confidence and hiding broad/weak candidates from view.</li>
            <li>Fixed Project JSON export/import so artifact evidence tags and mappings correctly survive a wipe/export/import round trip, including older backup files without tag data.</li>
          </ul>

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>DIBCAC Mode &amp; Control Library</h3>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            <li>Renamed Unmapped to Variable throughout DIBCAC Mode, and added status controls, Overall Comments editing, and name/date sorting to saved review groups.</li>
            <li>Fixed Control Library sort order to follow true numeric CMMC practice order instead of string order.</li>
            <li>Added six muted theme palettes for workspace personalization (applies in dark mode).</li>
          </ul>

        </div>
      </details>

      {/* v3.2.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v3.2.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Findings Builder, Guide-Aware Reuse, and Export Integrity</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 24, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds the objective-level Findings Builder, findings export into the official Assessment Results Template, guide-aware compound artifact reuse scoring, tiered/collapsible/paginated suggested artifact reuse, Project JSON artifact tag export/import integrity, and a Wipe Entire Project safety action.
          </p>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Findings Builder &amp; Official Export</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added an objective-level Findings Builder for standardized Assessment Validation Statements, with interviewed-role chips and support for noting differences.</li>
              <li>Findings now export into the official CMMC Level 2 Assessment Results Template, with correct evidence formatting and computed Time to Assess.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Guide-Aware Reuse &amp; Data Integrity</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Refactored Suggested Artifacts into a deterministic evidence-profile scoring model that factors in Assessment Guide context, keeping Strong Suggestions confident and hiding weak candidates behind a collapsible, paginated Related Candidates section.</li>
              <li>Fixed Project JSON export/import so artifact evidence tags reliably survive a wipe/export/import round trip.</li>
              <li>Redesigned the evidence tag picker into a categorized, searchable chip selector with alias matching for common terms (VPN, MFA, Entra, firewall, etc.).</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Safety &amp; Control Detail</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added a two-stage-confirmation Wipe Entire Project action.</li>
              <li>Added a View Suggested Artifacts popup on Control Detail, next to Assigned Artifacts, instead of disrupting the page layout.</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v3.1.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v3.1.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>DIBCAC Mode &amp; Assessment Planning</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 23, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds the DIBCAC Mode assessment planning workspace, objective-level DIBCAC assessment standard metadata, review group workflows, a redesigned evidence tag picker, and Assessment Guide Discussion on Control Detail.
          </p>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>DIBCAC Mode</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added a new DIBCAC Mode workspace for objective-level assessment planning — objectives grouped by assessment standard (Document, Screen Share, Artifact, Physical Review, Artifact + Screen Share, Unmapped), with method/family/search filters, collapsible groupings, and saved local review groups with planned-ask notes.</li>
              <li>Added supplemental objective-level DIBCAC assessment standard metadata and matching chips on Control Detail, and a Review Group modal for adding a Control Detail objective to an existing or new group.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Control Detail &amp; Evidence Tags</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added Assessment Guide Discussion content alongside Evidence Pool / Expected Evidence Types in the Control Detail summary area.</li>
              <li>Redesigned the evidence tag picker into a categorized, searchable chip selector with alias matching (VPN, MFA, Entra, firewall, etc.), keeping the controlled tag taxonomy — no free-form tags.</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v3.0.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v3.0.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>UI Workspace Overhaul</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 23, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            A major interface overhaul that turns CMMC Companion into a cleaner assessment workspace with redesigned dashboards, libraries, relationship views, documented artifact workflows, and a merged About/FAQ page.
          </p>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Dashboard, Library &amp; Control Detail</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Redesigned Home into a full assessment dashboard with progress, needs-attention, inheritance-source, and continue-review summaries.</li>
              <li>Refined Control Library's layout and filtering into a consolidated, chip-based filter modal.</li>
              <li>Redesigned Control Detail for wider responsive layouts, with objective-level inheritance chips and MET/NOT MET pill controls replacing dropdowns.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Evidence, Relationships &amp; Artifacts</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Renamed Evidence Lookup to Evidence Library and redesigned it into a categorized reference catalog.</li>
              <li>Redesigned Relationship Explorer's empty state into a family/control launcher with a more visual exploration workflow.</li>
              <li>Renamed Artifact Map to Documented Artifacts and redesigned it into a table-based workspace with category/tag filtering, sortable columns, and clearer Untagged / Tagged / Mapped status logic.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>About + FAQ</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Merged About and FAQ into one page covering the workspace guide, privacy model, assessment boundaries, FAQ accordion, and dataset/version info; removed the redundant FAQ nav item.</li>
              <li>No changes to CMMC control, evidence, relationship, or scoring data — validator passed at 110 controls, 320 objectives, 130 evidence types, 189 relationships, 66 evidence tags.</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v2.0 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v2.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Evidence Tag Registry &amp; Artifact Reuse</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 19, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Introduces the controlled evidence tag taxonomy and the first tag-informed artifact reuse suggestions, editable directly from Artifact Map and Control Detail.
          </p>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Evidence Tags &amp; Tag Editing</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added a controlled evidence tag taxonomy — 66 tags across 17 categories, mapped to expected tags on all 320 assessment objectives (guidance only; tags don't determine outcomes).</li>
              <li>Tags are editable from a searchable picker on both Artifact Map and Control Detail's artifact suggestion modals.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Tag-Informed Reuse</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Control Detail objectives now surface existing artifacts from related controls, gated by evidence_reuse relationships and ranked by tag alignment.</li>
              <li>Artifact Map shows a paginated Potential Reuse Opportunities section for tagged artifacts, and visually flags untagged artifacts.</li>
              <li>Removed the Common Artifacts section from Control Detail (data preserved, still searchable via Evidence Library).</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.6 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v1.6</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Official Assessment Template Export &amp; Assessment Guide Reconciliation</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 13, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Bundles the official CMMC Level 2 Assessment Results Template for one-click export, rewrites the export engine to patch the real workbook instead of rebuilding it, and reconciles the objective set against the official Assessment Guide.
          </p>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Official Template Export</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Bundled the official template into the app (no more upload step) and added an OSC/Assessment Name export dialog with a standardized filename.</li>
              <li>Rewrote the export engine to patch the official workbook's XML directly instead of reconstructing it — the export is now visually identical to the official template, preserves CUI sensitivity labels and data validation, and dropped from ~1.2 MB to ~78 KB.</li>
              <li>Removed the temporary Risk Assessment export workaround now that objectives map directly.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Assessment Guide Reconciliation</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Did an objective-by-objective comparison against the official Assessment Guide, correcting objective counts for RA.L2-3.11.1/.2/.3 and wording for SI.L1-3.14.5, and restored official punctuation conventions across all objectives.</li>
              <li>Objective inventory now matches the official guide exactly at 320 (down from 321). Validator and build both passing.</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.5.1 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v1.5.1</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Artifact Intelligence &amp; Usability Update</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 10, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds relationship-driven artifact reuse suggestions with direct objective deep-linking, page-purpose info panels across the app, and assignee name normalization.
          </p>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Artifact Map &amp; Reuse Recommendations</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added a Potential Reuse Opportunities section driven by the relationship dataset, with source/type explanations, one-click "+" assignment, and paginated results.</li>
              <li>Artifact usages now deep-link straight to the specific objective (<span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>/controls/&#123;id&#125;#objective-&#123;id&#125;</span>) instead of just the parent control.</li>
              <li>Added category grouping, Expand/Collapse All, and sorting (connections, name); Artifact Map now reflects objective-level usage only.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Orientation &amp; Data Hygiene</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added a reusable page-purpose info panel to Home, Control Library, Environment Profile, Artifact Map, Relationship Explorer, and Evidence Lookup.</li>
              <li>Assignee names now normalize to consistent Title Case, eliminating duplicate entries from capitalization differences (e.g. "vince" / "VINCE" → "Vince").</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.5.0 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v1.5.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Assessment Intelligence &amp; Artifact Analysis</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 9, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Introduces Artifact Map, a centralized evidence workspace with usage tracking, ComplianceForge Kill Chain categorization, and the first relationship-driven reuse recommendations — laying the groundwork for later reuse and DIBCAC features.
          </p>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Artifact Map &amp; Categorization</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added Artifact Map with global artifact indexing, search, usage stats, and Most/Least Connections sorting, plus direct navigation from usages back to their source objectives.</li>
              <li>Mapped all 110 controls into ComplianceForge Kill Chain operational categories, with category grouping and filtering in Artifact Map.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Evidence Reuse Recommendations</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added the first relationship-driven reuse recommendations — one-click reuse of existing artifacts from related controls, with source attribution and navigation, excluding anything already assigned.</li>
              <li>No schema migration required; existing projects and backups remain fully compatible.</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.4.0 */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>v1.4.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Assessment Collaboration &amp; Provider Catalog Update</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 8, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds control assignment tracking, a curated inheritance-provider catalog, structured per-objective assessment results, and several Control Library workflow improvements for multi-control work.
          </p>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Assignment Tracking</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added an Assigned To field on Control Detail (with name suggestions and a bulk Set Assignment action), an Assignment Coverage dashboard section, and a matching Advanced Filter — all fully supported through Project JSON export/import.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Provider Catalog &amp; Inheritance</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added a 31-entry provider catalog across 7 categories, powering searchable suggestions on the Inheritance Source field (custom values still fully supported).</li>
              <li>Added an Inheritance Sources dashboard summary with proportional usage bars and Top 5/10/All views, an Inheritance Source Advanced Filter, and source labels on Control Library inheritance badges.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Objective Results &amp; Workflow</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added structured per-objective result fields (Interview, Examine, Test, Overall Comments), included in export/import.</li>
              <li>Control Library's Multi-Select toolbar is now sticky while scrolling, and gained a Copy From Control action to copy status/inheritance/evidence-pool attributes from one control to many at once.</li>
              <li>Hid the legacy Assessment Notes field from Control Detail to reduce clutter (data preserved, still exportable).</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.3.0 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v1.3.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Assessment Workflow &amp; Visibility Update</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 4, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds objective-level status tracking with a derived Trending Status, an Evidence Pool / Objective Artifact system, consistency warnings, inheritance documentation, and a proper Multi-Select workflow for the Control Library.
          </p>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Objective Tracking &amp; Evidence</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added Objective Status (Unreviewed / MET / NOT MET) per objective, rolling up into a derived Trending Status shown throughout Control Library and Quick Look.</li>
              <li>Added Evidence Pool and Objective Artifact tracking, contributing to Evidence Pool suggestions and reflected in backup/restore.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Warnings &amp; Inheritance</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added a Status Consistency Warning system flagging conflicts between Assessment Status and Trending Status, plus incomplete inheritance documentation, with expandable in-library warning panels.</li>
              <li>Added Inheritance Source tracking and an "Inherited From" field, required for both individual and bulk inheritance assignment.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Control Library Workflow</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added Quick Look expandable summaries, family-level progress, and warning/trending/artifact filters.</li>
              <li>Replaced always-visible checkboxes with a dedicated Multi-Select mode supporting family-level and Select-All-Visible bulk selection.</li>
              <li>Added a first-run privacy/data-handling notice and an Icon Guide reference modal, and upgraded the backup format to Schema Version 2 (Version 1 backups remain importable).</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.2.0 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v1.2.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Evidence Pool MVP</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 4, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Introduces the Evidence Pool — control-level and objective-level artifact reference tracking, with typeahead suggestions, automatic status promotion, and full backup/restore support.
          </p>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Evidence Pool</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Added a control-level Evidence Pool plus objective-level Artifact References, with typeahead suggestions and automatic pool population as objective artifacts are added.</li>
              <li>Controls now auto-promote from Not Started to In Progress on Evidence Pool activity; data persists locally and is fully included in Project JSON export/import (Version 1 backups still import fine).</li>
              <li>Added an artifact indicator and Has Artifacts filter to Control Library, and fixed a stale-render bug so the library re-reads localStorage on every navigation.</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.1.2 — collapsed */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v1.1.2</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Workflow &amp; Ownership Update</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 4, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Adds auto-resizing note fields with automatic status promotion/reversion, a Hide MET Controls toggle, and ownership/independence disclosures on the About page.
          </p>

          <section>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Workflow &amp; Ownership</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Note fields now auto-resize, and typing into a Not Started control's notes auto-promotes it to In Progress (clearing them reverts it) — MET/NOT MET controls are never touched by this automation.</li>
              <li>Added a Hide MET Controls toggle to Control Library to help assessors focus on remaining work.</li>
              <li>Added Copyright &amp; Ownership and Independence/Affiliation disclosures to the About page, establishing the project as independent of any C3PAO, Cyber AB, DIBCAC, DoD, or NIST affiliation.</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.1.1 — collapsed by default */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v1.1.1</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Production Readiness, Security &amp; Usability Update</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 3, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            First production release — ships a status-card dashboard, safer bulk actions, a consolidated privacy/FAQ writeup, light/dark theming, and the first live GitHub and Cloudflare Pages deployment.
          </p>

          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Workflow &amp; Import/Export</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Replaced the status list with a clickable 2×2 status card grid, and added a confirmation safeguard before bulk Clear Data (also fixed bulk status update, which was silently failing on a missing import).</li>
              <li>Added OSC/Assessment Name export prompts with timestamped filenames, a Last Project Backup indicator, size/type-limited CSV and JSON import, and a restore confirmation dialog showing exactly what will change.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-2)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Security, Theming &amp; Launch</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
              <li>Consolidated the About page's privacy/limitations content and added a 13-question FAQ page covering storage, CUI policy, and data handling.</li>
              <li>Added a flash-free Light/Dark theme toggle that persists across refreshes.</li>
              <li>Shipped the first GitHub release and Cloudflare Pages deployment, with CI/CD on push to <code>main</code>.</li>
            </ul>
          </section>

        </div>
      </details>

      {/* v1.0.0 — collapsed by default */}
      <details style={{ marginBottom: 'var(--space-4)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)', padding: 'var(--space-3) 0', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>v1.0.0</span>
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          <span style={{ color: 'var(--color-text)' }}>Initial V1 Release</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>June 3, 2026</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>
          <section style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Dataset</h3>
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
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Features</h3>
            <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
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
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-4)' }}>Assessment Guide Family Order</h3>
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
          <span style={{ color: 'var(--color-text)' }}>Final Family Expansion</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
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
          <span style={{ color: 'var(--color-text)' }}>Major Workflow Features</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
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
          <span style={{ color: 'var(--color-text)' }}>Data Architecture Refactor</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
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
          <span style={{ color: 'var(--color-text)' }}>Initial Creation</span>
        </summary>
        <div style={{ paddingLeft: 'var(--space-4)', paddingTop: 'var(--space-3)', borderLeft: '2px solid var(--color-border)' }}>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
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
      </main>
    </div>
  )
}

export default Changelog
