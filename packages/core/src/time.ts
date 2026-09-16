function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0')
}

export function localDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function localMonth(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function localIso(date: Date = new Date()): string {
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absolute = Math.abs(offset)
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
  return `${localDate(date)}T${time}${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
}
