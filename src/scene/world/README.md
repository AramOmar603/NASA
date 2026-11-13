# Lunar world integration

`LunarWorld` composes the lunar environment and an optional base component in one React Three Fiber canvas. When no base is supplied, it renders the environment by itself. The environment owns the camera, orbit, zoom and pan controls, lighting, and render loop. A base component supplies scene objects in the same world space and uses that camera and lighting. It should have no canvas, camera controller, or separate render loop.

## Component contract

- `buildings?: readonly Building[]` forwards the current snapshot from `GameState.buildings`. Omit it to show the furnished outpost with corridors when using `LunarBase`. Pass an empty array to show no facilities.
- `selectedBuildingId?: BuildingId` forwards the caller's current selection to the base for highlighting. Clear it when the ground is selected.
- `BaseComponent?: ComponentType<LunarBaseSlotProps>` is the optional base or adapter. Supply a stable component reference once the base API is available.
- `onBuildingSelect?: (id: BuildingId) => void` reports selection of a building. The base component should report the shared building ID and stop pointer propagation when it handles the hit.
- `onGroundSelect?: (position: GridPosition) => void` reports a ground selection in game grid coordinates. The base component or adapter owns the placement hit test and should ignore drags and selections outside the building zone.
- `className?: string` styles the environment container. If supplied, give it a measurable height.

Both callbacks are optional and report user intent to the caller. The caller owns selection state or dispatches game actions. The base component should use declarative state for visual changes or call R3F's `invalidate()` after imperative changes because the environment renders on demand.

```tsx
<LunarWorld
  buildings={state.buildings}
  BaseComponent={LunarBase}
  selectedBuildingId={selectedBuildingId}
  onBuildingSelect={selectBuilding}
  onGroundSelect={selectGround}
/>
```

Once PR #6 is available in the same checkout, import `LunarBase` from `../buildings` in the caller. PR #6 implements the slot directly, including pointer hit testing and event forwarding. Omit `buildings={state.buildings}` in the example above to preview the full furnished outpost.

## Coordinate contract

The zone is centered at world `(0, 0, 0)`. One world unit is one meter. The floor is at Y = 0, and the entire building footprint must fit inside X and Z bounds of −70 to +70 m. A game grid coordinate `{ x, y }` maps to the world position `[x, BASE_ELEVATION, y]`. A ground hit at world `(x, 0, z)` maps back to grid `{ x, y: z }`. Import `BASE_ELEVATION` and `BASE_HALF_EXTENT` from `../environment` when computing placement. Models should place their origin at ground level or apply a height offset inside the adapter.

## Preview and handoff

Run `npm run dev` and open `/src/scene/environment/preview.html`. This preview renders `LunarWorld` with an empty building snapshot. Once the base is ready, test its footprint and scale, shared shadows, building and ground selection, and camera orbit, zoom and pan with the base present before merging.
