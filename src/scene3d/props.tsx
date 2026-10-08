import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Vec3 } from '../office3d-layout.ts'
import { arcadeScreen, brickWall, companyLogo, dashboardScreen, merahPutih, movieScreen, namePlate, neonText, sajadah, screenTexture, signTexture } from './textures.ts'

// Low-poly props built from primitives. Rounded edges and PBR materials keep them from
// looking flat; everything is procedural, so no model files are shipped.

const roundedCache = new Map<string, THREE.BufferGeometry>()
function roundedGeometry(size: Vec3, radius: number) {
  const key = `${size.join(',')}:${radius}`
  let geometry = roundedCache.get(key)
  if (!geometry) {
    geometry = new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(radius, ...size.map((value) => value / 2 - 0.001)))
    roundedCache.set(key, geometry)
  }
  return geometry
}

interface MaterialProps { color: string; roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number; opacity?: number; map?: THREE.Texture }

function Material({ color, roughness = 0.7, metalness = 0, emissive, emissiveIntensity = 0.5, opacity, map }: MaterialProps) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} emissive={emissive ?? '#000000'} emissiveIntensity={emissive ? emissiveIntensity : 0} transparent={opacity !== undefined} opacity={opacity ?? 1} map={map}/>
}

/** Rounded box. */
export function RBox({ position, size, radius = 0.04, rotation, shadow = true, ...material }: { position: Vec3; size: Vec3; radius?: number; rotation?: Vec3; shadow?: boolean } & MaterialProps) {
  return <mesh position={position} rotation={rotation} geometry={roundedGeometry(size, radius)} castShadow={shadow} receiveShadow>
    <Material {...material}/>
  </mesh>
}

export function Cyl({ position, radius, height, rotation, segments = 20, top, ...material }: { position: Vec3; radius: number; height: number; rotation?: Vec3; segments?: number; top?: number } & MaterialProps) {
  return <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <cylinderGeometry args={[top ?? radius, radius, height, segments]}/>
    <Material {...material}/>
  </mesh>
}

function Group({ position = [0, 0, 0], rotation = 0, scale = 1, children }: { position?: Vec3; rotation?: number; scale?: number; children: ReactNode }) {
  return <group position={position} rotation={[0, rotation, 0]} scale={scale}>{children}</group>
}

// ---------------------------------------------------------------------------
// Office furniture

export function OfficeChair({ position, rotation = 0, color = '#2f3a44' }: { position: Vec3; rotation?: number; color?: string }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.48, 0]} size={[0.52, 0.09, 0.5]} radius={0.04} color={color} roughness={0.9}/>
    <RBox position={[0, 0.85, -0.23]} size={[0.5, 0.6, 0.07]} radius={0.04} color={color} roughness={0.9}/>
    <Cyl position={[0, 0.25, 0]} radius={0.035} height={0.42} color="#8b9297" metalness={0.6} roughness={0.3}/>
    {[0, 1, 2, 3, 4].map((spoke) => <RBox key={spoke} position={[Math.sin((spoke / 5) * Math.PI * 2) * 0.2, 0.05, Math.cos((spoke / 5) * Math.PI * 2) * 0.2]} rotation={[0, (spoke / 5) * Math.PI * 2, 0]} size={[0.05, 0.04, 0.42]} radius={0.015} color="#2a2f33"/>)}
  </Group>
}

/** What sits on a desk besides the monitor: the tools of the position it is for. */
export type DeskKind = 'dev' | 'design' | 'content' | 'finance' | 'plain'
export interface Plate { title: string; color: string }

/** A desk nameplate facing visitors (and the camera), on the far edge of the desk. */
function DeskPlate({ plate, position }: { plate: Plate; position: Vec3 }) {
  const texture = useMemo(() => namePlate(plate.title, plate.color), [plate.title, plate.color])
  return <group position={position}>
    <RBox position={[0, 0, -0.02]} size={[0.66, 0.17, 0.03]} radius={0.01} color="#1c2024" rotation={[-0.25, 0, 0]}/>
    <mesh position={[0, 0.004, 0]} rotation={[-0.25, 0, 0]}><planeGeometry args={[0.62, 0.155]}/><meshStandardMaterial map={texture} roughness={0.5}/></mesh>
  </group>
}

function DeskTools({ kind }: { kind: DeskKind }) {
  if (kind === 'dev') return <>
    {/* A second, angled monitor and a mechanical keyboard's glow */}
    <group position={[0.68, 0, 0.12]} rotation={[0, -0.45, 0]}>
      <RBox position={[0, 1.08, 0]} size={[0.5, 0.36, 0.04]} radius={0.02} color="#1c2024"/>
      <mesh position={[0, 1.08, -0.022]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.46, 0.32]}/><meshStandardMaterial color="#14262f" emissive="#3fbf9f" emissiveIntensity={0.35}/></mesh>
      <Cyl position={[0, 0.87, 0.02]} radius={0.025} height={0.2} color="#2a2f33"/>
    </group>
    <RBox position={[0, 0.775, -0.18]} size={[0.6, 0.006, 0.21]} radius={0.002} color="#6b5cff" emissive="#6b5cff" emissiveIntensity={0.6} shadow={false}/>
  </>
  if (kind === 'design') return <>
    {/* Drawing tablet with its pen, and colour swatches */}
    <RBox position={[0.5, 0.79, -0.2]} size={[0.42, 0.02, 0.3]} radius={0.01} color="#22262b"/>
    <RBox position={[0.5, 0.802, -0.2]} size={[0.34, 0.004, 0.22]} radius={0.002} color="#3a4a5c" emissive="#6fa8dc" emissiveIntensity={0.25}/>
    <RBox position={[0.75, 0.81, -0.22]} size={[0.015, 0.015, 0.2]} radius={0.006} color="#e8e8e8" rotation={[0, 0.4, 0]}/>
    {['#e76f51', '#f4a261', '#2a9d8f', '#8d5bc1'].map((color, index) => <RBox key={color} position={[-0.45 + index * 0.07, 0.79, 0.1]} size={[0.06, 0.01, 0.12]} radius={0.003} color={color} rotation={[0, 0.2 * index, 0]}/>)}
  </>
  if (kind === 'content') return <>
    {/* Podcast microphone on an arm and a mirrorless camera */}
    <Cyl position={[0.7, 0.8, 0.05]} radius={0.06} height={0.03} color="#2a2f33"/>
    <Rod from={[0.7, 0.8, 0.05]} to={[0.62, 1.05, -0.12]} color="#2a2f33" radius={0.012}/>
    <Cyl position={[0.62, 1.1, -0.14]} radius={0.04} height={0.14} color="#30353a" rotation={[0.5, 0, 0]}/>
    <RBox position={[-0.4, 0.83, 0.12]} size={[0.18, 0.11, 0.08]} radius={0.02} color="#202326"/>
    <Cyl position={[-0.4, 0.83, 0.19]} radius={0.035} height={0.07} color="#101214" rotation={[Math.PI / 2, 0, 0]}/>
  </>
  if (kind === 'finance') return <>
    {/* Paper stacks, a calculator and a folder */}
    {[0, 1, 2].map((index) => <RBox key={index} position={[0.62, 0.79 + index * 0.025, 0.1]} size={[0.3, 0.02, 0.38]} radius={0.004} color={index === 2 ? '#fbfaf5' : '#ece8dc'}/>)}
    <RBox position={[0.42, 0.79, -0.22]} size={[0.13, 0.02, 0.18]} radius={0.01} color="#2b3036"/>
    <RBox position={[0.42, 0.802, -0.19]} size={[0.1, 0.004, 0.05]} radius={0.002} color="#a8c99a"/>
    <RBox position={[-0.42, 0.8, 0.12]} size={[0.24, 0.04, 0.32]} radius={0.01} color="#2a9d6f"/>
  </>
  return null
}

export function WorkDesk({ position, active, withChair = true, kind = 'plain', plate }: { position: Vec3; active: boolean; withChair?: boolean; kind?: DeskKind; plate?: Plate }) {
  const screen = useMemo(() => screenTexture(active), [active])
  return <Group position={position}>
    <RBox position={[0, 0.74, 0]} size={[1.9, 0.07, 0.95]} radius={0.03} color="#d9c3a0" roughness={0.6}/>
    <RBox position={[-0.9, 0.37, 0]} size={[0.06, 0.72, 0.85]} radius={0.02} color="#e7e2d8"/>
    <RBox position={[0.9, 0.37, 0]} size={[0.06, 0.72, 0.85]} radius={0.02} color="#e7e2d8"/>
    <RBox position={[0.55, 0.52, 0.02]} size={[0.42, 0.4, 0.8]} radius={0.02} color="#e7e2d8"/>
    {/* Monitor */}
    <RBox position={[0, 1.13, 0.22]} size={[0.86, 0.52, 0.05]} radius={0.02} color="#1c2024" roughness={0.4}/>
    <mesh position={[0, 1.13, 0.194]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.8, 0.46]}/><meshStandardMaterial map={screen} emissive={active ? '#ffffff' : '#000000'} emissiveMap={screen} emissiveIntensity={active ? 0.9 : 0} roughness={0.3}/></mesh>
    <Cyl position={[0, 0.88, 0.25]} radius={0.03} height={0.22} color="#2a2f33"/>
    <RBox position={[0, 0.785, 0.28]} size={[0.3, 0.02, 0.18]} radius={0.01} color="#2a2f33"/>
    {/* Keyboard, mouse and a mug of kopi */}
    <RBox position={[0, 0.79, -0.18]} size={[0.56, 0.025, 0.18]} radius={0.01} color="#3a4046"/>
    {kind !== 'design' && <RBox position={[0.42, 0.79, -0.18]} size={[0.07, 0.03, 0.11]} radius={0.02} color="#3a4046"/>}
    <Cyl position={[-0.65, 0.84, -0.1]} radius={0.05} height={0.12} color="#f4efe6"/>
    <Cyl position={[-0.65, 0.901, -0.1]} radius={0.043} height={0.005} color="#3b2415"/>
    <DeskTools kind={kind}/>
    {plate && <DeskPlate plate={plate} position={[-0.45, 0.86, 0.43]}/>}
    {withChair && <OfficeChair position={[0, 0, -0.78]}/>}
  </Group>
}

/** The CEO's desk: walnut with a modesty panel, a high-backed leather chair, a globe and a gold plate. */
export function ExecutiveDesk({ position, active, plate }: { position: Vec3; active: boolean; plate?: Plate }) {
  const screen = useMemo(() => screenTexture(active), [active])
  return <Group position={position}>
    <RBox position={[0, 0.76, 0]} size={[2.3, 0.08, 1.05]} radius={0.03} color="#5a3825" roughness={0.4}/>
    <RBox position={[0, 0.38, 0.42]} size={[2.2, 0.68, 0.06]} radius={0.02} color="#4a2d1e" roughness={0.5}/>
    <RBox position={[-0.85, 0.38, 0]} size={[0.5, 0.72, 0.9]} radius={0.02} color="#4a2d1e" roughness={0.5}/>
    <RBox position={[0.85, 0.38, 0]} size={[0.5, 0.72, 0.9]} radius={0.02} color="#4a2d1e" roughness={0.5}/>
    <RBox position={[0, 1.15, 0.22]} size={[0.9, 0.54, 0.05]} radius={0.02} color="#1c2024" roughness={0.4}/>
    <mesh position={[0, 1.15, 0.194]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.84, 0.48]}/><meshStandardMaterial map={screen} emissive={active ? '#ffffff' : '#000000'} emissiveMap={screen} emissiveIntensity={active ? 0.9 : 0} roughness={0.3}/></mesh>
    <Cyl position={[0, 0.9, 0.25]} radius={0.03} height={0.22} color="#2a2f33"/>
    <RBox position={[0, 0.81, -0.18]} size={[0.5, 0.02, 0.16]} radius={0.01} color="#d9d9d9"/>
    {/* Globe and a cup of teh */}
    <Cyl position={[0.85, 0.82, 0.15]} radius={0.06} height={0.04} color="#c9a227" metalness={0.6} roughness={0.3}/>
    <mesh position={[0.85, 1, 0.15]} castShadow><sphereGeometry args={[0.15, 18, 12]}/><meshStandardMaterial color="#3b7fbf" roughness={0.5}/></mesh>
    <Cyl position={[-0.8, 0.86, -0.15]} radius={0.05} height={0.1} color="#f4efe6"/>
    {plate && <DeskPlate plate={plate} position={[-0.4, 0.88, 0.48]}/>}
    {/* High-backed leather chair */}
    <Group position={[0, 0, -0.8]}>
      <RBox position={[0, 0.5, 0]} size={[0.62, 0.12, 0.58]} radius={0.05} color="#2b1d16" roughness={0.6}/>
      <RBox position={[0, 1.05, -0.27]} size={[0.6, 1.0, 0.1]} radius={0.06} color="#2b1d16" roughness={0.6}/>
      <Cyl position={[0, 0.26, 0]} radius={0.04} height={0.44} color="#8b9297" metalness={0.6} roughness={0.3}/>
      <Cyl position={[0, 0.04, 0]} radius={0.3} height={0.05} color="#2a2f33"/>
    </Group>
  </Group>
}

