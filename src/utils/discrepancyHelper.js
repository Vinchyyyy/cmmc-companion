import { normalizeObjectivePhrase } from './findingStatementBuilder.js'

export function joinComponents(items) {
  if (items.length < 2) return items.join('')
  if (items.length === 2) return items.join(' and ')
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

// Only offer direct negatives for grammar we recognize. Other objectives get
// an evidence-based starter rather than a mechanically inverted assertion.
export function getDiscrepancyHelper(objectiveText) {
  const phrase = normalizeObjectivePhrase(String(objectiveText ?? '').replace(/;\s*and\s*$/i, ''))
  const capitalized = phrase.charAt(0).toUpperCase() + phrase.slice(1)
  const includes = phrase.match(/^(.+?) includes (.+)$/i)
  if (includes) {
    const components = includes[2].split(/,\s*(?:and\s+)?|\s+and\s+/).map((item) => item.trim()).filter(Boolean)
    if (components.length > 1) return {
      components,
      build: (selected) => {
        const ordered = components.filter((item) => selected.includes(item))
        if (!ordered.length) return ''
        const subject = includes[1].charAt(0).toUpperCase() + includes[1].slice(1)
        return `${subject} did not include ${joinComponents(ordered)}. The assessment team therefore could not confirm that ${includes[1]} included all components required by this objective.`
      },
    }
  }
  const negative = /\b(is|are|has been|have been)\b(?!\s+not\b)/i
  return {
    components: [],
    autoDraft: negative.test(capitalized),
    statement: negative.test(capitalized)
      ? `${capitalized.replace(negative, '$1 not')}.`
      : `The evidence provided did not demonstrate that ${phrase}.`,
  }
}
