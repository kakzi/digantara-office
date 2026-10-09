import { useMemo, type ReactNode } from 'react'
import type * as THREE from 'three'
import { BUILDING, ENTRANCE, nightstandOf, FLOOR_HEIGHT, FLOORINGS, type Floor as FloorNumber, type Flooring, HOT_SEATS, type Item, ITEMS, MEETING_CHAIRS, type OfficeLayout, type Rect, SIDEWALK, STAIRS, type Vec3, WALLS, type WallSpec } from '../office3d-layout.ts'
import { COMPANY, DIVISIONS, type Division } from '../org.ts'
import {
  AcOutdoorUnit, AirConditioner, ArcadeCabinet, BarStool, Beanbag, Bench, Bookshelf, BrickFeatureWall, CarromTable, ClothesLine, CoffeeBar, CoffeeTable, CompanySign, EggChair,
  FilingCabinet, FlagPole, FloorCushion, Fridge, GalonDispenser, Gerobak, Hammock, HangingSign, HotDeskTable, KopiSepeda, LongTable, LowTable, Mihrab, Moodboard, NeonSign,
  OfficeChair, OfficeLight, PingPongTable, Plant, Planter, PrayerRug, Printer, RattanChair, Railing, RBox, ReceptionDesk, Safe, ServerRack, ShoeRack, SideTable, Sofa, Staircase,
  StreetLamp, StringLights, StudioSet, Bed, Nightstand, Armchair, DumbbellRack, FishPond, FloorLamp, Grill, PicnicTable, Pergola, Projector, ProjectorScreen, PunchingBag, Saung, SunLounger, Treadmill, WashingMachine, YogaMat, Television, Tree, Tribun, TrophyCabinet, Vendor, WallClock, WallScreen, Wardrobe, WaterTank, Whiteboard, WudhuStation, BathroomFittings,
} from './props.tsx'
import { asphalt, carpet, divisionSign, grass, pavingStones, terrazzo, tileFloor, woodFloor } from './textures.ts'

// Digantara Office drawn from the layout's data (office3d-layout.ts): the same walls, floors and
// furniture the agents find their way around. Walls facing the camera stay low, like a cut-away
// dollhouse, so the inside is visible from any angle the controls allow. In the evening (dark
// theme) the lamps, the neon and the string lights come on.

const WALL = '#efe6d6'
const WALL_TOP = '#d9cdb8'
const THICK = 0.25
export const COMPANY_TAGLINE = 'Software house'

function Floor({ position, size, map, color = '#ffffff', roughness = 0.8 }: { position: Vec3; size: [number, number]; map?: THREE.Texture; color?: string; roughness?: number }) {
  return <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={size}/>
    <meshStandardMaterial map={map} color={color} roughness={roughness}/>
  </mesh>
}

function textureFor(material: Flooring, area: Rect): { map: THREE.Texture; roughness: number } {
  const repeat: [number, number] = [Math.max(1, Math.round((area.maxX - area.minX) / 2.5)), Math.max(1, Math.round((area.maxZ - area.minZ) / 2.5))]
  if (material === 'wood') return { map: woodFloor(repeat), roughness: 0.55 }
  if (material === 'terrazzo') return { map: terrazzo([repeat[0] / 1.5, repeat[1] / 1.5]), roughness: 0.4 }
  if (material === 'tile') return { map: tileFloor(repeat), roughness: 0.35 }
  if (material === 'grass') return { map: grass(repeat), roughness: 1 }
  if (material === 'concrete') return { map: carpet('#a8a29a', repeat), roughness: 0.7 }
  return { map: carpet(material.slice('carpet:'.length), repeat), roughness: 0.95 }
}

/** The floors of one level, each a little above the last so they never flicker. */
function Floorings({ floor }: { floor: FloorNumber }) {
  const planes = useMemo(() => FLOORINGS[floor].map(({ area, material }) => ({ area, ...textureFor(material, area) })), [floor])
  return <>{planes.map(({ area, map, roughness }, index) => <Floor key={index} position={[(area.minX + area.maxX) / 2, 0.004 + index * 0.002, (area.minZ + area.maxZ) / 2]} size={[area.maxX - area.minX, area.maxZ - area.minZ]} map={map} roughness={roughness}/>)}</>
}

