import { useState } from 'react'
import type { TrainingLevel } from './rookie-training/session'
import { BaseTour } from './mission-feedback/BaseTour'
import { HabitatArrival } from './mission-feedback/HabitatArrival'
import { MoonArrival } from './mission-feedback/MoonArrival'
import { MissionFeedback } from './mission-feedback/MissionFeedback'

export function App() {
  const [level, setLevel] = useState<TrainingLevel>(1)
  const [entry, setEntry] = useState<'orbit' | 'approach' | 'habitat' | 'base'>('orbit')
  const [tourOpen, setTourOpen] = useState(false)
  const [attempt, setAttempt] = useState(0)

  if (attempt > 0 && level === 1) {
    return <>
      {entry === 'base' && (
        <div hidden={tourOpen}>
          <MissionFeedback key={attempt} trainingLevel={1} startAtHabitat
            onReplayIntro={() => setTourOpen(true)}
            onRestart={() => setAttempt((previous) => previous + 1)} />
        </div>
      )}
      {tourOpen && <BaseTour onFinish={() => {
        setEntry('base')
        setTourOpen(false)
      }} />}
    </>
  }

  if (attempt > 0) {
    return <>
      {(entry === 'habitat' || entry === 'base') && (
        <div inert={entry === 'habitat'}>
          <MissionFeedback key={attempt} trainingLevel={level} startAtHabitat
            onRestart={() => setAttempt((previous) => previous + 1)} />
        </div>
      )}
      {(entry === 'orbit' || entry === 'approach') && (
        <MoonArrival onApproach={() => setEntry('approach')} onArrival={() => setEntry('habitat')} />
      )}
      {(entry === 'approach' || entry === 'habitat') && (
        <HabitatArrival active={entry === 'habitat'} onBegin={() => setEntry('base')} />
      )}
    </>
  }

  return (
    <main className="rookie-welcome">
      <section aria-labelledby="welcome-title">
        <p>Level 1 · Rookie Astronaut</p>
        <h1 id="welcome-title">LUNARIS</h1>
        <p>Keep four astronauts safe for seven Moon days.</p>
        <ul>
          <li>Tap a building icon to find out what it does.</li>
          <li>Advance one day and check your crew’s supplies.</li>
          <li>If something breaks, tap <strong>Check it</strong> to help.</li>
        </ul>
        <div className="rookie-start-actions">
          <button type="button" onClick={() => { setTourOpen(true); setAttempt(1) }}>Start Mission</button>
          <button type="button" onClick={() => { setLevel(2); setAttempt(1) }}>Level 2 · First Emergency</button>
        </div>
      </section>
    </main>
  )
}
