import { useRef, useState } from 'react'
import { EquipmentScene } from './EquipmentScene'

export type LessonEquipment = 'solar' | 'oxygenPlant'

const lessons = {
  solar: {
    title: 'Solar panel inspection',
    icon: '☀️',
    target: '↓ Inspect the highlighted panel',
    inspect: 'The panel turned away from the Sun. Look at the glowing frame.',
    prompt: 'Pick a direction for the panel. Then press Test.',
    choices: [
      { label: '☀️ Face the Sun', works: true },
      { label: '↓ Face the ground', works: false, feedback: 'The panel misses the sunlight when it faces the ground. Try turning it toward the Sun.' },
    ],
    success: '✅ Great job! Solar panels turn sunlight into electricity.',
    reading: 'Solar electricity last day',
    unit: 'kWh',
  },
  oxygenPlant: {
    title: 'Oxygen generator inspection',
    icon: 'O₂',
    target: '↓ Inspect the glowing power indicator',
    inspect: 'The oxygen machine stopped. Look at its glowing power indicator.',
    prompt: 'Pick what the machine needs to start again. Then press Test.',
    choices: [
      { label: '💧 Send water', works: false, feedback: 'Water alone cannot start the machine. Its power indicator still shows a problem.' },
      { label: '⚡ Restore power', works: true },
      { label: '💡 Turn on a nearby light', works: false, feedback: 'The light helps us see. The oxygen machine still needs its own power.' },
    ],
    success: '✅ Amazing! Power helps the machine make oxygen the crew can breathe.',
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
  const [selected, select] = useState<number>()
  const [feedback, setFeedback] = useState('')
  const repaired = useRef(false)
  const choice = selected === undefined ? undefined : lesson.choices[selected]

  function testChoice() {
    if (step !== 'choose' || !choice || repaired.current) return
    if (choice.works && !unavailable) repaired.current = onRepair()
    setFeedback(repaired.current ? lesson.success : choice.works
      ? unavailable ?? 'The equipment still needs help. Check your spare kits.'
      : choice.feedback)
    setStep(repaired.current ? 'done' : 'retry')
  }

  return (
    <section className="equipment-activity" aria-label={lesson.title}>
      <header>
        <h2><span className="mission-icon" aria-hidden="true">{lesson.icon}</span> {lesson.title}</h2>
        <button type="button" onClick={onClose}>Back to Base</button>
      </header>
      <p className="equipment-note" role="status" data-step={step}>
        {step === 'inspect' ? lesson.inspect : step === 'choose' ? lesson.prompt : feedback}
      </p>
      <EquipmentScene equipment={equipment} ready={step === 'choose' && choice?.works === true}
        repaired={step === 'done'} onInspect={step === 'inspect' ? () => setStep('choose') : undefined} />
      <div className="equipment-actions">
        {step === 'inspect' && (
          <button autoFocus className="equipment-target" type="button" onClick={() => setStep('choose')}>{lesson.target}</button>
        )}
        {step === 'choose' && <>
          <div className="equipment-choices" role="group" aria-label="Choose a solution">
            {lesson.choices.map(({ label }, index) => (
              <button key={label} type="button" aria-pressed={selected === index} onClick={() => select(index)}>{label}</button>
            ))}
          </div>
          <button type="button" disabled={!choice} onClick={testChoice}>Test</button>
        </>}
        {step === 'retry' && <button className="equipment-retry" type="button" onClick={() => {
          select(undefined)
          setStep('choose')
        }}>Try Again</button>}
      </div>
      <p className="equipment-reading">{lesson.reading}: {production === undefined ? 'No reading yet' : `${production.toFixed(2)} ${lesson.unit}`}</p>
      {step === 'done' && <p>Repair complete. Advance one day to see the next production reading.</p>}
    </section>
  )
}
