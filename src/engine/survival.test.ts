import { describe, expect, it } from 'vitest'
import { applySurvivalAction, createSurvivalState, type SurvivalState } from './survival'
import { survivalDefaults } from './survivalConfig'

const config = { ...survivalDefaults, dailyWear: 0, incidentProbability: 0 }
const initial = () => createSurvivalState(42, config)
const advance = (state: SurvivalState, rules = config) => applySurvivalAction(state, { type: 'advanceTick' }, rules)

describe('lunar survival', () => {
  it('runs a four-person mission for exactly 30 days without negative stocks', () => {
    let state = initial()
    for (let day = 1; day <= 30; day++) {
      const result = advance(state)
      state = result.state
      expect(state.tick).toBe(day)
      expect(state.outcome).toBe(day === 30 ? 'success' : 'active')
      expect(Object.values(state.resources).every(amount => amount >= 0)).toBe(true)
    }
    expect(state.crew).toHaveLength(4)
    expect(advance(state)).toEqual({ state, events: [] })
  })

  it('fails if oxygen runs out and never overdraws resource stocks', () => {
    const state = initial()
    const result = advance({
      ...state,
      resources: { oxygenKg: 0, waterL: 0, foodKg: 0, batteryKWh: 0, spareKits: 0 },
    }, { ...config, oxygenPlantKgPerDay: 0, solarKWhPerDay: 0 })
    expect(Object.values(result.state.resources)).toEqual([0, 0, 0, 0, 0])
    expect(result.state.crew.every(member => member.health === 0)).toBe(true)
    expect(result.events).toContainEqual({ type: 'missionCompleted', outcome: 'failure' })
    const oxygenOnly = advance({
      ...state, resources: { ...state.resources, oxygenKg: 0 },
    }, { ...config, oxygenPlantKgPerDay: 0 })
    expect(oxygenOnly.state.outcome).toBe('failure')
  })

  it('reduces crew health when food is depleted', () => {
    const state = initial()
    const rules = { ...config, greenhouseKgPerDay: 0 }
    const hungry = advance({ ...state, resources: { ...state.resources, foodKg: 0 } }, rules).state
    expect(hungry.resources.foodKg).toBe(0)
    expect(hungry.crew[0].health).toBeLessThan(advance(state, rules).state.crew[0].health)
  })

  it('prioritizes life support and reduces production under a power shortage', () => {
    const state = initial()
    const lowPower = { ...state, resources: { ...state.resources, oxygenKg: 10, foodKg: 10, batteryKWh: 12 } }
    const limited = advance(lowPower, { ...config, solarKWhPerDay: 0 }).state
    const full = advance(lowPower).state
    expect(limited.powerDeliveredKWh).toEqual({ lifeSupport: 8, oxygenPlant: 4, recycler: 0, greenhouse: 0 })
    expect(limited.resources.oxygenKg).toBeLessThan(full.resources.oxygenKg)
    expect(limited.resources.foodKg).toBeLessThan(full.resources.foodKg)
  })

  it('reduces net water consumption through recycling', () => {
    const state = initial()
    const recycled = advance(state).state
    const unrecycled = advance(state, { ...config, waterRecovery: 0 }).state
    expect(recycled.resources.waterL - unrecycled.resources.waterL).toBeCloseTo(12)
  })

  it('increases dose and health loss when shielding fails', () => {
    const state = initial()
    const exposed = advance({ ...state, condition: { ...state.condition, shielding: 0 } }).state
    const shielded = advance(state).state
    expect(exposed.crew[0].doseMilliSv).toBeGreaterThan(shielded.crew[0].doseMilliSv)
    expect(exposed.crew[0].health).toBeLessThan(shielded.crew[0].health)
  })

  it('resolves seeded failures deterministically and repairs equipment with a spare kit', () => {
    const state = initial()
    const rules = { ...config, incidentProbability: 1, incidentDamage: 0.9 }
    const result = advance(state, rules)
    expect(advance(initial(), rules)).toEqual(result)
    expect(state.condition.solar).toBe(1)
    const failure = result.events.find(event => event.type === 'equipmentFailed')
    if (failure?.type !== 'equipmentFailed') throw new Error('Expected an equipment failure')
    const repaired = applySurvivalAction(result.state, { type: 'maintain', equipment: failure.equipment }, rules)
    expect(repaired.state.condition[failure.equipment]).toBeGreaterThan(config.failureThreshold)
    expect(repaired.state.resources.spareKits).toBe(state.resources.spareKits - 1)
  })
})
