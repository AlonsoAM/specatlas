function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0')
}

export function localDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function localMonth(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function localOffset(date: Date = new Date()): string {
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absolute = Math.abs(offset)
  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
}

export function localStamp(date: Date = new Date()): string {
  return `${localDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${localOffset(date)}`
}

export function localCompact(date: Date = new Date()): string {
  return `${localDate(date).replace(/-/g, '')}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}
