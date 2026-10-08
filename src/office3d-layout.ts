import { deskSlots, type Division, type RoleKey } from './org.ts'
import type { OfficeStation } from './types.ts'

// Digantara Office in 3D (world units ≈ metres, y up, +z towards the street, which is south).
// Kept apart from the scene so it can be tested. A near-square building of three rows of rooms
// joined by two corridors and an open commons in the middle, so every division walks past the
// others on its way anywhere:
//
//   z -10.5 ┌──────────┬─────────┬──────────────┬────────────┐
//           │ Finance  │ Mushola │ Ruang Meeting│ Game room  │
//   z -4.5  ├──────────┴─────────┴── corridor ─┴────────────┤
//           │ Creative studio │ Commons: tribun, │ Lounge &   │
//           │                 │ hot desks, swing │ coffee bar │
//   z  3    ├──────────────────────── corridor ──────────────┤
//           │ Engineering     │ Lobby, neon,     │ Executive  │
//           │                 │ stairs up        │ suite      │
//   z 10.5  └──────────────────── entrance ──────────────────┘
//           sidewalk · Digantara sign · flag      (bakso and kopi in the gang on the left)
//
// Lantai 2 (FLOOR_HEIGHT up) has the dorm, a lesehan room with a reading corner, a bathroom, a gym,
// and the rooftop: a nobar cinema, makan bareng under a pergola with a sate grill, sun loungers and
// a hammock, and a garden with a koi pond, a saung and the laundry. Agents find their way with A* over a walkability grid built from the walls and the
// furniture below, so they use doors and walk around desks and tables.

export type Vec3 = [number, number, number]
export type Floor = 1 | 2
export interface Rect { minX: number; maxX: number; minZ: number; maxZ: number }
const rect = (minX: number, maxX: number, minZ: number, maxZ: number): Rect => ({ minX, maxX, minZ, maxZ })
export const inside = (area: Rect, x: number, z: number, margin = 0) => x > area.minX - margin && x < area.maxX + margin && z > area.minZ - margin && z < area.maxZ + margin

/** Height of lantai 2's floor above the ground. */
export const FLOOR_HEIGHT = 2.8
export const floorOf = (position: Vec3 | number): Floor => ((typeof position === 'number' ? position : position[1]) > FLOOR_HEIGHT / 2 ? 2 : 1)
export const WALL_HEIGHT = 2.6

export const BUILDING = rect(-14, 14, -10.5, 10.5)
export const ROOMS = {
  finance: rect(-14, -6.5, -10.5, -4.5),
  mushola: rect(-6.5, -1, -10.5, -4.5),
  meeting: rect(-1, 6, -10.5, -4.5),
  game: rect(6, 14, -10.5, -4.5),
  creative: rect(-14, -5, -2.9, 3),
  commons: rect(-5, 6, -2.9, 3),
  lounge: rect(6, 14, -2.9, 3),
  engineering: rect(-14, -3, 4.6, 10.5),
  lobby: rect(-3, 6, 4.6, 10.5),
  executive: rect(6, 14, 4.6, 10.5),
}
export const CORRIDORS = [rect(-14, 14, -4.5, -2.9), rect(-14, 14, 3, 4.6)]
export const UPPER_ROOMS = {
  dorm: rect(-14, -3, -10.5, 1),
  lesehan: rect(-3, 5, -10.5, -4.5),
  bathroom: rect(5, 9, -10.5, -6),
  gym: rect(9, 14, -10.5, -4.5),
  terrace: rect(-3, 14, -4.5, 10.5),
  garden: rect(-14, -3, 1, 10.5),
}
/** The gap in the front wall. */
export const ENTRANCE = { fromX: -1.3, toX: 0.3 }
/** Straight stairs in the lobby, rising towards -x: lantai 1 at lowX, lantai 2 at highX. */
export const STAIRS = { z: 9.6, width: 1, lowX: 4.7, highX: 1.7 }
const STAIRS_FOOT: [number, number] = [5.3, STAIRS.z]
const STAIRS_HEAD: [number, number] = [1.1, STAIRS.z]
export const SIDEWALK = rect(-20, 20, 10.9, 13.6)
/**
 * The qibla from Indonesia is about 295° (west-north-west). As a facing (0 looks along +z, the
 * south; π/2 looks east), that is atan2(sin 295°, -cos 295°).
 */
export const QIBLA_FACING = Math.atan2(Math.sin((295 * Math.PI) / 180), -Math.cos((295 * Math.PI) / 180))

// ---------------------------------------------------------------------------
// Walls, floors and furniture: data the scene draws and the path finder avoids.

/** A wall: solid up to `height`, glass above it up to `glass`; a railing on the roof. */
export interface WallSpec { from: [number, number]; to: [number, number]; height: number; glass?: number; railing?: boolean }

/** A straight wall with door gaps (given along its own axis). */
function wall(from: [number, number], to: [number, number], height: number, gaps: [number, number][] = [], extra: Partial<WallSpec> = {}): WallSpec[] {
  const alongX = from[1] === to[1]
  const start = alongX ? Math.min(from[0], to[0]) : Math.min(from[1], to[1])
  const end = alongX ? Math.max(from[0], to[0]) : Math.max(from[1], to[1])
  const point = (value: number): [number, number] => alongX ? [value, from[1]] : [from[0], value]
  const pieces: WallSpec[] = []
  let cursor = start
  for (const [a, b] of [...gaps].sort((left, right) => left[0] - right[0])) {
    if (a - cursor > 0.05) pieces.push({ from: point(cursor), to: point(a), height, ...extra })
    cursor = Math.max(cursor, b)
  }
  if (end - cursor > 0.05) pieces.push({ from: point(cursor), to: point(end), height, ...extra })
  return pieces
}
const GLASS = { glass: 2.4 }
export const DOORS = {
  finance: [-7.9, -6.6] as [number, number],
  mushola: [-2.7, -1.4] as [number, number],
  meeting: [4.6, 5.8] as [number, number],
  game: [6.3, 7.6] as [number, number],
  engineering: [-5.1, -3.5] as [number, number],
  executive: [6.4, 7.6] as [number, number],
}
export const WALLS: Record<Floor, WallSpec[]> = {
  1: [
    ...wall([-14, -10.5], [14, -10.5], WALL_HEIGHT),
    ...wall([-14, -10.5], [-14, 10.5], WALL_HEIGHT),
    ...wall([14, -10.5], [14, 10.5], WALL_HEIGHT),
    ...wall([-14, 10.5], [14, 10.5], 0.55, [[ENTRANCE.fromX, ENTRANCE.toX]]),
    // Back row: glass fronts on the corridor; the mushola keeps solid walls
    ...wall([-14, -4.5], [-6.5, -4.5], 1, [DOORS.finance], GLASS),
    ...wall([-6.5, -4.5], [-1, -4.5], 1.9, [DOORS.mushola]),
    ...wall([-1, -4.5], [6, -4.5], 1, [DOORS.meeting], GLASS),
    ...wall([6, -4.5], [14, -4.5], 1, [DOORS.game], GLASS),
    ...wall([-6.5, -10.5], [-6.5, -4.5], 2.2),
    ...wall([-1, -10.5], [-1, -4.5], 2.2),
    ...wall([6, -10.5], [6, -4.5], 1, [], GLASS),
    // Middle row: the creative studio and the lounge are open, behind low planter walls
    ...wall([-5, -2.9], [-5, 3], 0.9, [[-0.9, 1.2]]),
    ...wall([-14, 3], [-5, 3], 0.9, [[-8.4, -7]]),
    ...wall([6, -2.9], [6, -0.8], 0.9),
    // Front row: glass partitions; the lobby is open to the corridor
    ...wall([-14, 4.6], [-3, 4.6], 1, [DOORS.engineering], GLASS),
    ...wall([-3, 4.6], [-3, 10.5], 1, [[5.6, 7]], GLASS),
    ...wall([6, 4.6], [14, 4.6], 1, [DOORS.executive], GLASS),
    ...wall([6, 4.6], [6, 10.5], 1, [], GLASS),
  ],
  2: [
    ...wall([-14, -10.5], [14, -10.5], WALL_HEIGHT),
    ...wall([-14, -10.5], [-14, 1], WALL_HEIGHT),
    ...wall([14, -10.5], [14, -4.5], WALL_HEIGHT),
    ...wall([-14, 1], [-3, 1], 1, [[-4.6, -3.4]], { glass: 2.2 }),
    ...wall([-3, -10.5], [-3, 1], 1, [], { glass: 2.2 }),
    ...wall([-3, -4.5], [5, -4.5], 1, [[3.4, 4.6]], { glass: 2.2 }),
    ...wall([9, -4.5], [14, -4.5], 1, [[9.4, 10.6]], { glass: 2.2 }),
    ...wall([5, -10.5], [5, -4.5], 2, [[-5.9, -4.6]]),
    ...wall([5, -6], [9, -6], 2, [[6.4, 7.4]]),
    ...wall([9, -10.5], [9, -6], 2),
    // Railings round the rooftop terrace and the garden, and round the stairwell
    ...wall([-14, 10.5], [14, 10.5], 1, [], { railing: true }),
    ...wall([14, -4.5], [14, 10.5], 1, [], { railing: true }),
    ...wall([-14, 1], [-14, 10.5], 1, [], { railing: true }),
    ...wall([STAIRS.highX, STAIRS.z - STAIRS.width / 2 - 0.05], [STAIRS.lowX, STAIRS.z - STAIRS.width / 2 - 0.05], 1, [], { railing: true }),
    ...wall([STAIRS.lowX, STAIRS.z - STAIRS.width / 2 - 0.05], [STAIRS.lowX, BUILDING.maxZ], 1, [], { railing: true }),
  ],
}

