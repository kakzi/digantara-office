import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { officeStateBadge } from '../office-state.ts'
import { agentLook } from '../agents.ts'
import { DIVISIONS, jobOf, ROLE_INFO, type Division, type RoleKey } from '../org.ts'
import { clampTarget, createLayout, FLOOR_HEIGHT, floorOf, idlePlan, outdoors, placementFor, visitSpot, walkPath3, type Floor, type OfficeLayout, type Placement, type Vec3 } from '../office3d-layout.ts'
import { Environment } from '../scene3d/environment.tsx'
import { Cyl, ExecutiveDesk, Laptop, RBox, WorkDesk, type DeskKind } from '../scene3d/props.tsx'
import type { OfficeStation } from '../types.ts'

// 3D view of the same Office snapshot the 2D view renders. Positions come from each station's
// room, roomPosition and seat, so the 3D office shows exactly the states the server derived.

type Registry<T> = MutableRefObject<Map<string, T>>

const DESK_KIND: Record<RoleKey, DeskKind> = { ceo: 'plain', 'tech-lead': 'dev', frontend: 'dev', backend: 'dev', designer: 'design', content: 'content', 'admin-finance': 'finance', accounting: 'finance', staff: 'plain' }

/** Glasses on the face (the face looks along +z). */
function Glasses({ color = '#1d2126' }: { color?: string }) {
  return <>
    {[-0.09, 0.09].map((x) => <RBox key={x} position={[x, 1.53, 0.2]} size={[0.12, 0.1, 0.015]} radius={0.01} color={color} opacity={0.9} shadow={false}/>)}
    <RBox position={[0, 1.55, 0.2]} size={[0.06, 0.015, 0.012]} radius={0.004} color={color} shadow={false}/>
  </>
}

/** A lanyard with an ID card on the chest. */
function IdCard({ color }: { color: string }) {
  return <>
    <RBox position={[0, 1.13, 0.155]} size={[0.2, 0.2, 0.01]} radius={0.004} color={color} shadow={false}/>
    <RBox position={[0, 0.98, 0.16]} size={[0.11, 0.14, 0.015]} radius={0.01} color="#f4efe6" shadow={false}/>
  </>
}

