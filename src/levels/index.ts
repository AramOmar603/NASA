import { survivalDefaults, type SurvivalConfig } from '../engine/survivalConfig'

export type LevelId = 1 | 2 | 3 | 4 | 5
export type Difficulty = 'beginner' | 'moderate' | 'hard' | 'very-hard' | 'expert'

export interface PlannedEmergency {
  readonly kind: 'solar-radiation' | 'equipment-malfunction' | 'rover-breakdown'
    | 'micrometeoroid-damage' | 'simultaneous-failures' | 'escalating-emergencies'
  readonly approximateDay?: number
}

export interface LevelDefinition {
  readonly id: LevelId
  readonly name: string
  readonly description: string
  readonly difficulty: Difficulty
  readonly missionDays: number
  readonly learningObjectives: readonly string[]
  /** Design notes for future phases. The engine does not schedule these. */
  readonly plannedEmergencies: readonly PlannedEmergency[]
  readonly survivalOverrides: Readonly<Partial<Omit<SurvivalConfig, 'missionDays'>>>
}

function defineLevel(level: LevelDefinition): LevelDefinition {
  return Object.freeze({
    ...level,
    learningObjectives: Object.freeze([...level.learningObjectives]),
    plannedEmergencies: Object.freeze(level.plannedEmergencies.map((event) => Object.freeze({ ...event }))),
    survivalOverrides: Object.freeze({ ...level.survivalOverrides }),
  })
}

/** The catalog is ordered by progression. IDs are stable. */
export const levels: readonly LevelDefinition[] = Object.freeze([
  defineLevel({
    id: 1,
    name: 'Rookie Astronaut',
    description: 'Learn to operate the outpost on a short mission with light equipment wear.',
    difficulty: 'beginner',
    missionDays: 7,
    learningObjectives: ['Keep all four astronauts alive while learning basic resource management and equipment repair.'],
    plannedEmergencies: [],
    survivalOverrides: { dailyWear: 0.002, incidentProbability: 0, batteryCapacityKWh: 60, repairAmount: 1 },
  }),
  defineLevel({
    id: 2,
    name: 'First Emergency',
    description: 'Keep the outpost running during a longer mission with occasional equipment damage.',
    difficulty: 'moderate',
    missionDays: 10,
    learningObjectives: ['Protect the crew while maintaining essential life-support resources.'],
    plannedEmergencies: [{ kind: 'solar-radiation', approximateDay: 5 }],
    survivalOverrides: { dailyWear: 0.003, incidentProbability: 0.05, incidentDamage: 0.15 },
  }),
  defineLevel({
    id: 3,
    name: 'Mission Breakdown',
    description: 'Choose which worn or damaged equipment deserves the available spare kits.',
    difficulty: 'hard',
    missionDays: 15,
    learningObjectives: ['Prioritize critical repairs using limited resources.'],
    plannedEmergencies: [{ kind: 'rover-breakdown', approximateDay: 5 }, { kind: 'equipment-malfunction', approximateDay: 9 }],
    survivalOverrides: { dailyWear: 0.004, incidentProbability: 0.08, incidentDamage: 0.2 },
  }),
  defineLevel({
    id: 4,
    name: 'Lunar Disaster',
    description: 'Keep the crew safe through scheduled emergencies and a day with two simultaneous failures.',
    difficulty: 'very-hard',
    missionDays: 20,
    learningObjectives: ['Manage multiple emergencies without losing crew members.'],
    plannedEmergencies: [{ kind: 'solar-radiation', approximateDay: 5 }, { kind: 'equipment-malfunction', approximateDay: 10 }, { kind: 'simultaneous-failures', approximateDay: 15 }],
    survivalOverrides: {
      dailyWear: 0.005, incidentProbability: 0.05, incidentDamage: 0.15,
      oxygenKgPerPersonDay: 0.8, waterCapacityL: 140, foodKgPerPersonDay: 0.62,
      batteryCapacityKWh: 60,
    },
  }),
  defineLevel({
    id: 5,
    name: 'Ultimate Commander',
    description: 'Sustain the crew for a full mission with standard equipment wear and extra water reserves.',
    difficulty: 'expert',
    missionDays: 30,
    learningObjectives: ['Complete a full lunar survival mission.'],
    plannedEmergencies: [{ kind: 'escalating-emergencies' }],
    survivalOverrides: { waterCapacityL: 155 },
  }),
])

/** Resolve a fresh engine configuration for a future survival session. */
export function createLevelConfig(level: LevelDefinition): SurvivalConfig {
  return { ...survivalDefaults, ...level.survivalOverrides, missionDays: level.missionDays }
}
