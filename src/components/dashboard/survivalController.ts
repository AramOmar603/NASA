import { applySurvivalAction, createSurvivalState } from '../../engine/survival'
import type { Equipment, SurvivalAction, SurvivalEvent, SurvivalState } from '../../engine/survival'
import { survivalDefaults } from '../../engine/survivalConfig'
import type { SurvivalConfig } from '../../engine/survivalConfig'
import type { GameState } from '../../types'
import type { ResourceTelemetry } from './MissionDashboard'

export const equipmentNames: Record<Equipment, string> = {
  solar: 'Solar array', oxygenPlant: 'Oxygen generator', recycler: 'Water recycler',
  greenhouse: 'Greenhouse', shielding: 'Radiation shelter',
}

type Resource = 'oxygen' | 'water' | 'food' | 'power'
type Flow = Required<Pick<ResourceTelemetry, 'production' | 'consumption'>>

export interface SurvivalSession {
  readonly config: SurvivalConfig
  readonly state: SurvivalState
  readonly flows?: Record<Resource, Flow>
  readonly events: readonly SurvivalEvent[]
  readonly feedback?: string
}

export function createSurvivalSession(seed?: number, config = survivalDefaults): SurvivalSession {
  return { config, state: createSurvivalState(seed, config), events: [] }
}

// Reconstruct gross flow from the snapshots and delivered power. A balance delta
// loses information when stores overflow or production and consumption cancel out.
function dailyFlows(before: SurvivalState, after: SurvivalState, config: SurvivalConfig): Record<Resource, Flow> {
  const efficiency = (item: Equipment) => after.condition[item] > config.failureThreshold ? after.condition[item] : 0
  const fraction = (delivered: number, demand: number) => demand === 0 ? 1 : delivered / demand
  const power = after.powerDeliveredKWh
  const crew = before.crew.filter(({ health }) => health > 0).length
  const oxygen = config.oxygenPlantKgPerDay * efficiency('oxygenPlant') * fraction(power.oxygenPlant, config.oxygenPlantKWhPerDay)
  const food = config.greenhouseKgPerDay * efficiency('greenhouse') * fraction(power.greenhouse, config.greenhouseKWhPerDay)
  const waterUsed = Math.min(before.resources.waterL, crew * config.waterLPerPersonDay)

  return {
    oxygen: { production: oxygen, consumption: Math.min(before.resources.oxygenKg + oxygen, crew * config.oxygenKgPerPersonDay * fraction(power.lifeSupport, config.lifeSupportKWhPerDay)) },
    water: { production: waterUsed * config.waterRecovery * efficiency('recycler') * fraction(power.recycler, config.recyclerKWhPerDay), consumption: waterUsed },
    food: { production: food, consumption: Math.min(before.resources.foodKg + food, crew * config.foodKgPerPersonDay) },
    power: { production: config.solarKWhPerDay * efficiency('solar'), consumption: Object.values(power).reduce((total, value) => total + value, 0) },
  }
}

export function reduceSurvivalSession(session: SurvivalSession, input: unknown): SurvivalSession {
  const { state, config } = session
  if (!input || typeof input !== 'object' || !('type' in input)) return { ...session, feedback: 'Unsupported action.' }
  let action: SurvivalAction
  if (input.type === 'advanceTick') {
    action = { type: 'advanceTick' }
  } else if (input.type === 'maintain' && 'equipment' in input && typeof input.equipment === 'string' && Object.hasOwn(equipmentNames, input.equipment)) {
    action = { type: 'maintain', equipment: input.equipment as Equipment }
  } else {
    return { ...session, feedback: 'Unsupported action.' }
  }

  if (state.outcome !== 'active') return { ...session, feedback: 'The mission has ended.' }
  const result = applySurvivalAction(state, action, config)
  if (result.state === state) {
    return { ...session, feedback: state.resources.spareKits < 1 ? 'No spare kits available.' : 'Equipment is already at full condition.' }
  }

  return {
    ...session,
    state: result.state,
    events: [...session.events, ...result.events],
    flows: action.type === 'advanceTick' ? dailyFlows(state, result.state, config) : session.flows,
    feedback: action.type === 'maintain' ? `${equipmentNames[action.equipment]} repaired. One spare kit used.` : undefined,
  }
}

export function dashboardState(state: SurvivalState): GameState {
  return {
    tick: state.tick,
    buildings: state.buildings,
    resources: {
      oxygen: state.resources.oxygenKg,
      water: state.resources.waterL,
      food: state.resources.foodKg,
      power: state.resources.batteryKWh,
    },
  }
}