/** What each position wears, so the crew reads as a software house at a glance. */
function RoleGear({ role, tint }: { role: RoleKey; tint: (color: string) => string }) {
  const accent = tint(DIVISIONS[ROLE_INFO[role].division].color)
  if (role === 'ceo') return <>
    {/* Blazer over a white shirt, red tie */}
    <RBox position={[0, 0.98, 0]} size={[0.5, 0.6, 0.32]} radius={0.07} color={tint('#1f2a44')} roughness={0.6}/>
    <RBox position={[0, 1.13, 0.161]} size={[0.15, 0.24, 0.01]} radius={0.01} color={tint('#f7f7f2')} shadow={false}/>
    <RBox position={[0, 1.06, 0.168]} size={[0.06, 0.26, 0.01]} radius={0.01} color={tint('#b3262d')} shadow={false}/>
  </>
  if (role === 'tech-lead') return <>
    {/* Headset with a mic, and the team lead's lanyard */}
    <RBox position={[0, 1.8, -0.01]} size={[0.47, 0.05, 0.09]} radius={0.02} color={tint('#22262b')}/>
    {[-0.22, 0.22].map((x) => <RBox key={x} position={[x, 1.52, 0]} size={[0.07, 0.15, 0.15]} radius={0.03} color={tint('#22262b')}/>)}
    <RBox position={[-0.16, 1.4, 0.13]} size={[0.025, 0.025, 0.2]} radius={0.008} rotation={[0, 0.6, 0]} color={tint('#22262b')} shadow={false}/>
    <IdCard color={accent}/>
  </>
  if (role === 'frontend' || role === 'backend') return <>
    {/* Hoodie hood behind the head; the frontend dev wears glasses, the backend dev headphones round the neck */}
    <RBox position={[0, 1.33, -0.17]} size={[0.44, 0.24, 0.12]} radius={0.05} color={tint(role === 'backend' ? '#2c3440' : '#3f6fb5')}/>
    {role === 'frontend' ? <Glasses/> : [-0.2, 0.2].map((x) => <RBox key={x} position={[x, 1.29, 0.06]} size={[0.08, 0.12, 0.12]} radius={0.03} color={tint('#16181b')}/>)}
    <IdCard color={accent}/>
  </>
  if (role === 'designer') return <>
    {/* A beret, tilted */}
    <Cyl position={[0.04, 1.8, 0]} radius={0.25} height={0.08} rotation={[0, 0, -0.18]} color={tint('#b3262d')}/>
    <Cyl position={[0.04, 1.86, 0]} radius={0.025} height={0.05} color={tint('#b3262d')}/>
  </>
  if (role === 'content') return <>
    {/* A cap worn backwards and a camera on a strap */}
    <RBox position={[0, 1.75, -0.01]} size={[0.44, 0.12, 0.42]} radius={0.06} color={tint('#e76f51')}/>
    <RBox position={[0, 1.71, -0.25]} size={[0.36, 0.03, 0.16]} radius={0.01} color={tint('#e76f51')}/>
    <RBox position={[0, 1.12, 0.155]} size={[0.26, 0.24, 0.01]} radius={0.004} color={tint('#1b1d20')} shadow={false}/>
    <RBox position={[0, 0.97, 0.2]} size={[0.18, 0.11, 0.08]} radius={0.02} color={tint('#1b1d20')}/>
    <Cyl position={[0, 0.97, 0.25]} radius={0.035} height={0.05} rotation={[Math.PI / 2, 0, 0]} color={tint('#3a3f45')}/>
  </>
  if (role === 'accounting') return <>
    {/* Glasses, a waistcoat and a pen in the pocket */}
    <Glasses color="#7a5a2b"/>
    <RBox position={[0, 0.95, 0]} size={[0.5, 0.5, 0.32]} radius={0.07} color={tint('#3e4a3d')} roughness={0.8}/>
    <RBox position={[0.12, 1.12, 0.165]} size={[0.02, 0.1, 0.02]} radius={0.006} color={tint('#c9a227')} shadow={false}/>
  </>
  if (role === 'admin-finance') return <><Glasses color="#5b3a6b"/><IdCard color={accent}/></>
  return <IdCard color={tint('#8a8f98')}/>
}

