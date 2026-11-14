import type { ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'
import type { Building, BuildingId, BuildingKind, GameViewProps } from '../../types'
import './game-interface.css'

type Metric = 'crewHealth' | 'lifeSupport' | 'livingConditions' | 'generation' | 'battery' |
  'production' | 'crops' | 'efficiency' | 'equipment' | 'radiationRisk' |
  'readiness' | 'protection' | 'condition'
type Allocation = 'power' | 'water'

export interface BuildingTelemetry {
  readonly readings?: Readonly<Partial<Record<Metric, string>>>
  readonly allocations?: Readonly<Partial<Record<Allocation, number>>>
  readonly canRepair?: boolean
  readonly condition?: string
  readonly repairUnavailableReason?: string
}

export type BuildingAction =
  | { readonly type: 'repair'; readonly buildingId: BuildingId }
  | { readonly type: 'allocate'; readonly buildingId: BuildingId; readonly resource: Allocation; readonly percent: number }

interface PanelDefinition {
  readonly name: string
  readonly symbol: string
  readonly metrics: readonly (readonly [Metric, string])[]
  readonly reserve?: { readonly id: 'food' | 'water' | 'oxygen'; readonly unit: string }
  readonly allocation?: Allocation
  readonly repair?: boolean
}

const panels = {
  habitat: { name: 'Home Center', symbol: '⌂', metrics: [['crewHealth', 'Crew health'], ['lifeSupport', 'Life support'], ['livingConditions', 'Living conditions']] },
  'solar-array': { name: 'Solar array', symbol: '☉', metrics: [['generation', 'Electricity generation'], ['battery', 'Battery level']], allocation: 'power', repair: true },
  greenhouse: { name: 'Greenhouse', symbol: '✳', metrics: [['production', 'Food production'], ['crops', 'Crop status']], reserve: { id: 'food', unit: 'rations' }, allocation: 'water' },
  'water-recycler': { name: 'Water recycler', symbol: '≈', metrics: [['efficiency', 'Recycling efficiency'], ['condition', 'System condition']], reserve: { id: 'water', unit: 'L' } },
  'oxygen-production': { name: 'Oxygen production', symbol: 'O₂', metrics: [['generation', 'Oxygen generation'], ['equipment', 'Equipment status']], reserve: { id: 'oxygen', unit: 'kg' } },
  'radiation-shelter': { name: 'Radiation shelter', symbol: '☢', metrics: [['radiationRisk', 'Radiation risk'], ['readiness', 'Shelter readiness'], ['protection', 'Crew protection']] },
} satisfies Record<string, PanelDefinition>

export type BuildingPanelKind = keyof typeof panels

const fallbackPanel: PanelDefinition = { name: 'Building', symbol: '◇', metrics: [] }

export function resolveBuildingPanelKind(kind: BuildingKind): BuildingPanelKind | undefined {
  const key = kind.trim().toLowerCase().replace(/[\s_]+/g, '-')
  if (key === 'oxygen-generator') return 'oxygen-production'
  return Object.hasOwn(panels, key) ? key as BuildingPanelKind : undefined
}

export interface BuildingPanelProps extends GameViewProps {
  readonly selectedBuildingId?: BuildingId
  readonly buildings?: readonly Building[]
  readonly telemetry?: Readonly<Partial<Record<BuildingId, BuildingTelemetry>>>
  readonly onAction?: (action: BuildingAction) => void
  readonly onClose: () => void
  readonly foodUnit?: string
  readonly children?: ReactNode
}

export function BuildingPanel({ state, buildings = state.buildings, selectedBuildingId, telemetry, onAction, onClose, foodUnit = 'rations', children }: BuildingPanelProps) {
  const heading = useId()
  const close = useRef<HTMLButtonElement>(null)
  const building = buildings.find(({ id }) => id === selectedBuildingId)
  const activeId = building?.id

  useEffect(() => {
    if (activeId !== undefined) close.current?.focus({ preventScroll: true })
  }, [activeId])

  useEffect(() => {
    if (activeId === undefined) return
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog:modal')) return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [activeId, onClose])

  if (!building) return null
  const { id, kind, position } = building
  const panelKind = resolveBuildingPanelKind(kind)
  const panel: PanelDefinition = panelKind ? panels[panelKind] : fallbackPanel
  const data = telemetry?.[id]
  const allocation = panel.allocation
  const percent = allocation && data?.allocations?.[allocation]
  const reserve = panel.reserve && state.resources[panel.reserve.id]

  return (
    <aside className="lg-building" aria-labelledby={heading}>
      <div className="lg-panel-inner" key={id}>
        <header className="lg-panel-header">
          <span className="lg-symbol" aria-hidden="true">{panel.symbol}</span>
          <button ref={close} type="button" className="lg-button lg-close" aria-label="Close building panel" onClick={onClose}>×</button>
        </header>
        <p className="lg-kicker">{id} · GRID {position.x}, {position.y}</p>
        <h2 id={heading}>{panelKind ? panel.name : kind}</h2>
        <dl className="lg-readings">
          {panel.metrics.map(([key, label]) => (
            <div key={key}><dt>{label}</dt><dd>{data?.readings?.[key] ?? 'Unavailable'}</dd></div>
          ))}
          {panel.reserve && <div><dt>Base {panel.reserve.id} reserves</dt><dd>{reserve === undefined ? 'Unavailable' : `${Number(reserve.toFixed(2))} ${panel.reserve.id === 'food' ? foodUnit : panel.reserve.unit}`}</dd></div>}
          {data?.condition && <div><dt>Equipment condition</dt><dd>{data.condition}</dd></div>}
        </dl>
        {allocation && typeof percent === 'number' && onAction && (
          <label className="lg-allocation">
            <span>{allocation === 'power' ? 'Power allocation' : 'Water allocation'} <output>{percent}%</output></span>
            <input aria-label={`${allocation === 'power' ? 'Power' : 'Water'} allocation`} type="range" min={0} max={100} step={1} value={percent}
              onChange={(event) => onAction({ type: 'allocate', buildingId: id, resource: allocation, percent: event.currentTarget.valueAsNumber })} />
          </label>
        )}
        {(panel.repair || data?.condition) && onAction && data?.canRepair !== undefined && (
          <button type="button" className="lg-button" disabled={!data.canRepair} onClick={() => onAction({ type: 'repair', buildingId: id })}>Repair {panel.name.toLowerCase()}</button>
        )}
        {data?.repairUnavailableReason && <p>{data.repairUnavailableReason}</p>}
        {children}
      </div>
    </aside>
  )
}
