import { describe, expect, it } from 'vitest'
import { advanceDisaster, createDisasterSession, fixDisasterFault, pendingDisasterFaults } from './disaster'
import { powerPlan, startingSettings, reconnectOpening, repairOpening, runOpeningShift, startOpeningEmergency, type PowerPlan } from './openingEmergencyModel'

function allocate(lifeSupport: number, oxygenPlant: number, recycler: number, greenhouse: number): PowerPlan {
  return { lifeSupport, oxygenPlant, recycler, greenhouse }
}

describe('Level 4 opening emergency', () => {
  const base = createDisasterSession()
  it.each(['solar', 'recycler'] as const)('stabilizes with one %s repair and carries the real costs into the mission', equipment => {
    const first = { ...startingSettings, recycler: equipment === 'solar' ? 'High' : 'Medium' } as const
    const second = equipment === 'solar' ? first : { ...first, greenhouse: 'Low' } as const
    const plans = [powerPlan(first), powerPlan(second)]
    const opening = startOpeningEmergency(base)
    const repaired = repairOpening(opening, equipment)
    expect(repaired.session.state.resources.spareKits).toBe(6)
    expect(repairOpening(repaired, 'solar')).toBe(repaired)
    const result = plans.reduce(runOpeningShift, repaired)
    expect(result.status, result.feedback).toBe('success')
    expect(result.session.state.powerDeliveredKWh).toEqual(plans[1])
    const next = reconnectOpening(base, result)
    expect(next.state.tick).toBe(0)
    expect(next.state.resources.batteryKWh).toBe(Math.min(base.config.batteryCapacityKWh, base.state.resources.batteryKWh - opening.session.state.resources.batteryKWh + result.session.state.resources.batteryKWh))
    expect(next.state.resources.foodKg).toBeLessThan(base.state.resources.foodKg)
    expect(next.state.condition[equipment]).toBe(1)
    expect(next.state.resources.spareKits).toBe(6)

    let session = next
    let completed: ReturnType<typeof pendingDisasterFaults> = []
    for (let day = 1; day <= 20; day++) {
      session = advanceDisaster(session, completed)
      for (const fault of pendingDisasterFaults(day, completed)) {
        const repaired = fixDisasterFault(session, completed, fault)
        expect(repaired.blocked).toBeUndefined()
        session = repaired.session
        completed = [...repaired.completed]
      }
    }
    expect(session.state.outcome, JSON.stringify({ day: session.state.tick, stocks: session.state.resources, condition: session.state.condition })).toBe('success')
    expect(session.state.resources.spareKits).toBe(2)
  })

  it('makes the same pump plan run short of backup power after sunlight falls', () => {
    const repaired = repairOpening(startOpeningEmergency(base), 'recycler')
    const plan = powerPlan(startingSettings)
    const first = runOpeningShift(repaired, plan)
    expect(first.status).toBe('active')
    expect(runOpeningShift(first, plan).feedback).toMatch(/backup/)
  })

  it('rejects overspending and lets a failed attempt restart without touching mission state', () => {
    const start = startOpeningEmergency(base)
    const low = powerPlan({ lifeSupport: 'Low', oxygenPlant: 'Low', recycler: 'Low', greenhouse: 'Low' })
    const first = runOpeningShift(runOpeningShift(start, low), low)
    expect(first.status).toBe('failure')
    expect(first.feedback).toMatch(/cold/)
    expect(reconnectOpening(base, first)).toBe(base)
    expect(startOpeningEmergency(base)).toEqual(start)
    const overBudget = runOpeningShift({ ...start, session: { ...start.session,
      state: { ...start.session.state, resources: { ...start.session.state.resources, batteryKWh: 0 } },
    } }, allocate(4, 9, 4.5, 7))
    expect(overBudget.shift).toBe(0)
    expect(overBudget.feedback).toMatch(/power/)
  })
})
