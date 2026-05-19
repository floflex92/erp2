import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'

// ── Types ─────────────────────────────────────────────────────────────────────

type AlerteTemp = 'ok' | 'attention' | 'depassement' | 'critique' | 'hors_ligne'

type SondeTemp = {
  id: string
  nom: string
  vehicule_id: string
  vehicule_immat: string
  conducteur_nom?: string
  zone: 'cellule_principale' | 'cellule_secondaire' | 'cabine'
  temperature_actuelle: number
  temperature_min_c: number
  temperature_max_c: number
  humidite_pct?: number
  statut: AlerteTemp
  derniere_mesure: string
  historique: { time: string; value: number }[]
  ot_reference?: string
  nature_marchandise?: string
  haccp_actif: boolean
}

type Alerte = {
  id: string
  sonde_id: string
  vehicule_immat: string
  type: 'depassement_max' | 'depassement_min' | 'rupture_chaine' | 'hors_ligne' | 'humidite'
  valeur_observee: number
  valeur_limite: number
  debut: string
  fin?: string
  duree_min?: number
  acquittee: boolean
  action_prise?: string
}

type TabView = 'monitoring' | 'alertes' | 'historique' | 'haccp'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUT_LABELS: Record<AlerteTemp, string> = {
  ok: 'OK',
  attention: 'Attention',
  depassement: 'Dépassement',
  critique: 'Critique',
  hors_ligne: 'Hors ligne',
}

const STATUT_COLORS: Record<AlerteTemp, string> = {
  ok: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  attention: 'bg-amber-100 text-amber-700 border-amber-200',
  depassement: 'bg-orange-100 text-orange-700 border-orange-200',
  critique: 'bg-red-100 text-red-700 border-red-200',
  hors_ligne: 'bg-surface-2 text-muted border-line',
}

const STATUT_DOT: Record<AlerteTemp, string> = {
  ok: 'bg-emerald-500',
  attention: 'bg-amber-500',
  depassement: 'bg-orange-500',
  critique: 'bg-red-500',
  hors_ligne: 'bg-slate-400',
}

const ALERTE_LABELS: Record<Alerte['type'], string> = {
  depassement_max: 'Dépassement max',
  depassement_min: 'Dépassement min',
  rupture_chaine: 'Rupture chaîne du froid',
  hors_ligne: 'Sonde hors ligne',
  humidite: 'Humidité excessive',
}

const ZONE_LABELS: Record<SondeTemp['zone'], string> = {
  cellule_principale: 'Cellule principale',
  cellule_secondaire: 'Cellule secondaire',
  cabine: 'Cabine',
}

// ── Données démo ──────────────────────────────────────────────────────────────

function genHistory(baseTemp: number, count = 12): { time: string; value: number }[] {
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => ({
    time: new Date(now - (count - 1 - i) * 5 * 60 * 1000).toISOString(),
    value: Math.round((baseTemp + (Math.random() - 0.5) * 2) * 10) / 10,
  }))
}

