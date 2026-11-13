import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { GameState } from '../../types'
import { BuildingPanel, GameHUD, MissionEventDialog, MissionOverview } from './index'
import type { BuildingAction, BuildingTelemetry } from './index'
import './preview.css'
import type { MissionDashboardProps } from './MissionDashboard'
import '../../styles.css'

const mockState: GameState = {
  tick: 12,
  resources: { oxygen: 72, water: 180, food: 94, power: 48 },
  buildings: [
    { id: 'HAB-01', kind: 'Habitat', position: { x: 4, y: 3 } },
    { id: 'SOL-02', kind: 'Solar array', position: { x: 6, y: 3 } },
    { id: 'GRN-03', kind: 'Greenhouse', position: { x: 8, y: 4 } },
    { id: 'OXY-05', kind: 'Oxygen production', position: { x: 6, y: 5 } },
    { id: 'RAD-06', kind: 'Radiation shelter', position: { x: 8, y: 6 } },
    { id: 'H2O-03', kind: 'Water recycler', position: { x: 4, y: 5 } },
  ],
}

const mockTelemetry: NonNullable<MissionDashboardProps['resources']> = {
  oxygen: { capacity: 100, production: 12, consumption: 10, allocation: 40 },
  water: { capacity: 240, production: 30, consumption: 24, allocation: 30 },
  food: { capacity: 140, production: 6, consumption: 8, allocation: 20 },
  power: { capacity: 120, production: 18, consumption: 25, allocation: 10 },
}

const mockCrew = [
  { id: '1', name: 'Maya Chen', role: 'Commander', status: 'Ready', health: 100 },
  { id: '2', name: 'Amir Saleh', role: 'Flight engineer', status: 'On duty', health: 96 },
  { id: '3', name: 'Lena Ortiz', role: 'Medical officer', status: 'Ready', health: 100 },
  { id: '4', name: 'Noah Park', role: 'Science officer', status: 'On duty', health: 96 },
]

const mockEvent = {
  title: 'Solar storm inbound',
  description: 'The crew can take shelter immediately or stay outside to finish inspecting the solar array.',
  decisions: [{ id: 'shelter', label: 'Shelter the crew' }, { id: 'continue', label: 'Continue inspection' }],
}

const mockBuildings: Record<string, BuildingTelemetry> = {
  'HAB-01': { readings: { crewHealth: '4 / 4 fit for duty', lifeSupport: 'Stable', livingConditions: '21 °C' } },
  'SOL-02': { readings: { generation: '18 kWh/day', battery: '40%' }, allocations: { power: 80 }, canRepair: true },
  'GRN-03': { readings: { production: '6 rations/day', crops: 'Growing' }, allocations: { water: 65 } },
  'H2O-03': { readings: { efficiency: '86%', condition: 'Operational' } },
  'OXY-05': { readings: { generation: '12 kg/day', equipment: 'Operational' } },
  'RAD-06': { readings: { radiationRisk: 'Elevated', readiness: 'Ready', protection: '4 crew berths' } },
}

function DashboardPreview() {
  const [day, setDay] = useState(mockState.tick)
  const [overviewOpen, setOverviewOpen] = useState(false)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [resources, setResources] = useState(mockTelemetry)
  const [buildings, setBuildings] = useState(mockBuildings)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>()
  const [decision, setDecision] = useState<string>()
  const state = { ...mockState, tick: day }
  const alerts = decision || day >= 30 ? [] : [
    { id: 'storm', severity: 'emergency' as const, message: 'Solar storm approaching' },
  ]
  const outcome = decision === 'continue'
    ? { status: 'failure' as const, summary: 'The preview crew exceeded its radiation safety limit.' }
    : day >= 30
      ? { status: 'success' as const, summary: 'The preview crew reached day 30.' }
      : undefined

  function handleBuildingAction(action: BuildingAction) {
    setBuildings((previous) => {
      const data = previous[action.buildingId]
      return {
        ...previous,
        [action.buildingId]: action.type === 'repair'
          ? { ...data, canRepair: false, readings: { ...data.readings, generation: '25 kWh/day' } }
          : { ...data, allocations: { ...data.allocations, [action.resource]: action.percent } },
      }
    })
  }

  return (
    <main className="lg-preview">
      <button type="button" className="lg-terrain" aria-label="Clear building selection" onClick={() => setSelectedBuildingId(undefined)} />
      <div className="lg-preview-map">
        <p>South pole sector <b>Preview · Mock data</b></p>
        <div className="lg-preview-sites">
          {state.buildings.map(({ id, kind }) => (
            <button type="button" className="lg-button" key={id} aria-pressed={id === selectedBuildingId} onClick={() => setSelectedBuildingId(id)}>
              <small>{id}</small>{kind}
            </button>
          ))}
        </div>
      </div>
      <GameHUD state={state} day={day} alerts={alerts} overviewOpen={overviewOpen}
        onOverviewToggle={() => setOverviewOpen((visible) => !visible)}
        onOpenEmergency={alerts.length ? () => setEmergencyOpen(true) : undefined} />
      <BuildingPanel state={state} selectedBuildingId={selectedBuildingId} telemetry={buildings}
        onAction={outcome ? undefined : handleBuildingAction} onClose={() => setSelectedBuildingId(undefined)} />
      <MissionEventDialog event={emergencyOpen ? mockEvent : undefined} onDismiss={() => setEmergencyOpen(false)}
        onDecision={(id) => {
          setDecision(id)
          setEmergencyOpen(false)
          if (id === 'continue') setOverviewOpen(true)
        }} />
      <MissionOverview open={overviewOpen} onClose={() => setOverviewOpen(false)} preview
        state={state} day={day} resources={resources}
    crew={mockCrew.map((member) => decision === 'continue' ? { ...member, health: 0, status: 'Radiation casualty' } : member)}
    objectives={[
      { id: 'survive', title: 'Keep all four astronauts alive for 30 simulated days', complete: outcome?.status === 'success' },
      { id: 'shelter', title: 'Protect the crew from the solar storm', complete: decision === 'shelter' },
    ]}
        alerts={alerts} outcome={outcome}
        radiation={{ dose: decision === 'continue' ? 65 : 18, limit: 50 }}
        advanceBlockedReason={day === 29 && !decision ? 'Resolve the solar storm before advancing to day 30.' : undefined}
        onAction={(action) => {
          if (action.type === 'advanceTick') setDay((previous) => Math.min(previous + 1, decision === 'shelter' ? 30 : 29))
        }}
        onAllocationChange={(id, allocation) => setResources((previous) => {
          const otherIds = Object.keys(mockTelemetry).filter((key) => key !== id)
          const remaining = 100 - allocation
          const previousRemaining = otherIds.reduce((sum, key) => sum + (previous[key]?.allocation ?? 0), 0)
          const next = { ...previous, [id]: { ...previous[id], allocation } }
          let assigned = 0
          otherIds.forEach((key, index) => {
            const weight = previousRemaining ? (previous[key]?.allocation ?? 0) / previousRemaining : 1 / otherIds.length
            const share = index === otherIds.length - 1
              ? remaining - assigned
              : Math.min(remaining - assigned, Math.round(remaining * weight))
            next[key] = { ...previous[key], allocation: share }
            assigned += share
          })
          return next
        })} />
    </main>
  )
}

const root = document.getElementById('root')
if (root) createRoot(root).render(<DashboardPreview />)
