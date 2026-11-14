import { useState } from 'react'
import type { TrainingLevel } from './rookie-training/session'
import { BaseTour } from './mission-feedback/BaseTour'
import { HabitatArrival } from './mission-feedback/HabitatArrival'
import { OutpostLanding } from './mission-feedback/OutpostLanding'
import { MoonArrival } from './mission-feedback/MoonArrival'
import { MissionFeedback } from './mission-feedback/MissionFeedback'

export function App() {
  const [level, setLevel] = useState<TrainingLevel>(1)
  const [entry, setEntry] = useState<'orbit' | 'approach' | 'habitat' | 'base'>('orbit')
  const [landing, setLanding] = useState<'waiting' | 'descending' | 'arriving' | 'done'>('waiting')
  const [tourOpen, setTourOpen] = useState(false)
  const [attempt, setAttempt] = useState(0)

  if (attempt > 0 && level === 1) {
    return <>
      {(landing === 'arriving' || landing === 'done') && (
        <div hidden={tourOpen} inert={landing !== 'done'}>
          <MissionFeedback key={attempt} trainingLevel={1} startAtHabitat spawnInsideHabitat
            onReplayIntro={() => setTourOpen(true)}
            onRestart={() => setAttempt((previous) => previous + 1)} />
        </div>
      )}
      {(entry === 'approach' || landing === 'descending' || landing === 'arriving') && (
        <OutpostLanding descending={landing === 'descending'} arriving={landing === 'arriving'} onTouchdown={() => setLanding('arriving')}
          onFinish={() => setLanding('done')} />
      )}
      {entry !== 'base' && <MoonArrival
        onApproach={() => setEntry('approach')}
        onArrival={() => {
          setEntry('base')
          setLanding(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'done' : 'descending')
        }} />}
      {tourOpen && <BaseTour onFinish={() => setTourOpen(false)} />}
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
          <button type="button" onClick={() => setAttempt(1)}>Start Mission</button>
          <button type="button" onClick={() => { setLevel(2); setAttempt(1) }}>Level 2 · First Emergency</button>
        </div>
      </section>
    </main>
  )
}
