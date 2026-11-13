import { createLevelConfig, levels } from '../levels'
import { createSurvivalSession, reduceSurvivalSession } from '../components/dashboard/survivalController'
import type { SurvivalSession } from '../components/dashboard/survivalController'

// Seed 4 selects the greenhouse on the first engine tick. The first roll takes it
// offline for the repair lesson. Subsequent days use the normal level config.
export function createRookieSession() {
  return createSurvivalSession(4, createLevelConfig(levels[0]))
}

export function advanceRookie(session: SurvivalSession) {
  const config = session.config
  const input = session.state.tick === 0
    ? { ...session, config: { ...config, incidentProbability: 1, incidentDamage: 1 } }
    : session
  return { ...reduceSurvivalSession(input, { type: 'advanceTick' }), config }
}
