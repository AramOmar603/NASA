import type { Equipment, SurvivalEvent } from '../engine/survival'
import type { SurvivalSession } from '../components/dashboard/survivalController'

export const departments = {
  'OXY-01': { icon: 'O₂', name: 'Air Rangers', equipment: 'oxygenPlant', lesson: 'Astronauts need an oxygen supply because the Moon has no breathable atmosphere.' },
  'WTR-01': { icon: '💧', name: 'Hydro Heroes', equipment: 'recycler', lesson: 'Reusing water means astronauts can bring less water from Earth.' },
  'BIO-01': { icon: '🌱', name: 'Garden Guardians', equipment: 'greenhouse', lesson: 'Plants need water and light. The simulator uses electricity to grow food.' },
  'SOL-01': { icon: '☀️', name: 'Solar Sparks', equipment: 'solar', lesson: 'Solar panels turn sunlight into electricity for the base.' },
  'PWR-01': { icon: '🔋', name: 'Power Patrol', lesson: 'Batteries store energy for times when the base needs more than the panels supply.' },
  'HAB-01': { icon: '🏠', name: 'Home Base Crew', lesson: 'Life support helps give the crew air they can breathe.' },
  'SHD-01': { icon: '🛡️', name: 'Shield Squad', equipment: 'shielding', lesson: 'Shielding reduces the amount of radiation that reaches the crew.' },
  'ROV-01': { icon: '🚙', name: 'Moon Explorers', lesson: 'Rovers can carry people and tools. This rover is a display model.' },
} as const satisfies Record<string, { icon: string; name: string; lesson: string; equipment?: Equipment }>

export type DepartmentId = keyof typeof departments

export function activeFailures({ state, config, events }: SurvivalSession) {
  const latest = new Map<Equipment, number>()
  events.forEach((event, index) => {
    if (event.type === 'equipmentFailed') latest.set(event.equipment, index)
  })
  return [...latest].flatMap(([equipment, index]) =>
    state.condition[equipment] <= config.failureThreshold ? [{ equipment, index }] : [])
}

export function repairFeedback(before: SurvivalSession, after: SurvivalSession, equipment: Equipment) {
  const event: SurvivalEvent | undefined = after.events[before.events.length]
  if (event?.type !== 'equipmentRepaired' || event.equipment !== equipment) return undefined
  return after.state.condition[equipment] > after.config.failureThreshold ? 'operational' : 'still-offline'
}
