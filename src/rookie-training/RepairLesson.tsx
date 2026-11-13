import { useState } from 'react'
import type { Equipment } from '../engine/survival'

interface RepairActivity {
  title: string
  explanation: string
  steps: readonly { question: string; choices: readonly string[]; answer: string; hint: string }[]
}

export const repairActivities: Partial<Record<Equipment, RepairActivity>> = {
  greenhouse: {
    title: 'Greenhouse irrigation',
    explanation: 'In this training scenario, a leak lets water escape before it reaches the roots. Plants need water to grow food.',
    steps: [
      { question: 'Where is the water escaping?', choices: ['Grow light', 'Dripping tube'], answer: 'Dripping tube', hint: 'Follow the drops. The light helps plants grow, but it carries no water.' },
      { question: 'What will carry water past the leak?', choices: ['A sealed tube', 'A solid plug'], answer: 'A sealed tube', hint: 'A plug blocks the water. A tube lets water reach the roots.' },
      { question: 'Connect the replacement tube.', choices: ['Tank → tube → roots', 'Roots → tube → light'], answer: 'Tank → tube → roots', hint: 'Water travels from the tank to the roots.' },
      { question: 'Which result passes the leak test?', choices: ['Water drips onto the floor', 'Water reaches the roots with no drips'], answer: 'Water reaches the roots with no drips', hint: 'A sealed connection keeps water inside the tube.' },
    ],
  },
}

export function RepairLesson({ activity, unavailable, onClose, onFinish }: {
  activity: RepairActivity
  unavailable?: string
  onClose: () => void
  onFinish: () => void
}) {
  const [stage, setStage] = useState(0)
  const [hint, setHint] = useState('')
  const step = activity.steps[stage]
  return <section className="rookie-lesson" aria-label="Repair training">
    <h2>{activity.title}</h2>
    <p>Inspect → Diagnose → Repair → Test</p>
    <p aria-label="Irrigation diagram">🚰 Tank → {stage < 3 ? '💧 Leaking tube' : 'Sealed tube'} → 🌱 Roots</p>
    <p>{activity.explanation}</p>
    {step ? <>
      <h3>{stage + 1} / {activity.steps.length} · {step.question}</h3>
      {step.choices.map((choice) => <button className="lg-button" type="button" key={choice} onClick={() => {
        if (choice === step.answer) {
          setStage(stage + 1)
          setHint('')
        } else setHint(step.hint)
      }}>{choice}</button>)}
    </> : <>
      <p>Test passed. Water stays in the tube and reaches the plants.</p>
      <button className="lg-button" type="button" disabled={Boolean(unavailable)} onClick={onFinish}>Apply repair · 1 spare kit</button>
      {unavailable && <p>{unavailable}</p>}
    </>}
    <p role="status">{hint}</p>
    <button className="lg-button" type="button" onClick={onClose}>Return to base view</button>
  </section>
}
