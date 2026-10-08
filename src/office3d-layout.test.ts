import { describe, expect, it } from 'vitest'
import {
  nightstandOf, UPPER_ROOMS, BUILDING, DESK_SIZE, ENTRANCE, FLOOR_HEIGHT, HOT_SEATS, IDLE_ROUTE, IDLE_STOP_MS, ITEMS, MEETING_TABLE, PAN_BOUNDS, PRAYER_RUGS, QIBLA_FACING, ROOMS, STAIRS, WALLS,
  clampTarget, createLayout, floorOf, footprint, idlePlan, idleStop, inside, meetingSeat, obstacles, placementFor, visitSpot, walkPath, walkPath3, wallRect, type Rect, type Vec3,
} from './office3d-layout.ts'
import type { RoleKey } from './org.ts'
import type { OfficeStation } from './types.ts'

const station = (overrides: Partial<OfficeStation>): OfficeStation => ({
  id: 'default', name: 'default', role: 'Hermes profile', room: 'Workspace', roomPosition: 'assigned-desk',
  state: 'Working', currentTask: '', recentActivity: '', activity: '', seat: 1, provenance: '', freshness: '', ...overrides,
})

/** The full company: one agent in every position, in this order (crew index = seat - 1). */
const COMPANY_CREW: RoleKey[] = ['ceo', 'tech-lead', 'frontend', 'backend', 'designer', 'content', 'admin-finance', 'accounting']
const company = createLayout(COMPANY_CREW)
const flat = ([x, , z]: Vec3): [number, number] => [x, z]
const within = (area: Rect, [x, z]: [number, number], margin = 0) => x > area.minX + margin && x < area.maxX - margin && z > area.minZ + margin && z < area.maxZ - margin

/** Every point along a path, 10 cm apart, grouped by segment. */
function along(from: [number, number], path: [number, number][]): [number, number][][] {
  const segments: [number, number][][] = []
  let previous = from
  for (const point of path) {
    const steps = Math.max(1, Math.ceil(Math.hypot(point[0] - previous[0], point[1] - previous[1]) / 0.1))
    segments.push(Array.from({ length: steps }, (_, step): [number, number] => [previous[0] + ((point[0] - previous[0]) * (step + 1)) / steps, previous[1] + ((point[1] - previous[1]) * (step + 1)) / steps]))
    previous = point
  }
  return segments
}

/** Points of a walk inside furniture or a wall, ignoring the first and last step (getting up, sitting down). */
function collisions(from: [number, number], path: [number, number][], blocks: Rect[]): [number, number][] {
  return along(from, path).slice(1, -1).flat().filter((point) => blocks.some((block) => within(block, point, 0.02)))
}

/** Every spot an agent can be sent to on lantai 1. */
const groundSpots = (): [number, number][] => [
  ...company.deskInfo.map((desk) => flat(desk.spot.position)),
  ...Array.from({ length: 8 }, (_, index) => flat(meetingSeat(index).position)),
  ...company.idleStops.flatMap((stop) => stop.spots).filter((spot) => floorOf(spot.position) === 1).map((spot) => flat(spot.position)),
]

describe('Digantara Office building', () => {
  it('is close to square, not a long strip, with a mushola, a meeting room and a commons', () => {
    const width = BUILDING.maxX - BUILDING.minX
    const depth = BUILDING.maxZ - BUILDING.minZ
    expect(width / depth).toBeLessThan(1.5)
    for (const room of ['mushola', 'meeting', 'commons', 'game', 'lounge', 'lobby', 'executive', 'engineering', 'creative', 'finance'] as const) expect(ROOMS[room]).toBeDefined()
    expect(within(ROOMS.meeting, flat(MEETING_TABLE))).toBe(true)
  })

  it('lays the prayer rugs in the mushola facing the qibla (west-north-west)', () => {
    for (const rug of PRAYER_RUGS) expect(within(ROOMS.mushola, flat(rug))).toBe(true)
    // Facing 0 looks south (+z), π/2 east: the qibla looks mostly west (-x) and a little north (-z).
    expect(Math.sin(QIBLA_FACING)).toBeLessThan(-0.85)
    expect(Math.cos(QIBLA_FACING)).toBeLessThan(0)
    const mushola = company.idleStops.find((stop) => stop.key === 'mushola')!
    for (const spot of mushola.spots) expect(spot).toMatchObject({ facing: QIBLA_FACING, pose: 'floor' })
  })

  it('never puts two pieces of furniture or desks on top of each other', () => {
    const pieces = [...ITEMS[1].filter((item) => item.solid).map(footprint), ...company.deskInfo.filter((desk) => !desk.hot).map((desk) => footprint({ at: desk.position, size: DESK_SIZE }))]
    const overlap = (a: Rect, b: Rect) => a.minX < b.maxX - 0.01 && b.minX < a.maxX - 0.01 && a.minZ < b.maxZ - 0.01 && b.minZ < a.maxZ - 0.01
    for (let a = 0; a < pieces.length; a += 1) for (let b = a + 1; b < pieces.length; b += 1) expect([a, b, overlap(pieces[a], pieces[b])]).toEqual([a, b, false])
  })
})

