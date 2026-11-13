# Mission dashboard

Run `npm ci` and `npm run dev` from the repository root. Open
`/src/components/dashboard/preview.html` on the Vite server. The preview
uses mock telemetry and local UI state. Advance the day, choose a building,
adjust an allocation, or choose a storm response. Sheltering lets the mock
mission continue to day 30. Continuing the inspection shows the failure screen.
Reload to reset.

For app integration, render `MissionDashboard` with the shared `GameState`.
Pass the mission day explicitly because the shared contract does not establish
a conversion from ticks to days. The optional dashboard telemetry supplies
capacities, per-day rates, allocation percentages, radiation, crew, alerts,
decisions, and outcome. Connect `onAction` to shared game action dispatch and
`onBuildingSelect` to the app's building selection. Allocation and event
decision callbacks are dashboard intents that the app can adapt once the
engine supports them. Update the props after handling each callback. The main
app keeps its existing dashboard until integration.
