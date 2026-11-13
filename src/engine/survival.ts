import type { GameAction, GameEvent, GameState } from '../types'
import { survivalDefaults, type SurvivalConfig } from './survivalConfig'

const equipment = ['solar', 'oxygenPlant', 'recycler', 'greenhouse', 'shielding'] as const
export type Equipment = (typeof equipment)[number]
type Load = 'lifeSupport' | 'oxygenPlant' | 'recycler' | 'greenhouse'
type Stocks = Readonly<{ oxygenKg: number; waterL: number; foodKg: number; batteryKWh: number; spareKits: number }>
export type SurvivalAction = Extract<GameAction, { type: 'advanceTick' }> | { readonly type: 'maintain'; readonly equipment: Equipment }
export type SurvivalEvent = Extract<GameEvent, { type: 'tickAdvanced' }>
  | { readonly type: 'equipmentDamaged' | 'equipmentFailed' | 'equipmentRepaired'; readonly equipment: Equipment }
  | { readonly type: 'missionCompleted'; readonly outcome: 'success' | 'failure' }

export interface SurvivalState extends GameState {
  readonly resources: Stocks
  readonly crew: readonly { readonly health: number; readonly doseMilliSv: number }[]
  readonly condition: Readonly<Record<Equipment, number>>
  readonly powerDeliveredKWh: Readonly<Record<Load, number>>
  readonly outcome: 'active' | 'success' | 'failure'
  readonly seed: number
}

export function createSurvivalState(seed = 1, config: SurvivalConfig = survivalDefaults): SurvivalState {
  return {
    tick: 0,
    buildings: [],
    resources: {
      oxygenKg: config.oxygenCapacityKg,
      waterL: config.waterCapacityL,
      foodKg: config.foodCapacityKg,
      batteryKWh: config.batteryCapacityKWh,
      spareKits: 5,
    },
    crew: Array.from({ length: config.crewSize }, () => ({ health: 100, doseMilliSv: 0 })),
    condition: { solar: 1, oxygenPlant: 1, recycler: 1, greenhouse: 1, shielding: 1 },
    powerDeliveredKWh: { lifeSupport: 0, oxygenPlant: 0, recycler: 0, greenhouse: 0 },
    outcome: 'active',
    seed: seed >>> 0,
  }
}

function consume(available: number, required: number) {
  const used = Math.min(available, required)
  return { remaining: available - used, fraction: required === 0 ? 1 : used / required }
}

function nextSeed(seed: number) {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0
}

export function applySurvivalAction(
  state: SurvivalState,
  action: SurvivalAction,
  config: SurvivalConfig = survivalDefaults,
): { readonly state: SurvivalState; readonly events: readonly SurvivalEvent[] } {
  if (state.outcome !== 'active') return { state, events: [] }

  if (action.type === 'maintain') {
    const current = state.condition[action.equipment]
    if (state.resources.spareKits < 1 || current >= 1) return { state, events: [] }
    return {
      state: {
        ...state,
        resources: { ...state.resources, spareKits: state.resources.spareKits - 1 },
        condition: { ...state.condition, [action.equipment]: Math.min(1, current + config.repairAmount) },
      },
      events: [{ type: 'equipmentRepaired', equipment: action.equipment }],
    }
  }

  const events: SurvivalEvent[] = []
  const condition = { ...state.condition }
  const roll = nextSeed(state.seed)
  const seed = nextSeed(roll)
  const damaged = equipment[Math.floor(seed / 4294967296 * equipment.length)]
  for (const item of equipment) {
    const incident = item === damaged && roll / 4294967296 < config.incidentProbability
    condition[item] = Math.max(0, condition[item] - config.dailyWear - (incident ? config.incidentDamage : 0))
    if (incident) events.push({ type: 'equipmentDamaged', equipment: item })
    if (condition[item] <= config.failureThreshold && state.condition[item] > config.failureThreshold) {
      events.push({ type: 'equipmentFailed', equipment: item })
    }
  }

  function efficiency(item: Equipment) {
    return condition[item] > config.failureThreshold ? condition[item] : 0
  }

  let power = state.resources.batteryKWh + config.solarKWhPerDay * efficiency('solar')
  const powerDeliveredKWh = { lifeSupport: 0, oxygenPlant: 0, recycler: 0, greenhouse: 0 }
  function allocate(load: Load, demand: number) {
    const supplied = consume(power, demand)
    powerDeliveredKWh[load] = power - supplied.remaining
    power = supplied.remaining
    return supplied.fraction
  }
  const lifeSupport = allocate('lifeSupport', config.lifeSupportKWhPerDay)
  const oxygenPower = allocate('oxygenPlant', config.oxygenPlantKWhPerDay * Number(efficiency('oxygenPlant') > 0))
  const recyclerPower = allocate('recycler', config.recyclerKWhPerDay * Number(efficiency('recycler') > 0))
  const greenhousePower = allocate('greenhouse', config.greenhouseKWhPerDay * Number(efficiency('greenhouse') > 0))

  const living = state.crew.filter(member => member.health > 0).length
  const oxygen = consume(
    state.resources.oxygenKg + config.oxygenPlantKgPerDay * efficiency('oxygenPlant') * oxygenPower,
    living * config.oxygenKgPerPersonDay * lifeSupport,
  )
  const waterDemand = living * config.waterLPerPersonDay
  const water = consume(state.resources.waterL, waterDemand)
  const recoveredWater = waterDemand * water.fraction * config.waterRecovery * efficiency('recycler') * recyclerPower
  const food = consume(
    state.resources.foodKg + config.greenhouseKgPerDay * efficiency('greenhouse') * greenhousePower,
    living * config.foodKgPerPersonDay,
  )

  const dose = config.radiationMilliSvPerDay * (1 - config.shieldingFraction * efficiency('shielding'))
  const damage = dose * config.healthLossPerMilliSv
    + (1 - oxygen.fraction * lifeSupport) * config.oxygenDeficitDamage
    + (1 - water.fraction) * config.waterDeficitDamage
    + (1 - food.fraction) * config.foodDeficitDamage
  const crew = state.crew.map(member => member.health === 0 ? member : {
    health: Math.max(0, member.health - damage),
    doseMilliSv: member.doseMilliSv + dose,
  })
  const tick = state.tick + 1
  const outcome = crew.some(member => member.health === 0) ? 'failure' : tick >= config.missionDays ? 'success' : 'active'
  events.push({ type: 'tickAdvanced', tick })
  if (outcome !== 'active') events.push({ type: 'missionCompleted', outcome })

  return {
    state: {
      ...state,
      tick,
      seed,
      crew,
      condition,
      outcome,
      powerDeliveredKWh,
      resources: {
        ...state.resources,
        oxygenKg: Math.min(config.oxygenCapacityKg, oxygen.remaining),
        waterL: Math.min(config.waterCapacityL, water.remaining + recoveredWater),
        foodKg: Math.min(config.foodCapacityKg, food.remaining),
        batteryKWh: Math.min(config.batteryCapacityKWh, power),
      },
    },
    events,
  }
}
