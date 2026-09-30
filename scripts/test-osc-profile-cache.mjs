import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { createServer } from 'vite'
const memory = new Map()
let failRead = false
let failWrite = false
globalThis.localStorage = {
  getItem(key) { if (failRead) throw new Error('unavailable'); return memory.get(key) ?? null },
  setItem(key, value) { if (failWrite) throw new Error('quota'); memory.set(key, String(value)) },
  removeItem: (key) => memory.delete(key),
  clear: () => memory.clear(),
  key: (index) => [...memory.keys()][index] ?? null,
  get length() { return memory.size },
}
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
try {
  const osc = await vite.ssrLoadModule('/src/utils/oscProfile.js')
  const key = 'cmmc-osc-profile'
  const saved = osc.writeOscProfile({ staffNames: ['Assessor'], providers: [{ name: 'Cloud', standardsAcceptance: 'FedRAMP High', crmMappings: [{ controls: ['AC-1'], narrative: 'Original' }] }] })
  assert.equal(JSON.parse(memory.get(key)).providers[0].name, 'Cloud', 'write is persisted before returning')
  saved.providers[0].name = 'Unsaved returned edit'
  const read = osc.readOscProfile()
  read.providers[0].crmMappings[0].controls.push('AC-2')
  read.staffNames.push('Unsaved staff')
  const provider = osc.findOscProvider(' CLOUD ')
  provider.standardsAcceptance = ''
  osc.readAssessmentStaff().push('Other unsaved staff')
  assert.equal(osc.readProviderStandardsAcceptance('cloud'), 'FedRAMP High')
  assert.deepEqual(osc.readAssessmentStaff(), ['Assessor'])
  assert.deepEqual(osc.findOscProvider('Cloud').crmMappings[0].controls, ['AC-1'], 'nested caller mutations cannot corrupt cache')
  const original = memory.get(key)
  memory.set(key, original.replaceAll('FedRAMP High', 'FedRAMP Moderate'))
  assert.equal(osc.readProviderStandardsAcceptance('Cloud'), 'FedRAMP Moderate', 'external writes are detected without a storage event')
  memory.set(key, original)
  assert.equal(osc.readProviderStandardsAcceptance('Cloud'), 'FedRAMP High', 'restore immediately invalidates cache')
  failWrite = true
  osc.writeOscProfile({ providers: [{ name: 'Unsaved provider' }] })
  failWrite = false
  assert.equal(osc.findOscProvider('Unsaved provider'), null, 'failed saves cannot poison cache')
  failRead = true
  assert.deepEqual(osc.readOscProfile().providers, [], 'unavailable storage does not expose stale snapshot')
  failRead = false
  assert.equal(osc.readProviderStandardsAcceptance('Cloud'), 'FedRAMP High')
  memory.set(key, '{broken')
  assert.deepEqual(osc.readOscProfile().providers, [])
  memory.set(key, original)
  assert.equal(osc.findOscProvider('Cloud').name, 'Cloud')
  memory.clear()
  assert.deepEqual(osc.readOscProfile().providers, [], 'project wipe invalidates cache')
  osc.writeOscProfile({ providers: Array.from({length: 100}, (_, i) => ({ name: `Provider ${i}`, standardsAcceptance: 'FedRAMP High', crmMappings: Array.from({length: 20}, () => ({ narrative: 'Test mapping', controls: ['AC-1'] })) })) })
  const raw = memory.get(key)
  const iterations = 1000
  let start = performance.now()
  for (let i = 0; i < iterations; i++) osc.normalizeOscProfile(JSON.parse(raw)).providers.find((p) => p.name === 'Provider 99')
  const uncachedMs = performance.now() - start
  osc.readProviderStandardsAcceptance('Provider 99')
  const parse = JSON.parse
  let parses = 0
  JSON.parse = (...args) => { parses++; return parse(...args) }
  let cachedMs
  try {
    start = performance.now()
    for (let i = 0; i < iterations; i++) assert.equal(osc.readProviderStandardsAcceptance('Provider 99'), 'FedRAMP High')
    cachedMs = performance.now() - start
  } finally { JSON.parse = parse }
  assert.equal(parses, 0, 'unchanged provider lookups never reparse the profile')
  console.log(`Cache safety passed: immediate persistence, edit isolation, external changes, restore, wipe, corrupt storage and failures. Synthetic ${iterations}-lookup benchmark: uncached ${uncachedMs.toFixed(1)} ms; cached ${cachedMs.toFixed(1)} ms.`)
} finally { await vite.close() }
