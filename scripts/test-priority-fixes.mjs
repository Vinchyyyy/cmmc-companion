// Regression coverage for a targeted review pass:
//   1. Date Assessed survives export -> re-import (previously silently lost).
//   2. Excel import propagates a control-level inheritance source to every
//      objective, matching every other write path (previously only the
//      control-level fields were written).
//   3. A bare-number text field (>4 digits) skipped by the numeric-cell
//      contamination guard now surfaces a warning instead of vanishing
//      silently.
//   4. Export truncation is Unicode-code-point safe: a value that overflows
//      the 4,000-char cell limit right at a surrogate-pair boundary is cut
//      cleanly instead of leaving a dangling high surrogate (which would
//      serialize to U+FFFD).
//   5. Re-applying a control-level inheritance source (e.g. clicking "Add
//      Inheritance" again to change its level) does not re-add it to an
//      objective the user manually removed it from.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'

const memory = new Map()
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
  clear: () => memory.clear(),
  key: (index) => [...memory.keys()][index] ?? null,
  get length() { return memory.size },
}
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
const load = (name) => vite.ssrLoadModule(`/src/utils/${name}.js`)
try {
  const { default: controls } = await vite.ssrLoadModule('/src/data/controls/index.js')
  const excel        = await load('exportCmmcTemplate')
  const importer      = await load('importAssessmentWorkbook')
  const dateAssessed  = await load('dateAssessed')
  const results       = await load('objectiveResults')
  const inheritance   = await load('inheritance')

  const ac = controls.find((control) => control.id === 'AC.L1-3.1.1')
  const ir = controls.find((control) => control.id.endsWith('3.6.1'))
  const first = ac.objectives[0]

  // --- 1. Date Assessed round-trip -----------------------------------------
  dateAssessed.writeDateAssessed(ac.id, '2026-03-15')
  const template = readFileSync(new URL('../public/templates/CMMC_Level2_AssessmentResults_Template.xlsx', import.meta.url))
  const { workbook } = await excel.buildCmmcTemplateWorkbook(template, controls)
  const bytes = await workbook.generateAsync({ type: 'nodebuffer' })
  const parsed = await importer.parseAssessmentWorkbook(bytes, controls)
  assert.equal(parsed.ok, true)
  assert.equal(parsed.controlData[ac.id].dateAssessed, '2026-03-15', 'Date Assessed round-trips through export/parse')

  memory.clear()
  const summary = importer.applyWorkbookImport(parsed, controls, 'new')
  assert.equal(summary.datesAssessedWritten, 1)
  assert.equal(dateAssessed.readDateAssessed(ac.id), '2026-03-15', 'Date Assessed applied on import')

  // Merge mode must not overwrite an existing local date.
  dateAssessed.writeDateAssessed(ac.id, '2026-01-01')
  importer.applyWorkbookImport(parsed, controls, 'merge')
  assert.equal(dateAssessed.readDateAssessed(ac.id), '2026-01-01', 'merge mode preserves existing local Date Assessed')

  // --- 4. Surrogate-pair-safe truncation ------------------------------------
  memory.clear()
  const emoji = '😀' // 😀 — a UTF-16 surrogate pair
  results.writeObjectiveResult(ir.id, ir.objectives[0].id, { examine: 'a'.repeat(3999) + emoji + 'bb' })
  const { workbook: emojiWorkbook } = await excel.buildCmmcTemplateWorkbook(template, controls)
  const emojiParsed = await importer.parseAssessmentWorkbook(await emojiWorkbook.generateAsync({ type: 'nodebuffer' }), controls)
  const roundTrippedExamine = emojiParsed.objectiveData[ir.id][ir.objectives[0].id].examine
  assert.ok(!roundTrippedExamine.includes('�'), 'truncation must not corrupt a surrogate pair into U+FFFD')
  assert.ok(roundTrippedExamine.endsWith(emoji), 'the emoji survives whole at the truncation boundary')
  assert.equal([...roundTrippedExamine].length, 4000, 'truncated to exactly 4000 code points, not 4000 UTF-16 units')

  // --- 2. Inheritance source propagates to objectives on Excel import ------
  memory.clear()
  const propagationSummary = importer.applyWorkbookImport(
    { controlData: { [ac.id]: { inheritanceSource: 'Test Provider Co' } }, objectiveData: {} },
    controls,
    'new'
  )
  assert.equal(propagationSummary.inheritanceSourcesWritten, 1)
  assert.deepEqual(inheritance.readInheritanceSources(ac.id), ['Test Provider Co'])
  for (const objective of ac.objectives) {
    assert.ok(
      inheritance.readObjectiveInheritance(ac.id, objective.id).includes('Test Provider Co'),
      `objective ${objective.id} receives the imported control-level inheritance source`
    )
  }

  // --- 3. Numeric-text guard surfaces a warning instead of silent loss -----
  memory.clear()
  results.writeObjectiveResult(ir.id, ir.objectives[0].id, { examine: '5551234' })
  const { workbook: numericWorkbook } = await excel.buildCmmcTemplateWorkbook(template, controls)
  const numericParsed = await importer.parseAssessmentWorkbook(await numericWorkbook.generateAsync({ type: 'nodebuffer' }), controls)
  assert.equal(numericParsed.objectiveData[ir.id][ir.objectives[0].id].examine, '', 'bare numeric text is still guarded out')
  assert.ok(
    numericParsed.warnings.some((w) => w.includes('bare number')),
    'a warning explains why the numeric-only value was skipped, instead of vanishing silently'
  )

  // --- 5. Re-applying a source does not stomp a manual objective removal ---
  memory.clear()
  inheritance.applyControlInheritance(ac, 'Partial', 'Provider X')
  for (const objective of ac.objectives) {
    assert.ok(inheritance.readObjectiveInheritance(ac.id, objective.id).includes('Provider X'))
  }
  const removedFrom = ac.objectives[1].id
  inheritance.writeObjectiveInheritance(ac.id, removedFrom, [])
  // Re-apply the same source at a different level (e.g. user clicks "Add
  // Inheritance" again to bump Partial -> Full).
  inheritance.applyControlInheritance(ac, 'Full', 'Provider X')
  assert.equal(inheritance.readInheritance(ac.id), 'Full', 'control-level level still updates')
  assert.ok(
    !inheritance.readObjectiveInheritance(ac.id, removedFrom).includes('Provider X'),
    'manually-removed objective is not silently re-added by re-applying the same source'
  )
  for (const objective of ac.objectives) {
    if (objective.id === removedFrom) continue
    assert.ok(
      inheritance.readObjectiveInheritance(ac.id, objective.id).includes('Provider X'),
      'other objectives keep the source'
    )
  }

  console.log('Priority-fix regression checks passed: Date Assessed round-trip, surrogate-pair-safe truncation, Excel-import inheritance propagation, numeric-text-guard warning, and re-apply-preserves-manual-removal.')
} finally {
  await vite.close()
}
