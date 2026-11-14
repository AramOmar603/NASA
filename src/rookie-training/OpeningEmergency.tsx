import { useState } from 'react'
import type { SurvivalSession } from '../components/dashboard/survivalController'
import { emergencyLoads, openingBudget, openingRepairKits, powerLevels, powerPlan, recoveryTargets, reconnectOpening, repairOpening, runOpeningShift, shifts, startOpeningEmergency, startingSettings, warmthTarget } from './openingEmergencyModel'
import './openingEmergency.css'

const systems = {
  lifeSupport: ['🌡️', 'Cabin heat'],
  oxygenPlant: ['🫧', 'Oxygen'],
  recycler: ['💧', 'Water'],
  greenhouse: ['🌱', 'Food'],
} as const

function ReserveMeter({ label, value, target, capacity = target * 2 }: { label: string; value: number; target: number; capacity?: number }) {
  const ready = value >= target
  return <div className="opening-meter" data-ready={ready}>
    <span className="opening-meter-track" aria-hidden="true">
      <span style={{ width: `${Math.min(100, Math.max(0, value / capacity * 100))}%` }} />
    </span>
    <small>{label} · {ready ? 'Safe' : 'Low'}</small>
  </div>
}

export function OpeningEmergency({ session, onComplete, onHome, onSkip }: {
  session: SurvivalSession
  onComplete: (session: SurvivalSession) => void
  onHome?: () => void
  onSkip?: () => void
}) {
  const [emergency, setEmergency] = useState(() => startOpeningEmergency(session))
  const [settings, setSettings] = useState(startingSettings)
  const { shift, status, feedback } = emergency
  const plan = powerPlan(settings)
  const { battery, solar } = openingBudget(emergency)
  const budget = battery + solar
  const remaining = budget - Object.values(plan).reduce((sum, value) => sum + value, 0)
  const preview = status === 'active' && remaining >= 0 ? runOpeningShift(emergency, plan) : undefined
  const { oxygenKg, waterL, foodKg } = (preview ?? emergency).session.state.resources
  const reserves = {
    lifeSupport: [preview?.warmth ?? emergency.warmth, warmthTarget],
    oxygenPlant: [oxygenKg, recoveryTargets.oxygenKg],
    recycler: [waterL, recoveryTargets.waterL],
    greenhouse: [foodKg, recoveryTargets.foodKg],
  } as const
  const repairKits = openingRepairKits(emergency.session)

  return <section className="repair-card opening-emergency" role="dialog" aria-modal="true" aria-labelledby="opening-emergency-title">
    <header className="opening-heading">
      <span className="opening-beacon" aria-hidden="true">🚨</span>
      <div>
        <p>LEVEL 4 · LUNAR DISASTER</p>
        <h2 id="opening-emergency-title">Critical Moon Base Systems Failure</h2>
      </div>
    </header>
    {status === 'active' && <>
      <p>Solar panels are damaged and the water pump is slow. Share power to keep the crew safe through both shifts.</p>
      <div className="opening-budget" data-over={remaining < 0}>
        <strong>{shift === 0 ? '☀️' : '🌘'} {shift + 1} of {shifts.length} · {shifts[shift]}</strong>
        <ReserveMeter label={remaining < 0 ? 'Over budget' : 'Power left'} value={remaining} target={recoveryTargets.batteryKWh} capacity={budget} />
      </div>
      {feedback && <p role="status" className="opening-feedback">{feedback}</p>}
      <small className="opening-targets">{preview ? 'Preview after this shift · Aim for green, including the battery.' : 'Lower power on a system to see your preview.'}</small>
      <div className="opening-loads">
        {emergencyLoads.map(load => {
          const [icon, label] = systems[load]
          const [value, target] = reserves[load]
          return <fieldset key={load}>
            <legend>{icon} {label}</legend>
            <div className="opening-options">
              {powerLevels.map(level => <button key={level} type="button" aria-pressed={settings[load] === level}
                onClick={() => setSettings({ ...settings, [load]: level })}>{level}</button>)}
            </div>
            {preview && <ReserveMeter label={load === 'lifeSupport' ? 'Warmth' : label} value={value} target={target} />}
          </fieldset>
        })}
      </div>
      {repairKits > 0 && <div className="opening-repairs">
        <strong>🧰 One repair kit</strong>
        <button type="button" onClick={() => setEmergency(current => repairOpening(current, 'solar'))}>☀️ Fix solar for more power</button>
        <button type="button" onClick={() => setEmergency(current => repairOpening(current, 'recycler'))}>💧 Fix pump for more water</button>
      </div>}
      <button className="opening-primary" type="button" autoFocus disabled={!preview} onClick={() => preview && setEmergency(preview)}>
        {shift === 0 ? 'Run first shift →' : 'Run final shift →'}
      </button>
    </>}
    {status === 'success' && <div role="status" className="opening-result">
      <h3>⭐ Base stabilized!</h3>
      <p>Main stores reconnected! Your supplies and equipment condition carry into the mission.</p>
      <button className="opening-primary" type="button" autoFocus onClick={() => onComplete(reconnectOpening(session, emergency))}>Continue mission →</button>
    </div>}
    {status === 'failure' && <div className="opening-result">
      <h3>Try a new power plan</h3>
      <p role="alert">{feedback}</p>
      <button className="opening-primary" type="button" autoFocus onClick={() => {
        setEmergency(startOpeningEmergency(session))
        setSettings(startingSettings)
      }}>Retry emergency</button>
    </div>}
    {(onHome || onSkip) && <footer>
      {onHome && <button type="button" onClick={onHome}>🏠 Home</button>}
      {onSkip && <button type="button" onClick={onSkip}>⏭️ Skip Level</button>}
    </footer>}
  </section>
}
