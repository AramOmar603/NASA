import { describe, expect, it } from 'vitest'
import { BASE_ELEVATION, BASE_HALF_EXTENT, terrainHeight, TERRAIN_SIZE } from './terrain'

describe('lunar terrain', () => {
  it('reserves the flat base zone including every edge and corner', () => {
    for (let x = -BASE_HALF_EXTENT; x <= BASE_HALF_EXTENT; x += 5) {
      for (let z = -BASE_HALF_EXTENT; z <= BASE_HALF_EXTENT; z += 5) {
        expect(terrainHeight(x, z)).toBe(BASE_ELEVATION)
      }
    }
  })

  it('has repeatable finite elevations across the surface', () => {
    const edge = TERRAIN_SIZE / 2
    for (let x = -edge; x <= edge; x += 40) {
      for (let z = -edge; z <= edge; z += 40) {
        const height = terrainHeight(x, z)
        expect(Number.isFinite(height)).toBe(true)
        expect(terrainHeight(x, z)).toBe(height)
      }
    }
  })

  it('includes a crater depression with a raised rim and a higher distant ridge', () => {
    const center = terrainHeight(142, -80)
    expect(center).toBeLessThan(terrainHeight(208, -80) - 7)
    expect(Math.max(...[460, 500, 540, 580, 620].map(x => terrainHeight(x, 0)))).toBeGreaterThan(25)
  })
})