/** A division sign hanging from the ceiling on two cables, readable from the camera side. */
export function HangingSign({ position, width, texture }: { position: Vec3; width: number; texture: THREE.Texture }) {
  const height = width / 4
  return <Group position={position}>
    {[-width / 2 + 0.15, width / 2 - 0.15].map((x) => <Cyl key={x} position={[x, height / 2 + 0.25, 0]} radius={0.008} height={0.5} color="#9aa0a6"/>)}
    <RBox position={[0, 0, -0.02]} size={[width + 0.06, height + 0.06, 0.04]} radius={0.015} color="#1c2024"/>
    <mesh position={[0, 0, 0.001]}><planeGeometry args={[width, height]}/><meshStandardMaterial map={texture} roughness={0.6} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.15}/></mesh>
  </Group>
}

/** A rolling whiteboard with an architecture sketch. */
export function Whiteboard({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 1.35, 0]} size={[1.7, 1.0, 0.05]} radius={0.02} color="#f8f8f6" roughness={0.3}/>
    {[[-0.5, 1.6, '#3d7fd6'], [0.1, 1.6, '#3d7fd6'], [0.6, 1.25, '#2a9d6f'], [-0.3, 1.1, '#d64545']].map(([x, y, color]) => <RBox key={`${x}${y}`} position={[x as number, y as number, 0.03]} size={[0.32, 0.16, 0.01]} radius={0.005} color={color as string}/>)}
    <RBox position={[-0.2, 1.6, 0.03]} size={[0.3, 0.015, 0.01]} radius={0.003} color="#30353a"/>
    <RBox position={[0.35, 1.42, 0.03]} size={[0.015, 0.25, 0.01]} radius={0.003} color="#30353a"/>
    <RBox position={[0, 0.82, 0.05]} size={[1.6, 0.04, 0.08]} radius={0.01} color="#9aa0a6"/>
    {[-0.75, 0.75].map((x) => <Group key={x} position={[x, 0, 0]}><Cyl position={[0, 0.42, 0]} radius={0.025} height={0.84} color="#9aa0a6" metalness={0.5}/><RBox position={[0, 0.03, 0]} size={[0.06, 0.04, 0.6]} radius={0.01} color="#2a2f33"/></Group>)}
  </Group>
}

/** A big screen on the wall with a live-looking dashboard. */
export function WallScreen({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  const texture = useMemo(() => dashboardScreen(), [])
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0, 0]} size={[1.6, 0.92, 0.06]} radius={0.02} color="#111416"/>
    <mesh position={[0, 0, 0.032]}><planeGeometry args={[1.52, 0.84]}/><meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.6} roughness={0.3}/></mesh>
  </Group>
}

/** A small server rack with blinking lights. */
export function ServerRack({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  const lights = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => { if (lights.current) lights.current.emissiveIntensity = 0.6 + Math.abs(Math.sin(clock.elapsedTime * 4)) * 0.8 })
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.9, 0]} size={[0.62, 1.8, 0.7]} radius={0.02} color="#1d2126"/>
    {[0, 1, 2, 3, 4, 5].map((unit) => <RBox key={unit} position={[0, 0.35 + unit * 0.24, 0.36]} size={[0.54, 0.16, 0.02]} radius={0.005} color="#2b3036"/>)}
    {[0, 1, 2, 3, 4, 5].map((unit) => <mesh key={unit} position={[0.2, 0.35 + unit * 0.24, 0.372]}><boxGeometry args={[0.04, 0.03, 0.005]}/><meshStandardMaterial ref={unit === 0 ? lights : undefined} color="#2bd47a" emissive="#2bd47a" emissiveIntensity={1}/></mesh>)}
  </Group>
}

export function FilingCabinet({ position, rotation = 0, color = '#9aa3ab' }: { position: Vec3; rotation?: number; color?: string }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.66, 0]} size={[0.5, 1.32, 0.6]} radius={0.02} color={color} metalness={0.3} roughness={0.5}/>
    {[0.3, 0.7, 1.1].map((y) => <Group key={y} position={[0, y, 0.305]}><RBox position={[0, 0, 0]} size={[0.44, 0.36, 0.01]} radius={0.005} color="#b8c0c7"/><RBox position={[0, 0.08, 0.01]} size={[0.16, 0.03, 0.02]} radius={0.008} color="#3a4046"/></Group>)}
  </Group>
}

/** The office safe (brankas). */
export function Safe({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.4, 0]} size={[0.6, 0.8, 0.6]} radius={0.03} color="#3a3f45" metalness={0.5} roughness={0.4}/>
    <Cyl position={[0.05, 0.45, 0.31]} radius={0.08} height={0.03} rotation={[Math.PI / 2, 0, 0]} color="#c9a227" metalness={0.7} roughness={0.3}/>
    <RBox position={[0.2, 0.3, 0.31]} size={[0.04, 0.14, 0.03]} radius={0.01} color="#c9a227" metalness={0.7}/>
  </Group>
}

export function Printer({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.35, 0]} size={[0.7, 0.7, 0.55]} radius={0.02} color="#6b4a32"/>
    <RBox position={[0, 0.88, 0]} size={[0.6, 0.36, 0.5]} radius={0.03} color="#e7e5df"/>
    <RBox position={[0, 1.07, 0.05]} size={[0.4, 0.02, 0.3]} radius={0.005} color="#fbfaf5"/>
    <RBox position={[0.2, 1.065, -0.15]} size={[0.12, 0.02, 0.08]} radius={0.005} color="#30353a"/>
  </Group>
}

/** Content studio: a ring light and a camera on a tripod, aimed at a small backdrop. */
export function StudioSet({ position, rotation = 0, night = false }: { position: Vec3; rotation?: number; night?: boolean }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 1.1, -0.9]} size={[1.6, 2.1, 0.04]} radius={0.01} color="#d6457a" roughness={0.95}/>
    <Group position={[-0.6, 0, 0]}>
      {[0, 2.1, 4.2].map((angle) => <Rod key={angle} from={[0, 1.0, 0]} to={[Math.sin(angle) * 0.3, 0, Math.cos(angle) * 0.3]} color="#2a2f33" radius={0.012}/>)}
      <Cyl position={[0, 1.3, 0]} radius={0.014} height={0.6} color="#2a2f33"/>
      <mesh position={[0, 1.65, 0]} rotation={[0, 0.5, 0]}><torusGeometry args={[0.22, 0.03, 8, 28]}/><meshStandardMaterial color="#ffffff" emissive="#fff6e0" emissiveIntensity={night ? 1.6 : 0.8}/></mesh>
    </Group>
    <Group position={[0.55, 0, 0.3]}>
      {[0, 2.1, 4.2].map((angle) => <Rod key={angle} from={[0, 1.1, 0]} to={[Math.sin(angle) * 0.3, 0, Math.cos(angle) * 0.3]} color="#2a2f33" radius={0.012}/>)}
      <RBox position={[0, 1.2, 0]} size={[0.22, 0.15, 0.12]} radius={0.02} color="#16181b"/>
      <Cyl position={[0, 1.2, -0.1]} radius={0.05} height={0.12} color="#0e1012" rotation={[Math.PI / 2, 0, 0]}/>
    </Group>
  </Group>
}

/** A pinboard of colourful cards: moodboards and wireframes. */
export function Moodboard({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  const cards = ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#8d5bc1', '#3d7fd6', '#f4a3b4', '#ffffff']
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0, 0]} size={[1.6, 0.9, 0.04]} radius={0.01} color="#b98b5e" roughness={0.95}/>
    {cards.map((color, index) => <RBox key={color} position={[-0.6 + (index % 4) * 0.4, 0.2 - Math.floor(index / 4) * 0.4, 0.03]} size={[0.3, 0.26, 0.01]} radius={0.004} color={color} rotation={[0, 0, ((index * 37) % 9 - 4) * 0.03]}/>)}
  </Group>
}

/** A low cabinet with trophies and a framed photo, for the executive suite. */
export function TrophyCabinet({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.4, 0]} size={[1.6, 0.8, 0.45]} radius={0.02} color="#4a2d1e" roughness={0.5}/>
    {[-0.5, 0, 0.5].map((x, index) => <Group key={x} position={[x, 0.8, 0]}>
      <Cyl position={[0, 0.04, 0]} radius={0.07} height={0.08} color="#2a2f33"/>
      <Cyl position={[0, 0.2, 0]} radius={0.03} height={0.24} color="#c9a227" metalness={0.8} roughness={0.25}/>
      <Cyl position={[0, 0.36 + index * 0.02, 0]} radius={0.09} top={0.12} height={0.12} color="#c9a227" metalness={0.8} roughness={0.25}/>
    </Group>)}
  </Group>
}

/** Reception counter with the company logo on its front. */
export function ReceptionDesk({ position, rotation = 0, name, tagline }: { position: Vec3; rotation?: number; name: string; tagline: string }) {
  const logo = useMemo(() => companyLogo(name, tagline), [name, tagline])
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.55, 0]} size={[2.2, 1.1, 0.6]} radius={0.04} color="#f7f4ee" roughness={0.5}/>
    <RBox position={[0, 1.12, -0.05]} size={[2.3, 0.05, 0.75]} radius={0.02} color="#5a3825" roughness={0.4}/>
    <mesh position={[0, 0.62, 0.302]}><planeGeometry args={[1.8, 0.45]}/><meshStandardMaterial map={logo} roughness={0.5}/></mesh>
    <Plant position={[0.85, 1.14, -0.1]} size={0.35}/>
  </Group>
}

/** The company sign by the sidewalk: the logo on a stone plinth, lit in the evening. */
export function CompanySign({ position, rotation = 0, name, tagline, night = false }: { position: Vec3; rotation?: number; name: string; tagline: string; night?: boolean }) {
  const logo = useMemo(() => companyLogo(name, tagline, true), [name, tagline])
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.25, 0]} size={[3.4, 0.5, 0.6]} radius={0.04} color="#8c8a84" roughness={0.95}/>
    <RBox position={[0, 1.05, 0]} size={[3.2, 1.0, 0.2]} radius={0.03} color="#121a2b"/>
    <mesh position={[0, 1.05, 0.102]}><planeGeometry args={[3.1, 0.78]}/><meshStandardMaterial map={logo} emissive="#ffffff" emissiveMap={logo} emissiveIntensity={night ? 0.75 : 0.1} roughness={0.5}/></mesh>
  </Group>
}

export function MeetingTable({ position }: { position: Vec3 }) {
  return <Group position={position}>
    <Cyl position={[0, 0.74, 0]} radius={1.05} height={0.08} color="#7a4f33" roughness={0.45} segments={40}/>
    <Cyl position={[0, 0.37, 0]} radius={0.12} height={0.72} color="#2a2f33"/>
    <Cyl position={[0, 0.03, 0]} radius={0.5} height={0.05} color="#2a2f33"/>
    {/* A plate of gorengan for the meeting */}
    <Cyl position={[0.2, 0.8, 0.1]} radius={0.22} height={0.03} color="#f4efe6"/>
    {[0, 1, 2, 3].map((index) => <RBox key={index} position={[0.12 + (index % 2) * 0.14, 0.84, 0.02 + Math.floor(index / 2) * 0.14]} size={[0.12, 0.05, 0.08]} radius={0.02} color="#c98a3c" roughness={0.9}/>)}
  </Group>
}

