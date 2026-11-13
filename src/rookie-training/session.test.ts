import { expect, it } from 'vitest'
import { reduceSurvivalSession } from '../components/dashboard/survivalController'
import { advanceRookie, createRookieSession } from './session'

it('schedules one real greenhouse incident, repairs it with a kit, and completes day seven', () => {
  const initial = createRookieSession()
  expect(initial.state.tick).toBe(0)
  expect(initial.state.crew).toHaveLength(4)
  const damaged = advanceRookie(initial)
  expect(damaged.events).toContainEqual({ type: 'equipmentDamaged', equipment: 'greenhouse' })
  expect(damaged.state.condition.greenhouse).toBeLessThan(1)
  const repaired = reduceSurvivalSession(damaged, { type: 'maintain', equipment: 'greenhouse' })
  expect(repaired.state.tick).toBe(1)
  expect(repaired.state.resources.spareKits).toBe(4)
  expect(repaired.state.condition.greenhouse).toBe(1)
  expect(advanceRookie(repaired).flows!.food.production).toBeGreaterThan(advanceRookie(damaged).flows!.food.production)
  let session = repaired
  for (let day = 2; day <= 7; day++) session = advanceRookie(session)
  expect(session.state.tick).toBe(7)
  expect(session.state.outcome).toBe('success')
  expect(session.events.filter(({ type }) => type === 'equipmentDamaged')).toHaveLength(1)
  expect(createRookieSession()).toEqual(initial)
})
