# DIBCAC Mode Technical Architecture

## Purpose and Scope

This document describes the current DIBCAC Mode implementation in CMMC Companion. It is intended as a technical handoff for a developer or a future ChatGPT session that needs to modify DIBCAC Mode without rediscovering its storage model, UI flow, numbering rules, or backup behavior.

The primary implementation is concentrated in:

- `src/pages/DibcacMode.jsx` — page state, builder, saved-group UI, checklist UI, selection/move workflows, dynamic numbering, and objective preview.
- `src/utils/reviewGroups.js` — localStorage persistence and CRUD helpers for groups and folders.
- `src/utils/dibcacTemplates.js` — dedicated DIBCAC template normalization, import/export, and instantiation.
- `src/utils/projectState.js` — full Settings project JSON export/import.
- `src/utils/checklistInterviewNotes.js` — synchronization between checklist interview notes and objective results.
- `src/utils/objectiveResults.js` — objective result storage, including source-aware checklist interview notes.
- `src/components/DibcacTemplatesModal.jsx` — template-management UI.
- `src/styles.css` — all DIBCAC Mode presentation rules.

This is a description and extension analysis only. It does not implement the proposed Planned Ask cross-reference feature.

## Current Component Structure

`DibcacMode` is the page-level owner. It builds a flat catalog of all CMMC objectives, owns persisted groups/folders and expansion state, and switches the right rail between browse and builder modes.

Important components and functions inside `src/pages/DibcacMode.jsx` are:

| Component/function | Responsibility |
| --- | --- |
| `DibcacMode` | Page-level data, filters, saved group/folder state, create/edit/delete/move actions, templates, and objective preview state. |
| `GroupedBrowser` | Left-side objective browser grouped by assessment method, family, and control. |
| `ObjectiveRow` | Selectable objective row with a clickable reference that opens `ObjectivePreview`. |
| `ObjectivePreview` | Read-only modal showing objective status, method, inheritance, artifacts, results, and a deep link to Control Detail. |
| `BuilderPanel` | Creates or edits one review group, including its name, objectives, Planned Ask, headers, and checklist items. |
| `ObjectiveAttachPicker` | Searchable selector used to attach catalog objectives to a checklist item. |
| `SavedGroupsPanel` | Saved-group rail, folder partitioning, sorting, group selection, and cross-group objective selection. |
| `FolderSection` | Renders a saved folder and the groups assigned to it. |
| `SavedGroupCard` | Read-only/saved group presentation, checklist execution, objective cards/list, notes, findings, and group-level objective selection. |
| `ChecklistInterviewNoteEditor` | Edits an assessment-specific interview note belonging to one checklist item. |
| `numberChecklistEntries` | Derives the current visible header/item numbers from the checklist array. |

## DIBCAC Mode Data Model

### Local storage keys

`src/utils/reviewGroups.js` stores the main workspace in two localStorage entries:

| Key | Value |
| --- | --- |
| `cmmc-companion-dibcac-review-groups` | JSON array of review-group objects. |
| `cmmc-companion-dibcac-review-folders` | JSON array of folder objects. |

Additional DIBCAC-related localStorage entries include:

| Key | Purpose |
| --- | --- |
| `cmmc-dibcac-templates` | User-created reusable DIBCAC templates. |
| `cmmc-dibcac-open-folder-ids` | UI-only set of currently open folder IDs. |
| `cmmc-dibcac-expanded-group-ids` | UI-only set of currently expanded group IDs. |
| `cmmc-dibcac-group-obj-view` | Saved objective presentation preference (`list` or `cards`). |
| `cmmc-dibcac-hide-met` | Whether the objective browser hides MET objectives. |
| `cmmc-dibcac-rail-expanded` | Whether Review Groups fills the workspace. |

The UI-only expansion/view preferences are not part of the full project backup.

### Review group shape

A current group is structurally equivalent to:

