import type { CommanderObjective } from '../rookie-training/commander'
import type { DisasterFault } from '../rookie-training/disaster'
import type { SurvivalSession } from '../components/dashboard/survivalController'
import { DepartmentInfo } from './DepartmentInfo'
import { useState } from 'react'
import { RepairFlow, RepairSignal } from '../rookie-training/RepairEffects'
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

function UtilityRoom({ id, active, showFilter, damaged, disasterFault, commanderValve }: { id: keyof typeof rooms; active: boolean; showFilter: boolean; damaged: boolean; disasterFault?: DisasterFault; commanderValve?: boolean }) {
  const { color } = rooms[id]
  return (
    <Canvas camera={{ position: [3.5, 2.4, 5.8], fov: 50 }}
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
        <group position={[0, .86, -.15]}><RepairFlow broken={damaged} /></group>
        <group position={[0, .86, -.04]}><RepairSignal broken={damaged} /></group>
        {disasterFault === 'waterPump' && <group position={[-.8, .86, -.02]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.29, .29, .48, 16]} />
            <meshStandardMaterial color={damaged ? '#ffbd61' : '#70ffc8'} />
          </mesh>
          <RepairSignal broken={damaged} test warningColor="#ffbd51" />
        </group>}
        {commanderValve && <group position={[.62, 1.13, -.03]} rotation={[0, 0, damaged ? .65 : 0]}>
          <mesh><boxGeometry args={[.52, .13, .18]} /><meshStandardMaterial color={damaged ? '#ffc461' : '#70ffc8'} /></mesh>
          <RepairSignal broken={damaged} test />
        </group>}
        {showFilter && !commanderValve && disasterFault !== 'waterPump' && <mesh position={[0, .85, -.37]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[.27, .27, .62, 16]} />
          <meshStandardMaterial color={active ? '#70ffc8' : '#ffcc67'} emissive={active ? '#267b58' : '#af641d'} emissiveIntensity={.45} />
        </mesh>}
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
            <circleGeometry args={[.13, 24]} /><meshBasicMaterial color={!damaged ? '#86f3c3' : color} />
          </mesh>
          <group position={[.7, .05, .69]}><RepairSignal broken={damaged} test={disasterFault === 'shelterPanel'} warningColor={disasterFault === 'shelterPanel' ? '#ffd35c' : undefined} /></group>
        </group>
      )}
    </Canvas>
  )
}

export function DepartmentVisit({ id, damaged, repairAvailable, repairBlockedReason, session, disasterFault, commanderLesson, commanderResolved, assignment, inspectionOnly = false, onRepair, onBack, onHome, onSkipLevel, skipLevelLabel, onTour }: {
  id: DepartmentId
  damaged: boolean
  repairAvailable: boolean
  repairBlockedReason?: string
  session: SurvivalSession
  disasterFault?: DisasterFault
  commanderLesson?: Exclude<CommanderObjective, 'planning'>
  commanderResolved?: boolean
  assignment?: React.ReactNode
  inspectionOnly?: boolean
  onRepair: () => void
  onBack: () => void
  onSkipLevel?: () => void
  skipLevelLabel?: string
  onHome?: () => void
  onTour?: () => void
}) {
  const [learned, setLearned] = useState(false)
  const habitat = id === 'HAB-01'
  if (id === 'BIO-01') return (
    <GreenhouseInterior assignment={assignment} departmentInfo={<DepartmentInfo id={id} session={session} greenhouseFault={damaged} />} damaged={damaged} inspectionOnly={inspectionOnly} onClose={onBack} onHome={onHome} onSkipLevel={onSkipLevel} skipLevelLabel={skipLevelLabel} onStartRepair={repairAvailable ? onRepair : undefined} />
  )

  const equipment = id === 'OXY-01' || id === 'SOL-01'
  const room = id === 'WTR-01' || id === 'PWR-01' || id === 'SHD-01' ? rooms[id] : undefined
  return (
    <section data-home={habitat} className={id === 'ROV-01' ? 'department-visit visit-exterior' : 'department-visit'} aria-label={departments[id].name}>
      {habitat && <HabitatInterior checked={learned} training={commanderLesson === 'temperature' || commanderLesson === 'signal' ? commanderLesson : undefined} trainingResolved={commanderResolved} onExit={onBack} onCheck={() => setLearned(true)} />}
      {equipment && (
        <div className="visit-equipment">
          <EquipmentScene equipment={id === 'SOL-01' ? 'solar' : 'oxygenPlant'}
            ready={learned} repaired={!damaged} outputFault={disasterFault === 'powerConnection' || disasterFault === 'powerRelay' || commanderLesson === 'finalPower'} intakeFault={commanderLesson === 'finalAir'} onInspect={() => setLearned(true)} />
        </div>
      )}
      {room && <div className="visit-room"><UtilityRoom id={id as keyof typeof rooms} active={inspectionOnly ? !damaged : learned} showFilter={inspectionOnly} damaged={damaged} disasterFault={disasterFault} commanderValve={commanderLesson === 'finalWater'} /></div>}
      {!inspectionOnly && <div className="visit-card">
        {habitat && <p className="mission-wordmark">🌙 LAMOON</p>}
        {assignment ?? <DepartmentInfo id={id} session={session} />}
        {learned && room && <p role="status">{room.cue}</p>}
        <div className="visit-actions">
          {!learned && <button type="button" onClick={() => setLearned(true)}>
            {habitat ? 'Check mission console' : 'Learn how it works'}
          </button>}
          {damaged && !repairAvailable && <p>{repairBlockedReason ?? 'Repair is unavailable right now.'}</p>}
          {repairAvailable && <button type="button" onClick={onRepair}>Start repair</button>}
          {habitat && onTour && <button className="visit-tour" type="button" onClick={onTour}>
            <span aria-hidden="true">🚀</span> Take the Base Tour
          </button>}
          {onSkipLevel && <button type="button" onClick={onSkipLevel}>{skipLevelLabel}</button>}
          {onHome && <button type="button" onClick={onHome}>🏠 Home</button>}
          <button autoFocus type="button" onClick={onBack}>{habitat ? '🚪 Explore Moon Base' : '↩ Back to Base'}</button>
        </div>
      </div>}
    </section>
  )
}
