import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { LunarBase } from '../scene/buildings'
import { LunarEnvironment } from '../scene/environment'
import moonMap from './assets/moon-lroc.jpg'
import './welcome.css'

function WelcomeCamera() {
  const { camera, size, invalidate } = useThree()
  const elapsed = useRef(0)
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    invalidate()
  }, [invalidate])

  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, .05)
    const scale = Math.max(1, size.height / Math.max(1, size.width))
    const sway = reducedMotion.current ? 0 : Math.sin(elapsed.current * .23) * 10
    camera.position.set((41 + sway) * scale, 46 * scale, 96 * scale)
    camera.lookAt(0, 2, 0)
    if (!reducedMotion.current) invalidate()
  })
  return null
}

export function WelcomeScreen({ onExplore, onSkip, onLevelTwo, onLevelThree, onLevelFour }: {
  onExplore: () => void
  onSkip: () => void
  onLevelTwo: () => void
  onLevelThree: () => void
  onLevelFour: () => void
}) {
  return (
    <main className="launch-welcome">
      <div className="launch-art" aria-hidden="true" style={{ backgroundImage: `url(${moonMap})` }}>
        <LunarEnvironment className="launch-world" interactive={false} fallback={null}>
          <WelcomeCamera />
          <LunarBase showMarkers={false} />
        </LunarEnvironment>
      </div>
      <section className="launch-card" aria-labelledby="welcome-title">
        <p className="launch-level">Level 1 · Rookie Astronaut</p>
        <h1 id="welcome-title">LAMOON</h1>
        <p>Keep four astronauts safe for seven Moon days.</p>
        <div className="launch-actions">
          <button className="launch-primary" type="button" onClick={onExplore}>🚀 EXPLORE THE MOON BASE!</button>
          <button type="button" onClick={onSkip}>Skip Tour &amp; Start Playing</button>
          <button type="button" onClick={onLevelTwo}>Level 2 · First Emergency</button>
          <button type="button" onClick={onLevelThree}>Level 3 · Mission Breakdown</button>
          <button type="button" onClick={onLevelFour}>Level 4 · Lunar Disaster</button>
        </div>
      </section>
    </main>
  )
}
