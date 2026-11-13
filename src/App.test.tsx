import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { App } from './App'

it('welcomes the player into the seven-day Rookie Astronaut mission at the root', () => {
  const html = renderToStaticMarkup(<App />)
  expect(html).toContain('Level 1 · Rookie Astronaut')
  expect(html).toContain('Keep four astronauts safe for seven Moon days.')
  expect(html).toContain('>Start Mission</button>')
})
