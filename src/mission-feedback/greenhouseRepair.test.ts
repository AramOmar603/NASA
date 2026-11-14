import { expect, it } from 'vitest'
import { reduceSurvivalSession } from '../components/dashboard/survivalController'
import { advanceBreakdown, initialBreakdown } from '../rookie-training/breakdown'
import { createRookieSession } from '../rookie-training/session'
import { greenhouseRepairActivity, updateProblems, type EquipmentProblem } from './departments'

it('finishes one greenhouse watering challenge, ignores wear, and distinguishes new Level 3 damage', () => {
  let session = createRookieSession(3)
  let problems: EquipmentProblem[] = []
  const progress = { ...initialBreakdown, roverFixed: true }
  const activity = () => greenhouseRepairActivity(session, problems.some(problem => problem.equipment === 'greenhouse'))
  function apply(next: typeof session) {
    problems = updateProblems(problems, session, next)
    session = next
  }

  while (session.state.tick < 8) {
    apply(advanceBreakdown(session, progress))
    if (session.state.tick < 8) expect(activity()).toBeUndefined()
  }
  expect(activity()).toBe('greenhouse')
  const kits = session.state.resources.spareKits
  apply(reduceSurvivalSession(session, { type: 'maintain', equipment: 'greenhouse' }))
  expect(session.state.condition.greenhouse).toBe(1)
  expect(session.state.resources.spareKits).toBe(kits - 1)
  expect(activity()).toBeUndefined()

  apply(advanceBreakdown(session, progress))
  expect(session.state.condition.greenhouse).toBeLessThan(1)
  expect(activity()).toBeUndefined()
  expect(session.flows?.food.production).toBeGreaterThan(0)

  apply(advanceBreakdown(session, { ...progress, priorityLearned: true, waterFixed: true }))
  expect(activity()).toBe('greenhouseMaintenance')
  expect(session.events.filter(event => event.type === 'equipmentRepaired' && event.equipment === 'greenhouse')).toHaveLength(1)
})
