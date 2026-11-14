import { expect, it } from 'vitest'
import { createRookieSession, advanceRookie } from '../rookie-training/session'
import { advanceCommander } from '../rookie-training/commander'
import { fieldAssignment, travelToNextActivity } from './fieldAssignments'

it('provides a starting assignment for levels without a mandatory opening emergency', () => {
  expect(fieldAssignment(4, 0)).toBeUndefined()
  for (const level of [1, 2, 3, 5] as const) expect(fieldAssignment(level, 0)).toBeDefined()
})

it('stops at a failure, then advances ordinary days through the original simulator', () => {
  const start = createRookieSession(2)
  const step = (session: typeof start) => advanceRookie(session, 2)
  const first = travelToNextActivity(2, start, step, () => false)
  expect(first.state.tick).toBe(1)
  expect(first.state.condition.solar).toBe(0)
  const next = travelToNextActivity(2, first, step, () => false)
  expect(next.state.tick).toBe(2)
  expect(next).toEqual(step(first))
})

it('stops for a required objective that does not emit an engine event', () => {
  const start = createRookieSession(5)
  let session = start
  for (let day = 1; day <= 5; day++) session = advanceCommander(session, [])
  const next = travelToNextActivity(5, session, current => advanceCommander(current, []), day => day === 6)
  expect(next.state.tick).toBe(6)
  expect(next).toEqual(advanceCommander(session, []))
})
