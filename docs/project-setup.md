# Project setup

Use Node.js 22.12 or later and npm. Run these commands from the repository root.

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm run test:watch` runs Vitest in watch mode. `npm run preview` serves the production build from `dist/`.

## Game contracts

- `GameState.tick` counts completed simulation ticks from zero. Resource balances are keyed by resource ID. An absent key represents zero.
- Buildings have an instance ID, a kind, and a two-dimensional grid position. The scene maps grid coordinates `(x, y)` to Three.js world coordinates `(x, 0, y)` at ground level.
- `GameAction` describes a caller's intent. `GameEvent` describes a completed state change. Both are discriminated by `type`.
- An `ApplyAction` implementation takes the current snapshot and an action and returns the resulting snapshot and an ordered list of events. Keep input snapshots immutable and pass the resulting snapshot to the views.

The starter app renders a grid and displays the initial tick and building count. The smoke test verifies the initial snapshot. Gameplay transitions, resource and building catalogs, and interactive controls are left for feature branches.

File ownership and coordination are documented in [AGENTS.md](../AGENTS.md).