```json
{
  "id": "group-uuid",
  "name": "Authorized Users, Processes, and Devices",
  "folderId": "folder-uuid-or-null",
  "plannedAsk": "Plain text planned ask...",
  "objectives": [
    {
      "key": "AC.L1-3.1.1[a]",
      "controlId": "AC.L1-3.1.1",
      "objId": "a",
      "objText": "authorized users are identified;",
      "standard": "artifact"
    }
  ],
  "checklist": [],
  "createdAt": "ISO-8601 timestamp",
  "updatedAt": "ISO-8601 timestamp when updated"
}
```

`folderId` is optional in older data and is treated as `null`/ungrouped when absent or when its folder no longer exists. `updatedAt` is added by update and move operations; it is not required on initial creation.

New groups created in `BuilderPanel` use `crypto.randomUUID()` for `id`. `createReviewGroup` prepends the new group to the stored array and supplies `createdAt` if missing.

### Group order

There is no explicit `order` field and no drag-to-reorder behavior for review groups.

Several distinct notions of order exist:

1. **Storage array order.** `saveReviewGroups` preserves the supplied array. `createReviewGroup` prepends new groups. Move/remove/update operations map the existing array and therefore preserve its current order. Creating a group from cross-group selections also prepends the new group.
2. **Saved Groups display sort.** `SavedGroupsPanel` creates `sortedGroups`. The user can sort by `name` or `createdAt`, ascending or descending. The default component state is `createdAt` ascending. This sort preference is not persisted.
3. **Folder presentation order.** Folders are rendered in the stored `reviewFolders` array order. Each folder receives groups from `sortedGroups`; ungrouped groups are rendered separately after folders.

Consequently, there is not yet one authoritative user-controlled “group order.” A future `G1`, `G2`, `G3` label must define whether it follows raw storage order, current temporary sort order, or a new persisted canonical order.

### Objectives assigned to groups

Each group contains an `objectives` array. The stable domain reference is the string:

```text
${controlId}[${objId}]
```

For example: `AC.L1-3.1.1[b]`.

Current group objects use `key`; compatibility helpers also recognize the older `objectiveRef` name. Objective records repeat `controlId`, `objId`, `objText`, and assessment `standard` so the group remains directly renderable.

The objective identifier is not a generated UUID. It is a stable catalog identity composed from the control ID and the objective’s local ID (`a`, `b`, `c`, and so on). An objective may appear in multiple review groups. Move/copy logic deduplicates within a destination group by `key`/`objectiveRef`.

Checklist mappings are independent of group membership: a checklist item may reference any objective in the application catalog even if that objective is not present in the group’s `objectives` array.

### Planned Ask

`plannedAsk` is a string directly on the group object. It is trimmed on save.

It is plain text, not Markdown, HTML, or a rich-text document. Newlines are retained in the string and displayed using CSS `white-space: pre-wrap`. No Markdown parsing, linkification, token parsing, or inline entity rendering occurs today.

### Checklist representation

The checklist is one flat, ordered array containing both headers and items. There is no nested section object. A header begins a logical section, and following items belong visually to that header until another header is encountered.

Header shape:

```json
{
  "id": "header-uuid",
  "type": "header",
  "text": "User Login, Authentication, and MFA"
}
```

Checklist item shape:

```json
{
  "id": "item-uuid",
  "type": "item",
  "text": "MFA shown and explained",
  "objKeys": [
    "AC.L1-3.1.1[a]",
    "IA.L2-3.5.3[b]"
  ],
  "checked": false,
  "interviewNote": "Optional assessment-specific note"
}
```

Headers and items are created with `crypto.randomUUID()`. Their IDs remain unchanged when text, objective mappings, completion state, or array position changes. This makes `item.id` the correct permanent identity for a future cross-reference.

`objKeys` is an array of catalog objective-reference strings. The `ObjectiveAttachPicker` searches all objectives and adds/removes these strings. Duplicate attachments are prevented by the picker state and toggle logic.

### Completion state

The stored checklist item has a Boolean `checked` field. Its effective behavior depends on mappings:

- If `objKeys` is empty, `SavedGroupCard.isItemMet` uses the stored `checked` value.
- If one or more objectives are attached, effective completion is derived live: every attached objective must currently have status `MET`.
- Checking a mapped item writes all attached objective statuses to `MET`; unchecking writes them to `Unreviewed`. The parent control status is then synchronized.
- Marking mapped objectives MET also invokes automatic finding creation.
- The item’s stored `checked` value is still updated, but mapped-objective status is authoritative for rendering.

