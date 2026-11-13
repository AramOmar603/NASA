import { useEffect, useRef, useState } from 'react'
import { advanceRookie, createRookieSession } from '../rookie-training/session'
import type { TrainingLevel } from '../rookie-training/session'
import { GreenhouseInterior } from '../rookie-training/GreenhouseInterior'

import '../rookie-training/training.css'
import { useThree } from '@react-three/fiber'
import { BuildingPanel } from '../components/dashboard/BuildingPanel'
import { GameHUD } from '../components/dashboard/GameHUD'
import { MissionOverview } from '../components/dashboard/MissionOverview'
import { buildingTelemetry, describeSurvivalEvent } from '../components/dashboard/SurvivalMission'
import { createSurvivalSession, dashboardState, equipmentNames, reduceSurvivalSession } from '../components/dashboard/survivalController'
import type { Equipment } from '../engine/survival'
import { LunarBase, outpost } from '../scene/buildings'
import { LunarEnvironment } from '../scene/environment'
import type { LunarCameraFocus } from '../scene/environment/LunarEnvironment'
import { DepartmentLabels, LabelPositions, useLabelButtons } from './DepartmentLabels'
import { updateProblems, type EquipmentProblem, departments, repairFeedback, type DepartmentId } from './departments'
import '../styles.css'
import './preview.css'

function CameraStart() {
  const { camera, invalidate } = useThree()
  useEffect(() => {
    camera.position.set(43, 37, 82)
    camera.lookAt(0, 3, 0)
    invalidate()
  }, [camera, invalidate])
  return null
}

function equipmentFor(id: DepartmentId): Equipment | undefined {
  const department = departments[id]
  return 'equipment' in department ? department.equipment : undefined
}

function facilityFor(equipment: Equipment) {
  return outpost.find(({ id }) => equipmentFor(id) === equipment)!
}

const problemCopy = {
  oxygenPlant: ['🚨 O₂ Machine Broke!', 'Astronauts need air.'],
  recycler: ['💧 Water System Problem!', 'We need clean water.'],
  solar: ['☀️ Solar Panels Offline!', 'The base needs power.'],
  greenhouse: ['🌱 Greenhouse Trouble!', 'The crew needs food.'],
  shielding: ['🛡️ Shield Problem!', 'Astronauts need protection.'],
} satisfies Record<Equipment, readonly [string, string]>

