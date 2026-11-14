import type { SurvivalSession } from '../components/dashboard/survivalController'
import { departments, type DepartmentId } from './departments'

export function departmentReadings(id: DepartmentId, { state, flows, config }: SurvivalSession): [string, string][] {
  const { resources, powerDeliveredKWh } = state
  const reading = (value: number | undefined, unit: string) =>
    value === undefined ? 'After day 1' : `${Number(value.toFixed(1))} ${unit}`
  const power = (value: number) => reading(state.tick ? value : undefined, 'kWh')
  const crew = `${state.crew.filter(({ health }) => health > 0).length} / ${state.crew.length}`
  const dose = Math.max(0, ...state.crew.map(({ doseMilliSv }) => doseMilliSv))

  switch (id) {
    case 'HAB-01': return [['Crew safe', crew], ['Oxygen stored', reading(resources.oxygenKg, 'kg')], ['Life support power', power(powerDeliveredKWh.lifeSupport)]]
    case 'BIO-01': return [['Food grown last day', reading(flows?.food.production, 'kg')], ['Food stored', reading(resources.foodKg, 'kg')], ['Greenhouse power', power(powerDeliveredKWh.greenhouse)]]
    case 'OXY-01': return [['Oxygen made last day', reading(flows?.oxygen.production, 'kg')], ['Oxygen stored', reading(resources.oxygenKg, 'kg')], ['Generator power', power(powerDeliveredKWh.oxygenPlant)]]
    case 'SOL-01': return [['Power made last day', reading(flows?.power.production, 'kWh')], ['Battery reserve', reading(resources.batteryKWh, 'kWh')], ['Array condition', `${Math.round(state.condition.solar * 100)}%`]]
    case 'WTR-01': return [['Water cleaned last day', reading(flows?.water.production, 'L')], ['Water stored', reading(resources.waterL, 'L')], ['Recycler power', power(powerDeliveredKWh.recycler)]]
    case 'PWR-01': return [['Battery reserve', reading(resources.batteryKWh, 'kWh')], ['Battery capacity', reading(config.batteryCapacityKWh, 'kWh')], ['Power used last day', reading(flows?.power.consumption, 'kWh')]]
    case 'SHD-01': return [['Highest crew exposure', reading(dose, 'mSv')], ['Crew safe', crew], ['Shelter condition', `${Math.round(state.condition.shielding * 100)}%`]]
    // The engine tracks mission supplies but does not model the rover's condition.
    case 'ROV-01': return [['Mission day', `${state.tick} / ${config.missionDays}`], ['Crew safe', crew], ['Base repair kits', String(resources.spareKits)]]
  }
}

export function DepartmentInfo({ id, session, greenhouseFault }: { id: DepartmentId; session: SurvivalSession; greenhouseFault?: boolean }) {
  const department = departments[id]
  const condition = 'equipment' in department ? session.state.condition[department.equipment] : undefined
  const offline = condition !== undefined && condition <= session.config.failureThreshold
  const damaged = greenhouseFault ?? (condition !== undefined && condition < 1)
  const status = offline ? 'Offline' : damaged ? 'Damaged' : condition !== undefined ? 'Working'
    : id === 'ROV-01' ? 'Rover condition is not tracked' : id === 'PWR-01' ? 'Battery status' : 'Crew status'

  return <div className="department-info">
    <div className="department-info-heading">
      <h2><span className="mission-icon" aria-hidden="true">{department.icon}</span> {department.name}</h2>
      <span className="department-badge" data-damaged={damaged}>{status}</span>
    </div>
    <p>{department.lesson}</p>
    <dl className="department-stats">
      {departmentReadings(id, session).map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  </div>
}
