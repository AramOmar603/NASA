import { useEffect, useRef, useState } from 'react'
import { advanceRookie, createRookieSession } from '../rookie-training/session'
import type { TrainingLevel } from '../rookie-training/session'
import { EquipmentActivity } from '../rookie-training/EquipmentActivity'
import { GreenhouseInterior } from '../rookie-training/GreenhouseInterior'

import '../rookie-training/training.css'
import { useThree } from '@react-three/fiber'
import { MissionOverview } from '../components/dashboard/MissionOverview'
import { buildingTelemetry, describeSurvivalEvent } from '../components/dashboard/SurvivalMission'
import { createSurvivalSession, dashboardState, equipmentNames, reduceSurvivalSession } from '../components/dashboard/survivalController'
import type { Equipment } from '../engine/survival'
import { LunarBase, outpost } from '../scene/buildings'
import { LunarEnvironment } from '../scene/environment'
import type { LunarCameraFocus } from '../scene/environment/LunarEnvironment'
import { DepartmentVisit } from './DepartmentVisit'
import { DepartmentLabels, LabelPositions, useLabelButtons } from './DepartmentLabels'
import { updateProblems, type EquipmentProblem, departments, repairFeedback, type DepartmentId } from './departments'
import '../styles.css'
import './preview.css'
import './mission-layout.css'

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

const readingLabels: Record<string, string> = {
  crewHealth: 'Crew health', lifeSupport: 'Life support', generation: 'Produced last day',
  battery: 'Battery reserve', production: 'Food grown last day', efficiency: 'Water recovery',
  equipment: 'Equipment status', radiationRisk: 'Radiation risk', readiness: 'Readiness', protection: 'Crew protection',
}

const problemCopy = {
  oxygenPlant: ['🚨 O₂ Machine Broke!', 'Astronauts need air.'],
  recycler: ['💧 Water System Problem!', 'We need clean water.'],
  solar: ['☀️ Solar Panels Offline!', 'The base needs power.'],
  greenhouse: ['🌱 Greenhouse Trouble!', 'The crew needs food.'],
  shielding: ['🛡️ Safety Shelter Needs Help!', 'This room helps keep the crew safe.'],
} satisfies Record<Equipment, readonly [string, string]>