export function Sofa({ position, rotation = 0, color = '#5b6f8c' }: { position: Vec3; rotation?: number; color?: string }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.28, 0]} size={[2.4, 0.36, 0.9]} radius={0.1} color={color} roughness={0.95}/>
    <RBox position={[0, 0.66, -0.36]} size={[2.4, 0.62, 0.2]} radius={0.1} color={color} roughness={0.95}/>
    <RBox position={[-1.12, 0.52, 0]} size={[0.2, 0.42, 0.9]} radius={0.08} color={color} roughness={0.95}/>
    <RBox position={[1.12, 0.52, 0]} size={[0.2, 0.42, 0.9]} radius={0.08} color={color} roughness={0.95}/>
    {[-0.5, 0.5].map((x) => <RBox key={x} position={[x, 0.5, 0.05]} size={[0.95, 0.14, 0.7]} radius={0.07} color="#6e83a2" roughness={0.95}/>)}
    <RBox position={[-0.7, 0.72, -0.18]} size={[0.38, 0.34, 0.14]} radius={0.07} color="#e0a43a" roughness={0.95}/>
  </Group>
}

export function Armchair({ position, rotation = 0, color }: { position: Vec3; rotation?: number; color: string }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.3, 0]} size={[0.9, 0.4, 0.85]} radius={0.12} color={color} roughness={0.95}/>
    <RBox position={[0, 0.66, -0.34]} size={[0.9, 0.52, 0.18]} radius={0.08} color={color} roughness={0.95}/>
  </Group>
}

export function CoffeeTable({ position }: { position: Vec3 }) {
  return <Group position={position}>
    <RBox position={[0, 0.36, 0]} size={[1.3, 0.07, 0.7]} radius={0.03} color="#8a5a3a" roughness={0.5}/>
    {[[-0.55, -0.27], [0.55, -0.27], [-0.55, 0.27], [0.55, 0.27]].map(([x, z]) => <Cyl key={`${x}${z}`} position={[x, 0.17, z]} radius={0.03} height={0.34} color="#2a2f33"/>)}
    {/* Teh botol and a toples of kerupuk */}
    <Cyl position={[-0.3, 0.48, 0.05]} radius={0.04} height={0.18} color="#3a1f12" opacity={0.85}/>
    <Cyl position={[0.25, 0.49, 0]} radius={0.12} height={0.2} color="#dfe8e6" opacity={0.55} roughness={0.1}/>
    <Cyl position={[0.25, 0.47, 0]} radius={0.1} height={0.14} color="#f1d9a6"/>
  </Group>
}

export function Plant({ position, size = 1 }: { position: Vec3; size?: number }) {
  return <Group position={position} scale={size}>
    <Cyl position={[0, 0.22, 0]} radius={0.2} top={0.26} height={0.44} color="#b0643a" roughness={0.8}/>
    {[[0, 0.75, 0, 0.32], [0.14, 0.95, 0.05, 0.22], [-0.12, 0.92, -0.06, 0.24], [0, 1.12, 0, 0.18]].map(([x, y, z, r]) => <mesh key={`${x}${y}`} position={[x, y, z]} castShadow><icosahedronGeometry args={[r, 1]}/><meshStandardMaterial color="#4f8a4a" roughness={0.85} flatShading/></mesh>)}
  </Group>
}

export function Bookshelf({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  const books = useMemo(() => Array.from({ length: 18 }, (_, index) => ({ color: ['#b54b45', '#2f6f8f', '#e0a43a', '#4f8a4a', '#6a4d8d', '#dcd6c8'][index % 6], height: 0.26 + ((index * 7) % 5) * 0.03 })), [])
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 1, 0]} size={[1.4, 2, 0.4]} radius={0.02} color="#6b4a32"/>
    {[0.35, 0.95, 1.55].map((y, shelf) => books.slice(shelf * 6, shelf * 6 + 6).map((book, index) => <RBox key={`${shelf}-${index}`} position={[-0.5 + index * 0.2, y + book.height / 2, 0.08]} size={[0.14, book.height, 0.26]} radius={0.01} color={book.color}/>))}
  </Group>
}

export function Television({ position }: { position: Vec3 }) {
  return <Group position={position}>
    <RBox position={[0, 0, 0]} size={[2, 1.15, 0.08]} radius={0.03} color="#111416" roughness={0.3}/>
    <mesh position={[0, 0, 0.045]}><planeGeometry args={[1.88, 1.03]}/><meshStandardMaterial color="#1d5a6b" emissive="#2a8aa0" emissiveIntensity={0.55} roughness={0.2}/></mesh>
  </Group>
}

export function WallClock({ position }: { position: Vec3 }) {
  return <Group position={position}>
    <Cyl position={[0, 0, 0]} radius={0.3} height={0.05} rotation={[Math.PI / 2, 0, 0]} color="#f4efe6" segments={28}/>
    <RBox position={[0, 0.07, 0.035]} size={[0.03, 0.18, 0.01]} radius={0.004} color="#1c2024"/>
    <RBox position={[0.06, 0, 0.035]} size={[0.14, 0.025, 0.01]} radius={0.004} color="#1c2024"/>
  </Group>
}

// ---------------------------------------------------------------------------
// Indonesian touches

/** Water dispenser with an upside-down blue galon. */
export function GalonDispenser({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.5, 0]} size={[0.42, 1, 0.42]} radius={0.05} color="#eef0ee" roughness={0.4}/>
    <RBox position={[0, 0.72, 0.19]} size={[0.3, 0.14, 0.06]} radius={0.02} color="#c9ced0"/>
    <Cyl position={[-0.07, 0.72, 0.23]} radius={0.022} height={0.06} rotation={[Math.PI / 2, 0, 0]} color="#d64545"/>
    <Cyl position={[0.07, 0.72, 0.23]} radius={0.022} height={0.06} rotation={[Math.PI / 2, 0, 0]} color="#3d7fd6"/>
    <RBox position={[0, 0.54, 0.16]} size={[0.28, 0.02, 0.14]} radius={0.01} color="#9aa2a6"/>
    {/* The galon: translucent blue, neck down */}
    <Cyl position={[0, 1.33, 0]} radius={0.19} height={0.52} color="#5fb4f2" opacity={0.55} roughness={0.08} segments={24}/>
    <Cyl position={[0, 1.05, 0]} radius={0.06} top={0.17} height={0.1} color="#5fb4f2" opacity={0.6} roughness={0.08}/>
    <Cyl position={[0, 1.6, 0]} radius={0.17} height={0.03} color="#3d8fd6" opacity={0.7}/>
    <Cyl position={[0, 1.3, 0]} radius={0.175} height={0.4} color="#8fd0ff" opacity={0.35} roughness={0.05}/>
  </Group>
}

export function Fridge({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.9, 0]} size={[0.75, 1.8, 0.7]} radius={0.05} color="#dfe3e4" roughness={0.35} metalness={0.2}/>
    <RBox position={[0, 1.3, 0.36]} size={[0.7, 0.02, 0.02]} radius={0.005} color="#9aa2a6"/>
    <RBox position={[0.28, 1.0, 0.37]} size={[0.03, 0.4, 0.03]} radius={0.01} color="#9aa2a6"/>
  </Group>
}

export function PantryCounter({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.45, 0]} size={[2, 0.9, 0.6]} radius={0.02} color="#f2eee6"/>
    <RBox position={[0, 0.92, 0]} size={[2.05, 0.05, 0.65]} radius={0.01} color="#3a3f44" roughness={0.3}/>
    {/* Rice cooker, kopi sachets jar and a kettle */}
    <Cyl position={[-0.6, 1.07, 0]} radius={0.16} height={0.24} color="#f5f5f2"/>
    <Cyl position={[-0.6, 1.2, 0]} radius={0.14} top={0.1} height={0.05} color="#d64545"/>
    <Cyl position={[0.1, 1.05, 0]} radius={0.1} height={0.2} color="#dfe8e6" opacity={0.5}/>
    <Cyl position={[0.1, 1.02, 0]} radius={0.085} height={0.12} color="#6b3b1e"/>
    <Cyl position={[0.62, 1.06, 0]} radius={0.12} top={0.08} height={0.22} color="#b9c0c4" metalness={0.7} roughness={0.25}/>
  </Group>
}

/** Merah Putih on a pole; the cloth waves gently. */
export function FlagPole({ position }: { position: Vec3 }) {
  const cloth = useRef<THREE.Mesh>(null)
  const texture = useMemo(() => merahPutih(), [])
  const geometry = useMemo(() => new THREE.PlaneGeometry(1.2, 0.8, 12, 1).translate(0.6, 0, 0), [])
  const base = useMemo(() => Float32Array.from(geometry.attributes.position.array as Float32Array), [geometry])
  useFrame(({ clock }) => {
    const position = geometry.attributes.position
    for (let index = 0; index < position.count; index += 1) {
      const x = base[index * 3]
      position.setZ(index, Math.sin(clock.elapsedTime * 3 + x * 4) * 0.08 * x)
    }
    position.needsUpdate = true
    geometry.computeVertexNormals()
  })
  return <Group position={position}>
    <Cyl position={[0, 0.1, 0]} radius={0.35} height={0.2} color="#bdb6a8"/>
    <Cyl position={[0, 2.6, 0]} radius={0.04} height={5} color="#d9dde0" metalness={0.6} roughness={0.3}/>
    <mesh position={[0, 5.05, 0]}><sphereGeometry args={[0.07, 12, 8]}/><meshStandardMaterial color="#d8b24a" metalness={0.7} roughness={0.3}/></mesh>
    <mesh ref={cloth} position={[0.04, 4.55, 0]} geometry={geometry} castShadow><meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={0.8}/></mesh>
  </Group>
}

export function PlasticStool({ position, color }: { position: Vec3; color: string }) {
  return <Group position={position}>
    <Cyl position={[0, 0.42, 0]} radius={0.17} height={0.04} color={color} roughness={0.5}/>
    <Cyl position={[0, 0.21, 0]} radius={0.19} top={0.15} height={0.4} color={color} roughness={0.5} segments={8}/>
  </Group>
}

function Wheel({ position }: { position: Vec3 }) {
  return <group position={position}>
    <Cyl position={[0, 0, 0]} radius={0.3} height={0.06} rotation={[0, 0, Math.PI / 2]} color="#1f2326" segments={20}/>
    <Cyl position={[0, 0, 0]} radius={0.08} height={0.08} rotation={[0, 0, Math.PI / 2]} color="#c9ced0" metalness={0.6}/>
  </group>
}

/** A standing street vendor (not an agent: vendors never move and carry no state). */
export function Vendor({ position, rotation = 0, shirt, pants = '#34393f', hat }: { position: Vec3; rotation?: number; shirt: string; pants?: string; hat: 'peci' | 'cap' }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[-0.11, 0.35, 0]} size={[0.17, 0.66, 0.2]} radius={0.05} color={pants}/>
    <RBox position={[0.11, 0.35, 0]} size={[0.17, 0.66, 0.2]} radius={0.05} color={pants}/>
    <RBox position={[0, 0.98, 0]} size={[0.48, 0.6, 0.3]} radius={0.07} color={shirt} roughness={0.85}/>
    <RBox position={[-0.31, 0.95, 0.05]} size={[0.12, 0.52, 0.14]} radius={0.04} rotation={[-0.35, 0, 0]} color={shirt}/>
    <RBox position={[0.31, 0.95, 0.05]} size={[0.12, 0.52, 0.14]} radius={0.04} rotation={[-0.35, 0, 0]} color={shirt}/>
    <RBox position={[0, 1.5, 0]} size={[0.4, 0.4, 0.37]} radius={0.08} color="#c98e5a" roughness={0.7}/>
    <RBox position={[-0.09, 1.52, 0.186]} size={[0.06, 0.07, 0.01]} radius={0.004} color="#17201e" shadow={false}/>
    <RBox position={[0.09, 1.52, 0.186]} size={[0.06, 0.07, 0.01]} radius={0.004} color="#17201e" shadow={false}/>
    {hat === 'peci'
      ? <RBox position={[0, 1.76, 0]} size={[0.36, 0.14, 0.34]} radius={0.03} color="#1b1d20" roughness={0.9}/>
      : <><RBox position={[0, 1.74, 0]} size={[0.42, 0.12, 0.4]} radius={0.06} color="#c0392b"/><RBox position={[0, 1.7, 0.24]} size={[0.36, 0.03, 0.16]} radius={0.01} color="#c0392b"/></>}
  </Group>
}