Reusable templates deliberately reset `checked` to `false`. Full Settings backups preserve it.

### Checklist interview-note identity

An item’s editable note is stored as `interviewNote` on the checklist item. It is also synchronized into each attached objective’s result under a source key:

```text
${group.id}:${item.id}
```

This is handled by `src/utils/checklistInterviewNotes.js`. The source-aware design permits several checklist items to contribute notes to the same objective without overwriting manual interview text or one another.

### Folders

A folder is structurally:

```json
{
  "id": "folder-uuid",
  "name": "Access Control",
  "createdAt": "ISO-8601 timestamp"
}
```

Folders use `crypto.randomUUID()`. A group references a folder only by `folderId`. Deleting a folder unassigns its groups rather than deleting them.

### Schema versions

The full Settings project JSON uses `SCHEMA_VERSION = 9` in `src/utils/projectState.js` and currently accepts versions 1 through 9.

Dedicated DIBCAC template JSON uses a separate `templateSchemaVersion = 1` and `kind = "cmmc-dibcac-template"` in `src/utils/dibcacTemplates.js`.

The local review-group storage itself is not wrapped in an explicit schema version. Compatibility is handled through optional fields and fallbacks such as `key ?? objectiveRef`.

## Dynamic Numbering Behavior

`numberChecklistEntries(checklist)` derives a `Map<entry.id, displayNumber>` every time the checklist array changes.

Rules:

- A header increments the top-level counter: `1`, `2`, `3`, etc.
- Items following a header increment that header’s child counter: `1.1`, `1.2`, `2.1`, etc.
- An item appearing before the first header receives a top-level whole number. A later header continues after it, avoiding duplicate visible numbers.

Both `BuilderPanel` and `SavedGroupCard` compute the map with `useMemo` from the current checklist array. Numbers are display-only; they are not written into header/item text and are not serialized.

Because numbering is derived from array position:

- Inserting or removing a header renumbers later headers and their children.
- Inserting or removing an item renumbers later items in the same section.
- Dragging an entry immediately recalculates its number and the numbers around it.
- IDs remain stable through all renumbering.

This is already the correct identity/display separation required by the proposed cross-reference feature.

Dynamic group labels are not implemented. Stable group UUIDs exist, but the absence of a canonical persisted display order must be resolved before adding `G#` labels.

## Planned Ask Behavior

### Editing flow

Clicking a group’s **Edit** action calls `handleEditRequest(group)` in `DibcacMode`. This stores the full group in `editingGroup`, changes the page to `builder` mode, and clears the left-browser checkbox selection.

`BuilderPanel` initializes local state from the group:

- `groupName` from `editingGroup.name`
- `plannedAsk` from `editingGroup.plannedAsk`
- `selectedObjs` from `editingGroup.objectives`
- `checklist` from `editingGroup.checklist`

The Planned Ask editor is `AutoExpandTextarea`, a small component declared in `DibcacMode.jsx`. It renders a controlled native `<textarea>` with `id="planned-ask"`, grows its height based on `scrollHeight`, and passes edits to `setPlannedAsk`.

Saving calls `BuilderPanel.handleSave`, trims `plannedAsk`, and passes the updated group to `DibcacMode.handleSaveGroup`. Editing uses `updateReviewGroup`, retaining the stable group ID and other spread fields while replacing the name, Planned Ask, objectives, and checklist.

### Saved/read-only rendering

`SavedGroupCard` renders a saved Planned Ask inside:

```jsx
<p className="dibcac-group-card-ask-text">{group.plannedAsk}</p>
```

CSS uses `white-space: pre-wrap`, so newlines and wrapping are preserved. React escapes the string. There is no `dangerouslySetInnerHTML`, Markdown renderer, URL parser, or entity parser.

### Existing inline/clickable behavior relevant to Planned Ask