/** A wall from the layout: solid to its height, glass above; or a railing on the roof. */
function WallView({ spec }: { spec: WallSpec }) {
  const [x1, z1] = spec.from
  const [x2, z2] = spec.to
  const length = Math.hypot(x2 - x1, z2 - z1)
  const angle = Math.atan2(z2 - z1, x2 - x1)
  if (spec.railing) return <Railing position={[(x1 + x2) / 2, 0, (z1 + z2) / 2]} length={length} rotation={-angle}/>
  return <group position={[(x1 + x2) / 2, 0, (z1 + z2) / 2]} rotation={[0, -angle, 0]}>
    <RBox position={[0, spec.height / 2, 0]} size={[length + THICK, spec.height, THICK]} radius={0.02} color={WALL} roughness={0.9}/>
    <RBox position={[0, spec.height + 0.02, 0]} size={[length + THICK + 0.02, 0.05, THICK + 0.04]} radius={0.01} color={WALL_TOP}/>
    {spec.glass && <RBox position={[0, (spec.height + spec.glass) / 2, 0]} size={[length, spec.glass - spec.height, 0.05]} radius={0.01} color="#cfe8ee" opacity={0.25} roughness={0.05} shadow={false}/>}
  </group>
}

function Window({ position, width = 1.8, night }: { position: Vec3; width?: number; night: boolean }) {
  return <group position={position}>
    <RBox position={[0, 0, 0]} size={[width + 0.12, 1.22, 0.12]} radius={0.02} color="#5a4636"/>
    <mesh position={[0, 0, 0.065]}><planeGeometry args={[width, 1.1]}/><meshStandardMaterial color={night ? '#2d3f5c' : '#9fd3ea'} emissive={night ? '#1c2c4a' : '#6fb6d6'} emissiveIntensity={0.35} roughness={0.05} metalness={0.2}/></mesh>
    <RBox position={[0, 0, 0.08]} size={[0.05, 1.1, 0.03]} radius={0.01} color="#5a4636"/>
  </group>
}

function Sign({ text, color, caption, y, width = 2.2 }: { text: string; color: string; caption: string; y: number; width?: number }) {
  const texture = useMemo<THREE.Texture>(() => divisionSign(text, color, caption), [text, color, caption])
  return <HangingSign position={[0, y, 0]} width={width} texture={texture}/>
}

