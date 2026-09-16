import { describe, expect, it } from 'vitest'
import { localCompact, localDate, localMonth, localOffset, localStamp } from '../src/time'

describe('fechas locales legibles', () => {
  it('emite fecha y hora sin T ni milisegundos, con offset', () => {
    const date = new Date(2026, 8, 16, 16, 5, 9, 123)
    const stamp = localStamp(date)
    expect(stamp).toMatch(/^2026-09-16 16:05:09 [+-]\d{2}:\d{2}$/)
    expect(stamp).not.toContain('T')
    expect(stamp).not.toContain('.')
    expect(stamp).not.toContain('Z')
    expect(localDate(date)).toBe('2026-09-16')
    expect(localMonth(date)).toBe('2026-09')
    expect(localCompact(date)).toBe('20260916160509')
  })

  it('el offset coincide con la zona local', () => {
    const date = new Date(2026, 0, 15, 12, 0, 0)
    const offset = localOffset(date)
    expect(localStamp(date).endsWith(offset)).toBe(true)
    expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/)
  })

  it('la fecha local no depende del UTC (medianoche)', () => {
    const date = new Date(2026, 8, 16, 23, 30, 0)
    expect(localDate(date)).toBe('2026-09-16')
    expect(localStamp(date).startsWith('2026-09-16 23:30:00')).toBe(true)
    expect(localCompact(date)).toBe('20260916233000')
  })
})
