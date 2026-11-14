import type { Equipment, SurvivalEvent } from '../engine/survival'
import type { SurvivalSession } from '../components/dashboard/survivalController'

export const departments = {
  'OXY-01': { icon: 'O₂', name: 'Oxygen System', equipment: 'oxygenPlant', lesson: 'This machine makes oxygen so astronauts can breathe.' },
  'WTR-01': { icon: '💧', name: 'Water Recycler', equipment: 'recycler', lesson: 'We clean used water so the crew can use it again.' },
  'BIO-01': { icon: '🌱', name: 'Greenhouse', equipment: 'greenhouse', lesson: 'We grow food here. Plants need water and light.' },
  'SOL-01': { icon: '☀️', name: 'Solar Panels', equipment: 'solar', lesson: 'These panels make electricity from sunlight.' },
  'PWR-01': { icon: '🔋', name: 'Battery Station', lesson: 'This stores electricity for when the base needs it.' },
  'HAB-01': { icon: '🏠', name: 'Home Center', lesson: 'This is your Moon home. The crew rests here.' },
  'SHD-01': { icon: '🛡️', name: 'Safety Shelter', equipment: 'shielding', lesson: 'This room helps keep astronauts safe during space storms.' },
  'ROV-01': { icon: '🚙', name: 'Lunar Rover', lesson: 'Rovers help astronauts explore and carry tools. Look closely at this rover.' },
} as const satisfies Record<string, { icon: string; name: string; lesson: string; equipment?: Equipment }>

export type DepartmentId = keyof typeof departments

export interface EquipmentProblem {
  equipment: Equipment
  index: number
  offline: boolean
}

export function updateProblems(previous: readonly EquipmentProblem[], before: SurvivalSession, after: SurvivalSession) {
  const incidents = new Map(previous.map((problem) => [problem.equipment, problem]))
  after.events.slice(before.events.length).forEach((event, offset) => {
    if (event.type === 'equipmentDamaged' || event.type === 'equipmentFailed') {
      const existing = incidents.get(event.equipment)
      const offline = after.state.condition[event.equipment] <= after.config.failureThreshold
      incidents.set(event.equipment, {
        equipment: event.equipment,
        index: existing && (existing.offline || !offline) ? existing.index : before.events.length + offset,
        offline,
      })
    }
    if (event.type === 'equipmentRepaired') {
      const condition = after.state.condition[event.equipment]
      const problem = incidents.get(event.equipment)
      if (condition >= 1) incidents.delete(event.equipment)
      else if (problem) incidents.set(event.equipment, { ...problem, offline: condition <= after.config.failureThreshold })
    }
  })
  return [...incidents.values()]
}
export function repairFeedback(before: SurvivalSession, after: SurvivalSession, equipment: Equipment) {
  const event: SurvivalEvent | undefined = after.events[before.events.length]
  if (event?.type !== 'equipmentRepaired' || event.equipment !== equipment) return undefined
  return after.state.condition[equipment] > after.config.failureThreshold ? 'operational' : 'still-offline'
}
