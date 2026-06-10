/**
 * Kill Chain lookup helpers.
 * Pure functions — no React imports, no localStorage, no side effects.
 * Safe to import from any page, utility, or future chain analysis feature.
 */

import { KILL_CHAINS, CONTROL_TO_KILL_CHAIN } from '../data/killChains.js'

/**
 * Returns { id, name } for the kill chain that owns this control, or null.
 *
 * @param {string} controlId  e.g. 'AC.L1-3.1.1'
 * @returns {{ id: number, name: string } | null}
 */
export function getKillChainByControl(controlId) {
  return CONTROL_TO_KILL_CHAIN[controlId] ?? null
}

/**
 * Returns the full kill chain entry by numeric id, or null.
 *
 * @param {number} id  e.g. 13
 * @returns {{ id: number, name: string, controls: string[] } | null}
 */
export function getKillChainById(id) {
  return KILL_CHAINS.find((kc) => kc.id === id) ?? null
}

/**
 * Returns the controls array for a kill chain id.
 * Returns an empty array if the id is not found.
 *
 * @param {number} killChainId
 * @returns {string[]}
 */
export function getControlsForKillChain(killChainId) {
  return getKillChainById(killChainId)?.controls ?? []
}

/**
 * Infers the dominant kill chain category for a set of control IDs.
 *
 * Counts how many times each kill chain name appears across the given
 * controls, then returns:
 *   - the kill chain name if one category has the highest count
 *   - 'Mixed' if two or more categories tie for the highest count
 *   - 'Uncategorized' if no control maps to any kill chain
 *
 * @param {string[]} controlIds  e.g. ['AC.L1-3.1.1', 'IA.L1-3.5.1']
 * @returns {string}
 */
export function inferKillChainCategory(controlIds) {
  const counts = {}
  for (const cid of controlIds) {
    const kc = getKillChainByControl(cid)
    if (kc) counts[kc.name] = (counts[kc.name] ?? 0) + 1
  }
  const names = Object.keys(counts)
  if (names.length === 0) return 'Uncategorized'
  const max = Math.max(...Object.values(counts))
  const winners = names.filter((n) => counts[n] === max)
  return winners.length === 1 ? winners[0] : 'Mixed'
}

/**
 * Returns summary statistics across all kill chains in the dataset.
 *
 * @returns {{
 *   categories: number,
 *   mappedControls: number,
 *   largestChain: { id: number, name: string, count: number },
 *   smallestChain: { id: number, name: string, count: number },
 * }}
 */
export function getKillChainStats() {
  const allControls = KILL_CHAINS.flatMap((kc) => kc.controls)

  const largest = KILL_CHAINS.reduce(
    (max, kc) => (kc.controls.length > max.count
      ? { id: kc.id, name: kc.name, count: kc.controls.length }
      : max),
    { id: null, name: null, count: 0 }
  )

  const smallest = KILL_CHAINS.reduce(
    (min, kc) => (kc.controls.length < min.count
      ? { id: kc.id, name: kc.name, count: kc.controls.length }
      : min),
    { id: KILL_CHAINS[0].id, name: KILL_CHAINS[0].name, count: KILL_CHAINS[0].controls.length }
  )

  return {
    categories: KILL_CHAINS.length,
    mappedControls: allControls.length,
    largestChain: largest,
    smallestChain: smallest,
  }
}
