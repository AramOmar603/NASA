import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { SRGBColorSpace, TextureLoader, Vector3 } from 'three'
import moonMap from './assets/moon-lroc.jpg'

const approachDuration = 3600

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
    const altitude = (start - 1) * (.055 / (start - 1)) ** eased
    const arc = .24 * (1 - eased)
    camera.position.set(Math.sin(arc) * (1 + altitude), .28 * (1 - eased), Math.cos(arc) * (1 + altitude))
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
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  )
}

export function MoonArrival({ onApproach, onArrival }: { onApproach: () => void; onArrival: () => void }) {
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

  return (
    <section className="moon-arrival" data-approaching={approaching} aria-label="Moon approach">
      <div className="moon-arrival-scene">
        <Canvas camera={{ position: [0, 0, 4], fov: 42 }} fallback={
          <div className="moon-arrival-fallback" aria-label="Full Moon" role="img"><span /></div>
        }>
          <ambientLight intensity={.45} />
          <directionalLight position={[-3, 2, 4]} intensity={3.4} />
          <ApproachCamera startedAt={startedAt} />
          <MoonSurface />
          <mesh position={[0, 0, 1.006]}>
            <ringGeometry args={[.025, .04, 32]} />
            <meshBasicMaterial color="#87ffe5" />
          </mesh>
        </Canvas>
      </div>
      <div className="moon-arrival-note">
        <h1>{approaching ? 'Descending toward the Moon base…' : 'Welcome to the Moon!'}</h1>
        {!approaching && <>
          <p>The bright ring marks your Moon base.</p>
          <button autoFocus type="button" onClick={startApproach}>Zoom to the Habitat</button>
        </>}
      </div>
    </section>
  )
}
