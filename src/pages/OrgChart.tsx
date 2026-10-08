import type { CSSProperties } from 'react'
import { officeStateBadge } from '../office-state.ts'
import { COMPANY, DIVISIONS, jobOf, ORG_CHART, ROLE_INFO, type RoleKey } from '../org.ts'
import type { OfficeStation } from '../types.ts'

// Digantara's org chart with the crew in it: the CEO over Tech Lead (engineering), Design &
// Content and Finance. Each position shows who holds it now and what they are doing; positions
// nobody holds stay on the chart as vacant, and agents without a position are listed as staff.

function Holders({ role, stations, onSelect }: { role: RoleKey; stations: OfficeStation[]; onSelect: (station: OfficeStation, trigger: HTMLElement) => void }) {
  const holders = stations.filter((station) => jobOf(station).role === role)
  const info = ROLE_INFO[role]
  return <div className="org-position" title={info.duties.join(' · ')}>
    <span className="org-title">{info.title}</span>
    {holders.length === 0 ? <span className="org-vacant">Vacant</span> : holders.map((station) => {
      const badge = officeStateBadge(station.state)
      return <button type="button" key={station.id} className="org-holder" onClick={(event) => onSelect(station, event.currentTarget)} aria-label={`${station.name}, ${info.title}: ${station.state}. Open details.`}>
        <span>{station.privacy === 'locked' ? '🔒 ' : ''}{station.name}</span><span className={`badge ${badge.tone}`}>{station.state}</span>
      </button>
    })}
  </div>
}

export function OrgChart({ stations, onSelect }: { stations: OfficeStation[]; onSelect: (station: OfficeStation, trigger: HTMLElement) => void }) {
  const staff = stations.filter((station) => jobOf(station).role === 'staff')
  return <section className="org-chart" aria-label={`${COMPANY} org chart`}>
    <p className="eyebrow">{COMPANY.toUpperCase()} · ORG CHART</p>
    <div className="org-ceo" style={{ '--division': DIVISIONS.Executive.color } as CSSProperties}><Holders role="ceo" stations={stations} onSelect={onSelect}/></div>
    <div className="org-divisions">
      {ORG_CHART.map(({ division, roles }) => <div key={division} className="org-division" style={{ '--division': DIVISIONS[division].color } as CSSProperties}>
        <h3>{DIVISIONS[division].label}</h3>
        {roles.map((role) => <Holders key={role} role={role} stations={stations} onSelect={onSelect}/>)}
      </div>)}
    </div>
    {staff.length > 0 && <div className="org-division org-staff" style={{ '--division': DIVISIONS.General.color } as CSSProperties}>
      <h3>Staff · no position yet</h3>
      <Holders role="staff" stations={stations} onSelect={onSelect}/>
    </div>}
    <small className="muted">Positions come from agent names (a profile called <code>backend</code> is the Backend Developer). Open an agent to assign another.</small>
  </section>
}
