import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { RepairActivity, repairLessons, type RepairLessonId } from './RepairActivity'

it.each(Object.keys(repairLessons) as RepairLessonId[])('opens %s with the department explanation', id => {
  const onTest = vi.fn(() => ({ complete: true }))
  const html = renderToStaticMarkup(<RepairActivity id={id} onTest={onTest} onClose={() => {}} onContinue={() => {}} />)

  expect(html).toContain('data-step="intro"')
  expect(html).toContain('Why ')
  expect(html).toContain('Next')
  expect(html).not.toContain(repairLessons[id].problem)
  expect(html).not.toContain('Choose a solution')
  expect(onTest).not.toHaveBeenCalled()
})
