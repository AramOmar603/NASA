import { advanceDisaster, disasterFaults, disasterPriority, disasterRepairBlock, fixDisasterFault, pendingDisasterFaults, type DisasterFault, type DisasterProgress } from '../rookie-training/disaster'
import { RepairActivity, type RepairLessonId } from '../rookie-training/RepairActivity'
import { RepairSignal } from '../rookie-training/RepairEffects'
import { advanceBreakdown, breakdownBlock, completeWaterChallenge, initialBreakdown, resolveBreakdownObjective, roverDay, waterRepairActivity } from '../rookie-training/breakdown'
import { useEffect, useRef, useState } from 'react'
import { advanceRookie, createRookieSession, hasPendingTraining } from '../rookie-training/session'
import type { TrainingLevel } from '../rookie-training/session'

import '../rookie-training/training.css'
import { useThree } from '@react-three/fiber'
import { MissionOverview } from '../components/dashboard/MissionOverview'
import { describeSurvivalEvent } from '../components/dashboard/SurvivalMission'
import { createSurvivalSession, dashboardState, equipmentNames, reduceSurvivalSession } from '../components/dashboard/survivalController'
import type { Equipment } from '../engine/survival'
import { LunarBase, outpost } from '../scene/buildings'
import { LunarEnvironment } from '../scene/environment'
import type { LunarCameraFocus } from '../scene/environment/LunarEnvironment'
import { DepartmentVisit } from './DepartmentVisit'
import { DepartmentLabels, LabelPositions, useLabelButtons } from './DepartmentLabels'
import { greenhouseRepairActivity, updateProblems, type EquipmentProblem, departments, repairFeedback, type DepartmentId } from './departments'
import '../styles.css'
import './preview.css'
import './mission-layout.css'

const baseOverview = { x: 0, z: 0, cameraOffset: [43, 34, 82] } as const
const homeApproach = { x: 0, z: 0, distance: 28 } as const

