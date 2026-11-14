import { OxygenReserve } from '../components/dashboard/OxygenReserve'
import { useState } from 'react'
import type { SurvivalSession } from '../components/dashboard/survivalController'
import { planningOptions } from './commander'

export function CommanderPlanning({ session, onComplete, onHome, onSkipLevel, skipLevelLabel }: { session: SurvivalSession; onComplete: () => void; onHome?: () => void; onSkipLevel?: () => void; skipLevelLabel?: string }) {
  const { weakestSupply, priority, days } = planningOptions(session)
  const [choice, setChoice] = useState<keyof typeof days | 'wait'>()
  const [tested, setTested] = useState(false)
  const accepted = (choice === 'power' || choice === weakestSupply) && days[choice] <= days[priority]
  const { oxygenKg, waterL, foodKg, batteryKWh } = session.state.resources
  return <section className="repair-card" aria-label="Commander Decision">
    <div className="repair-card-page">
      <h2>🧠 Commander Decision!</h2>
      <p>Which reserve would run out first if the base stopped making supplies?</p>
      <ul>
        <li>🫧 Oxygen Left: <OxygenReserve stored={oxygenKg} capacity={session.config.oxygenCapacityKg} compact /></li>
        <li>Water: {waterL.toFixed(1)} L</li>
        <li>Food: {foodKg.toFixed(1)} kg</li>
        <li>Electricity: {batteryKWh.toFixed(1)} kWh</li>
      </ul>
      <p>At current demand, the battery covers about {days.power.toFixed(1)} days. The shortest crew supply is {weakestSupply} at {days[weakestSupply].toFixed(1)} days. This practice decision leaves supplies unchanged.</p>
      {tested ? <>
        <p role="status">{accepted ? 'Good plan! You picked the reserve with the least time left.'
          : `Protect ${priority} first. It has the least time left if production stops.`}</p>
        <button type="button" onClick={accepted ? onComplete : () => { setChoice(undefined); setTested(false) }}>{accepted ? 'Continue →' : 'Try again'}</button>
      </> : <>
        <div className="repair-choices" role="group" aria-label="Resource priority">
          <button type="button" aria-pressed={choice === 'power'} onClick={() => setChoice('power')}>⚡ Protect electricity</button>
          <button type="button" aria-pressed={choice === weakestSupply} onClick={() => setChoice(weakestSupply)}>🧑‍🚀 Protect {weakestSupply}</button>
          <button type="button" aria-pressed={choice === 'wait'} onClick={() => setChoice('wait')}>⏳ Wait and check tomorrow</button>
        </div>
        <button type="button" disabled={!choice} onClick={() => setTested(true)}>Check my plan</button>
      </>}
      <div className="field-choices">
        {onSkipLevel && <button type="button" onClick={onSkipLevel}>{skipLevelLabel}</button>}
        {onHome && <button type="button" onClick={onHome}>🏠 Home</button>}
      </div>
    </div>
  </section>
}
