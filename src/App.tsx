import { useState } from 'react'
import type { TrainingLevel } from './rookie-training/session'
import { MissionFeedback } from './mission-feedback/MissionFeedback'

export function App() {
  const [level, setLevel] = useState<TrainingLevel>(1)
  const [attempt, setAttempt] = useState(0)

  if (attempt > 0) {
    return <MissionFeedback key={attempt} trainingLevel={level} onRestart={() => setAttempt((previous) => previous + 1)} />
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
