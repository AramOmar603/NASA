import { describe, expect, it } from 'vitest'
import { applySurvivalAction, createSurvivalState } from '../engine/survival'
import { survivalDefaults } from '../engine/survivalConfig'
import { createLevelConfig, levels } from './index'

describe('level catalog', () => {
  it('defines five unique levels in progression order', () => {
    expect(levels.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5])
    expect(levels.map(({ difficulty }) => difficulty)).toEqual(['beginner', 'moderate', 'hard', 'very-hard', 'expert'])
    expect(levels.map(({ missionDays }) => missionDays)).toEqual([7, 10, 15, 20, 30])
  })

  it('resolves valid survival parameters and keeps planned dates within the mission', () => {
    for (const level of levels) {
      const config = createLevelConfig(level)
      expect(config.missionDays).toBe(level.missionDays)
      expect(config.crewSize).toBe(4)
      for (const value of Object.values(config)) {
        expect(Number.isFinite(value) && value >= 0).toBe(true)
      }
      for (const value of [config.waterRecovery, config.shieldingFraction, config.incidentProbability,
        config.dailyWear, config.incidentDamage, config.failureThreshold, config.repairAmount]) {
        expect(value).toBeLessThanOrEqual(1)
      }
      for (const { approximateDay } of level.plannedEmergencies) {
        if (approximateDay === undefined) continue
        expect(Number.isInteger(approximateDay)).toBe(true)
        expect(approximateDay).toBeGreaterThanOrEqual(1)
        expect(approximateDay).toBeLessThanOrEqual(level.missionDays)
      }
    }
    expect(levels[1].plannedEmergencies).toContainEqual({ kind: 'solar-radiation', approximateDay: 5 })
  })

  it('isolates resolved configurations from each other, the catalog and engine defaults', () => {
    const defaults = { ...survivalDefaults }
    const first = createLevelConfig(levels[0])
    const second = createLevelConfig(levels[0])
    expect(first).not.toBe(second)
    expect(Reflect.set(first, 'missionDays', 99)).toBe(true)
    expect(second.missionDays).toBe(7)
    expect(createLevelConfig(levels[0]).missionDays).toBe(7)
    expect(survivalDefaults).toEqual(defaults)
    expect(createLevelConfig(levels[4])).toEqual({ ...defaults, waterCapacityL: 155 })
    expect(Object.isFrozen(levels)).toBe(true)
    for (const level of levels) {
      expect([level, level.survivalOverrides, level.learningObjectives, level.plannedEmergencies,
        ...level.plannedEmergencies].every(Object.isFrozen)).toBe(true)
    }
  })

  it.each(levels)('can complete $name with the current engine and its default seed', (level) => {
    const config = createLevelConfig(level)
    let state = createSurvivalState(undefined, config)

    for (let day = 0; day < config.missionDays && state.outcome === 'active'; day++) {
      // Use existing repair actions to protect life support and its supply.
      const equipment = (['solar', 'recycler', 'oxygenPlant'] as const)
        .find((item) => state.condition[item] < 0.7)
      if (equipment) state = applySurvivalAction(state, { type: 'maintain', equipment }, config).state
      state = applySurvivalAction(state, { type: 'advanceTick' }, config).state
    }

    expect(state.tick).toBe(config.missionDays)
    expect(state.outcome).toBe('success')
    expect(state.crew.every(({ health }) => health > 0)).toBe(true)
  })
})
