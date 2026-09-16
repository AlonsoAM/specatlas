import { describe, expect, it } from 'vitest'
import { localDate, localIso, localMonth } from '../src/time'

describe('fechas locales', () => {
  it('emite ISO local con offset, sin Z', () => {
    const date = new Date(2026, 8, 16, 16, 5, 9, 123)
    const iso = localIso(date)
    expect(iso).toMatch(/^2026-09-16T16:05:09\.123[+-]\d{2}:\d{2}$/)
    expect(iso).not.toContain('Z')
    expect(localDate(date)).toBe('2026-09-16')
    expect(localMonth(date)).toBe('2026-09')
  })

  it('el offset coincide con la zona local', () => {
    const date = new Date(2026, 0, 15, 12, 0, 0)
    const offset = -date.getTimezoneOffset()
    const sign = offset >= 0 ? '+' : '-'
    const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
    const minutes = String(Math.abs(offset) % 60).padStart(2, '0')
    expect(localIso(date).endsWith(`${sign}${hours}:${minutes}`)).toBe(true)
  })

  it('la fecha local no depende del UTC (medianoche)', () => {
    const date = new Date(2026, 8, 16, 23, 30, 0)
    expect(localDate(date)).toBe('2026-09-16')
    expect(localIso(date).startsWith('2026-09-16T23:30:00')).toBe(true)
  })
})
