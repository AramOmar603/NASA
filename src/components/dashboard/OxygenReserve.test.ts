import { expect, it } from 'vitest'
import { oxygenPercent } from './OxygenReserve'

it('uses the supplied tank capacity and clamps to a valid percentage', () => {
  expect(oxygenPercent(36, 72)).toBe(50)
  expect(oxygenPercent(36, 36)).toBe(100)
  expect(oxygenPercent(42, 36)).toBe(100)
  expect(oxygenPercent(-1, 36)).toBe(0)
  expect(oxygenPercent(0, 0)).toBe(0)
  expect(oxygenPercent(36, undefined)).toBeUndefined()
})
