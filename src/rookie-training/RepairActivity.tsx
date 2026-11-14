import { useEffect, useState } from 'react'
import { useReducedMotion } from './RepairEffects'
import type { Equipment } from '../engine/survival'

export type RepairLessonId = Equipment | 'roverFixed' | 'waterFixed' | 'recyclerMaintenance'
type Lesson = {
  icon: string
  problem: string
  detail: string
  question: string
  choices: readonly { label: string; why?: string }[]
  success: string
  science?: { explanation: string; url: string }
}

const water: Lesson = {
  icon: '💧', problem: 'The water stopped!', detail: 'Used water reaches the highlighted filter and stops there.',
  question: 'How can we get water through the recycler again?',
  choices: [
    { label: '🧰 Replace the blocked filter' },
    { label: '💦 Send in more used water', why: 'More water still can’t pass through the blockage.' },
    { label: '🪣 Empty the clean-water tank', why: 'That makes room, but it doesn’t clear the blocked filter.' },
  ],
  success: 'Water is flowing through the recycler again!',
  science: {
    explanation: 'NASA recovers water from cabin humidity and crew wastewater through several treatment steps.',
    url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/',
  },
}

export const repairLessons: Record<RepairLessonId, Lesson> = {
  greenhouse: {
    icon: '🌱', problem: 'Oh no! Our plants are thirsty!', detail: 'The highlighted watering line has stopped and the leaves are drooping.',
    question: 'What should we do to help the plants?',
    choices: [
      { label: '☀️ Add more light', why: 'Light helps plants grow, but their roots are still dry.' },
      { label: '💧 Restore the water flow' },
      { label: '🔧 Check a different machine', why: 'That leaves the watering line blocked. The roots still need water.' },
    ],
    success: 'Water is flowing again, and the plants are perking up!',
  },
  solar: {
    icon: '☀️', problem: 'The solar panel is out of line!', detail: 'The highlighted panel is tilted away from the sunlight.',
    question: 'Which direction will help the panel collect more sunlight?',
    choices: [
      { label: '🌑 Face it into shadow', why: 'Shade blocks the light the panel needs.' },
      { label: '⬇️ Turn it toward the ground', why: 'Facing the ground keeps direct sunlight off the cells.' },
      { label: '☀️ Turn it toward the Sun' },
    ],
    success: 'The panel faces the sunlight and can make electricity again!',
  },
  oxygenPlant: {
    icon: '🫧', problem: 'The oxygen machine stopped!', detail: 'The blinking red gauge shows a power fault.',
    question: 'What will help the machine make oxygen again?',
    choices: [
      { label: '⚡ Restore its electrical supply' },
      { label: '💧 Send more water', why: 'The machine needs water, but it still needs electricity to split it.' },
      { label: '🌀 Open an air vent', why: 'A vent moves air. It doesn’t make oxygen or power the machine.' },
    ],
    success: 'The machine has power to make oxygen again!',
  },
  recycler: water,
  waterFixed: {
    ...water,
    detail: 'The filter is blocked. One kit is set aside, and the crew needs clean water before the rover can go exploring.',
    question: 'How should we use the reserved kit to get the crew clean water?',
    choices: [
      water.choices[0],
      water.choices[1],
      { label: '🚙 Save the kit for the rover', why: 'Exploration can wait. The crew needs clean water every day.' },
    ],
  },
  recyclerMaintenance: {
    ...water,
    problem: 'The recycler has a new fault!',
    detail: 'Your Day 9 training is complete. Check this new equipment fault to get the recycler working again.',
    question: 'What should we do about the new recycler fault?',
  },
  shielding: {
    icon: '🛡️', problem: 'The shelter has a weak spot!', detail: 'The highlighted patch needs inspection before the crew can rely on it.',
    question: 'What would restore the shelter’s protection?',
    choices: [
      { label: '💡 Turn on more lights', why: 'Light helps us see the patch, but doesn’t replace shielding.' },
      { label: '🧱 Restore the shielding panel' },
      { label: '🎨 Paint over the gap', why: 'A thin coat of paint doesn’t provide the missing protection.' },
    ],
    success: 'The shelter’s shielding is back in place!',
  },
  roverFixed: {
    icon: '🚙', problem: 'The Moon Explorer’s wheel is stuck!', detail: 'Dust got past the highlighted cover near the axle.',
    question: 'How can we free the wheel and protect its axle?',
    choices: [
      { label: '🧽 Wipe only the wheel rim', why: 'The rim looks cleaner, but dust still blocks the axle.' },
      { label: '🔋 Swap the battery', why: 'A different battery doesn’t remove dust trapped near the axle.' },
      { label: '🛡️ Clear the dust and fit a seal' },
    ],
    success: 'The wheel turns again, and the seal helps keep dust out!',
    science: {
      explanation: 'Moon dust can wear down moving parts. NASA studied dust barriers and seals for the VIPER rover.',
      url: 'https://ntrs.nasa.gov/citations/20250005201',
    },
  },

}