The Planned Ask itself has none. Elsewhere in the application, buttons, links, chips, and preview modals provide patterns that can be reused, but a future Planned Ask renderer will need to split/parse stored content and emit React elements for references.

## Checklist UI Behavior

### Builder rendering

`BuilderPanel` maps the flat checklist array:

- Headers render as `.dibcac-checklist-header-edit-row` containing a drag handle, derived number, controlled text input, and remove button.
- Items render as `.dibcac-checklist-edit-row` containing a drag handle, derived number, controlled text input, remove button, and `ObjectiveAttachPicker`.
- Both entry types are draggable and share the same reorder function.

The add-header and add-item forms append entries to the array. Headers do not own child arrays; adjacency defines the visual section.

### Saved rendering

`SavedGroupCard` maps the same flat array:

- Headers render as `.dibcac-checklist-header-row` with a derived number and label.
- Items render as `.dibcac-checklist-row` with checkbox, derived number, label, mapped objectives, and an Interview Notes toggle/editor.
- A mapped objective displays both its canonical reference and the current full objective statement resolved from `CONTROL_BY_ID`.

Headers and normal checklist content do not independently expand or collapse. The entire group card is expanded/collapsed. Interview Notes is the only item-level expandable region; its open state is a component-local `Set` of item IDs and is not persisted.

### Objective mapping display

For each `objKeys` value, `SavedGroupCard.objectiveDetailsFor` parses the reference, finds the control in `CONTROL_BY_ID`, finds the objective by local ID, and displays:

```text
AC.L1-3.1.1[b]  processes acting on behalf of authorized users are identified;
```

If resolution fails, the UI retains the reference and displays “Objective statement unavailable.”

### DOM identity and navigation support

Current React `key` values use stable IDs, but most of those IDs are not exposed as DOM IDs or data attributes:

- `SavedGroupCard` uses `group.id` as its React key in parent lists, but the card has no `id`/`data-group-id` attribute.
- Header and item rows use `item.id` as React keys, but do not expose `id`/`data-checklist-item-id`.
- The Interview Notes textarea does expose `id="checklist-note-${item.id}"`, but this is not a suitable canonical anchor for the entire row.
- Planned Ask uses the non-unique-across-theoretical-instances `id="planned-ask"`; only one builder is mounted in normal operation.

Group expansion is already controllable from `DibcacMode` through `expandedGroupIds`. Folder expansion is similarly controlled through `openFolderIds`. Both sets are persisted locally.

There is no current checklist-item-specific scroll, focus, highlight, or deep-link mechanism. No route/hash parser targets a DIBCAC group or checklist item. A future implementation must add DOM anchors/data attributes, expansion orchestration, and a post-render scroll/highlight step.

Control Detail provides a useful precedent: it reads `location.hash`, selects the referenced objective, waits for React to render, then calls `scrollIntoView({ behavior: 'smooth', block: 'start' })` on `#objective-${objId}`.

## Existing Reusable Reference and Tag Behavior

### `ObjectiveAttachPicker` — `src/pages/DibcacMode.jsx`

This is the closest functional match for the proposed `@` suggestions. It:

- Accepts text input.
- Searches reference, objective ID, objective text, and control title.
- Excludes already attached objectives.
- Limits results to eight.
- Renders `reference — label` rows.
- Uses `onMouseDown` to select without losing input focus.
- Renders selected references as removable chips.

It can be used as a design/code pattern, but should probably be generalized rather than reused directly because it is hard-coded to CMMC objective records and attachment callbacks.

### `EvidenceTagPickerModal` — `src/components/EvidenceTagPickerModal.jsx`

This modal provides searchable, keyboard-focusable selection with selected chips, clear-all behavior, grouped results, accessibility labels, Escape handling, and `useFocusTrap`. It is useful as a robust interaction/accessibility pattern. It is too large and modal-oriented for inline `@` completion but contains reusable state and filtering ideas.

### `ArtifactTagChipList` — `src/components/ArtifactTagChipList.jsx`

Displays compact evidence tag chips and optionally removable chips. It is suitable as a styling pattern for a rendered Planned Ask reference token, although checklist references need button/link semantics rather than passive spans.

