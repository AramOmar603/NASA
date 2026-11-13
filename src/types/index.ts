export type ResourceId = string
export type BuildingId = string
export type BuildingKind = string

export type ResourceBalances = Readonly<Partial<Record<ResourceId, number>>>
export type GridPosition = Readonly<{ x: number; y: number }>

export interface Building {
  readonly id: BuildingId
  readonly kind: BuildingKind
  readonly position: GridPosition
}

export interface GameState {
  readonly tick: number
  readonly resources: ResourceBalances
  readonly buildings: readonly Building[]
}

export type GameAction =
  | { readonly type: 'advanceTick' }
  | {
      readonly type: 'placeBuilding'
      readonly kind: BuildingKind
      readonly position: GridPosition
    }

export type GameEvent =
  | { readonly type: 'tickAdvanced'; readonly tick: number }
  | { readonly type: 'buildingPlaced'; readonly building: Building }

export type ApplyAction = (
  state: GameState,
  action: GameAction,
) => { readonly state: GameState; readonly events: readonly GameEvent[] }

export interface GameViewProps {
  readonly state: GameState
}
