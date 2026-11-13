import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BuildingPanel } from './BuildingPanel'
import { MissionDashboard } from './MissionDashboard'
import { buildingTelemetry, describeSurvivalEvent } from './SurvivalMission'
import { createSurvivalSession, dashboardState, reduceSurvivalSession } from './survivalController'
import { applySurvivalAction } from '../../engine/survival'
import { survivalDefaults } from '../../engine/survivalConfig'

const advance = { type: 'advanceTick' } as const
const solar = { id: 'SOL', kind: 'solar-array', position: { x: 0, y: 0 } }
const config = { ...survivalDefaults, incidentProbability: 0, dailyWear: 0.1, solarKWhPerDay: 25 }

describe('survival dashboard integration', () => {
  it('uses the engine snapshot and reports flows even when storage caps hide them', () => {
    const start = createSurvivalSession(42, config)
    const next = reduceSurvivalSession(start, advance)
    expect(next.state).toEqual(applySurvivalAction(start.state, advance, config).state)
    expect(next.state.tick).toBe(1)
    expect(next.state.resources.waterL).toBeLessThan(start.state.resources.waterL)
    expect(next.flows?.water.consumption).toBe(16)
    expect(next.flows?.water.production).toBeCloseTo(10.8)
    expect(next.flows?.power.production).toBeCloseTo(22.5)
    const state = dashboardState(next.state)
    expect(state.resources).toEqual({
      water: next.state.resources.waterL, food: next.state.resources.foodKg,
      oxygen: next.state.resources.oxygenKg, power: next.state.resources.batteryKWh,
    })
  })

  it('repairs actual equipment with one kit, preserves daily flow and does not advance time', () => {
    const next = reduceSurvivalSession(createSurvivalSession(42, config), advance)
    const repaired = reduceSurvivalSession(next, { type: 'maintain', equipment: 'solar' })
    expect(repaired.state.tick).toBe(1)
    expect(repaired.state.condition.solar).toBe(1)
    expect(repaired.state.resources).toEqual({ ...next.state.resources, spareKits: 4 })
    expect(repaired.flows).toBe(next.flows)
    expect(repaired.events.at(-1)).toEqual({ type: 'equipmentRepaired', equipment: 'solar' })
    expect(reduceSurvivalSession(repaired, { type: 'maintain', equipment: 'solar' }).state).toBe(repaired.state)
  })

  it('renders engine-derived equipment and crew values, alerts and radiation', () => {
    const session = reduceSurvivalSession(createSurvivalSession(42, { ...config, dailyWear: 0.85 }), advance)
    const state = { ...dashboardState(session.state), buildings: [solar] }
    const panel = renderToStaticMarkup(<BuildingPanel state={state} selectedBuildingId={solar.id}
      telemetry={{ [solar.id]: buildingTelemetry(solar, session) }} onClose={() => {}} />)
    expect(panel).toContain('15% · Failed')
    expect(panel).toContain('0 kWh/day')
    const crew = session.state.crew.map(({ health }, index) => ({
      id: String(index), name: `Crew ${index + 1}`, role: 'Astronaut', status: 'Surviving', health: Number(health.toFixed(2)),
    }))
    const alert = session.events.find((event) => event.type === 'equipmentFailed')!
    const html = renderToStaticMarkup(<MissionDashboard state={state} day={session.state.tick} crew={crew}
      radiation={{ dose: session.state.crew[0].doseMilliSv }}
      alerts={[{ id: 'failure', severity: 'emergency', message: describeSurvivalEvent(alert) }]} />)
    expect(html).toContain(`Health ${crew[0].health}%`)
    expect(html).toContain('Highest cumulative crew dose')
    expect(html).toContain('Solar array failed.')
    expect(html).toContain('role="alert"')
  })

  it('reports success and failure from the engine and ignores post-mission actions', () => {
    const success = reduceSurvivalSession(createSurvivalSession(1, { ...config, missionDays: 1 }), advance)
    const failure = reduceSurvivalSession(createSurvivalSession(1, { ...config, oxygenCapacityKg: 0, oxygenPlantKgPerDay: 0 }), advance)
    for (const [session, outcome] of [[success, 'success'], [failure, 'failure']] as const) {
      expect(session.state.outcome).toBe(outcome)
      expect(session.events.at(-1)).toEqual({ type: 'missionCompleted', outcome })
      expect(reduceSurvivalSession(session, advance).state).toBe(session.state)
    }
  })

  it('rejects unsupported actions before the engine can treat them as a tick or corrupt equipment', () => {
    const session = createSurvivalSession()
    for (const input of [null, {}, { type: 'allocate' }, { type: 'maintain', equipment: 'toString' }]) {
      const result = reduceSurvivalSession(session, input)
      expect(result.state).toBe(session.state)
      expect(result.events).toEqual([])
      expect(result.feedback).toBe('Unsupported action.')
    }
  })
})
