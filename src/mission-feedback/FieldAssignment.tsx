import { useState } from 'react'
import type { SurvivalSession } from '../components/dashboard/survivalController'
import { departmentReadings } from './DepartmentInfo'
import type { fieldAssignment } from './fieldAssignments'

type Assignment = NonNullable<ReturnType<typeof fieldAssignment>>

export function FieldAssignment({ task, session, onComplete }: {
  task: Assignment
  session: SurvivalSession
  onComplete: () => void
}) {
  const [wrong, setWrong] = useState(false)
  const crew = session.state.crew.filter(member => member.health > 0).length
  const readings = departmentReadings(task.building, session)
  const isBattery = task.building === 'PWR-01'
  const isRover = task.building === 'ROV-01'
  const charge = session.state.resources.batteryKWh
  const kits = session.state.resources.spareKits
  const chargeText = (value: number) => `${Number(value.toFixed(1))} kWh`
  const labels = task.building === 'HAB-01'
    ? [crew, crew === 4 ? 3 : 4, crew === 0 ? 1 : 0].map(count => `${count} astronauts`)
    : isBattery ? [charge, charge + 5, charge + 10].map(chargeText)
      : isRover ? [kits, kits + 1, kits + 2].map(count => `${count} kits`)
        : task.choices
  const choices = labels.map((label, index) => ({ label, index }))
  const offset = session.state.tick % choices.length
  return <section className="field-report" aria-label="Field assignment">
    <h3>⭐ {task.title}</h3>
    <p>{isBattery ? 'Mission Control needs the current battery reserve. How much energy is available?' : isRover ? 'How many repair kits does the base have for the outing?' : task.prompt}</p>
    <dl>{readings.map(([label, value]) =>
      <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <div className="field-choices">
      {[...choices.slice(offset), ...choices.slice(0, offset)].map(({ label, index }) =>
        <button key={label} type="button" onClick={() => index === 0 ? onComplete() : setWrong(true)}>{label}</button>)}
    </div>
    {wrong && <p role="status">💡 {task.hint} Try another reading.</p>}
  </section>
}
