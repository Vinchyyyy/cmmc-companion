import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const memory = new Map()
globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: (key) => memory.delete(key) }
const server = await createServer({
  server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent',
  plugins: [{ name: 'capture-note-controls', enforce: 'pre', transform(source, id) {
    if (!id.endsWith('/src/pages/DibcacMode.jsx')) return
    // Capture actual rendered event handlers without changing their behavior.
    return source.replace(/<button\b/g, '<TestButton').replace(/<\/button>/g, '</TestButton>')
      .replace(/<textarea\b/g, '<TestTextarea').replace(/<\/textarea>/g, '</TestTextarea>') + `
function TestButton(props) { globalThis.__noteUi.buttons.push(props); return <button {...props} /> }
function TestTextarea(props) { globalThis.__noteUi.textareas.push(props); return <textarea {...props} /> }
export { SavedGroupCard as TestSavedGroupCard, ChecklistNoteContext as TestNoteContext };
`
  } }],
})
try {
  const { TestSavedGroupCard, TestNoteContext } = await server.ssrLoadModule('/src/pages/DibcacMode.jsx')
  const { readObjectiveResult, writeObjectiveResult, combinedInterviewText } = await server.ssrLoadModule('/src/utils/objectiveResults.js')
  let groups = ['first', 'second'].map((id) => ({ id, name: id, objectives: [], checklist: [{ id: `${id}-item`, type: 'item', text: `${id} observation`, objKeys: ['AC.L1-3.1.1[a]'] }] }))
  let openChecklistNoteKey = null
  const setOpenChecklistNoteKey = (value) => { openChecklistNoteKey = typeof value === 'function' ? value(openChecklistNoteKey) : value }
  const render = () => {
    globalThis.__noteUi = { buttons: [], textareas: [] }
    renderToStaticMarkup(React.createElement(TestNoteContext.Provider, { value: { openChecklistNoteKey, setOpenChecklistNoteKey } }, groups.map((group) => React.createElement(TestSavedGroupCard, {
      key: group.id, group, allGroups: groups, isExpanded: true, referenceIndex: [],
      onUpdateChecklist: (id, checklist) => { groups = groups.map((entry) => entry.id === id ? { ...entry, checklist } : entry) },
    }))))
    return globalThis.__noteUi
  }
  const toggles = (ui) => ui.buttons.filter((button) => button.className?.includes('dibcac-checklist-note-toggle'))
  const button = (ui, text) => ui.buttons.find((entry) => entry.children === text)
  writeObjectiveResult('AC.L1-3.1.1', 'a', { interviews: 'Manual interview text' })
  let ui = render()
  toggles(ui)[0].onClick()
  ui = render()
  assert.equal(ui.textareas.length, 1)
  ui.textareas[0].onChange({ target: { value: 'Typed without clicking Save' } })
  assert.equal(groups[0].checklist[0].interviewNote, 'Typed without clicking Save')
  assert.match(combinedInterviewText(readObjectiveResult('AC.L1-3.1.1', 'a')), /Typed without clicking Save/)
  ui = render()
  toggles(ui)[1].onClick()
  ui = render()
  assert.equal(ui.textareas.length, 1, 'only one editor across different groups')
  assert.equal(ui.textareas[0].id, 'checklist-note-second-item')
  ui.textareas[0].onChange({ target: { value: 'Second autosaved note' } })
  ui = render()
  button(ui, 'Save note').onClick()
  assert.equal(render().textareas.length, 0, 'Save note closes editor')
  ui = render(); toggles(ui)[0].onClick(); ui = render()
  assert.equal(ui.textareas[0].value, 'Typed without clicking Save', 'reopening restores saved text')
  ui.textareas[0].onChange({ target: { value: 'Updated on every input' } })
  ui = render(); button(ui, 'Close').onClick()
  assert.equal(render().textareas.length, 0)
  assert.equal(groups[0].checklist[0].interviewNote, 'Updated on every input')
  ui = render(); toggles(ui)[0].onClick(); ui = render(); button(ui, 'Clear note').onClick()
  assert.equal(groups[0].checklist[0].interviewNote, '')
  const notes = combinedInterviewText(readObjectiveResult('AC.L1-3.1.1', 'a'))
  assert(!notes.includes('Updated on every input'))
  assert(notes.includes('Manual interview text'))
  assert(notes.includes('Second autosaved note'))
  console.log('Note autosave passed: input persists to checklist/objectives, cross-group single editor, Save/Close, reopening, clearing, and manual-note preservation.')
} finally { await server.close(); delete globalThis.__noteUi }
