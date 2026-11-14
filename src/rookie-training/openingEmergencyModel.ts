import { reduceSurvivalSession, type SurvivalSession } from '../components/dashboard/survivalController'
import { disasterFaults, disasterMaintenanceKits } from './disaster'

export const emergencyLoads = ['lifeSupport', 'oxygenPlant', 'recycler', 'greenhouse'] as const
type Load = typeof emergencyLoads[number]
export type PowerPlan = Record<Load, number>
export type OpeningRepair = 'solar' | 'recycler'

export const shifts = ['Sunrise', 'Low sunlight'] as const
const sunlight = [0.85, 0.4]
const reserveKits = Object.keys(disasterFaults).length + disasterMaintenanceKits

export function openingRepairKits(session: SurvivalSession) {
  return Math.max(0, session.state.resources.spareKits - reserveKits)
}
export const warmthTarget = 1
export const recoveryTargets = { oxygenKg: 3, waterL: 15, foodKg: 2.5, batteryKWh: 2 }
export const powerLevels = ['Low', 'Medium', 'High'] as const
export type PowerLevel = typeof powerLevels[number]
export type PowerSettings = Record<Load, PowerLevel>
export const startingSettings: PowerSettings = {
  lifeSupport: 'Medium', oxygenPlant: 'Medium', recycler: 'Medium', greenhouse: 'Medium',
}
const powerDraw: Record<Load, Record<PowerLevel, number>> = {
  lifeSupport: { Low: 1, Medium: 2.5, High: 4 },
  oxygenPlant: { Low: 3, Medium: 7, High: 9 },
  recycler: { Low: 1, Medium: 3, High: 4.5 },
  greenhouse: { Low: 2.5, Medium: 5, High: 7 },
}

export function powerPlan(settings: PowerSettings): PowerPlan {
  return {
    lifeSupport: powerDraw.lifeSupport[settings.lifeSupport],
    oxygenPlant: powerDraw.oxygenPlant[settings.oxygenPlant],
    recycler: powerDraw.recycler[settings.recycler],
    greenhouse: powerDraw.greenhouse[settings.greenhouse],
  }
}

export function startOpeningEmergency(session: SurvivalSession) {
  return {
    session: {
      ...session,
      state: {
        ...session.state,
        resources: { ...session.state.resources, oxygenKg: 4, waterL: 26, foodKg: 4.5, batteryKWh: 19 },
        condition: { ...session.state.condition, solar: 0.52, recycler: 0.55 },
      },
    },
    shift: 0,
    warmth: 2,
    status: 'active' as 'active' | 'failure' | 'success',
    feedback: '',
  }
}
type Emergency = ReturnType<typeof startOpeningEmergency>

export function openingBudget({ session, shift }: Emergency) {
  const { config, state } = session
  return {
    battery: state.resources.batteryKWh,
    solar: config.solarKWhPerDay * 0.5 * state.condition.solar * (sunlight[shift] ?? 0),
    limits: {
      lifeSupport: 4, oxygenPlant: 9,
      recycler: config.recyclerKWhPerDay * 0.5, greenhouse: config.greenhouseKWhPerDay * 0.5,
    },
  }
}

export function repairOpening(emergency: Emergency, equipment: OpeningRepair): Emergency {
  const { session } = emergency
  if (emergency.status !== 'active' || openingRepairKits(session) === 0) return emergency
  const next = reduceSurvivalSession(session, { type: 'maintain', equipment })
  return { ...emergency, session: next, feedback: next.feedback ?? '' }
}