function Character({ station, placement, layout, floor, onSelect, anchor }: { station: OfficeStation; placement: Placement; layout: OfficeLayout; floor: Floor; onSelect: (station: OfficeStation, trigger: HTMLElement | null) => void; anchor: (object: THREE.Object3D | null) => void }) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Mesh>(null)
  const rightLeg = useRef<THREE.Mesh>(null)
  const leftArm = useRef<THREE.Mesh>(null)
  const rightArm = useRef<THREE.Mesh>(null)
  const colors = agentLook(station.id)
  const role = jobOf(station).role
  const offline = station.state === 'Offline'
  const unknown = station.state === 'Unknown'
  const tint = (color: string) => offline ? '#7b7f7d' : color
  // Only the first placement is applied as a prop; later changes are walked to via the aisle.
  const [start] = useState<Vec3>(() => placement.position)
  const path = useRef<THREE.Vector3[]>([])
  const destination = placement.position.join(',')
  useEffect(() => {
    const group = root.current
    if (!group) return
    path.current = walkPath3([group.position.x, group.position.y, group.position.z], placement.position, layout).map(([px, py, pz]) => new THREE.Vector3(px, py, pz))
    // placement.position is captured through `destination`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination])

  useFrame((state, delta) => {
    const group = root.current
    if (!group) return
    const time = state.clock.elapsedTime
    const next = path.current[0]
    let walking = false
    if (next) {
      const toNext = next.clone().sub(group.position)
      const distance = toNext.length()
      if (distance < 0.04) {
        path.current.shift()
      } else {
        walking = true
        group.position.add(toNext.clone().normalize().multiplyScalar(Math.min(distance, delta * 2.6)))
        if (Math.hypot(toNext.x, toNext.z) > 0.01) {
          const heading = Math.atan2(toNext.x, toNext.z)
          group.rotation.y += Math.atan2(Math.sin(heading - group.rotation.y), Math.cos(heading - group.rotation.y)) * 0.25
        }
      }
    }
    // Only the floor in view is drawn; from lantai 2 the agents outside on the ground stay visible.
    const upstairs = group.position.y > FLOOR_HEIGHT / 2
    group.visible = floor === 2 ? upstairs || outdoors(group.position.x, group.position.z) : !upstairs
    if (!walking) group.rotation.y += Math.atan2(Math.sin(placement.facing - group.rotation.y), Math.cos(placement.facing - group.rotation.y)) * 0.12
    const swing = walking ? Math.sin(time * 10) * 0.6 : 0
    const arrived = !walking && path.current.length === 0
    const lying = arrived && placement.pose === 'lie'
    const onFloor = arrived && placement.pose === 'floor'
    // In bed (or the hammock) the body lines up with it exactly, not wherever the walk left it.
    if (lying) group.rotation.y = placement.facing
    const seated = !walking && (placement.seated || onFloor)
    if (leftLeg.current && rightLeg.current) {
      leftLeg.current.rotation.x = lying ? 0 : seated ? -Math.PI / 2.2 : swing
      rightLeg.current.rotation.x = lying ? 0 : seated ? -Math.PI / 2.2 : -swing
    }
    if (leftArm.current && rightArm.current) {
      const typing = !walking && (station.state === 'Working' || station.state === 'Reviewing')
      const talking = !walking && station.state === 'Collaborating'
      leftArm.current.rotation.x = lying ? 0 : walking ? -swing : typing ? -1.1 + Math.sin(time * 14) * 0.12 : talking ? -0.4 + Math.sin(time * 3) * 0.3 : 0
      rightArm.current.rotation.x = lying ? 0 : walking ? swing : typing ? -1.1 + Math.cos(time * 14) * 0.12 : 0
    }
    if (body.current) {
      // Lying down: the body tips back so the head rests towards the pillow (local -z).
      body.current.rotation.x += ((lying ? -Math.PI / 2 : 0) - body.current.rotation.x) * 0.2
      const talk = station.state === 'Collaborating' && !walking ? Math.abs(Math.sin(time * 5)) * 0.03 : 0
      const breathe = station.state === 'Idle' ? Math.sin(time * (lying ? 1.2 : 2)) * 0.015 : 0
      body.current.position.y = lying ? (placement.height ?? 0.5) + 0.16 + breathe : (onFloor ? -0.5 : seated ? -0.14 : 0) + talk + breathe
    }
  })

  return <group ref={root} position={start}>
    <group ref={body} onClick={(event) => { event.stopPropagation(); onSelect(station, null) }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      <mesh ref={leftLeg} position={[-0.11, 0.66, 0]} castShadow geometry={legGeometry}><meshStandardMaterial color={tint(colors.pants)} roughness={0.8}/></mesh>
      <mesh ref={rightLeg} position={[0.11, 0.66, 0]} castShadow geometry={legGeometry}><meshStandardMaterial color={tint(colors.pants)} roughness={0.8}/></mesh>
      <RBox position={[0, 0.98, 0]} size={[0.48, 0.58, 0.3]} radius={0.07} color={tint(colors.shirt)} roughness={0.85}/>
      <mesh ref={leftArm} position={[-0.31, 1.2, 0]} castShadow geometry={armGeometry}><meshStandardMaterial color={tint(colors.shirt)} roughness={0.85}/></mesh>
      <mesh ref={rightArm} position={[0.31, 1.2, 0]} castShadow geometry={armGeometry}><meshStandardMaterial color={tint(colors.shirt)} roughness={0.85}/></mesh>
      <RBox position={[0, 1.5, 0]} size={[0.4, 0.4, 0.37]} radius={0.08} color={tint(colors.skin)} roughness={0.7}/>
      <RBox position={[0, 1.72, -0.02]} size={[0.43, 0.13, 0.41]} radius={0.05} color={tint(colors.hair)} roughness={0.9}/>
      <RBox position={[0, 1.58, -0.19]} size={[0.43, 0.3, 0.06]} radius={0.03} color={tint(colors.hair)} roughness={0.9}/>
      <RBox position={[-0.09, 1.52, 0.186]} size={[0.06, 0.07, 0.01]} radius={0.004} color="#17201e" shadow={false}/>
      <RBox position={[0.09, 1.52, 0.186]} size={[0.06, 0.07, 0.01]} radius={0.004} color="#17201e" shadow={false}/>
      <RBox position={[0, 1.4, 0.186]} size={[0.12, 0.025, 0.01]} radius={0.004} color="#9a5a44" shadow={false}/>
      <RoleGear role={role} tint={tint}/>
      {unknown && <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.45, 0.55, 24]}/><meshBasicMaterial color="#e9c47b" transparent opacity={0.85}/></mesh>}
      <object3D ref={anchor} position={[0, 2.05, 0]}/>
    </group>
  </group>
}