### `ExpectedEvidenceTypes` — `src/components/ExpectedEvidenceTypes.jsx`

Renders clickable evidence-type chips that toggle a detail panel with `aria-expanded`/`aria-controls`. This is a useful accessible pattern if a checklist-reference token should reveal a preview panel before navigation.

### Provider and assignee suggestion lists — `src/pages/ControlDetail.jsx`

The provider and assignment editors use `.provider-picker-wrapper`, `.provider-picker-results`, and `.provider-picker-result` for inline typeahead menus. `ObjectiveAttachPicker` also reuses these styles. These are the most direct existing CSS primitives for an inline Planned Ask suggestion menu.

### `ControlLink` — `src/components/ControlLink.jsx`

`ControlLink` is a small React Router link that navigates to `/controls/{id}` and stops event propagation. It demonstrates the preferred reusable-link abstraction. It cannot be used unchanged because future checklist references target DIBCAC group/item UUIDs rather than a control route.

### Objective reference buttons and `ObjectivePreview` — `src/pages/DibcacMode.jsx`

`ObjectiveRow` and saved objective rows render a reference as a button. Clicking sets `previewKey`, which mounts `ObjectivePreview`. The preview then offers a deep link to `/controls/{controlId}#objective-{objId}`. This is a good pattern for a clickable compact reference that opens contextual information without immediately navigating away.

### Control Detail objective deep links — `src/pages/ControlDetail.jsx`

This is the strongest navigation/scroll precedent. The page:

1. Reads a hash such as `#objective-a`.
2. Selects the target objective in component state.
3. Waits until the DOM is painted.
4. Calls `scrollIntoView` on the target ID.

The DIBCAC equivalent will also need to open a folder, expand a group, wait for rendering, scroll, and briefly highlight.

### Relationship popover — `src/pages/RelationshipExplorer.jsx`

`RelPopover` is a compact contextual panel with a canonical `ControlLink` and follow-up navigation actions. It is a reasonable visual/interaction reference if Planned Ask tokens should support a detail popover.

### Add-to-group modal — `src/pages/ControlDetail.jsx`

`AddToGroupModal` resolves a stable objective reference, selects an existing group or creates a group, prevents duplicate assignments, and uses `useFocusTrap`. It is useful for group-selection logic and modal accessibility, though not directly reusable as an inline mention control.

### CRM searchable selector — `src/pages/CrmResponsibilityMapper.jsx`

This feature provides another listbox-oriented searchable selector with match summaries and multi-select behavior. It may be useful if the future checklist-reference picker needs richer keyboard or multi-selection behavior.

### Current `@mention` support

No generic mention/token editor, content-editable rich-text component, or `@` parser currently exists. The future feature will be new at the data/parser layer even though suggestion-list and clickable-chip patterns can be reused.

## Import and Export Behavior

### Full Settings project backup

`exportProjectState` in `src/utils/projectState.js` exports these top-level fields directly:

```json
{
  "schemaVersion": 9,
  "reviewGroups": [],
  "reviewFolders": [],
  "dibcacTemplates": [],
  "controls": []
}
```

Because `reviewGroups` comes directly from `getReviewGroups()`, full backups serialize group array order, IDs, folder assignments, Planned Ask strings, objective assignments, checklist order, header/item IDs, item mappings, `checked`, `interviewNote`, timestamps, and any other enumerable fields present on group objects.

Source-aware synchronized checklist notes also appear under each control/objective’s `objectiveResults.checklistInterviewNotes`, keyed by `${group.id}:${item.id}`.

Import behavior for DIBCAC workspace data is replace-only:

- If `reviewGroups` is an array and import mode is `replace`, it is passed directly to `saveReviewGroups`.
- `reviewFolders` is similarly restored directly.
- In `fill-empty` mode, groups/folders/templates are not imported because merging them has no defined empty-field semantics.
- If an older backup omits these top-level fields, existing local DIBCAC data is left unchanged.

### Unknown field preservation

