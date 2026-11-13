import { Dashboard } from './components/dashboard/Dashboard'
import { initialGameState } from './engine/initialGameState'
import { Scene } from './scene/Scene'

export function App() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-semibold">NASA</h1>
        <Scene state={initialGameState} />
        <Dashboard state={initialGameState} />
      </div>
    </main>
  )
}