export type Flooring = 'wood' | 'terrazzo' | 'tile' | 'grass' | 'concrete' | `carpet:${string}`
export const FLOORINGS: Record<Floor, { area: Rect; material: Flooring }[]> = {
  1: [
    { area: BUILDING, material: 'wood' },
    ...CORRIDORS.map((area) => ({ area, material: 'concrete' as const })),
    { area: ROOMS.finance, material: 'carpet:#3f7a62' },
    { area: ROOMS.mushola, material: 'tile' },
    { area: rect(-6.3, -1.2, -10.3, -6.6), material: 'carpet:#2f6b4f' },
    { area: ROOMS.meeting, material: 'carpet:#4a4f6b' },
    { area: ROOMS.game, material: 'carpet:#3b4170' },
    { area: ROOMS.creative, material: 'carpet:#86476a' },
    { area: ROOMS.commons, material: 'terrazzo' },
    { area: ROOMS.engineering, material: 'carpet:#3f5f86' },
    { area: ROOMS.lobby, material: 'terrazzo' },
    { area: ROOMS.executive, material: 'carpet:#6e5a3a' },
  ],
  2: [
    { area: BUILDING, material: 'tile' },
    { area: UPPER_ROOMS.dorm, material: 'wood' },
    { area: rect(-13.6, -3.4, -10.1, 0.6), material: 'carpet:#6d5a8c' },
    { area: UPPER_ROOMS.lesehan, material: 'wood' },
    { area: rect(-1.2, 3.2, -9.2, -6), material: 'carpet:#8c3b3b' },
    { area: UPPER_ROOMS.gym, material: 'carpet:#2b2f36' },
    { area: UPPER_ROOMS.garden, material: 'grass' },
    // Artificial grass at the rooftop cinema, a wooden deck under the pergola
    { area: rect(-2.7, 3.5, -3.6, 1.4), material: 'grass' },
    { area: rect(6.6, 11.4, -3.7, 0.1), material: 'wood' },
  ],
}

export type ItemKind =
  | 'plant' | 'bookshelf' | 'sofa' | 'coffeeTable' | 'tv' | 'galon' | 'fridge' | 'coffeeBar' | 'barStool'
  | 'pingPong' | 'arcade' | 'beanbag' | 'carrom' | 'tvStand' | 'longTable' | 'whiteboard' | 'wallScreen'
  | 'serverRack' | 'filing' | 'safe' | 'printer' | 'studio' | 'moodboard' | 'trophy' | 'reception' | 'neon' | 'brick'
  | 'tribun' | 'hotDesk' | 'eggChair' | 'prayerRug' | 'mihrab' | 'wudhu' | 'shoeRack' | 'sign' | 'bench' | 'staircase'
  | 'wardrobe' | 'lowTable' | 'cushion' | 'rattanChair' | 'sideTable' | 'hammock' | 'clothesLine'
  | 'planter' | 'bathroom' | 'waterTank' | 'acOutdoor' | 'stringLights' | 'ac' | 'clock' | 'window'
  | 'flag' | 'companySign' | 'gerobak' | 'kopiSepeda' | 'tree' | 'streetLamp'
  | 'projectorScreen' | 'projector' | 'picnicTable' | 'grill' | 'pergola' | 'sunLounger' | 'fishPond' | 'saung' | 'washingMachine'
  | 'treadmill' | 'dumbbellRack' | 'yogaMat' | 'punchingBag' | 'floorLamp' | 'armchair' | 'roofSlab'

/**
 * A piece of furniture (or anything else drawn). `size` is its footprint (x by z, before
 * `rotation`); solid items block walking. Wall-mounted things carry their height in `at[1]`.
 */
export interface Item { kind: ItemKind; at: Vec3; rotation?: number; size?: [number, number]; solid?: boolean; text?: string; caption?: string; color?: string; length?: number; /** Where the drawing sits relative to `at` (when the footprint is not centred on it). */ offset?: Vec3 }
const solid = (kind: ItemKind, at: Vec3, size: [number, number], rotation = 0, extra: Partial<Item> = {}): Item => ({ kind, at, size, rotation, solid: true, ...extra })
const decor = (kind: ItemKind, at: Vec3, rotation = 0, extra: Partial<Item> = {}): Item => ({ kind, at, rotation, ...extra })

// Fixed points of the furniture that agents use.
export const MEETING_TABLE: Vec3 = [2.2, 0, -7.6]
export const PING_PONG: Vec3 = [10.2, 0, -7.6]
export const ARCADES: Vec3[] = [[7.2, 0, -10], [8.2, 0, -10]]
export const BEANBAGS: Vec3[] = [[12.4, 0, -9.7], [12.4, 0, -8.5]]
export const CARROM: Vec3 = [12.4, 0, -5.7]
export const TRIBUN: Vec3 = [-2.6, 0, -1]
export const HOT_DESK: Vec3 = [2, 0, 0.9]
export const EGG_CHAIRS: Vec3[] = [[4.3, 0, -2], [5.4, 0, -2]]
export const COFFEE_BAR: Vec3 = [9.6, 0, -2.3]
export const SOFA: Vec3 = [11.6, 0, 1]
export const STUDIO: Vec3 = [-6.6, 0, 0.3]
export const WHITEBOARD: Vec3 = [-3.6, 0, 9.2]
export const LESEHAN_TABLE: Vec3 = [1, FLOOR_HEIGHT, -7.6]
export const HAMMOCK: Vec3 = [10.5, FLOOR_HEIGHT, 6]
export const RATTAN_TABLE: Vec3 = [6.6, FLOOR_HEIGHT, 3.2]
export const CINEMA_SCREEN: Vec3 = [0.4, FLOOR_HEIGHT, -3.9]
/** Beanbags in front of the rooftop screen, in two rows. */
export const CINEMA_SEATS: Vec3[] = [[-1.2, FLOOR_HEIGHT, -2], [0, FLOOR_HEIGHT, -2], [1.2, FLOOR_HEIGHT, -2], [-0.6, FLOOR_HEIGHT, -0.8], [0.6, FLOOR_HEIGHT, -0.8], [1.8, FLOOR_HEIGHT, -0.8]]
export const PICNIC_TABLE: Vec3 = [9, FLOOR_HEIGHT, -1.8]
export const GRILL: Vec3 = [12.9, FLOOR_HEIGHT, -1.8]
export const SUN_LOUNGERS: Vec3[] = [[12.6, FLOOR_HEIGHT, 1], [12.6, FLOOR_HEIGHT, 2.3]]
export const TREADMILLS: Vec3[] = [[10, FLOOR_HEIGHT, -9.3], [11.3, FLOOR_HEIGHT, -9.3]]
export const YOGA_MATS: Vec3[] = [[10.1, FLOOR_HEIGHT, -6.6], [11.3, FLOOR_HEIGHT, -6.6]]
export const FISH_POND: Vec3 = [-4.7, FLOOR_HEIGHT, 5.5]
export const SAUNG: Vec3 = [-12.2, FLOOR_HEIGHT, 9.1]
export const READING_CHAIRS: Vec3[] = [[-2.2, FLOOR_HEIGHT, -9.4], [-2.2, FLOOR_HEIGHT, -8.2]]
export const FLAG: Vec3 = [16.8, 0, 9]
export const BAKSO_CART: Vec3 = [-16.3, 0, 1]
export const KOPI_BIKE: Vec3 = [-16.3, 0, 6.5]
export const STALL_ROTATION = Math.PI / 2
/** Prayer rugs: the imam's in front by the mihrab, then two rows behind. */
export const PRAYER_RUGS: Vec3[] = [[-5.5, 0, -8.1], [-4.3, 0, -9.1], [-4.3, 0, -8.1], [-4.3, 0, -7.1], [-3.1, 0, -8.6], [-3.1, 0, -7.6]]

