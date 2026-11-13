# Lunar outpost

Run `npm ci` and `npm run dev`, then open `/src/scene/buildings/preview.html` on the Vite server. Drag to orbit, scroll to zoom, click a facility to select it, and click open ground inside the placement zone to clear selection.

## Integration

Import `LunarBase`, `LunarBaseProps`, and the optional `outpost` fixture from `src/scene/buildings`. The existing React, React Three Fiber, and Three.js packages are sufficient.

```tsx
<LunarEnvironment>
  <LunarBase selectedBuildingId={selectedId} onBuildingSelect={setSelectedId} />
</LunarEnvironment>
```

For the Draft PR #4 world slot, pass `BaseComponent={LunarBase}` to `LunarWorld` and supply `buildings={state.buildings}`. The component reports the shared building ID, stops propagation when a facility handles a click, and ignores drags. Optional ground selection emits `{ x, y }` from within the fixed world placement zone.

| Prop | Behavior |
| --- | --- |
| `buildings?: readonly Building[]` | Omit to render the complete fixture and its fixed corridors. An explicit snapshot renders the supplied buildings at their coordinates, with an empty snapshot rendering no facilities. |
| `position?: readonly [number, number, number]` | Outpost origin, default `[0, BASE_ELEVATION, 0]`. |
| `scale?: number` | Uniform outpost scale, default `1`. |
| `selectedBuildingId?: BuildingId` | Highlights the selected facility beacon. |
| `onBuildingSelect?: (id: BuildingId) => void` | Reports a facility click. |
| `onGroundSelect?: (position: GridPosition) => void` | Reports a point on the fixed central placement plane. |

The game maps grid `(x, y)` to scene `(x, 0, y)` at one meter per unit. The complete fixture occupies approximately 71 × 57 m inside the 140 × 140 m placement zone. The habitat deck is 18 × 8 m, greenhouse 12 × 16 m, utility decks 13 × 10 m, and shelter deck 14 × 12 m. Four framed solar tables span about 23 × 16 m. Corridor decks are 3.6 m wide. Snapshot callers own placement and footprint validation when moving, scaling, or adding buildings.

Supported kind IDs are `habitat`, `greenhouse`, `solar-array`, `oxygen-generator`, `water-recycler`, `battery`, `radiation-shelter`, and `rover`. Unknown kinds render a utility shell. Use an adapter if the simulation adopts different names. The fixed corridors belong to the furnished fixture. Arbitrary snapshots currently have no automatically routed corridors.

Geometry is generated locally and batched by finish per facility. The greenhouse has transparent glazing, visible crops, and emissive grow strips. Beacons show selection. Facility shadows and surface illumination use the environment's existing lighting. The models require no textures, downloads, additional camera, or render loop.
