// Widget preferences per role (localStorage)`r`n
export interface WidgetPref {
  visible: boolean
  order: number
  size?: WidgetSize
}

export type WidgetPrefsMap = Record<string, WidgetPref>
export type WidgetSize = 'third' | 'half' | 'full'

const STORAGE_KEY = (role: string) => `nexora_dashboard_v1_${role}`

const DEFAULT_PREFS: Record<string, WidgetPrefsMap> = {
  super_admin: {
    'kpi-dirigeant':           { visible: true,  order: 0 },
    'transports-attente':      { visible: true,  order: 1 },
    'alertes-critiques':       { visible: true,  order: 2 },
    'activite-recente':        { visible: true,  order: 3 },
    'pipeline-prospects':      { visible: false, order: 4 },
    'conversations-live':      { visible: true,  order: 5 },
    'tracking-overview':       { visible: true,  order: 6 },
  },
  dirigeant: {
    'kpi-dirigeant':           { visible: true,  order: 0 },
    'transports-attente':      { visible: true,  order: 1 },
    'alertes-critiques':       { visible: true,  order: 2 },
    'activite-recente':        { visible: true,  order: 3 },
    'pipeline-prospects':      { visible: false, order: 4 },
    'conversations-live':      { visible: true,  order: 5 },
    'tracking-overview':       { visible: true,  order: 6 },
  },
  exploitant: {
    'kpi-exploitant':          { visible: true,  order: 0 },
    'transports-attente':      { visible: true,  order: 1 },
    'alertes-chrono':          { visible: true,  order: 2 },
    'carte-vehicules':         { visible: true,  order: 3 },
    'conversations-live':      { visible: true,  order: 4 },
    'tracking-overview':       { visible: true,  order: 5 },
  },
  commercial: {
    'kpi-commercial':          { visible: true,  order: 0 },
    'pipeline-prospects':      { visible: true,  order: 1 },
    'carte-clients':           { visible: true,  order: 2 },
    'activite-recente':        { visible: false, order: 3 },
    'conversations-live':      { visible: true,  order: 4 },
    'tracking-overview':       { visible: true,  order: 5 },
  },
  admin: {
    'kpi-dirigeant':           { visible: true,  order: 0 },
    'transports-attente':      { visible: true,  order: 1 },
    'alertes-critiques':       { visible: true,  order: 2 },
    'pipeline-prospects':      { visible: true,  order: 3 },
    'activite-recente':        { visible: true,  order: 4 },
    'conversations-live':      { visible: true,  order: 5 },
    'tracking-overview':       { visible: true,  order: 6 },
  },
  comptable: {
    'kpi-dirigeant':           { visible: true,  order: 0 },
    'activite-recente':        { visible: true,  order: 1 },
    'transports-attente':      { visible: false, order: 2 },
    'pipeline-prospects':      { visible: false, order: 3 },
    'conversations-live':      { visible: true,  order: 4 },
    'tracking-overview':       { visible: false, order: 5 },
  },
  administratif: {
    'kpi-dirigeant':           { visible: true,  order: 0 },
    'activite-recente':        { visible: true,  order: 1 },
    'transports-attente':      { visible: true,  order: 2 },
    'pipeline-prospects':      { visible: false, order: 3 },
    'conversations-live':      { visible: true,  order: 4 },
    'tracking-overview':       { visible: true,  order: 5 },
  },
  facturation: {
    'kpi-dirigeant':           { visible: true,  order: 0 },
    'activite-recente':        { visible: true,  order: 1 },
    'transports-attente':      { visible: false, order: 2 },
    'pipeline-prospects':      { visible: false, order: 3 },
    'conversations-live':      { visible: true,  order: 4 },
    'tracking-overview':       { visible: false, order: 5 },
  },
  flotte: {
    'kpi-exploitant':          { visible: true,  order: 0 },
    'carte-vehicules':         { visible: true,  order: 1 },
    'alertes-chrono':          { visible: true,  order: 2 },
    'transports-attente':      { visible: true,  order: 3 },
    'conversations-live':      { visible: true,  order: 4 },
    'tracking-overview':       { visible: true,  order: 5 },
  },
  observateur: {
    'kpi-dirigeant':           { visible: true,  order: 0 },
    'activite-recente':        { visible: true,  order: 1 },
    'transports-attente':      { visible: true,  order: 2 },
    'pipeline-prospects':      { visible: false, order: 3 },
    'conversations-live':      { visible: true,  order: 4 },
    'tracking-overview':       { visible: true,  order: 5 },
  },
  investisseur: {
    'kpi-dirigeant':           { visible: true,  order: 0 },
    'pipeline-prospects':      { visible: true,  order: 1 },
    'activite-recente':        { visible: true,  order: 2 },
    'transports-attente':      { visible: false, order: 3 },
    'conversations-live':      { visible: true,  order: 4 },
    'tracking-overview':       { visible: true,  order: 5 },
  },
  demo: {
    'kpi-exploitant':          { visible: true,  order: 0 },
    'transports-attente':      { visible: true,  order: 1 },
    'alertes-chrono':          { visible: true,  order: 2 },
    'pipeline-prospects':      { visible: true,  order: 3 },
    'carte-clients':           { visible: true,  order: 4 },
    'conversations-live':      { visible: true,  order: 5 },
    'tracking-overview':       { visible: true,  order: 6 },
  },
  affreteur: {
    'conversations-live':      { visible: true,  order: 0 },
    'tracking-overview':       { visible: true,  order: 1 },
  },
}

