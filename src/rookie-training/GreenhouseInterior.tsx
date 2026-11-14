import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Vector3 } from 'three'
import { wrongToolFeedback } from './greenhouseGuidance'

const tools = [
  { id: 'water', icon: '💧', name: 'Water supply', hint: 'Gives plants water!' },
  { id: 'nutrients', icon: '🧪', name: 'Plant nutrients', hint: 'Helps plants grow!' },
  { id: 'repair', icon: '🔧', name: 'Repair tool', hint: 'Fixes broken equipment!' },
] as const

function InteriorCamera({ yaw, depth, marker }: {
  yaw: number
  depth: number
  marker: React.RefObject<HTMLButtonElement | null>
}) {
  const point = useMemo(() => new Vector3(), [])
  useFrame(({ camera }, delta) => {
    const blend = 1 - Math.exp(-delta * 8)
    camera.position.z += (depth - camera.position.z) * blend
    camera.rotation.y += (yaw - camera.rotation.y) * blend
    camera.rotation.x = -.12
    camera.updateMatrixWorld()
    point.set(-1.55, 1.5, 1.65).project(camera)
    if (marker.current) {
      marker.current.style.left = Math.max(12, Math.min(88, (point.x + 1) * 50)) + '%'
      marker.current.style.top = Math.max(20, Math.min(72, (1 - point.y) * 50)) + '%'
    }
  })
  return null
}
function PlantBed({ dry, restored, onClick }: { dry: boolean; restored: boolean; onClick?: (event: ThreeEvent<MouseEvent>) => void }) {
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

export function GreenhouseInterior({ guided = false, exploring = false, damaged = false, repairAvailable = false, departmentInfo, onStartRepair, unavailable, onClose, onRepair }: {
  guided?: boolean
  exploring?: boolean
  damaged?: boolean
  repairAvailable?: boolean
  departmentInfo?: React.ReactNode
  onStartRepair?: () => void
  unavailable?: string
  onClose: () => void
  onRepair: () => boolean
}) {
  const [inspected, inspect] = useState(false)
  const [selected, select] = useState<(typeof tools)[number]['id']>()
  const [toolApplied, setToolApplied] = useState(false)
  const [retry, setRetry] = useState(false)
  const [restored, restore] = useState(false)
  const [message, tell] = useState(exploring ? '🌱 Welcome to the greenhouse. Check a plant bed to learn how crops grow.' : '🌱 Oh no! Tap the thirsty plants.')
  const [look, setLook] = useState(0)
  const [depth, setDepth] = useState(4.7)
  const marker = useRef<HTMLButtonElement>(null)
  const drag = useRef<{ start: number; yaw: number } | null>(null)

  const heading = restored ? 'Crops rescued!'
    : retry ? '🤔 Good try!'
      : toolApplied ? '3 / 3 · Test your tool' : selected ? 'Use your tool on the bed'
        : inspected ? '2 / 3 · Pick a tool' : '1 / 3 · Check the weak plants'
  const cardText = !inspected ? 'The wilted plants need help. Tap the marked bed to look closer.' : message

  function useBed() {
    if (exploring) {
      tell(damaged ? '🌱 These plants look thirsty. Check the equipment to see if it can be repaired.' : '🌱 Plants need light, water at their roots, and nutrients to grow food.')
      return
    }
    if (restored || retry) return
    if (!inspected) {
      inspect(true)
      setLook(0)
      setDepth(4.2)
      tell('The soil is dry and the leaves droop. Pick a tool for the roots.')
    } else if (selected) {
      setToolApplied(true)
      tell('Tool ready at the plant bed. Press Test to see what happens.')
    }
  }

  function testTool() {
    if (!toolApplied || !selected || restored || retry) return
    if (selected === 'water' && !unavailable && onRepair()) {
      restore(true)
      tell('💧 Hooray! Water is flowing again!')
      return
    }
    setRetry(true)
    tell(selected === 'water' ? unavailable ?? 'The bed still needs help. Check your spare kits.' : wrongToolFeedback[selected])
  }

  return <section className={guided ? "rookie-interior rookie-guided" : "rookie-interior"} role="dialog" aria-modal="true" aria-label="Greenhouse interior">
    <div className="rookie-view"
      onPointerDown={(event) => { drag.current = { start: event.clientX, yaw: look } }}
      onPointerMove={(event) => {
        if (drag.current && event.buttons === 1) {
          setLook(Math.max(-.65, Math.min(.65, drag.current.yaw + (event.clientX - drag.current.start) * .004)))
        }
      }}
      onPointerUp={() => { drag.current = null }}
      onPointerCancel={() => { drag.current = null }}
      onPointerLeave={() => { drag.current = null }}>
      <Canvas camera={{ position: [0, 1.45, 7], fov: 59 }} fallback={<p>Use the tools and the plant-bed button below.</p>}>
        <InteriorCamera yaw={look} depth={depth} marker={marker} />
        <color attach="background" args={['#172d44']} />
        <ambientLight intensity={1.6} />
        <directionalLight position={[2, 5, 4]} intensity={2} />
        <group>
          <mesh position={[0, -.13, 0]}><boxGeometry args={[6, .25, 14]} /><meshStandardMaterial color="#647b89" /></mesh>
          <mesh position={[0, 1.65, -5]}><boxGeometry args={[6, 3.3, .16]} /><meshStandardMaterial color="#518a9a" /></mesh>
          {[-3, 3].map((x) => <group key={x}>
            <mesh position={[x, 1.65, 0]}><boxGeometry args={[.09, 3.3, 13]} /><meshStandardMaterial color="#69c8d9" transparent opacity={.19} /></mesh>
            {[-4, -1, 2, 5].map((z) => <mesh key={z} position={[x, 1.65, z]}><boxGeometry args={[.14, 3.3, .14]} /><meshStandardMaterial color="#b0cdda" /></mesh>)}
          </group>)}
          <mesh position={[0, 3.3, 0]}><boxGeometry args={[6, .1, 13]} /><meshStandardMaterial color="#7fc5d6" transparent opacity={.35} /></mesh>
          {[-2.45, 2.45].map((x) => <mesh key={x} position={[x, 3.07, 0]}>
            <boxGeometry args={[.23, .12, 8]} /><meshBasicMaterial color="#bcfff0" />
          </mesh>)}
          {[-.72, .72].map((x) => <mesh key={x} position={[x, .011, .5]}>
            <boxGeometry args={[.055, .02, 9]} /><meshBasicMaterial color="#72e7d6" />
          </mesh>)}
          <mesh position={[0, .015, .5]}><boxGeometry args={[1.38, .02, 9]} /><meshStandardMaterial color="#284454" roughness={.92} /></mesh>
          <mesh position={[0, 1.65, -4.88]}><boxGeometry args={[2.6, 2.75, .16]} /><meshStandardMaterial color="#263e51" metalness={.35} /></mesh>
          <mesh position={[0, 2.35, -4.76]}><boxGeometry args={[1.8, .6, .05]} /><meshBasicMaterial color="#85ead5" /></mesh>
          <PlantBed dry restored={restored || (exploring && !damaged)} onClick={(event) => { if (event.delta < 5) useBed() }} />
          <PlantBed dry={false} restored />
        </group>
      </Canvas>
    </div>
    {!exploring && !restored && <button disabled={retry} ref={marker} className="rookie-bed-marker" type="button" onClick={() => {
      setLook(0)
      setDepth(4.2)
      useBed()
    }}>{selected && inspected ? '💧 Use tool here' : '↓ Thirsty plants'}</button>}
    <header>
      {departmentInfo ? <div className="greenhouse-info">{departmentInfo}<p role="status">{message}</p></div> : !exploring ? <div className="rookie-guide" data-tone={restored ? 'success' : retry ? 'retry' : 'step'}>
        <div role="status"><h2>{heading}</h2><p>{cardText}</p></div>
        {retry && <button type="button" onClick={() => {
          select(undefined)
          setRetry(false)
          setToolApplied(false)
          tell('Take another look at the tools. Which one gives the roots a drink?')
        }}>Try Again</button>}
        {restored && <button type="button" onClick={onClose}>⭐ Continue</button>}
      </div> : <p role="status">{message}</p>}
      <button autoFocus type="button" onClick={onClose}>Back to Base</button>
    </header>
    {restored && <div className="rookie-water" aria-hidden="true">💧 💧 💧</div>}
    <footer data-pick-tool={!exploring && inspected && !selected && !restored}>
      <div className="rookie-look" role="group" aria-label="Look around">
        <button type="button" aria-label="Look left" onClick={() => setLook((value) => Math.min(.65, value + .22))}>←</button>
        <button type="button" aria-label="Look right" onClick={() => setLook((value) => Math.max(-.65, value - .22))}>→</button>
        <button type="button" onClick={() => { setLook(0); setDepth(depth > 4 ? 3.35 : 4.7) }}>{depth > 4 ? 'Step closer' : 'Step back'}</button>
      </div>
      <div className="rookie-workbench">
        {exploring ? <>
          <button type="button" onClick={useBed}>🌱 Check plant bed</button>
          {repairAvailable && <button type="button" onClick={onStartRepair}>Start repair</button>}
        </> : <>
          <button type="button" disabled={restored || retry} onClick={useBed}>{inspected && selected ? 'Use tool on plant bed' : '🌱 Check plant bed'}</button>
          {toolApplied && !restored && !retry && <button type="button" onClick={testTool}>Test</button>}
          {!restored && !retry && <div className="rookie-tools" aria-label="Tool station">
            {tools.map(({ id, icon, name, hint }) => <button key={id} type="button" title={hint} aria-label={name}
              aria-pressed={selected === id} disabled={!inspected || restored || retry} onClick={() => {
                select(id)
                setToolApplied(false)
                tell(guided && id === 'water' ? '💧 Good idea! Water helps thirsty plants. Use it on the marked bed.' : 'Tap the thirsty bed to use your tool.')
              }}><span className="mission-icon" aria-hidden="true">{icon}</span><small>{name}</small><small>{hint}</small></button>)}
          </div>}
        </>}
      </div>
    </footer>
  </section>
}