// Legs and arms pivot at the hip / shoulder: translate the geometry so its top sits at the origin.
const legGeometry = new THREE.BoxGeometry(0.17, 0.62, 0.2).translate(0, -0.31, 0)
const armGeometry = new THREE.BoxGeometry(0.12, 0.52, 0.14).translate(0, -0.26, 0)

/**
 * Screen-space labels: each frame, project every anchor into the canvas and move its DOM label
 * there directly (no React re-render). Labels live outside the Canvas, so they unmount cleanly
 * and use the page's own styles and focus handling.
 */
function LabelProjector({ anchors, labels }: { anchors: Registry<THREE.Object3D>; labels: Registry<HTMLElement> }) {
  const point = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    const projected: { element: HTMLElement; x: number; y: number; depth: number }[] = []
    for (const [key, object] of anchors.current) {
      const element = labels.current.get(key)
      if (!element) continue
      let shown = true
      for (let node: THREE.Object3D | null = object; node; node = node.parent) if (!node.visible) { shown = false; break }
      object.getWorldPosition(point).project(camera)
      const visible = shown && point.z < 1 && Math.abs(point.x) <= 1.1 && Math.abs(point.y) <= 1.1
      element.style.visibility = visible ? 'visible' : 'hidden'
      if (visible) projected.push({ element, x: ((point.x + 1) / 2) * size.width, y: ((1 - point.y) / 2) * size.height, depth: point.z })
    }
    // Nearest labels keep their spot; a farther label that would overlap one already placed is
    // lifted above it, so every agent stays readable and clickable.
    projected.sort((a, b) => a.depth - b.depth)
    const placed: { left: number; right: number; top: number; bottom: number }[] = []
    for (const label of projected) {
      const width = label.element.offsetWidth
      const height = label.element.offsetHeight
      const x = Math.min(Math.max(label.x, width / 2 + 4), size.width - width / 2 - 4)
      let bottom = label.y
      const left = x - width / 2
      const right = x + width / 2
      for (let guard = 0; guard < 6; guard += 1) {
        const hit = placed.find((box) => left < box.right && right > box.left && bottom - height < box.bottom && bottom > box.top)
        if (!hit) break
        bottom = hit.top - 4
      }
      placed.push({ left, right, top: bottom - height, bottom })
      label.element.style.transform = `translate(${x}px, ${Math.max(bottom, height + 4)}px) translate(-50%, -100%)`
      label.element.style.zIndex = String(Math.round((1 - label.depth) * 10_000))
    }
  })
  return null
}

export interface ViewHandle { reset: () => void; focus: (point: Vec3, distance: number) => void }