function clonePrefs(prefs: WidgetPrefsMap): WidgetPrefsMap {
  const cloned: WidgetPrefsMap = {}
  for (const [id, pref] of Object.entries(prefs)) {
    cloned[id] = { ...pref }
  }
  return cloned
}

function isWidgetSize(value: unknown): value is WidgetSize {
  return value === 'third' || value === 'half' || value === 'full'
}

export function getDefaultPrefs(role: string): WidgetPrefsMap {
  return clonePrefs(DEFAULT_PREFS[role] ?? DEFAULT_PREFS['dirigeant'])
}

export function loadPrefs(role: string): WidgetPrefsMap {
  const defaults = getDefaultPrefs(role)
  try {
    const raw = localStorage.getItem(STORAGE_KEY(role))
    if (!raw) return defaults
    const saved = JSON.parse(raw) as Record<string, Partial<WidgetPref>>
    // Merge defaults with saved (new widgets get default state)
    const merged: WidgetPrefsMap = clonePrefs(defaults)
    for (const [id, pref] of Object.entries(saved)) {
      if (!(id in merged)) continue
      const base = merged[id]
      const next: WidgetPref = {
        visible: typeof pref.visible === 'boolean' ? pref.visible : base.visible,
        order: typeof pref.order === 'number' && Number.isFinite(pref.order) ? pref.order : base.order,
      }
      if (isWidgetSize(pref.size)) next.size = pref.size
      else if (base.size) next.size = base.size
      merged[id] = next
    }
    return merged
  } catch {
    return defaults
  }
}

export function savePrefs(role: string, prefs: WidgetPrefsMap): void {
  try {
    localStorage.setItem(STORAGE_KEY(role), JSON.stringify(prefs))
  } catch {
    // localStorage unavailable
  }
}

export function toggleWidget(
  prefs: WidgetPrefsMap,
  id: string,
): WidgetPrefsMap {
  const current = prefs[id]
  if (!current) return prefs
  return { ...prefs, [id]: { ...current, visible: !current.visible } }
}

export function moveWidget(
  prefs: WidgetPrefsMap,
  id: string,
  direction: 'up' | 'down',
): WidgetPrefsMap {
  const sorted = Object.entries(prefs).sort(([, a], [, b]) => a.order - b.order)
  const idx = sorted.findIndex(([wid]) => wid === id)
  if (idx < 0) return prefs
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= sorted.length) return prefs

  const updated = [...sorted]
  ;[updated[idx], updated[targetIdx]] = [updated[targetIdx], updated[idx]]

  const newPrefs: WidgetPrefsMap = {}
  updated.forEach(([wid, pref], i) => {
    newPrefs[wid] = { ...pref, order: i }
  })
  return newPrefs
}

export function moveWidgetToTarget(
  prefs: WidgetPrefsMap,
  sourceId: string,
  targetId: string,
  position: 'before' | 'after',
): WidgetPrefsMap {
  if (sourceId === targetId) return prefs

  const sorted = Object.entries(prefs).sort(([, a], [, b]) => a.order - b.order)
  const sourceIndex = sorted.findIndex(([wid]) => wid === sourceId)
  const targetIndex = sorted.findIndex(([wid]) => wid === targetId)
  if (sourceIndex < 0 || targetIndex < 0) return prefs

  const updated = [...sorted]
  const [sourceEntry] = updated.splice(sourceIndex, 1)
  let insertionIndex = updated.findIndex(([wid]) => wid === targetId)
  if (insertionIndex < 0) return prefs
  if (position === 'after') insertionIndex += 1
  updated.splice(insertionIndex, 0, sourceEntry)

  const newPrefs: WidgetPrefsMap = {}
  updated.forEach(([wid, pref], index) => {
    newPrefs[wid] = { ...pref, order: index }
  })
  return newPrefs
}

export function sortedWidgets(prefs: WidgetPrefsMap): string[] {
  return Object.entries(prefs)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([id]) => id)
}

