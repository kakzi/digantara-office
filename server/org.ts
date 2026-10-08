import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { AccessError, accessConfigDir } from './access.js'
import type { OfficeSnapshot } from './mission-control.js'

// Digantara Office: the company structure the office is laid out by. Every agent holds one
// position (CEO, Tech Lead, Frontend Developer, ...) in a division, which decides where its desk
// is. The position is read from the agent's name (a profile called `backend` is the Backend
// Developer) unless the owner assigned one in the office; assignments live in Ruang's own config
// (org.json), never in Hermes. Must match the role keys in src/org.ts.

export const ROLES = ['ceo', 'tech-lead', 'frontend', 'backend', 'designer', 'content', 'admin-finance', 'accounting', 'staff'] as const
export type RoleKey = typeof ROLES[number]
export type Division = 'Executive' | 'Engineering' | 'Creative' | 'Finance' | 'General'
export const ROLE_INFO: Record<RoleKey, { title: string; division: Division }> = {
  ceo: { title: 'CEO', division: 'Executive' },
  'tech-lead': { title: 'Tech Lead', division: 'Engineering' },
  frontend: { title: 'Frontend Developer', division: 'Engineering' },
  backend: { title: 'Backend Developer', division: 'Engineering' },
  designer: { title: 'UI/UX Designer', division: 'Creative' },
  content: { title: 'Content Creator', division: 'Creative' },
  'admin-finance': { title: 'Admin Finance', division: 'Finance' },
  accounting: { title: 'Senior Accounting', division: 'Finance' },
  staff: { title: 'Staff', division: 'General' },
}

/** Where a station's position came from: read from its name, or assigned by the owner. */
export interface Job { role: RoleKey; title: string; division: Division; source: 'name' | 'assigned' }

// Checked in order, so "admin-finance" is not read as the CEO's "admin" and "tech-lead" wins
// over the frontend's "web". Short words (fe, be, ui) only count as a whole word of the name.
const MATCHERS: [RoleKey, RegExp][] = [
  ['accounting', /account|akunt|akuntan|bookkeep|pembukuan|audit/],
  ['admin-finance', /financ|keuangan|invoice|payroll|treasur|tax|pajak|\badmin\b/],
  ['tech-lead', /tech.?lead|lead.?(dev|eng)|cto|architect|arsitek|eng.?manager|\blead\b/],
  ['ceo', /\bceo\b|chief|director|direktur|founder|owner|\bboss\b|pimpinan|president|\bexec/],
  ['designer', /design|desain|\bui\b|\bux\b|uiux|ui.?ux|figma|product.?design/],
  ['content', /content|konten|creator|kreator|marketing|social|sosmed|copywrit|brand|video|media/],
  ['frontend', /front|\bfe\b|\bweb\b|react|vue|angular|next|mobile|flutter|\bapp\b/],
  ['backend', /back|\bbe\b|\bapi\b|server|core|bank|database|\bdb\b|laravel|golang|devops|infra/],
]

/** The position an agent's name suggests; Staff when it suggests none. */
export function roleFromName(name: string): RoleKey {
  const words = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return MATCHERS.find(([, pattern]) => pattern.test(words))?.[0] ?? 'staff'
}

export function jobFor(agent: string, assigned: Record<string, RoleKey>): Job {
  const own = assigned[agent]
  const role = own ?? roleFromName(agent)
  return { role, ...ROLE_INFO[role], source: own ? 'assigned' : 'name' }
}

/** Every station with its position; shared snapshots are not changed. */
export function withJobs(office: OfficeSnapshot, assigned: Record<string, RoleKey>): OfficeSnapshot {
  return { ...office, stations: office.stations.map((station) => ({ ...station, job: jobFor(station.id, assigned) })) }
}

const AGENT = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/
const isRole = (value: unknown): value is RoleKey => typeof value === 'string' && (ROLES as readonly string[]).includes(value)
interface OrgFile { version: 1; roles: Record<string, RoleKey> }

export class OrgStore {
  private cache?: { key: string; roles: Record<string, RoleKey> }
  constructor(readonly dir: string = accessConfigDir()) {}

  get path(): string { return join(this.dir, 'org.json') }

  /** The assigned positions; a missing or damaged file means none (names decide). */
  async roles(): Promise<Record<string, RoleKey>> {
    let key: string
    try {
      const info = await stat(this.path)
      key = `${info.ino}:${info.size}:${info.mtimeMs}`
    } catch {
      return {}
    }
    if (this.cache?.key === key) return this.cache.roles
    let roles: Record<string, RoleKey> = {}
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as Partial<OrgFile> | null
      if (parsed && typeof parsed.roles === 'object' && parsed.roles) roles = Object.fromEntries(Object.entries(parsed.roles).filter(([agent, role]) => AGENT.test(agent) && isRole(role)))
    } catch { /* damaged: positions come from the names */ }
    this.cache = { key, roles }
    return roles
  }

  /** Assigns a position to an agent, or (`auto`) lets its name decide again. */
  async assign(agent: unknown, role: unknown): Promise<Record<string, RoleKey>> {
    if (typeof agent !== 'string' || !AGENT.test(agent)) throw new AccessError('Pick an agent by its name.', 400)
    if (role !== 'auto' && !isRole(role)) throw new AccessError('Unknown position.', 400)
    const roles = { ...(await this.roles()) }
    if (role === 'auto') delete roles[agent]; else roles[agent] = role
    await mkdir(this.dir, { recursive: true, mode: 0o700 })
    const temporary = `${this.path}.${process.pid}.tmp`
    await writeFile(temporary, `${JSON.stringify({ version: 1, roles } satisfies OrgFile, null, 2)}\n`, { mode: 0o600 })
    await rename(temporary, this.path)
    this.cache = undefined
    return roles
  }
}

/** GET /api/org (assigned positions) and POST /api/org (assign one); returns the reader. */
export function installOrg(app: Express, store = new OrgStore()): () => Promise<Record<string, RoleKey>> {
  app.use('/api/org', express.json({ limit: '4kb' }), (request: Request, response: Response, next: NextFunction) => {
    if (request.method === 'POST' && request.get('x-ruang-request') !== '1') { response.status(403).json({ error: 'Forbidden.' }); return }
    next()
  })
  app.get('/api/org', async (_request, response) => { response.json({ roles: await store.roles() }) })
  app.post('/api/org', async (request, response) => {
    const body = (request.body && typeof request.body === 'object' ? request.body : {}) as Record<string, unknown>
    try {
      response.json({ roles: await store.assign(body.agent, body.role) })
    } catch (error) {
      if (!(error instanceof AccessError)) throw error
      response.status(error.status).json({ error: error.message })
    }
  })
  return () => store.roles()
}
