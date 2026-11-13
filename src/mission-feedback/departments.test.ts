import { describe, expect, it } from 'vitest'
import { createSurvivalSession, reduceSurvivalSession } from '../components/dashboard/survivalController'
import { survivalDefaults } from '../engine/survivalConfig'
import { outpost } from '../scene/buildings'
import { activeFailures, departments, repairFeedback } from './departments'

describe('mission feedback', () => {
  it('names every fixture building', () => {
    expect(Object.keys(departments).sort()).toEqual(outpost.map(({ id }) => id).sort())
  })

  it('keeps the same incident across days and resolves it only when the engine restores operation', () => {
    const initial = createSurvivalSession(1, { ...survivalDefaults, incidentProbability: 1, incidentDamage: 1 })
    const failed = reduceSurvivalSession(initial, { type: 'advanceTick' })
    const [incident] = activeFailures(failed)
    expect(incident).toBeDefined()
    const nextDay = reduceSurvivalSession(failed, { type: 'advanceTick' })
    expect(activeFailures(nextDay).filter(({ equipment }) => equipment === incident.equipment)).toEqual([incident])
    const repaired = reduceSurvivalSession(failed, { type: 'maintain', equipment: incident.equipment })
    expect(repaired.state.resources.spareKits).toBe(initial.state.resources.spareKits - 1)
    expect(activeFailures(repaired)).toEqual([])
    expect(repaired.events.slice(0, failed.events.length)).toEqual(failed.events)
    expect(repairFeedback(failed, repaired, incident.equipment)).toBe('operational')
  })

  it('distinguishes an incomplete repair and an unavailable repair', () => {
    const initial = createSurvivalSession(1, { ...survivalDefaults, incidentProbability: 1, incidentDamage: 1, repairAmount: 0.1 })
    const failed = reduceSurvivalSession(initial, { type: 'advanceTick' })
    const [incident] = activeFailures(failed)
    const partial = reduceSurvivalSession(failed, { type: 'maintain', equipment: incident.equipment })
    expect(activeFailures(partial)).toEqual([incident])
    expect(repairFeedback(failed, partial, incident.equipment)).toBe('still-offline')
    const blocked = { ...partial, state: { ...partial.state, resources: { ...partial.state.resources, spareKits: 0 } } }
    expect(repairFeedback(blocked, reduceSurvivalSession(blocked, { type: 'maintain', equipment: incident.equipment }), incident.equipment)).toBeUndefined()
  })
})
