import { createSurvivalSession, reduceSurvivalSession, type SurvivalSession } from '../components/dashboard/survivalController'
import { createLevelConfig, levels } from '../levels'

export const finalFaults = { finalPower: 'solar', finalAir: 'oxygenPlant', finalWater: 'recycler' } as const
export type FinalFault = keyof typeof finalFaults
export type CommanderObjective = FinalFault | 'temperature' | 'signal' | 'planning'
export type CommanderProgress = readonly CommanderObjective[]
const schedule = { temperature: 6, signal: 12, planning: 19, finalPower: 26, finalAir: 26, finalWater: 26 } as const
export const finale = Object.keys(finalFaults) as FinalFault[]

export function createCommanderSession(seed = 9) {
  return createSurvivalSession(seed, { ...createLevelConfig(levels[4]), repairAmount: 1, incidentProbability: .04, waterCapacityL: 185 })
}

export function commanderPending(day: number, completed: CommanderProgress) {
  return (Object.keys(schedule) as CommanderObjective[]).filter(id => schedule[id] <= day && !completed.includes(id))
}

export function advanceCommander(session: SurvivalSession, completed: CommanderProgress) {
  if (session.state.outcome !== 'active' || commanderPending(session.state.tick, completed).length) return session
  const next = reduceSurvivalSession(session, { type: 'advanceTick' })
  if (next.state.tick !== 26 || next.state.outcome !== 'active') return next
  const condition = { ...next.state.condition }
  const events = [...next.events]
  for (const equipment of Object.values(finalFaults)) {
    if (condition[equipment] > next.config.failureThreshold) events.push({ type: 'equipmentFailed', equipment })
    condition[equipment] = 0
  }
  return { ...next, events, state: { ...next.state, condition } }
}

export function commanderReserves({ state, config }: SurvivalSession) {
  const crew = state.crew.filter(member => member.health > 0).length || 1
  return {
    oxygen: state.resources.oxygenKg / (crew * config.oxygenKgPerPersonDay),
    water: state.resources.waterL / (crew * config.waterLPerPersonDay),
    food: state.resources.foodKg / (crew * config.foodKgPerPersonDay),
    power: state.resources.batteryKWh / (config.lifeSupportKWhPerDay + config.oxygenPlantKWhPerDay + config.recyclerKWhPerDay + config.greenhouseKWhPerDay),
  }
}

export function planningOptions(session: SurvivalSession) {
  const days = commanderReserves(session)
  const weakestSupply = (['oxygen', 'water', 'food'] as const).reduce((a, b) => days[a] <= days[b] ? a : b)
  return { days, weakestSupply, priority: days.power <= days[weakestSupply] ? ('power' as const) : weakestSupply }
}

export function finishCommanderObjective(session: SurvivalSession, completed: CommanderProgress, id: CommanderObjective) {
  if (session.state.outcome !== 'active' || !commanderPending(session.state.tick, completed).includes(id)) return { session, completed }
  const equipment = finalFaults[id as FinalFault]
  const next = equipment ? reduceSurvivalSession(session, { type: 'maintain', equipment }) : session
  if (equipment && next.state === session.state) return { session, completed }
  return { session: next, completed: [...completed, id] }
}
