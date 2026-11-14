import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { LunarBase, outpost } from '../scene/buildings'
import { BASE_ELEVATION, LunarEnvironment } from '../scene/environment'
import { HabitatInterior } from './HabitatArrival'
import './base-tour.css'

const buildingStops = [
  { id: 'HAB-01', icon: '🏠', title: 'Home Center', note: 'This is where astronauts live!', color: '#71efe3', side: 'top-left' },
  { id: 'OXY-01', icon: 'O₂', title: 'Oxygen Generator', note: 'This machine makes oxygen to breathe!', color: '#93cbff', side: 'right' },
  { id: 'SOL-01', icon: '☀️', title: 'Solar Panels', note: 'Sunlight helps power our base!', color: '#ffe083', side: 'top-right' },
  { id: 'WTR-01', icon: '💧', title: 'Water Recycler', note: 'We recycle water so we don’t waste it!', color: '#84eaf6', side: 'left' },
  { id: 'BIO-01', icon: '🌱', title: 'Greenhouse', note: 'We grow food for our astronauts!', color: '#b7ec90', side: 'top-center' },
  { id: 'PWR-01', icon: '🔋', title: 'Battery Station', note: 'Batteries save power for later!', color: '#d7b8ff', side: 'right' },
  { id: 'SHD-01', icon: '🛡️', title: 'Safety Shelter', note: 'This room helps keep astronauts safe during space storms!', color: '#ffc187', side: 'left' },
  { id: 'ROV-01', icon: '🚙', title: 'Lunar Rover', note: 'This vehicle helps us explore!', color: '#ffac9d', side: 'top-right' },
].map((stop) => ({ ...stop, building: outpost.find(({ id }) => id === stop.id)! }))

const intro = { icon: '🏠', title: 'Welcome, Commander!', note: 'This is your home on the Moon!', color: '#71efe3', side: 'top-left' }
const finale = { icon: '🚀', title: 'You’re ready, Commander!', note: 'Explore the base. Keep your astronauts safe!', color: '#b7ec90', side: 'top-center' }
const finalStep = buildingStops.length + 1
const travelMs = 950

function TourCamera({ step, reducedMotion }: { step: number; reducedMotion: boolean }) {
  const { camera, size, invalidate } = useThree()
  const firstFlight = useRef(true)
  const target = useRef(new Vector3(0, BASE_ELEVATION + 2, 0))
  const flight = useRef<{
    start: number; from: Vector3; to: Vector3; fromTarget: Vector3; toTarget: Vector3
  } | null>(null)

  useEffect(() => {
    const stop = buildingStops[step - 1]
    const { x, y: z } = stop?.building.position ?? { x: 0, y: 0 }
    const wide = !stop || step === 1
    const portraitScale = wide ? Math.max(1, Math.min(2, size.height / Math.max(1, size.width))) : 1
    const toTarget = new Vector3(x, BASE_ELEVATION + 3, z)
    const to = toTarget.clone().add(wide
      ? new Vector3(45, 48, 93).multiplyScalar(portraitScale)
      : new Vector3(14, 20, 29))
    if (firstFlight.current && step === 1) {
      firstFlight.current = false
      camera.position.set(6, BASE_ELEVATION + 8, 17)
    }
    firstFlight.current = false
    flight.current = {
      start: performance.now(),
      from: camera.position.clone(),
      to,
      fromTarget: target.current.clone(),
      toTarget,
    }
    invalidate()
  }, [camera, invalidate, reducedMotion, size.height, size.width, step])

  useFrame(() => {
    const move = flight.current
    if (!move) return
    const progress = reducedMotion ? 1 : Math.min(1, (performance.now() - move.start) / travelMs)
    const eased = progress * progress * (3 - 2 * progress)
    camera.position.lerpVectors(move.from, move.to, eased)
    camera.lookAt(target.current.lerpVectors(move.fromTarget, move.toTarget, eased))
    if (progress === 1) flight.current = null
    else invalidate()
  })
  return null
}

export function BaseTour({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(-1)
  const [moving, setMoving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const reducedMotion = useRef(typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches).current
  const timers = useRef<number[]>([])
  const primary = useRef<HTMLButtonElement>(null)
  const stop = buildingStops[step - 1]
  const card = step < 0 ? { ...intro, icon: '🌕', title: 'Welcome to the Moon base!', note: 'Look around. Then meet your crew at home.' } : step === 0 ? intro : stop ?? finale

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), [])
  useEffect(() => { if (!moving) primary.current?.focus() }, [moving, step])

  function goTo(next: number) {
    if (moving) return
    if (reducedMotion) {
      setStep(next)
      return
    }
    setMoving(true)
    setLeaving(true)
    timers.current = [
      window.setTimeout(() => { setStep(next); setLeaving(false) }, 180),
      window.setTimeout(() => setMoving(false), 180 + travelMs),
    ]
  }

  return (
    <main className="base-tour" aria-label="Lunar base introduction">
      {step === 0 ? <div className="base-tour-reveal"><HabitatInterior /></div> : (
        <LunarEnvironment className="base-tour-world base-tour-reveal" interactive={false}>
          <TourCamera step={step} reducedMotion={reducedMotion} />
          <LunarBase showMarkers={false} />
          {stop && <mesh position={[stop.building.position.x, BASE_ELEVATION + .08, stop.building.position.y]}
            rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[8, 8.45, 48]} />
            <meshBasicMaterial color={stop.color} transparent opacity={.82} toneMapped={false} />
          </mesh>}
        </LunarEnvironment>
      )}
      <section className="base-tour-card" key={step} data-side={card.side} data-leaving={leaving}
        style={{ '--tour-accent': card.color } as CSSProperties} aria-labelledby="tour-title">
        <div role="status">
          <p className="base-tour-progress">Base tour · {step + 2} / {finalStep + 2}</p>
          <h1 id="tour-title"><span>{card.icon}</span> {card.title}</h1>
          <p>{card.note}</p>
        </div>
        <nav aria-label="Base tour controls">
          {step >= 0 && <button type="button" disabled={moving} onClick={() => goTo(step - 1)}>Back</button>}
          <button className="base-tour-primary" type="button" ref={primary} disabled={moving}
            onClick={() => step === finalStep ? onFinish() : goTo(step + 1)}>
            {step === finalStep ? 'Start Mission' : 'Next'}
          </button>
          <button type="button" onClick={onFinish}>Skip intro</button>
        </nav>
      </section>
    </main>
  )
}
