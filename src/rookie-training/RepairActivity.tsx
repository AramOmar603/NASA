import type { CommanderObjective } from './commander'
import type { DisasterFault } from './disaster'
import { useEffect, useState } from 'react'
import { useReducedMotion } from './RepairEffects'
import type { Equipment } from '../engine/survival'

export type RepairLessonId = Exclude<CommanderObjective, 'planning'> | Equipment | DisasterFault | 'greenhouseMaintenance' | 'roverFixed' | 'waterFixed' | 'recyclerMaintenance'
type Lesson = {
  icon: string
  problem: string
  detail: string
  question: string
  choices: readonly { label: string; why?: string }[]
  success: string
  science?: { explanation: string; url: string }
}

const departmentIntros = {
  greenhouse: ['Why do we need a space garden?', 'The greenhouse grows plants that help feed our crew. Plants need water and light to grow.'],
  air: ['Why do we need oxygen?', 'Astronauts need oxygen to breathe. This machine helps make it for the crew.'],
  solar: ['Why do we need solar panels?', 'Solar panels turn sunlight into electricity. Our Moon base uses it to run its machines.'],
  water: ['Why do we recycle water?', 'Water is precious on the Moon. The recycler cleans used water so the crew can use it again.'],
  rover: ['Why do we need a rover?', 'The rover carries astronauts and tools across the Moon so the crew can explore far from home.'],
  shelter: ['Why do we need a safety shelter?', 'Space weather can send harmful particles toward the Moon. The shelter helps protect the crew.'],
  temperature: ['Why keep the Home Center comfortable?', 'Astronauts and equipment need safe temperatures. The cooling system carries extra heat away.'],
  signal: ['Why do we talk to Mission Control?', 'The crew sends updates and asks for help. A relay helps carry messages between the Moon and Earth.'],
} as const

const introFor: Record<RepairLessonId, keyof typeof departmentIntros> = {
  greenhouse: 'greenhouse', greenhouseMaintenance: 'greenhouse',
  oxygenPlant: 'air', finalAir: 'air',
  solar: 'solar', powerConnection: 'solar', powerRelay: 'solar', finalPower: 'solar',
  recycler: 'water', waterFixed: 'water', recyclerMaintenance: 'water', waterPump: 'water', finalWater: 'water',
  roverFixed: 'rover',
  shielding: 'shelter', shelterPanel: 'shelter',
  temperature: 'temperature', signal: 'signal',
}