/** Orbit (drag), pan (right-drag, two fingers, arrow keys or pan mode) and zoom, kept in bounds. */
const Controls = forwardRef<ViewHandle, { panMode: boolean; keyTarget: HTMLElement | null; layout: OfficeLayout; elevation: number }>(function Controls({ panMode, keyTarget, layout, elevation }, handle) {
  const { camera, gl, size } = useThree()
  const controls = useRef<OrbitControls | null>(null)
  /** A camera flight in progress (to a division), eased in useFrame; any drag cancels it. */
  const flight = useRef<{ target: THREE.Vector3; position: THREE.Vector3 } | null>(null)
  const { target: cameraTarget, offset: cameraOffset } = layout.camera
  const target = useMemo(() => new THREE.Vector3(...cameraTarget), [cameraTarget])
  const frame = useMemo(() => () => {
    const aspect = size.width / Math.max(size.height, 1)
    const offset = new THREE.Vector3(...cameraOffset)
    // Narrow (portrait) views need to back off so the whole building fits across.
    offset.setLength(offset.length() * Math.max(1, 1.2 / aspect))
    const focus = target.clone().set(aspect < 1 ? cameraTarget[0] - 1.4 : cameraTarget[0], cameraTarget[1] + elevation, aspect < 1 ? 0.8 : cameraTarget[2])
    const orbit = controls.current
    // An undamped update applies and clears any momentum left from an earlier drag,
    // so it has to happen before the camera is placed, not after.
    flight.current = null
    if (orbit) { orbit.enableDamping = false; orbit.update() }
    camera.position.copy(focus).add(offset)
    camera.lookAt(focus)
    if (!orbit) return
    orbit.target.copy(focus)
    orbit.update()
    orbit.enableDamping = true
  }, [camera, size.width, size.height, target, cameraOffset, cameraTarget, elevation])

  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement)
    orbit.enableDamping = true
    orbit.screenSpacePanning = false // pan across the floor, not up into the sky
    orbit.minDistance = 5
    orbit.maxDistance = 75
    orbit.minPolarAngle = 0.2
    orbit.maxPolarAngle = 1.32
    orbit.keyPanSpeed = 25
    const cancelFlight = () => { flight.current = null }
    orbit.addEventListener('start', cancelFlight)
    controls.current = orbit
    frame()
    return () => { orbit.removeEventListener('start', cancelFlight); orbit.dispose(); controls.current = null }
    // frame() only sets the initial view; re-running it on resize is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, gl])
  useEffect(() => { frame() }, [frame])
  useEffect(() => {
    const orbit = controls.current
    if (!orbit) return
    orbit.mouseButtons.LEFT = panMode ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE
    orbit.mouseButtons.RIGHT = panMode ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN
    orbit.touches.ONE = panMode ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE
  }, [panMode])
  useEffect(() => {
    const orbit = controls.current
    if (!orbit || !keyTarget) return
    orbit.listenToKeyEvents(keyTarget)
    return () => orbit.stopListenToKeyEvents()
  }, [keyTarget])
  useImperativeHandle(handle, () => ({
    reset: frame,
    focus: (point, distance) => {
      const target = new THREE.Vector3(point[0], point[1] + elevation, point[2])
      flight.current = { target, position: target.clone().add(new THREE.Vector3(...cameraOffset).setLength(distance)) }
    },
  }), [frame, elevation, cameraOffset])

  useFrame((_, delta) => {
    const orbit = controls.current
    if (!orbit) return
    const trip = flight.current
    if (trip) {
      const ease = 1 - Math.exp(-delta * 4)
      orbit.target.lerp(trip.target, ease)
      camera.position.lerp(trip.position, ease)
      if (camera.position.distanceTo(trip.position) < 0.03) flight.current = null
    }
    orbit.update()
    const [x, z] = clampTarget(orbit.target.x, orbit.target.z, layout.pan)
    if (x !== orbit.target.x || z !== orbit.target.z) {
      const shift = new THREE.Vector3(x - orbit.target.x, 0, z - orbit.target.z)
      orbit.target.add(shift)
      camera.position.add(shift)
    }
  })
  return null
})

function register<T>(registry: Registry<T>, key: string) {
  return (value: T | null) => { if (value) registry.current.set(key, value); else registry.current.delete(key) }
}

/** Current time, refreshed every `interval` ms. */
function useClock(interval: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval)
    return () => window.clearInterval(timer)
  }, [interval])
  return now
}

