import { escapeHtml } from '../logic.js'
import { TONES, type Tone } from './styles.js'

export { escapeHtml }
export type { Tone }

export function tone(t: Tone): string {
  return TONES[t]
}

export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function kpi(value: string | number, label: string, opts: { tone?: Tone; icon?: string; hint?: string } = {}): string {
  return `<div class="kpi" style="--tone:${tone(opts.tone ?? 'blue')}">
  <div class="top"><span class="ico">${opts.icon ?? '●'}</span><span>${escapeHtml(label)}</span></div>
  <div class="val">${escapeHtml(String(value))}</div>
  ${opts.hint ? `<div class="hint">${escapeHtml(opts.hint)}</div>` : ''}
</div>`
}

export function pillHtml(label: string, t: Tone, icon?: string, mono = false): string {
  return `<span class="pill${mono ? ' mono' : ''}" style="--tone:${tone(t)}">${icon ? `${icon} ` : ''}${escapeHtml(label)}</span>`
}

export function commandLink(command: string, args: unknown[], label: string): string {
  return `<a href="command:${command}?${encodeURIComponent(JSON.stringify(args))}">${escapeHtml(label)}</a>`
}

let donutSeq = 0

export function donut(percent: number, center: string, subtitle: string, t: Tone): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))
  const radius = 46
  const innerRadius = radius - 5.5
  const circumference = 2 * Math.PI * radius
  const dash = (clamped / 100) * circumference
  const uid = `atlas-donut-${(donutSeq += 1)}`
  const color = tone(t)
  return `<svg class="donut-chart" width="132" height="132" viewBox="0 0 120 120" role="img" aria-label="${clamped}%">
  <defs>
    <radialGradient id="${uid}" cx="50%" cy="34%" r="78%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.5"></stop>
      <stop offset="62%" stop-color="${color}" stop-opacity="0.22"></stop>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.08"></stop>
    </radialGradient>
  </defs>
  <circle cx="60" cy="60" r="${innerRadius}" fill="color-mix(in srgb, var(--atlas-ink) 6%, transparent)"></circle>
  <circle cx="60" cy="60" r="${innerRadius}" fill="url(#${uid})"></circle>
  <circle cx="60" cy="60" r="${radius}" fill="none" stroke="color-mix(in srgb, var(--atlas-ink) 16%, transparent)" stroke-width="11"></circle>
  <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round"
          stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}" transform="rotate(-90 60 60)"></circle>
  <text x="60" y="58" text-anchor="middle" class="center" dominant-baseline="middle">${center}</text>
  <text x="60" y="78" text-anchor="middle" class="center-sub">${escapeHtml(subtitle)}</text>
</svg>`
}

export function barList(items: Array<{ label: string; value: number; tone?: Tone }>): string {
  const max = Math.max(1, ...items.map((item) => item.value))
  return `<div class="bar-list">${items
    .map(
      (item) => `<div class="bar-row" style="--tone:${tone(item.tone ?? 'blue')}">
  <span class="muted">${escapeHtml(item.label)}</span>
  <span class="track"><span class="fill" style="width:${Math.round((item.value / max) * 100)}%"></span></span>
  <span class="n">${item.value}</span>
</div>`,
    )
    .join('')}</div>`
}

export function bars(items: Array<{ label: string; value: number; tone?: Tone }>): string {
  const max = Math.max(1, ...items.map((item) => item.value))
  return `<div class="bars">${items
    .map(
      (item) => `<div class="bar-col" style="--tone:${tone(item.tone ?? 'blue')}">
  <span class="v">${item.value}</span>
  <span class="bar" style="height:${Math.max(6, Math.round((item.value / max) * 78))}px"></span>
  <span class="k">${escapeHtml(item.label)}</span>
</div>`,
    )
    .join('')}</div>`
}

export function progressBar(percent: number, t: Tone): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))
  return `<div class="progress" style="--tone:${tone(t)}"><span style="width:${clamped}%"></span></div>`
}

export function banner(t: Tone, icon: string, title: string, text: string): string {
  return `<div class="status-banner" style="--tone:${tone(t)}">
  <span class="sb-icon">${icon}</span>
  <div><strong>${escapeHtml(title)}</strong><span class="sb-text">${escapeHtml(text)}</span></div>
</div>`
}

export function laneTone(lane: string): Tone {
  if (lane === 'fix') return 'orange'
  if (lane === 'full') return 'purple'
  return 'blue'
}
