import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { outpost } from '../scene/buildings'
import { departments, type DepartmentId } from './departments'

export function LabelPositions({ buttons }: { buttons: Partial<Record<DepartmentId, HTMLButtonElement>> }) {
  const point = useMemo(() => new Vector3(), [])
  useFrame(({ camera, size }) => {
    for (const { id, position } of outpost) {
      const button = buttons[id]
      if (!button) continue
      point.set(position.x, id === 'ROV-01' ? 3.6 : 8.7, position.y).project(camera)
      button.style.visibility = Math.abs(point.x) <= 0.98 && Math.abs(point.y) <= 0.98 && Math.abs(point.z) <= 1 ? 'visible' : 'hidden'
      button.style.left = (point.x + 1) * size.width / 2 + 'px'
      button.style.top = (1 - point.y) * size.height / 2 + 'px'
    }
  })
  return null
}

export function useLabelButtons() {
  return useRef<Partial<Record<DepartmentId, HTMLButtonElement>>>({}).current
}

export function DepartmentLabels({ buttons, selected, offline, onSelect }: {
  buttons: Partial<Record<DepartmentId, HTMLButtonElement>>
  selected?: string
  offline: ReadonlySet<string>
  onSelect: (id: DepartmentId) => void
}) {
  return <div className="mf-labels" aria-label="Lunar departments">
    {outpost.map(({ id }) => {
      const { name, icon } = departments[id]
      return <button key={id} type="button" ref={(button) => {
        if (button) buttons[id] = button
        else delete buttons[id]
      }} aria-label={name + (offline.has(id) ? ', offline' : '')} aria-pressed={selected === id}
        data-offline={offline.has(id)} onClick={() => onSelect(id)}>
        <span aria-hidden="true">{icon}</span>
      </button>
    })}
  </div>
}
