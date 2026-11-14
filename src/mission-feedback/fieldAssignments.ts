import type { SurvivalSession } from '../components/dashboard/survivalController'
import type { TrainingLevel } from '../rookie-training/session'
import type { DepartmentId } from './departments'

type AssignmentKind = 'crew' | 'harvest' | 'sunlight' | 'air' | 'water' | 'battery' | 'shelter' | 'rover' | 'route' | 'harvestPlan' | 'reservePlan'

const assignments = {
  route: { building: 'WTR-01', title: 'Build a water loop', prompt: 'Send used water through the right stations in order.', choices: ['Collect used water', 'Clean and check it', 'Store clean water'], hint: 'Collect it first, clean and check it, then send it to storage.', interaction: 'sequence' },
  harvestPlan: { building: 'BIO-01', title: 'Set up the plant bed', prompt: 'Get the growing bed ready, then log your work.', choices: ['Check the roots', 'Supply water', 'Log the plant check'], hint: 'Look at what the roots need before adding water. Log the check last.', interaction: 'sequence' },
  reservePlan: { building: 'PWR-01', title: 'Make a backup plan', prompt: 'If production stops, which reserve will run out first?', choices: [], hint: 'Compare how many days each reserve would last. Pick the shortest.', interaction: 'reserves' },
  crew: { building: 'HAB-01', title: 'Check in with your crew', prompt: 'Look at Crew safe. How many astronauts are still safe?', choices: ['Four astronauts', 'Two astronauts', 'No astronauts'], hint: 'The crew reading shows how many astronauts are safe, followed by the crew size.' },
  harvest: { building: 'BIO-01', title: 'Log the greenhouse harvest', prompt: 'Which reading tells you what the plants grew yesterday?', choices: ['Food grown last day', 'Food stored', 'Greenhouse power'], hint: 'Stored food includes supplies already at the base. The harvest reading tells you what the plants added.' },
  sunlight: { building: 'SOL-01', title: 'Send a solar report', prompt: 'Which reading tells you whether the array made electricity yesterday?', choices: ['Power made last day', 'Battery reserve', 'Power used last day'], hint: 'The array makes electricity. The battery stores it, and other machines use it.' },
  air: { building: 'OXY-01', title: 'Check the crew’s air supply', prompt: 'If the generator stops, which reading tells you how much oxygen is already available?', choices: ['Oxygen Left', 'Oxygen made last day', 'Generator power'], hint: 'The oxygen already in storage is the crew’s reserve.' },
  water: { building: 'WTR-01', title: 'Trace the water loop', prompt: 'Which reading shows how much water the recycler made available to reuse yesterday?', choices: ['Water cleaned last day', 'Water stored', 'Recycler power'], hint: 'The recycler’s output is the cleaned water. Stored water is the full reserve.' },
  battery: { building: 'PWR-01', title: 'Plan for a power outage', prompt: 'Which reading tells you how much energy you can draw from the battery right now?', choices: ['Battery reserve', 'Battery capacity', 'Power used last day'], hint: 'Capacity is the most it can hold. The reserve is what it holds now.' },
  shelter: { building: 'SHD-01', title: 'Send a crew safety report', prompt: 'Which reading helps you see how much radiation the most exposed astronaut has received?', choices: ['Highest crew exposure', 'Shelter condition', 'Crew safe'], hint: 'Check the crew’s exposure reading. Shelter condition describes equipment.' },
  rover: { building: 'ROV-01', title: 'Prepare a rover outing', prompt: 'Which reading should you check before promising the crew a spare kit for the trip?', choices: ['Base repair kits', 'Mission day', 'Crew safe'], hint: 'Check how many kits the whole base has before setting one aside.' },
} as const satisfies Record<AssignmentKind, { building: DepartmentId; title: string; prompt: string; choices: readonly string[]; hint: string; interaction?: 'sequence' | 'reserves' }>

const fieldSchedule: Record<TrainingLevel, Readonly<Record<number, AssignmentKind>>> = {
  1: { 0: 'crew', 2: 'harvest', 4: 'water', 6: 'rover' },
  2: { 0: 'crew', 2: 'battery', 4: 'air', 5: 'harvestPlan', 6: 'route', 8: 'sunlight' },
  3: { 0: 'rover', 2: 'battery', 4: 'crew', 7: 'harvest', 11: 'route', 13: 'shelter' },
  4: { 2: 'air', 4: 'crew', 7: 'reservePlan', 9: 'sunlight', 12: 'route', 14: 'harvestPlan', 17: 'rover', 19: 'crew' },
  5: { 0: 'crew', 3: 'air', 5: 'battery', 8: 'harvest', 11: 'rover', 14: 'route', 17: 'shelter', 21: 'sunlight', 24: 'reservePlan', 28: 'crew' },
}

export function fieldAssignment(level: TrainingLevel, day: number) {
  const kind = fieldSchedule[level][day]
  return kind === undefined ? undefined : assignments[kind]
}

export function travelToNextActivity(
  level: TrainingLevel, start: SurvivalSession, advance: (session: SurvivalSession) => SurvivalSession, stopAt: (day: number) => boolean,
) {
  let session = start
  while (session.state.outcome === 'active') {
    const next = advance(session)
    if (next.state.tick <= session.state.tick) break
    session = next
    if (stopAt(session.state.tick) || fieldAssignment(level, session.state.tick) || session.events.slice(start.events.length)
      .some(event => event.type === 'equipmentDamaged' || event.type === 'equipmentFailed')) break
  }
  return session
}
