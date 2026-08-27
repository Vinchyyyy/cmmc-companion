import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'

const memory = new Map()
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
}

const { createServer } = await import('vite')
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })

const {
  applyGlobalArtifact,
  isGlobalArtifactApplied,
  normalizeGlobalEvidence,
  readGlobalEvidence,
  removeGlobalArtifact,
  writeGlobalEvidence,
} = await vite.ssrLoadModule('/src/utils/globalEvidence.js')
const { listArtifacts } = await vite.ssrLoadModule('/src/utils/artifactRegistry.js')
const { readPool } = await vite.ssrLoadModule('/src/utils/evidencePool.js')
const { readObjectiveArtifacts } = await vite.ssrLoadModule('/src/utils/objectiveArtifacts.js')

const controls = [
  { id: 'AC.L1-3.1.1', objectives: [{ id: 'a' }, { id: 'b' }] },
  { id: 'IA.L1-3.5.1', objectives: [{ id: 'a' }] },
]

const normalized = normalizeGlobalEvidence({
  ssp: 'SSP.docx',
  pool: [' Device Inventory.xlsx ', 'device inventory.xlsx', '', 42],
  applied: { pool: ['Device Inventory.xlsx'] },
})
assert.deepEqual(normalized.pool, ['Device Inventory.xlsx'])
assert.deepEqual(normalized.applied.pool, ['Device Inventory.xlsx'])
assert.deepEqual(normalized.families, {})

writeGlobalEvidence(normalized)
assert.deepEqual(readGlobalEvidence().pool, ['Device Inventory.xlsx'])

const counts = applyGlobalArtifact(controls, 'Shared Responsibility Matrix.xlsx', 'general')
assert.deepEqual(counts, { controls: 2, objectives: 3 })
for (const control of controls) {
  assert.deepEqual(readPool(control.id), ['Shared Responsibility Matrix.xlsx'])
  for (const objective of control.objectives) {
    assert.deepEqual(readObjectiveArtifacts(control.id, objective.id), ['Shared Responsibility Matrix.xlsx'])
  }
}
assert.equal(isGlobalArtifactApplied(controls, 'shared responsibility matrix.xlsx'), true)
assert.deepEqual(listArtifacts().find((artifact) => artifact.name === 'Shared Responsibility Matrix.xlsx')?.tags, [])

applyGlobalArtifact(controls, 'SHARED RESPONSIBILITY MATRIX.XLSX', 'general')
assert.equal(readPool(controls[0].id).length, 1)
assert.equal(readObjectiveArtifacts(controls[0].id, 'a').length, 1)

const removed = removeGlobalArtifact(controls, 'shared responsibility matrix.xlsx')
assert.deepEqual(removed, { controls: 2, objectives: 3 })
assert.equal(isGlobalArtifactApplied(controls, 'Shared Responsibility Matrix.xlsx'), false)
assert.deepEqual(readPool(controls[0].id), [])
assert.deepEqual(readObjectiveArtifacts(controls[1].id, 'a'), [])

const stressControls = Array.from({ length: 110 }, (_, controlIndex) => ({
  id: `T${controlIndex}`,
  objectives: Array.from({ length: 3 }, (_, objectiveIndex) => ({ id: String(objectiveIndex) })),
}))
const started = performance.now()
applyGlobalArtifact(stressControls, 'Enterprise Device Inventory.csv', 'general')
assert.equal(isGlobalArtifactApplied(stressControls, 'Enterprise Device Inventory.csv'), true)
removeGlobalArtifact(stressControls, 'Enterprise Device Inventory.csv')
const elapsed = performance.now() - started
assert.ok(elapsed < 5000, `Global pool stress cycle took ${elapsed.toFixed(0)}ms`)

console.log(`Global evidence pool tests passed (110 controls and 330 objectives in ${elapsed.toFixed(0)}ms).`)
await vite.close()
