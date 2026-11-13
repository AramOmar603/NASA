# Coding agent ownership

| Agent | Owned files | Responsibility |
| --- | --- | --- |
| Scene | `src/scene/**` | Three.js rendering, camera, and scene input |
| Engine | `src/engine/**` | Initial state, action processing, simulation rules, and engine tests |
| Dashboard | `src/components/dashboard/**` | Game status, controls, and dashboard tests |

Keep implementation and tests in your assigned directory. Coordinate changes to shared files with the other agents before editing. Use one agreed change for updates to `src/types/**`, app composition in `src/App.tsx`, global styles, dependencies, build configuration, and shared documentation.

## Shared interfaces

- Import game contracts from `src/types/index.ts`. Use `GameState` as the read-only snapshot for both views.
- The engine owns state transitions. `ApplyAction` defines a transition from a snapshot and a `GameAction` to the next snapshot and its ordered `GameEvent` list. The engine supplies the implementation when gameplay work starts.
- Scene and dashboard currently receive `GameViewProps`. When interactions are added, coordinate an action dispatch callback at the app boundary. Views submit actions through that callback and render the resulting snapshot.
- Keep engine code independent of React and Three.js. Keep Three.js objects out of shared state. App composition is the integration point for the three directories.

See [project setup and contract details](docs/project-setup.md). Run `npm test` and `npm run build` before handing off changes.
