import { Box3 } from 'three'
import { describe, expect, it } from 'vitest'
import { BASE_HALF_EXTENT } from '../environment/terrain'
import { corridors, outpost } from './layout'
import { makeBuilding, makeCorridor, type Model } from './models'

function bounds(model: Model) {
  const box = new Box3()
  for (const { geometry } of model) {
    geometry.computeBoundingBox()
    if (geometry.boundingBox) box.union(geometry.boundingBox)
    geometry.dispose()
  }
  return box
}

describe('lunar outpost geometry', () => {
  it('provides unique selectable IDs and keeps all facilities above ground and inside the zone', () => {
    expect(new Set(outpost.map(({ id }) => id)).size).toBe(outpost.length)
    for (const { kind, position } of outpost) {
      const model = makeBuilding(kind)
      expect(model.length).toBeGreaterThan(2)
      const box = bounds(model)
      expect(box.min.y).toBeGreaterThanOrEqual(-0.001)
      expect(box.min.x + position.x).toBeGreaterThan(-BASE_HALF_EXTENT)
      expect(box.max.x + position.x).toBeLessThan(BASE_HALF_EXTENT)
      expect(box.min.z + position.y).toBeGreaterThan(-BASE_HALF_EXTENT)
      expect(box.max.z + position.y).toBeLessThan(BASE_HALF_EXTENT)
    }
  })

  it('keeps corridor decks grounded and ribs inside the placement zone', () => {
    for (const { x, z, length, axis } of corridors) {
      const box = bounds(makeCorridor(length))
      expect(box.min.y).toBeGreaterThanOrEqual(-0.001)
      const width = box.max.x
      const halfLength = box.max.z
      expect(Math.abs(x) + (axis === 'x' ? halfLength : width)).toBeLessThan(BASE_HALF_EXTENT)
      expect(Math.abs(z) + (axis === 'z' ? halfLength : width)).toBeLessThan(BASE_HALF_EXTENT)
    }
  })
})
