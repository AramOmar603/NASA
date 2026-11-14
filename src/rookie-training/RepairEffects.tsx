import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { Group } from 'three'

const motionQuery = '(prefers-reduced-motion: reduce)'
function subscribe(notify: () => void) {
  const media = window.matchMedia(motionQuery)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(motionQuery).matches, () => true)
}

export function RepairSignal({ broken, wheel = false, test = false }: { broken: boolean; wheel?: boolean; test?: boolean }) {
  const group = useRef<Group>(null)
  const reduced = useReducedMotion()
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => { if (wheel) invalidate() }, [wheel, broken, test, invalidate])
  useFrame(({ clock }, delta) => {
    if (!group.current || reduced) return
    if (wheel) invalidate()
    const time = clock.elapsedTime
    group.current.scale.setScalar(broken ? 1 + Math.sin(time * 7) * .17 : 1)
    if (wheel) group.current.rotation.z += broken ? Math.sin(time * 16) * delta * 2 : delta * 4
  })
  if (!broken && !test) return null
  const color = broken ? '#ff7355' : '#66ffad'
  return <group ref={group}>
    <mesh><ringGeometry args={[.45, .54, 32]} /><meshBasicMaterial color={color} depthTest={false} toneMapped={false} /></mesh>
    {wheel && <mesh position={[.36, 0, 0]}><sphereGeometry args={[.09, 12, 8]} /><meshBasicMaterial color={color} depthTest={false} /></mesh>}
  </group>
}

export function RepairFlow({ broken, color = '#67edff' }: { broken: boolean; color?: string }) {
  const dots = useRef<Group>(null)
  const reduced = useReducedMotion()
  useFrame(({ clock }) => {
    dots.current?.children.forEach((child, index) => {
      const progress = reduced || broken ? index / 4 : (clock.elapsedTime * .8 + index / 4) % 1
      child.position.x = -1.15 + progress * (broken ? .85 : 2.3)
    })
  })
  return <group ref={dots}>
    {[0, 1, 2, 3].map((index) => <mesh key={index} position={[-1.15 + index * .58, 0, 0]}>
      <sphereGeometry args={[.08, 12, 8]} /><meshBasicMaterial color={broken ? '#ffc764' : color} toneMapped={false} />
    </mesh>)}
  </group>
}

export function PanelAlignment({ broken, panel }: { broken: boolean; panel: React.RefObject<Group | null> }) {
  const reduced = useReducedMotion()
  useFrame(({ clock }, delta) => {
    if (!panel.current) return
    const target = broken ? .55 + (reduced ? 0 : Math.sin(clock.elapsedTime * 6) * .035) : -.55
    panel.current.rotation.x += (target - panel.current.rotation.x) * (reduced ? 1 : 1 - Math.exp(-5 * delta))
  })
  return null
}

export function PlantRecovery({ restored, leaves }: { restored: boolean; leaves: React.RefObject<Group | null> }) {
  const reduced = useReducedMotion()
  useFrame((_, delta) => {
    if (!leaves.current) return
    const height = leaves.current.scale.y
    leaves.current.scale.y = reduced ? 1 : height + ((restored ? 1 : .72) - height) * (1 - Math.exp(-4 * delta))
  })
  return null
}