function useThemeName(): 'dark' | 'light' {
  const read = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  const [theme, setTheme] = useState<'dark' | 'light'>(read)
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(read()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return theme
}

/** Day in the light theme; evening in the dark theme, when the lamps in the scene switch on. */
function Lighting({ theme }: { theme: 'dark' | 'light' }) {
  const day = theme === 'light'
  return <>
    <color attach="background" args={[day ? '#bfe0ef' : '#1a2335']}/>
    <fog attach="fog" args={[day ? '#bfe0ef' : '#1a2335', 38, 75]}/>
    <hemisphereLight args={[day ? '#fff4e0' : '#7f95bd', day ? '#5d7a4c' : '#1e2620', day ? 1.1 : 0.32]}/>
    <directionalLight position={[14, 22, 12]} intensity={day ? 2.4 : 0.75} color={day ? '#fff1d6' : '#ff9a5a'} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-camera-left={-26} shadow-camera-right={26} shadow-camera-top={26} shadow-camera-bottom={-26} shadow-camera-far={80}/>
    <ambientLight intensity={day ? 0.35 : 0.14} color={day ? '#ffffff' : '#8fa4d8'}/>
  </>
}

const FLOORS: { floor: Floor; label: string; title: string }[] = [
  { floor: 2, label: 'Kamar & Rooftop', title: 'Lantai 2: dorm, lesehan, rooftop terrace and garden' },
  { floor: 1, label: 'Kantor', title: 'Lantai 1: divisions, meeting room, mushola, commons and game room' },
]
const FLOOR_KEY = 'mc.officeFloor'
const SLEEP_KEY = 'mc.officeSleep'

/** An on/off preference kept per browser. */
function useStoredFlag(key: string): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => { try { return localStorage.getItem(key) === '1' } catch { return false } })
  return [value, (next: boolean) => {
    setValue(next)
    try { localStorage.setItem(key, next ? '1' : '0') } catch { /* per-browser convenience only */ }
  }]
}

function useFloor(): [Floor, (floor: Floor) => void] {
  const [floor, setFloor] = useState<Floor>(() => {
    try { return localStorage.getItem(FLOOR_KEY) === '2' ? 2 : 1 } catch { return 1 }
  })
  return [floor, (next: Floor) => {
    setFloor(next)
    try { localStorage.setItem(FLOOR_KEY, String(next)) } catch { /* per-browser convenience only */ }
  }]
}

/** Divisions in org-chart order, for the focus buttons. */
const DIVISION_ORDER: Division[] = ['Executive', 'Engineering', 'Creative', 'Finance', 'General']
const BUSY = ['Working', 'Reviewing', 'Collaborating']

/** One division: who holds which desk there, and what they are doing. Opened from the division buttons. */
function DivisionCard({ division, layout, stations, onSelect, onClose }: { division: Division; layout: OfficeLayout; stations: OfficeStation[]; onSelect: (station: OfficeStation, trigger: HTMLElement | null) => void; onClose: () => void }) {
  const info = DIVISIONS[division]
  const desks = layout.deskInfo.filter((desk) => desk.division === division && desk.role)
  return <section className="division-card" style={{ '--division': info.color } as CSSProperties} aria-label={`${info.label} division`} onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } }}>
    <div className="division-card-head"><span><b>{info.label}</b><small>{info.area}</small></span><button type="button" className="icon-button" onClick={onClose} aria-label={`Close ${info.label}`}>✕</button></div>
    <ul>{desks.map((desk, index) => {
      const station = desk.agent !== undefined ? stations[desk.agent] : undefined
      const badge = station && officeStateBadge(station.state)
      return <li key={index}>
        <span className="division-role">{ROLE_INFO[desk.role!].title}{desk.hot ? ' · hot desk' : ''}</span>
        {station && badge ? <button type="button" onClick={(event) => onSelect(station, event.currentTarget)}><span>{station.privacy === 'locked' ? '🔒 ' : ''}{station.name}</span><span className={`badge ${badge.tone}`}>{station.state}</span></button> : <span className="division-vacant">Vacant</span>}
      </li>
    })}</ul>
  </section>
}

