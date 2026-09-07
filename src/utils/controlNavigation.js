// Carry the actual library results, including filters stored outside the URL.
// A stable queue lets an assessor finish a review even as statuses change.
export function resolveControlNavigation(orderedControls, currentId, queueParam) {
  const scoped = queueParam !== null
  const ids = new Set((queueParam ?? '').split(','))
  const queue = scoped ? orderedControls.filter((control) => ids.has(control.id)) : orderedControls
  const index = queue.findIndex((control) => control.id === currentId)
  return {
    scoped,
    total: queue.length,
    position: index < 0 ? 0 : index + 1,
    previous: index > 0 ? queue[index - 1] : null,
    next: index >= 0 && index < queue.length - 1 ? queue[index + 1] : null,
  }
}
