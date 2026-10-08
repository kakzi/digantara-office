import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import express from 'express'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { OfficeSnapshot, OfficeStation } from './mission-control.js'
import { installOrg, jobFor, OrgStore, roleFromName, withJobs } from './org.js'

describe('positions from agent names', () => {
  it('reads every position of the org chart from common profile names', () => {
    const cases: Record<string, string> = {
      ceo: 'ceo', 'the-boss': 'ceo', direktur: 'ceo', founder: 'ceo',
      'tech-lead': 'tech-lead', techlead: 'tech-lead', cto: 'tech-lead', 'lead-dev': 'tech-lead', architect: 'tech-lead',
      frontend: 'frontend', 'fe-dev': 'frontend', 'web-react': 'frontend', flutter: 'frontend',
      backend: 'backend', 'be_dev': 'backend', 'core-banking': 'backend', api: 'backend', laravel: 'backend',
      designer: 'designer', 'ui-ux': 'designer', uiux: 'designer', figma: 'designer',
      'content-creator': 'content', marketing: 'content', sosmed: 'content',
      'admin-finance': 'admin-finance', finance: 'admin-finance', keuangan: 'admin-finance', admin: 'admin-finance',
      'senior-accounting': 'accounting', akuntan: 'accounting', accountant: 'accounting',
    }
    for (const [name, role] of Object.entries(cases)) expect([name, roleFromName(name)]).toEqual([name, role])
  })

  it('does not read short words inside longer names, and leaves the rest as staff', () => {
    for (const name of ['default', 'benny', 'research', 'opencode', 'hermes', 'helper']) expect([name, roleFromName(name)]).toEqual([name, 'staff'])
  })

  it('prefers an assigned position and marks where each came from', () => {
    expect(jobFor('backend', {})).toEqual({ role: 'backend', title: 'Backend Developer', division: 'Engineering', source: 'name' })
    expect(jobFor('default', { default: 'ceo' })).toEqual({ role: 'ceo', title: 'CEO', division: 'Executive', source: 'assigned' })
    const station = { id: 'designer', name: 'designer' } as OfficeStation
    const office: OfficeSnapshot = { stations: [station], summary: {} as OfficeSnapshot['summary'], fetchedAt: '' }
    expect(withJobs(office, {}).stations[0].job?.role).toBe('designer')
    expect(office.stations[0].job).toBeUndefined()
  })
})

describe('assigned positions', () => {
  let dir: string
  let base: string
  let close: () => void
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ruang-org-'))
    const app = express()
    installOrg(app, new OrgStore(dir))
    const server = app.listen(0, '127.0.0.1')
    await new Promise((resolve) => server.once('listening', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    close = () => server.close()
  })
  afterEach(() => close())
  const post = (body: unknown, headers: Record<string, string> = { 'x-ruang-request': '1' }) => fetch(`${base}/api/org`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })

  it('saves an assignment in Ruang\'s own config and goes back to the name with auto', async () => {
    expect(await (await fetch(`${base}/api/org`)).json()).toEqual({ roles: {} })
    expect(await (await post({ agent: 'default', role: 'ceo' })).json()).toEqual({ roles: { default: 'ceo' } })
    expect(await (await fetch(`${base}/api/org`)).json()).toEqual({ roles: { default: 'ceo' } })
    expect(JSON.parse(await readFile(join(dir, 'org.json'), 'utf8'))).toEqual({ version: 1, roles: { default: 'ceo' } })
    expect((await stat(join(dir, 'org.json'))).mode & 0o777).toBe(0o600)
    expect(await (await post({ agent: 'default', role: 'auto' })).json()).toEqual({ roles: {} })
  })

  it('refuses unknown positions, odd agent names and requests from other pages', async () => {
    expect((await post({ agent: 'default', role: 'janitor' })).status).toBe(400)
    expect((await post({ agent: '../etc', role: 'ceo' })).status).toBe(400)
    expect((await post({ agent: 'default', role: 'ceo' }, {})).status).toBe(403)
  })

  it('ignores a damaged file or unknown entries instead of failing', async () => {
    await writeFile(join(dir, 'org.json'), '{ not json')
    expect(await new OrgStore(dir).roles()).toEqual({})
    await writeFile(join(dir, 'org.json'), JSON.stringify({ version: 1, roles: { coder: 'backend', bad: 'janitor', '../x': 'ceo' } }))
    expect(await new OrgStore(dir).roles()).toEqual({ coder: 'backend' })
  })
})
