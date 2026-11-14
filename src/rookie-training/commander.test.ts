import { expect, it } from 'vitest'
import { advanceCommander, commanderPending, createCommanderSession, finale, finalFaults, finishCommanderObjective, planningOptions, type CommanderProgress } from './commander'

it.each([1, 4, 9, 27, 99, 2026])('completes the 30-day mission on seed %i', seed => {
  let session = createCommanderSession(seed)
  let completed: CommanderProgress = []
  expect(session.state.crew).toHaveLength(4)
  for (let day = 1; day <= 30; day++) {
    session = advanceCommander(session, completed)
    expect(session.state.tick).toBe(day)
    const pending = commanderPending(day, completed)
    expect(pending).toEqual(day === 6 ? ['temperature'] : day === 12 ? ['signal'] : day === 19 ? ['planning'] : day === 26 ? finale : [])
    if (pending.length) expect(advanceCommander(session, completed)).toBe(session)
    for (const id of seed % 2 === 0 ? pending.reverse() : pending) {
      const before = session
      const result = finishCommanderObjective(session, completed, id)
      session = result.session
      completed = result.completed
      if (id === 'temperature' || id === 'signal' || id === 'planning') expect(session).toBe(before)
      else {
        expect(before.state.condition[finalFaults[id]]).toBe(0)
        expect(session.state.condition[finalFaults[id]]).toBe(1)
        expect(session.state.resources.spareKits).toBe(before.state.resources.spareKits - 1)
      }
      expect(finishCommanderObjective(session, completed, id).session).toBe(session)
      expect(commanderPending(day, completed)).not.toContain(id)
    }
  }
  expect(session.state.outcome).toBe('success')
  expect(session.state.crew.every(member => member.health > 0)).toBe(true)
  expect(completed).toHaveLength(6)
})

it('uses live reserves to change the recommendation and respects mission failure', () => {
  const session = createCommanderSession()
  expect(planningOptions(session).priority).toBe('power')
  const lowFood = { ...session, state: { ...session.state, resources: { ...session.state.resources, foodKg: .1 } } }
  expect(planningOptions(lowFood).priority).toBe('food')
  const depleted = { ...session, state: {
    ...session.state,
    resources: { ...session.state.resources, oxygenKg: 0, batteryKWh: 0 },
    condition: { ...session.state.condition, oxygenPlant: 0, solar: 0 },
  } }
  const failure = advanceCommander(depleted, [])
  expect(failure.state.outcome).toBe('failure')
  expect(advanceCommander(failure, [])).toBe(failure)
  expect(finishCommanderObjective(failure, [], 'finalPower').completed).toHaveLength(0)
})

it('keeps the final repair pending when there is no spare kit', () => {
  const initial = createCommanderSession()
  const session = { ...initial, state: {
    ...initial.state, tick: 26,
    condition: { ...initial.state.condition, solar: 0 },
    resources: { ...initial.state.resources, spareKits: 0 },
  } }
  const completed = ['temperature', 'signal', 'planning'] as const
  expect(finishCommanderObjective(session, completed, 'finalPower')).toEqual({ session, completed })
  expect(commanderPending(26, completed)).toEqual(finale)
})
