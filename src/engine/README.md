# Lunar survival engine

Use `createSurvivalState(seed, config)` and `applySurvivalAction(state, action, config)` from `survival.ts`. Pass the same configuration for initialization and transitions. The default scenario models 30 simulated days with four crew members and full stores. The engine has no React or Three.js dependency and returns immutable snapshots and ordered events.

- `advanceTick` advances one simulated day. `maintain` consumes one spare kit to repair a named subsystem without advancing time. A completed simulation ignores further actions.
- The habitation life-support system, oxygen plant, recycler, and greenhouse receive power from the shared solar and battery pool in that order. Partial power reduces output. Failed production equipment uses no power. Excess energy charges the battery within its capacity.
- Oxygen and food enter shared stores during a tick. Water is drawn from storage and recovered at the end of the day, so recycled water becomes available the next day. Oxygen delivery depends on life-support power in addition to oxygen inventory. The engine records energy delivered to each building subsystem. The visual building array is carried through unchanged, while the simulation treats these subsystems as a fixed starter base.
- Equipment condition runs from 0 to 1. Wear and seeded incidents degrade it, and equipment at or below the failure threshold stops operating. Passive shielding reduces daily exposure according to its condition. Crew health starts at 100 points and can fall from exposure and shortages. The mission fails if any crew member reaches zero health, and succeeds after the configured day count if everyone is alive.

## Units and assumptions

The configuration uses kg of oxygen and food, liters of water, kWh of energy, and mSv of radiation dose. All rates, capacities, exposure assumptions, failure mechanics, and health penalties are invented gameplay values, including the constant daily solar and radiation inputs. They are not NASA data. No lunar illumination schedule, environmental dose model, or medical survival model is implied. Supply finite nonnegative rates and capacities, fractions in [0, 1], and positive integer crew and mission-day counts.

## Integration

`SurvivalState` extends `GameState`; existing readers can consume its tick, resources, and buildings. Resource keys carry their units: `oxygenKg`, `waterL`, `foodKg`, `batteryKWh`, and `spareKits`. The caller can use the shared `advanceTick` action and `tickAdvanced` event. Maintenance, failure, and completion require the engine-specific action/event types. Building placement needs a separate integration decision before production capacity can depend on player-built structures.

## Public API

| Export | Contract |
| --- | --- |
| `createSurvivalState(seed?, config?)` | Creates a new simulation at tick zero. The default seed is 1 and is normalized to an unsigned 32-bit integer. |
| `applySurvivalAction(state, action, config?)` | Returns `{ state, events }` without mutating its inputs. Terminal states and maintenance with no spare kits or no damage return the same snapshot and no events. |
| `SurvivalState` | Extends `GameState` with per-person health and dose, equipment condition, per-load delivered power, outcome, and the current random seed. |
| `Equipment` | One of `solar`, `oxygenPlant`, `recycler`, `greenhouse`, or `shielding`. |
| `SurvivalAction` | The shared `advanceTick` action or `maintain` with an `Equipment` key. |
| `SurvivalEvent` | `tickAdvanced` carries the new tick. `equipmentDamaged`, `equipmentFailed`, and `equipmentRepaired` carry an equipment key. `missionCompleted` carries a success or failure outcome. |
| `survivalDefaults`, `SurvivalConfig` | The default gameplay constants and the read-only configuration type, exported from `survivalConfig.ts`. |

The dashboard sends `{ type: 'advanceTick' }` to advance a day and `{ type: 'maintain', equipment: 'oxygenPlant' }` to repair the oxygen plant. Use the corresponding equipment key for another repair. The app should feed the returned state into the next transition and use the returned events for feedback.
