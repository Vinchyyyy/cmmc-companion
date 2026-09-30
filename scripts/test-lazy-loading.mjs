import assert from 'node:assert/strict'
import { build } from 'vite'
import { gzipSync } from 'node:zlib'

const bundle = await build({ logLevel: 'silent', build: { write: false } })
const chunks = bundle.output.filter((item) => item.type === 'chunk')
const byFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
const initial = new Set()
function visit(chunk) {
  if (!chunk || initial.has(chunk.fileName)) return
  initial.add(chunk.fileName)
  chunk.imports.forEach((file) => visit(byFile.get(file)))
}
chunks.filter((chunk) => chunk.isEntry).forEach(visit)
const initialModules = [...initial].flatMap((file) => Object.keys(byFile.get(file).modules))
for (const page of ['Settings', 'ControlDetail', 'ControlLibrary', 'DibcacMode', 'OscProfile', 'Changelog']) {
  assert.ok(!initialModules.some((id) => id.endsWith(`/pages/${page}.jsx`)), `${page} must stay out of startup dependencies`)
  assert.ok(chunks.some((chunk) => Object.keys(chunk.modules).some((id) => id.endsWith(`/pages/${page}.jsx`))), `${page} is included in a deferred chunk`)
}
assert.ok(!initialModules.some((id) => id.includes('/jszip/')), 'Excel ZIP library must not load at startup')
const zipChunk = chunks.find((chunk) => Object.keys(chunk.modules).some((id) => id.includes('/jszip/')))
assert.ok(zipChunk && chunks.some((chunk) => chunk.dynamicImports.includes(zipChunk.fileName)), 'Excel ZIP library is dynamically loaded')
const bytes = [...initial].reduce((n, file) => n + Buffer.byteLength(byFile.get(file).code), 0)
const compressed = [...initial].reduce((n, file) => n + gzipSync(byFile.get(file).code).length, 0)
assert.ok(bytes < 1_200_000, 'startup JavaScript must remain below 1.2 MB')
console.log(`Lazy-loading checks passed. Initial JavaScript including shared dependencies: ${bytes} bytes; gzip ${compressed} bytes.`)
