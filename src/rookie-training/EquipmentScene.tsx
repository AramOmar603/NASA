import { Canvas } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { PanelAlignment, RepairFlow, RepairSignal } from './RepairEffects'

type LessonEquipment = 'solar' | 'oxygenPlant'

export function EquipmentScene({ equipment, ready, repaired, outputFault = false, intakeFault = false, onInspect }: {
  equipment: LessonEquipment
  ready: boolean
  repaired: boolean
  outputFault?: boolean
  intakeFault?: boolean
  onInspect?: () => void
}) {
  const panel = useRef<Group>(null)
  const solar = equipment === 'solar'
  const signal = repaired ? '#70ffc8' : ready ? '#8edcff' : '#ff654b'

  return (
    <div className="equipment-scene" aria-hidden="true">
      <Canvas camera={{ position: [4, 3, 6], fov: 42 }}
        fallback={<div className="equipment-scene-fallback" style={{ color: signal }}>
          {solar ? '☀️ → ▧' : '⚡ → 🫧'}
        </div>}>
        <color attach="background" args={['#12273b']} />
        <hemisphereLight args={['#e1f2ff', '#9faec0', 1.55]} />
        <directionalLight position={[4, 6, 3]} intensity={2.5} />
        <mesh position={[0, -1.2, 0]}>
          <boxGeometry args={[7, .2, 5]} />
          <meshStandardMaterial color="#526075" />
        </mesh>
        {solar ? (
          <>
            <mesh position={[0, -.65, 0]}>
              <cylinderGeometry args={[.22, .34, 1.1, 16]} />
              <meshStandardMaterial color="#adbcc9" />
            </mesh>
            <PanelAlignment broken={!repaired && !outputFault} panel={panel} />
            <group ref={panel} onClick={onInspect}>
              <mesh>
                <boxGeometry args={[3.1, 1.65, .2]} />
                <meshStandardMaterial color={signal} emissive={signal} emissiveIntensity={.25} />
              </mesh>
              {[-1, 0, 1].map((x) => [-.39, .39].map((y) => (
                <mesh key={`${x},${y}`} position={[x, y, .12]}>
                  <boxGeometry args={[.92, .68, .05]} />
                  <meshStandardMaterial color="#3772ae" metalness={.24} roughness={.3} />
                </mesh>
              )))}
              <group position={[0, .15, .15]}><RepairSignal broken={!repaired && !outputFault} /></group>
            </group>
            {outputFault && <group position={[0, -.65, .6]}>
              <mesh><boxGeometry args={[.55, .42, .22]} /><meshStandardMaterial color={signal} /></mesh>
              <RepairSignal broken={!repaired} test warningColor="#ffbd51" />
            </group>}
            <group position={[0, -.85, .5]}><RepairFlow broken={!repaired} color="#ffeb73" /></group>
          </>
        ) : (
          <group onClick={onInspect}>
            <mesh position={[0, -.15, 0]}>
              <boxGeometry args={[2.65, 1.85, 1.4]} />
              <meshStandardMaterial color="#b3d7e0" />
            </mesh>
            {[-.72, .72].map((x) => (
              <mesh key={x} position={[x, .8, -.2]}>
                <cylinderGeometry args={[.29, .29, .55, 16]} />
                <meshStandardMaterial color="#448fa9" />
              </mesh>
            ))}
            <mesh position={[0, .15, .72]}>
              <boxGeometry args={[1.28, .75, .1]} />
              <meshStandardMaterial color="#31667d" />
            </mesh>
            <mesh position={[0, .15, .79]}>
              <circleGeometry args={[.23, 24]} />
              <meshBasicMaterial color={signal} />
            </mesh>
            {intakeFault && <group position={[-.8, -.35, .91]}>
              <mesh><boxGeometry args={[.4, .3, .2]} /><meshStandardMaterial color={repaired ? '#70ffc8' : '#ffad55'} /></mesh>
              <RepairSignal broken={!repaired} test />
            </group>}
            <group position={[0, .15, .82]}><RepairSignal broken={!repaired} /></group>
            <group position={[0, -.35, .76]}><RepairFlow broken={!repaired} /></group>
          </group>
        )}
      </Canvas>
    </div>
  )
}
