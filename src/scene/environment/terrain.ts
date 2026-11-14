export const BASE_HALF_EXTENT = 70
export const BASE_ELEVATION = 0
export const TERRAIN_SIZE = 1600

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function fade(t: number) {
  const u = Math.max(0, Math.min(1, t))
  return u * u * (3 - 2 * u)
}

function hash(x: number, z: number) {
  let n = Math.imul(x, 374761393) + Math.imul(z, 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

export function noise(x: number, z: number) {
  const i = Math.floor(x)
  const j = Math.floor(z)
  const u = fade(x - i)
  const v = fade(z - j)
  return mix(mix(hash(i, j), hash(i + 1, j), u), mix(hash(i, j + 1), hash(i + 1, j + 1), u), v)
}

export function randomSequence(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

const craters = [
  [142, -80, 66], [-155, 52, 70], [-102, -132, 34], [72, 140, 41],
  [274, 90, 86], [-314, -153, 102], [230, -285, 120], [-215, 282, 114],
]
const sample = randomSequence(73)
for (let i = 0; i < 95; i++) {
  craters.push([(sample() - 0.5) * 1450, (sample() - 0.5) * 1450, 7 + sample() ** 2 * 34])
}

export function terrainHeight(x: number, z: number) {
  const blend = fade((Math.max(Math.abs(x), Math.abs(z)) - BASE_HALF_EXTENT - 4) / 40)
  if (blend === 0) return BASE_ELEVATION

  const range = Math.hypot(x, z)
  const angle = Math.atan2(z, x)
  const ridgeCenter = 535 + 65 * Math.sin(angle * 5) + 29 * Math.cos(angle * 11)
  const ridge = Math.exp(-(((range - ridgeCenter) / 125) ** 2))
  const peaks = noise(x / 135, z / 135)
  let height = (noise(x / 110, z / 110) - 0.5) * 16
    + (noise(x / 35, z / 35) - 0.5) * 5
    + (noise(x / 10, z / 10) - 0.5) * 1.5
    + ridge * (12 + 57 * peaks + 11 * noise(x / 65, z / 65))

  for (const [cx, cz, radius] of craters) {
    const dx = x - cx
    const dz = z - cz
    if (Math.abs(dx) > radius * 1.7 || Math.abs(dz) > radius * 1.7) continue
    const r = Math.hypot(dx, dz) / radius + (noise(x / 19, z / 19) - 0.5) * 0.09
    if (r > 1.7) continue
    const bowl = (1 - fade((r - 0.17) / 0.84)) * radius * 0.20
    const rim = Math.exp(-(((r - 1) / 0.18) ** 2)) * radius * 0.058
    const ejecta = (1 - fade((r - 1) / 0.7)) * fade((r - 0.75) / 0.28) * radius * 0.023
    height += rim + ejecta - bowl
  }

  return height * blend
}
