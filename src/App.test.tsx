import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { App } from './App'
import { MissionFeedback } from './mission-feedback/MissionFeedback'

it('welcomes the player into the seven-day Rookie Astronaut mission at the root', () => {
  const html = renderToStaticMarkup(<App />)
  expect(html).toContain('<h1 id="welcome-title">LAMOON</h1>')
  expect(html).toContain('Level 1 · Rookie Astronaut')
  expect(html).toContain('Keep four astronauts safe for seven Moon days.')
  expect(html).toContain('EXPLORE THE MOON BASE!')
  expect(html).toContain('Skip Tour &amp; Start Playing')
})

it('keeps the main actions and live resources visible without opening a building card', () => {
  const html = renderToStaticMarkup(<MissionFeedback trainingLevel={2} startAtHabitat />)

  expect(html).toContain('aria-label="Mission status"')
  expect(html).toContain('<dd>0 / 10</dd>')
  expect(html).toContain('Electricity')
  expect(html).toContain('▶ Next Day')
  expect(html).toContain('🏠 Home')
  expect(html).toContain('🗺️ Map')
  expect(html).toContain('❓ Help')
  expect(html).not.toContain('mission-building-card')
  expect(html).not.toContain('Mission log')
})