const R = Math.PI / 2
export const ITEMS: Record<Floor, Item[]> = {
  1: [
    // Finance: filing cabinets, the brankas, a printer and an archive shelf
    solid('filing', [-13.55, 0, -9.7], [0.5, 0.6], R), solid('filing', [-13.55, 0, -9.1], [0.5, 0.6], R),
    solid('safe', [-13.5, 0, -5.5], [0.6, 0.6], R), solid('printer', [-7.3, 0, -10], [0.7, 0.55]),
    solid('bookshelf', [-10.3, 0, -10.2], [1.4, 0.4]), solid('plant', [-7.1, 0, -8], [0.5, 0.5]),
    decor('ac', [-10.3, 2.3, -10.37]), decor('clock', [-13.87, 2.1, -7.5], R),
    // Mushola: mihrab on the qibla (west) wall, sajadah, tempat wudhu and the shoe rack
    decor('mihrab', [-6.37, 0, -8.1], R),
    ...PRAYER_RUGS.map((at, index) => decor('prayerRug', at, QIBLA_FACING + Math.PI, { color: index === 0 ? '#7a1f2b' : ['#1f6f5c', '#22577a', '#5b3a6b'][index % 3] })),
    solid('wudhu', [-1.55, 0, -6], [2.2, 0.6], -R), solid('shoeRack', [-3.6, 0, -4.85], [1.4, 0.35]),
    solid('plant', [-1.5, 0, -10], [0.5, 0.5]),
    decor('sign', [-2.05, 2.2, -4.3], 0, { text: 'Mushola', caption: 'Sholat & wudhu', color: '#1f6f5c' }),
    // Ruang meeting: long table, TV, whiteboard; the neon says what the office is about
    solid('longTable', MEETING_TABLE, [4.4, 1.3]), decor('tv', [2.2, 1.5, -10.33]),
    solid('whiteboard', [5.5, 0, -8.6], [1.7, 0.6], -R), solid('plant', [-0.5, 0, -10], [0.5, 0.5]),
    decor('sign', [5.2, 2.2, -4.3], 0, { text: 'Ruang Meeting', caption: 'Rapat & diskusi', color: '#4a4f9b' }),
    decor('neon', [1.6, 1.85, -4.36], 0, { text: 'ngoding · ngopi · ngobrol', color: '#ff4fa3', length: 3.6 }),
    // Game room
    solid('pingPong', PING_PONG, [2.8, 1.6]), ...ARCADES.map((at) => solid('arcade', at, [0.8, 0.8])),
    solid('tvStand', [13.65, 0, -9.1], [1.8, 0.45], -R), decor('tv', [13.86, 1.35, -9.1], -R),
    ...BEANBAGS.map((at, index) => decor('beanbag', at, 0, { color: index ? '#2a9d8f' : '#e76f51' })),
    solid('carrom', CARROM, [1, 1]), solid('plant', [13.5, 0, -5], [0.5, 0.5]),
    decor('sign', [6.95, 2.2, -4.3], 0, { text: 'Game Room', caption: 'Ping-pong · arcade · karambol', color: '#c62828' }),
    // Commons: tribun, the hot-desk table, hanging egg chairs, beanbags and big plants
    solid('tribun', [TRIBUN[0], 0, TRIBUN[2] - 0.6], [3.2, 1.86], 0, { length: 3.2, offset: [0, 0, 0.6] }), solid('hotDesk', HOT_DESK, [4.6, 1.2], 0, { length: 4.6 }),
    ...EGG_CHAIRS.map((at) => solid('eggChair', at, [0.8, 0.8])),
    decor('beanbag', [0.2, 0, -2.2], 0, { color: '#e9c46a' }), decor('beanbag', [1.3, 0, -2.3], 0, { color: '#8d5bc1' }),
    solid('plant', [5.5, 0, 2.5], [0.6, 0.6], 0, { length: 1.5 }), solid('plant', [-4.5, 0, 2.5], [0.6, 0.6], 0, { length: 1.5 }),
    // Lounge: coffee bar, sofa facing the TV, galon and fridge
    solid('coffeeBar', COFFEE_BAR, [3.5, 0.8], 0, { length: 3.4 }),
    ...[8.6, 9.6, 10.6].map((x, index) => decor('barStool', [x, 0, -1.35], 0, { color: ['#e76f51', '#2a9d8f', '#e9c46a'][index] })),
    solid('sofa', SOFA, [2.4, 0.9], R, { color: '#d9784a' }), solid('coffeeTable', [12.7, 0, 1], [1.3, 0.7], R), decor('tv', [13.86, 1.4, 1], -R),
    solid('galon', [13.5, 0, -2.4], [0.5, 0.5], -R), solid('fridge', [13.5, 0, -1.4], [0.7, 0.7], -R), solid('plant', [6.6, 0, 2.5], [0.5, 0.5]),
    // Creative studio: photo/video set and a moodboard
    solid('studio', STUDIO, [1.8, 1.4]), decor('moodboard', [-13.86, 1.6, 1], R), solid('plant', [-13.5, 0, 2.6], [0.5, 0.5]),
    // Engineering: standup whiteboard, wall dashboard, server rack
    solid('whiteboard', WHITEBOARD, [1.7, 0.6], -R), decor('wallScreen', [-13.85, 1.6, 7.9], R), solid('serverRack', [-13.5, 0, 5.2], [0.7, 0.62], R),
    solid('plant', [-3.5, 0, 5.1], [0.5, 0.5]), decor('ac', [-13.87, 2.3, 9.5], R),
    // Lobby: reception, brick wall with the neon logo, a bench and the stairs up
    solid('reception', [2.6, 0, 6.9], [2.3, 0.75]), solid('brick', [2.6, 0, 5.4], [3, 0.24], 0, { length: 3 }),
    decor('neon', [2.6, 1.65, 5.54], 0, { text: 'Digantara', color: '#4fd8ff', length: 2.8 }),
    solid('bench', [-2.3, 0, 8.6], [1.8, 0.45], R), solid('plant', [5.5, 0, 5.1], [0.5, 0.5]), solid('plant', [-2.5, 0, 10.05], [0.5, 0.5]),
    solid('staircase', [(STAIRS.lowX + STAIRS.highX) / 2, 0, STAIRS.z], [Math.abs(STAIRS.highX - STAIRS.lowX), STAIRS.width], 0, { offset: [(STAIRS.lowX - STAIRS.highX) / 2, 0, 0] }),
    // Executive suite: sofa corner and trophies
    solid('sofa', [13.3, 0, 7], [2.4, 0.9], -R, { color: '#3b2a24' }), solid('coffeeTable', [12, 0, 7], [1.3, 0.7], R),
    solid('trophy', [8.6, 0, 5], [1.6, 0.45]), solid('plant', [13.5, 0, 10.05], [0.5, 0.5]), solid('plant', [6.5, 0, 10.05], [0.5, 0.5]),
    // Windows
    ...[-10.2, -3.8, 2.5, 10].map((x) => decor('window', [x, 1.55, BUILDING.minZ + 0.14])),
    ...[-7.5, 7.5].map((z) => decor('window', [BUILDING.minX + 0.14, 1.55, z], R)),
    ...[-6.5, 7.5].map((z) => decor('window', [BUILDING.maxX - 0.14, 1.55, z], -R)),
    // Outside: the gang with the street food, the sign, the flag, lamps and trees
    solid('gerobak', BAKSO_CART, [2.2, 1], STALL_ROTATION), solid('kopiSepeda', KOPI_BIKE, [1.9, 0.8], STALL_ROTATION),
    solid('companySign', [-6, 0, 12.3], [3.4, 0.6]), solid('flag', FLAG, [0.7, 0.7]),
    ...[[-10, 13.2], [6, 13.2]].map(([x, z]) => solid('streetLamp', [x, 0, z], [0.3, 0.3])),
    ...[[-17, -9, 1.3], [17.5, -8, 1.2], [-18.5, 9.5, 1.1], [18, 3, 1.3], [-9, -12.8, 1], [8, -12.8, 1.1], [19, 11.5, 1]].map(([x, z, size]) => solid('tree', [x, 0, z], [0.8, 0.8], 0, { length: size })),
    decor('acOutdoor', [-5, 0, -11], Math.PI), decor('acOutdoor', [5, 0, -11], Math.PI),
  ],
  2: [
    // Dorm: wardrobes (beds and their nightstands come from the crew)
    solid('wardrobe', [-13.6, 0, 0.2], [1.2, 0.6], R), decor('ac', [-8.5, 2.3, -10.37]),
    // Lesehan, and a reading corner with two armchairs and a floor lamp
    solid('lowTable', [LESEHAN_TABLE[0], 0, LESEHAN_TABLE[2]], [1.4, 0.9]),
    ...[[-1, 0, '#e9c46a'], [1, 0, '#2a9d8f'], [0, -0.85, '#e76f51'], [0, 0.85, '#3d7fd6']].map(([dx, dz, color]) => decor('cushion', [LESEHAN_TABLE[0] + (dx as number), 0, LESEHAN_TABLE[2] + (dz as number)], 0, { color: color as string })),
    solid('bookshelf', [3.8, 0, -10.2], [1.4, 0.4]), solid('bookshelf', [-2.6, 0, -6.8], [1.4, 0.4], R),
    ...READING_CHAIRS.map(([x, , z], index) => solid('armchair', [x, 0, z], [0.9, 0.85], R, { color: index ? '#2a9d8f' : '#e9c46a' })),
    decor('floorLamp', [-2.6, 0, -10.05]), solid('plant', [-2.5, 0, -5.1], [0.5, 0.5]),
    // Bathroom, with the water tank and an AC unit on its roof
    solid('bathroom', [7.05, 0, -10.05], [2.2, 0.9], 0, { offset: [-0.45, 0, 1.75] }),
    decor('roofSlab', [7, 2.05, -8.25]), decor('waterTank', [7.9, 2.1, -8.9]), decor('acOutdoor', [5.9, 2.1, -9.6]),
    // Gym: treadmills facing the view, dumbbells, yoga mats and a punching bag
    ...TREADMILLS.map(([x, , z]) => solid('treadmill', [x, 0, z], [0.8, 1.8])),
    solid('dumbbellRack', [13.6, 0, -7.6], [1.4, 0.45], -R), solid('punchingBag', [13.3, 0, -5.3], [0.6, 0.6], -R),
    ...YOGA_MATS.map(([x, , z], index) => decor('yogaMat', [x, 0, z], 0, { color: index ? '#2a9d8f' : '#8d5bc1' })),
    decor('sign', [12, 2.2, -4.3], 0, { text: 'Gym', caption: 'Sehat itu produktif', color: '#2b2f36' }),
    // Rooftop cinema: layar tancap, a projector and beanbags on artificial grass
    solid('projectorScreen', [CINEMA_SCREEN[0], 0, CINEMA_SCREEN[2]], [3.6, 0.3]), solid('projector', [0.4, 0, 1.1], [0.45, 0.45]),
    ...CINEMA_SEATS.map(([x, , z], index) => decor('beanbag', [x, 0, z], 0, { color: ['#e76f51', '#2a9d8f', '#e9c46a', '#8d5bc1', '#3d7fd6', '#f4a3b4'][index] })),
    // Makan bareng under the pergola, with the sate grill beside it
    solid('picnicTable', [PICNIC_TABLE[0], 0, PICNIC_TABLE[2]], [3, 2], 0, { length: 3 }), decor('pergola', [PICNIC_TABLE[0], 0, PICNIC_TABLE[2]], 0, { length: 4.2 }),
    solid('grill', [GRILL[0], 0, GRILL[2]], [1, 0.5], -R),
    // Santai: rattan chairs, sun loungers, the hammock, string lights and plants
    solid('sideTable', [RATTAN_TABLE[0], 0, RATTAN_TABLE[2]], [0.6, 0.6]),
    decor('rattanChair', [RATTAN_TABLE[0] - 0.85, 0, RATTAN_TABLE[2]], R), decor('rattanChair', [RATTAN_TABLE[0] + 0.85, 0, RATTAN_TABLE[2]], -R),
    ...SUN_LOUNGERS.map(([x, , z], index) => solid('sunLounger', [x, 0, z], [0.7, 1.4], R, { color: index ? '#e9c46a' : '#2a9d8f' })),
    solid('hammock', [HAMMOCK[0], 0, HAMMOCK[2]], [2.6, 0.8]),
    decor('stringLights', [0, 2.15, BUILDING.maxZ - 0.12], 0, { length: 27 }), decor('stringLights', [PICNIC_TABLE[0], 2.3, PICNIC_TABLE[2]], 0, { length: 4 }),
    solid('plant', [13.5, 0, -3.9], [0.5, 0.5]), solid('plant', [13.5, 0, 9.9], [0.5, 0.5]), solid('plant', [-2.5, 0, 9.9], [0.5, 0.5]), solid('plant', [5.5, 0, -3.9], [0.5, 0.5], 0, { length: 1.3 }),
    // Garden: planter boxes, a koi pond, a bamboo saung, and the laundry by the clothes line
    ...[[-11.5, 4], [-7.5, 4], [-11.5, 7], [-7.5, 7]].map(([x, z]) => solid('planter', [x, 0, z], [2.4, 0.8], 0, { length: 2.4 })),
    solid('fishPond', [FISH_POND[0], 0, FISH_POND[2]], [2, 1.6]), solid('saung', [SAUNG[0], 0, SAUNG[2]], [2.4, 2]),
    decor('clothesLine', [-9.5, 0, 9.6]), solid('washingMachine', [-6.9, 0, 9.95], [0.6, 0.6]), solid('washingMachine', [-6.2, 0, 9.95], [0.6, 0.6]),
    ...[-10.2, -3.8, 2.5].map((x) => decor('window', [x, 1.55, BUILDING.minZ + 0.14])),
  ],
}

