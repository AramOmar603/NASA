import { createDisasterSession } from './disaster'
import type { Equipment } from '../engine/survival'
import { createBreakdownSession } from './breakdown'
import { createLevelConfig, levels } from '../levels'
import { createSurvivalSession, reduceSurvivalSession } from '../components/dashboard/survivalController'
import type { SurvivalSession } from '../components/dashboard/survivalController'

export type TrainingLevel = 1 | 2 | 3 | 4

export function createRookieSession(level: TrainingLevel = 1) {
  if (level === 4) return createDisasterSession()
  if (level === 3) return createBreakdownSession()
  const config = createLevelConfig(levels[level - 1])
  // Seed 4 targets the greenhouse on day 1. Seed 9 targets solar on day 1
  // and oxygen on day 3. Keep the engine's normal random rolls on other days.
  return level === 1
    ? createSurvivalSession(4, config)
    : createSurvivalSession(9, { ...config, repairAmount: 1 })
}

export function advanceRookie(session: SurvivalSession, level: 1 | 2 = 1) {
  const { config, state } = session
  const lessonDay = state.tick === 0 || (level === 2 && state.tick === 2)
  if (!lessonDay) return reduceSurvivalSession(session, { type: 'advanceTick' })

  const input = { ...session, config: { ...config, incidentProbability: 1, incidentDamage: 1 } }
  return { ...reduceSurvivalSession(input, { type: 'advanceTick' }), config }
}


// A successful engine repair records completion for the rest of this mission.
export function hasPendingTraining(level: TrainingLevel | undefined, equipment: Equipment, session: SurvivalSession) {
  const assigned = (level === 1 && equipment === 'greenhouse')
    || (level === 2 && (equipment === 'solar' || equipment === 'oxygenPlant'))
  if (!assigned) return false
  return session.events.some((event) => event.type === 'equipmentFailed' && event.equipment === equipment)
    && !session.events.some((event) => event.type === 'equipmentRepaired' && event.equipment === equipment)
}
