import { expect, it } from 'vitest'
import { initialGameState } from './initialGameState'

it('starts at tick zero with no resources or buildings', () => {
  expect(initialGameState).toEqual({
    tick: 0,
    resources: {},
    buildings: [],
  })
})