const water: Lesson = {
  icon: '💧', problem: 'The water stopped!', detail: 'Used water reaches the highlighted filter and stops there.',
  question: 'What is stopping the water?',
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
  temperature: {
    icon: '🌡️', problem: 'Temperature Trouble!', detail: 'The Home Center’s training display shows that its cooling loop has stopped.',
    question: 'What helps cool the cabin?',
    choices: [
      { label: '🌡️ Check the cooling-loop pump' },
      { label: '💡 Turn up the cabin lights', why: 'Lights do not move heat out of the cabin.' },
      { label: '📡 Turn the antenna', why: 'The antenna sends messages. The cooling loop moves heat.' },
    ],
    success: 'The practice temperature display is back in its safe range!',
    science: { explanation: 'Spacecraft cooling loops carry heat away from equipment and living spaces.', url: 'https://ntrs.nasa.gov/citations/20080026002' },
  },
  signal: {
    icon: '📡', problem: 'Signal Lost!', detail: 'The training console shows power but has lost its link to the relay.',
    question: 'How can we send messages again?',
    choices: [
      { label: '🔊 Turn up the speakers', why: 'Louder speakers do not restore a radio connection.' },
      { label: '📡 Reconnect to the relay', },
      { label: '🌡️ Change the cabin temperature', why: 'The cooling controls do not route messages.' },
    ],
    success: 'Signal restored! Mission Control can hear us again!',
    science: { explanation: 'Lunar relay networks can pass messages between the Moon and Earth.', url: 'https://www.nasa.gov/communicating-with-missions/lunanet/' },
  },
  finalPower: {
    icon: '⚡', problem: 'The array’s protection tripped!', detail: 'The array is aligned, but its protection disconnected the output after a fault.',
    question: 'Which part protects the array?',
    choices: [
      { label: '☀️ Tilt the array', why: 'The cells already face the Sun. Check why the output disconnected.' },
      { label: '⚡ Check the protective circuit' },
      { label: '🔋 Turn off the battery', why: 'The battery supplies stored energy while the array is down.' },
    ],
    success: 'The solar array can supply power again!',
    science: { explanation: 'Generation and storage have different jobs in lunar power systems.', url: 'https://www.nasa.gov/moonbase-systems/' },
  },
  finalAir: {
    icon: '🫧', problem: 'The oxygen machine has lost its water feed!', detail: 'The machine’s power light is on, but water isn’t reaching its intake in this exercise.',
    question: 'Where should we check for water?',
    choices: [
      { label: '🫧 Check the generator’s water intake' },
      { label: '💡 Turn up the room lights', why: 'Room lights do not feed water to the generator.' },
      { label: '🌀 Open a cabin vent', why: 'Moving existing air does not give the generator water to split.' },
    ],
    success: 'The generator can make oxygen again. Check tomorrow’s reading.',
    science: { explanation: 'Electrolysis uses electricity to split water into oxygen and hydrogen.', url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/' },
  },
  finalWater: {
    icon: '💧', problem: 'The recycler’s valve is sending water the wrong way!', detail: 'The pump has power, but the marked routing valve diverts used water away from treatment.',
    question: 'Where should used water go?',
    choices: [
      { label: '🪣 Send it straight to the crew tank', why: 'Used water needs treatment and quality checks first.' },
      { label: '🧰 Replace the working filter', why: 'The water never reaches the filter while the route is blocked.' },
      { label: '💧 Restore the route through treatment' },
    ],
    success: 'Used water can reach treatment again!',
    science: { explanation: 'Space station water is treated and checked before reaching the crew’s supply.', url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/' },
  },
  shelterPanel: {
    icon: '🛡️', problem: 'Space Weather Alert!', detail: 'A solar particle storm is approaching. The yellow light marks a damaged shelter panel.',
    question: 'How can we protect the crew?',
    choices: [
      { label: '🧱 Restore the damaged shielding panel' },
      { label: '🌱 Water the greenhouse plants', why: 'Water helps the plants. The crew still needs the shelter panel.' },
      { label: '🚙 Turn on the lunar rover', why: 'The rover helps with travel. It won’t fix the gap in the shelter.' },
    ],
    success: 'The shielding is restored. It reduces exposure during the storm, and the crew still needs to monitor space weather.',
    science: { explanation: 'Shielding can reduce exposure to energetic particles from the Sun.', url: 'https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon/' },
  },
  powerConnection: {
    icon: '🔋', problem: 'Our Moon base is losing power!', detail: 'Solar energy isn’t reaching the base. The battery is supplying the crew from its reserve.',
    question: 'Where should we check for lost power?',
    choices: [
      { label: '🔌 Check the solar power connection' },
      { label: '🌱 Inspect the greenhouse lights', why: 'The lights use electricity. They can’t reconnect the supply.' },
      { label: '⏳ Wait for the battery to refill', why: 'The battery needs an energy source to recharge.' },
    ],
    success: 'The solar array can supply the base again. Check the energy readings after the next day.',
    science: { explanation: 'Solar arrays generate electricity. Storage helps keep equipment supplied when incoming energy drops.', url: 'https://www.nasa.gov/moonbase-systems/' },
  },
  powerRelay: {
    icon: '⚡', problem: 'The power switch is stuck open!', detail: 'The solar cells are facing the Sun. A fault in their output switch stopped energy from reaching the base.',
    question: 'What reconnects the array?',
    choices: [
      { label: '☀️ Turn the already aligned array', why: 'The cells are already facing the Sun. Turning them won’t close the broken path.' },
      { label: '🔌 Restore the output switch' },
      { label: '🔋 Disconnect the battery reserve', why: 'The reserve is keeping essential systems running while the output is down.' },
    ],
    success: 'The power path is restored. If the water pump still needs help, check it next.',
    science: { explanation: 'Power systems need a working path from the source to the equipment that uses the energy.', url: 'https://www.nasa.gov/moonbase-systems/' },
  },
  waterPump: {
    icon: '💧', problem: 'The water pump stopped!', detail: 'The filter is clear. The highlighted pump can’t move used water into the recycler.',
    question: 'What gets the water moving?',
    choices: [
      { label: '🪣 Empty the clean-water tank', why: 'That makes space, but it doesn’t move water through the recycler.' },
      { label: '🧰 Replace the clear filter', why: 'The filter is clear. The pump is the part that moves water.' },
      { label: '💧 Restore the water pump' },
    ],
    success: 'Water can move through the recycler again. Check the recovery reading after the next day.',
    science: { explanation: 'Real life support uses several treatment steps to recover usable water from wastewater and cabin humidity.', url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/' },
  },
  greenhouse: {
    icon: '🌱', problem: 'Our plants aren’t getting enough water!', detail: 'The highlighted watering line has stopped and the leaves are drooping.',
    question: 'What do our plants need?',
    choices: [
      { label: '☀️ Add more light', why: 'Light helps plants grow, but their roots are still dry.' },
      { label: '💧 Restore the water flow' },
      { label: '🔧 Check a different machine', why: 'That leaves the watering line blocked. The roots still need water.' },
    ],
    success: 'Water is flowing again, and the plants are perking up!',
  },
  greenhouseMaintenance: {
    icon: '🌱', problem: 'The greenhouse has a new fault!',
    detail: 'The watering system needs maintenance after new damage.',
    question: 'What takes water to the roots?',
    choices: [
      { label: '💡 Check the grow lights', why: 'The lights do not move water to the roots.' },
      { label: '🧰 Check the irrigation line' },
      { label: '🪴 Move the plants', why: 'Moving the plants leaves the damaged watering system in place.' },
    ],
    success: 'The irrigation line is working again!',
  },
  solar: {
    icon: '☀️', problem: 'The solar panel is out of line!', detail: 'The highlighted panel is tilted away from the sunlight.',
    question: 'Which way should the panel face?',
    choices: [
      { label: '🌑 Face it into shadow', why: 'Shade blocks the light the panel needs.' },
      { label: '⬇️ Turn it toward the ground', why: 'Facing the ground keeps direct sunlight off the cells.' },
      { label: '☀️ Turn it toward the Sun' },
    ],
    success: 'The panel faces the sunlight and can make electricity again!',
  },
  oxygenPlant: {
    icon: '🫧', problem: 'The oxygen machine stopped!', detail: 'The blinking red gauge shows a power fault.',
    question: 'What powers the oxygen machine?',
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
    question: 'Which fix helps the crew get clean water?',
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
    question: 'Which part needs attention?',
  },
  shielding: {
    icon: '🛡️', problem: 'The shelter has a weak spot!', detail: 'The highlighted patch needs inspection before the crew can rely on it.',
    question: 'What fixes the weak spot?',
    choices: [
      { label: '💡 Turn on more lights', why: 'Light helps us see the patch, but doesn’t replace shielding.' },
      { label: '🧱 Restore the shielding panel' },
      { label: '🎨 Paint over the gap', why: 'A thin coat of paint doesn’t provide the missing protection.' },
    ],
    success: 'The shelter’s shielding is back in place!',
  },
  roverFixed: {
    icon: '🚙', problem: 'The Moon Explorer’s wheel is stuck!', detail: 'Dust got past the highlighted cover near the axle.',
    question: 'How can we free the wheel?',
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

export function RepairActivity({ id, onTest, onClose, onContinue, onHome, onSkip, skipWarning }: {
  id: RepairLessonId
  onTest: () => { complete: boolean; message?: string }
  onHome?: () => void
  skipWarning?: string
  onSkip?: () => void
  onClose: () => void
  onContinue: () => void
}) {
  const lesson = repairLessons[id]
  const [introTitle, introDetail] = departmentIntros[introFor[id]]
  const [step, setStep] = useState<'intro' | 'problem' | 'choices' | 'retry' | 'success'>('intro')
  const [choice, select] = useState<number>()
  const reducedMotion = useReducedMotion()
  const [nextStep, setNextStep] = useState<'problem' | 'choices'>()
  useEffect(() => {
    if (!nextStep) return
    const timer = window.setTimeout(() => {
      setStep(nextStep)
      setNextStep(undefined)
    }, 150)
    return () => window.clearTimeout(timer)
  }, [nextStep])
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

  return <section className="repair-card" data-lesson={id} data-step={step} aria-label="Repair activity">
    <button className="repair-close" type="button" aria-label="Close repair" onClick={onClose}>×</button>
    <div key={step} className="repair-card-page" data-leaving={Boolean(nextStep)}>
      <span className="repair-card-icon" aria-hidden="true">{step === 'success' ? '🎉' : step === 'retry' ? '🤔' : lesson.icon}</span>
      <h2>{step === 'intro' ? introTitle : step === 'problem' ? lesson.problem : step === 'choices' ? lesson.question : step === 'retry' ? 'Good try!' : 'Great job, Commander!'}</h2>
      {(step === 'intro' || step === 'problem') && <>
        <p>{step === 'intro' ? introDetail : lesson.detail}</p>
        <button autoFocus type="button" disabled={Boolean(nextStep)} onClick={() => {
          const destination = step === 'intro' ? 'problem' : 'choices'
          if (reducedMotion) setStep(destination)
          else setNextStep(destination)
        }}>Next →</button>
      </>}
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
      {onSkip && skipWarning && step !== 'success' && <p role="status">{skipWarning}</p>}
      {(onHome || (onSkip && step !== 'success')) && <div className="field-choices">
        {onSkip && step !== 'success' && <button type="button" onClick={onSkip}>Skip Mission</button>}
        {onHome && <button type="button" onClick={onHome}>🏠 Home</button>}
      </div>}
    </div>
  </section>
}