/** A small hanging lamp that lights up in the evening. */
function CartLamp({ position, night }: { position: Vec3; night: boolean }) {
  return <group position={position}>
    <mesh><sphereGeometry args={[0.08, 12, 8]}/><meshStandardMaterial color="#fff2c4" emissive="#ffcc66" emissiveIntensity={night ? 2.2 : 0.1}/></mesh>
    {night && <pointLight color="#ffc978" intensity={4} distance={4.5} decay={2}/>}
  </group>
}

/** Gerobak bakso: pushcart with a glass case, a steaming dandang and plastic stools. */
export function Gerobak({ position, rotation = 0, night = false }: { position: Vec3; rotation?: number; night?: boolean }) {
  const sign = useMemo(() => signTexture('BAKSO', '#c62828', '#fff4d6', 'MALANG · MANTAP'), [])
  const steam = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!steam.current) return
    steam.current.children.forEach((puff, index) => {
      const t = (clock.elapsedTime * 0.5 + index / 3) % 1
      puff.position.y = 1.35 + t * 0.9
      puff.scale.setScalar(0.6 + t)
      ;((puff as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.45 * (1 - t)
    })
  })
  return <Group position={position} rotation={rotation}>
    {/* Cart body on two wheels, with push handles */}
    <RBox position={[0, 0.72, 0]} size={[1.8, 0.8, 0.8]} radius={0.05} color="#f3efe4" roughness={0.6}/>
    <RBox position={[0, 0.34, 0]} size={[1.85, 0.06, 0.85]} radius={0.02} color="#c62828"/>
    <RBox position={[0, 1.14, 0]} size={[1.85, 0.05, 0.85]} radius={0.02} color="#c62828"/>
    <Wheel position={[-0.5, 0.3, 0.45]}/><Wheel position={[-0.5, 0.3, -0.45]}/>
    <Cyl position={[0.75, 0.15, 0]} radius={0.04} height={0.3} color="#2a2f33"/>
    <RBox position={[-1.15, 0.95, 0]} size={[0.5, 0.05, 0.05]} rotation={[0, 0, -0.35]} radius={0.02} color="#6b4a32"/>
    {/* Glass display case with the bakso */}
    <RBox position={[0.35, 1.45, 0]} size={[0.9, 0.55, 0.62]} radius={0.02} color="#d8f0f4" opacity={0.35} roughness={0.05}/>
    {[0, 1, 2, 3, 4, 5].map((index) => <mesh key={index} position={[0.1 + (index % 3) * 0.22, 1.28, -0.12 + Math.floor(index / 3) * 0.22]}><sphereGeometry args={[0.07, 10, 8]}/><meshStandardMaterial color="#a98367" roughness={0.9}/></mesh>)}
    {/* Steaming pot (dandang) */}
    <Cyl position={[-0.45, 1.36, 0]} radius={0.25} height={0.4} color="#b9c0c4" metalness={0.75} roughness={0.25}/>
    <Cyl position={[-0.45, 1.58, 0]} radius={0.26} height={0.04} color="#9aa2a6" metalness={0.75} roughness={0.25}/>
    <group ref={steam} position={[-0.45, 0, 0]}>
      {[0, 1, 2].map((index) => <mesh key={index}><sphereGeometry args={[0.1, 10, 8]}/><meshStandardMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false}/></mesh>)}
    </group>
    {/* Roof with the painted sign and a lamp for the evening */}
    {[[-0.85, -0.38], [0.85, -0.38], [-0.85, 0.38], [0.85, 0.38]].map(([x, z]) => <Cyl key={`${x}${z}`} position={[x, 1.75, z]} radius={0.025} height={1.2} color="#6b4a32"/>)}
    <RBox position={[0, 2.38, 0]} size={[2.1, 0.08, 1.1]} radius={0.03} color="#c62828"/>
    <mesh position={[0, 2.12, 0.42]}><planeGeometry args={[1.7, 0.53]}/><meshStandardMaterial map={sign} roughness={0.7}/></mesh>
    <mesh position={[0, 2.12, -0.42]} rotation={[0, Math.PI, 0]}><planeGeometry args={[1.7, 0.53]}/><meshStandardMaterial map={sign} roughness={0.7}/></mesh>
    <CartLamp position={[0.2, 1.8, 0]} night={night}/>
    <PlasticStool position={[0.5, 0, 1.1]} color="#d64545"/>
    <PlasticStool position={[-0.3, 0, 1.2]} color="#3d7fd6"/>
  </Group>
}

/** A thin rod between two points (bicycle frame, handlebar). */
function Rod({ from, to, radius = 0.025, color }: { from: Vec3; to: Vec3; radius?: number; color: string }) {
  const { position, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    const direction = end.clone().sub(start)
    return { position: start.add(end).multiplyScalar(0.5), quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()), length: direction.length() }
  }, [from, to])
  return <mesh position={position} quaternion={quaternion} castShadow>
    <cylinderGeometry args={[radius, radius, length, 8]}/>
    <meshStandardMaterial color={color} metalness={0.5} roughness={0.35}/>
  </mesh>
}

function BikeWheel({ x }: { x: number }) {
  return <group position={[x, 0.33, 0]}>
    <mesh castShadow><torusGeometry args={[0.3, 0.035, 8, 28]}/><meshStandardMaterial color="#1f2326" roughness={0.8}/></mesh>
    <mesh><torusGeometry args={[0.26, 0.012, 6, 28]}/><meshStandardMaterial color="#c9ced0" metalness={0.7} roughness={0.3}/></mesh>
    {[0, 1, 2, 3].map((spoke) => <mesh key={spoke} rotation={[0, 0, (spoke / 4) * Math.PI]}><boxGeometry args={[0.52, 0.008, 0.008]}/><meshStandardMaterial color="#c9ced0" metalness={0.7}/></mesh>)}
  </group>
}

/** Kopi keliling: a bicycle with a cooler box, thermoses and strings of coffee sachets. */
export function KopiSepeda({ position, rotation = 0, night = false }: { position: Vec3; rotation?: number; night?: boolean }) {
  const sign = useMemo(() => signTexture('KOPI', '#4a2c1d', '#ffe3b3', 'PANAS · ES · SACHET'), [])
  const frame = '#1f6f5c'
  const sachets = ['#6b3b1e', '#d64545', '#e2b33c', '#2c2c2c', '#b0703a', '#e8e1d0']
  return <Group position={position} rotation={rotation}>
    <BikeWheel x={-0.55}/><BikeWheel x={0.55}/>
    <Rod from={[-0.55, 0.33, 0]} to={[-0.15, 0.36, 0]} color={frame}/>
    <Rod from={[-0.15, 0.36, 0]} to={[-0.25, 0.9, 0]} color={frame}/>
    <Rod from={[-0.25, 0.85, 0]} to={[0.42, 0.88, 0]} color={frame}/>
    <Rod from={[-0.15, 0.36, 0]} to={[0.42, 0.88, 0]} color={frame}/>
    <Rod from={[0.55, 0.33, 0]} to={[0.45, 1.05, 0]} color={frame}/>
    <Rod from={[0.45, 1.05, -0.28]} to={[0.45, 1.05, 0.28]} radius={0.02} color="#2a2f33"/>
    <Rod from={[-0.55, 0.33, 0]} to={[-0.25, 0.85, 0]} radius={0.018} color={frame}/>
    <RBox position={[-0.27, 0.95, 0]} size={[0.26, 0.06, 0.14]} radius={0.03} color="#2a2f33"/>
    <Rod from={[-0.15, 0.36, 0]} to={[-0.05, 0, 0.18]} radius={0.015} color="#8b9297"/>
    {/* Rear rack: cooler box with the sign, thermoses on top */}
    <RBox position={[-0.62, 0.78, 0]} size={[0.62, 0.05, 0.42]} radius={0.01} color="#8b9297" metalness={0.5}/>
    <RBox position={[-0.62, 1.03, 0]} size={[0.58, 0.44, 0.44]} radius={0.04} color="#3d7fd6"/>
    <mesh position={[-0.62, 1.03, 0.225]}><planeGeometry args={[0.54, 0.17]}/><meshStandardMaterial map={sign}/></mesh>
    <mesh position={[-0.62, 1.03, -0.225]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.54, 0.17]}/><meshStandardMaterial map={sign}/></mesh>
    <Cyl position={[-0.76, 1.42, 0.08]} radius={0.08} height={0.34} color="#c62828" roughness={0.4}/>
    <Cyl position={[-0.5, 1.42, 0.08]} radius={0.08} height={0.34} color="#d9dde0" metalness={0.7} roughness={0.25}/>
    <Cyl position={[-0.63, 1.38, -0.1]} radius={0.07} height={0.26} color="#f0f0ec"/>
    {/* Renteng sachets hanging from the handlebar */}
    {sachets.map((color, index) => <RBox key={index} position={[0.5, 0.78, -0.22 + index * 0.09]} size={[0.012, 0.46, 0.07]} radius={0.004} color={color} shadow={false}/>)}
    <CartLamp position={[0.52, 1.18, 0]} night={night}/>
  </Group>
}

export function Tree({ position, size = 1 }: { position: Vec3; size?: number }) {
  return <Group position={position} scale={size}>
    <Cyl position={[0, 0.9, 0]} radius={0.16} top={0.12} height={1.8} color="#6b4a32" roughness={0.9}/>
    {[[0, 2.2, 0, 1], [0.5, 1.9, 0.2, 0.7], [-0.45, 2.0, -0.2, 0.75], [0.1, 2.7, 0.1, 0.7]].map(([x, y, z, r]) => <mesh key={`${x}${y}`} position={[x, y, z]} castShadow><icosahedronGeometry args={[r, 1]}/><meshStandardMaterial color="#3f7a3c" roughness={0.9} flatShading/></mesh>)}
  </Group>
}

export function StreetLamp({ position, night = false }: { position: Vec3; night?: boolean }) {
  return <Group position={position}>
    <Cyl position={[0, 1.6, 0]} radius={0.06} height={3.2} color="#2f3336" metalness={0.5}/>
    <RBox position={[0.35, 3.15, 0]} size={[0.8, 0.06, 0.06]} radius={0.02} color="#2f3336"/>
    <RBox position={[0.7, 3.05, 0]} size={[0.3, 0.12, 0.2]} radius={0.04} color="#f5e6b8" emissive="#ffd98a" emissiveIntensity={night ? 2.5 : 0.2}/>
    {night && <pointLight position={[0.7, 2.9, 0]} color="#ffd08a" intensity={10} distance={8} decay={2}/>}
  </Group>
}

// ---------------------------------------------------------------------------
// Lighting and climate

/** Suspended linear LED fixture, the usual office light: cool white, brighter in the evening. */
export function OfficeLight({ position, rotation = 0, night }: { position: Vec3; rotation?: number; night: boolean }) {
  return <Group position={position} rotation={rotation}>
    {[-0.55, 0.55].map((x) => <Cyl key={x} position={[x, 0.3, 0]} radius={0.006} height={0.6} color="#8b9297"/>)}
    <RBox position={[0, 0, 0]} size={[1.4, 0.06, 0.16]} radius={0.02} color="#d9dde0" metalness={0.4} roughness={0.35} shadow={false}/>
    <mesh position={[0, -0.032, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.32, 0.11]}/>
      <meshStandardMaterial color="#ffffff" emissive="#f2f6ff" emissiveIntensity={night ? 2.6 : 0.9} side={THREE.DoubleSide}/>
    </mesh>
    {night && <pointLight position={[0, -0.3, 0]} color="#f1f5ff" intensity={8} distance={7} decay={2}/>}
  </Group>
}

