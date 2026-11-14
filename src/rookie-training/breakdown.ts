import { createSurvivalSession, reduceSurvivalSession, type SurvivalSession } from '../components/dashboard/survivalController'
import { createLevelConfig, levels } from '../levels'

export const roverDay = 5
export const waterDay = 9

export type BreakdownProgress = Readonly<{ roverFixed: boolean; waterFixed: boolean; priorityLearned: boolean }>
export const initialBreakdown: BreakdownProgress = { roverFixed: false, waterFixed: false, priorityLearned: false }

export function createBreakdownSession(seed = 9) {
  return createSurvivalSession(seed, { ...createLevelConfig(levels[2]), repairAmount: 1 })
}

export function breakdownBlock(day: number, progress: BreakdownProgress) {
  if (day >= roverDay && !progress.roverFixed) return 'Check the Moon Explorer before moving on.'
  if (day >= waterDay && !progress.priorityLearned) return 'Choose which repair should come first.'
  if (day >= waterDay && !progress.waterFixed) return 'Fix the water recycler before moving on.'
}

export function advanceBreakdown(session: SurvivalSession, progress: BreakdownProgress) {
  if (session.state.outcome !== 'active' || breakdownBlock(session.state.tick, progress)) return session
  if (session.state.tick + 1 !== waterDay) return reduceSurvivalSession(session, { type: 'advanceTick' })

  // Schedule the teaching outage before the day's resource calculations.
  const fault: SurvivalSession = {
    ...session,
    state: { ...session.state, condition: { ...session.state.condition, recycler: 0 } },
    events: [...session.events, { type: 'equipmentFailed', equipment: 'recycler' }],
  }
  return reduceSurvivalSession(fault, { type: 'advanceTick' })
}

export function resolveBreakdownObjective(
  session: SurvivalSession, progress: BreakdownProgress, objective: keyof BreakdownProgress, correct: boolean,
) {
  if (!correct || progress[objective] || session.state.outcome !== 'active') return { session, progress }
  if (session.state.tick < (objective === 'roverFixed' ? roverDay : waterDay)) return { session, progress }
  if (objective === 'waterFixed') {
    if (!progress.priorityLearned) return { session, progress }
    const repaired = reduceSurvivalSession(session, { type: 'maintain', equipment: 'recycler' })
    if (repaired.state === session.state) return { session, progress }
    return { session: repaired, progress: { ...progress, waterFixed: true } }
  }
  return { session, progress: { ...progress, [objective]: true } }
}
