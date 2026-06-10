import { readPool } from './evidencePool.js'
import { readObjectiveArtifacts } from './objectiveArtifacts.js'

export function buildArtifactIndex(controls) {
  // map: lowercase key -> { artifact (display name), usages[] }
  const map = new Map()

  for (const control of controls) {
    // Evidence Pool artifacts
    const poolArtifacts = readPool(control.id)
    for (const raw of poolArtifacts) {
      const name = raw.trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (!map.has(key)) map.set(key, { artifact: name, usages: [] })
      map.get(key).usages.push({
        controlId: control.id,
        controlTitle: control.title,
        objectiveId: null,
        objectiveText: '',
        location: 'Evidence Pool',
      })
    }

    // Objective-level artifacts
    if (Array.isArray(control.objectives)) {
      for (const obj of control.objectives) {
        const objArtifacts = readObjectiveArtifacts(control.id, obj.id)
        for (const raw of objArtifacts) {
          const name = raw.trim()
          if (!name) continue
          const key = name.toLowerCase()
          if (!map.has(key)) map.set(key, { artifact: name, usages: [] })
          map.get(key).usages.push({
            controlId: control.id,
            controlTitle: control.title,
            objectiveId: obj.id,
            objectiveText: obj.text || '',
            location: 'Objective Artifact',
          })
        }
      }
    }
  }

  // Sort usages within each entry by controlId then objectiveId
  for (const entry of map.values()) {
    entry.usages.sort((a, b) => {
      const cmp = a.controlId.localeCompare(b.controlId)
      if (cmp !== 0) return cmp
      if (a.objectiveId === null && b.objectiveId === null) return 0
      if (a.objectiveId === null) return -1
      if (b.objectiveId === null) return 1
      return a.objectiveId.localeCompare(b.objectiveId)
    })
  }

  // Return sorted by artifact display name (case-insensitive)
  return Array.from(map.values()).sort((a, b) =>
    a.artifact.toLowerCase().localeCompare(b.artifact.toLowerCase())
  )
}
