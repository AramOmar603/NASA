import { createBreakdownSession } from './breakdown'
import { createLevelConfig, levels } from '../levels'
import { createSurvivalSession, reduceSurvivalSession } from '../components/dashboard/survivalController'
import type { SurvivalSession } from '../components/dashboard/survivalController'

export type TrainingLevel = 1 | 2 | 3

export function createRookieSession(level: TrainingLevel = 1) {
  if (level === 3) return createBreakdownSession()
  const config = createLevelConfig(levels[level - 1])
  // Seed 4 targets the greenhouse on day 1. Seed 9 targets solar on day 1
  // and oxygen on day 3. Keep the engine's normal random rolls on other days.
  return level === 1
    ? createSurvivalSession(4, config)
    : createSurvivalSession(9, { ...config, repairAmount: 1 })
}

export function advanceRookie(session: SurvivalSession, level: Exclude<TrainingLevel, 3> = 1) {
  const { config, state } = session
  const lessonDay = state.tick === 0 || (level === 2 && state.tick === 2)
  if (!lessonDay) return reduceSurvivalSession(session, { type: 'advanceTick' })

  const input = { ...session, config: { ...config, incidentProbability: 1, incidentDamage: 1 } }
  return { ...reduceSurvivalSession(input, { type: 'advanceTick' }), config }
}