const DEMO_SONDES: SondeTemp[] = [
  {
    id: 's1',
    nom: 'Sonde A — Cellule principale',
    vehicule_id: 'v1',
    vehicule_immat: 'AB-234-CD',
    conducteur_nom: 'Martin Dupont',
    zone: 'cellule_principale',
    temperature_actuelle: 3.2,
    temperature_min_c: 0,
    temperature_max_c: 4,
    humidite_pct: 72,
    statut: 'ok',
    derniere_mesure: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    historique: genHistory(3.1),
    ot_reference: 'OT-2026-0291',
    nature_marchandise: 'Produits laitiers',
    haccp_actif: true,
  },
  {
    id: 's2',
    nom: 'Sonde B — Cellule principale',
    vehicule_id: 'v2',
    vehicule_immat: 'EF-567-GH',
    conducteur_nom: 'Sophie Lefevre',
    zone: 'cellule_principale',
    temperature_actuelle: 5.8,
    temperature_min_c: 2,
    temperature_max_c: 5,
    humidite_pct: 68,
    statut: 'depassement',
    derniere_mesure: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    historique: genHistory(5.2),
    ot_reference: 'OT-2026-0294',
    nature_marchandise: 'Charcuterie',
    haccp_actif: true,
  },
  {
    id: 's3',
    nom: 'Sonde C — Cellule frigo',
    vehicule_id: 'v3',
    vehicule_immat: 'IJ-890-KL',
    conducteur_nom: 'Paul Renard',
    zone: 'cellule_principale',
    temperature_actuelle: -18.4,
    temperature_min_c: -22,
    temperature_max_c: -15,
    humidite_pct: 45,
    statut: 'ok',
    derniere_mesure: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    historique: genHistory(-18.5),
    ot_reference: 'OT-2026-0302',
    nature_marchandise: 'Surgelés',
    haccp_actif: true,
  },
  {
    id: 's4',
    nom: 'Sonde D — Cellule secondaire',
    vehicule_id: 'v4',
    vehicule_immat: 'MN-123-OP',
    conducteur_nom: 'Alice Bernard',
    zone: 'cellule_secondaire',
    temperature_actuelle: 8.9,
    temperature_min_c: 2,
    temperature_max_c: 8,
    humidite_pct: 80,
    statut: 'critique',
    derniere_mesure: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    historique: genHistory(8.5),
    ot_reference: 'OT-2026-0298',
    nature_marchandise: 'Médicaments',
    haccp_actif: true,
  },
  {
    id: 's5',
    nom: 'Sonde E — Cellule principale',
    vehicule_id: 'v5',
    vehicule_immat: 'QR-456-ST',
    zone: 'cellule_principale',
    temperature_actuelle: 0,
    temperature_min_c: 2,
    temperature_max_c: 6,
    humidite_pct: undefined,
    statut: 'hors_ligne',
    derniere_mesure: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    historique: [],
    haccp_actif: false,
  },
]

const DEMO_ALERTES: Alerte[] = [
  { id: 'a1', sonde_id: 's2', vehicule_immat: 'EF-567-GH', type: 'depassement_max', valeur_observee: 5.8, valeur_limite: 5.0, debut: new Date(Date.now() - 18 * 60 * 1000).toISOString(), duree_min: 18, acquittee: false },
  { id: 'a2', sonde_id: 's4', vehicule_immat: 'MN-123-OP', type: 'depassement_max', valeur_observee: 8.9, valeur_limite: 8.0, debut: new Date(Date.now() - 31 * 60 * 1000).toISOString(), duree_min: 31, acquittee: false },
  { id: 'a3', sonde_id: 's5', vehicule_immat: 'QR-456-ST', type: 'hors_ligne', valeur_observee: 0, valeur_limite: 0, debut: new Date(Date.now() - 45 * 60 * 1000).toISOString(), duree_min: 45, acquittee: false },
  { id: 'a4', sonde_id: 's2', vehicule_immat: 'AB-234-CD', type: 'depassement_max', valeur_observee: 4.7, valeur_limite: 4.0, debut: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), fin: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(), duree_min: 28, acquittee: true, action_prise: 'Régulation thermostat effectuée par le conducteur.' },
]

// ── Composants ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-discreet">{label}</p>
      <p className="mt-2 text-2xl font-bold text-heading" style={accent ? { color: accent } : undefined}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  )
}

function TempGauge({ value, min, max }: { value: number; min: number; max: number }) {
  const range = max - min
  const pct = Math.min(100, Math.max(0, ((value - min) / range) * 100))
  const isOk = value >= min && value <= max
  const color = isOk ? '#22c55e' : Math.abs(value - max) < 2 || Math.abs(value - min) < 2 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted w-8 text-right">{min}°</span>
      <div className="relative h-2 flex-1 rounded-full bg-line">
        <div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #bfdbfe, #22c55e, #fef08a, #ef4444)', opacity: 0.3 }} />
        <div
          className="absolute top-1/2 h-3.5 w-1.5 -translate-y-1/2 rounded-full"
          style={{ left: `${pct}%`, background: color, transform: 'translateX(-50%) translateY(-50%)', boxShadow: `0 0 4px ${color}` }}
        />
      </div>
      <span className="text-[10px] text-muted w-8">{max}°</span>
    </div>
  )
}

