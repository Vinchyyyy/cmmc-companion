import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Expose the internal reader only inside this test's module loader.
const server = await createServer({
  server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent',
  plugins: [{
    name: 'test-planned-ask-reader', enforce: 'pre',
    transform(source, id) {
      if (id.endsWith('/src/pages/DibcacMode.jsx')) return `${source}\nexport { PlannedAskReadOnly as TestPlannedAskReader };\n`
    },
  }],
})
try {
  const { TestPlannedAskReader } = await server.ssrLoadModule('/src/pages/DibcacMode.jsx')
  const { plannedAskReferenceDomId } = await server.ssrLoadModule('/src/utils/dibcacRichText.js')
  const props = {
    groupId: 'source',
    referenceIndex: [{ groupId: 'target', itemId: 'item', displayRef: 'G2-1.1', label: 'Authorized users', checked: true }],
    document: { version: 1, blocks: [
      { type: 'topic', topicAnchorId: 'users', children: [{ type: 'text', text: 'USERS' }] },
      { type: 'bullet', children: [{ type: 'text', text: 'show users ' }, { type: 'checklistRef', groupId: 'target', itemId: 'item' }] },
      { type: 'bullet', children: [{ type: 'text', text: 'if permissions appear ' }, { type: 'checklistRef', groupId: 'target', itemId: 'item' }] },
    ] },
  }
  const render = (highlightedAskTargetId) => renderToStaticMarkup(React.createElement(TestPlannedAskReader, { ...props, highlightedAskTargetId }))
  const html = render(plannedAskReferenceDomId({ groupId: 'source', blockIndex: 2, nodeIndex: 1 }))
  assert.equal((html.match(/dibcac-rich-block--highlighted/g) ?? []).length, 1)
  assert.match(html, /dibcac-rich-block--complete dibcac-rich-block--highlighted/)
  assert.match(html, /dibcac-rich-block--highlighted[^>]*><span[^>]*>if permissions appear/)
  assert(!render(null).includes('dibcac-rich-block--highlighted'))
  assert(!render(plannedAskReferenceDomId({ groupId: 'other', blockIndex: 2, nodeIndex: 1 })).includes('dibcac-rich-block--highlighted'))
  assert(render('source:users').includes('dibcac-rich-topic--highlighted'))
  console.log('Navigation highlight passed: exact return line, repeated cross-group references, completed lines, cleared highlights, and topic navigation.')
} finally {
  await server.close()
}