describe('lantai 2', () => {
  it('has a dorm, lesehan with a reading corner, a gym, a rooftop cinema, makan bareng, a koi pond and a saung', () => {
    const kinds = new Set(ITEMS[2].map((item) => item.kind))
    for (const kind of ['projectorScreen', 'picnicTable', 'grill', 'pergola', 'treadmill', 'dumbbellRack', 'fishPond', 'saung', 'washingMachine', 'sunLounger', 'armchair', 'hammock', 'planter'] as const) expect(kinds).toContain(kind)
    for (const key of ['nobar', 'makan', 'gym', 'berjemur', 'kolam', 'saung', 'baca', 'laundry', 'tidur', 'lesehan', 'terrace', 'kebun']) expect(company.idleStops.find((stop) => stop.key === key)?.spots.length).toBeGreaterThan(0)
    for (const [x, , z] of ITEMS[2].filter((item) => item.kind === 'treadmill').map((item) => item.at)) expect(within(UPPER_ROOMS.gym, [x, z])).toBe(true)
    for (const bed of company.beds) expect(within(UPPER_ROOMS.dorm, flat(bed))).toBe(true)
  })

  it('never puts two pieces of furniture, beds or bedside tables on top of each other', () => {
    const layout = createLayout(12)
    const pieces = [...ITEMS[2].filter((item) => item.solid).map(footprint), ...layout.beds.flatMap((bed) => [footprint({ at: bed, size: [1.05, 2.05] }), footprint({ at: nightstandOf(bed), size: [0.4, 0.4] })])]
    const overlap = (a: Rect, b: Rect) => a.minX < b.maxX - 0.01 && b.minX < a.maxX - 0.01 && a.minZ < b.maxZ - 0.01 && b.minZ < a.maxZ - 0.01
    for (let a = 0; a < pieces.length; a += 1) for (let b = a + 1; b < pieces.length; b += 1) expect([a, b, overlap(pieces[a], pieces[b])]).toEqual([a, b, false])
  })
})

