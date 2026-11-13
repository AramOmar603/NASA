import { createRoot } from 'react-dom/client'
import { LunarEnvironment } from './LunarEnvironment'

createRoot(document.getElementById('root')!).render(
  <main>
    <header><h1>LUNARIS</h1><p>Lunar surface</p></header>
    <LunarEnvironment className="scene" />
    <footer>Drag to orbit · Scroll or pinch to zoom · Right-drag or two-finger drag to pan</footer>
  </main>,
)
