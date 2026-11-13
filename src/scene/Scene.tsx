import { Canvas } from '@react-three/fiber'
import type { GameViewProps } from '../types'

export function Scene({ state }: GameViewProps) {
  return (
    <div className="h-64 rounded-lg border border-slate-700" role="img" aria-label="Simulation scene">
      <Canvas camera={{ position: [6, 5, 6] }}>
        <gridHelper args={[10, 10]} />
        {state.buildings.map(({ id, position }) => (
          <mesh key={id} position={[position.x, 0.5, position.y]}>
            <boxGeometry />
            <meshNormalMaterial />
          </mesh>
        ))}
      </Canvas>
    </div>
  )
}
