import { BoxGeometry, BufferGeometry, CylinderGeometry, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { BaseBuildingKind } from './layout'

export const finishes = {
  ceramic: { color: '#e3e9ed', roughness: 0.58 },
  frame: { color: '#364956', metalness: 0.46, roughness: 0.54 },
  dark: { color: '#152232', roughness: 0.8 },
  orange: { color: '#f0ad50', roughness: 0.66 },
  blue: { color: '#19386e', metalness: 0.52, roughness: 0.34 },
  cells: { color: '#355fa0', metalness: 0.45, roughness: 0.4 },
  window: { color: '#122e43', emissive: '#42a3bd', emissiveIntensity: 0.64, roughness: 0.22 },
  glass: { color: '#a5edff', transparent: true, opacity: 0.14, depthWrite: false, roughness: 0.15 },
  leaf: { color: '#429e52', roughness: 0.85 },
  shoot: { color: '#92c964', roughness: 0.78 },
  grow: { color: '#d9fff1', emissive: '#78ffd8', emissiveIntensity: 1.6, toneMapped: false },
  soil: { color: '#2c2928', roughness: 1 },
} as const
type Finish = keyof typeof finishes

class Structure {
  private batches = new Map<Finish, BufferGeometry[]>()

  private add(finish: Finish, geometry: BufferGeometry, x: number, y: number, z: number, rx: number, ry: number, rz: number) {
    geometry.applyMatrix4(new Matrix4().compose(
      new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(rx, ry, rz)), new Vector3(1, 1, 1),
    ))
    const batch = this.batches.get(finish) ?? []
    batch.push(geometry)
    this.batches.set(finish, batch)
  }

  box(finish: Finish, x: number, y: number, z: number, w: number, h: number, d: number, rx = 0, ry = 0, rz = 0) {
    this.add(finish, new BoxGeometry(w, h, d), x, y, z, rx, ry, rz)
  }

  tube(finish: Finish, x: number, y: number, z: number, radius: number, length: number,
    rx = 0, rz = 0, sides = 12, topRadius = radius) {
    this.add(finish, new CylinderGeometry(topRadius, radius, length, sides), x, y, z, rx, 0, rz)
  }

  finish() {
    return [...this.batches].map(([finish, parts]) => {
      const geometry = mergeGeometries(parts)!
      parts.forEach((part) => part.dispose())
      return { finish, geometry }
    })
  }
}

const horizontal = Math.PI / 2

function deck(s: Structure, w: number, d: number) {
  s.box('frame', 0, 0.2, 0, w, 0.4, d)
  for (const x of [-w / 2 + 0.8, w / 2 - 0.8]) {
    s.box('orange', x, 0.42, 0, 0.2, 0.08, d - 0.6)
  }
}

function habitat(s: Structure) {
  deck(s, 18, 8)
  s.tube('ceramic', 0, 3.15, 0, 2.65, 16, 0, horizontal, 12)
  for (const x of [-7.8, -4, 0, 4, 7.8]) s.tube('frame', x, 3.15, 0, 2.75, 0.26, 0, horizontal)
  for (const x of [-6, -2, 2, 6]) {
    for (const z of [-2.56, 2.56]) {
      s.box('dark', x, 3.4, z, 2.35, 1.03, 0.2)
      s.box('window', x, 3.4, z * 1.04, 1.87, 0.67, 0.13)
    }
  }
  s.box('orange', 0, 5.82, 0, 6, 0.13, 0.65)
  s.tube('frame', -4, 6.52, 0, 0.1, 1.45)
  s.tube('ceramic', -4, 7.24, 0, 0.79, 0.16, 0.48, 0, 12, 0.46)
}

function greenhouse(s: Structure) {
  deck(s, 12, 16)
  for (const x of [-5.8, 5.8]) {
    for (const z of [-7.7, -3.85, 0, 3.85, 7.7]) s.box('frame', x, 2.35, z, 0.24, 4.1, 0.23)
    s.box('frame', x, 4.4, 0, 0.23, 0.23, 16)
    s.box('glass', x, 2.52, 0, 0.07, 3.7, 15.7)
    s.box('glass', x / 2, 5.25, 0, 6.1, 0.07, 15.7, 0, 0, -Math.sign(x) * 0.285)
    for (const z of [-7.7, -3.85, 0, 3.85, 7.7]) {
      s.box('frame', x / 2, 5.26, z, 6.1, 0.18, 0.17, 0, 0, -Math.sign(x) * 0.285)
    }
  }
  s.box('frame', 0, 6.12, 0, 0.2, 0.19, 16)
  for (const z of [-7.8, 7.8]) s.box('glass', 0, 2.52, z, 11.65, 3.7, 0.07)
  for (const x of [-3.65, 0, 3.65]) {
    s.box('ceramic', x, 0.75, 0, 2.45, 0.7, 12.8)
    s.box('soil', x, 1.14, 0, 2.18, 0.12, 12.45)
    s.box('grow', x, 4.05, 0, 0.22, 0.13, 12.8)
    for (let row = 0; row < 9; row++) {
      for (const dx of [-0.55, 0.55]) {
        const z = row * 1.3 - 5.2
        s.tube('leaf', x + dx, 1.45, z, 0.14, 0.58, 0, 0, 5, 0.06)
        s.box('shoot', x + dx, 1.56, z, 0.73, 0.12, 0.29, 0, row * 0.7, 0.45)
        s.box('leaf', x + dx, 1.73, z, 0.62, 0.13, 0.27, 0, row * 0.7 + 1.5, -0.51)
      }
    }
  }
}