For full project backups, review groups and folders are not normalized or field-filtered during import. Unknown fields are preserved when imported, stored, and exported again. Editing a group spreads `editingGroup`, and checklist text/mapping updates spread each entry, so unrelated optional fields will usually survive ordinary edits.

However, this is permissive rather than formally versioned validation. Any future field required for correct behavior should still be sanitized and documented, and a full schema-version bump should be considered if old clients cannot safely ignore it.

### Dedicated DIBCAC templates

Templates intentionally use a stricter normalized subset. `normalizeDibcacTemplate` strips unknown fields and retains only:

- Folder: `id`, `name`
- Group: `id`, `name`, `folderId`, `plannedAsk`, normalized objectives, normalized checklist
- Checklist header: `id`, `type`, `text`
- Checklist item: `id`, `type`, `text`, `objKeys`, reset `checked: false`

Assessment-specific `interviewNote` is intentionally omitted. Template instantiation generates new group, folder, header, and item IDs to prevent collisions and resets checklist completion.

Therefore, any future reference metadata that must travel in dedicated templates must be explicitly added to `cleanChecklistEntry`, `normalizeDibcacTemplate`, and instantiation logic. Unknown reference metadata will otherwise be stripped.

### Would cross-reference metadata require migration?

Optional structured reference metadata can be added compatibly to schema 9 full backups because older groups already tolerate absent fields and full imports preserve unknown group data. Nonetheless:

- Bump the full project schema if Planned Ask storage changes from a string to a required structured representation.
- Keep reading legacy string-only `plannedAsk` indefinitely.
- Bump `DIBCAC_TEMPLATE_SCHEMA_VERSION` if dedicated templates must preserve references.
- Ensure imported references are validated against existing group/item IDs and rendered gracefully when targets are missing.

The permanent test `scripts/test-project-dibcac-roundtrip.mjs` currently verifies full JSON round-trip preservation of groups, folders, objective assignments, checklist structure, completion, source notes, and templates. It should be extended for cross-reference metadata.

## Reordering Behavior

### Review groups

Review groups cannot currently be drag-reordered. The persisted array has an order, but the visible UI applies a temporary sort and folder partitioning. Group IDs remain stable during sorting, folder moves, objective moves, and edits.

If `G#` is derived from the currently rendered order, changing Name/Date sort could change every visible group reference even though nothing was structurally reordered. That may be acceptable for a purely dynamic label, but it makes screenshots and spoken references unstable. A canonical persisted order is preferable.

### Checklist headers and items

Headers and items are draggable in `BuilderPanel`. They share one flat array and one reorder operation. Dropping an entry removes it from its old index and inserts it before the target (or at the end).

Stable properties after reorder:

- Group UUID
- Header/item UUID
- Objective reference strings
- Header/item text
- Checklist interview-note source identity (`group.id:item.id`)

Derived properties that change:

- Header number
- Item number
- Logical section membership, because section membership is implied by position after the nearest preceding header

This is exactly why future stored references must point to `group.id` plus `item.id`, never to `G1-1.3`.

## Recommended Extension Points

### 1. Extract a shared checklist index

Move or complement `numberChecklistEntries` with a pure utility that accepts the canonical ordered groups and returns records such as:

```js
{
  groupId,
  groupDisplayNumber,
  itemId,
  localNumber,
  displayRef: `G${groupNumber}-${localNumber}`,
  label,
  folderId
}
```

Both rendering and Planned Ask suggestions should consume the same index to prevent numbering drift.

### 2. Establish canonical group order first

The safest approach is to add explicit persisted group ordering, either:

- an `order`/`sortIndex` field; or
- a documented guarantee that the stored `reviewGroups` array is canonical, plus group drag-reordering that persists that array.

Do not derive permanent-facing `G#` labels independently inside each folder or from ephemeral Name/Date sort state unless that behavior is explicitly desired. Decide whether folders alter global numbering. The proposed examples imply one global group sequence.

### 3. Add stable DOM anchors

Enhance saved rendering with stable attributes, for example:

```jsx
<div id={`dibcac-group-${group.id}`} data-group-id={group.id}>
<div id={`dibcac-item-${item.id}`} data-checklist-item-id={item.id}>
```