function CameraStart() {
  const { camera, invalidate } = useThree()
  useEffect(() => {
    camera.position.set(...baseOverview.cameraOffset)
    camera.position.y += 3
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
  shielding: ['🛡️ Safety Shelter Needs Help!', 'This room helps keep the crew safe.'],
} satisfies Record<Equipment, readonly [string, string]>

export function MissionFeedback({ rookie = false, trainingLevel, startAtHabitat = false, spawnInsideHabitat = false, showBaseOverview = true, onReplayIntro, onRestart, onComplete }: {
  rookie?: boolean
  trainingLevel?: TrainingLevel
  startAtHabitat?: boolean
  spawnInsideHabitat?: boolean
  showBaseOverview?: boolean
  onReplayIntro?: () => void
  onRestart?: () => void
  onComplete?: () => void
}) {
  const level = trainingLevel ?? (rookie ? 1 : undefined)
  const [session, setSession] = useState(() => level ? createRookieSession(level) : createSurvivalSession())
  const [disasterCompleted, setDisasterCompleted] = useState<DisasterProgress>([])
  const [disasterLesson, setDisasterLesson] = useState<DisasterFault>()
  const [disasterIntro, setDisasterIntro] = useState(level === 4)
  const [breakdown, setBreakdown] = useState(initialBreakdown)
  const [breakdownLesson, setBreakdownLesson] = useState<'roverFixed' | 'waterFixed'>()
  const [greenhouseLesson, setGreenhouseLesson] = useState<ReturnType<typeof greenhouseRepairActivity>>()
  const [maintenance, setMaintenance] = useState<Equipment>()
  const [visit, setVisit] = useState<DepartmentId | undefined>(spawnInsideHabitat ? 'HAB-01' : undefined)
  const [approaching, setApproaching] = useState<DepartmentId>()
  const pendingVisit = useRef<DepartmentId>(undefined)
  const [navigation, setNavigation] = useState<'map' | 'help' | 'more'>()
  const [focus, setFocus] = useState<LunarCameraFocus | undefined>(() => spawnInsideHabitat || !showBaseOverview ? homeApproach : baseOverview)

  useEffect(() => {
    if (showBaseOverview && !spawnInsideHabitat) setFocus(baseOverview)
  }, [showBaseOverview, spawnInsideHabitat])

  const [selected, select] = useState<DepartmentId>()
  const [overview, setOverview] = useState(false)
  const [postponed, postpone] = useState<ReadonlySet<number>>(() => new Set())
  const [message, setMessage] = useState('')
  const [problems, setProblems] = useState<EquipmentProblem[]>([])
  const buttons = useLabelButtons()
  const { state, config, flows, events } = session
  const view = { ...dashboardState(state), buildings: outpost }
  const failures = problems.filter(({ offline }) => offline)
  const needsAttention = new Set(problems.map(({ equipment }) => facilityFor(equipment).id))
  const offline = new Set(failures.map(({ equipment }) => facilityFor(equipment).id))
  const waterPending = level === 3 && waterRepairActivity(state.tick, breakdown, false) === 'waterFixed'
  const disasterPending = level === 4 ? pendingDisasterFaults(state.tick, disasterCompleted) : []
  const priority = disasterPriority(session)
  const pending = problems.filter(({ index, equipment }) => !postponed.has(index)
    && !(waterPending && equipment === 'recycler')
    && !disasterPending.some(id => disasterFaults[id].equipment === equipment))
  const blockReason = disasterIntro ? 'Read the mission briefing to begin.'
    : disasterPending.length ? 'Resolve the emergency before moving on.'
      : level === 3 ? breakdownBlock(state.tick, breakdown) : undefined
  const roverPending = level === 3 && state.tick >= roverDay && !breakdown.roverFixed
  if (roverPending) {
    offline.add('ROV-01')
    needsAttention.add('ROV-01')
  }
  const greenhouseActivity = greenhouseRepairActivity(session, needsAttention.has('BIO-01'))
  const canPlay = state.outcome === 'active'
  const outcome = canPlay ? undefined : {
    status: state.outcome as 'success' | 'failure',
    summary: state.outcome === 'success' ? 'All four astronauts made it home!' : 'The base could no longer keep the whole crew safe.',
  }
  const alerts = failures.map(({ equipment, index }) => ({
    id: String(index), severity: 'emergency' as const, message: equipmentNames[equipment] + ' needs help.',
  }))

  if (state.outcome === 'failure') alerts.push({ id: 'mission-failed', severity: 'emergency', message: 'Mission failed.' })

  function advance() {
    if (!canPlay || blockReason) return
    const next = level === 4 ? advanceDisaster(session, disasterCompleted) : level === 3 ? advanceBreakdown(session, breakdown) : level ? advanceRookie(session, level) : reduceSurvivalSession(session, { type: 'advanceTick' })
    setProblems(updateProblems(problems, session, next))
    setSession(next)
    setMessage('')
    if (level && next.state.outcome === 'success') onComplete?.()
  }

  function arrive(id: DepartmentId) {
    if (pendingVisit.current !== id) return
    pendingVisit.current = undefined
    setVisit(id)
    if (id === 'ROV-01' && roverPending) setBreakdownLesson('roverFixed')
    const equipment = equipmentFor(id)
    if (canPlay && equipment) {
      const hasFault = equipment === 'greenhouse' ? Boolean(greenhouseActivity)
        : needsAttention.has(id) || state.condition[equipment] <= config.failureThreshold
      const scheduled = disasterPending.find(id => disasterFaults[id].equipment === equipment)
      if (scheduled) setDisasterLesson(scheduled)
      else if (level === 3 && equipment === 'recycler') {
        const activity = waterRepairActivity(state.tick, breakdown, hasFault)
        if (activity === 'waterFixed') setBreakdownLesson(activity)
        else if (activity === 'recycler') setMaintenance(activity)
      } else if (hasFault && level !== 4) {
        if (equipment === 'greenhouse') setGreenhouseLesson(greenhouseActivity)
        setMaintenance(equipment)
      }
    }
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
    setFocus({ x: position.x, z: position.y, distance: id === 'ROV-01' && roverPending ? 18 : 26, onArrival: () => arrive(id) })
  }

  function testBreakdown() {
    if (!breakdownLesson) return false
    const next = breakdownLesson === 'waterFixed'
      ? completeWaterChallenge(session, breakdown, true)
      : resolveBreakdownObjective(session, breakdown, breakdownLesson, true)
    if (!next.progress[breakdownLesson]) return false
    setBreakdown(next.progress)
    if (next.session !== session) {
      setProblems(updateProblems(problems, session, next.session))
      setSession(next.session)
      setMessage('Water recycler fixed.')
    }
    return true
  }

  function leaveVisit() {
    setBreakdownLesson(undefined)
    setMaintenance(undefined)
    setDisasterLesson(undefined)
    setVisit(undefined)
    select(undefined)
    setFocus({ ...baseOverview })
  }

  function inspectEquipment(equipment: Equipment) {
    explore(facilityFor(equipment).id)
  }

  const reservedKits = level === 4 ? Object.keys(disasterFaults).length - disasterCompleted.length
    : level === 3 && !breakdown.waterFixed ? 1 : 0

  function testDisaster(id: DisasterFault) {
    const result = fixDisasterFault(session, disasterCompleted, id)
    if (result.session === session) return { complete: false, message: result.blocked }
    setProblems(updateProblems(problems, session, result.session))
    setSession(result.session)
    setDisasterCompleted(result.completed)
    return { complete: true }
  }

  function repair(equipment: Equipment) {
    if (level === 4) {
      const scheduled = disasterPending.find(id => disasterFaults[id].equipment === equipment)
      if (scheduled) return testDisaster(scheduled)
      const blocked = disasterRepairBlock(session, disasterCompleted, equipment)
      if (blocked) return { complete: false, message: blocked }
    }
    if (!breakdown.waterFixed && level === 3 && state.resources.spareKits <= 1) {
      return { complete: false, message: 'The last kit is reserved for the water lesson.' }
    }
    const next = reduceSurvivalSession(session, { type: 'maintain', equipment })
    const feedback = repairFeedback(session, next, equipment)
    setProblems(updateProblems(problems, session, next))
    setSession(next)
    setMessage(feedback === 'operational'
      ? equipmentNames[equipment] + (next.state.condition[equipment] === 1 ? ' fixed.' : ' working, but still damaged.')
      : feedback === 'still-offline' ? 'Still offline. Try another kit.' : next.feedback ?? '')
    return {
      complete: next.state.condition[equipment] === 1 && feedback === 'operational',
      message: feedback === 'operational' ? 'It’s working, but still damaged. Another kit can finish the repair.'
        : feedback === 'still-offline' ? 'Still offline. Another kit is needed.' : next.feedback,
    }
  }

  const visitingEquipment = visit ? equipmentFor(visit) : undefined
  const visitDamaged = visitingEquipment === 'greenhouse' ? Boolean(greenhouseActivity)
    : visitingEquipment !== undefined && (level === 4
      ? Boolean(visit && needsAttention.has(visit)) || state.condition[visitingEquipment] <= config.failureThreshold
      : state.condition[visitingEquipment] < 1)
  const scheduledVisitFault = disasterPending.find(id => disasterFaults[id].equipment === visitingEquipment)
  const visitRepairBlock = level === 4 && visitingEquipment
    ? disasterRepairBlock(session, disasterCompleted, visitingEquipment, scheduledVisitFault)
    : undefined
  const canRepairVisit = canPlay && visitDamaged && (level === 4
    ? !visitRepairBlock : state.resources.spareKits > reservedKits)

  const lesson = disasterLesson ?? breakdownLesson ?? maintenance
  const repairId: RepairLessonId | undefined = lesson === 'greenhouse' ? greenhouseLesson : lesson

  function closeRepair() {
    setMaintenance(undefined)
    setDisasterLesson(undefined)
    setBreakdownLesson(undefined)
  }

  return <main className="lg-survival mf-mission">
    <div inert={Boolean(approaching || visit || disasterIntro)}>
      <div className="mf-world">
        <LunarEnvironment className="lg-survival-world" focus={focus}>
          <CameraStart />
          <LunarBase selectedBuildingId={selected} onBuildingSelect={(id) => { if (Object.hasOwn(departments, id)) explore(id as DepartmentId) }}
            onGroundSelect={() => select(undefined)} />
          {visit === 'ROV-01' && breakdownLesson === 'roverFixed' &&
            <group position={[-21.18, .56, 20.42]} rotation={[0, Math.PI / 2, 0]}>
              <RepairSignal broken={roverPending} wheel test />
            </group>}
          <LabelPositions buttons={buttons} />
        </LunarEnvironment>
        <DepartmentLabels buttons={buttons} selected={selected} offline={offline} attention={needsAttention} onSelect={explore} />
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
        {blockReason && canPlay && <p className="mission-hint" role="status">{blockReason}</p>}
        {startAtHabitat && state.tick === 0 && !navigation && !selected &&
          <p className="mission-hint">Ready, astronaut? Tap <strong>Next Day</strong> to start.</p>}
        <nav className="mission-dock" aria-label="Base navigation">
          <button className="lamoon-button dock-primary" type="button" disabled={!canPlay || Boolean(blockReason)} onClick={advance}>▶ Next Day</button>
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
              aria-label={`Visit ${departments[id].name}`} onClick={() => explore(id)}>
              <span className="mission-icon" aria-hidden="true">{departments[id].icon}</span><small>{departments[id].name}</small>
            </button>)}
          </div>
        ) : navigation === 'help' ? <>
          <p>Tap a building to learn about it. Use Home to visit your crew or Next Day to move the mission forward.</p>
          {onReplayIntro && <button className="lamoon-button" type="button" onClick={onReplayIntro}>🚀 Replay Base Tour</button>}
        </> : <>
          {level && <p>{level === 4 ? 'Level 4 · Lunar Disaster' : level === 3 ? 'Level 3 · Mission Breakdown' : level === 2 ? 'Level 2 · First Emergency' : 'Level 1 · Rookie Astronaut'}</p>}
          <p>Spare kits: {state.resources.spareKits}</p>
          {level === 4 && reservedKits > 0 && <p>{reservedKits} kits set aside for mission emergencies.</p>}
          {level === 3 && !breakdown.waterFixed && <p>One kit is reserved for the water recycler lesson.</p>}
          {level === 3 && <details>
            <summary>NASA Science · Space weather</summary>
            <p>NASA recorded several flares and solar eruptions in May 2024. Space weather changes over time. LAMOON uses a steady practice dose.</p>
            <a href="https://ccmc.gsfc.nasa.gov/storms/may2024/" target="_blank" rel="noreferrer">See the NASA storm record and DONKI events</a>
          </details>}
          {outcome && <p role="status">{outcome.summary}</p>}
          <div className="mission-extra-actions">
            <button className="lamoon-button" type="button" onClick={() => { setNavigation(undefined); setOverview(true) }}>Detailed readings</button>
            {onReplayIntro && <button className="lamoon-button" type="button" onClick={onReplayIntro}>🚀 Replay Base Tour</button>}
          </div>
          <details>
            <summary>Departments</summary>
            <ul className="mission-department-list">{outpost.map(({ id }) => <li key={id}>
              <button className="lamoon-button" type="button" onClick={() => explore(id)}>{departments[id].icon} {departments[id].name}</button>
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

      <section className="mf-notifications" aria-label="Mission notifications">
        <div role="status">{message && <article className="mf-notice" data-tone={message.endsWith(' fixed.') ? 'success' : 'hint'}>
          {message.endsWith(' fixed.') && <strong>✅ Great job!</strong>}
          <p>{message}</p>
          {level && message === 'Greenhouse fixed.' && <p>Plants need water at their roots.</p>}
          <button className="lg-button" type="button" onClick={() => setMessage('')}>Close</button>
        </article>}</div>
        {canPlay && roverPending && <article className="mf-notice mf-emergency">
          <strong role="alert">🚙 Oh no! Our Moon Explorer needs help!</strong>
          <button className="lg-button" type="button" onClick={() => explore('ROV-01')}>🔍 Check it</button>
        </article>}
        {canPlay && waterPending && <article className="mf-notice mf-emergency">
          <strong role="alert">💧 Uh-oh! Our water machine needs help!</strong>
          <button className="lg-button" type="button" onClick={() => explore('WTR-01')}>🔍 Check it</button>
        </article>}
        {canPlay && disasterPending.length > 0 && <article className="mf-notice mf-emergency">
          <strong role="alert">{disasterPending.length === 2 ? '🚨 DOUBLE EMERGENCY!'
            : disasterPending[0] === 'shelterPanel' ? '☀️ Space Weather Alert!'
              : disasterPending[0] === 'powerConnection' ? '🔋 Oh no! Our Moon base is losing power!'
                : '🚨 One emergency still needs attention!'}</strong>
          <p>{disasterPending.length === 2
            ? priority === 'powerRelay'
              ? 'Power has less time in reserve. Fixing it first protects machines that need electricity.'
              : 'Water has less time in reserve. Fixing its pump first helps stretch the crew’s supply.'
            : 'Check the affected equipment before advancing the day.'}</p>
          {disasterPending.length === 2 && <p>Battery: {state.resources.batteryKWh.toFixed(1)} kWh · Water: {state.resources.waterL.toFixed(1)} L</p>}
          {disasterPending.map(id => {
            const building = facilityFor(disasterFaults[id].equipment).id
            return <button key={id} className="lg-button" type="button" onClick={() => explore(building)}>
              {departments[building].icon} {departments[building].name}
            </button>
          })}
        </article>}
        {pending.slice(0, 2).map(({ equipment, index, offline }) => {
          const [title, detail] = level === 2 && equipment === 'solar'
            ? ["☀️ Oh no! The solar panels are not working!", "Let’s go check them!"]
            : level === 2 && equipment === 'oxygenPlant'
              ? ['🫧 Oh no! The oxygen machine stopped!', 'Our astronauts need air!']
              : problemCopy[equipment]
          return <article key={index} className="mf-notice mf-emergency">
            <div role="alert"><strong>{equipment === 'greenhouse' && greenhouseActivity === 'greenhouseMaintenance' ? '🌱 New greenhouse fault' : level === 3 && equipment === 'recycler' && breakdown.waterFixed ? '💧 New Water Recycler fault' : offline || (level === 2 && hasPendingTraining(level, equipment, session)) ? title : '🚨 Oh no! ' + equipmentNames[equipment] + ' damaged!'}</strong><p>{detail}</p></div>
            <button className="lg-button" type="button" onClick={() => inspectEquipment(equipment)}>🔍 Check it</button>
            <button className="lg-button" type="button"
              onClick={() => postpone((previous) => new Set([...previous, index]))}>Later</button>
          </article>
        })}
        {pending.length > 2 && <p className="mf-notice">{pending.length - 2} more to check</p>}
      </section>
    </div>
    {approaching && <p className="visit-approach" role="status">Approaching {departments[approaching].name}…</p>}
    {visit && <DepartmentVisit key={visit} id={visit}
      damaged={visitDamaged}
      repairAvailable={canRepairVisit} repairBlockedReason={visitRepairBlock} session={session} disasterFault={disasterLesson} inspectionOnly={Boolean(repairId)}
      onTour={onReplayIntro} onBack={leaveVisit} onRepair={() => {
        if (scheduledVisitFault) {
          setDisasterLesson(scheduledVisitFault)
          return
        }
        if (level === 4 && visitingEquipment) {
          leaveVisit()
          repair(visitingEquipment)
          return
        }
        if (visitingEquipment === 'greenhouse') setGreenhouseLesson(greenhouseActivity)
        setMaintenance(visitingEquipment)
      }} />}
    {disasterIntro && <section className="repair-card" aria-label="Lunar Disaster briefing">
      <div className="repair-card-page">
        <h2>🚨 Lunar Disaster</h2>
        <p>Commander! Our Moon base is facing its toughest mission yet! Can you protect all four astronauts for 20 days?</p>
        <p>Four spare kits are set aside for the mission emergencies.</p>
        <button autoFocus type="button" onClick={() => setDisasterIntro(false)}>Begin mission →</button>
      </div>
    </section>}
    {repairId && canPlay && <RepairActivity key={repairId} id={repairId === 'recycler' && level === 3 && breakdown.waterFixed ? 'recyclerMaintenance' : repairId}
      onTest={() => disasterLesson ? testDisaster(disasterLesson) : breakdownLesson ? { complete: testBreakdown() }
        : maintenance ? repair(maintenance) : { complete: false }}
      onClose={closeRepair}
      onContinue={disasterLesson === 'powerRelay' || disasterLesson === 'waterPump' ? leaveVisit : closeRepair} />}
    {level && outcome && <section className="rookie-result" aria-label="Mission result">
      <h2>LAMOON · {outcome.status === 'success' ? level === 4 ? '🏆 LEVEL 4 COMPLETE!' : level === 3 ? '🌙 LEVEL 3 COMPLETE!' : 'MISSION COMPLETE!' : 'Mission Failed — Try Again!'}</h2>
      <p>{outcome.status === 'success' ? `You kept the base going for ${state.tick} days.` : 'The base could no longer keep the whole crew safe. On your next try, check supplies and repair crew essentials first.'}</p>
      <p>{state.crew.filter(({ health }) => health > 0).length} of {state.crew.length} astronauts survived.</p>
      {outcome.status === 'success' && level === 4 && <>
        <p><strong>Outstanding work, Commander! You protected our Moon base through its toughest emergencies!</strong></p>
        <p>Emergency faults resolved: {disasterCompleted.length} / 4.</p>
        <p>You restored shielding, traced electrical faults, repaired a water pump, and prioritized limited supplies.</p>
      </>}
      {outcome.status === 'success' && level === 3 && <>
        <p><strong>Great job, Commander! You kept your Moon crew safe!</strong></p>
        <p>Training challenges completed: {Object.values(breakdown).filter(Boolean).length} / 3.</p>
        <p>You learned to protect wheels from Moon dust, recover water, and fix crew essentials first.</p>
      </>}
      {outcome.status === 'success' && level === 2 && <>
        <p><strong>Level 2 — First Emergency Completed!</strong></p>
        <p>Solar panels turn sunlight into electricity. The oxygen generator uses electricity to make air for the crew.</p>
      </>}
      {outcome.status === 'success' && level === 1 && <p>{events.some((event) => event.type === 'equipmentRepaired' && event.equipment === 'greenhouse')
        ? 'You found the irrigation leak and tested a repair. Plants need water at their roots.'
        : 'You tracked the supplies that keep astronauts alive.'}</p>}
      <button className="lg-button" type="button" onClick={onRestart}>{level >= 3 && outcome.status === 'failure' ? 'Retry Level' : 'Restart mission'}</button>
    </section>}
    <MissionOverview open={overview} onClose={() => setOverview(false)} state={view} day={state.tick}
      missionDays={config.missionDays} foodUnit="kg" onAction={advance} advanceBlockedReason={blockReason} alerts={alerts} outcome={outcome}
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
