import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { SRGBColorSpace, TextureLoader, Vector3 } from 'three'
import moonMap from './assets/moon-lroc.jpg'

const approachDuration = 4200

function ApproachCamera({ startedAt }: { startedAt?: number }) {
  const { camera, size } = useThree()
  const target = useRef(new Vector3())

  useFrame(() => {
    if (!size.width || !size.height) return
    const halfFov = 21 * Math.PI / 180
    const limitingAngle = Math.min(halfFov, Math.atan(Math.tan(halfFov) * size.width / size.height))
    const start = 1.16 / Math.sin(limitingAngle)
    const progress = startedAt === undefined ? 0 : Math.min(1, (performance.now() - startedAt) / approachDuration)
    const eased = progress ** 3 * (10 - 15 * progress + 6 * progress ** 2)
    const altitude = (start - 1) * (.045 / (start - 1)) ** eased
    const bearing = .24 * (1 - eased)
    const elevation = .16 * (1 - eased)
    const horizontal = (1 + altitude) * Math.cos(elevation)
    camera.position.set(Math.sin(bearing) * horizontal, (1 + altitude) * Math.sin(elevation), Math.cos(bearing) * horizontal)
    camera.lookAt(target.current.set(0, 0, eased))
  })
  return null
}

// Color mosaic from NASA SVS CGI Moon Kit (https://svs.gsfc.nasa.gov/4720/).
function MoonSurface() {
  const texture = useLoader(TextureLoader, moonMap)
  texture.colorSpace = SRGBColorSpace
  return (
    <mesh rotation={[0, -.5, 0]}>
      <sphereGeometry args={[1, 64, 48]} />
      <meshStandardMaterial map={texture} bumpMap={texture} bumpScale={.003} roughness={1} />
    </mesh>
  )
}

export function MoonArrival({ autoApproach = false, onApproach, onArrival }: {
  autoApproach?: boolean
  onApproach: () => void
  onArrival: () => void
}) {
  const [startedAt, setStartedAt] = useState<number>()
  const approaching = startedAt !== undefined
  const arrival = useRef(onArrival)
  useEffect(() => { arrival.current = onArrival }, [onArrival])
  useEffect(() => {
    if (!approaching) return
    const timeout = window.setTimeout(() => arrival.current(), approachDuration)
    return () => window.clearTimeout(timeout)
  }, [approaching])

  function startApproach() {
    onApproach()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) onArrival()
    else setStartedAt(performance.now())
  }

  const beginAutomaticApproach = useEffectEvent(startApproach)
  useEffect(() => {
    if (!autoApproach) return
    // Hold on the full Moon before starting the existing descent.
    const timer = window.setTimeout(() => beginAutomaticApproach(), 1000)
    return () => window.clearTimeout(timer)
  }, [autoApproach])

  return (
    <section className="moon-arrival" data-approaching={approaching} aria-label="Moon approach">
      <div className="moon-arrival-scene">
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4], fov: 42 }} fallback={
          <div className="moon-arrival-fallback" aria-label="Full Moon" role="img"><span /></div>
        }>
          <ambientLight intensity={.45} />
          <directionalLight position={[-3, 2, 5]} intensity={2.7} />
          <ApproachCamera startedAt={startedAt} />
          <MoonSurface />
          <mesh position={[0, 0, 1.006]}>
            <ringGeometry args={[.025, .04, 32]} />
            <meshBasicMaterial color="#87ffe5" />
          </mesh>
        </Canvas>
      </div>
      <div className="moon-arrival-note">
        <p className="mission-wordmark">🌙 LAMOON</p>
        <h1 role={autoApproach ? 'status' : undefined}>{approaching ? 'Descending toward the Moon base…' : 'Welcome to the Moon!'}</h1>
        {!approaching && <>
          <p>The bright ring marks your Moon base.</p>
          {!autoApproach && <button autoFocus type="button" onClick={startApproach}>Zoom to the Home Center</button>}
        </>}
      </div>
    </section>
  )
}
