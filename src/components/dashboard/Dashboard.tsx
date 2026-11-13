import type { GameViewProps } from '../../types'

export function Dashboard({ state }: GameViewProps) {
  return (
    <section aria-label="Simulation status" className="flex gap-6 text-slate-300">
      <p>Tick {state.tick}</p>
      <p>Buildings {state.buildings.length}</p>
    </section>
  )
}
