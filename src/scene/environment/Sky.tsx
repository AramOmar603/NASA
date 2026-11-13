import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { noise, randomSequence } from './terrain'

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

function createEarthTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 384
  canvas.height = 192
  const context = canvas.getContext('2d')!
  const image = context.createImageData(canvas.width, canvas.height)
  for (let y = 0; y < canvas.height; y++) {
    const latitude = (y / canvas.height - 0.5) * Math.PI
    for (let x = 0; x < canvas.width; x++) {
      const longitude = x / canvas.width * Math.PI * 2
      const px = Math.cos(longitude) * Math.cos(latitude)
      const pz = Math.sin(longitude) * Math.cos(latitude)
      const py = Math.sin(latitude)
      const continents = noise(px * 3 + py * 1.15 + 8, pz * 3 + py * 2.1 + 4)
        + noise(px * 11 + py * 6, pz * 11 + py * 3) * 0.27
      const cloud = noise(px * 10 + py * 9, pz * 10 - py * 7) * 0.67
        + noise(px * 32 - py * 17, pz * 32 + py * 12) * 0.33
      const ice = Math.abs(py) > 0.925 + 0.06 * noise(px * 30, pz * 30)
      const land = continents > 0.72
      const color = ice ? [218, 230, 236] : land
        ? [95 + 52 * continents, 119 + 33 * continents, 68 + 26 * continents]
        : [17, 55 + 36 * continents, 113 + 70 * continents]
      const cover = Math.max(0, Math.min(0.92, (cloud - 0.52) * 3.4))
      const offset = (x + y * canvas.width) * 4
      for (let channel = 0; channel < 3; channel++) {
        image.data[offset + channel] = color[channel] * (1 - cover) + 242 * cover
      }
      image.data[offset + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function Sky() {
  const stars = useMemo(createStars, [])
  const earth = useMemo(createEarthTexture, [])
  useEffect(() => () => earth.dispose(), [earth])
  return (
    <>
      <color attach="background" args={['#020306']} />
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[stars.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={1.25} sizeAttenuation={false} vertexColors toneMapped={false} />
      </points>
      <mesh position={[-570, 270, -1760]} rotation={[0.16, 0.6, -0.26]}>
        <sphereGeometry args={[40, 48, 32]} />
        <meshStandardMaterial map={earth} roughness={0.85} />
      </mesh>
    </>
  )
}
