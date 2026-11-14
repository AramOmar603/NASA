import { useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import type { Equipment, SurvivalEvent } from '../../engine/survival'
import type { SurvivalConfig } from '../../engine/survivalConfig'
import type { Building, BuildingId } from '../../types'
import { BuildingPanel, resolveBuildingPanelKind } from './BuildingPanel'
import type { BuildingPanelKind, BuildingTelemetry } from './BuildingPanel'
import { GameHUD } from './GameHUD'
import { MissionOverview } from './MissionOverview'
import { createSurvivalSession, dashboardState, equipmentNames, reduceSurvivalSession } from './survivalController'
import type { SurvivalSession } from './survivalController'

const equipmentByPanel: Partial<Record<BuildingPanelKind, Equipment>> = {
  'solar-array': 'solar', 'oxygen-production': 'oxygenPlant', 'water-recycler': 'recycler',
  greenhouse: 'greenhouse', 'radiation-shelter': 'shielding',
}
const reading = (value: number) => Number(value.toFixed(2))

export function describeSurvivalEvent(event: SurvivalEvent): string {
  switch (event.type) {
    case 'tickAdvanced': return `Day ${event.tick} complete.`
    case 'equipmentDamaged': return `${equipmentNames[event.equipment]} damaged.`
    case 'equipmentFailed': return `${equipmentNames[event.equipment]} failed.`
    case 'equipmentRepaired': return `${equipmentNames[event.equipment]} repaired.`
    case 'missionCompleted': return event.outcome === 'success' ? 'Mission successful.' : 'Mission failed.'
  }
}

export function buildingTelemetry(building: Building, { state, config, flows }: SurvivalSession): BuildingTelemetry {
  const kind = resolveBuildingPanelKind(building.kind)
  const equipment = kind && equipmentByPanel[kind]
  const condition = equipment ? state.condition[equipment] : undefined
  const status = condition === undefined ? undefined : condition <= config.failureThreshold ? 'Failed' : 'Operational'
  const alive = state.crew.filter(({ health }) => health > 0).length
  const dose = Math.max(0, ...state.crew.map(({ doseMilliSv }) => doseMilliSv))
  const rate = (value: number | undefined, unit: string) => value === undefined ? 'Awaiting first day' : `${reading(value)} ${unit}/day`
  let readings: BuildingTelemetry['readings']
  switch (kind) {
    case 'habitat':
      readings = { crewHealth: `${alive} / ${state.crew.length} surviving`,
        lifeSupport: state.tick ? `${reading(state.powerDeliveredKWh.lifeSupport)} kWh delivered` : 'Awaiting first day' }
      break
    case 'solar-array':
      readings = { generation: rate(flows?.power.production, 'kWh'), battery: `${reading(state.resources.batteryKWh)} / ${config.batteryCapacityKWh} kWh` }
      break
    case 'greenhouse':
      readings = { production: rate(flows?.food.production, 'kg') }
      break
    case 'water-recycler':
      readings = { efficiency: flows ? flows.water.consumption
        ? `${reading(flows.water.production / flows.water.consumption * 100)}% recovered` : 'No water drawn' : 'Awaiting first day' }
      break
    case 'oxygen-production':
      readings = { generation: rate(flows?.oxygen.production, 'kg'), equipment: status }
      break
    case 'radiation-shelter':
      readings = { radiationRisk: `${reading(dose)} mSv · highest crew exposure`, readiness: status,
        protection: `${reading((status === 'Operational' ? state.condition.shielding * config.shieldingFraction : 0) * 100)}% protection` }
      break
  }
  return {
    readings,
    condition: condition === undefined ? undefined : `${reading(condition * 100)}% · ${status}`,
    canRepair: condition === undefined ? undefined : state.outcome === 'active' && state.resources.spareKits > 0 && condition < 1,
    repairUnavailableReason: condition === undefined ? undefined : state.outcome !== 'active' ? 'Mission ended.'
      : state.resources.spareKits < 1 ? 'No spare kits available.' : condition >= 1 ? 'Equipment is at full condition.' : undefined,
  }
}

interface WorldControls {
  readonly selectedBuildingId?: BuildingId
  readonly onBuildingSelect: (id: BuildingId) => void
  readonly onGroundSelect: () => void
}

export interface SurvivalMissionProps {
  readonly buildings: readonly Building[]
  readonly renderWorld?: (controls: WorldControls) => ReactNode
  readonly seed?: number
  readonly config?: SurvivalConfig
}

export function SurvivalMission({ buildings, renderWorld, seed, config }: SurvivalMissionProps) {
  const [session, dispatch] = useReducer(reduceSurvivalSession, { seed, config },
    (initial) => createSurvivalSession(initial.seed, initial.config))
  const [selectedBuildingId, select] = useState<BuildingId>()
  const [overviewOpen, setOverviewOpen] = useState(false)
  const { state, flows, events, feedback } = session
  const active = state.outcome === 'active'
  const viewState = { ...dashboardState(state), buildings }
  const telemetry = Object.fromEntries(buildings.map((building) => [building.id, buildingTelemetry(building, session)]))
  const alerts = events.slice(-12).flatMap((event, index) => {
    if (event.type === 'tickAdvanced') return []
    const severity = event.type === 'equipmentFailed' || (event.type === 'missionCompleted' && event.outcome === 'failure') ? 'emergency' : 'advisory'
    return [{ id: String(events.length - Math.min(events.length, 12) + index), severity, message: describeSurvivalEvent(event) }] as const
  })
  const outcome = state.outcome === 'active' ? undefined : {
    status: state.outcome,
    summary: state.outcome === 'success' ? 'All crew survived the mission.' : 'At least one crew member reached zero health.',
  }
  const allocationExplanation = 'The engine distributes power automatically. Manual power and water allocation are unavailable.'
  const powerDelivered = Object.entries(state.powerDeliveredKWh)
  const loadNames = { lifeSupport: 'Life support', oxygenPlant: 'Oxygen plant', recycler: 'Water recycler', greenhouse: 'Greenhouse' }

  function advance() {
    dispatch({ type: 'advanceTick' })
  }

  return (
    <main className="lg-survival">
      {renderWorld?.({ selectedBuildingId, onBuildingSelect: select, onGroundSelect: () => select(undefined) })}
      <GameHUD oxygenCapacity={session.config.oxygenCapacityKg} state={viewState} day={state.tick} missionDays={session.config.missionDays}
        alerts={alerts.filter(({ severity }) => severity === 'emergency').slice(-3)} overviewOpen={overviewOpen} onOverviewToggle={() => setOverviewOpen(!overviewOpen)} />
      <div className="lg-survival-controls">
        <button type="button" className="lg-button" onClick={advance} disabled={!active}>Advance one day</button>
        <p>Spare kits: {state.resources.spareKits}</p>
        {outcome && <p role="status">Mission {outcome.status === 'success' ? 'successful' : 'failed'}. {outcome.summary}</p>}
        {feedback && <p role="status">{feedback}</p>}
        <details>
          <summary>Base facilities and power</summary>
          <ul aria-label="Facilities">{buildings.map(({ id, kind }) => (
            <li key={id}><button className="lg-button" type="button" aria-pressed={id === selectedBuildingId} onClick={() => select(id)}>{kind.replaceAll('-', ' ')} · {id}</button></li>
          ))}</ul>
          <p>{allocationExplanation}</p>
          <dl aria-label="Power delivered last day">{powerDelivered.map(([key, value]) => (
            <div key={key}><dt>{loadNames[key as keyof typeof loadNames]}</dt><dd>{state.tick ? `${reading(value)} kWh` : 'Awaiting first day'}</dd></div>
          ))}</dl>
        </details>
        <details>
          <summary>Mission log</summary>
          <ol>{events.slice(-12).reverse().map((event, index) => <li key={events.length - index}>{describeSurvivalEvent(event)}</li>)}</ol>
        </details>
      </div>
      <BuildingPanel oxygenCapacity={session.config.oxygenCapacityKg} state={viewState} selectedBuildingId={selectedBuildingId} telemetry={telemetry} foodUnit="kg"
        onClose={() => select(undefined)}
        onAction={(action) => {
          if (action.type !== 'repair') return
          const building = buildings.find(({ id }) => id === action.buildingId)
          const kind = building && resolveBuildingPanelKind(building.kind)
          const equipment = kind && equipmentByPanel[kind]
          if (equipment) dispatch({ type: 'maintain', equipment })
        }} />
      <MissionOverview state={viewState} day={state.tick} missionDays={session.config.missionDays} foodUnit="kg"
        open={overviewOpen} onClose={() => setOverviewOpen(false)} onAction={advance}
        allocationExplanation={allocationExplanation} alerts={alerts} outcome={outcome}
        crew={state.crew.map(({ health, doseMilliSv }, index) => ({
          id: String(index), name: `Crew ${index + 1}`, role: `${reading(doseMilliSv)} mSv cumulative`,
          status: health > 0 ? 'Surviving' : 'Deceased', health: reading(health),
        }))}
        radiation={{ dose: Math.max(0, ...state.crew.map(({ doseMilliSv }) => doseMilliSv)) }}
        resources={{
          oxygen: { capacity: session.config.oxygenCapacityKg, ...flows?.oxygen },
          water: { capacity: session.config.waterCapacityL, ...flows?.water },
          food: { capacity: session.config.foodCapacityKg, ...flows?.food },
          power: { capacity: session.config.batteryCapacityKWh, ...flows?.power },
        }} />
    </main>
  )
}
