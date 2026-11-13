import { useId } from 'react'
import type { BuildingId, GameAction, GameViewProps, ResourceId } from '../../types'
import './mission-dashboard.css'

const missionResources = [
  { id: 'oxygen', name: 'Oxygen', symbol: 'O₂', unit: 'kg', color: '#42ddd4' },
  { id: 'water', name: 'Water', symbol: 'H₂O', unit: 'L', color: '#77afff' },
  { id: 'food', name: 'Food', symbol: 'FD', unit: 'rations', color: '#bfdf83' },
  { id: 'power', name: 'Electrical power', symbol: 'kWh', unit: 'kWh', color: '#ffd479' },
] as const

export interface ResourceTelemetry {
  readonly capacity?: number
  readonly production?: number
  readonly consumption?: number
  readonly allocation?: number
}

export interface MissionDashboardProps extends GameViewProps {
  readonly day: number
  readonly resources?: Readonly<Partial<Record<ResourceId, ResourceTelemetry>>>
  readonly radiation?: { readonly dose: number; readonly limit?: number }
  readonly missionDays?: number
  readonly foodUnit?: string
  readonly allocationExplanation?: string
  readonly crew?: readonly { readonly id: string; readonly name: string; readonly role: string; readonly status: string; readonly health?: number }[]
  readonly objectives?: readonly { readonly id: string; readonly title: string; readonly complete?: boolean }[]
  readonly selectedBuildingId?: BuildingId
  readonly alerts?: readonly { readonly id: string; readonly severity: 'advisory' | 'emergency'; readonly message: string }[]
  readonly event?: { readonly title: string; readonly description: string; readonly decisions: readonly { readonly id: string; readonly label: string }[] }
  readonly outcome?: { readonly status: 'success' | 'failure'; readonly summary: string }
  readonly preview?: boolean
  readonly advanceBlockedReason?: string
  readonly onAction?: (action: GameAction) => void
  readonly onBuildingSelect?: (id: BuildingId) => void
  readonly onAllocationChange?: (id: ResourceId, percent: number) => void
  readonly onDecision?: (id: string) => void
}

function missionProgress(day: number, missionLength: number) {
  return Math.min(missionLength, Math.max(0, Math.trunc(Number.isFinite(day) ? day : 0)))
}

function Battery({ value, capacity, label }: { value?: number; capacity?: number; label: string }) {
  if (value === undefined || capacity === undefined || capacity <= 0) {
    return <p className="md-muted">Capacity unavailable</p>
  }
  return <meter aria-label={label} min={0} max={capacity} value={Math.max(0, Math.min(value, capacity))} />
}

