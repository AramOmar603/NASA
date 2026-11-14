import { useEffect, useMemo } from 'react'
import { Color, DataTexture, IcosahedronGeometry, LinearFilter, LinearMipmapLinearFilter, Object3D, PlaneGeometry, RepeatWrapping, RGBAFormat, SRGBColorSpace, InstancedMesh, MeshStandardMaterial } from 'three'
import { BASE_HALF_EXTENT, noise, randomSequence, TERRAIN_SIZE, terrainHeight } from './terrain'

function createRegolith() {
  const size = 128
  const pixels = new Uint8Array(size * size * 4)
  const random = randomSequence(81)
  for (let i = 0; i < size * size; i++) {
    const gray = Math.floor(157 + random() * 37 + (random() < 0.03 ? -28 : 0))
    pixels.set([gray, gray, gray, 255], i * 4)
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(200, 200)
  texture.generateMipmaps = true
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

// Concentrate vertices near the landing zone and nearby craters.
function groundCoordinate(value: number) {
  const t = value / (TERRAIN_SIZE / 2)
  return (0.34 * t + 0.66 * t ** 3) * TERRAIN_SIZE / 2
}

function createGround() {
  const geometry = new PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 244, 244)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  const uv = geometry.attributes.uv
  const colors = new Float32Array(position.count * 3)
  const color = new Color()
  for (let i = 0; i < position.count; i++) {
    const x = groundCoordinate(position.getX(i))
    const z = groundCoordinate(position.getZ(i))
    position.setXYZ(i, x, terrainHeight(x, z), z)
    uv.setXY(i, x / TERRAIN_SIZE + 0.5, z / TERRAIN_SIZE + 0.5)
    const gray = 0.38 + 0.18 * noise(x / 52, z / 52) + 0.06 * noise(x / 9, z / 9)
    color.setRGB(gray * 1.02, gray, gray * 0.96).toArray(colors, i * 3)
  }
  geometry.computeVertexNormals()
  return { geometry, colors }
}

function createRocks() {
  const geometry = new IcosahedronGeometry(1, 0)
  const material = new MeshStandardMaterial({ roughness: 1, flatShading: true })
  const rocks = new InstancedMesh(geometry, material, 1150)
  const transform = new Object3D()
  const color = new Color()
  const random = randomSequence(28)
  for (let i = 0; i < rocks.count; i++) {
    const angle = random() * Math.PI * 2
    const radius = 75 + random() ** 1.5 * 570
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    // Reserve clearance for a rotated rock with a maximum radius of 4.75 m.
    if (Math.max(Math.abs(x), Math.abs(z)) <= BASE_HALF_EXTENT + 4.75) {
      i--
      continue
    }
    const size = 0.20 + random() ** 4 * 3.6
    transform.position.set(x, terrainHeight(x, z) + size * 0.18, z)
    transform.rotation.set(random(), random() * Math.PI * 2, random())
    transform.scale.set(size, size * (0.45 + random() * 0.4), size * (0.65 + random() * 0.6))
    transform.updateMatrix()
    rocks.setMatrixAt(i, transform.matrix)
    const gray = 0.12 + random() * 0.24
    rocks.setColorAt(i, color.setRGB(gray * 1.05, gray, gray * 0.94))
  }
  rocks.castShadow = true
  rocks.receiveShadow = true
  return rocks
}

export function Surface() {
  const ground = useMemo(createGround, [])
  const texture = useMemo(createRegolith, [])
  const rocks = useMemo(createRocks, [])
  useEffect(() => () => {
    ground.geometry.dispose()
    texture.dispose()
    rocks.dispose()
    rocks.geometry.dispose()
    rocks.material.dispose()
  }, [ground, texture, rocks])

  return (
    <>
      <mesh geometry={ground.geometry} receiveShadow castShadow>
        <bufferAttribute attach="geometry-attributes-color" args={[ground.colors, 3]} />
        <meshStandardMaterial map={texture} bumpMap={texture} bumpScale={0.12} roughness={1} vertexColors />
      </mesh>
      <primitive object={rocks} />
    </>
  )
}
