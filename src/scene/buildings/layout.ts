import type { Building } from '../../types'

export const buildingKinds = ['habitat', 'greenhouse', 'solar-array', 'oxygen-generator',
  'water-recycler', 'battery', 'radiation-shelter', 'rover'] as const
export type BaseBuildingKind = (typeof buildingKinds)[number]

export const outpost = [
  { id: 'HAB-01', kind: 'habitat', position: { x: 0, y: 0 } },
  { id: 'BIO-01', kind: 'greenhouse', position: { x: 0, y: 24 } },
  { id: 'SOL-01', kind: 'solar-array', position: { x: 29, y: 21 } },
  { id: 'OXY-01', kind: 'oxygen-generator', position: { x: 0, y: -18 } },
  { id: 'WTR-01', kind: 'water-recycler', position: { x: 21, y: 0 } },
  { id: 'PWR-01', kind: 'battery', position: { x: 29, y: -21 } },
  { id: 'SHD-01', kind: 'radiation-shelter', position: { x: -23, y: 0 } },
  { id: 'ROV-01', kind: 'rover', position: { x: -23, y: 19 } },
] as const satisfies readonly Building[]

export const corridors = [
  { x: -13, z: 0, length: 12, axis: 'x' },
  { x: 13, z: 0, length: 11, axis: 'x' },
  { x: 0, z: -9, length: 12, axis: 'z' },
  { x: 0, z: 12, length: 17, axis: 'z' },
] as const
