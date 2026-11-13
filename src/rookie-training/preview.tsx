import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MissionFeedback } from '../mission-feedback/MissionFeedback'

function RookiePreview() {
  const [attempt, setAttempt] = useState(0)
  const [completed, setCompleted] = useState(false)
  return <div data-rookie-completed={completed}>
    <MissionFeedback key={attempt} rookie onComplete={() => setCompleted(true)}
      onRestart={() => setAttempt((previous) => previous + 1)} />
  </div>
}

createRoot(document.getElementById('root')!).render(<RookiePreview />)