// ---------------------------------------------------------------------------
// Desks, seats and beds for the crew.

/**
 * Where and how an agent is. `pose` lying (bed, hammock: `height` is the surface) or sitting on
 * the floor (lesehan, mushola); otherwise standing, or sitting on a chair when `seated`.
 */
export interface Placement { position: Vec3; facing: number; seated: boolean; label?: string; pose?: 'lie' | 'floor'; height?: number }
export interface IdleStop { key: string; label: string; spots: Placement[] }

const spot = (x: number, z: number, facing: number, seated = false, label?: string): Placement => ({ position: [x, 0, z], facing, seated, ...(label ? { label } : {}) })
const upstairs = (x: number, z: number, facing: number, extra: Partial<Placement> = {}): Placement => ({ position: [x, FLOOR_HEIGHT, z], facing, seated: false, ...extra })
/** Sitting on something higher than a chair (a tribun step, a bar stool): the seat surface height. */
const perched = (x: number, z: number, facing: number, surface: number, label?: string, base = 0): Placement => ({ position: [x, base + surface - 0.48, z], facing, seated: true, ...(label ? { label } : {}) })

/** A desk (or a hot-desk seat) and the agent sitting there. `role` is set for company positions. */
export interface PlacedDesk { position: Vec3; spot: Placement; division: Division; role?: RoleKey; agent?: number; executive?: boolean; hot?: boolean }
/** A division's area (its sign and camera focus). */
export interface DivisionArea { division: Division; area: Rect; focus: Vec3; sign: { position: Vec3; width: number } }

