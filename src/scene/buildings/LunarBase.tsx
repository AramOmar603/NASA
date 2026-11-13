import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Vector3, type Group } from 'three'
import type { Building, BuildingId, GridPosition } from '../../types'
import { BASE_ELEVATION, BASE_HALF_EXTENT } from '../environment'
import { corridors, outpost } from './layout'
import { finishes, makeBuilding, makeCorridor, type Model } from './models'

export interface LunarBaseProps {
  /** Omit for the furnished outpost. Pass a snapshot to use its IDs and positions. */
  readonly buildings?: readonly Building[]
  readonly position?: readonly [number, number, number]
  readonly scale?: number
  readonly selectedBuildingId?: BuildingId
  readonly onBuildingSelect?: (id: BuildingId) => void
  readonly onGroundSelect?: (position: GridPosition) => void
}

function ModelMeshes({ model, children }: { model: Model; children?: ReactNode }) {
  useEffect(() => () => {
    model.forEach(({ geometry }) => geometry.dispose())
  }, [model])

  return <group>
    {model.map(({ finish, geometry }) => <mesh key={finish} geometry={geometry}
      castShadow={finish === 'ceramic' || finish === 'frame' || finish === 'blue' || finish === 'regolith'}
      receiveShadow={finish !== 'glass' && finish !== 'grow'}>
      <meshStandardMaterial {...finishes[finish]} />
    </mesh>)}
    {children}
  </group>
}

function Facility({ building, selected, onSelect }: {
  building: Building; selected: boolean; onSelect?: (id: BuildingId) => void
}) {
  const model = useMemo(() => makeBuilding(building.kind), [building.kind])
  return <group name={building.id} position={[building.position.x, 0, building.position.y]}
    onClick={onSelect ? (event) => {
      if (event.delta > 4) return
      event.stopPropagation()
      onSelect(building.id)
    } : undefined}>
    <ModelMeshes model={model}>
      <mesh position={[0, 8.25, 0]} rotation={[0, 0, Math.PI / 4]} raycast={() => {}}>
        <octahedronGeometry args={[selected ? 0.48 : 0.26]} />
        <meshBasicMaterial color={selected ? '#ffc16a' : '#72e8dd'} toneMapped={false} />
      </mesh>
    </ModelMeshes>
  </group>
}

function Corridor({ x, z, length, axis }: (typeof corridors)[number]) {
  const model = useMemo(() => makeCorridor(length), [length])
  return <group position={[x, 0, z]} rotation={[0, axis === 'x' ? Math.PI / 2 : 0, 0]}>
    <ModelMeshes model={model} />
  </group>
}

export function LunarBase({
  buildings, position = [0, BASE_ELEVATION, 0], scale = 1,
  selectedBuildingId, onBuildingSelect, onGroundSelect,
}: LunarBaseProps) {
  const ground = useRef<Group>(null)

  return <group name="Lunar base">
    {onGroundSelect && <group ref={ground}>
      <mesh position={[0, BASE_ELEVATION + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}
        onClick={(event) => {
          if (event.delta > 4 || !ground.current) return
          const point = ground.current.worldToLocal(new Vector3().copy(event.point))
          event.stopPropagation()
          onGroundSelect({ x: point.x, y: point.z })
        }}>
        <planeGeometry args={[BASE_HALF_EXTENT * 2, BASE_HALF_EXTENT * 2]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>}
    <group position={[...position]} scale={scale}>
      {(buildings ?? outpost).map((building) => <Facility key={building.id} building={building}
        selected={building.id === selectedBuildingId} onSelect={onBuildingSelect} />)}
      {buildings === undefined && corridors.map((corridor) => <Corridor key={corridor.length} {...corridor} />)}
    </group>
  </group>
}
