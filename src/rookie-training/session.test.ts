import { expect, it } from 'vitest'
import { reduceSurvivalSession } from '../components/dashboard/survivalController'
import { updateProblems } from '../mission-feedback/departments'
import { advanceRookie, createRookieSession, hasPendingTraining } from './session'

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

it('runs distinct solar and oxygen failures and recovers production in ten days', () => {
  const initial = createRookieSession(2)
  expect(initial.config.missionDays).toBe(10)
  const solarFailure = advanceRookie(initial, 2)
  expect(solarFailure.events).toContainEqual({ type: 'equipmentFailed', equipment: 'solar' })
  expect(solarFailure.flows?.power.production).toBe(0)
  expect(solarFailure.state.resources.batteryKWh).toBeLessThan(initial.state.resources.batteryKWh)
  const solarRepair = reduceSurvivalSession(solarFailure, { type: 'maintain', equipment: 'solar' })
  expect(solarRepair.state.resources.spareKits).toBe(4)
  const dayTwo = advanceRookie(solarRepair, 2)
  expect(dayTwo.flows?.power.production).toBeGreaterThan(0)
  const oxygenFailure = advanceRookie(dayTwo, 2)
  expect(oxygenFailure.events).toContainEqual({ type: 'equipmentFailed', equipment: 'oxygenPlant' })
  expect(oxygenFailure.flows?.oxygen.production).toBe(0)
  const oxygenRepair = reduceSurvivalSession(oxygenFailure, { type: 'maintain', equipment: 'oxygenPlant' })
  expect(oxygenRepair.state.tick).toBe(3)
  expect(oxygenRepair.state.resources).toEqual({ ...oxygenFailure.state.resources, spareKits: 3 })
  expect(updateProblems(updateProblems([], dayTwo, oxygenFailure), oxygenFailure, oxygenRepair)).toEqual([])
  let session = advanceRookie(oxygenRepair, 2)
  expect(session.flows?.oxygen.production).toBeGreaterThan(0)
  for (let day = 5; day <= 10; day++) session = advanceRookie(session, 2)
  expect(session.state.outcome).toBe('success')
  expect(session.state.tick).toBe(10)
  expect(session.events).not.toContainEqual({ type: 'equipmentDamaged', equipment: 'greenhouse' })
})

it.each([[1, 'greenhouse'], [2, 'solar'], [2, 'oxygenPlant']] as const)(
  'runs Level %i %s training once and allows later maintenance',
  (level, equipment) => {
    let session = createRookieSession(level)
    expect(hasPendingTraining(level, equipment, session)).toBe(false)
    for (let day = 0; day < (equipment === 'oxygenPlant' ? 3 : 1); day++) {
      session = advanceRookie(session, level)
      if (equipment === 'oxygenPlant' && day === 0) {
        session = reduceSurvivalSession(session, { type: 'maintain', equipment: 'solar' })
      }
    }
    expect(hasPendingTraining(level, equipment, session)).toBe(true)
    const repaired = reduceSurvivalSession(session, { type: 'maintain', equipment })
    expect(repaired.state.resources.spareKits).toBe(session.state.resources.spareKits - 1)
    expect(hasPendingTraining(level, equipment, repaired)).toBe(false)

    const laterFault = {
      ...repaired,
      state: { ...repaired.state, condition: { ...repaired.state.condition, [equipment]: 0 } },
      events: [...repaired.events, { type: 'equipmentFailed' as const, equipment }],
    }
    expect(hasPendingTraining(level, equipment, laterFault)).toBe(false)
    expect(reduceSurvivalSession(laterFault, { type: 'maintain', equipment }).state.condition[equipment]).toBe(1)
  },
)

it('keeps greenhouse faults in other levels out of the greenhouse tutorial', () => {
  const fault = advanceRookie(createRookieSession(1))
  expect(hasPendingTraining(2, 'greenhouse', fault)).toBe(false)
  expect(hasPendingTraining(3, 'greenhouse', fault)).toBe(false)
})
