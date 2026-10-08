import { describe, expect, it } from 'vitest'
import { COMPANY_POSITIONS, deskSlots, jobOf } from './org.ts'

describe('Digantara desks', () => {
  it('keeps one desk per company position and seats agents at their own position', () => {
    const slots = deskSlots(['backend', 'ceo'])
    expect(slots.map((slot) => slot.role)).toEqual(COMPANY_POSITIONS)
    expect(slots.find((slot) => slot.role === 'backend')?.agent).toBe(0)
    expect(slots.find((slot) => slot.role === 'ceo')?.agent).toBe(1)
    expect(slots.filter((slot) => slot.agent === undefined)).toHaveLength(COMPANY_POSITIONS.length - 2)
  })

  it('adds a desk in the right division for a second holder and for staff', () => {
    const slots = deskSlots(['frontend', 'frontend', 'staff'])
    expect(slots).toHaveLength(COMPANY_POSITIONS.length + 2)
    expect(slots.at(-2)).toEqual({ role: 'frontend', division: 'Engineering', agent: 1 })
    expect(slots.at(-1)).toEqual({ role: 'staff', division: 'General', agent: 2 })
  })

  it('treats a station without a position (an older server) as staff', () => {
    expect(jobOf({})).toMatchObject({ role: 'staff', division: 'General' })
    expect(jobOf({ job: { role: 'designer', title: 'UI/UX Designer', division: 'Creative', source: 'name' } }).role).toBe('designer')
  })
})