/** Wall-mounted split AC with a gently swinging louvre. */
export function AirConditioner({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  const louvre = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (louvre.current) louvre.current.rotation.x = 0.5 + Math.sin(clock.elapsedTime * 0.6) * 0.25 })
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0, 0.13]} size={[1.05, 0.32, 0.24]} radius={0.06} color="#f6f7f5" roughness={0.35}/>
    <RBox position={[0, -0.03, 0.255]} size={[0.95, 0.02, 0.01]} radius={0.004} color="#dfe3e4" shadow={false}/>
    <mesh ref={louvre} position={[0, -0.14, 0.24]}><boxGeometry args={[0.9, 0.012, 0.08]}/><meshStandardMaterial color="#e3e6e6"/></mesh>
    <mesh position={[0.4, 0.07, 0.256]}><circleGeometry args={[0.012, 10]}/><meshStandardMaterial color="#6cf08a" emissive="#4be07a" emissiveIntensity={1.2}/></mesh>
    <Cyl position={[-0.46, -0.3, 0.06]} radius={0.02} height={0.35} color="#e6e8e6"/>
  </Group>
}

/** The AC's outdoor unit, with a slowly spinning fan. */
export function AcOutdoorUnit({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  const fan = useRef<THREE.Group>(null)
  useFrame((_, delta) => { if (fan.current) fan.current.rotation.z -= delta * 6 })
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.34, 0]} size={[0.85, 0.6, 0.32]} radius={0.03} color="#e9ebe8" roughness={0.45}/>
    <mesh position={[-0.12, 0.34, 0.165]}><circleGeometry args={[0.22, 24]}/><meshStandardMaterial color="#3a4046"/></mesh>
    <group ref={fan} position={[-0.12, 0.34, 0.17]}>{[0, 1, 2].map((blade) => <mesh key={blade} rotation={[0, 0, (blade / 3) * Math.PI * 2]}><boxGeometry args={[0.04, 0.36, 0.005]}/><meshStandardMaterial color="#9aa2a6"/></mesh>)}</group>
    <RBox position={[0, 0.02, 0]} size={[0.9, 0.04, 0.36]} radius={0.01} color="#8b9297"/>
  </Group>
}

// ---------------------------------------------------------------------------
// Game room

/** Ping-pong table (along x) with its net. */
export function PingPongTable({ position }: { position: Vec3 }) {
  return <Group position={position}>
    <RBox position={[0, 0.74, 0]} size={[2.74, 0.05, 1.52]} radius={0.02} color="#1f5f8b" roughness={0.45}/>
    <RBox position={[0, 0.768, 0]} size={[2.7, 0.004, 0.03]} radius={0.001} color="#ffffff" shadow={false}/>
    <RBox position={[0, 0.768, 0]} size={[0.02, 0.004, 1.48]} radius={0.001} color="#ffffff" shadow={false}/>
    <RBox position={[0, 0.85, 0]} size={[0.02, 0.16, 1.62]} radius={0.004} color="#f4f4f0" opacity={0.75}/>
    {[[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]].map(([x, z]) => <Cyl key={`${x}${z}`} position={[x, 0.36, z]} radius={0.035} height={0.72} color="#2a2f33"/>)}
    <mesh position={[0.4, 0.8, 0.3]}><sphereGeometry args={[0.03, 10, 8]}/><meshStandardMaterial color="#ff8a1f"/></mesh>
    <RBox position={[-0.9, 0.78, -0.35]} size={[0.16, 0.02, 0.15]} radius={0.01} rotation={[0, 0.4, 0]} color="#c62828"/>
  </Group>
}

/** Upright arcade cabinet with a glowing screen. */
export function ArcadeCabinet({ position, color }: { position: Vec3; color: string }) {
  const screen = useMemo(() => arcadeScreen(), [])
  return <Group position={position}>
    <RBox position={[0, 0.85, 0]} size={[0.72, 1.7, 0.62]} radius={0.04} color={color} roughness={0.5}/>
    <RBox position={[0, 0.95, 0.32]} size={[0.66, 0.06, 0.22]} radius={0.02} color="#1c1f24"/>
    {[-0.15, 0.05, 0.2].map((x, index) => <mesh key={x} position={[x, 0.99, 0.35]}><sphereGeometry args={[0.03, 8, 6]}/><meshStandardMaterial color={['#e63946', '#f4d35e', '#3a86ff'][index]} emissive={['#e63946', '#f4d35e', '#3a86ff'][index]} emissiveIntensity={0.5}/></mesh>)}
    <mesh position={[0, 1.35, 0.315]}><planeGeometry args={[0.56, 0.44]}/><meshStandardMaterial map={screen} emissiveMap={screen} emissive="#ffffff" emissiveIntensity={0.9}/></mesh>
    <RBox position={[0, 1.66, 0.3]} size={[0.66, 0.14, 0.04]} radius={0.01} color="#f4d35e" emissive="#f4d35e" emissiveIntensity={0.6}/>
  </Group>
}

export function Beanbag({ position, color }: { position: Vec3; color: string }) {
  return <group position={position}>
    <mesh position={[0, 0.24, 0]} scale={[1, 0.62, 1]} castShadow receiveShadow><sphereGeometry args={[0.42, 18, 14]}/><meshStandardMaterial color={color} roughness={0.95}/></mesh>
    <mesh position={[0, 0.36, -0.18]} scale={[1, 0.9, 0.55]} castShadow><sphereGeometry args={[0.36, 16, 12]}/><meshStandardMaterial color={color} roughness={0.95}/></mesh>
  </group>
}

/** Karambol (carrom) board on a low stand, with two plastic stools. */
export function CarromTable({ position }: { position: Vec3 }) {
  return <Group position={position}>
    <RBox position={[0, 0.3, 0]} size={[0.5, 0.6, 0.5]} radius={0.03} color="#6b4a32"/>
    <RBox position={[0, 0.63, 0]} size={[0.9, 0.06, 0.9]} radius={0.02} color="#5a3a24"/>
    <RBox position={[0, 0.664, 0]} size={[0.78, 0.01, 0.78]} radius={0.004} color="#e8cf9c" shadow={false}/>
    {[[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.671, z]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.035, 12]}/><meshStandardMaterial color="#1c1f24"/></mesh>)}
    {[[0, 0, '#f4f1ea'], [0.08, 0.05, '#1c1f24'], [-0.07, 0.06, '#f4f1ea'], [0.02, -0.09, '#1c1f24'], [-0.05, -0.05, '#c62828']].map(([x, z, color]) => <Cyl key={`${x}${z}`} position={[x as number, 0.676, z as number]} radius={0.022} height={0.01} color={color as string}/>)}
    <PlasticStool position={[0, 0, 0.75]} color="#3d7fd6"/>
    <PlasticStool position={[0, 0, -0.75]} color="#d64545"/>
  </Group>
}

// ---------------------------------------------------------------------------
// Lantai 2: bedroom, lesehan corner, bathroom and balcony

/** Single bed, head (pillow) towards -z. */
export function Bed({ position, color = '#3d7fd6' }: { position: Vec3; color?: string }) {
  return <Group position={position}>
    <RBox position={[0, 0.2, 0]} size={[1.05, 0.26, 2.05]} radius={0.04} color="#7a5232" roughness={0.6}/>
    <RBox position={[0, 0.4, 0.02]} size={[0.98, 0.16, 1.96]} radius={0.06} color="#f3f1ec" roughness={0.95}/>
    <RBox position={[0, 0.62, -1.0]} size={[1.05, 0.7, 0.08]} radius={0.03} color="#6b4a32"/>
    <RBox position={[0, 0.53, -0.72]} size={[0.62, 0.11, 0.34]} radius={0.05} color="#ffffff" roughness={0.95}/>
    {/* Blanket over the lower part of the bed */}
    <RBox position={[0, 0.5, 0.4]} size={[1.0, 0.06, 1.1]} radius={0.03} color={color} roughness={0.95}/>
    {[[-0.47, 0.95], [0.47, 0.95]].map(([x, z]) => <RBox key={x} position={[x, 0.08, z]} size={[0.08, 0.16, 0.08]} radius={0.01} color="#5a3a24"/>)}
  </Group>
}

/** Bedside table with a small lamp that glows in the evening. */
export function Nightstand({ position, night }: { position: Vec3; night: boolean }) {
  return <Group position={position}>
    <RBox position={[0, 0.25, 0]} size={[0.42, 0.5, 0.38]} radius={0.03} color="#8a5a3a"/>
    <Cyl position={[0, 0.56, 0]} radius={0.07} height={0.1} color="#d9d2c4"/>
    <Cyl position={[0, 0.72, 0]} radius={0.1} top={0.07} height={0.18} color="#fff2d0" emissive="#ffd88a" emissiveIntensity={night ? 1.4 : 0.1}/>
  </Group>
}

/** Lemari (wardrobe) against a wall, doors towards +z. */
export function Wardrobe({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 1, 0]} size={[1.2, 2, 0.6]} radius={0.03} color="#a9784e" roughness={0.6}/>
    <RBox position={[0, 1, 0.305]} size={[0.012, 1.9, 0.01]} radius={0.002} color="#5a3a24" shadow={false}/>
    {[-0.08, 0.08].map((x) => <RBox key={x} position={[x, 1.05, 0.32]} size={[0.03, 0.18, 0.03]} radius={0.01} color="#d9c27a" metalness={0.6}/>)}
  </Group>
}

/** Meja lesehan: a low table for sitting on the floor. */
export function LowTable({ position }: { position: Vec3 }) {
  return <Group position={position}>
    <RBox position={[0, 0.3, 0]} size={[1.3, 0.06, 0.8]} radius={0.03} color="#7a5232" roughness={0.5}/>
    {[[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]].map(([x, z]) => <RBox key={`${x}${z}`} position={[x, 0.14, z]} size={[0.07, 0.28, 0.07]} radius={0.01} color="#5a3a24"/>)}
    {/* Teko and gelas, and a plate of gorengan */}
    <Cyl position={[-0.3, 0.42, 0]} radius={0.09} top={0.06} height={0.18} color="#e9e4d8"/>
    {[0.05, 0.22].map((x) => <Cyl key={x} position={[x, 0.38, 0.15]} radius={0.035} height={0.09} color="#c98f4a" opacity={0.8}/>)}
    <Cyl position={[0.35, 0.34, -0.12]} radius={0.15} height={0.02} color="#f4f1ea"/>
    {[[0.3, -0.1], [0.4, -0.15], [0.35, -0.05]].map(([x, z]) => <RBox key={`${x}${z}`} position={[x, 0.37, z]} size={[0.09, 0.04, 0.06]} radius={0.015} color="#c98a3a"/>)}
  </Group>
}

export function FloorCushion({ position, color }: { position: Vec3; color: string }) {
  return <RBox position={[position[0], position[1] + 0.06, position[2]]} size={[0.55, 0.12, 0.55]} radius={0.05} color={color} roughness={0.95}/>
}

/** Kursi rotan (rattan chair), facing +z. */
export function RattanChair({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.42, 0]} size={[0.6, 0.08, 0.56]} radius={0.04} color="#c49a5c" roughness={0.9}/>
    <RBox position={[0, 0.48, 0.02]} size={[0.5, 0.06, 0.46]} radius={0.03} color="#e8dcc0" roughness={0.95}/>
    <RBox position={[0, 0.78, -0.26]} size={[0.6, 0.66, 0.07]} radius={0.04} color="#c49a5c" roughness={0.9}/>
    {[-0.3, 0.3].map((x) => <RBox key={x} position={[x, 0.6, 0]} size={[0.06, 0.08, 0.56]} radius={0.02} color="#b0884e"/>)}
    {[[-0.25, -0.22], [0.25, -0.22], [-0.25, 0.22], [0.25, 0.22]].map(([x, z]) => <Cyl key={`${x}${z}`} position={[x, 0.2, z]} radius={0.025} height={0.4} color="#a67c45"/>)}
  </Group>
}

/** Small round table with two cups of kopi. */
export function SideTable({ position }: { position: Vec3 }) {
  return <Group position={position}>
    <Cyl position={[0, 0.52, 0]} radius={0.32} height={0.04} color="#c49a5c"/>
    <Cyl position={[0, 0.26, 0]} radius={0.04} height={0.5} color="#8a6a3a"/>
    {[-0.1, 0.12].map((x) => <Cyl key={x} position={[x, 0.59, 0.05]} radius={0.04} height={0.09} color="#ffffff"/>)}
  </Group>
}

