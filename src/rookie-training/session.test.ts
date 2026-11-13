import { expect, it } from 'vitest'
import { reduceSurvivalSession } from '../components/dashboard/survivalController'
import { updateProblems } from '../mission-feedback/departments'
import { advanceRookie, createRookieSession } from './session'

it('schedules one real greenhouse incident, repairs it with a kit, and completes day seven', () => {
  const initial = createRookieSession()
  expect(initial.state.tick).toBe(0)
  expect(initial.state.crew).toHaveLength(4)
  const damaged = advanceRookie(initial)
  expect(damaged.events).toContainEqual({ type: 'equipmentDamaged', equipment: 'greenhouse' })
  expect(damaged.events).toContainEqual({ type: 'equipmentFailed', equipment: 'greenhouse' })
  expect(damaged.state.condition.greenhouse).toBe(0)
  const pending = updateProblems([], initial, damaged)
  expect(pending).toEqual([expect.objectContaining({ equipment: 'greenhouse', offline: true })])
  const repaired = reduceSurvivalSession(damaged, { type: 'maintain', equipment: 'greenhouse' })
  expect(repaired.state.tick).toBe(1)
  expect(repaired.state.resources).toEqual({ ...damaged.state.resources, spareKits: 4 })
  expect(repaired.state.crew).toBe(damaged.state.crew)
  expect(updateProblems(pending, damaged, repaired)).toEqual([])
  const repeated = reduceSurvivalSession(repaired, { type: 'maintain', equipment: 'greenhouse' })
  expect(repeated.state).toBe(repaired.state)
  expect(repeated.events).toBe(repaired.events)
  expect(repaired.state.condition.greenhouse).toBe(1)
  expect(advanceRookie(repaired).flows!.food.production).toBeGreaterThan(advanceRookie(damaged).flows!.food.production)
  let session = repaired
  for (let day = 2; day <= 7; day++) session = advanceRookie(session)
  expect(session.state.tick).toBe(7)
  expect(session.state.outcome).toBe('success')
  expect(session.events.filter(({ type }) => type === 'equipmentDamaged')).toHaveLength(1)
  expect(createRookieSession()).toEqual(initial)
})

it('runs the guided greenhouse incident in the ten-day Level 2 session', () => {
  const initial = createRookieSession(2)
  expect(initial.config.missionDays).toBe(10)
  const damaged = advanceRookie(initial, 2)
  expect(damaged.events).toContainEqual({ type: 'equipmentDamaged', equipment: 'greenhouse' })
  expect(damaged.config).toBe(initial.config)
  const repaired = reduceSurvivalSession(damaged, { type: 'maintain', equipment: 'greenhouse' })
  expect(repaired.state.condition.greenhouse).toBe(1)
  expect(repaired.state.tick).toBe(1)
  expect(repaired.state.resources).toEqual({ ...damaged.state.resources, spareKits: 4 })
  expect(updateProblems(updateProblems([], initial, damaged), damaged, repaired)).toEqual([])
})
