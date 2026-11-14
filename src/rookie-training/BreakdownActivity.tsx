import { useState } from 'react'

const lessons = {
  roverFixed: {
    title: '🚙 Moon Explorer wheel',
    instruction: 'The wheel sticks. Look at the dusty cover near its axle.',
    inspect: 'Check the wheel cover',
    finding: 'Dust slipped past the seal. Protect the axle so the wheel can turn freely.',
    diagram: ['Moon dust', '⚠ Wheel cover', 'Wheel'],
    fixed: ['Dust outside', '✓ Sealed cover', 'Wheel turns'],
    choices: [
      ['🛡️ Clear the trapped dust and fit a seal', ''],
      ['💧 Wipe only the wheel rim', 'The rim looks cleaner, but dust is still trapped near the axle.'],
      ['🔋 Swap the battery', 'The wheel is stuck at the axle. A new battery won’t clear the dust.'],
    ],
    success: 'The wheel turns again! The clean seal helps keep dust out.',
    science: 'Moon dust can be sharp and wear down moving parts. NASA tested dust barriers and seals for the VIPER rover.',
    source: 'https://ntrs.nasa.gov/citations/20250005201',
  },
  priorityLearned: {
    title: '🧰 Which repair comes first?',
    instruction: 'There’s a water fault and only one kit set aside. Which repair should get it?',
    inspect: 'Check the reserved kit',
    finding: 'The crew needs clean water every day. Choose where to use the kit.',
    diagram: ['🧑‍🚀 Crew', '🧰 One kit', '💧 Clean water'],
    fixed: ['🧑‍🚀 Crew', '✓ Kit reserved', '💧 Clean water'],
    choices: [
      ['💧 Fix the water recycler first', ''],
      ['🚙 Save the kit for exploration', 'Exploring can wait. The crew needs water every day.'],
    ],
    success: 'Good call! Use the reserved kit to fix the water recycler next.',
    science: 'Astronauts use life-support systems to recover water and make oxygen. Keep those systems running first.',
    source: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/',
  },
  waterFixed: {
    title: '💧 Water recycler',
    instruction: 'Follow the water. The filter is blocked, so used water can’t move through this training system.',
    inspect: 'Inspect the filter',
    finding: 'Water reaches the filter but stops there. Choose a way to clear the path.',
    diagram: ['Used water', '⚠ Blocked filter', 'No clean flow'],
    fixed: ['Used water', '✓ New filter', 'Clean water'],
    choices: [
      ['🧰 Replace the blocked filter', ''],
      ['💧 Send more used water', 'More water still can’t pass through a blocked filter.'],
      ['🔌 Empty the clean-water tank', 'An empty tank has room for clean water, but the blocked filter still stops the flow.'],
    ],
    success: 'The recycler is working again. Advance a day to see the new water reading.',
    science: 'NASA reuses water from sources such as cabin humidity and crew wastewater. Real systems use several treatment steps.',
    source: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/',
  },
} as const

export function BreakdownActivity({ objective, completed, onTest, onClose, onContinue }: {
  objective: keyof typeof lessons
  completed: boolean
  onTest: () => boolean
  onClose: () => void
  onContinue?: () => void
}) {
  const [inspected, setInspected] = useState(false)
  const [choice, setChoice] = useState<number>()
  const [feedback, setFeedback] = useState('')
  const lesson = lessons[objective]

  function test() {
    if (!inspected || choice === undefined || completed || feedback) return
    const explanation = lesson.choices[choice][1]
    if (explanation) setFeedback(explanation)
    else if (!onTest()) setFeedback('This repair couldn’t be completed. Check your kit and try again.')
  }

  return <section className="equipment-activity breakdown-activity" aria-label={lesson.title}>
    <header><h2>{lesson.title}</h2><button autoFocus type="button" onClick={onClose}>Back to Base</button></header>
    <p className="equipment-note" role="status" data-step={completed ? 'done' : feedback ? 'retry' : inspected ? 'choose' : 'inspect'}>
      {completed ? lesson.success : feedback || (inspected ? lesson.finding : lesson.instruction)}
    </p>
    <ol className="breakdown-diagram" aria-label="Component diagram">
      {(completed ? lesson.fixed : lesson.diagram).map((part, index) => <li key={part} data-highlight={index === 1}>{index === 1 && !completed
        ? <button type="button" aria-pressed={inspected} onClick={() => setInspected(true)}>{lesson.inspect}</button>
        : part}</li>)}
    </ol>
    {completed ? <button type="button" onClick={onContinue ?? onClose}>⭐ {onContinue ? 'Check the water recycler' : 'Continue'}</button>
      : feedback ? <button className="equipment-retry" type="button" onClick={() => { setChoice(undefined); setFeedback('') }}>Retry</button>
      : inspected && <>
        <div className="equipment-choices" role="group" aria-label="Choose a solution">
          {lesson.choices.map(([label], index) => <button key={label} type="button" aria-pressed={choice === index} onClick={() => setChoice(index)}>{label}</button>)}
        </div>
        <button type="button" disabled={choice === undefined} onClick={test}>Test</button>
      </>}
    <details><summary>NASA Science</summary><p>{lesson.science}</p><a href={lesson.source} target="_blank" rel="noreferrer">Read the NASA source</a></details>
  </section>
}
