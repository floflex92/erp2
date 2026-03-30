// ─── Widget preferences per role (localStorage) ──────────────────────────────

export interface WidgetPref {
  visible: boolean
  order: number
}

export type WidgetPrefsMap = Record<string, WidgetPref>

const STORAGE_KEY = (role: string) => `nexora_dashboard_v1_${role}`

const DEFAULT_PREFS: Record<string, WidgetPrefsMap> = {
  dirigeant: {
    'kpi-dirigeant':           { visible: true,  order: 0 },
    'transports-attente':      { visible: true,  order: 1 },
    'alertes-critiques':       { visible: true,  order: 2 },
    'activite-recente':        { visible: true,  order: 3 },
  },
  exploitant: {
    'kpi-exploitant':          { visible: true,  order: 0 },
    'transports-attente':      { visible: true,  order: 1 },
    'alertes-chrono':          { visible: true,  order: 2 },
    'carte-vehicules':         { visible: true,  order: 3 },
  },
  commercial: {
    'kpi-commercial':          { visible: true,  order: 0 },
    'pipeline-prospects':      { visible: true,  order: 1 },
    'carte-clients':           { visible: true,  order: 2 },
    'suggestion-ia':           { visible: true,  order: 3 },
  },
  admin: {
    'kpi-dirigeant':           { visible: true,  order: 0 },
    'transports-attente':      { visible: true,  order: 1 },
    'alertes-chrono':          { visible: true,  order: 2 },
    'pipeline-prospects':      { visible: true,  order: 3 },
  },
}

export function loadPrefs(role: string): WidgetPrefsMap {
  const defaults = DEFAULT_PREFS[role] ?? DEFAULT_PREFS['dirigeant']
  try {
    const raw = localStorage.getItem(STORAGE_KEY(role))
    if (!raw) return { ...defaults }
    const saved = JSON.parse(raw) as WidgetPrefsMap
    // Merge defaults with saved (new widgets get default state)
    const merged: WidgetPrefsMap = { ...defaults }
    for (const [id, pref] of Object.entries(saved)) {
      if (id in merged) merged[id] = pref
    }
    return merged
  } catch {
    return { ...defaults }
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

export function sortedWidgets(prefs: WidgetPrefsMap): string[] {
  return Object.entries(prefs)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([id]) => id)
}
