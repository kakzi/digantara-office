import type { OfficeStation } from './types.ts'

// Digantara Office: a modern software house. Every agent holds one position, and each position has
// its own desk in its division's area: the CEO in the executive suite, the Tech Lead and developers
// in one engineering workspace, the designer and content creator in the creative studio, finance
// and accounting in the administration corner. Positions come from the server (see server/org.ts;
// the role keys must match), which reads them from agent names unless the owner assigned one.

export const COMPANY = 'Digantara'

export const ROLES = ['ceo', 'tech-lead', 'frontend', 'backend', 'designer', 'content', 'admin-finance', 'accounting', 'staff'] as const
export type RoleKey = typeof ROLES[number]
export type Division = 'Executive' | 'Engineering' | 'Creative' | 'Finance' | 'General'
export interface Job { role: RoleKey; title: string; division: Division; source: 'name' | 'assigned' }

export interface RoleInfo { title: string; division: Division; duties: string[] }
export const ROLE_INFO: Record<RoleKey, RoleInfo> = {
  ceo: { title: 'CEO', division: 'Executive', duties: ['Business direction and company strategy', 'Partnerships and strategic decisions', 'Oversees every division'] },
  'tech-lead': { title: 'Tech Lead', division: 'Engineering', duties: ['Leads the engineering team', 'System architecture and technology', 'Code review and technical standards', 'Development roadmap'] },
  frontend: { title: 'Frontend Developer', division: 'Engineering', duties: ['Website and web app interfaces', 'API integration', 'Responsive design and UX implementation'] },
  backend: { title: 'Backend Developer', division: 'Engineering', duties: ['APIs and business logic', 'Database and servers', 'Authentication, security and integrations', 'Core system / core banking'] },
  designer: { title: 'UI/UX Designer', division: 'Creative', duties: ['Wireframes and prototypes', 'UI design', 'Design system', 'User research and usability'] },
  content: { title: 'Content Creator', division: 'Creative', duties: ['Marketing content', 'Social media', 'Video, photo and motion graphics', 'Product documentation and branding'] },
  'admin-finance': { title: 'Admin Finance', division: 'Finance', duties: ['Financial administration', 'Invoices and payments', 'Operational expenses', 'Tax and financial documents'] },
  accounting: { title: 'Senior Accounting', division: 'Finance', duties: ['Bookkeeping and financial statements', 'Financial reporting', 'Reconciliation', 'Transaction control and review', 'Helps the CEO analyse the company finances'] },
  staff: { title: 'Staff', division: 'General', duties: ['No position yet: assign one in the agent details'] },
}

export interface DivisionInfo { label: string; area: string; color: string }
export const DIVISIONS: Record<Division, DivisionInfo> = {
  Executive: { label: 'Executive', area: 'Executive suite', color: '#c9a227' },
  Engineering: { label: 'Tech Lead · Engineering', area: 'Engineering workspace', color: '#3d7fd6' },
  Creative: { label: 'Design & Content', area: 'Creative studio', color: '#d6457a' },
  Finance: { label: 'Finance', area: 'Finance & accounting', color: '#2a9d6f' },
  General: { label: 'General', area: 'Hot desks', color: '#8a8f98' },
}
/** The org chart: the CEO over three divisions. Staff (no position) sit apart at hot desks. */
export const ORG_CHART: { division: Division; roles: RoleKey[] }[] = [
  { division: 'Engineering', roles: ['tech-lead', 'frontend', 'backend'] },
  { division: 'Creative', roles: ['designer', 'content'] },
  { division: 'Finance', roles: ['admin-finance', 'accounting'] },
]
/** Every position the company has a desk for, even while nobody holds it. */
export const COMPANY_POSITIONS: RoleKey[] = ['ceo', ...ORG_CHART.flatMap((item) => item.roles)]

/** The station's position; Staff when the server sent none (an older server). */
export function jobOf(station: Pick<OfficeStation, 'job'>): Job {
  if (station.job && ROLE_INFO[station.job.role]) return station.job
  return { role: 'staff', ...ROLE_INFO.staff, source: 'name' }
}

/** A desk: the position it is for, and the agent (index into the crew) sitting there, if any. */
export interface DeskSlot { role: RoleKey; division: Division; agent?: number }

/**
 * Desks for the crew: one for every company position (vacant ones stay, so the structure is
 * visible), plus one more in the right division for each extra holder of a position and for
 * staff. Agents take desks in crew order, so everyone keeps their own place.
 */
export function deskSlots(roles: readonly RoleKey[]): DeskSlot[] {
  const slots: DeskSlot[] = COMPANY_POSITIONS.map((role) => ({ role, division: ROLE_INFO[role].division }))
  roles.forEach((role, agent) => {
    const free = slots.find((slot) => slot.role === role && slot.agent === undefined)
    if (free) free.agent = agent
    else slots.push({ role, division: ROLE_INFO[role].division, agent })
  })
  return slots
}

/** Fired after a position is assigned, so every view refreshes the office. */
export const ORG_CHANGED = 'ruang:org-changed'

/** Assigns a position to an agent (or `auto`: from its name again). */
export async function assignRole(agent: string, role: RoleKey | 'auto', request: typeof fetch = fetch): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await request('/api/org', { method: 'POST', headers: { 'content-type': 'application/json', 'x-ruang-request': '1' }, body: JSON.stringify({ agent, role }), credentials: 'same-origin' })
    if (response.ok) return { ok: true }
    const body = await response.json().catch(() => undefined) as { error?: string } | undefined
    return { ok: false, message: body?.error ?? `The Ruang server answered HTTP ${response.status}.` }
  } catch {
    return { ok: false, message: 'The Ruang server could not be reached.' }
  }
}
