import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import { outpost } from '../scene/buildings'

export function TrainingFocus({ active }: { active: boolean }) {
  const { camera, size, invalidate } = useThree()
  const zoom = useRef(1)
  const point = useMemo(() => new Vector3(), [])
  const greenhouse = outpost.find(({ id }) => id === 'BIO-01')!
  useEffect(() => { invalidate() }, [active, invalidate])
  useFrame((_, delta) => {
    if (!(camera instanceof PerspectiveCamera)) return
    const target = active ? 1.8 : 1
    if (Math.abs(zoom.current - target) < 0.005) zoom.current = target
    else {
      zoom.current += (target - zoom.current) * Math.min(0.25, delta * 7)
      invalidate()
    }
    camera.clearViewOffset()
    if (zoom.current === 1) return
    point.set(greenhouse.position.x, 3, greenhouse.position.y).project(camera)
    const width = size.width / zoom.current
    const height = size.height / zoom.current
    const blend = (zoom.current - 1) / 0.8
    camera.setViewOffset(size.width, size.height,
      (size.width - width) / 2 + point.x * size.width / 2 * blend,
      (size.height - height) / 2 - point.y * size.height / 2 * blend,
      width, height)
  }, -1)
  useEffect(() => () => {
    if (camera instanceof PerspectiveCamera) camera.clearViewOffset()
  }, [camera])
  return null
}
