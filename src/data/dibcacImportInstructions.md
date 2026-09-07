# DIBCAC Import Instructions

## Purpose and workflow

Use this specification to create a DIBCAC planning JSON file for CMMC Companion. The importer lives in DIBCAC Mode → Import / Export. Download this document and Export DIBCAC Plan from that dialog before preparing changes. Screenshots can provide current scope and visual context; the exported plan provides exact stable IDs and existing structure. Do not infer hidden objective IDs from screenshots. Ask for clarification when a mapping is ambiguous.

1. Identify the requested objective scope. The catalog below lists valid IDs, not permission to include every objective.
2. Choose groups and each checklist observation's canonical home.
3. Build checklist headers, observable questions/items, and exact objective mappings.
4. Write Planned Ask topics, prompts, and conditional pivots.
5. Wire references after destination groups and checklist items exist.
6. Save a UTF-8 `.json` file containing one object, without Markdown fences or trailing commas.
7. Import it, inspect the preview and warnings, choose Add or Update, then apply.

The dedicated format includes folders, groups, group objectives, checklist headers/questions and their objective mappings, Planned Ask, topics, rich formatting, and references. It is a planning exchange, not a replacement for a full project backup. It does not import objective statuses, findings, artifacts, interviews, overall comments, assignees, or checklist completion. Export Project JSON in Settings remains the full backup of all assessment work, including the imported DIBCAC structures. Full Settings backups and legacy template files use their existing restore/template tools; this importer accepts the dedicated format below.

## File contract — version 1

The root object has `kind: "cmmc-dibcac-plan"`, `version: 1`, `groups` (required, nonempty), and optional `folders` (defaults to `[]`). Unknown fields are rejected to prevent silently losing content. Maximum file size: 3 MB. Maximum groups/folders: 500 each.

All IDs are nonempty strings of up to 160 letters, digits, underscores, or hyphens. Human-readable IDs such as `identity-group`, `identity-users`, and `remote-topic` work. UUIDs work too. Group IDs must be unique. Checklist IDs and topic IDs must each be unique across the file. Do not use display numbers like G1 as a substitute for stable IDs when updating an existing exported group.

Folders have `id` and `name`. Names are nonempty, at most 200 characters.

Groups have:

- `id` and `name`: required stable identity and display name. Names are at most 200 characters.
- `folderId`: optional folder ID or null. Omission means no folder.
- `objectives`: optional array of exact objective reference strings, e.g. `AC.L1-3.1.1[a]`; defaults to empty. The application supplies objective statements and assessment-method metadata from its catalog. Do not submit fabricated statement/standard fields.
- `checklist`: optional ordered array of headers and items, defaults to empty; at most 5,000 entries per group.
- Either `plannedAsk` (plain text) OR `plannedAskRichDocument` (rich format below). Omit both for an empty Planned Ask. Never supply both.

Checklist header: `{ "id": "identity-header", "type": "header", "text": "Authorized users" }`.

Checklist question/item: `{ "id": "identity-users", "type": "item", "text": "Authorized user roster shown", "objKeys": ["AC.L1-3.1.1[a]"] }`.

Checklist text is nonempty, up to 4,000 characters. `objKeys` defaults to an empty array; unmapped items produce a preview warning. Headers do not have objective mappings. Each objective reference must exist in the catalog. No duplicate objective references within a group's objectives or an item's objKeys. The same objective can be mapped to more than one legitimate observation. Checklist mappings may include catalog objectives outside the group's objective pool; review the intended scope carefully. Group objectives not mapped to a checklist item produce a warning, which is useful for unfinished starting groups.

Do not include `checked` or `interviewNote` in the import. New items begin unchecked. Existing checked states and notes are preserved by stable item ID in Update mode.

## Plain Planned Ask syntax

`plannedAsk` is a string, at most 100,000 characters. Use JSON `\n` escapes for line breaks. A standalone `!TOPIC NAME!` line creates a Topic Anchor. Labels are at most 120 characters, contain a letter or digit, and cannot contain another exclamation mark or line break. Topics populate the global navigator in each group.

Start a line with `- ` or `* ` for a bullet. Use two spaces for each nested level (up to four levels). An ordinary line is a paragraph. Bold/color/font-size Markdown syntax is not interpreted; use the rich format for those features.

References such as `@G1-1.1` become actual clickable checklist links. In a plain-text import, G1 means the first group IN THIS FILE, G2 means the second group IN THIS FILE, and so on. Checklist numbering follows file order: headers are 1, 2, 3; items under a header are 1.1, 1.2, then 2.1. Items before any header are numbered 1, 2, etc. References must target an item, never a header. Unresolved references block import. To refer to an existing group outside a partial update file, use rich stable-ID references instead.

The importer resolves display references to stable group/item IDs before adding the plan to your workspace. Later reordering changes visible numbers without changing the link destination.

## Rich Planned Ask format

`plannedAskRichDocument` has `version: 1` and a `blocks` array (maximum 2,000). Every block has:

- `type`: `paragraph`, `bullet`, or `topic`.
- `indent`: integer 0 through 4. Topics must use 0.
- `children`: array of inline nodes (maximum 1,000 per block).
- `topicAnchorId`: required for topic blocks; use a unique stable ID.