describe('desks by position', () => {
  it('gives every position a desk in its division\'s room, the CEO in the executive suite', () => {
    const rooms: Record<string, Rect> = { Executive: ROOMS.executive, Engineering: ROOMS.engineering, Creative: ROOMS.creative, Finance: ROOMS.finance }
    for (const [agent, role] of COMPANY_CREW.entries()) {
      const desk = company.deskInfo[company.agentDesks[agent]]
      expect(desk.role).toBe(role)
      expect(desk.hot).toBeUndefined()
      expect(within(rooms[desk.division], flat(desk.position))).toBe(true)
    }
    expect(company.deskInfo[company.agentDesks[0]].executive).toBe(true)
    expect(company.areas.map((area) => area.division)).toEqual(['Executive', 'Engineering', 'Creative', 'Finance'])
  })

  it('keeps vacant positions and spare desks, and seats staff and overflow at the hot-desk table', () => {
    const empty = createLayout()
    expect(empty.deskInfo.filter((desk) => desk.role).map((desk) => desk.role)).toEqual(COMPANY_CREW)
    expect(empty.deskInfo.every((desk) => desk.agent === undefined)).toBe(true)
    const crew: RoleKey[] = [...COMPANY_CREW, 'backend', 'frontend', 'backend', 'backend', 'staff', 'staff']
    const big = createLayout(crew)
    expect(new Set(big.agentDesks).size).toBe(crew.length)
    // Engineering has six desks: the seventh engineer and the staff take hot desks in the commons.
    const engineers = crew.map((role, agent) => [role, big.deskInfo[big.agentDesks[agent]]] as const).filter(([role]) => ['tech-lead', 'frontend', 'backend'].includes(role))
    expect(engineers.filter(([, desk]) => !desk.hot)).toHaveLength(6)
    expect(engineers.filter(([, desk]) => desk.hot)).toHaveLength(1)
    for (const agent of [12, 13]) expect(big.deskInfo[big.agentDesks[agent]]).toMatchObject({ hot: true, role: 'staff' })
    expect(big.areas.map((area) => area.division)).toContain('General')
    expect(createLayout(3).deskInfo.filter((desk) => desk.agent !== undefined).every((desk) => desk.hot)).toBe(true)
    for (const seat of HOT_SEATS) expect(within(ROOMS.commons, flat(seat.position))).toBe(true)
  })

  it('puts working agents at their own desk seated, collaborators in the meeting room', () => {
    const backend = placementFor(station({ seat: 4, state: 'Working' }), company)
    expect(backend.position).toEqual(company.deskInfo[company.agentDesks[3]].spot.position)
    expect(backend.seated).toBe(true)
    expect(placementFor(station({ state: 'Unknown', roomPosition: 'neutral-presence', seat: 4 }), company).seated).toBe(false)
    expect(placementFor(station({ state: 'Collaborating', roomPosition: 'meeting-area', seat: 3 }), company, 2).position).toEqual(meetingSeat(2).position)
    for (let index = 0; index < 12; index += 1) expect(within(ROOMS.meeting, flat(meetingSeat(index).position))).toBe(true)
    expect(new Set(Array.from({ length: 12 }, (_, index) => meetingSeat(index).position.join(','))).size).toBe(12)
    expect(placementFor(station({ state: 'Idle', room: 'Lounge', roomPosition: 'lounge-seat-2', seat: 2 }), company).seated).toBe(true)
    // A seat the layout does not know (an older snapshot) still lands at a desk.
    expect(placementFor(station({ seat: 40 }), company).position).toBeDefined()
  })
})

describe('walking', () => {
  const blocks = obstacles(company, 1)

  it('reaches every desk, seat and hangout from the lobby without walking through walls or furniture', () => {
    const lobby: [number, number] = [0.5, 8]
    for (const spot of groundSpots()) {
      const path = walkPath(lobby, spot, company)
      expect(path.at(-1)).toEqual(spot)
      expect([spot, collisions(lobby, path, blocks)]).toEqual([spot, []])
    }
  }, 30_000)

  it('walks between divisions along the corridors and the commons', () => {
    const spots = company.deskInfo.filter((desk) => desk.role && !desk.hot).map((desk) => flat(desk.spot.position))
    for (const from of spots) for (const to of spots) expect([from, to, collisions(from, walkPath(from, to, company), blocks)]).toEqual([from, to, []])
    // Engineering to Finance passes through both corridors.
    const engineer = flat(company.deskInfo[company.agentDesks[1]].spot.position)
    const finance = flat(company.deskInfo[company.agentDesks[6]].spot.position)
    const path = along(engineer, walkPath(engineer, finance, company)).flat()
    expect(path.some(([, z]) => z > 3 && z < 4.6)).toBe(true)
    expect(path.some(([, z]) => z > -4.5 && z < -2.9)).toBe(true)
  }, 30_000)

  it('leaves and enters the building only through the entrance', () => {
    const bakso = company.idleStops.find((stop) => stop.key === 'bakso')!.spots[0].position
    for (const [from, to] of [[flat(company.deskInfo[0].spot.position), flat(bakso)], [flat(bakso), flat(meetingSeat(0).position)]] as [[number, number], [number, number]][]) {
      expect(walkPath(from, to, company).at(-1)).toEqual(to)
      const points = along(from, walkPath(from, to, company)).flat()
      let previous = from
      for (const point of points) {
        // Crossing the front of the building (not the gang beside it) only happens at the entrance.
        if ((previous[1] - BUILDING.maxZ) * (point[1] - BUILDING.maxZ) < 0 && point[0] > BUILDING.minX && point[0] < BUILDING.maxX) expect(point[0] > ENTRANCE.fromX && point[0] < ENTRANCE.toX).toBe(true)
        expect((previous[0] - BUILDING.minX) * (point[0] - BUILDING.minX) < 0 && point[1] < BUILDING.maxZ).toBe(false)
        previous = point
      }
    }
  })

  it('goes up and down by the stairs in the lobby, in order', () => {
    const desk = company.deskInfo[company.agentDesks[2]].spot.position
    const bed = company.beds[0]
    const up = walkPath3(desk, bed, company)
    const foot = up.findIndex(([x, y]) => x === STAIRS.lowX && y === 0)
    const head = up.findIndex(([x, y]) => x === STAIRS.highX && y === FLOOR_HEIGHT)
    expect(foot).toBeGreaterThan(-1)
    expect(head).toBe(foot + 1)
    expect(up.slice(0, foot + 1).every(([, y]) => y === 0)).toBe(true)
    expect(up.slice(head).every(([, y]) => y === FLOOR_HEIGHT)).toBe(true)
    expect(up.at(-1)).toBe(bed)
    const down = walkPath3(bed, desk, company)
    expect(down.findIndex(([x, y]) => x === STAIRS.highX && y === FLOOR_HEIGHT)).toBe(down.findIndex(([x, y]) => x === STAIRS.lowX && y === 0) - 1)
    // Upstairs, nobody walks through the walls, the beds or the planters.
    const upper = obstacles(company, 2)
    const head2: [number, number] = [STAIRS.highX - 0.6, STAIRS.z]
    for (const spot of company.idleStops.flatMap((stop) => stop.spots).filter((item) => floorOf(item.position) === 2)) {
      const path = walkPath3([head2[0], FLOOR_HEIGHT, head2[1]], spot.position, company).map(flat)
      expect([spot.position, collisions(head2, path, upper)]).toEqual([spot.position, []])
    }
  }, 30_000)

  it('keeps the walls in the building and the panned view in the grounds', () => {
    for (const spec of WALLS[1]) expect(inside(BUILDING, (spec.from[0] + spec.to[0]) / 2, (spec.from[1] + spec.to[1]) / 2, 0.2)).toBe(true)
    expect(wallRect(WALLS[1][0]).minZ).toBeLessThan(BUILDING.minZ)
    expect(clampTarget(100, -100)).toEqual([PAN_BOUNDS.maxX, PAN_BOUNDS.minZ])
    expect(clampTarget(1, 2)).toEqual([1, 2])
  })
})