IDs may need a safe encoding helper if non-UUID legacy IDs are possible. React keys alone are not discoverable through the DOM.

### 4. Add a navigation coordinator at `DibcacMode`

Implement a page-level function such as `navigateToChecklistItem({ groupId, itemId })` that:

1. Finds the target group and folder from current saved state.
2. Adds the folder ID to `openFolderIds` when applicable.
3. Adds the group ID to `expandedGroupIds`.
4. Switches from builder/modal state to browse mode if necessary.
5. Waits for the expanded item to render.
6. Calls `scrollIntoView` on the stable item anchor.
7. Applies a temporary highlight/focus class and then removes it.

This should follow the Control Detail hash-navigation precedent. The target item itself does not need an expansion step because headers/items are not collapsed today; only the folder and group do.

### 5. Build a dedicated inline reference picker

Generalize the filtering and menu behavior from `ObjectiveAttachPicker`/provider pickers. The suggestion record should contain stable identity and derived presentation separately:

```js
{
  groupId: "stable-group-uuid",
  itemId: "stable-item-uuid",
  displayRef: "G1-1.3",
  label: "MFA configuration covers required access cases"
}
```

The menu can display `${displayRef} — ${label}` while selection inserts stable identity metadata.

### 6. Separate editing from read-only rendering

Keep the editor as a textarea initially if possible. Add a Planned Ask parser/tokenizer around it rather than immediately adopting `contentEditable`, which introduces cursor, paste, selection, accessibility, and serialization complexity.

A separate read-only renderer can emit text nodes and reference buttons. Reference buttons can reuse chip/link styling and call the navigation coordinator.

### 7. Validate dangling references

Deleting a checklist item or group can leave a reference target missing. Do not silently retarget based on the old display number. Render a clear non-clickable “missing checklist reference” state and provide cleanup/editing support.

Optionally, deletion flows can report how many Planned Ask references target the item, but the stable stored token must remain authoritative.

## Cross-Reference Feature Readiness

### Reusable pieces already present

- Stable UUIDs for groups, headers, checklist items, and folders.
- Stable catalog keys for CMMC objectives.
- One flat ordered checklist array that supports deterministic numbering.
- `numberChecklistEntries` for derived local labels.
- Controlled folder/group expansion state at the page level.
- Search and suggestion UI patterns in `ObjectiveAttachPicker` and provider pickers.
- Clickable reference and preview patterns in `ObjectiveRow`/`ObjectivePreview`.
- Hash-to-state-to-scroll precedent in Control Detail.
- Full project backups that preserve arbitrary group/checklist metadata.
- Source-aware `group.id:item.id` identity already used for checklist interview notes.

### New pieces required

- A canonical persisted global group order and a single shared group/checklist numbering index.
- A structured Planned Ask reference representation or companion metadata field.
- Inline `@` detection, query extraction, keyboard navigation, and suggestion-menu positioning.
- A read-only Planned Ask renderer that emits clickable reference elements.
- Stable DOM anchors/data attributes for groups and checklist items.
- A navigation coordinator that opens folders/groups, scrolls, focuses, and highlights.
- Missing-target validation and presentation.
- Template normalization and backup tests for any new reference metadata.

### Recommended storage representation

Do not store `G1-1.3` as identity. Store `groupId` and `itemId` and derive the current visible label at render time.

The recommended near-term model is to keep `plannedAsk` as plain text for backward compatibility and add structured spans/metadata, for example:

```json
{
  "plannedAsk": "Show authentication and then review the referenced checklist item.",
  "plannedAskReferences": [
    {
      "id": "reference-instance-uuid",
      "start": 40,
      "end": 61,
      "groupId": "stable-group-uuid",
      "itemId": "stable-item-uuid"
    }
  ]
}
```

Character offsets are easy to serialize but fragile during arbitrary textarea edits. A more resilient alternative is an explicit plain-text token containing stable IDs, such as:

```text
[[dibcac:group-uuid:item-uuid]]
```

The editor could display/insert a friendly form while the saved renderer resolves the token. However, raw UUID tokens are unpleasant if exposed in a textarea.

