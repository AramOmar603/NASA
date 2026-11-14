import { expect, it } from 'vitest'
import { advanceDisaster, createDisasterSession, disasterFaults, disasterPriority, fixDisasterFault, pendingDisasterFaults, type DisasterProgress } from './disaster'

it.each([1, 4, 9, 27, 99, 2026])('completes Day 20 with four one-kit repairs on seed %i', seed => {
  let session = createDisasterSession(seed)
  let completed: DisasterProgress = []
  for (let day = 1; day <= 20; day++) {
    session = advanceDisaster(session, completed)
    expect(session.state.tick).toBe(day)
    const pending = pendingDisasterFaults(day, completed)
    expect(pending).toEqual(day === 5 ? ['shelterPanel'] : day === 10 ? ['powerConnection']
      : day === 15 ? ['powerRelay', 'waterPump'] : [])
    if (pending.length) expect(advanceDisaster(session, completed)).toBe(session)
    for (const fault of seed % 2 === 0 ? pending.reverse() : pending) {
      const equipment = disasterFaults[fault].equipment
      expect(session.state.condition[equipment]).toBe(0)
      const kits = session.state.resources.spareKits
      const next = fixDisasterFault(session, completed, fault)
      session = next.session
      completed = next.completed
      expect(session.state.condition[equipment], `day ${day} ${fault} ${session.state.outcome}`).toBe(1)
      expect(session.state.resources.spareKits).toBe(kits - 1)
      expect(fixDisasterFault(session, completed, fault).session).toBe(session)
    }
  }
  expect(session.state.outcome).toBe('success')
  expect(session.state.crew.every(member => member.health > 0)).toBe(true)
  expect(completed).toHaveLength(4)
})

it('recommends a priority using the reserves and leaves future faults unrepairable', () => {
  const session = createDisasterSession()
  expect(disasterPriority(session)).toBe('powerRelay')
  const lowWater = { ...session, state: { ...session.state, resources: { ...session.state.resources, waterL: 1 } } }
  expect(disasterPriority(lowWater)).toBe('waterPump')
  expect(fixDisasterFault(session, [], 'waterPump').session).toBe(session)
})