/** Hammock along x between two posts; the sag is a stretched half-cylinder. */
export function Hammock({ position }: { position: Vec3 }) {
  return <Group position={position}>
    {[-1.1, 1.1].map((x) => <Cyl key={x} position={[x, 0.75, 0]} radius={0.05} height={1.5} color="#6b4a32"/>)}
    <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1]} castShadow receiveShadow>
      <cylinderGeometry args={[0.38, 0.38, 1.9, 16, 1, true, Math.PI / 2, Math.PI]}/>
      <meshStandardMaterial color="#e76f51" roughness={0.95} side={THREE.DoubleSide}/>
    </mesh>
    {[-1, 1].map((side) => <Cyl key={side} position={[side * 1.02, 0.9, 0]} rotation={[0, 0, side * 0.9]} radius={0.01} height={0.32} color="#e9dcc0"/>)}
  </Group>
}

/** Jemuran: a clothes line along x with a few shirts and a sarung drying. */
export function ClothesLine({ position, length = 2.4 }: { position: Vec3; length?: number }) {
  const clothes = ['#2a9d8f', '#f4f1ea', '#e9c46a', '#264653', '#d64545']
  return <Group position={position}>
    {[-length / 2, length / 2].map((x) => <Cyl key={x} position={[x, 0.85, 0]} radius={0.025} height={1.7} color="#9aa2a6" metalness={0.5}/>)}
    <Cyl position={[0, 1.62, 0]} rotation={[0, 0, Math.PI / 2]} radius={0.006} height={length} color="#e9e4d8"/>
    {clothes.map((color, index) => <RBox key={color} position={[-length / 2 + 0.35 + index * ((length - 0.7) / (clothes.length - 1)), 1.36, 0]} size={[0.34, index === 4 ? 0.6 : 0.46, 0.02]} radius={0.01} color={color} roughness={0.95}/>)}
  </Group>
}

/** Balcony railing along x (length) with posts and a top rail. */
export function Railing({ position, length, rotation = 0 }: { position: Vec3; length: number; rotation?: number }) {
  const posts = Math.max(2, Math.round(length / 0.9) + 1)
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 1.0, 0]} size={[length, 0.06, 0.08]} radius={0.02} color="#3a3f44" metalness={0.5} roughness={0.4}/>
    <RBox position={[0, 0.5, 0]} size={[length, 0.03, 0.04]} radius={0.01} color="#3a3f44" metalness={0.5}/>
    {Array.from({ length: posts }, (_, index) => <RBox key={index} position={[-length / 2 + (index * length) / (posts - 1), 0.5, 0]} size={[0.05, 1, 0.05]} radius={0.01} color="#3a3f44" metalness={0.5}/>)}
  </Group>
}

/** String lights (lampu tumblr) hanging along x; they glow in the evening. */
export function StringLights({ position, length, night }: { position: Vec3; length: number; night: boolean }) {
  const bulbs = Math.round(length / 0.45)
  return <Group position={position}>
    {Array.from({ length: bulbs }, (_, index) => {
      const t = index / (bulbs - 1)
      return <mesh key={index} position={[-length / 2 + t * length, -Math.sin(t * Math.PI) * 0.25, 0]}><sphereGeometry args={[0.05, 8, 6]}/><meshStandardMaterial color="#fff1c4" emissive="#ffcf6b" emissiveIntensity={night ? 2.2 : 0.2}/></mesh>
    })}
    {night && <pointLight position={[0, -0.4, 0]} color="#ffcf8a" intensity={6} distance={6} decay={2}/>}
  </Group>
}

/** Straight stairs along x: `rise` up over `run` (negative run climbs towards -x). */
export function Staircase({ position, run, rise, width }: { position: Vec3; run: number; rise: number; width: number }) {
  const steps = 14
  const tread = Math.abs(run) / steps
  const direction = Math.sign(run)
  return <Group position={position}>
    {Array.from({ length: steps }, (_, index) => <RBox key={index} position={[direction * (index + 0.5) * tread, (index + 1) * (rise / steps) - 0.03, 0]} size={[tread + 0.04, 0.06, width]} radius={0.01} color="#8a5a3a" roughness={0.6}/>)}
    {/* Stringer and handrail on the open side */}
    <RBox position={[run / 2, rise / 2 - 0.1, -width / 2]} rotation={[0, 0, -direction * Math.atan2(rise, Math.abs(run))]} size={[Math.hypot(run, rise), 0.16, 0.06]} radius={0.02} color="#5a3a24"/>
    <RBox position={[run / 2, rise / 2 + 0.85, -width / 2]} rotation={[0, 0, -direction * Math.atan2(rise, Math.abs(run))]} size={[Math.hypot(run, rise), 0.05, 0.05]} radius={0.02} color="#3a3f44" metalness={0.5}/>
    {[0.25, 0.5, 0.75].map((t) => <RBox key={t} position={[run * t, rise * t + 0.42, -width / 2]} size={[0.04, 0.85, 0.04]} radius={0.01} color="#3a3f44" metalness={0.5}/>)}
  </Group>
}

/** Tandon air: the water tank on a stand, on the game room's roof. */
export function WaterTank({ position }: { position: Vec3 }) {
  return <Group position={position}>
    {[[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].map(([x, z]) => <RBox key={`${x}${z}`} position={[x, 0.5, z]} size={[0.07, 1, 0.07]} radius={0.01} color="#6d7479" metalness={0.5}/>)}
    <RBox position={[0, 1.02, 0]} size={[1.1, 0.06, 1.1]} radius={0.01} color="#6d7479" metalness={0.5}/>
    <Cyl position={[0, 1.6, 0]} radius={0.5} height={1.1} color="#2f6fb5" roughness={0.5}/>
    <Cyl position={[0, 2.2, 0]} radius={0.28} height={0.1} color="#2a5f9c"/>
  </Group>
}

/** Kamar mandi fittings: bak mandi with a gayung, and a toilet. */
export function BathroomFittings({ position }: { position: Vec3 }) {
  return <Group position={position}>
    <RBox position={[0.95, 0.4, -1.75]} size={[0.9, 0.8, 0.7]} radius={0.03} color="#5aa9c9" roughness={0.3}/>
    <RBox position={[0.95, 0.79, -1.75]} size={[0.78, 0.02, 0.58]} radius={0.01} color="#9fd3ea" opacity={0.8} roughness={0.05} shadow={false}/>
    <Cyl position={[0.75, 0.86, -1.6]} radius={0.09} height={0.12} color="#e63946"/>
    <RBox position={[-0.3, 0.2, -1.8]} size={[0.42, 0.4, 0.55]} radius={0.12} color="#f6f7f5" roughness={0.25}/>
    <RBox position={[-0.3, 0.6, -2.05]} size={[0.42, 0.45, 0.16]} radius={0.04} color="#f6f7f5" roughness={0.25}/>
  </Group>
}

// ---------------------------------------------------------------------------
// Digantara's Gen Z / millennial office: bleachers, a coffee bar, hanging chairs, neon and brick,
// plus the mushola and the meeting room.

/** Tribun: three carpeted steps to sit on, rising to the back (-z), with floor cushions. */
export function Tribun({ position, rotation = 0, width = 3, color = '#c9a27a' }: { position: Vec3; rotation?: number; width?: number; color?: string }) {
  const cushions = ['#e76f51', '#2a9d8f', '#e9c46a', '#8d5bc1', '#f4a3b4', '#3d7fd6']
  return <Group position={position} rotation={rotation}>
    {[0, 1, 2].map((step) => <RBox key={step} position={[0, (step + 1) * 0.2, -step * 0.6]} size={[width, (step + 1) * 0.4, 0.62]} radius={0.04} color={step % 2 ? '#b98e66' : color} roughness={0.9}/>)}
    {[0, 1, 2].flatMap((step) => [-width / 3, 0.15, width / 3].map((x, index) => <RBox key={`${step}-${index}`} position={[x + (step % 2 ? 0.2 : -0.1), (step + 1) * 0.4 + 0.04, -step * 0.6 + 0.05]} size={[0.42, 0.08, 0.42]} radius={0.04} color={cushions[(step * 3 + index) % cushions.length]} roughness={0.95}/>))}
  </Group>
}

/** Coffee bar: a tiled counter with an espresso machine, a grinder and cups, and a menu board. */
export function CoffeeBar({ position, rotation = 0, length = 3.4 }: { position: Vec3; rotation?: number; length?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.5, 0]} size={[length, 1.0, 0.7]} radius={0.03} color="#2e4a3f" roughness={0.6}/>
    <RBox position={[0, 1.03, 0]} size={[length + 0.1, 0.06, 0.8]} radius={0.02} color="#c49a6c" roughness={0.4}/>
    <RBox position={[-0.8, 1.28, -0.1]} size={[0.6, 0.44, 0.45]} radius={0.04} color="#d9dde0" metalness={0.7} roughness={0.25}/>
    <RBox position={[-0.8, 1.2, 0.15]} size={[0.4, 0.04, 0.12]} radius={0.01} color="#2a2f33"/>
    <Cyl position={[-0.2, 1.25, -0.1]} radius={0.09} height={0.38} color="#1d2126"/>
    {[0.4, 0.6, 0.8].map((x) => <Cyl key={x} position={[x, 1.1, 0.1]} radius={0.045} height={0.09} color="#f4efe6"/>)}
    {/* Menu board and two pendant lamps */}
    <RBox position={[0.5, 2.0, -0.38]} size={[1.2, 0.7, 0.04]} radius={0.01} color="#1d2126"/>
    {[0.25, 0.45, 0.65].map((y, index) => <RBox key={y} position={[0.5, 1.75 + index * 0.18, -0.355]} size={[0.8 - index * 0.15, 0.04, 0.01]} radius={0.004} color="#f4efe6" shadow={false}/>)}
    {[-length / 3, length / 3].map((x) => <Group key={x} position={[x, 0, 0]}><Cyl position={[0, 2.25, 0]} radius={0.006} height={0.7} color="#2a2f33"/><Cyl position={[0, 1.85, 0]} radius={0.04} top={0.16} height={0.16} color="#e0a43a" emissive="#ffcf7a" emissiveIntensity={0.6}/></Group>)}
  </Group>
}

export function BarStool({ position, color = '#e76f51' }: { position: Vec3; color?: string }) {
  return <Group position={position}>
    <Cyl position={[0, 0.72, 0]} radius={0.19} height={0.06} color={color}/>
    <Cyl position={[0, 0.37, 0]} radius={0.03} height={0.7} color="#2a2f33" metalness={0.6}/>
    <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.15, 0.012, 6, 18]}/><meshStandardMaterial color="#2a2f33" metalness={0.6}/></mesh>
    <Cyl position={[0, 0.02, 0]} radius={0.2} height={0.04} color="#2a2f33"/>
  </Group>
}

/** A rattan egg chair hanging from a curved stand. */
export function EggChair({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  const seat = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (seat.current) seat.current.rotation.z = Math.sin(clock.elapsedTime * 0.8 + position[0]) * 0.04 })
  return <Group position={position} rotation={rotation}>
    <Cyl position={[0, 0.03, -0.35]} radius={0.38} height={0.06} color="#2a2f33"/>
    <Rod from={[0, 0.03, -0.35]} to={[0, 2.0, -0.45]} color="#2a2f33" radius={0.035}/>
    <Rod from={[0, 2.0, -0.45]} to={[0, 2.05, 0]} color="#2a2f33" radius={0.035}/>
    <group ref={seat} position={[0, 2.05, 0]}>
      <Cyl position={[0, -0.3, 0]} radius={0.008} height={0.6} color="#2a2f33"/>
      <mesh position={[0, -1.0, 0]} rotation={[-0.25, 0, 0]} castShadow><sphereGeometry args={[0.5, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]}/><meshStandardMaterial color="#c8a06a" roughness={0.95} side={THREE.DoubleSide}/></mesh>
      <Cyl position={[0, -1.32, 0.05]} radius={0.36} height={0.12} color="#f4efe6" roughness={0.95}/>
    </group>
  </Group>
}

