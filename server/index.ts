import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import express, { type NextFunction, type Request, type Response } from 'express'
import Database from 'better-sqlite3'
import { excludedFor, FolderError, listFolder, publicAgent, readFolderFile, resolveAgentFolders } from './folders.js'
import { installAccess } from './access.js'
import { redactActivity, redactCalendar, redactDashboard, redactLogs, redactMemory, redactOffice, redactTasks, redactUsage } from './privacy.js'
import { installProfileLock, isHidden, type Privacy } from './profile-lock.js'
import { API_VERSION } from './api-version.js'
import { collectMemory } from './memory.js'
import { installOrg, withJobs } from './org.js'
import { getActivity, getCalendar, getChannels, getCommandLog, getDashboard, getKnowledge, getLogs, getOffice, getSnapshot, getTaskBoard, getTaskDetail, getUsage } from './mission-control.js'

const HOST = '0.0.0.0'
// MISSION_CONTROL_PORT is the pre-rename name, still honoured.
const PORT = Number(process.env.RUANG_PORT ?? process.env.MISSION_CONTROL_PORT) || 3001
// The built UI sits next to the server: ../dist from server/*.ts (development, npm start)
// and ../../dist from build/server/*.js (the installed package).
const distDirectory = [new URL('../dist', import.meta.url), new URL('../../dist', import.meta.url)].map((url) => fileURLToPath(url)).find((path) => existsSync(join(path, 'index.html'))) ?? fileURLToPath(new URL('../dist', import.meta.url))

const app = express()
app.disable('x-powered-by')
app.use(express.json())
app.use('/api', (_request, response, next) => {
  response.set('Cache-Control', 'no-store')
  next()
})

const startedAt = new Date().toISOString()
app.get('/api/health', (_request, response) => { response.json({ ok: true, apiVersion: API_VERSION, startedAt }) })
app.get('/api/simulator', (_request, response) => {
  try {
    const metricsPath = '/home/ubuntu/bmtnu-core/simulator/metrics.json'
    const auditPath = '/home/ubuntu/bmtnu-core/simulator/audit-report.json'
    const metrics = existsSync(metricsPath) ? JSON.parse(readFileSync(metricsPath, 'utf8')) : null
    const audit = existsSync(auditPath) ? JSON.parse(readFileSync(auditPath, 'utf8')) : null
    response.json({ ok: true, metrics, audit })
  } catch (e: any) {
    response.status(500).json({ ok: false, error: e.message })
  }
})

