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
  const [introSkipped, setIntroSkipped] = useState(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem('lamoon-intro-skipped') === 'true' }
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

  function skipIntro() {
    setIntroSkipped(true)
    try { window.localStorage.setItem('lamoon-intro-skipped', 'true') } catch { /* The current launch still skips the tour. */ }
    setTourOpen(false)
    setStartInsideHome(true)
    setLevel(1)
    setEntry('base')
    setAttempt(1)
  }

  function recordCompletion() {
    if (level === 5) setCommanderWon(true)
    try {
      window.localStorage.setItem(`lamoon-level-${level}-complete`, 'true')
      if (level === 5) window.localStorage.setItem('lamoon-ultimate-commander', 'complete')
    } catch { /* The mission result is still available. */ }
  }

  function goHome() {
    setTourOpen(false)
    setAttempt(0)
    setEntry('orbit')
    setLevel(1)
  }

  const nextLevel = level < 5 ? () => launchMission((level + 1) as TrainingLevel) : undefined

  function skipLevel() {
    try { window.localStorage.setItem(`lamoon-level-${level}-skipped`, 'true') } catch { /* Navigation still works without storage. */ }
    if (level === 5) {
      goHome()
      return
    }
    launchMission((level + 1) as TrainingLevel)
    setEntry('base')
  }

  if (attempt > 0 && level === 1) {
    return <>
      {(entry === 'approach' || entry === 'base') && (
        <div hidden={tourOpen} inert={entry === 'approach'}>
          <MissionFeedback key={attempt} trainingLevel={1} startAtHabitat spawnInsideHabitat={startInsideHome || attempt > 1}
            onHome={goHome} onSkipLevel={skipLevel} onNextLevel={nextLevel} onComplete={recordCompletion}
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
            onHome={goHome} onSkipLevel={skipLevel} onNextLevel={nextLevel} onComplete={recordCompletion}
            onRestart={() => setAttempt((previous) => previous + 1)} />
        </div>
      )}
      {(entry === 'orbit' || entry === 'approach') && (
        <MoonArrival onApproach={() => setEntry('approach')} onArrival={() => setEntry(level === 4 ? 'base' : 'habitat')} />
      )}
      {level !== 4 && (entry === 'approach' || entry === 'habitat') && (
        <HabitatArrival onHome={goHome} active={entry === 'habitat'} onBegin={() => setEntry('base')} />
      )}
    </>
  }

  return <WelcomeScreen
    onExplore={() => launchMission(1)}
    onSkip={skipIntro} introSkipped={introSkipped}
    onLevelTwo={() => launchMission(2)}
    onLevelThree={() => launchMission(3)}
    onLevelFour={() => launchMission(4)}
    commanderWon={commanderWon} onLevelFive={() => launchMission(5)} />
}
