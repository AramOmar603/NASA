import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { LunarBase, outpost } from '../scene/buildings'
import { BASE_ELEVATION, LunarEnvironment } from '../scene/environment'

const habitat = outpost.find(({ kind }) => kind === 'habitat')!
const descentMs = 2900
const fadeMs = 650

function LandingCamera({ startedAt }: { startedAt?: number }) {
  const look = useRef(new Vector3())
  const { x, y: z } = habitat.position

  useFrame(({ camera, invalidate }) => {
    const progress = startedAt === undefined ? 0 : Math.min(1, (performance.now() - startedAt) / descentMs)
    const t = progress ** 3 * (10 - 15 * progress + 6 * progress ** 2)
    camera.position.set(x + 46 * (1 - t), BASE_ELEVATION + 4 + 83 * (1 - t), z + 10 + 112 * (1 - t))
    camera.lookAt(look.current.set(x, BASE_ELEVATION + 3, z))
    if (startedAt !== undefined && progress < 1) invalidate()
  })

  return null
}

export function OutpostLanding({ descending, arriving, onTouchdown, onFinish }: {
  descending: boolean
  arriving: boolean
  onTouchdown: () => void
  onFinish: () => void
}) {
  const start = useRef<number>(undefined)
  if (descending && start.current === undefined) start.current = performance.now()
  const callbacks = useRef({ onTouchdown, onFinish })
  useEffect(() => { callbacks.current = { onTouchdown, onFinish } }, [onTouchdown, onFinish])
  useEffect(() => {
    if (!descending && !arriving) return
    const timer = window.setTimeout(() => {
      if (arriving) callbacks.current.onFinish()
      else callbacks.current.onTouchdown()
    }, arriving ? fadeMs : descentMs)
    return () => window.clearTimeout(timer)
  }, [arriving, descending])

  return (
    <section className="outpost-landing" data-arriving={arriving} aria-hidden={!descending && !arriving} aria-label="Landing at the Home Center">
      <LunarEnvironment className="outpost-landing-world" interactive={false}>
        <LandingCamera startedAt={start.current} />
        <LunarBase showMarkers={false} />
      </LunarEnvironment>
      <p role="status">🏠 Approaching your crew’s Home Center…</p>
    </section>
  )
}