describe('idle agents', () => {
  it('rotate across every hangout over time', () => {
    const seen = new Set<string>()
    for (let step = 0; step < IDLE_ROUTE.length; step += 1) seen.add(idleStop(1, step * IDLE_STOP_MS, company).stop.key)
    expect(seen).toEqual(new Set(company.idleStops.map((stop) => stop.key)))
    expect(idleStop(1, 5, company)).toEqual(idleStop(1, IDLE_STOP_MS - 1, company))
  })

  it('never share a spot while free ones remain, and sleepers stay in bed', () => {
    const seats = Array.from({ length: 12 }, (_, index) => index + 1)
    for (let step = 0; step < IDLE_ROUTE.length; step += 1) {
      const plan = idlePlan(seats, step * IDLE_STOP_MS, createLayout(12), [2, 5])
      expect(new Set(seats.map((seat) => plan.get(seat)!.placement.position.join(','))).size).toBe(12)
      for (const seat of [2, 5]) expect(plan.get(seat)!.stop.key).toBe('tidur')
    }
  })

  it('visit busy colleagues at their desks, beside them rather than on the desk', () => {
    const desk = company.deskInfo[company.agentDesks[3]]
    const visit = visitSpot(desk, 'Diskusi dengan backend')
    expect(Math.hypot(visit.position[0] - desk.spot.position[0], visit.position[2] - desk.spot.position[2])).toBeLessThan(1.2)
    expect(within(footprint({ at: desk.position, size: DESK_SIZE }), flat(visit.position))).toBe(false)
    const visitStep = IDLE_ROUTE.indexOf('visit')
    const plan = idlePlan([1], visitStep * IDLE_STOP_MS, company, [], [visit])
    expect(plan.get(1)!.stop.key).toBe('visit')
    expect(plan.get(1)!.placement.label).toBe('Diskusi dengan backend')
    // With nobody at a desk, the visit is skipped for the next stop on the route.
    expect(idlePlan([1], visitStep * IDLE_STOP_MS, company).get(1)!.stop.key).not.toBe('visit')
  })
})
