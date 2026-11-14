import { useEffect, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PCFShadowMap, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Sky, sunlightPosition } from './Sky'
import { Surface } from './Surface'

export type LunarCameraFocus = Readonly<{ x: number; z: number; distance?: number; cameraOffset?: readonly [number, number, number]; onArrival?: () => void }>

function CameraControls({ focus }: { focus?: LunarCameraFocus }) {
  const controls = useRef<OrbitControls>(null)
  const { camera, gl, invalidate } = useThree()

  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement)
    const correction = new Vector3()
    orbit.target.set(0, 3, 0)
    orbit.enableDamping = true
    orbit.dampingFactor = 0.09
    orbit.minDistance = 18
    orbit.maxDistance = 430
    orbit.minPolarAngle = 0.20
    orbit.maxPolarAngle = Math.PI / 2 - 0.14
    orbit.panSpeed = 0.65
    orbit.screenSpacePanning = false

    function onChange() {
      const { x, y, z } = orbit.target
      correction.set(
        Math.max(-85, Math.min(85, x)) - x,
        3 - y,
        Math.max(-85, Math.min(85, z)) - z,
      )
      orbit.target.add(correction)
      camera.position.add(correction)
      invalidate()
    }

    controls.current = orbit
    orbit.addEventListener('change', onChange)
    orbit.update()
    invalidate()
    return () => {
      orbit.removeEventListener('change', onChange)
      orbit.dispose()
      controls.current = null
    }
  }, [camera, gl, invalidate])

  const destination = useRef<Vector3 | null>(null)
  const movement = useRef(new Vector3())
  const offset = useRef(new Vector3())
  const endOffset = useRef(new Vector3())
  const distance = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!focus) {
      destination.current = null
      if (controls.current) controls.current.enabled = true
      return
    }
    destination.current = new Vector3(focus.x, 3, focus.z)
    distance.current = focus.distance
    invalidate()
  }, [focus, invalidate])

  useFrame((_, delta) => {
    const orbit = controls.current
    if (!orbit) return
    const target = destination.current
    if (target) {
      const step = movement.current.copy(target).sub(orbit.target)
      const zoom = offset.current.copy(camera.position).sub(orbit.target)
      const desiredOffset = endOffset.current
      if (focus?.cameraOffset) {
        orbit.enabled = false
        const aspect = gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight)
        desiredOffset.set(...focus.cameraOffset).multiplyScalar(1 / Math.max(.38, Math.min(1, aspect)))
      } else {
        desiredOffset.copy(zoom).setLength(distance.current ?? zoom.length())
      }
      const finished = (step.lengthSq() < .01 && zoom.distanceToSquared(desiredOffset) < .01)
        || matchMedia('(prefers-reduced-motion: reduce)').matches
      const blend = finished ? 1 : 1 - Math.exp(-Math.max(delta, 1 / 120) * 7)
      step.multiplyScalar(blend)
      orbit.target.add(step)
      camera.position.copy(orbit.target).add(zoom.lerp(desiredOffset, blend))
      if (finished) {
        destination.current = null
        orbit.enabled = true
        focus?.onArrival?.()
      } else invalidate()
    }
    orbit.update()
  })
  return null
}

export interface LunarEnvironmentProps {
  /** Optional Three.js / R3F content in lunar world coordinates. */
  children?: ReactNode
  /** CSS class for the outer container. Give it a measurable height. */
  className?: string
  focus?: LunarCameraFocus
  interactive?: boolean
  fallback?: ReactNode
}

export function LunarEnvironment({ children, className, focus, interactive = true, fallback = <p>This lunar scene requires WebGL 2.</p> }: LunarEnvironmentProps) {
  return (
    <div className={className} style={className ? undefined : { height: 'min(75vh, 720px)' }}>
      <Canvas
        camera={{ position: [20, 43, 182], fov: 53, near: 0.25, far: 2750 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        shadows={{ type: PCFShadowMap }}
        fallback={fallback ?? <div />}
      >
        {/* A low, shadow-free fill keeps camera-facing equipment readable. */}
        <ambientLight intensity={0.68} color="#edf2ff" />
        <hemisphereLight args={['#d5e7ff', '#a59d91', 0.72]} />
        <directionalLight position={[38, 52, 85]} color="#e6efff" intensity={0.95} />
        <directionalLight
          castShadow
          color="#fff3df"
          intensity={2.9}
          position={sunlightPosition}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-210}
          shadow-camera-right={210}
          shadow-camera-top={210}
          shadow-camera-bottom={-210}
          shadow-camera-far={720}
          shadow-normalBias={0.32}
        />
        <Sky />
        <Surface />
        {children}
        {interactive && <CameraControls focus={focus} />}
      </Canvas>
    </div>
  )
}