function MiniChart({ data, color }: { data: { time: string; value: number }[]; color: string }) {
  if (data.length < 2) return <div className="h-12 w-full rounded-lg bg-surface-2 flex items-center justify-center"><span className="text-xs text-muted">Hors ligne</span></div>
  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const w = 200
  const h = 48
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((d.value - min) / range) * (h - 8) - 4
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function fmtDur(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function GestionTemperature() {
  const { role } = useAuth()
  const canEdit = role === 'admin' || role === 'dirigeant' || role === 'exploitant' || role === 'logisticien'

  const [tab, setTab] = useState<TabView>('monitoring')
  const [selected, setSelected] = useState<SondeTemp | null>(null)
  const [alertes, setAlertes] = useState<Alerte[]>(DEMO_ALERTES)

  const stats = useMemo(() => {
    const alertesActives = alertes.filter(a => !a.acquittee).length
    const enDepassement = DEMO_SONDES.filter(s => s.statut === 'depassement' || s.statut === 'critique').length
    const horsLigne = DEMO_SONDES.filter(s => s.statut === 'hors_ligne').length
    const haccp = DEMO_SONDES.filter(s => s.haccp_actif && s.statut === 'ok').length
    return { alertesActives, enDepassement, horsLigne, haccp }
  }, [alertes])

  function acquitterAlerte(id: string, action: string) {
    setAlertes(prev => prev.map(a => a.id === id ? { ...a, acquittee: true, action_prise: action, fin: new Date().toISOString() } : a))
  }

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Gestion température frigo</h1>
          <p className="mt-1 text-sm text-secondary">Suivi temps réel · Alertes seuils · Historique conforme HACCP</p>
        </div>
        {stats.alertesActives > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-semibold text-red-700">{stats.alertesActives} alerte{stats.alertesActives > 1 ? 's' : ''} active{stats.alertesActives > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Sondes actives" value={String(DEMO_SONDES.filter(s => s.statut !== 'hors_ligne').length)} sub={`${DEMO_SONDES.length} total`} />
        <KpiCard label="En dépassement" value={String(stats.enDepassement)} sub="seuil dépassé" accent={stats.enDepassement > 0 ? '#ef4444' : undefined} />
        <KpiCard label="Alertes actives" value={String(stats.alertesActives)} sub="non acquittées" accent={stats.alertesActives > 0 ? '#f59e0b' : undefined} />
        <KpiCard label="HACCP conformes" value={String(stats.haccp)} sub="traçabilité active" accent="#22c55e" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1 w-fit">
        {(['monitoring', 'alertes', 'historique', 'haccp'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`relative rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === t ? 'bg-surface text-heading shadow-sm' : 'text-secondary hover:text-heading'}`}
          >
            {t === 'monitoring' ? 'Monitoring' : t === 'alertes' ? 'Alertes' : t === 'historique' ? 'Historique' : 'HACCP'}
            {t === 'alertes' && stats.alertesActives > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {stats.alertesActives}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Onglet Monitoring */}
      {tab === 'monitoring' && (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Liste sondes */}
          <div className="flex flex-col gap-3 lg:col-span-2">
            {DEMO_SONDES.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s)}
                className={`rounded-2xl border p-4 text-left transition ${selected?.id === s.id ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)]' : 'border-line bg-surface hover:border-line-strong'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${STATUT_DOT[s.statut]}${s.statut === 'critique' || s.statut === 'depassement' ? ' animate-pulse' : ''}`} />
                    <span className="font-semibold text-sm text-heading">{s.vehicule_immat}</span>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUT_COLORS[s.statut]}`}>
                    {STATUT_LABELS[s.statut]}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-heading">{s.statut !== 'hors_ligne' ? `${s.temperature_actuelle}°C` : '—'}</span>
                  <span className="text-xs text-muted">zone [{s.temperature_min_c}°C – {s.temperature_max_c}°C]</span>
                </div>
                {s.statut !== 'hors_ligne' && (
                  <div className="mt-2">
                    <TempGauge value={s.temperature_actuelle} min={s.temperature_min_c} max={s.temperature_max_c} />
                  </div>
                )}
                {s.conducteur_nom && <p className="mt-1.5 text-xs text-muted">{s.conducteur_nom}</p>}
              </button>
            ))}
          </div>

          {/* Détail sonde */}
          <div className="lg:col-span-3">
            {!selected ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2">
                <p className="text-sm text-muted">Sélectionnez une sonde pour le détail</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-line bg-surface p-5">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <h3 className="font-semibold text-heading">{selected.vehicule_immat} · {ZONE_LABELS[selected.zone]}</h3>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUT_COLORS[selected.statut]}`}>
                      {STATUT_LABELS[selected.statut]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-surface-2 px-4 py-3">
                      <p className="text-xs text-secondary">Température actuelle</p>
                      <p className="mt-1 text-2xl font-bold text-heading">{selected.statut !== 'hors_ligne' ? `${selected.temperature_actuelle}°C` : '—'}</p>
                    </div>
                    <div className="rounded-xl bg-surface-2 px-4 py-3">
                      <p className="text-xs text-secondary">Plage admissible</p>
                      <p className="mt-1 text-lg font-bold text-heading">{selected.temperature_min_c}°C – {selected.temperature_max_c}°C</p>
                    </div>
                    {selected.humidite_pct !== undefined && (
                      <div className="rounded-xl bg-surface-2 px-4 py-3">
                        <p className="text-xs text-secondary">Humidité</p>
                        <p className="mt-1 text-lg font-bold text-heading">{selected.humidite_pct}%</p>
                      </div>
                    )}
                    {selected.ot_reference && (
                      <div className="rounded-xl bg-surface-2 px-4 py-3">
                        <p className="text-xs text-secondary">OT associé</p>
                        <p className="mt-1 text-sm font-semibold text-heading">{selected.ot_reference}</p>
                      </div>
                    )}
                  </div>
                  {selected.nature_marchandise && (
                    <p className="mt-3 text-xs text-secondary">Marchandise : <span className="font-semibold text-heading">{selected.nature_marchandise}</span></p>
                  )}
                </div>

                {/* Graphique */}
                <div className="rounded-2xl border border-line bg-surface p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-discreet">Historique 60 dernières minutes</p>
                  {selected.historique.length > 0 ? (
                    <div>
                      <MiniChart
                        data={selected.historique}
                        color={selected.statut === 'ok' ? '#22c55e' : selected.statut === 'critique' ? '#ef4444' : '#f59e0b'}
                      />
                      <div className="mt-2 flex justify-between text-[10px] text-muted">
                        <span>{fmtDT(selected.historique[0]?.time ?? '')}</span>
                        <span>Maintenant</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-center text-muted py-4">Aucune donnée disponible</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Alertes */}
      {tab === 'alertes' && (
        <div className="space-y-3">
          {alertes.filter(a => !a.acquittee).length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              <span className="text-sm font-medium text-emerald-700">Aucune alerte active — toutes les sondes sont conformes.</span>
            </div>
          ) : (
            alertes.filter(a => !a.acquittee).map(alerte => (
              <div key={alerte.id} className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-semibold text-red-800">{ALERTE_LABELS[alerte.type]}</span>
                      <span className="text-xs text-red-600">· {alerte.vehicule_immat}</span>
                    </div>
                    <p className="mt-1 text-sm text-red-700">
                      {alerte.type !== 'hors_ligne' ? `Valeur : ${alerte.valeur_observee}°C (limite : ${alerte.valeur_limite}°C)` : 'Sonde ne répond plus'}
                      {alerte.duree_min ? ` · Depuis ${fmtDur(alerte.duree_min)}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-red-500">Début : {fmtDT(alerte.debut)}</p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => acquitterAlerte(alerte.id, 'Alerte acquittée par l\'exploitant.')}
                      className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      Acquitter
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Alertes acquittées */}
          {alertes.filter(a => a.acquittee).length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-discreet">Historique alertes acquittées</p>
              {alertes.filter(a => a.acquittee).map(alerte => (
                <div key={alerte.id} className="mb-2 rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
                    <span className="text-sm font-medium text-heading">{ALERTE_LABELS[alerte.type]} · {alerte.vehicule_immat}</span>
                    <span className="ml-auto text-xs text-muted">{alerte.duree_min ? fmtDur(alerte.duree_min) : '—'}</span>
                  </div>
                  {alerte.action_prise && <p className="mt-1 text-xs text-muted">{alerte.action_prise}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Onglet Historique */}
      {tab === 'historique' && (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 border-b border-line bg-surface-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-discreet">
            <span>Véhicule & Marchandise</span>
            <span>Temp. actuelle</span>
            <span>Plage</span>
            <span>Dernière mesure</span>
            <span>Statut</span>
          </div>
          {DEMO_SONDES.map(s => (
            <div key={s.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-4 border-b border-line px-5 py-3 last:border-0">
              <div>
                <p className="text-sm font-medium text-heading">{s.vehicule_immat}</p>
                <p className="text-xs text-secondary">{s.nature_marchandise ?? ZONE_LABELS[s.zone]}{s.conducteur_nom ? ` · ${s.conducteur_nom}` : ''}</p>
              </div>
              <span className={`text-sm font-bold ${s.statut === 'ok' ? 'text-emerald-600' : s.statut === 'hors_ligne' ? 'text-muted' : 'text-red-600'}`}>
                {s.statut !== 'hors_ligne' ? `${s.temperature_actuelle}°C` : '—'}
              </span>
              <span className="text-xs text-secondary">{s.temperature_min_c}° – {s.temperature_max_c}°</span>
              <span className="text-xs text-secondary">{fmtDT(s.derniere_mesure)}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUT_COLORS[s.statut]}`}>
                {STATUT_LABELS[s.statut]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Onglet HACCP */}
      {tab === 'haccp' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-4 font-semibold text-heading">Conformité HACCP</h3>
            <div className="space-y-3">
              {DEMO_SONDES.filter(s => s.haccp_actif).map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-heading">{s.vehicule_immat} · {s.nature_marchandise ?? '—'}</p>
                    <p className="text-xs text-muted">Plage {s.temperature_min_c}°C – {s.temperature_max_c}°C · Suivi continu actif</p>
                  </div>
                  <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${STATUT_COLORS[s.statut]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUT_DOT[s.statut]}`} />
                    {STATUT_LABELS[s.statut]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-4 font-semibold text-heading">Export & traçabilité</h3>
            <div className="space-y-3">
              {[
                { label: 'Rapport HACCP journalier', format: 'PDF', icon: '📄' },
                { label: 'Historique températures', format: 'CSV', icon: '📊' },
                { label: 'Journal des alertes', format: 'PDF', icon: '🔔' },
                { label: 'Certificat de conformité chaîne du froid', format: 'PDF', icon: '✅' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-heading">{item.label}</p>
                      <p className="text-xs text-muted">Format {item.format}</p>
                    </div>
                  </div>
                  <button type="button" className="rounded-lg border border-line-strong bg-surface px-3 py-1 text-xs font-medium text-secondary transition hover:text-heading">
                    Exporter
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