export default function Office3D({ stations, onSelect }: { stations: OfficeStation[]; onSelect: (station: OfficeStation, trigger: HTMLElement | null) => void }) {
  const anchors = useRef(new Map<string, THREE.Object3D>())
  const labels = useRef(new Map<string, HTMLElement>())
  const view = useRef<ViewHandle>(null)
  const [panMode, setPanMode] = useState(false)
  const [keyTarget, setKeyTarget] = useState<HTMLElement | null>(null)
  const theme = useThemeName()
  const [floor, setFloor] = useFloor()
  const [sleepMode, setSleepMode] = useStoredFlag(SLEEP_KEY)
  const [division, setDivision] = useState<Division | undefined>()
  const now = useClock(2000)
  // Every position has its own desk in its division's area; the building is sized for the crew.
  const roles = stations.map((station) => jobOf(station).role)
  const roleKey = roles.join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => createLayout(roles), [roleKey])
  // Idle agents wander between the lounge, the game room, the pantry, the street food and
  // lantai 2 (decorative only), spread so no two share a spot. With sleep mode on, every idle
  // agent goes to bed upstairs instead.
  const atDesk = (station: OfficeStation | undefined) => Boolean(station) && station!.room === 'Workspace' && station!.roomPosition !== 'meeting-area' && station!.state !== 'Offline'
  const idleSeats = stations.filter((station) => station.state === 'Idle' && station.room === 'Lounge').map((station) => station.seat)
  // Idle agents also drop by colleagues who are working at their desks, across divisions.
  const visits = stations.flatMap((station, index) => {
    const desk = layout.deskInfo[layout.agentDesks[index]]
    return desk && atDesk(station) && BUSY.includes(station.state) ? [visitSpot(desk, `Diskusi dengan ${station.name}`)] : []
  })
  const plan = idlePlan(idleSeats, now, layout, sleepMode ? idleSeats : [], visits)
  const wandering = (station: OfficeStation) => station.state === 'Idle' && station.room === 'Lounge' ? plan.get(station.seat) : undefined
  // Agents at the meeting table take the next free place around it.
  const meetingOrder = stations.filter((station) => station.roomPosition === 'meeting-area').map((station) => station.id)
  const placement = (station: OfficeStation) => wandering(station)?.placement ?? placementFor(station, layout, Math.max(0, meetingOrder.indexOf(station.id)))
  const floorCount = (value: Floor) => stations.filter((station) => floorOf(placement(station).position) === value).length
  const divisions = DIVISION_ORDER.filter((item) => layout.areas.some((area) => area.division === item))
  const focusDivision = (next: Division | undefined) => {
    setDivision(next)
    const area = next && layout.areas.find((item) => item.division === next)
    if (!area) { view.current?.reset(); return }
    setFloor(1)
    view.current?.focus(area.focus, Math.max(12, (area.area.maxX - area.area.minX) * 1.7 + 6))
  }
  return <div className="office-3d" ref={setKeyTarget} tabIndex={0} role="region" aria-label="3D office. Drag to rotate, right-drag or two fingers to pan, scroll to zoom, arrow keys pan when focused. Page Up and Page Down change floors." onKeyDown={(event) => {
    if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); setFloor(event.key === 'PageUp' ? 2 : 1) }
  }}>
    <Canvas shadows dpr={[1, 2]} camera={{ position: [-3, 13, 16], fov: 40, near: 0.5, far: 150 }} gl={{ antialias: true }}>
      <Lighting theme={theme}/>
      <Environment night={theme === 'dark'} layout={layout} floor={floor}/>
      <group visible={floor === 1}>
        {layout.deskInfo.map((desk, index) => {
          const holder = desk.agent !== undefined ? stations[desk.agent] : undefined
          const plate = desk.role ? { title: ROLE_INFO[desk.role].title, color: DIVISIONS[desk.division].color } : undefined
          // Hot desks are seats at the shared table: a laptop shows who sits there.
          if (desk.hot) {
            const [x, , z] = desk.spot.position
            return holder ? <Laptop key={index} position={[x + Math.sin(desk.spot.facing) * 0.55, 0.77, z + Math.cos(desk.spot.facing) * 0.55]} rotation={desk.spot.facing + Math.PI} active={atDesk(holder)}/> : null
          }
          return <group key={index}>
            {desk.executive ? <ExecutiveDesk position={desk.position} active={atDesk(holder)} plate={plate}/> : <WorkDesk position={desk.position} active={atDesk(holder)} kind={desk.role ? DESK_KIND[desk.role] : 'plain'} plate={plate} withChair/>}
            {desk.role && !holder && <object3D ref={register(anchors, `desk-${index}`)} position={[desk.position[0], 1.45, desk.position[2] - 0.2]}/>}
          </group>
        })}
      </group>
      {stations.map((station) => <Character key={station.id} station={station} placement={placement(station)} layout={layout} floor={floor} onSelect={onSelect} anchor={register(anchors, `agent-${station.id}`)}/>)}
      <LabelProjector anchors={anchors} labels={labels}/>
      <Controls key={layout.deskCount} ref={view} panMode={panMode} keyTarget={keyTarget} layout={layout} elevation={floor === 2 ? FLOOR_HEIGHT : 0}/>
    </Canvas>
    <div className="office-3d-labels">
      {layout.deskInfo.map((desk, index) => desk.role && !desk.hot && desk.agent === undefined && <span key={`desk-${index}`} ref={register(labels, `desk-${index}`)} className="vacant-tag-3d" style={{ '--division': DIVISIONS[desk.division].color } as CSSProperties}>Vacant · {ROLE_INFO[desk.role!].title}</span>)}
      {stations.map((station) => {
        const badge = officeStateBadge(station.state)
        const busy = BUSY.includes(station.state)
        const idle = wandering(station)
        const job = jobOf(station)
        return <button key={station.id} ref={register(labels, `agent-${station.id}`)} type="button" className={`agent-tag-3d state-${station.state.toLowerCase()}`} style={{ '--division': DIVISIONS[job.division].color } as CSSProperties} onClick={(event) => onSelect(station, event.currentTarget)} aria-label={`${station.name}, ${job.title}. ${station.state}.${station.activity ? ` ${station.activity}.` : ''}${idle ? ` ${idle.placement.label ?? idle.stop.label}.` : ''} Open station details.`}>
          {busy && station.activity && <span className="speech speech-3d">{station.activity}</span>}
          {idle && <span className={`speech speech-3d speech-idle${idle.placement.pose === 'lie' ? ' speech-sleep' : ''}`}>{idle.placement.pose === 'lie' ? '💤 ' : ''}{idle.placement.label ?? idle.stop.label}</span>}
          <span className="agent-tag-row"><span className="pixel-station-name">{station.privacy === 'locked' ? '🔒 ' : ''}{station.name}</span><span className={`badge ${badge.tone}`}>{station.state === 'Idle' ? 'Idle' : station.state}</span></span>
          <span className="agent-role-3d">{job.title}</span>
        </button>
      })}
    </div>
    <div className="office-3d-side">
      <div className="office-3d-floors" role="group" aria-label="Floors">
        {FLOORS.map((item) => <button key={item.floor} type="button" className={floor === item.floor ? 'active' : ''} aria-pressed={floor === item.floor} onClick={() => setFloor(item.floor)} title={`${item.title} (Page ${item.floor === 2 ? 'Up' : 'Down'})`}>
          <b>{item.floor}</b><span>{item.label}</span><small>{floorCount(item.floor)}</small>
        </button>)}
      </div>
      <div className="office-3d-divisions" role="group" aria-label="Divisions">
        {divisions.map((item) => {
          const members = stations.filter((station) => jobOf(station).division === item)
          const active = members.filter((station) => BUSY.includes(station.state)).length
          return <button key={item} type="button" className={division === item ? 'active' : ''} aria-pressed={division === item} style={{ '--division': DIVISIONS[item].color } as CSSProperties} onClick={() => focusDivision(division === item ? undefined : item)} title={`Go to ${DIVISIONS[item].area}`}>
            <i aria-hidden="true"/><span>{DIVISIONS[item].label}</span><small>{active > 0 ? `${active}/` : ''}{members.length}</small>
          </button>
        })}
      </div>
      {division && <DivisionCard division={division} layout={layout} stations={stations} onSelect={onSelect} onClose={() => focusDivision(undefined)}/>}
    </div>
    <div className="office-3d-tools">
      <button type="button" className={sleepMode ? 'active sleep' : ''} aria-pressed={sleepMode} onClick={() => { setSleepMode(!sleepMode); if (!sleepMode && idleSeats.length > 0) setFloor(2) }} title="Send every idle agent to bed on lantai 2">💤 Tidur</button>
      <button type="button" className={panMode ? 'active' : ''} aria-pressed={panMode} onClick={() => setPanMode((value) => !value)} title="Drag moves the view instead of rotating it">✥ Geser</button>
      <button type="button" onClick={() => { setDivision(undefined); view.current?.reset() }} title="Back to the starting view">↺ Reset view</button>
    </div>
  </div>
}