export function MissionFeedback({ rookie = false, trainingLevel, onRestart, onComplete }: {
  rookie?: boolean
  trainingLevel?: TrainingLevel
  onRestart?: () => void
  onComplete?: () => void
}) {
  const level = trainingLevel ?? (rookie ? 1 : undefined)
  const [session, setSession] = useState(() => level ? createRookieSession(level) : createSurvivalSession())
  const [training, setTraining] = useState<Equipment>()
  const repairApplied = useRef(false)
  const [focus, setFocus] = useState<LunarCameraFocus>()

  const [selected, select] = useState<DepartmentId>()
  const [overview, setOverview] = useState(false)
  const [postponed, postpone] = useState<ReadonlySet<number>>(() => new Set())
  const [message, setMessage] = useState('')
  const [problems, setProblems] = useState<EquipmentProblem[]>([])
  const buttons = useLabelButtons()
  const { state, config, flows, events } = session
  const view = { ...dashboardState(state), buildings: outpost }
  const failures = problems.filter(({ offline }) => offline)
  const offline = new Set(failures.map(({ equipment }) => facilityFor(equipment).id))
  const pending = problems.filter(({ index }) => !postponed.has(index))
  const canPlay = state.outcome === 'active'
  const outcome = canPlay ? undefined : {
    status: state.outcome as 'success' | 'failure',
    summary: state.outcome === 'success' ? 'All four astronauts made it home!' : 'The base could no longer keep the whole crew safe.',
  }
  const telemetry = Object.fromEntries(outpost.map((building) => [building.id, buildingTelemetry(building, session)]))
  const alerts = failures.map(({ equipment, index }) => ({
    id: String(index), severity: 'emergency' as const, message: equipmentNames[equipment] + ' needs help.',
  }))

  if (state.outcome === 'failure') alerts.push({ id: 'mission-failed', severity: 'emergency', message: 'Mission failed.' })

  function advance() {
    const next = level ? advanceRookie(session, level) : reduceSurvivalSession(session, { type: 'advanceTick' })
    setProblems(updateProblems(problems, session, next))
    setSession(next)
    setMessage('')
    if (level && next.state.outcome === 'success') onComplete?.()
  }

  function inspectEquipment(equipment: Equipment) {
    const building = facilityFor(equipment)
    select(building.id)
    setFocus({ x: building.position.x, z: building.position.y })
    if (level && equipment === 'greenhouse') {
      repairApplied.current = false
      setTraining(equipment)
    }
  }

  function repair(equipment: Equipment, lessonPassed = false) {
    if (level && equipment === 'greenhouse' && !lessonPassed) {
      inspectEquipment(equipment)
      return
    }
    const next = reduceSurvivalSession(session, { type: 'maintain', equipment })
    const feedback = repairFeedback(session, next, equipment)
    setProblems(updateProblems(problems, session, next))
    setSession(next)
    setMessage(feedback === 'operational'
      ? equipmentNames[equipment] + (next.state.condition[equipment] === 1 ? ' fixed.' : ' working, but still damaged.')
      : feedback === 'still-offline' ? 'Still offline. Try another kit.' : next.feedback ?? '')
    return next.state.condition[equipment] === 1 && feedback === 'operational'
  }

  return <main className="lg-survival mf-mission">
    <div inert={Boolean(training)} aria-hidden={training ? true : undefined}>
      <div className="mf-world">
        <LunarEnvironment className="lg-survival-world" focus={focus}>
          <CameraStart />
          <LunarBase selectedBuildingId={selected} onBuildingSelect={(id) => select(id as DepartmentId)}
            onGroundSelect={() => select(undefined)} />
          <LabelPositions buttons={buttons} />
        </LunarEnvironment>
        <DepartmentLabels buttons={buttons} selected={selected} offline={offline} onSelect={select} />
      </div>
      <GameHUD state={view} day={state.tick} missionDays={config.missionDays} alerts={alerts}
        showAllResources={Boolean(level)} overviewOpen={overview} onOverviewToggle={() => setOverview(!overview)} />
      <div className="lg-survival-controls">
        {level && <h1>{level === 2 ? 'First Emergency' : 'Rookie Astronaut'}</h1>}
        <button className="lg-button" type="button" disabled={!canPlay} onClick={advance}>Advance one day</button>
        <p>Spare kits {state.resources.spareKits}</p>
        {outcome && <p role="status">{outcome.summary}</p>}
        <details>
          <summary>Departments</summary>
          <ul>{outpost.map(({ id }) => <li key={id}>
            <button className="lg-button" type="button" onClick={() => select(id)}>{departments[id].name}</button>
          </li>)}</ul>
          <p>Life support receives power first. Production readings describe the last completed day.</p>
        </details>
        <details>
          <summary>Mission log</summary>
          <ol>{events.map((event, index) => <li key={index}>{describeSurvivalEvent(event)}
            {event.type === 'equipmentFailed' && !failures.some((failure) => failure.equipment === event.equipment) ? ' Resolved.' : ''}
          </li>)}</ol>
        </details>
      </div>
      <BuildingPanel state={view} selectedBuildingId={selected} telemetry={telemetry} foodUnit="kg"
        onClose={() => select(undefined)} onAction={(action) => {
          if (action.type !== 'repair' || !selected || action.buildingId !== selected) return
          const equipment = equipmentFor(selected)
          if (equipment) repair(equipment)
        }}>
      {selected && <div className="mf-lesson">
        <strong>{departments[selected].name}</strong>
        <p>{departments[selected].lesson}</p>
        {selected === 'PWR-01' && <p>Battery reserve {state.resources.batteryKWh.toFixed(1)} kWh</p>}
        {selected === 'WTR-01' && <p>{flows ? 'Water recovered last day ' + flows.water.production.toFixed(1) + ' L' : 'Water recovery measurements start after the first day.'}</p>}
        {offline.has(selected) && <p>Offline. Restore this equipment to resume its work.</p>}
      </div>}
      </BuildingPanel>
      <section className="mf-notifications" aria-label="Mission notifications">
        <div role="status">{message && <article className="mf-notice mf-feedback">
          {message.endsWith(' fixed.') && <strong>✅ Great job!</strong>}
          <p>{message}</p>
          {level && message === 'Greenhouse fixed.' && <p>Plants need water at their roots.</p>}
          <button className="lg-button" type="button" onClick={() => setMessage('')}>Close</button>
        </article>}</div>
        {pending.slice(0, 2).map(({ equipment, index, offline }) => {
          const [title, detail] = problemCopy[equipment]
          return <article key={index} className="mf-notice mf-emergency">
            <div role="alert"><strong>{offline ? title : '🚨 Oh no! ' + equipmentNames[equipment] + ' damaged!'}</strong><p>{detail}</p></div>
            <button className="lg-button" type="button" onClick={() => inspectEquipment(equipment)}>🔍 Check it</button>
            <button className="lg-button" type="button" disabled={!canPlay || state.resources.spareKits < 1}
              onClick={() => repair(equipment)}>🔧 Fix it</button>
            <button className="lg-button" type="button"
              onClick={() => postpone((previous) => new Set([...previous, index]))}>Later</button>
          </article>
        })}
        {pending.length > 2 && <p className="mf-notice">{pending.length - 2} more to check</p>}
      </section>
    </div>
    {level && training === 'greenhouse' && canPlay && <GreenhouseInterior guided={level === 2}
      unavailable={state.resources.spareKits < 1 ? 'No spare kits left.' : state.condition.greenhouse >= 1 ? 'The greenhouse is already fixed.' : undefined}
      onClose={() => setTraining(undefined)} onRepair={() => {
        if (repairApplied.current) return true
        repairApplied.current = repair('greenhouse', true) === true
        return repairApplied.current
      }} />}
    {level && outcome && <section className="rookie-result" aria-label="Mission result">
      <h2>{outcome.status === 'success' ? 'MISSION COMPLETE!' : 'Mission Failed — Try Again!'}</h2>
      <p>{outcome.status === 'success' ? `You kept the base going for ${config.missionDays} days.` : 'The base could no longer keep the whole crew alive.'}</p>
      <p>{state.crew.filter(({ health }) => health > 0).length} of {state.crew.length} astronauts survived.</p>
      {outcome.status === 'success' && <p>{events.some((event) => event.type === 'equipmentRepaired' && event.equipment === 'greenhouse')
        ? 'You found the irrigation leak and tested a repair. Plants need water at their roots.'
        : 'You tracked the supplies that keep astronauts alive.'}</p>}
      <button className="lg-button" type="button" onClick={onRestart}>Restart mission</button>
    </section>}
    <MissionOverview open={overview} onClose={() => setOverview(false)} state={view} day={state.tick}
      missionDays={config.missionDays} foodUnit="kg" onAction={advance} alerts={alerts} outcome={outcome}
      crew={state.crew.map(({ health, doseMilliSv }, index) => ({
        id: String(index), name: 'Crew ' + (index + 1), health: Number(health.toFixed(1)),
        status: health > 0 ? 'Surviving' : 'Deceased', role: doseMilliSv.toFixed(2) + ' mSv cumulative',
      }))}
      radiation={{ dose: Math.max(0, ...state.crew.map(({ doseMilliSv }) => doseMilliSv)) }}
      resources={{
        oxygen: { capacity: config.oxygenCapacityKg, ...flows?.oxygen },
        water: { capacity: config.waterCapacityL, ...flows?.water },
        food: { capacity: config.foodCapacityKg, ...flows?.food },
        power: { capacity: config.batteryCapacityKWh, ...flows?.power },
      }} />
  </main>
}
