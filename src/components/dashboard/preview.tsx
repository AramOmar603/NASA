import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { GameState } from '../../types'
import { MissionDashboard } from './MissionDashboard'
import type { MissionDashboardProps } from './MissionDashboard'
import '../../styles.css'

const mockState: GameState = {
  tick: 12,
  resources: { oxygen: 72, water: 180, food: 94, power: 48 },
  buildings: [
    { id: 'HAB-01', kind: 'Habitat', position: { x: 4, y: 3 } },
    { id: 'SOL-02', kind: 'Solar array', position: { x: 6, y: 3 } },
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

function DashboardPreview() {
  const [day, setDay] = useState(mockState.tick)
  const [resources, setResources] = useState(mockTelemetry)
  const [selectedBuildingId, setSelectedBuildingId] = useState('HAB-01')
  const [decision, setDecision] = useState<string>()
  const outcome = decision === 'continue'
    ? { status: 'failure' as const, summary: 'The preview crew exceeded its radiation safety limit.' }
    : day >= 30
      ? { status: 'success' as const, summary: 'The preview crew reached day 30.' }
      : undefined

  return <MissionDashboard
    preview
    state={{ ...mockState, tick: day }}
    day={day}
    resources={resources}
    crew={mockCrew.map((member) => decision === 'continue' ? { ...member, health: 0, status: 'Radiation casualty' } : member)}
    objectives={[
      { id: 'survive', title: 'Keep all four astronauts alive for 30 simulated days', complete: outcome?.status === 'success' },
      { id: 'shelter', title: 'Protect the crew from the solar storm', complete: decision === 'shelter' },
    ]}
    radiation={{ dose: decision === 'continue' ? 65 : 18, limit: 50 }}
    selectedBuildingId={selectedBuildingId}
    event={decision ? undefined : mockEvent}
    outcome={outcome}
    alerts={[
      { id: 'power', severity: 'advisory', message: 'Power usage exceeds daily production.' },
      ...(!decision ? [{ id: 'storm', severity: 'emergency' as const, message: 'Solar storm approaching. Choose a crew response.' }] : []),
    ]}
    onAction={(action) => {
      if (action.type === 'advanceTick') setDay((previous) => Math.min(previous + 1, 30))
    }}
    onBuildingSelect={setSelectedBuildingId}
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
    })}
    onDecision={setDecision}
  />
}

createRoot(document.getElementById('root')!).render(<DashboardPreview />)