/** One piece of furniture from the layout, drawn at its place and turned by its rotation. */
function ItemView({ item, night }: { item: Item; night: boolean }) {
  const y = item.at[1]
  const origin: Vec3 = item.offset ?? [0, 0, 0]
  const up: Vec3 = [0, y, 0]
  const body = ((): ReactNode => {
    switch (item.kind) {
      case 'plant': return <Plant position={origin} size={item.length ?? 1}/>
      case 'bookshelf': return <Bookshelf position={origin}/>
      case 'sofa': return <Sofa position={origin} color={item.color}/>
      case 'coffeeTable': return <CoffeeTable position={origin}/>
      case 'tv': return <Television position={up}/>
      case 'galon': return <GalonDispenser position={origin}/>
      case 'fridge': return <Fridge position={origin}/>
      case 'coffeeBar': return <CoffeeBar position={origin} length={item.length}/>
      case 'barStool': return <BarStool position={origin} color={item.color}/>
      case 'pingPong': return <PingPongTable position={origin}/>
      case 'arcade': return <ArcadeCabinet position={origin} color={item.at[0] < 7.7 ? '#c62828' : '#1d4ed8'}/>
      case 'beanbag': return <Beanbag position={origin} color={item.color ?? '#e76f51'}/>
      case 'carrom': return <CarromTable position={origin}/>
      case 'tvStand': return <><RBox position={[0, 0.25, 0]} size={[1.8, 0.5, 0.45]} radius={0.03} color="#1f2328"/><RBox position={[-0.3, 0.55, 0]} size={[0.36, 0.08, 0.26]} radius={0.02} color="#f2f2f2"/></>
      case 'longTable': return <LongTable position={origin}/>
      case 'whiteboard': return <Whiteboard position={origin}/>
      case 'wallScreen': return <WallScreen position={up}/>
      case 'serverRack': return <ServerRack position={origin}/>
      case 'filing': return <FilingCabinet position={origin}/>
      case 'safe': return <Safe position={origin}/>
      case 'printer': return <Printer position={origin}/>
      case 'studio': return <StudioSet position={origin} night={night}/>
      case 'moodboard': return <Moodboard position={up}/>
      case 'trophy': return <TrophyCabinet position={origin}/>
      case 'reception': return <ReceptionDesk position={origin} name={COMPANY} tagline={COMPANY_TAGLINE}/>
      case 'neon': return <NeonSign position={up} text={item.text ?? COMPANY} color={item.color ?? '#4fd8ff'} width={item.length} night={night}/>
      case 'brick': return <BrickFeatureWall position={origin} width={item.length}/>
      case 'tribun': return <Tribun position={origin} width={item.length}/>
      case 'hotDesk': return <HotDeskTable position={origin} length={item.length}/>
      case 'eggChair': return <EggChair position={origin}/>
      case 'prayerRug': return <PrayerRug position={origin} color={item.color}/>
      case 'mihrab': return <Mihrab position={origin}/>
      case 'wudhu': return <WudhuStation position={origin}/>
      case 'shoeRack': return <ShoeRack position={origin}/>
      case 'sign': return <Sign text={item.text ?? ''} color={item.color ?? '#3d7fd6'} caption={item.caption ?? ''} y={y}/>
      case 'bench': return <Bench position={origin}/>
      case 'staircase': return <Staircase position={origin} run={STAIRS.highX - STAIRS.lowX} rise={FLOOR_HEIGHT} width={STAIRS.width}/>
      case 'wardrobe': return <Wardrobe position={origin}/>
      case 'lowTable': return <LowTable position={origin}/>
      case 'cushion': return <FloorCushion position={origin} color={item.color ?? '#e9c46a'}/>
      case 'rattanChair': return <RattanChair position={origin}/>
      case 'sideTable': return <SideTable position={origin}/>
      case 'hammock': return <Hammock position={origin}/>
      case 'clothesLine': return <ClothesLine position={origin}/>
      case 'planter': return <Planter position={origin} length={item.length}/>
      case 'bathroom': return <BathroomFittings position={origin}/>
      case 'waterTank': return <WaterTank position={up}/>
      case 'acOutdoor': return <AcOutdoorUnit position={up}/>
      case 'stringLights': return <StringLights position={up} length={item.length ?? 10} night={night}/>
      case 'ac': return <AirConditioner position={up}/>
      case 'clock': return <WallClock position={up}/>
      case 'window': return <Window position={up} night={night}/>
      case 'flag': return <FlagPole position={origin}/>
      case 'companySign': return <CompanySign position={origin} name={COMPANY} tagline={COMPANY_TAGLINE} night={night}/>
      case 'gerobak': return <><Gerobak position={origin} night={night}/><Vendor position={[-1.6, 0, 0]} rotation={Math.PI / 2} shirt="#f1f1ec" hat="peci"/></>
      case 'kopiSepeda': return <><KopiSepeda position={origin} night={night}/><Vendor position={[-1.35, 0, -0.1]} rotation={Math.PI / 2} shirt="#2f6d8f" hat="cap"/></>
      case 'tree': return <Tree position={origin} size={item.length ?? 1}/>
      case 'streetLamp': return <StreetLamp position={origin} night={night}/>
      case 'projectorScreen': return <ProjectorScreen position={origin} night={night}/>
      case 'projector': return <Projector position={origin}/>
      case 'picnicTable': return <PicnicTable position={origin} length={item.length}/>
      case 'grill': return <Grill position={origin} night={night}/>
      case 'pergola': return <Pergola position={origin} length={item.length}/>
      case 'sunLounger': return <SunLounger position={origin} color={item.color}/>
      case 'fishPond': return <FishPond position={origin}/>
      case 'saung': return <Saung position={origin}/>
      case 'washingMachine': return <WashingMachine position={origin}/>
      case 'treadmill': return <Treadmill position={origin}/>
      case 'dumbbellRack': return <DumbbellRack position={origin}/>
      case 'yogaMat': return <YogaMat position={origin} color={item.color}/>
      case 'punchingBag': return <PunchingBag position={origin}/>
      case 'floorLamp': return <FloorLamp position={origin} night={night}/>
      case 'armchair': return <Armchair position={origin} color={item.color ?? '#e9c46a'}/>
      case 'roofSlab': return <RBox position={up} size={[4.2, 0.1, 4.7]} radius={0.02} color="#cfc6b5"/>
    }
  })()
  return <group position={[item.at[0], 0, item.at[2]]} rotation={[0, item.rotation ?? 0, 0]}>{body}</group>
}