Text node: `{ "type": "text", "text": "Show the configuration", "bold": true, "color": "blue", "size": "large" }`.

Only `type` and `text` are required. `bold` is boolean. Supported colors: `default`, `blue`, `green`, `amber`, `red`. Supported sizes: `small`, `normal`, `large`. Text nodes may be empty and are limited to 40,000 characters each. Do not use HTML, arbitrary CSS, hex colors, or unsupported formatting fields.

Reference node: `{ "type": "checklistRef", "groupId": "identity-group", "itemId": "identity-users" }`.

Use reference nodes rather than typing `@G1-1.1` into rich text. The group and item must match the actual target, including for cross-group links. Topic blocks contain only plain label text and no reference nodes. Use a topic block with text `REMOTE ACCESS`, without exclamation marks; plain Planned Ask uses `!REMOTE ACCESS!` instead.

When every referenced checklist item on a Planned Ask block is checked, the app renders that block gray, italicized, and struck through. One incomplete reference keeps the block active. Unchecking restores it. Blocks with no references are not automatically completed. Importing a plan never marks objectives MET. During normal live review, manually checking a mapped checklist item marks its attached objectives MET; unchecking returns them to Unreviewed. Check items only after applying assessor judgment to all mapped objectives.

## Add versus Update

**Add as new groups** is the default. Every imported group, folder, checklist item, and topic receives a new internal ID. All internal references are remapped together. Existing groups remain intact. Colliding group names get a suffix such as `(2)`. Include every referenced group in the file; external links are not allowed in Add mode.

**Update matching group IDs** matches exact IDs, never names or visible G numbers. Export the current plan first and retain those IDs. Existing groups keep their positions; new groups are appended in file order. Groups absent from the file remain untouched. Included groups replace their name, folder assignment, objective pool, Planned Ask, and checklist structure with the submitted structure. Include all desired fields and checklist entries—this is not a field-by-field patch. Matching folder IDs update folder names; other folders are preserved.

Existing checked states and interview notes remain on matching checklist IDs. Removing a completed or noted item is blocked. Changing objective mappings on an item with interview notes is blocked; make that change in the normal editor so note synchronization can be handled there. Links from untouched groups to deleted checklist items also block import. Update mode may use rich references to other existing workspace groups. A preview becomes stale if the saved DIBCAC workspace changes; preview again before applying.

## Assessment-method guidance

Adapted from the supplied **DIBCAC Assessment Method Playbook**. This guidance informs authoring; it does not impose a fixed group taxonomy or override the requested assessment scope.

The central model is **Group → Topic → Checklist Item → Objective IDs**: operational story, current conversation, observable evidence, and regulatory traceability.

Group objectives when they are likely to emerge from the same live conversation, console, SME, process, or evidence chain. Conceptual relatedness alone is not enough. Avoid unnecessary one-objective groups. Family-based starting groups are supported; preserve them when requested, and reorganize across families only when that matches the intended workflow. The playbook's eight example operational stories are identity/access/privilege; session/remote access/external connectivity; logging/monitoring/detection; cryptography/CUI/media; network boundaries/traffic/CUI flow; public systems/information release; endpoint security/configuration/software; and maintenance/remote support. These are examples, not required group names or counts.

Planned Ask is the assessor's runbook: “show us…”, “walk us through…”, “while this is open…”, “if logs appear → …”. Prefer concise, useful branches over polished policy prose. Topics answer “What are we talking about?”; checklist items answer “What did I actually see?” Topic labels do not have to mirror checklist headers.

Give each observable checklist item one canonical home. When its evidence may appear during another conversation, link to it instead of duplicating it. Use the Topic Navigator for broad subject changes and checklist references for exact evidence targets. Add only likely, useful pivots; avoid filling every sentence with links.

Write checklist items as observable outcomes, for example “MFA coverage shown for required access cases,” rather than merely repeating a requirement number. One demonstration can support multiple mapped objectives when each relevant property is actually observed. Use meaningful section headers that reflect observable sub-stories.

While a console or record is open, consider other legitimate assessment opportunities: identity tooling may expose roles, devices, MFA, and privileges; a SIEM may expose log generation, retention, monitoring, and alerts; endpoint tooling may expose compliance, encryption, and configuration; boundary tooling may expose remote paths, traffic restrictions, and CUI flows. Use cross-group references to the canonical items. Shared evidence creates opportunities, not automatic objective closure. Each objective still requires sufficient examine, interview, and/or test evidence and assessor judgment.

Build groups and checklist mappings first, Planned Ask second, then do a separate cross-group wiring pass. Check for duplicate observations, orphan objectives, ambiguous mappings, unnecessary links, and topics that do not aid navigation. Refine the workflow based on actual assessment use rather than speculative complexity.

## Validation checklist

Check exact kind/version, valid JSON, supported fields, unique IDs, valid objective IDs, correct folder targets, correct group/item link pairs, valid rich marks, and complete update structures. Do not invent missing scope. Preserve identifiers from exports when updating. Preview warnings are review aids, while validation errors must be fixed before applying. The complete example and objective catalog follow.