export function MissionDashboard({
  state, day, resources, radiation, crew = [], objectives = [], selectedBuildingId, alerts = [],
  event, outcome, preview, missionDays: missionLength = 30, foodUnit = 'rations', allocationExplanation, advanceBlockedReason, onAction, onBuildingSelect, onAllocationChange, onDecision,
}: MissionDashboardProps) {
  const titleId = useId()
  const currentDay = missionProgress(day, missionLength)
  const building = state.buildings.find(({ id }) => id === selectedBuildingId)
  const allocations = missionResources.flatMap(({ id, name }) => {
    const allocation = resources?.[id]?.allocation
    return allocation === undefined ? [] : [{ id, name, allocation }]
  })
  const radiationLimitReached = radiation?.limit !== undefined && radiation.dose >= radiation.limit

  return (
    <section className="mission-dashboard" aria-labelledby={titleId}>
      <header className="md-header flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="md-mark" aria-hidden="true">◈</span>
          <div><h1 id={titleId}>LUNARIS</h1><p>Junior Astronaut Mission Trainer</p></div>
        </div>
        {preview && <span className="md-badge">Preview · Mock data</span>}
      </header>

      <div className="md-content">
        <section className="md-hero md-panel" aria-label="Mission progress">
          <div className="md-moon" aria-hidden="true" />
          <div className="md-hero-copy">
            <p className="md-label">Lunar surface mission</p>
            <h2>Mission day <strong>{currentDay}</strong></h2>
            <div className="flex flex-wrap justify-between gap-2">
              <span>{currentDay} / {missionLength} days</span>
              <span>{Math.round(currentDay / missionLength * 100)}% complete</span>
            </div>
            <progress aria-label={`Progress toward day ${missionLength}`} value={currentDay} max={missionLength} />
            {onAction && <button type="button" disabled={Boolean(outcome || advanceBlockedReason)} onClick={() => onAction({ type: 'advanceTick' })}>Advance simulation</button>}
            {advanceBlockedReason && <p>{advanceBlockedReason}</p>}
          </div>
        </section>

        {outcome && <section className={`md-panel md-outcome md-${outcome.status}`} role="status">
          <h2>Mission {outcome.status === 'success' ? 'successful' : 'failed'}</h2>
          <p>{outcome.summary}</p>
        </section>}

        <section aria-label="Life support and radiation">
          <h2 className="md-section-title">Life support</h2>
          <div className="md-resources">
            {missionResources.map(({ id, name, symbol, unit: defaultUnit, color }) => {
              const unit = id === 'food' ? foodUnit : defaultUnit
              const balance = state.resources[id]
              const telemetry = resources?.[id]
              return <article key={id} className="md-panel md-resource" style={{ accentColor: color }}>
                <span className="md-resource-icon" style={{ color }} aria-hidden="true">{symbol}</span>
                <h3>{name}</h3>
                <p className="md-reading">{balance === undefined ? '—' : Number(balance.toFixed(2))} <small>{unit}</small></p>
                <Battery value={balance} capacity={telemetry?.capacity} label={`${name} capacity`} />
                <dl className="md-flow">
                  <div><dt>Production</dt><dd>{telemetry?.production === undefined ? '—' : `+${Number(telemetry.production.toFixed(2))} ${unit}/day`}</dd></div>
                  <div><dt>Consumption</dt><dd>{telemetry?.consumption === undefined ? '—' : `−${Number(telemetry.consumption.toFixed(2))} ${unit}/day`}</dd></div>
                </dl>
              </article>
            })}
            <article className="md-panel md-resource" style={{ accentColor: '#d6a6fd' }}>
              <span className="md-resource-icon text-violet-300" aria-hidden="true">☢</span>
              <h3>Radiation safety</h3>
              <p className="md-reading">{radiation ? Number(radiation.dose.toFixed(2)) : '—'} <small>mSv</small></p>
              {radiation?.limit !== undefined && <Battery value={radiation.dose} capacity={radiation?.limit} label="Radiation dose relative to safety limit" />}
              <p className={radiationLimitReached ? 'md-danger' : 'md-muted'}>
                {radiation?.limit !== undefined ? radiationLimitReached ? 'Safety limit reached' : `Below ${radiation.limit} mSv limit` : radiation ? 'Highest cumulative crew dose' : 'Telemetry unavailable'}
              </p>
            </article>
          </div>
        </section>

        <div className="md-operations">
          <section className="md-panel md-block">
            <h2>Power distribution</h2>
            {onAllocationChange && allocations.length > 0 ? allocations.map(({ id, name, allocation }) => (
              <label className="md-allocation" key={id}>
                <span>{name} <output>{allocation}%</output></span>
                <input type="range" aria-label={`${name} allocation`} min={0} max={100} step={1} value={allocation} disabled={Boolean(outcome)}
                  onChange={(e) => onAllocationChange(id, e.currentTarget.valueAsNumber)} />
              </label>
            )) : <p className="md-muted">{allocationExplanation ?? 'Allocation controls unavailable'}</p>}
          </section>
          <section className="md-panel md-block">
            <h2>Crew status</h2>
            {crew.length === 0 && <p className="md-muted">Crew telemetry unavailable</p>}
            <ul className="md-crew">
              {crew.map((member) => <li key={member.id}>
                <span className="md-avatar" aria-hidden="true">{member.name.slice(0, 1)}</span>
                <div><strong>{member.name}</strong><small>{member.role}</small>{member.health !== undefined && <><small>Health {member.health}%</small><progress aria-label={member.name + ' health'} value={member.health} max={100} /></>}</div>
                <span className="md-crew-status">{member.status}</span>
              </li>)}
            </ul>
          </section>
          <section className="md-panel md-block">
            <h2>Building selection</h2>
            {state.buildings.length === 0 && <p className="md-muted">No buildings deployed</p>}
            <div className="flex flex-wrap gap-2">
              {state.buildings.map((item) => <button key={item.id} type="button" aria-pressed={item.id === selectedBuildingId}
                disabled={!onBuildingSelect} onClick={() => onBuildingSelect?.(item.id)}>
                {item.kind} · {item.id}
              </button>)}
            </div>
            {building && <dl className="md-building">
              <div><dt>Building</dt><dd>{building.kind}</dd></div>
              <div><dt>Grid position</dt><dd>{building.position.x}, {building.position.y}</dd></div>
            </dl>}
          </section>
          <section className="md-panel md-block">
            <h2>Mission alerts</h2>
            <div>
              {alerts.length ? <ul className="md-alerts">{alerts.map((alert) => <li key={alert.id} className={`md-${alert.severity}`}>
                <div role={alert.severity === 'emergency' ? 'alert' : 'status'}>
                  <strong>{alert.severity}</strong><p>{alert.message}</p>
                </div>
              </li>)}</ul> : <p className="md-muted">No active alerts</p>}
            </div>
          </section>
          <section className="md-panel md-block">
            <h2>Mission objectives</h2>
            {objectives.length ? <ul className="md-alerts">{objectives.map((objective) => <li key={objective.id}>
              <strong>{objective.complete ? 'Complete' : 'In progress'}</strong>
              <p>{objective.title}</p>
            </li>)}</ul> : <p className="md-muted">No objectives assigned</p>}
          </section>
          <section className="md-panel md-block md-event">
            <h2>Mission event</h2>
            {event ? <><h3>{event.title}</h3><p>{event.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {event.decisions.map((decision) => <button type="button" key={decision.id} disabled={!onDecision || Boolean(outcome)}
                  onClick={() => onDecision?.(decision.id)}>{decision.label}</button>)}
              </div></> : <p className="md-muted">No decision pending</p>}
          </section>
        </div>
      </div>
    </section>
  )
}
