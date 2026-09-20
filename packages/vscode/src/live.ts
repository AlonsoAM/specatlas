export interface LivePanelSurface {
  visible: boolean
  title: string
  setHtml(html: string): void
}

export interface LivePanelEntry<T = unknown> {
  key: string
  target: T
  surface: LivePanelSurface
  build: (target: T) => Promise<{ title?: string; html: string } | undefined>
}

export async function updateLivePanel<T>(entry: LivePanelEntry<T>, onError?: (message: string) => void): Promise<boolean> {
  if (!entry.surface.visible) return false
  try {
    const result = await entry.build(entry.target)
    if (!result) return false
    if (result.title) entry.surface.title = result.title
    entry.surface.setHtml(result.html)
    return true
  } catch (error) {
    onError?.(`no se pudo refrescar ${entry.key}: ${(error as Error).message}`)
    return false
  }
}

export async function refreshLivePanels<T>(entries: Iterable<LivePanelEntry<T>>, onError?: (message: string) => void): Promise<number> {
  let updated = 0
  for (const entry of entries) {
    if (await updateLivePanel(entry, onError)) updated += 1
  }
  return updated
}

export function findLivePanel<T>(entries: Iterable<LivePanelEntry<T>>, key: string): LivePanelEntry<T> | undefined {
  for (const entry of entries) {
    if (entry.key === key) return entry
  }
  return undefined
}
