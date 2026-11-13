import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { LunarEnvironment } from './scene/environment'
import { LunarBase, outpost } from './scene/buildings'
import { SurvivalMission } from './components/dashboard/SurvivalMission'

function OutpostCamera() {
  const { camera, invalidate } = useThree()
  useEffect(() => {
    camera.position.set(43, 37, 82)
    camera.lookAt(0, 3, 0)
    invalidate()
  }, [camera, invalidate])
  return null
}

export function App() {
  return (
    <SurvivalMission buildings={outpost} renderWorld={(controls) => (
      <LunarEnvironment className="lg-survival-world">
        <OutpostCamera />
        <LunarBase {...controls} />
      </LunarEnvironment>
    )} />
  )
}