app.get('/api/bmt/cabang-live', (request, response) => {
  try {
    const db = new Database('/home/ubuntu/bmtnu-core/data/bmtnu.db', { readonly: true })
    const officeId = request.query.office_id ? Number(request.query.office_id) : 2

    const offices = db.prepare('SELECT id, name, code, kode_kantor, address, phone FROM offices ORDER BY id').all()
    const office = (db.prepare('SELECT id, name, code, kode_kantor, address, phone FROM offices WHERE id = ?').get(officeId) || offices[1]) as any

    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.role_id, r.name as role_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.office_id = ?
    `).all(office.id)

    const bm = users.find((u: any) => u.role_id === 5) || null
    const teller = users.find((u: any) => u.role_id === 3) || null
    const marketing = users.filter((u: any) => u.role_id === 4)

    const session = db.prepare(`
      SELECT s.id, s.user_id, s.status, s.opening_balance, s.system_balance, s.opened_at
      FROM teller_sessions s
      WHERE s.office_id = ?
      ORDER BY s.id DESC LIMIT 1
    `).get(office.id) || null

    const savingStats = db.prepare(`
      SELECT count(*) as count, coalesce(sum(balance), 0) as total_saldo
      FROM saving_accounts
      WHERE office_id = ? AND status = 'active'
    `).get(office.id)

    const financingStats = db.prepare(`
      SELECT count(*) as count, coalesce(sum(outstanding_principal), 0) as total_outstanding
      FROM financing_accounts
      WHERE office_id = ? AND status = 'active'
    `).get(office.id)

    const recentTx = db.prepare(`
      SELECT t.id, t.transaction_type, t.amount, t.description, t.created_at, a.account_number, g.name as member_name
      FROM saving_transactions t
      JOIN saving_accounts a ON a.id = t.saving_account_id
      LEFT JOIN register_anggotas g ON g.id = a.register_anggota_id
      WHERE a.office_id = ?
      ORDER BY t.id DESC LIMIT 8
    `).all(office.id)

    const networkSummary = {
      totalOffices: offices.length,
      totalSavingAccounts: (db.prepare(`SELECT count(*) as c FROM saving_accounts WHERE status = 'active'`).get() as any).c,
      totalFinancingAccounts: (db.prepare(`SELECT count(*) as c FROM financing_accounts WHERE status = 'active'`).get() as any).c,
      totalJournals: (db.prepare('SELECT count(*) as c FROM journals').get() as any).c
    }

    db.close()

    response.json({
      ok: true,
      office,
      offices,
      staff: { bm, teller, marketing },
      session,
      savingStats,
      financingStats,
      recentTx,
      networkSummary
    })
  } catch (err: any) {
    response.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/api/bmt/daily-routine', (_request, response) => {
  try {
    const routinePath = '/home/ubuntu/bmtnu-core/simulator/routine-status.json'
    if (existsSync(routinePath)) {
      const data = JSON.parse(readFileSync(routinePath, 'utf8'))
      response.json({ ok: true, data })
    } else {
      response.status(404).json({ ok: false, error: 'Routine status file not found' })
    }
  } catch (err: any) {
    response.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/api/bmt/daily-routine/action', (request, response) => {
  try {
    const { action, minutes, phase } = request.body || {}
    let cmd = ''
    if (action === 'advance_time') {
      const m = Number(minutes) || 15
      cmd = `bun -e "import { routineManager } from './simulator/daily-routine'; routineManager.advanceTime(${m}); console.log(JSON.stringify(routineManager.getStatus()));"`
    } else if (action === 'set_phase') {
      const p = phase || '08:00_PELAYANAN_PAGI'
      cmd = `bun -e "import { routineManager } from './simulator/daily-routine'; routineManager.setPhase('${p}'); console.log(JSON.stringify(routineManager.getStatus()));"`
    } else if (action === 'run_eom') {
      cmd = `bun -e "import { routineManager } from './simulator/daily-routine'; const res = await routineManager.runEndOfMonthProcess(); console.log(JSON.stringify({ res, status: routineManager.getStatus() }));"`
    } else {
      return response.status(400).json({ ok: false, error: 'Unknown action' })
    }

    const output = execSync(cmd, { cwd: '/home/ubuntu/bmtnu-core', timeout: 30000 }).toString()
    let parsed: any = null
    try {
      parsed = JSON.parse(output.trim().split('\n').pop() || '{}')
    } catch {
      parsed = { raw: output }
    }
    response.json({ ok: true, result: parsed })
  } catch (err: any) {
    response.status(500).json({ ok: false, error: err.message })
  }
})

// Optional access code (off by default): locks every other /api route until it is entered.
installAccess(app)
// Optional profile lock (off by default): a PIN withholds the private data of chosen agents.
const privacyOf = installProfileLock(app)
// Digantara Office positions (CEO, Tech Lead, ...): read from agent names, or assigned in the office.
const orgRoles = installOrg(app)

// `?fresh=1` (manual refresh) bypasses the 10s cache for anything older than 2s.
const FRESH_WINDOW_MS = 8_000
// Every snapshot is shared and cached; the private data of locked agents is withheld per request.
const routes: Record<string, (now: number, privacy: Privacy) => Promise<unknown> | unknown> = {
  '/api/runtime': getSnapshot,
  '/api/dashboard': async (now, privacy) => redactDashboard(await getDashboard(now), privacy),
  '/api/tasks': async (now, privacy) => redactTasks(await getTaskBoard(now), privacy),
  '/api/calendar': async (now, privacy) => redactCalendar(await getCalendar(now), privacy),
  '/api/activity': async (now, privacy) => redactActivity(await getActivity(now), privacy),
  '/api/knowledge': getKnowledge,
  '/api/office': async (now, privacy) => redactOffice(withJobs(await getOffice(now), await orgRoles()), privacy),
  '/api/channels': getChannels,
  '/api/logs': async (now, privacy) => redactLogs(await getLogs(now), privacy),
  '/api/command-log': () => getCommandLog(),
}
for (const [path, handler] of Object.entries(routes)) {
  app.get(path, async (request, response) => {
    const now = Date.now() + (request.query.fresh === '1' ? FRESH_WINDOW_MS : 0)
    response.json(await handler(now, await privacyOf(request)))
  })
}
const locked = (response: Response, agent: string) => response.status(423).json({ error: `🔒 ${agent} is locked. Enter the PIN to see it.`, locked: 'profile', agent })
app.get('/api/usage', async (request, response) => {
  const now = Date.now() + (request.query.fresh === '1' ? FRESH_WINDOW_MS : 0)
  response.json(redactUsage(await getUsage(Number(request.query.days) || 7, now), await privacyOf(request)))
})
app.get('/api/tasks/:id', async (request, response) => {
  const board = typeof request.query.board === 'string' && request.query.board ? request.query.board : undefined
  const privacy = await privacyOf(request)
  const listed = (await getTaskBoard()).tasks.data.find((task) => task.id === request.params.id && task.board === board)
  if (listed && isHidden(privacy, listed.assignee)) { locked(response, listed.assignee!); return }
  const detail = await getTaskDetail(String(request.params.id), Date.now(), board)
  if (!detail) { response.status(404).json({ error: 'Unknown task.' }); return }
  const assignee = detail.task.data?.assignee
  if (isHidden(privacy, assignee)) { locked(response, assignee!); return }
  response.json(detail)
})

// Folders: read-only view of each agent's own folder. Only agents the server resolved
// (every Hermes profile this machine reports, and OpenCode when installed) can be opened.
async function agentFolders() {
  const runtime = await getSnapshot()
  return resolveAgentFolders(runtime.profiles.data.map((profile) => profile.name))
}
async function openFolder(profile: string) {
  const folders = await agentFolders()
  const folder = folders.find((item) => item.profile === profile)
  if (!folder) throw new FolderError('Unknown agent.', 404)
  if (!folder.available) throw new FolderError(folder.reason ?? 'Folder not available.', 404)
  return { folder, excluded: excludedFor(folder, folders) }
}
function folderRoute(handler: (request: Request) => Promise<unknown>) {
  return async (request: Request, response: Response) => {
    try {
      response.json(await handler(request))
    } catch (error) {
      if (error instanceof FolderError) { response.status(error.status).json({ error: error.message }); return }
      throw error
    }
  }
}
app.get('/api/memory', folderRoute(async (request) => redactMemory(await collectMemory(await agentFolders()), await privacyOf(request))))
app.get('/api/folders', folderRoute(async () => ({ agents: (await agentFolders()).map(publicAgent), fetchedAt: new Date().toISOString() })))
/** A locked agent's folder answers 423 (Locked) until the PIN unlocks it in this browser. */
async function guardFolder(request: Request) {
  const profile = String(request.params.profile)
  if (isHidden(await privacyOf(request), profile)) throw new FolderError(`🔒 ${profile} is locked. Enter the PIN to see it.`, 423)
  return openFolder(profile)
}
app.get('/api/folders/:profile/list', folderRoute(async (request) => {
  const { folder, excluded } = await guardFolder(request)
  return listFolder(folder, request.query.path, excluded)
}))
app.get('/api/folders/:profile/file', folderRoute(async (request) => {
  const { folder, excluded } = await guardFolder(request)
  return readFolderFile(folder, request.query.path, excluded)
}))

app.use('/api', (_request, response) => { response.status(404).json({ error: 'Not found' }) })

if (existsSync(distDirectory)) {
  app.use(express.static(distDirectory))
  app.get(/^(?!\/api\/).*/, (_request, response) => { response.sendFile('index.html', { root: distDirectory }) })
}

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  void _next
  console.error('Ruang request failed:', error instanceof Error ? error.message : error)
  response.status(500).json({ error: 'Internal error' })
})

app.listen(PORT, HOST, () => console.log(`Ruang listening on http://${HOST}:${PORT}${existsSync(distDirectory) ? ' (serving built UI)' : ' (API only; run the Vite dev server for the UI)'}`))
