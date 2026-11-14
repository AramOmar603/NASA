import type { BuildingTelemetry } from '../components/dashboard/BuildingPanel'
import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { GreenhouseInterior } from '../rookie-training/GreenhouseInterior'
import { EquipmentScene } from '../rookie-training/EquipmentScene'
import { HabitatInterior } from './HabitatArrival'
import { departments } from './departments'
import type { DepartmentId } from './departments'
import './exploration.css'

const rooms = {
  'WTR-01': { color: '#44cfff', cue: 'Follow the blue pipe. The recycler collects water so the crew can use it again.' },
  'PWR-01': { color: '#b99aff', cue: 'Batteries store electricity so the base can use it later.' },
  'SHD-01': { color: '#ffb681', cue: 'Thick walls help protect the crew during space storms.' },
} as const

function UtilityRoom({ id, active }: { id: keyof typeof rooms; active: boolean }) {
  const { color } = rooms[id]
  return (
    <Canvas camera={{ position: [3.5, 2.4, 5.8], fov: 50 }} frameloop="demand"
      fallback={<div className="visit-scene-fallback">{departments[id].icon}</div>}>
      <color attach="background" args={['#182741']} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[-3, 4, 5]} intensity={1.05} color="#dcecff" />
      <pointLight position={[1, 3, 3]} color={color} intensity={32} />
      <mesh position={[0, -.15, 0]}>
        <boxGeometry args={[7, .25, 8]} /><meshStandardMaterial color="#48536e" />
      </mesh>
      <mesh position={[0, 1.5, -2.9]}>
        <boxGeometry args={[7, 3, .25]} /><meshStandardMaterial color="#607490" />
      </mesh>
      <mesh position={[-3.4, 1.5, 0]}>
        <boxGeometry args={[.2, 3, 6]} /><meshStandardMaterial color="#465773" />
      </mesh>
      {id === 'WTR-01' ? <>
        {[-1.25, 1.25].map((x) => <mesh key={x} position={[x, .95, -1]}>
          <cylinderGeometry args={[.72, .72, 1.85, 24]} /><meshStandardMaterial color="#65b6dc" metalness={.2} />
        </mesh>)}
        <mesh position={[0, .85, -.4]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[.17, .17, 2.6, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? .75 : .15} />
        </mesh>
      </> : id === 'PWR-01' ? (
        <group position={[0, .85, -1]}>
          <mesh><boxGeometry args={[3.5, 1.65, 1.2]} /><meshStandardMaterial color="#495983" /></mesh>
          {[-1, 0, 1].map((x) => <mesh key={x} position={[x, 0, .62]}>
            <boxGeometry args={[.55, 1.12, .07]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? .7 : .15} />
          </mesh>)}
        </group>
      ) : (
        <group position={[0, 1.1, -1.3]}>
          <mesh><boxGeometry args={[3.9, 2.15, 1]} /><meshStandardMaterial color="#938396" /></mesh>
          <mesh position={[0, 0, .53]}><boxGeometry args={[2.4, 1.75, .1]} /><meshStandardMaterial color="#333e58" /></mesh>
          <mesh position={[.7, .05, .63]}>
            <circleGeometry args={[.13, 24]} /><meshBasicMaterial color={active ? '#86f3c3' : color} />
          </mesh>
        </group>
      )}
    </Canvas>
  )
}

export function DepartmentVisit({ id, damaged, repairAvailable, telemetry, onRepair, onBack, onTour }: {
  id: DepartmentId
  damaged: boolean
  repairAvailable: boolean
  telemetry?: BuildingTelemetry
  onRepair: () => void
  onBack: () => void
  onTour?: () => void
}) {
  const [learned, setLearned] = useState(false)
  const habitat = id === 'HAB-01'
  if (id === 'BIO-01') return (
    <GreenhouseInterior exploring damaged={damaged} repairAvailable={repairAvailable} onStartRepair={onRepair} onClose={onBack} onRepair={() => false} />
  )

  const equipment = id === 'OXY-01' || id === 'SOL-01'
  const room = id === 'WTR-01' || id === 'PWR-01' || id === 'SHD-01' ? rooms[id] : undefined
  return (
    <section data-home={habitat} className={id === 'ROV-01' ? 'department-visit visit-exterior' : 'department-visit'} aria-label={departments[id].name}>
      {habitat && <HabitatInterior checked={learned} onExit={onBack} onCheck={() => setLearned(true)} />}
      {equipment && (
        <div className="visit-equipment">
          <EquipmentScene equipment={id === 'SOL-01' ? 'solar' : 'oxygenPlant'}
            ready={learned} repaired={!damaged} onInspect={() => setLearned(true)} />
        </div>
      )}
      {room && <div className="visit-room"><UtilityRoom id={id as keyof typeof rooms} active={learned} /></div>}
      <div className="visit-card">
        {habitat && <p className="mission-wordmark">🌙 LAMOON</p>}
        <h2><span className="mission-icon" aria-hidden="true">{departments[id].icon}</span> {departments[id].name}</h2>
        <p role="status">{learned ? room?.cue ?? departments[id].lesson
          : habitat ? 'Welcome home! Tap the console or the glowing exit.'
            : 'Tap Learn to see what this does.'}</p>
        {equipment && telemetry && <dl className="visit-readings">
          <div><dt>Condition</dt><dd>{telemetry.condition ?? 'Unavailable'}</dd></div>
          <div><dt>{id === 'SOL-01' ? 'Electricity produced last day' : 'Oxygen produced last day'}</dt>
            <dd>{telemetry.readings?.generation ?? 'Unavailable'}</dd></div>
          {id === 'SOL-01' && <div><dt>Battery reserve</dt><dd>{telemetry.readings?.battery}</dd></div>}
        </dl>}
        <div className="visit-actions">
          {!learned && <button type="button" onClick={() => setLearned(true)}>
            {habitat ? 'Check mission console' : 'Learn how it works'}
          </button>}
          {damaged && !repairAvailable && <p>Repair is unavailable right now.</p>}
          {repairAvailable && <button type="button" onClick={onRepair}>Start repair</button>}
          {habitat && onTour && <button className="visit-tour" type="button" onClick={onTour}>
            <span aria-hidden="true">🚀</span> Take the Base Tour
          </button>}
          <button autoFocus type="button" onClick={onBack}>{habitat ? '🚪 Exit to Moon base' : '↩ Back to Base'}</button>
        </div>
      </div>
    </section>
  )
}