function solar(s: Structure) {
  const tilt = 0.44
  for (const z of [-5, 5]) {
    for (const x of [-6, 6]) {
      s.box('frame', x, 0.22, z, 2.4, 0.44, 2.7)
      s.tube('frame', x, 1.6, z, 0.24, 2.85)
      s.box('frame', x, 3.05, z, 11, 0.26, 5.8, tilt)
      s.box('blue', x, 3.22, z, 10.7, 0.12, 5.55, tilt)
      for (let col = -5; col <= 5; col++) {
        for (let row = -2; row <= 2; row++) {
          s.box('cells', x + col * 0.95, 3.30 - row * Math.sin(tilt), z + row * Math.cos(tilt),
            0.9, 0.035, 0.93, tilt)
        }
      }
    }
  }
}

function utility(s: Structure, kind: 'oxygen-generator' | 'water-recycler' | 'battery') {
  deck(s, 13, 10)
  const water = kind === 'water-recycler'
  const battery = kind === 'battery'
  s.box('ceramic', 0, 2.05, -1, 11.5, 3.3, 6)
  s.box('frame', 0, 3.75, -1, 12, 0.23, 6.4)
  s.box(water ? 'blue' : 'orange', 0, 2.9, 2.05, 11, 0.28, 0.13)
  for (const x of [-4, 0, 4]) {
    s.box('dark', x, 1.7, 2.13, 2.2, 1.9, 0.24)
    for (let vent = 0; vent < 5; vent++) s.box('frame', x, 1.13 + vent * 0.27, 2.28, 1.8, 0.09, 0.09)
    if (!battery) {
      s.tube(water ? 'blue' : 'ceramic', x, 2.05, 3.7, 0.94, 3.27)
      s.tube('frame', x, 2.92, 3.7, 0.98, 0.18)
      s.tube('frame', x, 3.83, 3.7, 0.23, 0.35)
    } else {
      s.box('orange', x, 1.17, 3.42, 2.3, 1.53, 1.8)
      s.box('dark', x, 1.95, 3.42, 2.4, 0.16, 1.95)
    }
  }
  s.tube('frame', 0, battery ? 2.25 : 4.12, 3.7, 0.13, 9.8, 0, horizontal)
}

function shelter(s: Structure) {
  deck(s, 14, 12)
  s.tube('frame', 0, 2.12, 0, 5.25, 3.5, 0, 0, 8, 3.7)
  s.tube('ceramic', 0, 3.89, 0, 3.65, 0.35, 0, 0, 8)
  s.box('frame', 0, 1.61, 4.2, 3.4, 2.45, 2.2)
  s.box('orange', 0, 1.55, 5.32, 2.5, 2.2, 0.14)
  s.box('dark', 0, 1.51, 5.42, 1.9, 1.92, 0.15)
  for (const x of [-2.4, 2.4]) s.box('orange', x, 4.1, 0, 0.32, 0.09, 4.8)
}

function rover(s: Structure) {
  s.box('ceramic', 0, 1.13, 0, 2.7, 0.62, 3.6)
  s.box('orange', 0, 1.51, 0.74, 2.4, 0.21, 1.9)
  s.box('dark', 0, 1.7, -0.6, 1.5, 0.43, 0.67)
  for (const x of [-1.55, 1.55]) {
    for (const z of [-1.42, 0, 1.42]) {
      s.tube('dark', x, 0.56, z, 0.56, 0.42, 0, horizontal)
      s.tube('frame', x * 1.14, 0.56, z, 0.32, 0.1, 0, horizontal)
    }
  }
  s.tube('frame', 0.8, 2.1, -1.25, 0.07, 1.35)
  s.box('grow', 0.8, 2.8, -1.25, 0.15, 0.15, 0.15)
}

const builders: Record<BaseBuildingKind, (s: Structure) => void> = {
  habitat, greenhouse, 'solar-array': solar, 'radiation-shelter': shelter, rover,
  'oxygen-generator': (s) => utility(s, 'oxygen-generator'),
  'water-recycler': (s) => utility(s, 'water-recycler'),
  battery: (s) => utility(s, 'battery'),
}

export function makeBuilding(kind: string) {
  const structure = new Structure()
  if (Object.hasOwn(builders, kind)) builders[kind as BaseBuildingKind](structure)
  else utility(structure, 'battery')
  return structure.finish()
}

export function makeCorridor(length: number) {
  const s = new Structure()
  s.box('frame', 0, 0.18, 0, 3.6, 0.36, length)
  s.tube('ceramic', 0, 1.72, 0, 1.34, length, horizontal, 0, 8)
  const ribCount = Math.ceil(length / 2)
  for (let index = 0; index <= ribCount; index++) {
    s.tube('frame', 0, 1.72, -length / 2 + length * index / ribCount, 1.42, 0.17, horizontal, 0, 8)
  }
  s.box('orange', 0, 3.08, 0, 0.4, 0.08, length)
  return s.finish()
}

export type Model = ReturnType<typeof makeBuilding>
