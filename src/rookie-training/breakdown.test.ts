import { expect, it } from 'vitest'
import { advanceBreakdown, breakdownBlock, completeWaterChallenge, waterRepairActivity, createBreakdownSession, initialBreakdown, resolveBreakdownObjective } from './breakdown'

it.each([1, 4, 9, 27, 99, 2026])('completes both repairs and all 15 days with seed %i', (seed) => {
  let session = createBreakdownSession(seed)
  let progress = initialBreakdown
  expect(session.state.tick).toBe(0)
  expect(session.config.missionDays).toBe(15)
  while (session.state.tick < 5) session = advanceBreakdown(session, progress)

  expect(advanceBreakdown(session, progress)).toBe(session)
  const wrong = resolveBreakdownObjective(session, progress, 'roverFixed', false)
  expect(wrong.session).toBe(session)
  expect(wrong.progress).toBe(progress)
  const rover = resolveBreakdownObjective(session, progress, 'roverFixed', true)
  expect(rover.session).toBe(session)
  expect(rover.progress.roverFixed).toBe(true)
  progress = rover.progress

  while (session.state.tick < 9) session = advanceBreakdown(session, progress)
  expect(session.state.condition.recycler).toBe(0)
  expect(session.flows?.water.production).toBe(0)
  expect(advanceBreakdown(session, progress)).toBe(session)
  expect(resolveBreakdownObjective(session, progress, 'waterFixed', true).progress.waterFixed).toBe(false)

  progress = resolveBreakdownObjective(session, progress, 'priorityLearned', true).progress
  expect(breakdownBlock(9, progress)).toBeDefined()
  expect(resolveBreakdownObjective(session, progress, 'waterFixed', false).session).toBe(session)
  const kits = session.state.resources.spareKits
  const repaired = resolveBreakdownObjective(session, progress, 'waterFixed', true)
  expect(repaired.session.state.resources.spareKits).toBe(kits - 1)
  expect(repaired.session.state.condition.recycler).toBe(1)
  expect(resolveBreakdownObjective(repaired.session, repaired.progress, 'waterFixed', true).session).toBe(repaired.session)
  expect(repaired.session.flows?.water.production).toBe(0)

  session = advanceBreakdown(repaired.session, repaired.progress)
  expect(session.flows?.water.production).toBeGreaterThan(0)
  while (session.state.tick < 15 && session.state.outcome === 'active') session = advanceBreakdown(session, repaired.progress)
  expect(session.state.outcome).toBe('success')
  expect(session.state.crew.filter(({ health }) => health > 0)).toHaveLength(4)
})

it('uses the engine failure outcome when a crew cannot get oxygen', () => {
  const session = createBreakdownSession()
  const deprived = {
    ...session,
    state: {
      ...session.state,
      resources: { ...session.state.resources, oxygenKg: 0 },
      condition: { ...session.state.condition, oxygenPlant: 0 },
    },
  }
  const failed = advanceBreakdown(deprived, initialBreakdown)
  expect(failed.state.outcome).toBe('failure')
  expect(advanceBreakdown(failed, initialBreakdown)).toBe(failed)
  expect(resolveBreakdownObjective(failed, initialBreakdown, 'roverFixed', true).progress).toBe(initialBreakdown)
})

it('offers one Day 9 recycler challenge and routes subsequent faults to maintenance', () => {
  let session = createBreakdownSession()
  let progress = initialBreakdown
  while (session.state.tick < 9) {
    expect(waterRepairActivity(session.state.tick, progress, false)).toBeUndefined()
    session = advanceBreakdown(session, progress)
    if (session.state.tick === 5) progress = resolveBreakdownObjective(session, progress, 'roverFixed', true).progress
  }

  expect(waterRepairActivity(9, progress, true)).toBe('waterFixed')
  expect(completeWaterChallenge(session, progress, false)).toEqual({ session, progress })
  const kits = session.state.resources.spareKits
  const repaired = completeWaterChallenge(session, progress, true)
  expect(repaired.progress).toMatchObject({ waterFixed: true, priorityLearned: true })
  expect(repaired.session.state.condition.recycler).toBe(1)
  expect(repaired.session.state.resources.spareKits).toBe(kits - 1)
  expect(completeWaterChallenge(repaired.session, repaired.progress, true).session).toBe(repaired.session)
  expect(waterRepairActivity(9, repaired.progress, false)).toBeUndefined()
  expect(waterRepairActivity(12, repaired.progress, true)).toBe('recycler')

  session = repaired.session
  while (session.state.tick < 15 && session.state.outcome === 'active') {
    session = advanceBreakdown(session, repaired.progress)
    expect(waterRepairActivity(session.state.tick, repaired.progress, false)).toBeUndefined()
  }
  expect(session.state.outcome).toBe('success')
  expect(session.events.filter(event => event.type === 'equipmentRepaired' && event.equipment === 'recycler')).toHaveLength(1)
})