export function RepairActivity({ id, onTest, onClose, onContinue }: {
  id: RepairLessonId
  onTest: () => { complete: boolean; message?: string }
  onClose: () => void
  onContinue: () => void
}) {
  const lesson = repairLessons[id]
  const [step, setStep] = useState<'problem' | 'choices' | 'retry' | 'success'>('problem')
  const [choice, select] = useState<number>()
  const reducedMotion = useReducedMotion()
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (!leaving) return
    const timer = window.setTimeout(() => {
      setLeaving(false)
      setStep('choices')
    }, 150)
    return () => window.clearTimeout(timer)
  }, [leaving])
  const [feedback, setFeedback] = useState('')

  function testSolution() {
    if (step !== 'choices' || choice === undefined) return
    const answer = lesson.choices[choice]
    if (answer.why) {
      setFeedback(answer.why)
      setStep('retry')
      return
    }
    const result = onTest()
    setFeedback(result.complete ? lesson.success : result.message ?? 'The problem is still there.')
    setStep(result.complete ? 'success' : 'retry')
  }

  return <section className="repair-card" data-step={step} aria-label="Repair activity">
    <button className="repair-close" type="button" aria-label="Close repair" onClick={onClose}>×</button>
    <div key={step} className="repair-card-page" data-leaving={leaving}>
      <span className="repair-card-icon" aria-hidden="true">{step === 'success' ? '🎉' : step === 'retry' ? '🤔' : lesson.icon}</span>
      <h2>{step === 'problem' ? lesson.problem : step === 'choices' ? lesson.question : step === 'retry' ? 'Good try!' : 'Great job, Commander!'}</h2>
      {step === 'problem' && <><p>{lesson.detail}</p><button autoFocus type="button" disabled={leaving} onClick={() => reducedMotion ? setStep('choices') : setLeaving(true)}>Next →</button></>}
      {step === 'choices' && <>
        <div className="repair-choices" role="group" aria-label="Choose a solution">
          {lesson.choices.map(({ label }, index) => <button key={label} type="button" autoFocus={index === 0}
            aria-pressed={choice === index} onClick={() => select(index)}>{label}</button>)}
        </div>
        {choice !== undefined && <button type="button" onClick={testSolution}>🧪 Test solution</button>}
      </>}
      {(step === 'retry' || step === 'success') && <p role="status">{feedback}</p>}
      {step === 'retry' && <button autoFocus type="button" onClick={() => { select(undefined); setStep('choices') }}>↻ Try again</button>}
      {step === 'success' && <button autoFocus type="button" onClick={onContinue}>Continue →</button>}
      {step === 'success' && lesson.science && <details><summary>NASA Science</summary>
        <p>{lesson.science.explanation}</p><a href={lesson.science.url} target="_blank" rel="noreferrer">Read the NASA source</a>
      </details>}
    </div>
  </section>
}
