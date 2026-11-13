import { useRef, useState } from 'react'

export type LessonEquipment = 'solar' | 'oxygenPlant'

const lessons = {
  solar: {
    title: 'Solar panel inspection',
    target: '☀️ Sunlight → ▧ Solar panel',
    inspect: 'Follow the sunlight to the solar panel. Tap the highlighted panel.',
    prompt: 'Turn the panel toward the Sun, then test it.',
    reading: 'Solar electricity last day',
    unit: 'kWh',
  },
  oxygenPlant: {
    title: 'Oxygen generator inspection',
    target: '⚡ Power → 🫧 Oxygen generator',
    inspect: 'The astronauts need air. Tap the highlighted oxygen generator.',
    prompt: 'Which machine needs power right now to make oxygen?',
    choices: [
      ['🌱 Greenhouse', false, 'The greenhouse grows food in our base. The oxygen machine still needs power.'],
      ['🫧 Oxygen generator', true, '⚡ With power, the oxygen generator can make air again!'],
      ['💧 Water recycler', false, 'The recycler saves water. The oxygen machine is still stopped.'],
    ],
    reading: 'Oxygen made last day',
    unit: 'kg',
  },
} as const

export function EquipmentActivity({ equipment, production, unavailable, onClose, onRepair }: {
  equipment: LessonEquipment
  production?: number
  unavailable?: string
  onClose: () => void
  onRepair: () => boolean
}) {
  const lesson = lessons[equipment]
  const [step, setStep] = useState<'inspect' | 'choose' | 'retry' | 'done'>('inspect')
  const [facesSun, setFacesSun] = useState(false)
  const [feedback, setFeedback] = useState('')
  const repaired = useRef(false)

  function choose(correct: boolean, explanation: string) {
    if (step !== 'choose' || repaired.current) return
    if (correct && !unavailable) repaired.current = onRepair()
    setFeedback(correct && !repaired.current ? unavailable ?? 'The equipment still needs help. Check your spare kits.' : explanation)
    setStep(repaired.current ? 'done' : 'retry')
  }

  return (
    <section className="equipment-activity" aria-label={lesson.title}>
      <header>
        <h2>{lesson.title}</h2>
        <button type="button" onClick={onClose}>Back to Base</button>
      </header>
      <p className="equipment-note" role="status" data-step={step}>
        {step === 'inspect' ? lesson.inspect : step === 'choose' ? lesson.prompt : feedback}
      </p>
      {step === 'inspect' ? (
        <button autoFocus className="equipment-target" type="button" onClick={() => setStep('choose')}>{lesson.target}</button>
      ) : <p className="equipment-target">{lesson.target}</p>}
      {step === 'choose' && (equipment === 'solar'
        ? <div className="equipment-choices">
          <button type="button" aria-pressed={facesSun} onClick={() => setFacesSun(!facesSun)}>
            Turn panel · {facesSun ? 'Facing the Sun ☀️' : 'Facing the ground ↓'}
          </button>
          <button type="button" onClick={() => choose(facesSun, facesSun
            ? '☀️ Solar panels turn sunlight into electricity!'
            : 'The ground blocks the sunlight. Turn the panel so sunlight can reach it.')}>Test panel</button>
        </div>
        : <div className="equipment-choices">
        {lessons.oxygenPlant.choices.map(([label, correct, explanation]) => (
          <button key={label} type="button" onClick={() => choose(correct, explanation)}>{label}</button>
        ))}
      </div>)}
      {step === 'retry' && <button className="equipment-retry" type="button" onClick={() => setStep('choose')}>Try Again</button>}
      <p>{lesson.reading}: {production === undefined ? 'No reading yet' : `${production.toFixed(2)} ${lesson.unit}`}</p>
      {step === 'done' && <p>Repair complete. Advance one day to see the next production reading.</p>}
    </section>
  )
}
