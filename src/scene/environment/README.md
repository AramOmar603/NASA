# Lunar environment

Run `npm ci` and `npm run dev` from the repository root, then open `/src/scene/environment/preview.html` on the Vite dev server. The standalone route leaves the shared app composition available for integration. Use drag to orbit, scroll or pinch to zoom, and right-drag or two-finger drag to pan.

Import `LunarEnvironment` from this directory. Supply an optional CSS class with a measurable height. Its children are rendered inside the same React Three Fiber canvas, where structure meshes can receive and cast shadows.

## Coordinates and placement

- One world unit represents one meter. Y is up, the ground spans X and Z, and the center is `(0, 0, 0)`.
- The 1,600 m square terrain extends from −800 to +800 on both ground axes. Shared game grid coordinates `(x, y)` map to world `(x, elevation, y)`.
- The base placement zone is a 140 × 140 m square centered at the origin. Keep the entire footprint inside `[-70, 70]` on both X and Z. Its nominal elevation is `BASE_ELEVATION = 0`, with a smooth transition outside the boundary. A four-meter flat margin keeps the rendered mesh level through the placement boundary.
- `terrainHeight(x, z)` returns the procedural source elevation in meters. The triangulated surface approximates it outside the zone. Shadows are tuned for the central region.

## Rendering

The scene uses a deterministic terrain mesh with denser tessellation around the center, instanced rocks, a mipmapped regolith texture, one directional shadow map, and demand-driven rendering. The camera caps pixel ratio at 1.5. Sky, procedural Earth illustration, terrain, and textures are generated locally with no asset downloads. Earth’s geography is illustrative, and its size and placement are chosen for the preview composition.
