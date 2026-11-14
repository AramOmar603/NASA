import { Suspense, useEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, SRGBColorSpace, TextureLoader, Vector3 } from 'three'
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

const earthPosition = [-520, 255, -1640] as const
// Use the Sun's bearing from Earth, rather than the light aimed at the outpost.
const earthSunDirection = new Vector3(...sunPosition).sub(new Vector3(...earthPosition)).normalize()

const earthVertex = `
  varying vec2 textureUv;
  varying vec3 surfaceNormal;
  varying vec3 viewDirection;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    textureUv = uv;
    surfaceNormal = normalMatrix * normal;
    viewDirection = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`

const earthFragment = `
  uniform sampler2D earthMap;
  uniform vec3 sunDirection;
  varying vec2 textureUv;
  varying vec3 surfaceNormal;

  void main() {
    vec3 normal = normalize(surfaceNormal);
    vec3 sunlight = (viewMatrix * vec4(sunDirection, 0.0)).xyz;
    float incidence = dot(normal, sunlight);
    float daylight = smoothstep(-0.12, 0.78, incidence);
    vec3 surface = texture2D(earthMap, textureUv).rgb;
    // Keep oceans and continents readable in the shadow while retaining the terminator.
    vec3 fill = vec3(0.31, 0.36, 0.44) * (1.0 - daylight);
    gl_FragColor = vec4(surface * (fill + daylight * 1.16), 1.0);
    #include <colorspace_fragment>
  }
`

const atmosphereFragment = `
  uniform vec3 sunDirection;
  varying vec3 surfaceNormal;
  varying vec3 viewDirection;
  void main() {
    vec3 normal = normalize(surfaceNormal);
    vec3 sunlight = (viewMatrix * vec4(sunDirection, 0.0)).xyz;
    float facing = max(dot(normal, normalize(viewDirection)), 0.0);
    float rim = pow(1.0 - facing, 5.0);
    float daylight = smoothstep(-0.2, 0.65, dot(normal, sunlight));
    gl_FragColor = vec4(0.24, 0.58, 1.0, rim * mix(0.14, 0.52, daylight));
  }
`

function Earth() {
  const texture = useLoader(TextureLoader, earthMap)
  const uniforms = useMemo(() => {
    texture.colorSpace = SRGBColorSpace
    return { earthMap: { value: texture }, sunDirection: { value: earthSunDirection } }
  }, [texture])
  return (
    <group position={earthPosition}>
      <mesh rotation={[0.14, 1.9, -0.26]}>
        <sphereGeometry args={[46, 48, 32]} />
        <shaderMaterial uniforms={uniforms} vertexShader={earthVertex} fragmentShader={earthFragment} />
      </mesh>
      <mesh>
        <sphereGeometry args={[47.2, 48, 32]} />
        <shaderMaterial uniforms={uniforms} vertexShader={earthVertex} fragmentShader={atmosphereFragment}
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
