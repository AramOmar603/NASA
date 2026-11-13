# LUNARIS game interface

From the repository root, run `npm ci` and `npm run dev`. Open
`/src/components/dashboard/preview.html` on Vite. The preview uses a mock
terrain and six clickable building markers. Select a marker to show its panel,
select another to replace it, or click empty terrain or press Escape to close.
Try the solar repair and power controls, the greenhouse water slider, and
**Review emergency**. **Mission overview** opens the full dashboard. Sheltering
lets the preview continue to day 30 through **Advance simulation** in the
overview. Continuing the inspection shows the failure screen. Reload to reset.

## Exports and integration

Import from `src/components/dashboard`. Render the scene in a viewport-height
container with `position: relative`. Mount the HUD and building panel as
siblings of the canvas so they overlay the world. The panel occupies the right
edge on desktop and becomes a bottom sheet at widths of 44rem and below.

| Export | Props and callback contracts |
| --- | --- |
| `GameHUD` | Shared `state`, explicit `day`, optional `alerts`, boolean `overviewOpen`, required `onOverviewToggle()`, optional `onOpenEmergency()` when a decision is pending. Displays emergency alerts. |
| `BuildingPanel` | Shared `state`, optional `buildings` override (defaults to `state.buildings`), optional `selectedBuildingId`, optional telemetry keyed by building ID, required `onClose()`, optional `onAction(BuildingAction)`. |
| `MissionEventDialog` | Optional `event` with title, description, and decisions with stable IDs and labels. `onDecision(id)` submits a decision. Optional `onDismiss()` enables **Review later** and Escape. The parent clears the event prop to close the dialog. |
| `MissionOverview` | Existing `MissionDashboard` props plus boolean `open` and `onClose()`. The overview uses a modal and Escape calls `onClose()`. |
| `MissionDashboard` | Original reusable overview content. Available for standalone uses. |

Keep selection, overview visibility, and emergency visibility in the parent.
On a scene building hit, set `selectedBuildingId` to the shared `Building.id`.
On an empty terrain hit and in `BuildingPanel.onClose`, clear that ID. Supply
the clicked building ID from the scene hit handler and prevent that same hit
from also reaching the empty-terrain handler. Restore keyboard focus to the
scene or building trigger when closing the panel. Prefer showing one modal at
a time. Close or defer the overview before showing an emergency.

## Building mapping and telemetry

IDs are opaque instance keys used for selection, telemetry, and actions. The
panel chooses its layout from the building's shared `kind`. The exported
`resolveBuildingPanelKind` trims whitespace, lowercases the name, and turns
spaces or underscores into dashes. Unknown kinds show the building name and
grid position.

| Canonical kind | Per-building `readings` keys | Additional data and actions |
| --- | --- | --- |
| `habitat` | `crewHealth`, `lifeSupport`, `livingConditions` | |
| `solar-array` | `generation`, `battery` | `allocations.power`, `canRepair` |
| `greenhouse` | `production`, `crops` | Base `food` reserves, `allocations.water` |
| `water-recycler` | `efficiency`, `condition` | Base `water` reserves |
| `oxygen-production` | `generation`, `equipment` | Base `oxygen` reserves |
| `radiation-shelter` | `radiationRisk`, `readiness`, `protection` | |

Readings are formatted display strings including units where applicable.
Allocate sends `{ type: 'allocate', buildingId, resource, percent }` with a
whole percent from 0 to 100. Repair sends `{ type: 'repair', buildingId }`.
The parent supplies updated telemetry after accepting either intent. The
panel shows allocation only when an action callback and current percent are
available. Repair availability comes from `canRepair`.

The current shared contracts supply ticks, balances, buildings, and
`advanceTick`. The scene needs hit and empty-terrain callbacks. An engine
adapter or future shared contract needs an explicit mission day, per-building
telemetry keyed by ID, actions for per-building allocation and solar repair,
and mission events with stable decision IDs and a decision action. The overview
also accepts optional crew, radiation, resource flow, alerts, and mission outcome.

The overview also exposes crew health and mission objectives. Its mock power
allocation redistributes the remaining budget across systems to keep the total
at 100%. Per-building controls use separate building telemetry.

## Live survival integration

Run `npm ci` and `npm run dev`, then open
`/src/components/dashboard/survival-preview.html` on the Vite server.
**Advance one day** runs one engine tick. Open **Mission overview** to see
stocks, previous-day gross flows, radiation and crew vitals. Select a facility
in the 3D world or in **Base facilities and power** to see its condition and
repair it when damaged. A repair uses one spare kit and leaves the day unchanged.
**Mission log** shows engine incidents, repair events and mission completion.

`SurvivalMission` owns a session initialized with one seed and configuration.
Pass it the visual building catalog and an optional `renderWorld` function
that receives the selection handlers. The supplied preview composes the
existing lunar environment and outpost. The main app entry point still uses
its current composition. The engine models fixed subsystems, and the catalog
associates each recognized visual building kind with the corresponding
subsystem. The scene's `oxygen-generator` maps to `oxygen-production`.

The controller adapts unit-bearing engine keys to the reusable dashboard.
The engine exposes delivered energy and stocks, but no gross-flow fields.
The controller reconstructs previous-day gross flows from the pre-tick
inventories, post-tick equipment condition, delivered power, and shared
configuration. Repairs preserve those last-day readings. If the engine's
flow formulas change, update this adapter or expose gross flow in the engine
result directly.

Power distribution follows the engine's fixed priority. The live UI has no
manual allocation sliders or emergency response choices because the engine
has no actions for those. Equipment failures appear as critical alerts, and
radiation is shown as cumulative crew exposure without an invented threshold.
