import type { Equipment } from '../engine/survival'
import { createSurvivalSession, reduceSurvivalSession, type SurvivalSession } from '../components/dashboard/survivalController'
import { createLevelConfig, levels } from '../levels'

export const disasterFaults = {
  shelterPanel: { day: 5, equipment: 'shielding' },
  powerConnection: { day: 10, equipment: 'solar' },
  powerRelay: { day: 15, equipment: 'solar' },
  waterPump: { day: 15, equipment: 'recycler' },
} as const

export type DisasterFault = keyof typeof disasterFaults
export type DisasterProgress = readonly DisasterFault[]

export const disasterMaintenanceKits = 2

export function createDisasterSession(seed = 9) {
  const session = createSurvivalSession(seed, { ...createLevelConfig(levels[3]), repairAmount: 1 })
  return {
    ...session,
    state: {
      ...session.state,
      resources: { ...session.state.resources, spareKits: session.state.resources.spareKits + disasterMaintenanceKits },
    },
  }
}

export function pendingDisasterFaults(day: number, completed: DisasterProgress) {
  return (Object.keys(disasterFaults) as DisasterFault[])
    .filter(id => disasterFaults[id].day <= day && !completed.includes(id))
}

export function advanceDisaster(session: SurvivalSession, completed: DisasterProgress) {
  if (session.state.outcome !== 'active' || pendingDisasterFaults(session.state.tick, completed).length) return session
  const day = session.state.tick + 1
  const due = pendingDisasterFaults(day, completed)
  // A fictional one-day radiation pulse uses the engine's existing shielding formula.
  const config = {
    ...session.config,
    radiationMilliSvPerDay: session.config.radiationMilliSvPerDay * (day === 6 ? 4 : 1),
    // Two kits are available for optional damage. Let scheduled faults drive
    // the mission once those two repair opportunities have appeared.
    incidentProbability: due.length || session.events.filter(event => event.type === 'equipmentDamaged').length >= disasterMaintenanceKits
      ? 0 : session.config.incidentProbability,
  }
  const next = reduceSurvivalSession({ ...session, config }, { type: 'advanceTick' })
  if (!due.length || next.state.outcome !== 'active') return { ...next, config: session.config }

  // Announce faults after the day's readings, before the next resource draw.
  const condition = { ...next.state.condition }
  const events = [...next.events]
  for (const id of due) {
    const { equipment } = disasterFaults[id]
    if (condition[equipment] > session.config.failureThreshold) events.push({ type: 'equipmentFailed', equipment })
    condition[equipment] = 0
  }
  return { ...next, config: session.config, events, state: { ...next.state, condition } }
}

export function disasterRepairBlock(
  session: SurvivalSession, completed: DisasterProgress, equipment: Equipment, fault?: DisasterFault,
) {
  const { state } = session
  if (state.outcome !== 'active') return 'The mission has ended.'
  if (fault) {
    if (completed.includes(fault)) return '✅ This emergency is already resolved!'
    if (state.tick < disasterFaults[fault].day) return '⏳ This emergency hasn’t started yet.'
  }
  if (state.condition[equipment] >= 1) return '✅ This machine is already working!'
  if (state.resources.spareKits < 1) return '🧰 You need one spare kit to repair this machine.'
  if (!fault && state.resources.spareKits <= Object.keys(disasterFaults).length - completed.length) {
    return '🧰 The remaining spare kits are reserved for mission emergencies.'
  }
}

export function fixDisasterFault(session: SurvivalSession, completed: DisasterProgress, id: DisasterFault) {
  const { equipment } = disasterFaults[id]
  const blocked = disasterRepairBlock(session, completed, equipment, id)
  if (blocked) return { session, completed, blocked }
  const next = reduceSurvivalSession(session, { type: 'maintain', equipment })
  if (next.state === session.state) return { session, completed, blocked: next.feedback }
  return { session: next, completed: [...completed, id] }
}

export function disasterPriority({ state, config }: SurvivalSession) {
  const { batteryKWh, waterL } = state.resources
  const dailyEnergy = config.lifeSupportKWhPerDay + config.oxygenPlantKWhPerDay + config.recyclerKWhPerDay + config.greenhouseKWhPerDay
  const dailyWater = config.waterLPerPersonDay * state.crew.filter(member => member.health > 0).length
  return batteryKWh / dailyEnergy <= waterL / dailyWater ? 'powerRelay' : 'waterPump'
}
