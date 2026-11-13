import type { ComponentType } from 'react'
import type { Building, BuildingId, GridPosition } from '../../types'
import { LunarEnvironment } from '../environment'

export interface LunarBaseSlotProps {
  readonly buildings: readonly Building[]
  readonly onBuildingSelect?: (id: BuildingId) => void
  readonly onGroundSelect?: (position: GridPosition) => void
}

export interface LunarWorldProps extends LunarBaseSlotProps {
  /** Optional scene component or adapter rendered inside the environment canvas. */
  readonly BaseComponent?: ComponentType<LunarBaseSlotProps>
  readonly className?: string
}

export function LunarWorld({ BaseComponent, className, buildings, onBuildingSelect, onGroundSelect }: LunarWorldProps) {
  return (
    <LunarEnvironment className={className}>
      {BaseComponent && (
        <BaseComponent
          buildings={buildings}
          onBuildingSelect={onBuildingSelect}
          onGroundSelect={onGroundSelect}
        />
      )}
    </LunarEnvironment>
  )
}