function Items({ floor, night, filter }: { floor: FloorNumber; night: boolean; filter?: (item: Item) => boolean }) {
  return <>{ITEMS[floor].filter((item) => !filter || filter(item)).map((item, index) => <ItemView key={`${item.kind}-${index}`} item={item} night={night}/>)}</>
}

const insideBuilding = (item: Item) => item.at[0] > BUILDING.minX && item.at[0] < BUILDING.maxX && item.at[2] > BUILDING.minZ && item.at[2] < BUILDING.maxZ

function AreaSigns({ layout }: { layout: OfficeLayout }) {
  return <>{layout.areas.map(({ division, sign }) => <AreaSign key={division} division={division} position={sign.position} width={sign.width}/>)}</>
}
function AreaSign({ division, position, width }: { division: Division; position: Vec3; width: number }) {
  const info = DIVISIONS[division]
  const texture = useMemo<THREE.Texture>(() => divisionSign(info.label, info.color, info.area), [info])
  return <HangingSign position={position} width={width} texture={texture}/>
}

/** Lantai 1: every room, its furniture, and the chairs round the meeting and hot-desk tables. */
function GroundFloor({ night, layout }: { night: boolean; layout: OfficeLayout }) {
  const lights: Vec3[] = [
    ...layout.desks.filter((_, index) => !layout.deskInfo[index].hot).map(([x, , z]): Vec3 => [x, 2.4, z + 0.2]),
    [2.2, 2.4, -7.6], [-3.8, 2.4, -8], [10.2, 2.4, -7.6], [0.5, 2.4, 0.5], [9.6, 2.4, -0.5], [11.8, 2.4, 1.5], [1.5, 2.4, 7.8], [-6.6, 2.4, 1.3], [-10, 2.4, -3.7], [0, 2.4, -3.7], [8, 2.4, 3.8], [-8, 2.4, 3.8],
  ]
  return <group>
    <Floorings floor={1}/>
    {WALLS[1].map((spec, index) => <WallView key={index} spec={spec}/>)}
    <Items floor={1} night={night} filter={insideBuilding}/>
    {MEETING_CHAIRS.map(({ position, facing }, index) => <OfficeChair key={`m${index}`} position={position} rotation={facing} color="#3a3f6b"/>)}
    {HOT_SEATS.map(({ position, facing }, index) => <OfficeChair key={`h${index}`} position={position} rotation={facing} color={['#e76f51', '#2a9d8f', '#e9c46a', '#8d5bc1'][index % 4]}/>)}
    <AreaSigns layout={layout}/>
    {lights.map((position) => <OfficeLight key={position.join(',')} position={position} night={night}/>)}
  </group>
}

