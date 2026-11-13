import type { GameViewProps } from '../../types'
import type { MissionDashboardProps } from './MissionDashboard'
import './game-interface.css'

export interface GameHUDProps extends GameViewProps {
  readonly day: number
  readonly alerts?: MissionDashboardProps['alerts']
  readonly overviewOpen: boolean
  readonly onOverviewToggle: () => void
  readonly onOpenEmergency?: () => void
}

export function GameHUD({ state, day, alerts, overviewOpen, onOverviewToggle, onOpenEmergency }: GameHUDProps) {
  const critical = alerts?.filter(({ severity }) => severity === 'emergency') ?? []

  return (
    <header className="lg-hud" aria-label="Mission HUD">
      <div className="lg-wordmark"><span aria-hidden="true">◈</span> LUNARIS</div>
      <dl className="lg-stats">
        <div><dt>Mission day</dt><dd>{day}<small> / 30</small></dd></div>
        <div><dt>Oxygen</dt><dd>{state.resources.oxygen ?? '—'} <small>kg</small></dd></div>
        <div><dt>Power</dt><dd>{state.resources.power ?? '—'} <small>kWh</small></dd></div>
      </dl>
      <button type="button" className="lg-button" aria-expanded={overviewOpen} onClick={onOverviewToggle}>
        {overviewOpen ? 'Close overview' : 'Mission overview'}
      </button>
      {(critical.length > 0 || onOpenEmergency) && (
        <div className="lg-alert">
          {critical.length > 0 && <ul role="alert">{critical.map(({ id, message }) => <li key={id}>{message}</li>)}</ul>}
          {onOpenEmergency && <button type="button" className="lg-button" onClick={onOpenEmergency}>Review emergency</button>}
        </div>
      )}
    </header>
  )
}
