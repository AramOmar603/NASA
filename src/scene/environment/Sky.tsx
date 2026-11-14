import { Suspense, useEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, SRGBColorSpace, TextureLoader } from 'three'
import { randomSequence } from './terrain'
import earthMap from './assets/earth.jpg'

// The Sun and the scene's directional light share the same bearing.
export const sunlightPosition = [52, 23, -226] as const

function createStars() {
  const random = randomSequence(22)
  const count = 3500
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const y = random() * 2 - 1
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(1 - y * y)
    positions.set([radius * Math.cos(angle) * 2400, y * 2400, radius * Math.sin(angle) * 2400], i * 3)
    const value = 0.14 + random() ** 4 * 0.76
    colors.set([value * (0.86 + random() * 0.14), value * 0.92, value], i * 3)
  }
  return { positions, colors }
}

function createSunGlow() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  const glow = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  glow.addColorStop(0, '#fff8d8')
  glow.addColorStop(0.17, '#fff0b0')
  glow.addColorStop(0.27, '#ffc45570')
  glow.addColorStop(0.52, '#e388241c')
  glow.addColorStop(1, '#e3882400')
  context.fillStyle = glow
  context.fillRect(0, 0, 128, 128)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

const sunPosition = sunlightPosition.map((coordinate) => coordinate * 8) as [number, number, number]

const atmosphereVertex = `
  varying vec3 surfaceNormal;
  varying vec3 viewDirection;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    surfaceNormal = normalMatrix * normal;
    viewDirection = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`

const atmosphereFragment = `
  varying vec3 surfaceNormal;
  varying vec3 viewDirection;
  void main() {
    float facing = max(dot(normalize(surfaceNormal), normalize(viewDirection)), 0.0);
    float rim = pow(1.0 - facing, 4.5);
    gl_FragColor = vec4(0.23, 0.57, 1.0, rim * 0.64);
  }
`

function Earth() {
  const texture = useLoader(TextureLoader, earthMap)
  texture.colorSpace = SRGBColorSpace
  return (
    <group position={[-520, 255, -1640]}>
      <mesh rotation={[0.14, 1.9, -0.26]}>
        <sphereGeometry args={[46, 48, 32]} />
        <meshStandardMaterial map={texture} roughness={0.92} />
      </mesh>
      <mesh>
        <sphereGeometry args={[47.2, 48, 32]} />
        <shaderMaterial vertexShader={atmosphereVertex} fragmentShader={atmosphereFragment}
          transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
    </group>
  )
}

export function Sky() {
  const stars = useMemo(createStars, [])
  const glow = useMemo(createSunGlow, [])
  useEffect(() => () => glow.dispose(), [glow])
  return (
    <>
      <color attach="background" args={['#010205']} />
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[stars.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={1.25} sizeAttenuation={false} vertexColors toneMapped={false} />
      </points>
      <sprite position={sunPosition} scale={[154, 154, 1]}>
        <spriteMaterial map={glow} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </sprite>
      <Suspense fallback={null}><Earth /></Suspense>
    </>
  )
}