/** Neon script on the wall; it glows brighter in the evening. */
export function NeonSign({ position, rotation = 0, text, color, width = 2.4, night = false }: { position: Vec3; rotation?: number; text: string; color: string; width?: number; night?: boolean }) {
  const texture = useMemo(() => neonText(text, color), [text, color])
  return <Group position={position} rotation={rotation}>
    <mesh><planeGeometry args={[width, width / 4]}/><meshStandardMaterial map={texture} transparent emissive={color} emissiveMap={texture} emissiveIntensity={night ? 2.2 : 1.1} toneMapped={false} depthWrite={false}/></mesh>
  </Group>
}

/** A freestanding exposed-brick feature wall. */
export function BrickFeatureWall({ position, rotation = 0, width = 2.6, height = 2.4 }: { position: Vec3; rotation?: number; width?: number; height?: number }) {
  const texture = useMemo(() => brickWall([width / 1.2, height / 1.2]), [width, height])
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, height / 2, 0]} size={[width, height, 0.24]} radius={0.02} color="#ffffff" map={texture} roughness={0.95}/>
  </Group>
}

/** A sajadah laid on the floor; its head end points along -z of the group (towards the qibla). */
export function PrayerRug({ position, rotation = 0, color = '#1f6f5c' }: { position: Vec3; rotation?: number; color?: string }) {
  const texture = useMemo(() => sajadah(color), [color])
  return <Group position={position} rotation={rotation}>
    <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[0.7, 1.2]}/><meshStandardMaterial map={texture} roughness={0.95}/></mesh>
  </Group>
}

/** The mihrab: an arched niche in the qibla wall, with a calligraphy plaque above it. */
export function Mihrab({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 1.1, 0]} size={[1.3, 2.2, 0.1]} radius={0.04} color="#f1e7cf"/>
    <RBox position={[0, 0.95, 0.04]} size={[0.8, 1.7, 0.05]} radius={0.3} color="#1f6f5c"/>
    <RBox position={[0, 2.35, 0.03]} size={[1.1, 0.28, 0.04]} radius={0.02} color="#c9a227" metalness={0.5} roughness={0.35}/>
  </Group>
}

/** Tempat wudhu: a long basin with taps, a tiled splashback and a drain step. */
export function WudhuStation({ position, rotation = 0, length = 2.2 }: { position: Vec3; rotation?: number; length?: number }) {
  const taps = Math.max(2, Math.round(length / 0.7))
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 1.1, -0.28]} size={[length, 1.0, 0.06]} radius={0.01} color="#cfe3e6"/>
    <RBox position={[0, 0.75, -0.05]} size={[length, 0.12, 0.5]} radius={0.03} color="#e8eef0"/>
    <RBox position={[0, 0.4, -0.15]} size={[length, 0.7, 0.3]} radius={0.02} color="#9fb7bb"/>
    <RBox position={[0, 0.04, 0.25]} size={[length, 0.08, 0.5]} radius={0.02} color="#8a9a9e"/>
    {Array.from({ length: taps }, (_, index) => <Group key={index} position={[-length / 2 + (index + 0.5) * (length / taps), 0, 0]}>
      <Cyl position={[0, 1.15, -0.2]} radius={0.025} height={0.12} rotation={[Math.PI / 2, 0, 0]} color="#c9ced0" metalness={0.8} roughness={0.2}/>
      <Cyl position={[0, 1.1, -0.13]} radius={0.02} height={0.1} color="#c9ced0" metalness={0.8} roughness={0.2}/>
    </Group>)}
  </Group>
}

/** Rak sepatu by the mushola door, with shoes and sandals on it. */
export function ShoeRack({ position, rotation = 0, length = 1.4 }: { position: Vec3; rotation?: number; length?: number }) {
  const shoes = ['#2a2f33', '#e76f51', '#f4efe6', '#3d7fd6', '#6b4a32']
  return <Group position={position} rotation={rotation}>
    {[0.08, 0.36].map((y) => <RBox key={y} position={[0, y, 0]} size={[length, 0.04, 0.35]} radius={0.01} color="#8a5a3a"/>)}
    {[-length / 2 + 0.02, length / 2 - 0.02].map((x) => <RBox key={x} position={[x, 0.25, 0]} size={[0.04, 0.5, 0.35]} radius={0.01} color="#8a5a3a"/>)}
    {Array.from({ length: 4 }, (_, index) => <RBox key={index} position={[-length / 2 + 0.25 + index * 0.32, 0.43, 0]} size={[0.12, 0.08, 0.26]} radius={0.03} color={shoes[index % shoes.length]}/>)}
    {Array.from({ length: 3 }, (_, index) => <RBox key={`b${index}`} position={[-length / 2 + 0.35 + index * 0.4, 0.15, 0]} size={[0.12, 0.06, 0.26]} radius={0.03} color={shoes[(index + 2) % shoes.length]}/>)}
  </Group>
}

/** The hot-desk table: one long shared table with a planter down the middle. */
export function HotDeskTable({ position, rotation = 0, length = 4.6 }: { position: Vec3; rotation?: number; length?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.74, 0]} size={[length, 0.06, 1.2]} radius={0.03} color="#e8dccb" roughness={0.5}/>
    {[-length / 2 + 0.2, length / 2 - 0.2].map((x) => <RBox key={x} position={[x, 0.37, 0]} size={[0.08, 0.72, 1.0]} radius={0.02} color="#2a2f33"/>)}
    <RBox position={[0, 0.84, 0]} size={[length - 0.6, 0.14, 0.2]} radius={0.03} color="#6b4a32"/>
    {[-1.2, 0, 1.2].map((x) => <mesh key={x} position={[x, 1.0, 0]} castShadow><icosahedronGeometry args={[0.16, 1]}/><meshStandardMaterial color="#4f8a4a" flatShading roughness={0.85}/></mesh>)}
  </Group>
}

/** An open laptop; its screen lights up while someone works at it. */
export function Laptop({ position, rotation = 0, active }: { position: Vec3; rotation?: number; active: boolean }) {
  const screen = useMemo(() => screenTexture(active), [active])
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.01, 0]} size={[0.36, 0.02, 0.24]} radius={0.005} color="#b8bec4" metalness={0.5}/>
    <group position={[0, 0.12, 0.12]} rotation={[0.3, 0, 0]}>
      <RBox position={[0, 0, 0]} size={[0.36, 0.24, 0.015]} radius={0.005} color="#b8bec4" metalness={0.5}/>
      <mesh position={[0, 0, -0.009]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.32, 0.2]}/><meshStandardMaterial map={screen} emissive={active ? '#ffffff' : '#000000'} emissiveMap={screen} emissiveIntensity={active ? 0.9 : 0}/></mesh>
    </group>
  </Group>
}

/** The meeting room's long table (chairs are placed separately at the meeting seats). */
export function LongTable({ position, rotation = 0, length = 4.4, depth = 1.3 }: { position: Vec3; rotation?: number; length?: number; depth?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.75, 0]} size={[length, 0.07, depth]} radius={0.04} color="#3b2a20" roughness={0.35}/>
    {[-length / 2 + 0.5, length / 2 - 0.5].map((x) => <RBox key={x} position={[x, 0.37, 0]} size={[0.12, 0.72, depth - 0.4]} radius={0.03} color="#1d2126"/>)}
    {/* Conference phone, water bottles and a plate of kue */}
    <Cyl position={[0, 0.8, 0]} radius={0.12} height={0.03} color="#1d2126"/>
    {[-1.2, 1.2].map((x) => <Cyl key={x} position={[x, 0.88, 0.15]} radius={0.035} height={0.2} color="#bfe3f0" opacity={0.7}/>)}
    <Cyl position={[0.7, 0.8, -0.1]} radius={0.17} height={0.02} color="#f4efe6"/>
  </Group>
}

export function Bench({ position, rotation = 0, length = 1.8 }: { position: Vec3; rotation?: number; length?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.44, 0]} size={[length, 0.08, 0.45]} radius={0.03} color="#c49a6c" roughness={0.6}/>
    {[-length / 2 + 0.15, length / 2 - 0.15].map((x) => <RBox key={x} position={[x, 0.21, 0]} size={[0.06, 0.42, 0.4]} radius={0.01} color="#2a2f33"/>)}
  </Group>
}

/** A raised planter box on the roof garden: chillies, tomatoes and flowers. */
export function Planter({ position, rotation = 0, length = 2.4 }: { position: Vec3; rotation?: number; length?: number }) {
  const crops = ['#d62828', '#f77f00', '#4f8a4a', '#f4a3b4', '#e9c46a']
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.3, 0]} size={[length, 0.6, 0.8]} radius={0.03} color="#8a5a3a" roughness={0.9}/>
    <RBox position={[0, 0.58, 0]} size={[length - 0.1, 0.06, 0.7]} radius={0.02} color="#4a3423" roughness={1}/>
    {Array.from({ length: Math.round(length / 0.4) }, (_, index) => <Group key={index} position={[-length / 2 + 0.25 + index * 0.4, 0.62, (index % 2 ? 0.15 : -0.15)]}>
      <mesh position={[0, 0.16, 0]} castShadow><icosahedronGeometry args={[0.15, 1]}/><meshStandardMaterial color="#4f8a4a" flatShading roughness={0.85}/></mesh>
      <mesh position={[0.05, 0.28, 0.05]}><sphereGeometry args={[0.045, 8, 6]}/><meshStandardMaterial color={crops[index % crops.length]}/></mesh>
    </Group>)}
  </Group>
}

// ---------------------------------------------------------------------------
// Lantai 2: rooftop cinema, makan bareng under a pergola, gym, koi pond, saung and laundry.

/** Layar tancap for nobar (nonton bareng): a screen on two legs, glowing in the evening. */
export function ProjectorScreen({ position, rotation = 0, width = 3.2, night = false }: { position: Vec3; rotation?: number; width?: number; night?: boolean }) {
  const texture = useMemo(() => movieScreen(), [])
  const height = width * 0.5625
  return <Group position={position} rotation={rotation}>
    {[-width / 2 - 0.08, width / 2 + 0.08].map((x) => <Cyl key={x} position={[x, 1.25, 0]} radius={0.04} height={2.5} color="#2a2f33"/>)}
    <RBox position={[0, 1.45, -0.02]} size={[width + 0.12, height + 0.12, 0.04]} radius={0.01} color="#1d2126"/>
    <mesh position={[0, 1.45, 0.002]}><planeGeometry args={[width, height]}/><meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={night ? 0.9 : 0.35} toneMapped={false}/></mesh>
  </Group>
}

export function Projector({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <Group position={position} rotation={rotation}>
    <Cyl position={[0, 0.4, 0]} radius={0.04} height={0.8} color="#2a2f33"/>
    <Cyl position={[0, 0.02, 0]} radius={0.22} height={0.04} color="#2a2f33"/>
    <RBox position={[0, 0.88, 0]} size={[0.34, 0.14, 0.28]} radius={0.03} color="#f2f2f2"/>
    <Cyl position={[0, 0.88, -0.15]} radius={0.05} height={0.04} rotation={[Math.PI / 2, 0, 0]} color="#1d2126"/>
  </Group>
}

/** A long wooden table with a bench on each side, for makan bareng. */
export function PicnicTable({ position, rotation = 0, length = 3 }: { position: Vec3; rotation?: number; length?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.75, 0]} size={[length, 0.06, 0.9]} radius={0.02} color="#a0703f" roughness={0.7}/>
    {[-length / 2 + 0.25, length / 2 - 0.25].map((x) => <RBox key={x} position={[x, 0.37, 0]} size={[0.08, 0.72, 0.7]} radius={0.02} color="#6b4a32"/>)}
    {[-0.75, 0.75].map((z) => <Group key={z} position={[0, 0, z]}>
      <RBox position={[0, 0.44, 0]} size={[length, 0.06, 0.34]} radius={0.02} color="#a0703f" roughness={0.7}/>
      {[-length / 2 + 0.25, length / 2 - 0.25].map((x) => <RBox key={x} position={[x, 0.21, 0]} size={[0.06, 0.42, 0.28]} radius={0.01} color="#6b4a32"/>)}
    </Group>)}
    {/* Nasi tumpeng in the middle, plates and es teh */}
    <Cyl position={[0, 0.88, 0]} radius={0.18} top={0.02} height={0.24} color="#f2c94c"/>
    <Cyl position={[0, 0.79, 0]} radius={0.28} height={0.02} color="#4f8a4a"/>
    {[-1, -0.5, 0.5, 1].map((x, index) => <Cyl key={x} position={[x, 0.79, index % 2 ? 0.25 : -0.25]} radius={0.12} height={0.02} color="#f4efe6"/>)}
    {[-0.75, 0.75].map((x) => <Cyl key={x} position={[x, 0.86, 0]} radius={0.04} height={0.16} color="#b5651d" opacity={0.85}/>)}
  </Group>
}

