import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { advanceRookie, createRookieSession } from '../rookie-training/session'
import { DepartmentInfo, departmentReadings } from './DepartmentInfo'
import { outpost } from '../scene/buildings'
import { MoonArrival } from './MoonArrival'

it('shows a manual launch button while the full Moon is at rest', () => {
  const html = renderToStaticMarkup(<MoonArrival onApproach={() => {}} onArrival={() => {}} />)
  expect(html).toContain('data-approaching="false"')
  expect(html).toContain('🚀 GO TO BASE')
})

it('shows three readings per department and reflects live changes and equipment faults', () => {
  const initial = createRookieSession(2)
  const next = advanceRookie(initial, 2)
  for (const { id } of outpost) {
    expect(departmentReadings(id, next)).toHaveLength(3)
  }
  expect(departmentReadings('OXY-01', next)).toContainEqual([
    'Oxygen stored', `${Number(next.state.resources.oxygenKg.toFixed(1))} kg`,
  ])
  expect(renderToStaticMarkup(<DepartmentInfo id="SOL-01" session={initial} />)).toContain('Working')
  expect(renderToStaticMarkup(<DepartmentInfo id="SOL-01" session={next} />)).toContain('Offline')
})