const deskSpot = (x: number, z: number): Placement => spot(x, z - 0.75, 0, false)
/** The desks of each division, in the order they are handed out. */
const DESK_GRID: Record<'Engineering' | 'Creative' | 'Finance', Vec3[]> = {
  Engineering: [6.5, 9.3].flatMap((z) => [-6.2, -9.1, -12].map((x): Vec3 => [x, 0, z])),
  Creative: [-0.4, 2.2].flatMap((z) => [-9.1, -12].map((x): Vec3 => [x, 0, z])),
  Finance: [-6.1, -8.6].flatMap((z) => [-8.9, -11.8].map((x): Vec3 => [x, 0, z])),
}
const EXECUTIVE_DESK_Z = 8.6
/** Seats at the hot-desk table: four facing the street, four facing back. */
export const HOT_SEATS: Placement[] = [
  ...[0.3, 1.45, 2.6, 3.75].map((x) => spot(x, HOT_DESK[2] - 0.95, 0)),
  ...[0.3, 1.45, 2.6, 3.75].map((x) => spot(x, HOT_DESK[2] + 0.95, Math.PI)),
]
const BED_COLUMNS = [-5.2, -7.6, -10, -12.4]
const BED_ROWS = [-8.9, -5.3, -1.7]
/** The bedside table to the right of a bed's headboard. */
export const nightstandOf = ([x, y, z]: Vec3): Vec3 => [x + 0.8, y, z - 0.75]
/** Lying in a bed: feet at the foot end, head on the pillow by the headboard (-z). */
export const bedSpot = ([x, , z]: Vec3, label?: string): Placement => upstairs(x, z + 0.95, 0, { pose: 'lie', height: 0.5, ...(label ? { label } : {}) })

export const AREAS: Record<Division, Omit<DivisionArea, 'division'>> = {
  Executive: { area: ROOMS.executive, focus: [10, 0, 7.5], sign: { position: [10, 2.2, 5.1], width: 2.8 } },
  Engineering: { area: ROOMS.engineering, focus: [-8.5, 0, 7.5], sign: { position: [-9, 2.2, 5.1], width: 3.2 } },
  Creative: { area: ROOMS.creative, focus: [-9.5, 0, 0], sign: { position: [-9.5, 2.2, -2.5], width: 3 } },
  Finance: { area: ROOMS.finance, focus: [-10.2, 0, -7.5], sign: { position: [-10.2, 2.2, -4.9], width: 2.8 } },
  General: { area: ROOMS.commons, focus: [0.5, 0, 0], sign: { position: [2, 2.3, 2.4], width: 2.6 } },
}

// ---------------------------------------------------------------------------
// Where idle agents go: every division's hangout, the commons, the mushola, upstairs and outside.

/** A spot given in a stall's own coordinates (as if unrotated), placed in the world. */
function stallSpot(stall: Vec3, x: number, z: number, facing: number, seated = false): Placement {
  const cos = Math.cos(STALL_ROTATION)
  const sin = Math.sin(STALL_ROTATION)
  return spot(stall[0] + x * cos + z * sin, stall[2] - x * sin + z * cos, facing + STALL_ROTATION, seated)
}

function idleStops(beds: Vec3[]): IdleStop[] {
  const [tx, , tz] = TRIBUN
  const [lx, , lz] = LESEHAN_TABLE
  return [
    { key: 'tribun', label: 'Nongkrong di tribun', spots: [perched(tx - 0.9, tz, 0, 0.4), perched(tx + 0.8, tz, 0, 0.4), perched(tx, tz - 0.6, 0, 0.8), perched(tx - 0.8, tz - 1.2, 0, 1.2), perched(tx + 0.7, tz - 1.2, 0, 1.2)] },
    { key: 'coffee', label: 'Ngopi di coffee bar', spots: [8.6, 9.6, 10.6].map((x) => perched(x, -1.35, Math.PI, 0.75)) },
    { key: 'lounge', label: 'Santai di lounge', spots: [0.2, 1, 1.8].map((z) => spot(SOFA[0] + 0.15, z, R, true)) },
    { key: 'swing', label: 'Santai di hanging chair', spots: EGG_CHAIRS.map(([x, , z]) => perched(x, z + 0.05, 0, 0.78)) },
    { key: 'galon', label: 'Ambil air di galon', spots: [spot(12.9, -2.4, R), spot(12.8, -1.4, R, false, 'Cari camilan di kulkas')] },
    { key: 'mushola', label: 'Sholat di mushola', spots: PRAYER_RUGS.slice(1).map(([x, , z]) => ({ position: [x, 0, z] as Vec3, facing: QIBLA_FACING, seated: false, pose: 'floor' as const })) },
    { key: 'game', label: 'Main ping-pong', spots: [spot(PING_PONG[0] - 1.75, PING_PONG[2], R), spot(PING_PONG[0] + 1.75, PING_PONG[2], -R), spot(BEANBAGS[0][0], BEANBAGS[0][2], R, true, 'Main PlayStation')] },
    { key: 'arcade', label: 'Main arcade', spots: [...ARCADES.map(([x, , z]) => spot(x, z + 0.75, Math.PI)), spot(BEANBAGS[1][0], BEANBAGS[1][2], R, true, 'Main PlayStation')] },
    { key: 'carrom', label: 'Main karambol', spots: [spot(CARROM[0] - 0.8, CARROM[2], R), spot(CARROM[0] + 0.8, CARROM[2], -R)] },
    { key: 'huddle-eng', label: 'Standup di Engineering', spots: [spot(-4.6, 8.7, R), spot(-4.6, 9.7, R), spot(-4.2, 7.9, 2.2)] },
    { key: 'huddle-creative', label: 'Brainstorm di Creative studio', spots: [spot(STUDIO[0] + 0.1, STUDIO[2] - 0.45, 0, false, 'Bikin konten di studio'), spot(STUDIO[0] + 0.7, STUDIO[2] + 1.3, Math.PI), spot(-13.3, 1, -R, false, 'Lihat moodboard')] },
    { key: 'huddle-finance', label: 'Mampir ke Finance', spots: [spot(-7.3, -9.35, Math.PI, false, 'Ngeprint laporan'), spot(-10.3, -9.5, Math.PI, false, 'Cari arsip di Finance')] },
    { key: 'lobby', label: 'Duduk di lobby', spots: [spot(-2.05, 8.1, R, true), spot(-2.05, 9.1, R, true)] },
    { key: 'bakso', label: 'Makan bakso', spots: [stallSpot(BAKSO_CART, 0.5, 1.1, Math.PI, true), stallSpot(BAKSO_CART, -0.3, 1.2, Math.PI, true), stallSpot(BAKSO_CART, 1.3, 0.9, -2.4)] },
    { key: 'kopi', label: 'Ngopi di kopi keliling', spots: [stallSpot(KOPI_BIKE, -0.5, 0.85, Math.PI), stallSpot(KOPI_BIKE, 0.5, 0.85, Math.PI), stallSpot(KOPI_BIKE, 1.45, 0.3, -R)] },
    { key: 'jalan', label: 'Jalan-jalan', spots: [spot(FLAG[0] - 0.8, FLAG[2] + 0.4, R, false, 'Lihat bendera'), spot(-6, 11.4, Math.PI, false, 'Foto di depan sign Digantara')] },
    { key: 'tidur', label: 'Tidur', spots: beds.map((bed) => bedSpot(bed)) },
    { key: 'lesehan', label: 'Lesehan di atas', spots: [[-1, 0, R], [1, 0, -R], [0, -0.85, 0], [0, 0.85, Math.PI]].map(([dx, dz, facing]) => upstairs(lx + dx, lz + dz, facing, { pose: 'floor' })) },
    { key: 'terrace', label: 'Santai di rooftop', spots: [
      upstairs(RATTAN_TABLE[0] - 0.85, RATTAN_TABLE[2], R, { seated: true }),
      upstairs(RATTAN_TABLE[0] + 0.85, RATTAN_TABLE[2], -R, { seated: true }),
      upstairs(HAMMOCK[0] + 0.9, HAMMOCK[2], -R, { pose: 'lie', height: 0.62, label: 'Rebahan di hammock' }),
      upstairs(12.5, 9.9, 0, { label: 'Lihat view dari rooftop' }),
    upstairs(-1.5, 9.9, 0, { label: 'Foto-foto di rooftop' }),
    ] },
    { key: 'kebun', label: 'Siram tanaman di kebun', spots: [upstairs(-9.5, 5.5, -R), upstairs(-9.5, 2.9, 0)] },
    { key: 'nobar', label: 'Nobar di rooftop cinema', spots: CINEMA_SEATS.map(([x, , z]) => perched(x, z, Math.PI, 0.35, undefined, FLOOR_HEIGHT)) },
    { key: 'makan', label: 'Makan bareng di rooftop', spots: [
      ...[-0.9, 0.9].flatMap((dx) => [perched(PICNIC_TABLE[0] + dx, PICNIC_TABLE[2] - 0.75, 0, 0.47, undefined, FLOOR_HEIGHT), perched(PICNIC_TABLE[0] + dx, PICNIC_TABLE[2] + 0.75, Math.PI, 0.47, undefined, FLOOR_HEIGHT)]),
      upstairs(GRILL[0] - 0.75, GRILL[2], R, { label: 'Bakar sate' }),
    ] },
    { key: 'gym', label: 'Olahraga di gym', spots: [
      ...TREADMILLS.map(([x, , z]) => ({ position: [x, FLOOR_HEIGHT + 0.22, z - 0.1] as Vec3, facing: 0, seated: false, label: 'Lari di treadmill' })),
      upstairs(12.9, -7.6, R, { label: 'Angkat beban' }), upstairs(12.6, -5.3, R, { label: 'Latihan tinju' }),
      ...YOGA_MATS.map(([x, , z]) => upstairs(x, z, 0, { pose: 'floor', label: 'Yoga' })),
    ] },
    { key: 'berjemur', label: 'Berjemur di sun lounger', spots: SUN_LOUNGERS.map(([x, , z]) => upstairs(x - 0.7, z, -R, { pose: 'lie', height: 0.35 })) },
    { key: 'kolam', label: 'Kasih makan ikan koi', spots: [upstairs(FISH_POND[0], FISH_POND[2] + 1.15, Math.PI), upstairs(FISH_POND[0], FISH_POND[2] - 1.15, 0)] },
    // Sitting cross-legged on the saung's raised floor (0.45 m up).
    { key: 'saung', label: 'Ngadem di saung', spots: [[-0.5, 0, R], [0.5, -0.3, -R]].map(([dx, dz, facing]) => ({ position: [SAUNG[0] + dx, FLOOR_HEIGHT + 0.45, SAUNG[2] + dz] as Vec3, facing, seated: false, pose: 'floor' as const })) },
    { key: 'baca', label: 'Baca buku di pojok baca', spots: READING_CHAIRS.map(([x, , z]) => upstairs(x + 0.1, z, R, { seated: true })) },
    { key: 'laundry', label: 'Nyuci baju', spots: [upstairs(-6.55, 9.2, Math.PI)] },
  ]
}

