import assert from 'node:assert/strict'
import { resolveControlNavigation } from '../src/utils/controlNavigation.js'

const controls = ['AC-1', 'AC-2', 'AC-3', 'IA-1', 'SC-1'].map((id) => ({ id }))
// The library has already combined assignee, method, and all other filters.
const queue = 'AC-1,AC-3,SC-1'
let nav = resolveControlNavigation(controls, 'AC-3', queue)
assert.equal(nav.previous.id, 'AC-1')
assert.equal(nav.next.id, 'SC-1')
assert.equal(nav.position, 2)
assert.equal(nav.total, 3)
assert.equal(resolveControlNavigation(controls, 'AC-1', queue).previous, null)
assert.equal(resolveControlNavigation(controls, 'SC-1', queue).next, null)
nav = resolveControlNavigation(controls, 'AC-3', 'AC-3')
assert.equal(nav.previous, null)
assert.equal(nav.next, null)
assert.equal(nav.total, 1)
// Direct visits retain normal navigation; malformed queues never escape scope.
assert.equal(resolveControlNavigation(controls, 'AC-3', null).next.id, 'IA-1')
assert.equal(resolveControlNavigation(controls, 'IA-1', queue).next, null)
assert.equal(resolveControlNavigation(controls, 'AC-1', '').next, null)
assert.equal(resolveControlNavigation(controls, 'AC-1', 'unknown,AC-1,AC-1').total, 1)
// URL round trips preserve the queue and existing objective focus.
const params = new URLSearchParams({ reviewControls: queue, focus: 'document', from: '/controls?assignedTo=Vince' })
const restored = new URLSearchParams(params.toString())
assert.equal(restored.get('reviewControls'), queue)
assert.equal(restored.get('focus'), 'document')
console.log('Control navigation passed: filtered scope, ordering, boundaries, direct visits, invalid IDs, and URL round trip.')
