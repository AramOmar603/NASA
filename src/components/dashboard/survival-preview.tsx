import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { createRoot } from 'react-dom/client'
import { LunarEnvironment } from '../../scene/environment'
import { LunarBase, outpost } from '../../scene/buildings'
import { SurvivalMission } from './SurvivalMission'
import '../../styles.css'

function OutpostCamera() {
  const { camera, invalidate } = useThree()
  useEffect(() => {
    camera.position.set(43, 37, 82)
    camera.lookAt(0, 3, 0)
    invalidate()
  }, [camera, invalidate])
  return null
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<SurvivalMission buildings={outpost} renderWorld={(controls) => (
    <LunarEnvironment className="lg-survival-world">
      <OutpostCamera />
      <LunarBase {...controls} />
    </LunarEnvironment>
  )} />)
}
