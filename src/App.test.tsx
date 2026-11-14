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
  expect(html).not.toContain('Take the Base Tour')
  expect(html).toContain('🚀 SKIP TOUR &amp; START LEVEL 1')
})

it.each([[1, 7], [2, 10]] as const)(
  'renders the Level %i Moon base with one status bar and one action dock',
  (level, missionDays) => {
    const html = renderToStaticMarkup(<MissionFeedback trainingLevel={level} startAtHabitat />)

    expect(html).toContain('aria-label="Mission status"')
    expect(html).toContain(`<dd>0 / ${missionDays}</dd>`)
    expect(html).toContain('Electricity')
    expect(html).toContain('▶ Next Day')
    expect(html).toContain('🏠 Home')
    expect(html).toContain('🗺️ Map')
    expect(html).toContain('❓ Help')
    expect(html).not.toContain('mission-building-card')
    expect(html).not.toContain('Mission log')
    expect(html).toContain('class="mission-dock"')
    expect(html).not.toContain('lg-survival-controls')
    expect(html).not.toContain('lg-building')
    expect(html).not.toContain('LUNARIS')
  },
)