/** Closed building shell for lower floors when looking from above in a modern 3-story minimalist house. */
function BuildingShell({ level = 1, night }: { level?: number; night: boolean }) {
  const { minX, maxX, minZ, maxZ } = BUILDING
  const H = FLOOR_HEIGHT
  const yOffset = (level - 1) * FLOOR_HEIGHT
  const walls: WallSpec[] = [
    { from: [minX, minZ], to: [maxX, minZ], height: H },
    { from: [minX, minZ], to: [minX, maxZ], height: H },
    { from: [maxX, minZ], to: [maxX, maxZ], height: H },
    { from: [minX, maxZ], to: level === 1 ? [ENTRANCE.fromX, maxZ] : [maxX, maxZ], height: H },
  ]
  if (level === 1) {
    walls.push({ from: [ENTRANCE.toX, maxZ], to: [maxX, maxZ], height: H })
  }
  return <group position={[0, yOffset, 0]}>
    {walls.map((spec, index) => <WallView key={index} spec={spec}/>)}
    {/* Architectural Vertical Cedar Slats for Gen Z Minimalist Aesthetic */}
    {[-12, -10, -8, 8, 10, 12].map((x) => (
      <RBox key={`woodslat-${level}-${x}`} position={[x, H / 2, maxZ + 0.08]} size={[0.16, H * 0.9, 0.06]} radius={0.02} color="#c49a6c" roughness={0.5} />
    ))}
    {level === 1 ? (
      <>
        {/* Modern Minimalist Glass Entrance & Canopy */}
        <RBox position={[(ENTRANCE.fromX + ENTRANCE.toX) / 2, 1.25, maxZ]} size={[ENTRANCE.toX - ENTRANCE.fromX, 2.5, 0.06]} radius={0.01} color="#dbeafe" opacity={0.35} roughness={0.05}/>
        <RBox position={[(ENTRANCE.fromX + ENTRANCE.toX) / 2, 2.55, maxZ + 0.4]} size={[ENTRANCE.toX - ENTRANCE.fromX + 0.8, 0.1, 0.9]} radius={0.02} color="#1e2329" metalness={0.8}/>
        {[-11, -7, -3.5, 3.5, 7, 11].map((x) => <Window key={x} position={[x, 1.45, maxZ + 0.14]} night={night}/>)}
        {[-7, 0, 7].map((z) => <group key={z} rotation={[0, -Math.PI / 2, 0]} position={[minX - 0.14, 1.45, z]}><Window position={[0, 0, 0]} width={1.6} night={night}/></group>)}
        <Items floor={1} night={night} filter={(item) => item.kind === 'staircase'}/>
      </>
    ) : (
      <>
        {/* Modern Minimalist Cantilever Box & Ribbon Windows */}
        {[-10, -5, 0, 5, 10].map((x) => <Window key={`l2-win-${x}`} position={[x, 1.45, maxZ + 0.14]} night={night}/>)}
        {[-6, 0, 6].map((z) => <group key={`l2-side-${z}`} rotation={[0, -Math.PI / 2, 0]} position={[minX - 0.14, 1.45, z]}><Window position={[0, 0, 0]} width={1.6} night={night}/></group>)}
        {/* Cantilever Slab Accent */}
        <RBox position={[0, 0, maxZ + 0.15]} size={[maxX - minX + 0.3, 0.14, 0.4]} radius={0.02} color="#2b2f36" roughness={0.7} />
      </>
    )}
  </group>
}

/** Lantai 2: dorm, lesehan, bathroom, and the rooftop terrace with its garden, on a slab with the stairwell open. */
function UpperFloor({ night, layout }: { night: boolean; layout: OfficeLayout }) {
  const { minX, maxX, minZ, maxZ } = BUILDING
  const hole = { minX: STAIRS.highX, maxX: STAIRS.lowX, minZ: STAIRS.z - STAIRS.width / 2 - 0.05 }
  const slab: [number, number, number, number][] = [[minX, maxX, minZ, hole.minZ], [minX, hole.minX, hole.minZ, maxZ], [hole.maxX, maxX, hole.minZ, maxZ]]
  const blankets = ['#3d7fd6', '#e76f51', '#2a9d8f', '#e9c46a', '#8d5bc1', '#d64545']
  return <group position={[0, FLOOR_HEIGHT, 0]}>
    {slab.map(([x1, x2, z1, z2]) => <RBox key={`${x1},${z1}`} position={[(x1 + x2) / 2, -0.11, (z1 + z2) / 2]} size={[x2 - x1, 0.22, z2 - z1]} radius={0.01} color="#cfc6b5"/>)}
    <Floorings floor={2}/>
    {WALLS[2].map((spec, index) => <WallView key={index} spec={spec}/>)}
    <Items floor={2} night={night}/>
    {layout.beds.map(([x, , z], index) => <Bed key={index} position={[x, 0, z]} color={blankets[index % blankets.length]}/>)}
    {layout.beds.map((bed, index) => { const [x, , z] = nightstandOf(bed); return <Nightstand key={`n${index}`} position={[x, 0, z]} night={night}/> })}
    {[[-8.5, -5], [1, -7.6], [11.5, -7.5]].map(([x, z]) => <OfficeLight key={`${x},${z}`} position={[x, 2.4, z]} night={night}/>)}
  </group>
}