/** How long an idle agent stays at one stop (walking included). */
export const IDLE_STOP_MS = 32_000
/** The tour of an idle agent: across divisions, the commons, the mushola, upstairs and outside. */
export const IDLE_ROUTE = ['coffee', 'visit', 'nobar', 'tribun', 'huddle-eng', 'lounge', 'mushola', 'gym', 'game', 'visit', 'huddle-creative', 'makan', 'bakso', 'swing', 'terrace', 'huddle-finance', 'kolam', 'arcade', 'visit', 'baca', 'galon', 'tidur', 'kopi', 'berjemur', 'lesehan', 'jalan', 'saung', 'carrom', 'visit', 'tribun', 'kebun', 'laundry', 'lobby', 'nobar']

// ---------------------------------------------------------------------------
// The layout for a crew.

export interface OfficeLayout {
  deskCount: number
  building: Rect
  /** Every desk and hot-desk seat; spare ones (no `role`) are furniture only. */
  deskInfo: PlacedDesk[]
  desks: Vec3[]
  /** The desk (index into deskInfo) of each agent, by crew index (seat - 1). */
  agentDesks: number[]
  areas: DivisionArea[]
  /** One bed per agent on lantai 2 (y = FLOOR_HEIGHT), shared when the dorm is full. */
  beds: Vec3[]
  camera: { target: Vec3; offset: Vec3 }
  /** How far the view may be panned (camera target bounds), so the office never leaves the screen. */
  pan: Rect
  idleStops: IdleStop[]
}

/**
 * Digantara Office for a crew, given each agent's position in crew order (a number means that many
 * agents without one). Every position has its desk in its division's room; a division that runs
 * out of desks, and staff, sit at the hot-desk table in the commons.
 */
export function createLayout(crew: readonly RoleKey[] | number = []): OfficeLayout {
  const roles: RoleKey[] = typeof crew === 'number' ? Array.from({ length: crew }, () => 'staff') : [...crew]
  const slots = deskSlots(roles)
  const used = new Map<Division, number>()
  const executives = slots.filter((slot) => slot.division === 'Executive').length
  let hotUsed = 0
  const deskInfo: PlacedDesk[] = []
  for (const slot of slots) {
    const index = used.get(slot.division) ?? 0
    const base = { division: slot.division, role: slot.role, ...(slot.agent !== undefined ? { agent: slot.agent } : {}) }
    if (slot.division === 'Executive' && index < 2) {
      // One CEO sits in the middle of the suite; two share it side by side.
      const x = executives > 1 ? [8.3, 11.4][index] : 10
      deskInfo.push({ ...base, position: [x, 0, EXECUTIVE_DESK_Z], spot: deskSpot(x, EXECUTIVE_DESK_Z), executive: true })
    } else if (slot.division !== 'Executive' && slot.division !== 'General' && index < DESK_GRID[slot.division].length) {
      const [x, , z] = DESK_GRID[slot.division][index]
      deskInfo.push({ ...base, position: [x, 0, z], spot: deskSpot(x, z) })
    } else {
      // Staff, and anyone whose room is full: the hot-desk table (shared when it is full too).
      const seat = HOT_SEATS[hotUsed % HOT_SEATS.length]
      hotUsed += 1
      deskInfo.push({ ...base, position: seat.position, spot: seat, hot: true })
      continue
    }
    used.set(slot.division, index + 1)
  }
  // Spare desks stay in each room, so the divisions look furnished and can grow.
  for (const division of ['Engineering', 'Creative', 'Finance'] as const) {
    for (const [x, , z] of DESK_GRID[division].slice(used.get(division) ?? 0)) deskInfo.push({ position: [x, 0, z], spot: deskSpot(x, z), division })
  }
  const agentDesks = roles.map((_, agent) => deskInfo.findIndex((desk) => desk.agent === agent))
  const divisions = new Set(deskInfo.filter((desk) => desk.role).map((desk) => desk.division))
  if (hotUsed > 0) divisions.add('General')
  const areas = (['Executive', 'Engineering', 'Creative', 'Finance', 'General'] as Division[]).filter((division) => divisions.has(division)).map((division) => ({ division, ...AREAS[division] }))
  const bedPlaces = BED_ROWS.flatMap((z) => BED_COLUMNS.map((x): Vec3 => [x, FLOOR_HEIGHT, z]))
  const beds = Array.from({ length: Math.min(Math.max(1, roles.length), bedPlaces.length) }, (_, index) => bedPlaces[index])
  return {
    deskCount: deskInfo.length, building: BUILDING, deskInfo, desks: deskInfo.map((desk) => desk.position), agentDesks, areas, beds,
    camera: { target: [0, 0.6, 0.8], offset: [-4.6, 22, 25] },
    pan: rect(-18, 18, -11, 14),
    idleStops: idleStops(beds),
  }
}

const MEETING_SEATS: Placement[] = [
  ...[0.5, 1.6, 2.8, 3.9].map((x) => spot(x, MEETING_TABLE[2] - 0.95, 0)),
  ...[0.5, 1.6, 2.8, 3.9].map((x) => spot(x, MEETING_TABLE[2] + 0.95, Math.PI)),
  // More than eight: standing round the table.
  spot(-0.4, MEETING_TABLE[2], R), spot(4.8, MEETING_TABLE[2], -R), spot(1.6, MEETING_TABLE[2] - 1.9, 0), spot(2.8, MEETING_TABLE[2] - 1.9, 0),
]
/** Chairs drawn round the meeting table (the seated places). */
export const MEETING_CHAIRS = MEETING_SEATS.slice(0, 8)

/** The n-th place at the meeting table in the Ruang Meeting (0-based). */
export function meetingSeat(index: number): Placement {
  return MEETING_SEATS[index % MEETING_SEATS.length]
}

