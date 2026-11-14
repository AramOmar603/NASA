import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'

export function HabitatArrival({ active, onBegin }: { active: boolean; onBegin: () => void }) {
  const [checked, setChecked] = useState(false)
  const action = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (active) action.current?.focus()
  }, [active, checked])

  return (
    <section className="habitat-arrival" inert={!active} aria-label="Inside the Habitat">
      <HabitatInterior checked={checked} onCheck={() => setChecked(true)} />
      <div className="habitat-arrival-note">
        <h1>Welcome home, astronaut!</h1>
        <p role="status">{checked
          ? 'This is your crew’s home. Head outside and advance one day to begin.'
          : 'You’re inside the Habitat. Check the glowing mission console to get started.'}</p>
        {checked
          ? <button key="outside" ref={action} type="button" onClick={onBegin}>Explore the Moon base</button>
          : <button key="console" ref={action} type="button" onClick={() => setChecked(true)}>Check mission console</button>}
      </div>
    </section>
  )
}

export function HabitatInterior({ checked = false, onCheck }: { checked?: boolean; onCheck?: () => void }) {
  return (
    <div className="habitat-arrival-scene" aria-hidden="true">
      <Canvas camera={{ position: [0, 1.55, 4.7], fov: 58 }} frameloop="demand"
        fallback={<div className="habitat-arrival-fallback"><span>◈</span></div>}>
        <color attach="background" args={['#1c2c42']} />
        <ambientLight intensity={1.6} />
        <pointLight position={[0, 2.7, 1]} intensity={28} color="#ffdfae" />
        <mesh position={[0, -.12, 0]}>
          <boxGeometry args={[7, .22, 10]} /><meshStandardMaterial color="#435975" />
        </mesh>
        <mesh position={[0, 1.55, -3.2]}>
          <boxGeometry args={[7, 3.1, .2]} /><meshStandardMaterial color="#8398ab" />
        </mesh>
        {[-3.45, 3.45].map((x) => <mesh key={x} position={[x, 1.5, 0]}>
          <boxGeometry args={[.15, 3, 9]} /><meshStandardMaterial color="#b9c3c8" />
        </mesh>)}
        {[-2.15, 2.15].map((x) => <group key={x} position={[x, 0, -.7]}>
          <mesh position={[0, .32, 0]}>
            <boxGeometry args={[1.2, .64, 2.4]} /><meshStandardMaterial color="#24384f" />
          </mesh>
          <mesh position={[0, .68, 0]}>
            <boxGeometry args={[1.15, .16, 2.3]} /><meshStandardMaterial color={x < 0 ? '#65c8be' : '#e6af74'} />
          </mesh>
          <mesh position={[0, .82, -.75]}>
            <boxGeometry args={[.82, .16, .48]} /><meshStandardMaterial color="#e8ebdc" />
          </mesh>
        </group>)}
        <mesh position={[0, 1.1, -2.85]} onClick={onCheck}>
          <boxGeometry args={[1.65, .85, .22]} /><meshStandardMaterial color="#213b57" />
        </mesh>
        <mesh position={[0, 1.18, -2.72]} onClick={onCheck}>
          <planeGeometry args={[1.32, .46]} /><meshBasicMaterial color={checked ? '#7ef4bd' : '#ffd38b'} />
        </mesh>
        <mesh position={[0, 2.35, -3.08]}>
          <circleGeometry args={[.63, 48]} /><meshBasicMaterial color="#081525" />
        </mesh>
        <mesh position={[0, 2.35, -3.06]}>
          <ringGeometry args={[.61, .7, 48]} /><meshStandardMaterial color="#e1e9ee" />
        </mesh>
        <mesh position={[0, 2.22, -3.04]}>
          <sphereGeometry args={[.29, 24, 16]} /><meshStandardMaterial color="#7ab6e5" />
        </mesh>
      </Canvas>
    </div>
  )
}
