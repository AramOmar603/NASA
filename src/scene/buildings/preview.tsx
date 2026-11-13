import { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { createRoot } from 'react-dom/client'
import { LunarEnvironment } from '../environment'
import { LunarBase, outpost } from './index'

function PreviewFraming() {
  const { camera, invalidate } = useThree()
  useEffect(() => {
    camera.position.set(43, 37, 82)
    camera.lookAt(0, 3, 0)
    invalidate()
  }, [camera, invalidate])
  return null
}

function Preview() {
  const [selected, select] = useState<string>()
  const building = outpost.find(({ id }) => id === selected)

  return <main>
    <header>
      <h1>LUNARIS · Shackleton Outpost</h1>
      <p>Drag to orbit, scroll to zoom, or select a structure.</p>
      <p><output>{building ? building.id + ' · ' + building.kind.replaceAll('-', ' ') : 'Select a building'}</output></p>
    </header>
    <LunarEnvironment className="viewport">
      <PreviewFraming />
      <LunarBase selectedBuildingId={selected} onBuildingSelect={select} onGroundSelect={() => select(undefined)} />
    </LunarEnvironment>
  </main>
}

const root = document.getElementById('root')
if (root) createRoot(root).render(<Preview />)