export function MissionFeedback({ rookie = false, trainingLevel, startAtHabitat = false, spawnInsideHabitat = false, onReplayIntro, onRestart, onComplete }: {
  rookie?: boolean
  trainingLevel?: TrainingLevel
  startAtHabitat?: boolean
  spawnInsideHabitat?: boolean
  onReplayIntro?: () => void
  onRestart?: () => void
  onComplete?: () => void
}) {
  const level = trainingLevel ?? (rookie ? 1 : undefined)
  const [session, setSession] = useState(() => level ? createRookieSession(level) : createSurvivalSession())
  const [training, setTraining] = useState<Equipment>()
  const [visit, setVisit] = useState<DepartmentId | undefined>(spawnInsideHabitat ? 'HAB-01' : undefined)
  const [approaching, setApproaching] = useState<DepartmentId>()
  const pendingVisit = useRef<DepartmentId>(undefined)
  const [navigation, setNavigation] = useState<'map' | 'help' | 'more'>()
  const repairApplied = useRef(false)
  const [focus, setFocus] = useState<LunarCameraFocus | undefined>(() => startAtHabitat ? { x: 0, z: 0, distance: 28 } : undefined)

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

  const selectedEquipment = selected ? equipmentFor(selected) : undefined
  const selectedCondition = selectedEquipment ? state.condition[selectedEquipment] : undefined
  const selectedStatus = selectedCondition !== undefined && selectedCondition <= config.failureThreshold ? 'Offline'
    : selectedCondition !== undefined && selectedCondition < 1 ? 'Needs a repair' : 'Ready'
  const selectedReadings = selected ? telemetry[selected].readings : undefined
  const canRepairSelected = canPlay && selectedCondition !== undefined && selectedCondition < 1 && state.resources.spareKits > 0

  function selectDepartment(id: DepartmentId) {
    setNavigation(undefined)
    select(id)
  }

  useEffect(() => {
    if (!navigation && !selected) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || visit || approaching || training || overview) return
      if (navigation) setNavigation(undefined)
      else select(undefined)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [navigation, selected, visit, approaching, training, overview])

  function advance() {
    if (!canPlay) return
    const next = level ? advanceRookie(session, level) : reduceSurvivalSession(session, { type: 'advanceTick' })
    setProblems(updateProblems(problems, session, next))
    setSession(next)
    setMessage('')
    if (level && next.state.outcome === 'success') onComplete?.()
  }

  function hasLesson(equipment: Equipment) {
    return (level === 1 && equipment === 'greenhouse')
      || (level === 2 && (equipment === 'solar' || equipment === 'oxygenPlant'))
  }

  function arrive(id: DepartmentId) {
    if (pendingVisit.current !== id) return
    pendingVisit.current = undefined
    setVisit(id)
    setApproaching(undefined)
  }

  // The timer also lets players enter when WebGL is unavailable.
  useEffect(() => {
    if (!approaching) return
    const timer = window.setTimeout(() => arrive(approaching), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1400)
    return () => window.clearTimeout(timer)
  }, [approaching])

  function explore(id: DepartmentId) {
    if (pendingVisit.current) return
    pendingVisit.current = id
    const { position } = outpost.find((building) => building.id === id)!
    select(id)
    setNavigation(undefined)
    setApproaching(id)
    setFocus({ x: position.x, z: position.y, distance: 26, onArrival: () => arrive(id) })
  }

  function leaveVisit() {
    setVisit(undefined)
    select(undefined)
    setFocus({ x: 0, z: 0, distance: 92 })
  }

  function inspectEquipment(equipment: Equipment) {
    explore(facilityFor(equipment).id)
  }

  function repair(equipment: Equipment, lessonPassed = false) {
    if (hasLesson(equipment) && !lessonPassed) {
      repairApplied.current = false
      setTraining(equipment)
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

  const visitingEquipment = visit ? equipmentFor(visit) : undefined
  const canRepairVisit = canPlay && visitingEquipment !== undefined &&
    state.condition[visitingEquipment] < 1 && state.resources.spareKits > 0

  return <main className="lg-survival mf-mission">
    <div inert={Boolean(approaching || visit || training)}>
      <div className="mf-world">
        <LunarEnvironment className="lg-survival-world" focus={focus}>
          <CameraStart />
          <LunarBase selectedBuildingId={selected} onBuildingSelect={(id) => { if (Object.hasOwn(departments, id)) selectDepartment(id as DepartmentId) }}
            onGroundSelect={() => select(undefined)} />
          <LabelPositions buttons={buttons} />
        </LunarEnvironment>
        <DepartmentLabels buttons={buttons} selected={selected} offline={offline} onSelect={selectDepartment} />
      </div>
      <header className="mission-status" aria-label="Mission status">
        <strong><span aria-hidden="true">🌙</span> LAMOON</strong>
        <dl>
          <div><dt>📅 Mission Day</dt><dd>{state.tick} / {config.missionDays}</dd></div>
          <div><dt>O₂ Oxygen</dt><dd>{view.resources.oxygen?.toFixed(1)} <small>kg</small></dd></div>
          <div><dt>⚡ Electricity</dt><dd>{view.resources.power?.toFixed(1)} <small>kWh</small></dd></div>
          <div><dt>💧 Water</dt><dd>{view.resources.water?.toFixed(1)} <small>L</small></dd></div>
          <div><dt>🌱 Food</dt><dd>{view.resources.food?.toFixed(1)} <small>kg</small></dd></div>
        </dl>
        <button className="lamoon-button" type="button" aria-expanded={navigation === 'more'}
          onClick={() => setNavigation(navigation === 'more' ? undefined : 'more')}>More</button>
      </header>

      <div className="mission-actions">
        {startAtHabitat && state.tick === 0 && !navigation && !selected &&
          <p className="mission-hint">Ready, astronaut? Tap <strong>Next Day</strong> to start.</p>}
        <nav className="mission-dock" aria-label="Base navigation">
          <button className="lamoon-button dock-primary" type="button" disabled={!canPlay} onClick={advance}>▶ Next Day</button>
          <button className="lamoon-button" type="button" onClick={() => explore('HAB-01')}>🏠 Home</button>
          <button className="lamoon-button" type="button" aria-expanded={navigation === 'map'}
            onClick={() => setNavigation(navigation === 'map' ? undefined : 'map')}>🗺️ Map</button>
          <button className="lamoon-button" type="button" aria-expanded={navigation === 'help'}
            onClick={() => setNavigation(navigation === 'help' ? undefined : 'help')}>❓ Help</button>
        </nav>
      </div>

      {navigation && <section className="mission-popover" aria-labelledby="mission-menu-title">
        <div className="mission-card-heading">
          <h2 id="mission-menu-title">{navigation === 'map' ? 'Base Map' : navigation === 'help' ? 'Help' : 'Mission extras'}</h2>
          <button autoFocus className="lamoon-button" type="button" onClick={() => setNavigation(undefined)}>Back</button>
        </div>
        {navigation === 'map' ? (
          <div className="base-map">
            {outpost.map(({ id, position }) => <button key={id} className="lamoon-button" type="button"
              style={{ left: `${50 + position.x * 1.28}%`, top: `${48 + position.y * 1.45}%` }}
              aria-label={`Select ${departments[id].name}`} onClick={() => selectDepartment(id)}>
              <span className="mission-icon" aria-hidden="true">{departments[id].icon}</span><small>{departments[id].name}</small>
            </button>)}
          </div>
        ) : navigation === 'help' ? <>
          <p>Tap a building to learn about it. Use Home to visit your crew or Next Day to move the mission forward.</p>
          {onReplayIntro && <button className="lamoon-button" type="button" onClick={onReplayIntro}>🚀 Replay Base Tour</button>}
        </> : <>
          {level && <p>{level === 2 ? 'Level 2 · First Emergency' : 'Level 1 · Rookie Astronaut'}</p>}
          <p>Spare kits: {state.resources.spareKits}</p>
          {outcome && <p role="status">{outcome.summary}</p>}
          <div className="mission-extra-actions">
            <button className="lamoon-button" type="button" onClick={() => { setNavigation(undefined); setOverview(true) }}>Detailed readings</button>
            {onReplayIntro && <button className="lamoon-button" type="button" onClick={onReplayIntro}>🚀 Replay Base Tour</button>}
          </div>
          <details>
            <summary>Departments</summary>
            <ul className="mission-department-list">{outpost.map(({ id }) => <li key={id}>
              <button className="lamoon-button" type="button" onClick={() => selectDepartment(id)}>{departments[id].icon} {departments[id].name}</button>
            </li>)}</ul>
          </details>
          <details>
            <summary>Mission log</summary>
            {events.length === 0 ? <p>No events yet.</p> : <ol>{events.map((event, index) => <li key={index}>{describeSurvivalEvent(event)}
              {event.type === 'equipmentFailed' && !failures.some((failure) => failure.equipment === event.equipment) ? ' Resolved.' : ''}
            </li>)}</ol>}
          </details>
        </>}
      </section>}

      {selected && !navigation && <section className="mission-popover mission-building-card" aria-labelledby="mission-building-title">
        <div className="mission-card-heading">
          <h2 id="mission-building-title"><span className="mission-icon" aria-hidden="true">{departments[selected].icon}</span> {departments[selected].name}</h2>
          <button className="lamoon-button" type="button" onClick={() => select(undefined)}>Back</button>
        </div>
        <p>{departments[selected].lesson}</p>
        <p className="mission-condition" data-attention={selectedStatus !== 'Ready'}>{selectedStatus}</p>
        <div className="mission-extra-actions">
          <button className="lamoon-button dock-primary" type="button" onClick={() => explore(selected)}>🔍 Explore</button>
          {canRepairSelected && <button className="lamoon-button" type="button" onClick={() => {
            if (selectedEquipment) inspectEquipment(selectedEquipment)
          }}>🔧 Fix it</button>}
        </div>
        {(selectedReadings || selected === 'PWR-01' || selected === 'WTR-01') && <details>
          <summary>Building readings</summary>
          <dl className="visit-readings">
            {selectedReadings && Object.entries(selectedReadings).map(([key, reading]) => (
              <div key={key}><dt>{readingLabels[key] ?? key}</dt><dd>{reading}</dd></div>
            ))}
            {selected === 'PWR-01' && <div><dt>Battery reserve</dt><dd>{state.resources.batteryKWh.toFixed(1)} kWh</dd></div>}
            {selected === 'WTR-01' && <div><dt>Water recovered last day</dt><dd>{flows ? `${flows.water.production.toFixed(1)} L` : 'Awaiting first day'}</dd></div>}
          </dl>
        </details>}
      </section>}
      <section className="mf-notifications" aria-label="Mission notifications">
        <div role="status">{message && <article className="mf-notice mf-feedback">
          {message.endsWith(' fixed.') && <strong>✅ Great job!</strong>}
          <p>{message}</p>
          {level && message === 'Greenhouse fixed.' && <p>Plants need water at their roots.</p>}
          <button className="lg-button" type="button" onClick={() => setMessage('')}>Close</button>
        </article>}</div>
        {pending.slice(0, 2).map(({ equipment, index, offline }) => {
          const [title, detail] = level === 2 && equipment === 'solar'
            ? ["☀️ Oh no! The solar panels are not working!", "Let’s go check them!"]
            : level === 2 && equipment === 'oxygenPlant'
              ? ['🫧 Oh no! The oxygen machine stopped!', 'Our astronauts need air!']
              : problemCopy[equipment]
          return <article key={index} className="mf-notice mf-emergency">
            <div role="alert"><strong>{offline || (level === 2 && hasLesson(equipment)) ? title : '🚨 Oh no! ' + equipmentNames[equipment] + ' damaged!'}</strong><p>{detail}</p></div>
            <button className="lg-button" type="button" onClick={() => inspectEquipment(equipment)}>🔍 Check it</button>
            <button className="lg-button" type="button" disabled={!canPlay || state.resources.spareKits < 1}
              onClick={() => inspectEquipment(equipment)}>🔧 Fix it</button>
            <button className="lg-button" type="button"
              onClick={() => postpone((previous) => new Set([...previous, index]))}>Later</button>
          </article>
        })}
        {pending.length > 2 && <p className="mf-notice">{pending.length - 2} more to check</p>}
      </section>
    </div>
    {approaching && <p className="visit-approach" role="status">Approaching {departments[approaching].name}…</p>}
    {visit && !training && <DepartmentVisit key={visit} id={visit} damaged={visitingEquipment !== undefined && state.condition[visitingEquipment] < 1} repairAvailable={canRepairVisit}
      telemetry={telemetry[visit]} onTour={onReplayIntro} onBack={leaveVisit} onRepair={() => {
        if (visitingEquipment) repair(visitingEquipment)
      }} />}
    {level === 1 && training === 'greenhouse' && canPlay && <GreenhouseInterior
      unavailable={state.resources.spareKits < 1 ? 'No spare kits left.' : state.condition.greenhouse >= 1 ? 'The greenhouse is already fixed.' : undefined}
      onClose={() => setTraining(undefined)} onRepair={() => {
        if (repairApplied.current) return true
        repairApplied.current = repair('greenhouse', true) === true
        return repairApplied.current
      }} />}
    {level === 2 && (training === 'solar' || training === 'oxygenPlant') && canPlay &&
      <EquipmentActivity key={training} equipment={training}
        production={training === 'solar' ? flows?.power.production : flows?.oxygen.production}
        unavailable={state.resources.spareKits < 1 ? 'No spare kits left.' : state.condition[training] >= 1 ? 'This equipment is already fixed.' : undefined}
        onClose={() => setTraining(undefined)} onRepair={() => repair(training, true) === true} />}
    {level && outcome && <section className="rookie-result" aria-label="Mission result">
      <h2>LAMOON · {outcome.status === 'success' ? 'MISSION COMPLETE!' : 'Mission Failed — Try Again!'}</h2>
      <p>{outcome.status === 'success' ? `You kept the base going for ${config.missionDays} days.` : 'The base could no longer keep the whole crew alive.'}</p>
      <p>{state.crew.filter(({ health }) => health > 0).length} of {state.crew.length} astronauts survived.</p>
      {outcome.status === 'success' && level === 2 && <>
        <p><strong>Level 2 — First Emergency Completed!</strong></p>
        <p>Solar panels turn sunlight into electricity. The oxygen generator uses electricity to make air for the crew.</p>
      </>}
      {outcome.status === 'success' && level === 1 && <p>{events.some((event) => event.type === 'equipmentRepaired' && event.equipment === 'greenhouse')
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
