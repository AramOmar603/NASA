import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MissionDashboard } from './MissionDashboard'

const state = {
  tick: 12,
  resources: { oxygen: 0 },
  buildings: [{ id: 'lab', kind: 'Laboratory', position: { x: 3, y: 8 } }],
}

describe('MissionDashboard', () => {
  it('shows zero balances, selected building coordinates, and emergency alerts', () => {
    const html = renderToStaticMarkup(<MissionDashboard state={state} day={12}
      selectedBuildingId="lab"
      resources={{ oxygen: { capacity: 100, production: 0, consumption: 8 } }}
      alerts={[{ id: 'oxygen', severity: 'emergency', message: 'Oxygen depleted' }]}
    />)

    expect(html).toContain('40% complete')
    expect(html).toContain('value="0"')
    expect(html).toContain('+0 kg/day')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('3, 8')
    expect(html).toContain('role="alert"')
    expect(html).toContain('Oxygen depleted')
  })

  it('caps progress and disables mission controls when an outcome is supplied', () => {
    const html = renderToStaticMarkup(<MissionDashboard state={state} day={31}
      outcome={{ status: 'success', summary: 'Crew reached the goal.' }}
      resources={{ oxygen: { allocation: 50 } }}
      event={{ title: 'Storm', description: 'A storm is inbound.', decisions: [{ id: 'shelter', label: 'Shelter' }] }}
      onAction={() => {}}
      onAllocationChange={() => {}}
      onDecision={() => {}}
    />)

    expect(html).toContain('100% complete')
    expect(html).toContain('Mission successful')
    expect(html).toContain('disabled="">Advance simulation')
    expect(html).toContain('disabled="">Shelter')
    expect(html).toMatch(/<input[^>]*disabled=""/)
  })
})