/** Bakaran sate: a charcoal grill whose coals glow, with skewers on it. */
export function Grill({ position, rotation = 0, night = false }: { position: Vec3; rotation?: number; night?: boolean }) {
  const coals = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => { if (coals.current) coals.current.emissiveIntensity = (night ? 1.4 : 0.7) + Math.sin(clock.elapsedTime * 6) * 0.25 })
  return <Group position={position} rotation={rotation}>
    {[[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]].map(([x, z]) => <Cyl key={`${x}${z}`} position={[x, 0.35, z]} radius={0.025} height={0.7} color="#2a2f33"/>)}
    <RBox position={[0, 0.75, 0]} size={[1, 0.16, 0.5]} radius={0.02} color="#3a3f45" metalness={0.4}/>
    <mesh position={[0, 0.84, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.9, 0.4]}/><meshStandardMaterial ref={coals} color="#5a1a0a" emissive="#ff5a1f" emissiveIntensity={0.8}/></mesh>
    {Array.from({ length: 6 }, (_, index) => <RBox key={index} position={[-0.3 + index * 0.12, 0.87, 0]} size={[0.02, 0.02, 0.6]} radius={0.005} color="#8a5a3a"/>)}
  </Group>
}

/** A wooden pergola with creepers on top, over the dining table. */
export function Pergola({ position, rotation = 0, length = 4, depth = 3 }: { position: Vec3; rotation?: number; length?: number; depth?: number }) {
  const leaves = useMemo(() => Array.from({ length: 14 }, (_, index) => [(((index * 37) % 100) / 100 - 0.5) * length, (((index * 61) % 100) / 100 - 0.5) * depth, 0.18 + ((index * 13) % 5) * 0.03] as const), [length, depth])
  return <Group position={position} rotation={rotation}>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <RBox key={`${sx}${sz}`} position={[sx * length / 2, 1.2, sz * depth / 2]} size={[0.1, 2.4, 0.1]} radius={0.02} color="#6b4a32"/>)}
    {[-1, 1].map((sz) => <RBox key={sz} position={[0, 2.42, sz * depth / 2]} size={[length + 0.3, 0.1, 0.12]} radius={0.02} color="#6b4a32"/>)}
    {Array.from({ length: Math.round(length / 0.5) + 1 }, (_, index) => <RBox key={index} position={[-length / 2 + index * 0.5, 2.5, 0]} size={[0.06, 0.06, depth + 0.3]} radius={0.01} color="#8a5a3a"/>)}
    {leaves.map(([x, z, r], index) => <mesh key={index} position={[x, 2.6, z]} castShadow><icosahedronGeometry args={[r, 1]}/><meshStandardMaterial color={index % 4 === 0 ? '#e76f8a' : '#4f8a4a'} flatShading roughness={0.85}/></mesh>)}
  </Group>
}

/** A sun lounger: a frame, a cushion and a raised backrest at the head (+x). */
export function SunLounger({ position, rotation = 0, color = '#2a9d8f' }: { position: Vec3; rotation?: number; color?: string }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.25, 0]} size={[0.7, 0.08, 1.4]} radius={0.03} color="#c49a6c"/>
    <RBox position={[0, 0.32, -0.1]} size={[0.64, 0.06, 1.2]} radius={0.03} color={color}/>
    <RBox position={[0, 0.48, 0.78]} size={[0.64, 0.06, 0.5]} radius={0.03} rotation={[-0.7, 0, 0]} color={color}/>
    {[[-0.3, -0.6], [0.3, -0.6], [-0.3, 0.6], [0.3, 0.6]].map(([x, z]) => <RBox key={`${x}${z}`} position={[x, 0.11, z]} size={[0.05, 0.22, 0.05]} radius={0.01} color="#6b4a32"/>)}
  </Group>
}

/** Kolam ikan: a stone-rimmed pond with koi swimming round, and a lily pad. */
export function FishPond({ position, rotation = 0, size = [2, 1.6] }: { position: Vec3; rotation?: number; size?: [number, number] }) {
  const koi = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (koi.current) koi.current.rotation.y = clock.elapsedTime * 0.4 })
  const [w, d] = size
  return <Group position={position} rotation={rotation}>
    {[[0, d / 2, w + 0.2, 0.2], [0, -d / 2, w + 0.2, 0.2]].map(([x, z, sw, sd]) => <RBox key={`z${z}`} position={[x, 0.15, z]} size={[sw, 0.3, sd]} radius={0.06} color="#9a958c" roughness={0.95}/>)}
    {[-w / 2, w / 2].map((x) => <RBox key={`x${x}`} position={[x, 0.15, 0]} size={[0.2, 0.3, d]} radius={0.06} color="#9a958c" roughness={0.95}/>)}
    <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w - 0.1, d - 0.1]}/><meshStandardMaterial color="#2c7a8c" emissive="#1d5a6b" emissiveIntensity={0.25} roughness={0.1} metalness={0.2} transparent opacity={0.9}/></mesh>
    <group ref={koi} position={[0, 0.17, 0]}>
      {[[0.45, 0, '#f77f00'], [-0.35, 0.2, '#ffffff'], [0.1, -0.4, '#e63946']].map(([x, z, color]) => <RBox key={color as string} position={[x as number, 0, z as number]} size={[0.08, 0.04, 0.22]} radius={0.02} rotation={[0, 0.4, 0]} color={color as string} shadow={false}/>)}
    </group>
    <Cyl position={[w / 4, 0.205, d / 5]} radius={0.16} height={0.01} color="#4f8a4a"/>
  </Group>
}

/** A saung: a bamboo gazebo on stilts with a thatched roof, to sit cross-legged in. */
export function Saung({ position, rotation = 0, size = [2.4, 2] }: { position: Vec3; rotation?: number; size?: [number, number] }) {
  const [w, d] = size
  return <Group position={position} rotation={rotation}>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <Cyl key={`${sx}${sz}`} position={[sx * (w / 2 - 0.1), 1.2, sz * (d / 2 - 0.1)]} radius={0.06} height={2.4} color="#c8a96a"/>)}
    <RBox position={[0, 0.42, 0]} size={[w, 0.08, d]} radius={0.02} color="#d9c08a" roughness={0.9}/>
    {Array.from({ length: 8 }, (_, index) => <RBox key={index} position={[-w / 2 + 0.15 + index * ((w - 0.3) / 7), 0.47, 0]} size={[0.05, 0.02, d - 0.1]} radius={0.01} color="#b8975a" shadow={false}/>)}
    <mesh position={[0, 2.75, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[Math.hypot(w, d) / 2 + 0.35, 0.9, 4]}/><meshStandardMaterial color="#8a6a3a" roughness={1} flatShading/></mesh>
    <RBox position={[0.4, 0.55, 0.2]} size={[0.6, 0.1, 0.4]} radius={0.03} color="#2a9d8f"/>
  </Group>
}

export function WashingMachine({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.43, 0]} size={[0.6, 0.86, 0.6]} radius={0.04} color="#f4f5f2"/>
    <Cyl position={[0, 0.45, 0.3]} radius={0.19} height={0.03} rotation={[Math.PI / 2, 0, 0]} color="#9fb7bb" opacity={0.85}/>
    <RBox position={[0, 0.8, 0.3]} size={[0.5, 0.08, 0.02]} radius={0.01} color="#c9ced0"/>
  </Group>
}

/** A treadmill facing +z, its console lit. */
export function Treadmill({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.1, 0]} size={[0.8, 0.2, 1.8]} radius={0.04} color="#2a2f33"/>
    <RBox position={[0, 0.21, -0.1]} size={[0.6, 0.02, 1.5]} radius={0.01} color="#111416"/>
    {[-0.36, 0.36].map((x) => <RBox key={x} position={[x, 0.7, 0.75]} size={[0.06, 1.1, 0.06]} radius={0.02} color="#3a3f45"/>)}
    <RBox position={[0, 1.25, 0.8]} size={[0.75, 0.22, 0.12]} radius={0.03} color="#2a2f33"/>
    <RBox position={[0, 1.28, 0.735]} size={[0.3, 0.12, 0.01]} radius={0.005} color="#14262f" emissive="#3fbf9f" emissiveIntensity={0.6} shadow={false}/>
  </Group>
}

export function DumbbellRack({ position, rotation = 0, length = 1.4 }: { position: Vec3; rotation?: number; length?: number }) {
  const colors = ['#d62828', '#f77f00', '#3d7fd6', '#2a9d8f', '#2a2f33']
  return <Group position={position} rotation={rotation}>
    {[0.35, 0.75].map((y) => <RBox key={y} position={[0, y, 0]} size={[length, 0.04, 0.4]} radius={0.01} color="#3a3f45"/>)}
    {[-length / 2 + 0.05, length / 2 - 0.05].map((x) => <RBox key={x} position={[x, 0.42, 0]} size={[0.05, 0.84, 0.4]} radius={0.01} color="#2a2f33"/>)}
    {[0.35, 0.75].flatMap((y) => colors.map((color, index) => <Group key={`${y}${index}`} position={[-length / 2 + 0.2 + index * ((length - 0.4) / 4), y + 0.07, 0]}>
      <Cyl position={[0, 0, -0.1]} radius={0.06} height={0.06} rotation={[Math.PI / 2, 0, 0]} color={color}/>
      <Cyl position={[0, 0, 0.1]} radius={0.06} height={0.06} rotation={[Math.PI / 2, 0, 0]} color={color}/>
      <Cyl position={[0, 0, 0]} radius={0.015} height={0.2} rotation={[Math.PI / 2, 0, 0]} color="#c9ced0" metalness={0.7}/>
    </Group>))}
  </Group>
}

export function YogaMat({ position, rotation = 0, color = '#8d5bc1' }: { position: Vec3; rotation?: number; color?: string }) {
  return <Group position={position} rotation={rotation}>
    <RBox position={[0, 0.012, 0]} size={[0.6, 0.02, 1.7]} radius={0.008} color={color} shadow={false}/>
    <Cyl position={[0.2, 0.06, -0.95]} radius={0.06} height={0.5} rotation={[0, 0, Math.PI / 2]} color={color}/>
  </Group>
}

/** A punching bag hanging from its stand; it sways a little. */
export function PunchingBag({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  const bag = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (bag.current) bag.current.rotation.x = Math.sin(clock.elapsedTime * 1.3 + position[0]) * 0.05 })
  return <Group position={position} rotation={rotation}>
    <Cyl position={[0, 0.03, -0.3]} radius={0.3} height={0.06} color="#2a2f33"/>
    <Cyl position={[0, 1.15, -0.3]} radius={0.04} height={2.3} color="#2a2f33"/>
    <RBox position={[0, 2.28, -0.12]} size={[0.06, 0.06, 0.4]} radius={0.01} color="#2a2f33"/>
    <group ref={bag} position={[0, 2.28, 0.05]}>
      <Cyl position={[0, -0.25, 0]} radius={0.01} height={0.5} color="#9aa0a6"/>
      <Cyl position={[0, -0.95, 0]} radius={0.17} height={0.9} color="#b3262d" roughness={0.6}/>
    </group>
  </Group>
}

/** A floor lamp for the reading corner, lit in the evening. */
export function FloorLamp({ position, night = false }: { position: Vec3; night?: boolean }) {
  return <Group position={position}>
    <Cyl position={[0, 0.02, 0]} radius={0.16} height={0.04} color="#2a2f33"/>
    <Cyl position={[0, 0.75, 0]} radius={0.015} height={1.5} color="#2a2f33"/>
    <Cyl position={[0, 1.55, 0]} radius={0.12} top={0.2} height={0.25} color="#f4e3c1" emissive="#ffd9a0" emissiveIntensity={night ? 1.2 : 0.2}/>
    {night && <pointLight position={[0, 1.45, 0]} intensity={2} distance={4} color="#ffd9a0"/>}
  </Group>
}
