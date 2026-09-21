import { describe, expect, it } from 'vitest'
import { findLivePanel, refreshLivePanels, updateLivePanel, type LivePanelEntry, type LivePanelSurface } from '../src/live'

function fakeSurface(visible = true): LivePanelSurface & { html: string[] } {
  return {
    visible,
    title: 'título',
    html: [],
    setHtml(value: string) {
      this.html.push(value)
    },
  }
}

describe('paneles vivos', () => {
  it('[REQ-EDITOR-008-S1] reconstruye un panel visible con el título y el html nuevos', async () => {
    const surface = fakeSurface()
    let builds = 0
    const entry: LivePanelEntry<string> = {
      key: 'matrix',
      target: 'raíz',
      surface,
      build: async (target) => {
        builds += 1
        return { title: `Matriz — ${target}`, html: `<p>${target}</p>` }
      },
    }

    const updated = await updateLivePanel(entry)
    expect(updated).toBe(true)
    expect(builds).toBe(1)
    expect(surface.title).toBe('Matriz — raíz')
    expect(surface.html).toEqual(['<p>raíz</p>'])
  })

  it('no toca un panel oculto', async () => {
    const surface = fakeSurface(false)
    let builds = 0
    const entry: LivePanelEntry = {
      key: 'metrics',
      target: undefined,
      surface,
      build: async () => {
        builds += 1
        return { html: '<p>nuevo</p>' }
      },
    }

    expect(await updateLivePanel(entry)).toBe(false)
    expect(builds).toBe(0)
    expect(surface.html).toEqual([])
  })

  it('[REQ-EDITOR-008-S3] conserva el contenido cuando el panel no tiene datos nuevos', async () => {
    const surface = fakeSurface()
    const entry: LivePanelEntry = { key: 'preview', target: undefined, surface, build: async () => undefined }
    expect(await updateLivePanel(entry)).toBe(false)
    expect(surface.html).toEqual([])
  })

  it('[REQ-EDITOR-008-S4] aísla el fallo de un panel y sigue con los demás', async () => {
    const errors: string[] = []
    const first = fakeSurface()
    const second = fakeSurface()
    const entries: Array<LivePanelEntry> = [
      { key: 'matrix', target: undefined, surface: first, build: async () => { throw new Error('boom') } },
      { key: 'board', target: undefined, surface: second, build: async () => ({ html: '<p>ok</p>' }) },
    ]

    const updated = await refreshLivePanels(entries, (message) => errors.push(message))
    expect(updated).toBe(1)
    expect(second.html).toEqual(['<p>ok</p>'])
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('matrix')
    expect(errors[0]).toContain('boom')
  })

  it('[REQ-EDITOR-001-S3] encuentra un panel por su clave para no duplicarlo', () => {
    const entry: LivePanelEntry = { key: 'matrix', target: undefined, surface: fakeSurface(), build: async () => undefined }
    expect(findLivePanel([entry], 'matrix')).toBe(entry)
    expect(findLivePanel([entry], 'board')).toBeUndefined()
  })
})