/** Where an agent stands beside a colleague's desk to talk to them. */
export function visitSpot(desk: PlacedDesk, label?: string): Placement {
  const { position: [x, y, z], facing } = desk.spot
  // To the colleague's side, a little behind, turned towards their screen.
  const side = 0.85
  return { position: [x + Math.cos(facing) * side, y, z - Math.sin(facing) * side - Math.cos(facing) * 0.25], facing: facing - 0.6, seated: false, ...(label ? { label } : {}) }
}

/**
 * Where a station stands: its own desk (the desk of its position), a place at the meeting table
 * (`meetingIndex` counts the agents already there), or a lounge seat.
 */
export function placementFor(station: OfficeStation, layout: OfficeLayout = DEFAULT_LAYOUT, meetingIndex = 0): Placement {
  const seat = Math.max(station.seat, 1) - 1
  if (station.room === 'Lounge') {
    const sofa = layout.idleStops.find((stop) => stop.key === 'lounge')!.spots
    return sofa[seat % sofa.length]
  }
  if (station.roomPosition === 'meeting-area') return meetingSeat(meetingIndex)
  const desk = layout.deskInfo[layout.agentDesks[seat] ?? -1] ?? layout.deskInfo[seat % layout.deskInfo.length]
  return { ...desk.spot, seated: station.state === 'Working' || station.state === 'Reviewing' }
}

// ---------------------------------------------------------------------------
// Idle wandering (decorative only, deterministic in the clock and the seats).

export interface IdleAssignment { stop: IdleStop; placement: Placement }

/**
 * Where each idle agent is at a given time: each seat starts at a different point of the route,
 * and an agent whose stop is full (or has no spots, like `visit` when nobody is at a desk) moves on
 * along the route, so nobody shares a spot while free ones remain. `visits` are the places beside
 * busy colleagues; `sleepers` stay in bed.
 */
export function idlePlan(seats: number[], time: number, layout: OfficeLayout = DEFAULT_LAYOUT, sleepers: number[] = [], visits: Placement[] = []): Map<number, IdleAssignment> {
  const plan = new Map<number, IdleAssignment>()
  const taken = new Map<string, number>()
  const step = Math.floor(time / IDLE_STOP_MS)
  const stops = [...layout.idleStops, { key: 'visit', label: 'Diskusi dengan rekan', spots: visits }]
  const stopAt = (index: number) => stops.find((item) => item.key === IDLE_ROUTE[index % IDLE_ROUTE.length])!
  const beds = stops.find((item) => item.key === 'tidur')!
  for (const seat of [...sleepers].sort((a, b) => a - b)) {
    const count = taken.get('tidur') ?? 0
    taken.set('tidur', count + 1)
    plan.set(seat, { stop: beds, placement: beds.spots[count % beds.spots.length] })
  }
  for (const seat of [...seats].filter((item) => !plan.has(item)).sort((a, b) => a - b)) {
    const start = step + (Math.max(seat, 1) - 1) * 3
    let stop = stopAt(start)
    for (let offset = 0; offset < IDLE_ROUTE.length; offset += 1) {
      const candidate = stopAt(start + offset)
      if ((taken.get(candidate.key) ?? 0) < candidate.spots.length) { stop = candidate; break }
    }
    if (stop.spots.length === 0) stop = stops[0]
    const count = taken.get(stop.key) ?? 0
    taken.set(stop.key, count + 1)
    plan.set(seat, { stop, placement: stop.spots[count % stop.spots.length] })
  }
  return plan
}

/** One idle agent on its own. */
export function idleStop(seat: number, time: number, layout: OfficeLayout = DEFAULT_LAYOUT): IdleAssignment {
  return idlePlan([seat], time, layout).get(seat)!
}

/** Keeps a panned camera target inside the office grounds. */
export function clampTarget(x: number, z: number, bounds: Rect = DEFAULT_LAYOUT.pan): [number, number] {
  return [Math.min(Math.max(x, bounds.minX), bounds.maxX), Math.min(Math.max(z, bounds.minZ), bounds.maxZ)]
}

// ---------------------------------------------------------------------------
// Path finding: A* on a walkability grid per floor.

const CELL = 0.2
/** How far agents keep from walls and furniture (about their half width). */
export const CLEARANCE = 0.25
const WALL_THICKNESS = 0.25
const GRID_BOUNDS: Record<Floor, Rect> = { 1: rect(-19.5, 20, -12.5, 13.6), 2: BUILDING }

/** The ground an item covers, as an axis-aligned rectangle (rotations are quarter turns). */
export function footprint(item: Pick<Item, 'at' | 'size' | 'rotation'>): Rect {
  const [w, d] = item.size ?? [0, 0]
  const quarter = Math.abs(Math.round((item.rotation ?? 0) / R)) % 2 === 1
  const [hx, hz] = quarter ? [d / 2, w / 2] : [w / 2, d / 2]
  return rect(item.at[0] - hx, item.at[0] + hx, item.at[2] - hz, item.at[2] + hz)
}
export function wallRect(spec: WallSpec): Rect {
  const half = WALL_THICKNESS / 2
  return rect(Math.min(spec.from[0], spec.to[0]) - half, Math.max(spec.from[0], spec.to[0]) + half, Math.min(spec.from[1], spec.to[1]) - half, Math.max(spec.from[1], spec.to[1]) + half)
}
export const DESK_SIZE: [number, number] = [1.9, 0.95]
export const EXECUTIVE_DESK_SIZE: [number, number] = [2.3, 1.05]
const BED_SIZE: [number, number] = [1.05, 2.05]

/** Everything that blocks walking on a floor, before clearance. */
export function obstacles(layout: OfficeLayout, floor: Floor): Rect[] {
  const blocks = [...WALLS[floor].map(wallRect), ...ITEMS[floor].filter((item) => item.solid).map(footprint)]
  if (floor === 1) {
    for (const desk of layout.deskInfo) if (!desk.hot) blocks.push(footprint({ at: desk.position, size: desk.executive ? EXECUTIVE_DESK_SIZE : DESK_SIZE }))
    // The road
    blocks.push(rect(-30, 30, 13.6, 30))
  } else {
    for (const bed of layout.beds) blocks.push(footprint({ at: bed, size: BED_SIZE }), footprint({ at: nightstandOf(bed), size: [0.4, 0.4] }))
    // The open stairwell
    blocks.push(rect(STAIRS.highX, STAIRS.lowX, STAIRS.z - STAIRS.width / 2, BUILDING.maxZ))
  }
  return blocks
}

interface Grid { bounds: Rect; cols: number; rows: number; blocked: Uint8Array; walls: Uint8Array }
const grids = new WeakMap<OfficeLayout, Partial<Record<Floor, Grid>>>()

function rasterize(target: Uint8Array, bounds: Rect, cols: number, rows: number, area: Rect, grow: number) {
  const c0 = Math.max(0, Math.floor((area.minX - grow - bounds.minX) / CELL))
  const c1 = Math.min(cols - 1, Math.floor((area.maxX + grow - bounds.minX) / CELL))
  const r0 = Math.max(0, Math.floor((area.minZ - grow - bounds.minZ) / CELL))
  const r1 = Math.min(rows - 1, Math.floor((area.maxZ + grow - bounds.minZ) / CELL))
  for (let row = r0; row <= r1; row += 1) for (let col = c0; col <= c1; col += 1) target[row * cols + col] = 1
}

function gridFor(layout: OfficeLayout, floor: Floor): Grid {
  const cached = grids.get(layout)?.[floor]
  if (cached) return cached
  const bounds = GRID_BOUNDS[floor]
  const cols = Math.ceil((bounds.maxX - bounds.minX) / CELL)
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / CELL)
  const blocked = new Uint8Array(cols * rows)
  const walls = new Uint8Array(cols * rows)
  for (const area of obstacles(layout, floor)) rasterize(blocked, bounds, cols, rows, area, CLEARANCE)
  for (const spec of WALLS[floor]) rasterize(walls, bounds, cols, rows, wallRect(spec), 0)
  // The edge of the grid is a wall too.
  for (let col = 0; col < cols; col += 1) { blocked[col] = 1; blocked[(rows - 1) * cols + col] = 1 }
  for (let row = 0; row < rows; row += 1) { blocked[row * cols] = 1; blocked[row * cols + cols - 1] = 1 }
  const grid = { bounds, cols, rows, blocked, walls }
  grids.set(layout, { ...grids.get(layout), [floor]: grid })
  return grid
}

