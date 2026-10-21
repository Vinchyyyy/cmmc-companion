import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { matchesDateAssessed } from '../src/utils/dateAssessed.js'

assert(matchesDateAssessed('', {}))
assert(matchesDateAssessed('2026-10-21', { mode: 'dated' }))
assert(!matchesDateAssessed('', { mode: 'dated' }))
assert(matchesDateAssessed('', { mode: 'undated' }))
assert(!matchesDateAssessed('2026-10-21', { mode: 'undated' }))
assert(matchesDateAssessed('2026-10-21', { mode: 'range', from: '2026-10-21', to: '2026-10-21' }))
assert(!matchesDateAssessed('2026-10-20', { mode: 'range', from: '2026-10-21' }))
assert(matchesDateAssessed('2026-10-21', { mode: 'range', to: '2026-10-21' }))
assert(!matchesDateAssessed('', { mode: 'range' }))
assert(!matchesDateAssessed('2026-02-30', { mode: 'dated' }))
assert(matchesDateAssessed('2028-02-29', { mode: 'range', from: '2028-02-29', to: '2028-02-29' }))
assert(!matchesDateAssessed('2026-10-21', { mode: 'range', from: '2026-10-22', to: '2026-10-20' }))
assert(!matchesDateAssessed('2026-10-21', { mode: 'range', from: 'invalid' }))

const memory = new Map()
globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: (key) => memory.delete(key) }
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent', plugins: [{ name: 'filter-test-exports', enforce: 'pre', transform(source, id) {
  if (id.endsWith('/src/pages/ControlLibrary.jsx')) return `${source}\nexport { FILTER_KEYS, CHIP_FILTER_KEYS, DEFAULTS, chipLabel, FilterModal };\n`
} }] })
try {
  const mod = await server.ssrLoadModule('/src/pages/ControlLibrary.jsx')
  const { writeDateAssessed } = await server.ssrLoadModule('/src/utils/dateAssessed.js')
  writeDateAssessed('AC.L1-3.1.1', '2026-10-20')
  writeDateAssessed('AC.L1-3.1.2', '2026-10-21')
  const render = (query) => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [`/controls?${query}`] }, React.createElement(mod.default)))
  const hasControl = (html, id) => html.includes(`href="/controls/${id}?`)
  let html = render('dateAssessed=range&dateAssessedFrom=2026-10-21&dateAssessedTo=2026-10-21')
  assert(hasControl(html, 'AC.L1-3.1.2'))
  assert(!hasControl(html, 'AC.L1-3.1.1'))
  assert(!hasControl(html, 'AC.L2-3.1.3'))
  assert(html.includes('Assessed from: Oct 21, 2026'))
  html = render('dateAssessed=dated')
  assert(hasControl(html, 'AC.L1-3.1.1') && hasControl(html, 'AC.L1-3.1.2'))
  assert(!hasControl(html, 'AC.L2-3.1.3'))
  html = render('dateAssessed=undated')
  assert(!hasControl(html, 'AC.L1-3.1.1') && !hasControl(html, 'AC.L1-3.1.2'))
  assert(hasControl(html, 'AC.L2-3.1.3'))
  html = render('dateAssessed=dated&family=Awareness+and+Training')
  assert(!hasControl(html, 'AC.L1-3.1.1'))
  for (const key of ['dateAssessed', 'dateAssessedFrom', 'dateAssessedTo']) {
    assert(mod.FILTER_KEYS.includes(key), 'Clear Filters includes date criteria')
    assert(mod.CHIP_FILTER_KEYS.includes(key), 'saved filters and removable chips include date criteria')
    assert.equal(mod.DEFAULTS[key], '')
  }
  const props = { dateFilter: { mode: 'range', from: '2026-10-22', to: '2026-10-20' }, savedFilters: [], activeChips: [], usedAssignedTo: [], usedInheritanceSources: [] }
  for (const key of ['statusSet','warningsSet','notesSet','artifactsSet','inheritSet','scoreSet','poamSet','inheritanceSourceSet','assignedToSet','dibcacMethodSet','dibcacHideMetSet']) props[key] = new Set()
  html = renderToStaticMarkup(React.createElement(mod.FilterModal, props))
  assert(html.includes('Date Assessed from') && html.includes('Date Assessed through'))
  assert(html.includes('From must be on or before Through.'))
  console.log('Date filter passed: dated/undated, inclusive single-day/open ranges, invalid/reversed dates, rendered control results and family combinations, date chips, saved/clear filter keys, and modal validation.')
} finally { await server.close() }
