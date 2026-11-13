import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { GameState } from '../../types'
import { BuildingPanel, MissionEventDialog, MissionOverview, resolveBuildingPanelKind } from './index'

const kinds = [
  ['Habitat', 'habitat', 'Crew health'],
  ['Solar array', 'solar-array', 'Electricity generation'],
  ['Greenhouse', 'greenhouse', 'Crop status'],
  ['Water recycler', 'water-recycler', 'Recycling efficiency'],
  ['Oxygen production', 'oxygen-production', 'Equipment status'],
  ['Radiation shelter', 'radiation-shelter', 'Crew protection'],
] as const
const state: GameState = {
  tick: 5,
  resources: { oxygen: 0, water: 43 },
  buildings: kinds.map(([kind, id]) => ({ id, kind, position: { x: 2, y: 4 } })),
}
const close = vi.fn()
const event = { title: 'Solar storm', description: 'Move the crew to safety.', decisions: [{ id: 'shelter', label: 'Take shelter' }] }

describe('contextual game interface', () => {
  it.each(kinds)('selects the %s panel', (name, id, metric) => {
    expect(resolveBuildingPanelKind(name)).toBe(id)
    const html = renderToStaticMarkup(<BuildingPanel state={state} selectedBuildingId={id} onClose={close} />)
    expect(html).toContain(metric)
    for (const [, otherId, otherMetric] of kinds) {
      if (otherId !== id) expect(html).not.toContain(otherMetric)
    }
  })

  it('replaces the selected building and clears the panel when the parent closes it', () => {
    const view = (selectedBuildingId?: string) => renderToStaticMarkup(
      <BuildingPanel state={state} selectedBuildingId={selectedBuildingId} onClose={close} />,
    )
    expect(view('habitat')).toContain('Close building panel')
    expect(view('water-recycler')).toContain('43 L')
    expect(view('water-recycler')).not.toContain('Crew health')
    expect(view()).toBe('')
    expect(view('removed')).toBe('')
  })

  it('exposes only controls backed by telemetry and callbacks', () => {
    const telemetry = { 'solar-array': { allocations: { power: 0 }, canRepair: false } }
    const props = { state, selectedBuildingId: 'solar-array', telemetry, onClose: close }
    expect(renderToStaticMarkup(<BuildingPanel {...props} />)).not.toContain('type="range"')
    const html = renderToStaticMarkup(<BuildingPanel {...props} onAction={vi.fn()} />)
    expect(html).toContain('aria-label="Power allocation"')
    expect(html).toContain('value="0"')
    expect(html).toContain('disabled="">Repair solar array')
  })

  it('renders the event only while pending and exposes decisions and optional dismissal', () => {
    const render = (pending?: typeof event, dismiss?: () => void) => renderToStaticMarkup(
      <MissionEventDialog event={pending} onDecision={vi.fn()} onDismiss={dismiss} />,
    )
    expect(render()).toBe('')
    expect(render(event)).toContain('<dialog')
    expect(render(event)).toContain('Take shelter')
    expect(render(event)).not.toContain('Review later')
    expect(render(event, close)).toContain('Review later')
    expect(renderToStaticMarkup(<MissionOverview state={state} day={5} open={false} onClose={close} />)).toBe('')
  })
})