/** Lantai 3: Penthouse CEO, Rooftop Cinema, Sky Gym, Sky Garden with Saung & Koi Pond, Pergola & BBQ, and Perimeter Glass Railings */
function ThirdFloor({ night }: { night: boolean }) {
  const { minX, maxX, minZ, maxZ } = BUILDING
  const hole = { minX: STAIRS.highX, maxX: STAIRS.lowX, minZ: STAIRS.z - STAIRS.width / 2 - 0.05 }
  const slab: [number, number, number, number][] = [[minX, maxX, minZ, hole.minZ], [minX, hole.minX, hole.minZ, maxZ], [hole.maxX, maxX, hole.minZ, maxZ]]
  return <group position={[0, FLOOR_HEIGHT * 2, 0]}>
    {slab.map(([x1, x2, z1, z2]) => <RBox key={`${x1},${z1}`} position={[(x1 + x2) / 2, -0.11, (z1 + z2) / 2]} size={[x2 - x1, 0.22, z2 - z1]} radius={0.01} color="#ded9cc"/>)}
    <Floorings floor={3}/>
    {WALLS[3].map((spec, index) => <WallView key={index} spec={spec}/>)}
    <Items floor={3} night={night}/>
    {[[-9, 7], [9, 7], [-9, -7], [3, -7], [10, -7]].map(([x, z]) => <OfficeLight key={`${x},${z}`} position={[x, 2.4, z]} night={night}/>)}
  </group>
}

/** The grounds: lawn, sidewalk, road, and the gang (alley) with the street food left of the building. */
function Outdoors({ night }: { night: boolean }) {
  const lawn = useMemo(() => grass([16, 12]), [])
  const road = useMemo(() => asphalt([10, 1]), [])
  const sidewalk = useMemo(() => pavingStones([16, 1.5]), [])
  const gang = useMemo(() => pavingStones([2, 9]), [])
  return <group>
    <Floor position={[0, -0.02, 2]} size={[70, 50]} map={lawn} roughness={1}/>
    <Floor position={[0, -0.005, (SIDEWALK.minZ + SIDEWALK.maxZ) / 2]} size={[SIDEWALK.maxX - SIDEWALK.minX, SIDEWALK.maxZ - SIDEWALK.minZ]} map={sidewalk} roughness={0.9}/>
    <Floor position={[0, -0.01, 16.6]} size={[70, 6]} map={road} roughness={0.95}/>
    <Floor position={[(ENTRANCE.fromX + ENTRANCE.toX) / 2, 0, 10.7]} size={[2.2, 0.5]} map={sidewalk}/>
    <Floor position={[-16.5, -0.008, 0]} size={[4.6, 21.8]} map={gang} roughness={0.9}/>
    <Items floor={1} night={night} filter={(item) => !insideBuilding(item)}/>
  </group>
}

/** The grounds plus the floor in view: lantai 1 as a cut-away, lantai 2, or lantai 3 on top of the closed building tiers. */
export function Environment({ night = false, layout, floor = 1 }: { night?: boolean; layout: OfficeLayout; floor?: FloorNumber }) {
  return <group>
    {floor === 1 && <GroundFloor night={night} layout={layout}/>}
    {floor === 2 && (
      <>
        <BuildingShell level={1} night={night}/>
        <UpperFloor night={night} layout={layout}/>
      </>
    )}
    {floor === 3 && (
      <>
        <BuildingShell level={1} night={night}/>
        <BuildingShell level={2} night={night}/>
        <ThirdFloor night={night}/>
      </>
    )}
    <Outdoors night={night}/>
  </group>
}

