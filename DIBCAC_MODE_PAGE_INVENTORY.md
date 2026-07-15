# DIBCAC Mode — Page Inventory

Source: `src/pages/DibcacMode.jsx` (1581 lines), plus shared components `ApplySameInterviewerModal.jsx`, `FixInterviewDetailsModal.jsx`, `InterviewRolePickerModal.jsx`, and storage helper `utils/reviewGroups.js`. This is a factual account of current behavior only — no design opinions.

---

## Confirming what you already understand

**Layout — confirmed, with one structural correction.** It's a two-panel page: left is the objective browser, right is "Review Groups." One thing to correct: the left panel's nested accordion is **not** `family → control → objective`. The **top level of the accordion is the assessment method** (Document / Screen Share / Artifact / Physical Review / Artifact + Screen Share / Variable), and *within* each expanded method section it nests `family → control → objective`. So with the "All" method filter active, you'd see six collapsible top-level sections (one per method), each independently expandable, each containing its own family→control→objective tree. When a method filter chip is applied (e.g. "Document"), only that one method section exists in the accordion at all (others simply don't render, since the grouping is built from whatever the current filter already narrowed the objective list down to) — see item 7 below for the full filtering mechanics.

**Left panel elements — confirmed as described.** Search bar, "All Families" dropdown, method filter chips with counts, the Variable note + "View variable" link, then the method-grouped accordion. In builder/selection mode each objective row gets a checkbox on the left, and the row itself becomes clickable to toggle the checkbox (except clicks on the ID button or the checkbox itself, which don't double-toggle).

**Right panel states — confirmed as described, with corrections noted in the numbered answers below (especially #1).** Default list view, Review Group Builder, Edit Review Group (same component as the builder, pre-filled), and a simpler inline text-only form — which is answered in detail in #1, because it is **not** a second group-creation path.

**Modals — confirmed:**
- **Apply Same Interviewer**: exactly as you described. Interviewed Roles/Titles chips + "+Add Roles"/"Manage Roles", an "Overwrite existing interviewed roles" checkbox, a Targets list (checkbox + control/objective key + status + objective text + "has roles"/"has comments" flags per row), "Apply to All" / "Clear Selection", and a footer button reading "Apply to N Objectives" (disabled until at least one role and one target are selected). This is a single shared component (`ApplySameInterviewerModal.jsx`) used identically from DIBCAC Group Findings, from the per-objective Fix Interview Details flow, and — per its own header comment — from the bulk "Create Findings" workflow elsewhere in the app. Not reimplemented per page.
- **Add Interviewed Role / Title**: confirmed — this is the literal same shared component (`InterviewRolePickerModal.jsx`) used everywhere else in the app (Control Detail included). Categorized picker, search, running selected list, and a "Custom" category backed by `utils/customInterviewRoles.js` (add/remove your own role labels, persisted separately from the built-in list). Nothing DIBCAC-specific about it.
- **Create Group Findings**: **this is a separate, DIBCAC-specific component**, not the same component as Control Library/Control Detail's "Create Bulk Findings." It's called `GroupFindingsModal`, defined locally inside `DibcacMode.jsx` — it does not import or reuse `BulkFindingsModal.jsx`. The *behavior pattern* is intentionally parallel (overwrite toggle, "Apply Same Interviewer" entry point, per-objective warnings with inline "Fix" buttons, skip-reason labels, "Generate N Findings"), and it calls the same shared `buildFinalText()` statement-builder utility that the other findings flows use — so the generated finding text format is identical — but the modal shell, row layout, and scoping logic (it operates over a review group's fixed objective list, not a control-library selection) are DIBCAC-only code. Treat it as visually distinct from Control Library's Bulk Findings modal, not a shared instance.
  - One additional piece inside this modal not in your list: clicking "Fix" next to a warning ("Missing interviewed role" / "Missing interview comments") opens a **third modal**, `FixInterviewDetailsModal` — a focused single-objective editor (role chips + "+Add Roles"/"Manage Roles", an interview notes/comments textarea, Save/Cancel) with its own "Apply Same Interviewer" shortcut button if more than one objective is in scope. This modal fully replaces Group Findings on screen while open (not stacked), and returns to Group Findings on Save/Cancel, refreshing its warning state.

---

## Answers to your open questions

### 1. "+ Create" vs. the full Review Group Builder — and what the inline text input actually is

There is only **one** group-creation flow, and it's always the full builder. "+ Create" (`onEnterBuilder`) does exactly two things: sets `editingGroup` to `null` and switches the page into `mode: 'builder'`. That immediately renders the full `BuilderPanel` (Group name / Selected Objectives / Planned Ask) — there is no intermediate name-only step for groups.

**The inline name-only text input you saw is the Folder creation form, not a group form.** It's triggered by the "📁 Folder" button, which just toggles a local `creatingFolder` boolean. When open, it shows a single text input ("Folder name…") with Create/Cancel, and Create calls `createReviewFolder(name)` — folders really are name-only, with nothing else configurable at creation (no objectives, no color, no description). So: "+ Create" → full builder (for groups). "📁 Folder" → inline name field (for folders). Two different object types, two different flows, and you were not misreading which button does what — the inline form genuinely is simpler because folders genuinely have nothing else to configure.

### 2. How a new group gets its objectives and method

Only through the Builder, and only by explicit user action — nothing is inherited automatically. The flow: check objective rows in the left panel (checkboxes only render because `mode === 'builder'`) → click "Add N selected objectives" in the builder panel, which pulls the currently-checked keys into the builder's local `selectedObjs` list (`handleAddChecked`) → Save. The "method" shown per objective (the `MethodChip`) isn't something the user sets — it's read straight from `getDibcacStandard(controlId, objId)` at the moment the objective object is captured, i.e. it's inherited from the DIBCAC standards data file, not editable in the builder. Editing an existing group (`onEditRequest`) reopens the same `BuilderPanel` pre-filled with `editingGroup.objectives`; you add/remove objectives the same way (check more on the left, click Add; or click × on an already-selected row to remove it) — same single code path for create and edit.

### 3. "Planned Ask" field

It is a **plain freeform textarea**, nothing more. Placeholder text is "Describe what you plan to ask or review during this session…"; it auto-grows to fit content (`AutoExpandTextarea`) but has zero auto-population logic anywhere in the code — no lookup against evidence-library descriptions, no suggestion engine, no derivation from the selected objectives. Whatever text appeared in the screenshot resembling evidence-type descriptions was manually typed into that field at some point (either by you or in earlier test data) — it is not a feature that generates or suggests that content. Confirm this is genuinely just a manual note field before designing any "smart suggestion" affordance around it, since none exists to preserve.

### 4. Folder assignment mechanics

Two mechanisms, both already implemented:

- **Per-card, one at a time:** every group card's action row has a native `<select>` dropdown (styled, but a real `<select>`, not a custom tag button) with options "No folder" + each existing folder name, defaulting to the group's current `folderId`. Changing the selection calls `assignGroupToFolder(groupId, folderId)` immediately — no confirm step. This dropdown only renders at all when at least one folder exists (`savedFolders.length > 0`); with zero folders, there's nothing to show since "No folder" is the only possible state anyway.
- **Batch, via the Select mode:** described fully in #5 below — multi-select several group cards, then use "Move to Folder ▾" to assign all of them to the same folder (or clear them all to Ungrouped) in one action.

There is no drag-and-drop anywhere on this page.

### 5. The "Select" button

Toggles `selectionMode` on the Review Groups panel (not the objective browser — that's a separate, unrelated checkbox state used only in builder mode). Once active:
- Every visible group card grows a selection checkbox on its header (independent of the card's own expand/collapse chevron).
- A selection bar appears showing "N groups selected" and a "Move to Folder ▾" button. Clicking it opens a small menu: "No Folder / Ungrouped" plus one entry per existing folder (or, if no folders exist yet, a hint prompting you to create one first). Picking an entry calls `assignGroupToFolder` for every selected group ID in one loop, then automatically exits selection mode and clears the selection.
- The Select button itself is replaced by a "Cancel" button while active, which exits selection mode without applying anything.

There is no batch delete, no batch findings-generation, and no other batch action currently wired to selection mode — folder move is the only thing it enables.

### 6. The comment/chat-bubble icon

This lives on each objective row **inside an expanded saved group card** (`SavedGroupCard`, after a group has been created and you expand it) — it is not present in the Builder's "Selected Objectives" list while creating/editing a group; that list only has a × remove button per row. In the saved-card view, each objective row has two small action buttons besides the method chip: a status-cycle button (click cycles Unreviewed → MET → NOT MET → back to Unreviewed, writing directly via `writeObjectiveStatus`) and the comment icon, which shows 💬 if `overallComments` already has text or ○ if empty. Clicking it opens `OverallCommentsPopover` — a small modal with a single textarea pre-filled with the objective's existing `overallComments`, and Save/Cancel. Save writes back through `writeObjectiveResult` (same storage as Control Detail's "Overall Comments" field for that objective — editing it here edits the same underlying data). If a comment exists, its text also renders as a small preview line directly under the row in the expanded card, without needing to open the popover.

### 7. Do method filter chips change the tree structure?

Confirmed consistent across every method tab, including "All." Mechanically: `methodFilter` narrows the flat objective list (`filteredObjs`) before it's ever handed to the grouping component; `GroupedBrowser` then buckets whatever it receives by method → family → control, and only renders accordion sections for methods that actually have objectives left after filtering. So:
- **"All"** → up to six top-level method sections (five real DIBCAC methods + "Variable" for unmapped objectives), each independently collapsible, each internally structured the same way (family → control → objective).
- **Any single method chip** (e.g. "Screen Share") → exactly one top-level section renders, containing only that method's objectives, still organized family → control → objective underneath.
- **Family filter and search** apply as additional narrowing on top of the method filter, before grouping — so combining "Screen Share" + a family dropdown + a search term all narrow the same `filteredObjs` list together, and the resulting tree just has less in it, never a different shape.

### 8. "View variable" link

It's not a navigation link despite the arrow-style label — it's a button that calls `setMethodFilter('unknown')`, i.e. it's a shortcut that applies the same "Variable" method filter chip you could click directly in the filter row. It only appears when `methodFilter === 'all'` and at least one unmapped objective exists, as an inline callout under the filter chips. Clicking it just re-filters the existing accordion in place — no page navigation, no separate view.

### 9. Other clickable elements not yet covered

- **Objective ID button** (e.g. `AC.L1-3.1.1[a]`, monospace) — appears on every objective row in both the left-panel browser and inside expanded saved group cards. Clicking it opens `ObjectivePreview`, a read-only reference modal: control ID/title, objective letter + text, current Objective Status, DIBCAC Standard/method chip, any inheritance sources, assigned artifacts (count + list), and any existing Interview/Examine/Test/Overall Comments text pulled straight from Control Detail's stored data. Footer has a "Open in Control Detail →" link (`/controls/:id#objective-:objId`) and a "Read-only reference" note — nothing in this modal is editable.
- **Folder delete** — each folder header has a Delete button that, on click, doesn't delete immediately; it swaps to an inline "Delete folder? Yes / No" confirm row in place. Confirming deletes the folder and reassigns every group that was in it back to `folderId: null` (Ungrouped) — groups are never deleted when their folder is.
- **Group card chevron / expand-collapse** — clicking the card's name/chevron area (not the action buttons) toggles showing the Planned Ask text and the full per-objective list for that group. Independent of Edit/Findings/Delete/folder-select, which all sit in a separate action row that doesn't trigger the toggle.
- **Group Delete button** — deletes the group immediately, no confirm step (unlike folder delete).
- **Sort controls** ("Name" / "Date Created") — clicking a currently-inactive one switches to it (defaulting Name→ascending, Date Created→descending); clicking the already-active one flips its direction, shown via a ↑/↓ suffix on the button label.
- **Builder-mode hint banner** — a static instructional line ("Check objectives on the left, then click **Add selected objectives**…") shown only while `mode === 'builder'`; not interactive itself.
- **Cancel (Builder panel footer)** — exits the builder back to the default list view without saving, discarding `selectedObjs` and any checked-but-not-added objectives.
- **Save Group / Save Changes button** — disabled until both a non-empty group name and at least one selected objective exist.
