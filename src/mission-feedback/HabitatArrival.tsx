import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'

export function HabitatArrival({ active, onBegin }: { active: boolean; onBegin: () => void }) {
  const [checked, setChecked] = useState(false)
  const action = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (active) action.current?.focus()
  }, [active, checked])

  return (
    <section className="habitat-arrival" inert={!active} aria-label="Inside the Home Center">
      <HabitatInterior checked={checked} onCheck={() => setChecked(true)} />
      <div className="habitat-arrival-note">
        <p className="mission-wordmark">🌙 LAMOON</p>
        <h1>Welcome home, astronaut!</h1>
        <p role="status">{checked
          ? 'Ready to explore? Head outside to start your first day.'
          : 'This is your Moon home! Check the glowing console.'}</p>
        {checked
          ? <button key="outside" ref={action} type="button" onClick={onBegin}>Explore the Moon base</button>
          : <button key="console" ref={action} type="button" onClick={() => setChecked(true)}>Check mission console</button>}
      </div>
    </section>
  )
}

export function HabitatInterior({ checked = false, onCheck, onExit }: { checked?: boolean; onCheck?: () => void; onExit?: () => void }) {
  return (
    <div className="habitat-arrival-scene" aria-hidden="true">
      <Canvas camera={{ position: [0, 1.65, 4.35], fov: 60 }} dpr={[1, 1.5]} frameloop="demand"
        fallback={<div className="habitat-arrival-fallback"><span>◈</span></div>}>
        <color attach="background" args={['#1c2c42']} />
        <ambientLight intensity={1.25} color="#d6deff" />
        <pointLight position={[-2.1, 2.6, -.8]} intensity={12} color="#a28bff" />
        <pointLight position={[2.2, 2.6, -.8]} intensity={13} color="#80eada" />
        <pointLight position={[0, 2.7, 1.8]} intensity={24} color="#ffdfae" />
        <mesh position={[0, -.12, 0]}>
          <boxGeometry args={[7, .22, 10]} /><meshStandardMaterial color="#3d4f70" />
        </mesh>
        <mesh position={[0, 1.55, -3.2]}>
          <boxGeometry args={[7, 3.1, .2]} /><meshStandardMaterial color="#6980a0" />
        </mesh>
        {[-3.45, 3.45].map((x) => <mesh key={x} position={[x, 1.5, 0]}>
          <boxGeometry args={[.15, 3, 9]} /><meshStandardMaterial color="#a5b5ce" />
        </mesh>)}
        <mesh position={[0, 2.99, -.9]}>
          <boxGeometry args={[6.9, .12, 4.5]} /><meshStandardMaterial color="#344969" />
        </mesh>
        {[-2.15, 2.15].map((x) => <mesh key={x} position={[x, 2.91, -.85]}>
          <boxGeometry args={[.1, .05, 3.55]} /><meshBasicMaterial color={x < 0 ? '#c8a7ff' : '#9cf8ec'} />
        </mesh>)}
        <mesh position={[0, .005, .15]}>
          <boxGeometry args={[1.55, .02, 4.7]} /><meshStandardMaterial color="#365e78" />
        </mesh>
        {[-.79, .79].map((x) => <mesh key={x} position={[x, .022, .15]}>
          <boxGeometry args={[.04, .02, 4.7]} /><meshBasicMaterial color="#81e4de" />
        </mesh>)}
        {[-2.15, 2.15].map((x) => <group key={x} position={[x, 0, -.7]}>
          <mesh position={[0, .32, 0]}>
            <boxGeometry args={[1.2, .64, 2.4]} /><meshStandardMaterial color="#24384f" />
          </mesh>
          <mesh position={[0, .68, 0]}>
            <boxGeometry args={[1.15, .16, 2.3]} /><meshStandardMaterial color={x < 0 ? '#65c8be' : '#e6af74'} />
          </mesh>
          <mesh position={[0, .79, .48]}>
            <boxGeometry args={[1.15, .09, 1.3]} /><meshStandardMaterial color={x < 0 ? '#a98bef' : '#f0ae72'} />
          </mesh>
          <mesh position={[0, 1.04, -1.19]}>
            <boxGeometry args={[1.28, .95, .13]} /><meshStandardMaterial color="#47648a" />
          </mesh>
          <mesh position={[0, .82, -.75]}>
            <boxGeometry args={[.82, .16, .48]} /><meshStandardMaterial color="#e8ebdc" />
          </mesh>
        </group>)}
        {[-2.5, 2.5].map((x) => <group key={x} position={[x, 1.45, -2.84]}>
          <mesh><boxGeometry args={[.9, 1.75, .28]} /><meshStandardMaterial color={x < 0 ? '#7867ae' : '#4eaaa9'} /></mesh>
          <mesh position={[0, .34, .17]}><boxGeometry args={[.53, .06, .05]} /><meshBasicMaterial color="#ffe0a4" /></mesh>
        </group>)}
        <group position={[2.78, 1.15, -2.92]} onClick={onExit}>
          <mesh position={[0, 0, -.055]}><boxGeometry args={[1.35, 2.34, .17]} /><meshBasicMaterial color="#83ffe3" /></mesh>
          <mesh><boxGeometry args={[1.15, 2.2, .18]} /><meshStandardMaterial color="#335677" /></mesh>
          <mesh position={[0, .83, .11]}><boxGeometry args={[.7, .12, .05]} /><meshBasicMaterial color="#82ffd6" /></mesh>
        </group>
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
