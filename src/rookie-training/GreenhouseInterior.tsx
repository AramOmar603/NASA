import { useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

const tools = [
  { id: 'water', icon: '💧', name: 'Water supply', hint: 'Gives plants water!' },
  { id: 'nutrients', icon: '🧪', name: 'Plant nutrients', hint: 'Helps plants grow!' },
  { id: 'repair', icon: '🔧', name: 'Repair tool', hint: 'Fixes broken equipment!' },
] as const

function WalkIn() {
  useFrame(({ camera }, delta) => {
    camera.position.z += (4.7 - camera.position.z) * Math.min(1, delta * 3)
  })
  return null
}

function PlantBed({ dry, restored, onClick }: { dry: boolean; restored: boolean; onClick?: () => void }) {
  const wilted = dry && !restored
  return <group position={[dry ? -1.55 : 1.55, 0, 0]} onClick={onClick}>
    <mesh position={[0, .47, 0]}><boxGeometry args={[1.25, .85, 4]} /><meshStandardMaterial color={wilted ? '#f3a44a' : '#d6f3dc'} /></mesh>
    <mesh position={[0, .92, 0]}><boxGeometry args={[1.08, .08, 3.85]} /><meshStandardMaterial color={wilted ? '#cf9164' : '#239dce'} /></mesh>
    {[-1.5, -.75, 0, .75, 1.5].map((z) => <group key={z} position={[0, 1.02, z]}>
      <mesh position={[0, .2, 0]} rotation={[0, 0, wilted ? .6 : 0]}>
        <cylinderGeometry args={[.035, .045, .48, 6]} /><meshStandardMaterial color={wilted ? '#8d7f37' : '#1b8f51'} />
      </mesh>
      {[-1, 1].map((side) => <mesh key={side} position={[side * .14, wilted ? .17 : .43, 0]}
        rotation={[0, 0, side * (wilted ? -.65 : .6)]} scale={[.24, .09, .12]}>
        <sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={wilted ? '#a89145' : '#53e474'} />
      </mesh>)}
    </group>)}
  </group>
}

export function GreenhouseInterior({ unavailable, onClose, onRepair }: {
  unavailable?: string
  onClose: () => void
  onRepair: () => boolean
}) {
  const [inspected, inspect] = useState(false)
  const [selected, select] = useState<(typeof tools)[number]['id']>()
  const [restored, restore] = useState(false)
  const [message, tell] = useState('🌱 Oh no! Tap the thirsty plants.')
  const [look, setLook] = useState(0)

  function useBed() {
    if (restored) return
    if (!inspected || !selected) {
      inspect(true)
      tell('💧 These roots need water. Pick a tool!')
    } else if (selected !== 'water') {
      tell('🤔 Not yet! These plants need water first.')
    } else if (unavailable) {
      tell(unavailable)
    } else if (onRepair()) {
      restore(true)
      tell('✅ Great job! Water is flowing again.')
    } else {
      tell('The bed still needs help.')
    }
  }

  return <section className="rookie-interior" role="dialog" aria-modal="true" aria-label="Greenhouse interior">
    <div className="rookie-view">
      <Canvas camera={{ position: [0, 1.45, 7], fov: 59 }} fallback={<p>Use the tools and the plant-bed button below.</p>}>
        <WalkIn />
        <color attach="background" args={['#172d44']} />
        <ambientLight intensity={1.6} />
        <directionalLight position={[2, 5, 4]} intensity={2} />
        <group rotation={[0, look, 0]}>
          <mesh position={[0, -.13, 0]}><boxGeometry args={[6, .25, 14]} /><meshStandardMaterial color="#647b89" /></mesh>
          <mesh position={[0, 1.65, -5]}><boxGeometry args={[6, 3.3, .16]} /><meshStandardMaterial color="#518a9a" /></mesh>
          {[-3, 3].map((x) => <group key={x}>
            <mesh position={[x, 1.65, 0]}><boxGeometry args={[.09, 3.3, 13]} /><meshStandardMaterial color="#69c8d9" transparent opacity={.19} /></mesh>
            {[-4, -1, 2, 5].map((z) => <mesh key={z} position={[x, 1.65, z]}><boxGeometry args={[.14, 3.3, .14]} /><meshStandardMaterial color="#b0cdda" /></mesh>)}
          </group>)}
          <mesh position={[0, 3.3, 0]}><boxGeometry args={[6, .1, 13]} /><meshStandardMaterial color="#7fc5d6" transparent opacity={.35} /></mesh>
          <PlantBed dry restored={restored} onClick={useBed} />
          <PlantBed dry={false} restored />
        </group>
      </Canvas>
    </div>
    <header><p role="status">{message}</p><button autoFocus type="button" onClick={onClose}>Back to Base</button></header>
    <div className="rookie-look" aria-label="Look around">
      <button type="button" aria-label="Look left" onClick={() => setLook(.22)}>←</button>
      <button type="button" aria-label="Look right" onClick={() => setLook(-.22)}>→</button>
    </div>
    {restored && <div className="rookie-water" aria-hidden="true">💧 💧 💧</div>}
    <footer>
      <button type="button" onClick={useBed}>{inspected && selected ? 'Use tool on plant bed' : '🌱 Check plant bed'}</button>
      <div className="rookie-tools" aria-label="Tool station">
        {tools.map(({ id, icon, name, hint }) => <button key={id} type="button" title={hint} aria-label={name}
          aria-pressed={selected === id} disabled={restored} onClick={() => {
            select(id)
            tell(inspected ? hint + ' Tap the plant bed.' : hint + ' Check the plants first.')
          }}><span aria-hidden="true">{icon}</span><small>{name}</small></button>)}
      </div>
    </footer>
  </section>
}
