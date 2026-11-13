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

const mockTelemetry: MissionDashboardProps['resources'] = {
  oxygen: { capacity: 100, production: 12, consumption: 10, allocation: 75 },
  water: { capacity: 240, production: 30, consumption: 24, allocation: 65 },
  food: { capacity: 140, production: 6, consumption: 8, allocation: 55 },
  power: { capacity: 120, production: 18, consumption: 25, allocation: 80 },
}

const mockCrew = [
  { id: '1', name: 'Maya Chen', role: 'Commander', status: 'Ready' },
  { id: '2', name: 'Amir Saleh', role: 'Flight engineer', status: 'On duty' },
  { id: '3', name: 'Lena Ortiz', role: 'Medical officer', status: 'Ready' },
  { id: '4', name: 'Noah Park', role: 'Science officer', status: 'On duty' },
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
    crew={mockCrew}
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
    onAllocationChange={(id, allocation) => setResources((previous) => ({
      ...previous,
      [id]: { ...previous?.[id], allocation },
    }))}
    onDecision={setDecision}
  />
}

createRoot(document.getElementById('root')!).render(<DashboardPreview />)
