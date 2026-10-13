import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import useFocusTrap from './useFocusTrap.js'

const example = `!USER / IDENTITY!
- show authorized users and how access is limited @G1-1.1
  - if MFA comes up, show coverage @G1-2.1

!REMOTE ACCESS!
- walk through the approved remote-access path @G2-1.1
  - if user permissions appear, pivot to @G1-1.1`

export default function DibcacInstructionsModal({ onClose }) {
  const dialog = useRef(null)
  const closeButton = useRef(null)
  useFocusTrap(dialog, true)
  useEffect(() => {
    const previousFocus = document.activeElement
    closeButton.current?.focus()
    const keydown = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div className="dibcac-template-overlay">
      <section ref={dialog} className="dibcac-template-modal dibcac-instructions-modal" role="dialog" aria-modal="true" aria-labelledby="dibcac-instructions-title">
        <header className="dibcac-template-header">
          <div><h2 id="dibcac-instructions-title">DIBCAC Instructions</h2><p>A quick guide to building a connected assessment walkthrough.</p></div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="Close instructions"><X size={19} /></button>
        </header>
        <div className="dibcac-template-body dibcac-instructions-body">
          <section>
            <h3>1. Build groups around the walkthrough</h3>
            <p>Group objectives that use the same conversation, console, process, or SME. Read your existing control and objective comments to identify what still needs review. Build the checklist first, then write the Planned Ask.</p>
          </section>
          <section>
            <h3>2. Write an observable checklist</h3>
            <p>Use headers for meaningful sections, such as <strong>Authorized Users</strong> or <strong>MFA &amp; Authentication</strong>. Write items as things you can see: <strong>Authorized user access shown</strong>, rather than a requirement number.</p>
            <p>Attach the exact objective IDs to each item. One observation may cover several objectives when the evidence supports each one. Give an observation one home and link to it from other groups.</p>
            <div className="dibcac-instructions-checklist">
              <strong>1. Authorized Users</strong>
              <span>1.1 — Authorized user access shown</span>
              <small>Mapped objectives: AC.L1-3.1.1[d], IA.L1-3.5.2[a]</small>
            </div>
          </section>
          <section>
            <h3>3. Keep Planned Asks short</h3>
            <p>Use one quick ask per bullet, usually 10–18 words. Let comments shape the questions without repeating them. Keep lengthy explanations in separate notes.</p>
            <pre aria-label="Planned Ask formatting example">{example}</pre>
            <p>Type <code>- </code> to start a bullet. Use <kbd>Tab</kbd> to indent a follow-up and <kbd>Shift + Tab</kbd> to move it back. Leave a blank line between topics.</p>
          </section>
          <section>
            <h3>4. Connect topics and checklist items</h3>
            <p>Type <code>!TOPIC NAME!</code> on its own line to create a Topic Anchor. Use the Topic Navigator for a broad subject jump.</p>
            <p>Type <code>@</code> and choose a checklist item from the suggestions to create a clickable link. Search by its number or wording. Use links for exact evidence targets, including useful pivots into another group.</p>
            <p>In <code>G1-1.1</code>, <strong>G1</strong> is the group and <strong>1.1</strong> is the checklist item under header 1. Numbers update when items move; saved links keep their destination. The example numbers above are illustrative—choose your actual items rather than pasting them as plain text.</p>
          </section>
          <section>
            <h3>5. Read the method badges</h3>
            <div className="dibcac-instructions-legend">
              {[
                ['document', 'D', 'Document'], ['artifact', 'A', 'Artifact'],
                ['screen_share', 'S', 'Screen Share'], ['physical_review', 'P', 'Physical Review'],
                ['unknown', 'V', 'Variable'],
              ].map(([method, letter, label]) => <span key={method}><span className={`dibcac-reference-method dibcac-chip--${method}`} aria-hidden="true">{letter}</span> {label}</span>)}
            </div>
            <p>Planned Ask badges summarize the linked item's objective methods. In the checklist, badges beside each objective show that objective's own method. Several badges mean several methods; Variable means no fixed method. Use these cues to request the document, artifact, screen share, or physical review you need.</p>
          </section>
          <section>
            <h3>6. Review and save</h3>
            <p>Check objective coverage, duplicate observations, and link destinations. Save the group before leaving the editor. Checking a mapped checklist item marks its objectives MET, so apply assessor judgment first. Linked ask blocks cross out when all their referenced items are checked.</p>
            <p>Use <strong>Import / Export</strong> for reusable plans and examples. Use <strong>Settings → Export Project JSON</strong> for a full backup including notes and progress.</p>
          </section>
        </div>
      </section>
    </div>
  )
}