const cellOf = (grid: Grid, [x, z]: [number, number]): [number, number] => [
  Math.min(grid.cols - 1, Math.max(0, Math.floor((x - grid.bounds.minX) / CELL))),
  Math.min(grid.rows - 1, Math.max(0, Math.floor((z - grid.bounds.minZ) / CELL))),
]
const centerOf = (grid: Grid, col: number, row: number): [number, number] => [grid.bounds.minX + (col + 0.5) * CELL, grid.bounds.minZ + (row + 0.5) * CELL]
const free = (grid: Grid, col: number, row: number) => col >= 0 && row >= 0 && col < grid.cols && row < grid.rows && !grid.blocked[row * grid.cols + col]

/** The nearest walkable cell to a spot that is in or next to furniture, without going through a wall. */
function nearestFree(grid: Grid, start: [number, number]): [number, number] {
  if (free(grid, ...start)) return start
  const seen = new Set([start[1] * grid.cols + start[0]])
  const queue: [number, number][] = [start]
  for (let head = 0; head < queue.length && head < 4000; head += 1) {
    const [col, row] = queue[head]
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next: [number, number] = [col + dc, row + dr]
      const key = next[1] * grid.cols + next[0]
      if (next[0] < 0 || next[1] < 0 || next[0] >= grid.cols || next[1] >= grid.rows || seen.has(key) || grid.walls[key]) continue
      if (free(grid, ...next)) return next
      seen.add(key)
      queue.push(next)
    }
  }
  return start
}

/** Whether a straight walk between two cells stays on walkable cells. */
function clear(grid: Grid, a: [number, number], b: [number, number]): boolean {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 3)
  for (let step = 0; step <= steps; step += 1) {
    const col = Math.round(a[0] + ((b[0] - a[0]) * step) / Math.max(steps, 1))
    const row = Math.round(a[1] + ((b[1] - a[1]) * step) / Math.max(steps, 1))
    if (!free(grid, col, row)) return false
  }
  return true
}

/** A* from one cell to another (8 neighbours, no cutting corners), then smoothed by line of sight. */
function search(grid: Grid, start: [number, number], goal: [number, number]): [number, number][] {
  const { cols } = grid
  const startKey = start[1] * cols + start[0]
  const goalKey = goal[1] * cols + goal[0]
  if (startKey === goalKey) return [start]
  const cost = new Float32Array(grid.cols * grid.rows).fill(Infinity)
  const from = new Int32Array(grid.cols * grid.rows).fill(-1)
  const closed = new Uint8Array(grid.cols * grid.rows)
  const heap: [number, number][] = []
  const push = (key: number, priority: number) => {
    heap.push([priority, key])
    for (let index = heap.length - 1; index > 0;) {
      const parent = (index - 1) >> 1
      if (heap[parent][0] <= heap[index][0]) break
      ;[heap[parent], heap[index]] = [heap[index], heap[parent]]
      index = parent
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()!
    if (heap.length > 0) {
      heap[0] = last
      for (let index = 0; ;) {
        const left = index * 2 + 1
        const right = left + 1
        let smallest = index
        if (left < heap.length && heap[left][0] < heap[smallest][0]) smallest = left
        if (right < heap.length && heap[right][0] < heap[smallest][0]) smallest = right
        if (smallest === index) break
        ;[heap[smallest], heap[index]] = [heap[index], heap[smallest]]
        index = smallest
      }
    }
    return top
  }
  const heuristic = (key: number) => {
    const dc = Math.abs((key % cols) - goal[0])
    const dr = Math.abs(Math.floor(key / cols) - goal[1])
    return Math.max(dc, dr) + (Math.SQRT2 - 1) * Math.min(dc, dr)
  }
  cost[startKey] = 0
  push(startKey, heuristic(startKey))
  while (heap.length > 0) {
    const [, key] = pop()
    if (closed[key]) continue
    closed[key] = 1
    if (key === goalKey) break
    const col = key % cols
    const row = Math.floor(key / cols)
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (!dc && !dr) continue
        const nc = col + dc
        const nr = row + dr
        if (!free(grid, nc, nr) && !(nc === goal[0] && nr === goal[1])) continue
        if (dc && dr && (!free(grid, col + dc, row) || !free(grid, col, row + dr))) continue
        const next = nr * cols + nc
        const total = cost[key] + (dc && dr ? Math.SQRT2 : 1)
        if (total < cost[next]) {
          cost[next] = total
          from[next] = key
          push(next, total + heuristic(next))
        }
      }
    }
  }
  if (from[goalKey] < 0) return [start, goal]
  const cells: [number, number][] = []
  for (let key = goalKey; key !== -1; key = from[key]) cells.push([key % cols, Math.floor(key / cols)])
  cells.reverse()
  // Keep only the turns: from each kept cell, jump to the farthest cell still in plain sight.
  const smooth: [number, number][] = [cells[0]]
  let anchor = 0
  while (anchor < cells.length - 1) {
    let next = anchor + 1
    for (let probe = cells.length - 1; probe > anchor + 1; probe -= 1) if (clear(grid, cells[anchor], cells[probe])) { next = probe; break }
    smooth.push(cells[next])
    anchor = next
  }
  return smooth
}

function routeOn(layout: OfficeLayout, floor: Floor, from: [number, number], to: [number, number]): [number, number][] {
  if (Math.hypot(to[0] - from[0], to[1] - from[1]) < 0.3) return [to]
  const grid = gridFor(layout, floor)
  const start = nearestFree(grid, cellOf(grid, from))
  const goal = nearestFree(grid, cellOf(grid, to))
  const points = search(grid, start, goal).map(([col, row]) => centerOf(grid, col, row))
  // Where the agent stands is implied; the last point is the exact spot.
  const path = points.slice(1)
  if (path.length > 0 && Math.hypot(path[path.length - 1][0] - to[0], path[path.length - 1][1] - to[1]) <= 0.15) path[path.length - 1] = to
  else path.push(to)
  return path
}

/** Waypoints on lantai 1 from one spot to another; the last point is always the destination. */
export function walkPath(from: [number, number], to: [number, number], layout: OfficeLayout = DEFAULT_LAYOUT): [number, number][] {
  return routeOn(layout, 1, from, to)
}

/**
 * Waypoints between any two spots, on either floor (y is the floor height). Changing floors goes
 * by the stairs in the lobby: to the foot (or head) of the stairs, up (or down) them, and on.
 */
export function walkPath3(from: Vec3, to: Vec3, layout: OfficeLayout = DEFAULT_LAYOUT): Vec3[] {
  const flat = ([x, , z]: Vec3): [number, number] => [x, z]
  const at = (y: number) => ([x, z]: [number, number]): Vec3 => [x, y, z]
  const fromFloor = floorOf(from)
  const toFloor = floorOf(to)
  const level = (floor: Floor) => (floor === 1 ? 0 : FLOOR_HEIGHT)
  if (fromFloor === toFloor) return routeOn(layout, fromFloor, flat(from), flat(to)).map(at(level(fromFloor))).map((point, index, all) => index === all.length - 1 ? to : point)
  const up = fromFloor === 1
  const stairs: Vec3[] = [[STAIRS.lowX, 0, STAIRS.z], [STAIRS.highX, FLOOR_HEIGHT, STAIRS.z]]
  return [
    ...routeOn(layout, fromFloor, flat(from), up ? STAIRS_FOOT : STAIRS_HEAD).map(at(level(fromFloor))),
    ...(up ? stairs : [...stairs].reverse()),
    ...routeOn(layout, toFloor, up ? STAIRS_HEAD : STAIRS_FOOT, flat(to)).map(at(level(toFloor))).slice(0, -1),
    to,
  ]
}

/** Whether a spot is outside the building (from lantai 2 those agents stay in view). */
export const outdoors = (x: number, z: number) => !inside(BUILDING, x, z)

/** The office with every position vacant, for callers that do not know the crew. */
export const DEFAULT_LAYOUT = createLayout()
export const PAN_BOUNDS = DEFAULT_LAYOUT.pan
export const IDLE_STOPS = DEFAULT_LAYOUT.idleStops
