import { createLevelConfig, levels } from '../levels'
import { createSurvivalSession, reduceSurvivalSession } from '../components/dashboard/survivalController'
import type { SurvivalSession } from '../components/dashboard/survivalController'

// Seed 4 selects the greenhouse on the first engine tick. The incident
// probability is restored immediately after this one scheduled training roll.
export function createRookieSession() {
  return createSurvivalSession(4, createLevelConfig(levels[0]))
}

export function advanceRookie(session: SurvivalSession) {
  const config = session.config
  const input = session.state.tick === 0
    ? { ...session, config: { ...config, incidentProbability: 1 } }
    : session
  return { ...reduceSurvivalSession(input, { type: 'advanceTick' }), config }
}