export function runOpeningShift(emergency: Emergency, plan: PowerPlan): Emergency {
  if (emergency.status !== 'active') return emergency
  const { session, shift } = emergency
  const { config, state } = session
  const { battery, solar, limits } = openingBudget(emergency)
  const draw = emergencyLoads.reduce((total, load) => total + plan[load], 0)
  if (draw > battery + solar || emergencyLoads.some(load => !Number.isFinite(plan[load]) || plan[load] < 0 || plan[load] > limits[load])) {
    return { ...emergency, feedback: 'That plan uses more power than the base can deliver. Try lower power on one system.' }
  }

  // Run the existing resource balance over a half-day emergency shift. The
  // power panel sets each load's draw and scales its output to match. Cabin
  // heat has its own reserve in this scenario, separate from breathable air.
  const step = reduceSurvivalSession({
    ...session,
    config: {
      ...config,
      dailyWear: 0, incidentProbability: 0, radiationMilliSvPerDay: 0,
      solarKWhPerDay: config.solarKWhPerDay * 0.5 * sunlight[shift],
      lifeSupportKWhPerDay: plan.lifeSupport, oxygenPlantKWhPerDay: plan.oxygenPlant,
      recyclerKWhPerDay: plan.recycler, greenhouseKWhPerDay: plan.greenhouse,
      oxygenPlantKgPerDay: config.oxygenPlantKgPerDay * 0.5 * plan.oxygenPlant / limits.oxygenPlant,
      greenhouseKgPerDay: config.greenhouseKgPerDay * 0.5 * plan.greenhouse / limits.greenhouse,
      waterRecovery: config.waterRecovery * plan.recycler / limits.recycler,
      oxygenKgPerPersonDay: config.oxygenKgPerPersonDay * 0.5,
      waterLPerPersonDay: config.waterLPerPersonDay * 0.5,
      foodKgPerPersonDay: config.foodKgPerPersonDay * 0.5,
    },
  }, { type: 'advanceTick' })
  const result = step.state
  const warmth = Math.min(4, emergency.warmth + plan.lifeSupport - 2.5)
  const nextShift = shift + 1
  const reserves = result.resources
  const usedUp = reserves.oxygenKg <= 0 ? 'Oxygen ran out. Send more power to the oxygen machine.'
    : reserves.waterL <= 0 ? 'Water ran out. Power the recycler or fix its pump.'
      : reserves.foodKg <= 0 ? 'Food ran out. Keep the greenhouse lights on.'
        : warmth <= 0 ? 'The cabin got too cold. Leave more power for heat.' : ''
  const shortfall = nextShift === shifts.length && (
    reserves.oxygenKg < recoveryTargets.oxygenKg ? 'Build a bigger oxygen reserve.'
      : reserves.waterL < recoveryTargets.waterL ? 'Recycle more water before handing the base back.'
        : reserves.foodKg < recoveryTargets.foodKg ? 'Give the greenhouse more power to build up food.'
          : reserves.batteryKWh < recoveryTargets.batteryKWh ? 'Leave some backup electricity in the battery.' : warmth < warmthTarget ? 'Give the cabin a little more heat before handing the base back.' : '')
  return {
    session: { ...session, flows: step.flows, state: { ...result, tick: state.tick, seed: state.seed, outcome: state.outcome } },
    shift: nextShift,
    warmth,
    status: usedUp || shortfall ? 'failure' : nextShift === shifts.length ? 'success' : 'active',
    feedback: usedUp || shortfall || (nextShift === 1 ? 'Sunlight just dropped! Check what your plan leaves in the battery.' : ''),
  }
}

// Reconnect the main stores after the damaged grid is brought back online.
// Only the shift-to-shift changes in the accessible supplies carry across.
export function reconnectOpening(base: SurvivalSession, emergency: Emergency): SurvivalSession {
  if (emergency.status !== 'success') return base
  const { session } = emergency
  const before = startOpeningEmergency(base).session.state.resources
  const after = session.state.resources
  const stock = (key: keyof typeof recoveryTargets, capacity: number) =>
    Math.min(capacity, base.state.resources[key] - before[key] + after[key])
  return {
    ...session,
    state: {
      ...session.state,
      resources: {
        ...after,
        oxygenKg: stock('oxygenKg', base.config.oxygenCapacityKg),
        waterL: stock('waterL', base.config.waterCapacityL),
        foodKg: stock('foodKg', base.config.foodCapacityKg),
        batteryKWh: stock('batteryKWh', base.config.batteryCapacityKWh),
      },
      condition: {
        ...session.state.condition,
        solar: Math.max(0.9, session.state.condition.solar),
        recycler: Math.max(0.98, session.state.condition.recycler),
      },
    },
  }
}
