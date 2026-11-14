import { useState } from 'react'
import type { TrainingLevel } from './rookie-training/session'
import { WelcomeScreen } from './mission-feedback/WelcomeScreen'
import { BaseTour } from './mission-feedback/BaseTour'
import { HabitatArrival } from './mission-feedback/HabitatArrival'
import { MoonArrival } from './mission-feedback/MoonArrival'
import { MissionFeedback } from './mission-feedback/MissionFeedback'

export function App() {
  const [level, setLevel] = useState<TrainingLevel>(1)
  const [entry, setEntry] = useState<'orbit' | 'approach' | 'habitat' | 'base'>('orbit')
  const [startInsideHome, setStartInsideHome] = useState(true)
  const [tourOpen, setTourOpen] = useState(false)
  const [commanderWon, setCommanderWon] = useState(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem('lamoon-ultimate-commander') === 'complete' }
    catch { return false }
  })
  const [attempt, setAttempt] = useState(0)

  function launchMission(next: TrainingLevel) {
    setTourOpen(false)
    setStartInsideHome(true)
    setEntry('orbit')
    setLevel(next)
    setAttempt(previous => previous + 1)
  }

  function goHome() {
    setTourOpen(false)
    setAttempt(0)
    setEntry('orbit')
    setLevel(1)
  }

  const nextLevel = level < 5 ? () => launchMission((level + 1) as TrainingLevel) : undefined

  if (attempt > 0 && level === 1) {
    return <>
      {(entry === 'approach' || entry === 'base') && (
        <div hidden={tourOpen} inert={entry === 'approach'}>
          <MissionFeedback key={attempt} trainingLevel={1} startAtHabitat spawnInsideHabitat={startInsideHome || attempt > 1}
            onHome={goHome} onNextLevel={nextLevel}
            onReplayIntro={() => setTourOpen(true)}
            onRestart={() => setAttempt((previous) => previous + 1)} />
        </div>
      )}
      {!tourOpen && (entry === 'orbit' || entry === 'approach') && (
        <MoonArrival onApproach={() => setEntry('approach')} onArrival={() => setEntry('base')} />
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
          <MissionFeedback key={attempt} trainingLevel={level} startAtHabitat showBaseOverview={entry === 'base'}
            onComplete={level === 5 ? () => {
              setCommanderWon(true)
              try { window.localStorage.setItem('lamoon-ultimate-commander', 'complete') } catch { /* Keep the medal in this session. */ }
            } : undefined}
            onHome={goHome} onNextLevel={nextLevel}
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

  return <WelcomeScreen
    onExplore={() => launchMission(1)}
    onSkip={() => { setEntry('base'); setAttempt(1) }}
    onLevelTwo={() => launchMission(2)}
    onLevelThree={() => launchMission(3)}
    onLevelFour={() => launchMission(4)}
    commanderWon={commanderWon} onLevelFive={() => launchMission(5)} />
}