For this codebase, the best balance is a versioned structured Planned Ask document stored alongside the legacy string:

```json
{
  "plannedAsk": "Legacy/fallback plain text representation",
  "plannedAskContent": [
    { "type": "text", "text": "Show authentication, then see " },
    { "type": "checklistRef", "groupId": "group-uuid", "itemId": "item-uuid" },
    { "type": "text", "text": "." }
  ]
}
```

This avoids offset corruption, keeps identity stable, permits a deterministic plain-text fallback, and makes read-only rendering straightforward. It does require a purpose-built editor adapter or careful textarea serialization. A pragmatic staged implementation could begin with tokens, then migrate to structured segments while retaining legacy parsing.

The implemented rich-text extension adds `plannedAskRichDocument` while continuing to generate both fields above for backward compatibility:

```json
{
  "plannedAskRichDocument": {
    "version": 1,
    "blocks": [
      {
        "type": "bullet",
        "indent": 1,
        "children": [
          { "type": "text", "text": "Demonstrate ", "bold": true, "color": "blue", "size": "large" },
          { "type": "checklistRef", "groupId": "group-uuid", "itemId": "item-uuid" }
        ]
      }
    ]
  }
}
```

Supported formatting is intentionally limited to paragraph/bullet blocks, Topic Anchor headings, indentation levels 0–4, bold, the approved color palette, and small/normal/large text. Full-project JSON schema 11 and DIBCAC template schema 4 preserve this document. Template instantiation remaps reference nodes to regenerated group and checklist-item IDs and regenerates Topic Anchor IDs. Imported legacy strings and `plannedAskContent` arrays are migrated into a version-1 rich document when loaded, edited, or templated.

Topic Anchors use a block with stable identity separate from its editable label:

```json
{
  "type": "topic",
  "indent": 0,
  "topicAnchorId": "stable-topic-uuid",
  "children": [{ "type": "text", "text": "REMOTE ACCESS" }]
}
```

Typing a complete `!REMOTE ACCESS!` line promotes it to this structured block immediately. Renaming the block updates only its text and retains `topicAnchorId`. The global Topic Navigator derives its entries from canonical review-group order followed by block order, while navigation resolves `groupId + topicAnchorId`, expands the containing folder/group, and targets the stable rendered DOM anchor. Normal exclamation punctuation is not promoted because the entire trimmed block must match the paired-delimiter syntax and contain at least one letter or number.

### Stable behavior across reordering

Every reference must resolve by `groupId + itemId`. At render time:

1. Build the current canonical group/checklist index.
2. Find the target stable IDs.
3. Derive the current `G#-section.item` label.
4. Render that current label and current item text.

Reordering then changes only the visible label. The reference continues to navigate to the same checklist item.

### Backup and import risks

- Full project JSON will preserve optional new group fields, but schema/version documentation and validation should still be updated.
- Dedicated DIBCAC templates strip unknown fields, so references will be lost unless explicitly normalized.
- Template instantiation regenerates group/item IDs. Any internal references inside a template must be remapped from old IDs to newly generated IDs during instantiation.
- Importing old schema versions must continue supporting string-only `plannedAsk`.
- Dangling IDs can result from deletion, partial/corrupt imports, or templates that omit referenced targets.
- `fill-empty` import mode does not restore DIBCAC groups, so references should not be merged independently of their targets.

### Recommended implementation sequence

1. Define and persist canonical global group order; add group reorder UI if needed.
2. Extract a tested pure numbering/index utility used by all displays.
3. Add stable DOM anchors and page-level checklist navigation/highlighting.
4. Define a backward-compatible reference data model using group/item UUIDs.
5. Extend full backup and dedicated template normalization/remapping, including schema versions and round-trip tests.
6. Implement the inline `@` suggestion picker using the shared checklist index.
7. Implement the read-only Planned Ask renderer with clickable reference buttons.
8. Add tests for reorder stability, folder/group expansion, dangling references, template ID remapping, and legacy Planned Ask strings.

This sequence minimizes data risk: stable ordering, navigation, and serialization are settled before the editor begins creating references.
