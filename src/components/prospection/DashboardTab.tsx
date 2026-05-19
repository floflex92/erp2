import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type ProspectStat = {
  id: string
  nom_entreprise: string
  statut: string
  montant_mensuel_estime: number | null
  probabilite_closing: number | null
  commercial_nom: string | null
  ville: string | null
  created_at: string
  updated_at: string
  date_derniere_action: string | null
}

type DevisStat = {
  id: string
  statut: string
  prix_propose_ht: number | null
  marge_pct: number | null
  created_at: string
}

type OtRetourVide = {
  id: string
  reference: string
  vehicule_id: string | null
  date_livraison_prevue: string | null
  livraison_ville?: string
}

type SiteLogistique = {
  id: string
  ville: string | null
  code_postal: string | null
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const STATUS_PROB: Record<string, number> = {
  lead: 10, qualification: 25, devis_envoye: 40, negociation: 65, closing: 85,
}

const ACTIVE_STATUSES = ['lead', 'qualification', 'devis_envoye', 'negociation', 'closing']

const FUNNEL_STAGES = [
  { key: 'lead',          label: 'Lead',         color: '#93c5fd' },
  { key: 'qualification', label: 'Qualification', color: '#7dd3fc' },
  { key: 'devis_envoye',  label: 'Devis envoyé', color: '#86efac' },
  { key: 'negociation',   label: 'Négociation',  color: '#fde68a' },
  { key: 'closing',       label: 'Closing',      color: '#fdba74' },
  { key: 'gagne',         label: 'Gagné',        color: '#6ee7b7' },
]

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function formatCurrency(v: number | null, decimals = 0): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: decimals }).format(v)
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return -999
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

// ─── Sous-composants ─────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="nx-card p-5">
      <p className="text-xs nx-subtle">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${highlight ? 'text-emerald-400' : ''}`}>{value}</p>
      {sub && <p className="mt-1 text-xs nx-subtle">{sub}</p>}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function DashboardTab() {
  const [prospects, setProspects]       = useState<ProspectStat[]>([])
  const [devis, setDevis]               = useState<DevisStat[]>([])
  const [otRetour, setOtRetour]         = useState<OtRetourVide[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const sb = supabase as any

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const datePlus3 = new Date()
        datePlus3.setDate(datePlus3.getDate() + 4)

        const [{ data: p }, { data: d }, { data: ot }, { data: sites }] = await Promise.all([
          sb.from('prospects').select('id,nom_entreprise,statut,montant_mensuel_estime,probabilite_closing,commercial_nom,ville,created_at,updated_at,date_derniere_action'),
          sb.from('devis_transport').select('id,statut,prix_propose_ht,marge_pct,created_at'),
          // OT en cours avec livraison dans les 4 prochains jours et sans retour planifié
          sb.from('ordres_transport')
            .select('id,reference,vehicule_id,date_livraison_prevue,livraison_site_id')
            .not('date_livraison_prevue', 'is', null)
            .not('vehicule_id', 'is', null)
            .lte('date_livraison_prevue', datePlus3.toISOString().split('T')[0])
            .gte('date_livraison_prevue', new Date().toISOString().split('T')[0])
            .not('statut', 'in', '("annule","facture")')
            .limit(20),
          sb.from('sites_logistiques').select('id,ville,code_postal').limit(500),
        ])

        setProspects((p ?? []) as ProspectStat[])
        setDevis((d ?? []) as DevisStat[])

        // Map sites pour lookup rapide
        const smap: Record<string, SiteLogistique> = {}
        for (const s of (sites ?? []) as SiteLogistique[]) { smap[s.id] = s }

        // Enrichir OT avec ville de livraison
        const otEnriched = ((ot ?? []) as any[]).map(o => ({
          ...o,
          livraison_ville: o.livraison_site_id ? smap[o.livraison_site_id]?.ville ?? '?' : '?',
        }))
        setOtRetour(otEnriched as OtRetourVide[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chargement impossible.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  // ── Calculs ──
  const stats = useMemo(() => {
    const now = Date.now()
    const t90 = now - 90 * 86400000

    const actifs = prospects.filter(p => ACTIVE_STATUSES.includes(p.statut))

    // Pipeline pondéré (Σ montant × proba)
    const pipelinePondere = actifs.reduce((sum, p) => {
      const prob = p.probabilite_closing ?? STATUS_PROB[p.statut] ?? 20
      return sum + (p.montant_mensuel_estime ?? 0) * (prob / 100)
    }, 0)

    // Taux de conversion 90j
    const recent90 = prospects.filter(p => new Date(p.created_at).getTime() >= t90)
    const gagnes90 = recent90.filter(p => p.statut === 'gagne')
    const conversionTaux = recent90.length === 0 ? 0 : Math.round((gagnes90.length / recent90.length) * 100)

    // CA devis acceptés, marge moy.
    const devisAcceptes = devis.filter(d => d.statut === 'accepte')
    const caAccepte = devisAcceptes.reduce((s, d) => s + (d.prix_propose_ht ?? 0), 0)
    const margeMoy = devisAcceptes.length === 0 ? null
      : devisAcceptes.reduce((s, d) => s + (d.marge_pct ?? 0), 0) / devisAcceptes.length

    // Devis ouverts
    const devisOuverts = devis.filter(d => ['brouillon', 'envoye'].includes(d.statut))
    const caOuverts = devisOuverts.reduce((s, d) => s + (d.prix_propose_ht ?? 0), 0)

    // Durée cycle moyen (jours entre created_at et statut gagne — approx: pour les gagnés les + récents)
    const gagnesAvecDate = gagnes90.filter(p => p.date_derniere_action)
    const cycleMoy = gagnesAvecDate.length === 0 ? null
      : Math.round(gagnesAvecDate.reduce((sum, p) => {
          const duree = daysSince(p.created_at) - daysSince(p.date_derniere_action)
          return sum + Math.abs(duree)
        }, 0) / gagnesAvecDate.length)

    // Répartition par stage pour le funnel
    const funnelData = FUNNEL_STAGES.map(stage => ({
      ...stage,
      count: prospects.filter(p => p.statut === stage.key).length,
    }))
    const maxCount = Math.max(1, ...funnelData.map(s => s.count))

    // Top prospects (pipeline pondéré individuel, classés)
    const topProspects = [...actifs]
      .map(p => ({
        ...p,
        score: (p.montant_mensuel_estime ?? 0) * ((p.probabilite_closing ?? STATUS_PROB[p.statut] ?? 20) / 100),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    // Prospects inactifs (sans action depuis > 14j)
    const inactifs = prospects
      .filter(p => ACTIVE_STATUSES.includes(p.statut) && daysSince(p.date_derniere_action ?? p.updated_at) > 14)
      .slice(0, 4)

    return { pipelinePondere, conversionTaux, caAccepte, margeMoy, caOuverts, cycleMoy, funnelData, maxCount, topProspects, inactifs }
  }, [prospects, devis])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border px-4 py-3 text-sm"
          style={{ borderColor: 'rgba(244,114,182,0.25)', background: 'rgba(127,29,29,0.18)', color: '#fecdd3' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm nx-subtle">Chargement du dashboard...</div>
      ) : (
        <>
          {/* ── KPIs principaux ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Pipeline pondéré" value={formatCurrency(stats.pipelinePondere)} sub="par mois (proba × potentiel)" highlight />
            <KpiCard label="Devis ouverts"    value={formatCurrency(stats.caOuverts)} sub={`${devis.filter(d => ['brouillon','envoye'].includes(d.statut)).length} devis`} />
            <KpiCard label="Taux conversion 90j" value={`${stats.conversionTaux}%`} sub="Leads → Gagné" />
            <KpiCard label="Marge moy. signée" value={stats.margeMoy != null ? `${stats.margeMoy.toFixed(1)}%` : '—'} sub={`CA signé ${formatCurrency(stats.caAccepte)}`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">

            {/* ── Funnel pipeline ── */}
            <div className="nx-card p-5 space-y-4">
              <p className="text-sm font-semibold">Funnel commercial</p>
              <div className="space-y-2">
                {stats.funnelData.map(stage => (
                  <div key={stage.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="nx-subtle">{stage.label}</span>
                      <span className="font-medium">{stage.count}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
                      <div className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.max(4, Math.round((stage.count / stats.maxCount) * 100))}%`,
                          background: stage.color,
                          opacity: stage.count === 0 ? 0.2 : 1,
                        }} />
                    </div>
                  </div>
                ))}
              </div>
              {stats.cycleMoy != null && (
                <p className="text-xs nx-subtle pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  Durée cycle moyen (estimée) : <span className="font-semibold">{stats.cycleMoy} jours</span>
                </p>
              )}
            </div>

            {/* ── Top prospects chauds ── */}
            <div className="nx-card overflow-hidden">
              <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm font-semibold">Top prospects — pipeline pondéré</p>
              </div>
              {stats.topProspects.length === 0 ? (
                <p className="px-4 py-6 text-xs nx-subtle">Aucun prospect actif.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {stats.topProspects.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-5 text-center text-xs font-bold nx-subtle">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.nom_entreprise}</p>
                        <p className="text-xs nx-subtle">{p.commercial_nom ?? '—'} {p.ville ? `• ${p.ville}` : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-emerald-400">{formatCurrency(p.score)}</p>
                        <p className="text-xs nx-subtle">/mois pondéré</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Opportunités retour vide ── */}
            <div className="nx-card overflow-hidden">
              <div className="border-b px-4 py-3" style={{ borderColor: 'rgba(14,165,233,0.3)', background: 'rgba(14,165,233,0.05)' }}>
                <p className="text-sm font-semibold text-sky-300">🚛 Opportunités retour à vide (4 prochains jours)</p>
              </div>
              {otRetour.length === 0 ? (
                <p className="px-4 py-6 text-xs nx-subtle">Aucun camion à vide détecté sur les 4 prochains jours.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {otRetour.map(ot => {
                    const jours = daysUntil(ot.date_livraison_prevue)
                    return (
                      <div key={ot.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">OT {ot.reference}</p>
                          <p className="text-xs nx-subtle">
                            Livraison à <span className="font-semibold">{(ot as any).livraison_ville}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            jours === 0 ? 'bg-amber-500/15 text-amber-300' :
                            jours <= 1 ? 'bg-orange-500/15 text-orange-300' :
                            'bg-sky-500/15 text-sky-300'
                          }`}>
                            {jours === 0 ? "Aujourd'hui" : `Dans ${jours}j`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs nx-subtle">Contacter des prospects dans la zone de livraison pour proposer un retour à tarif préférentiel.</p>
              </div>
            </div>

            {/* ── Prospects inactifs ── */}
            <div className="nx-card overflow-hidden">
              <div className="border-b px-4 py-3" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
                <p className="text-sm font-semibold text-amber-300">😴 Prospects inactifs (+14j sans action)</p>
              </div>
              {stats.inactifs.length === 0 ? (
                <p className="px-4 py-6 text-xs nx-subtle">Tous les prospects ont été contactés récemment. ✅</p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {stats.inactifs.map(p => {
                    const days = daysSince(p.date_derniere_action ?? p.updated_at)
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.nom_entreprise}</p>
                          <p className="text-xs nx-subtle">{p.commercial_nom ?? '—'} {p.ville ? `• ${p.ville}` : ''}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-300">
                            {days}j sans activité
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>

          {/* ── Synthèse performances par commercial ── */}
          {(() => {
            const byCommercial: Record<string, { leads: number; gagnes: number; potentiel: number }> = {}
            for (const p of prospects) {
              const nom = p.commercial_nom ?? 'Non attribué'
              if (!byCommercial[nom]) byCommercial[nom] = { leads: 0, gagnes: 0, potentiel: 0 }
              byCommercial[nom].leads++
              if (p.statut === 'gagne') byCommercial[nom].gagnes++
              if (ACTIVE_STATUSES.includes(p.statut)) byCommercial[nom].potentiel += p.montant_mensuel_estime ?? 0
            }
            const entries = Object.entries(byCommercial).sort((a, b) => b[1].potentiel - a[1].potentiel)
            if (entries.length === 0) return null
            return (
              <div className="nx-card overflow-hidden">
                <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-semibold">Performance par commercial</p>
                </div>
                <div className="overflow-x-auto nx-scrollbar">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                        {['Commercial', 'Prospects', 'Gagnés', 'Taux', 'Potentiel pipeline'].map(h => (
                          <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(([nom, data]) => {
                        const taux = data.leads === 0 ? 0 : Math.round((data.gagnes / data.leads) * 100)
                        return (
                          <tr key={nom} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                            <td className="px-4 py-3 font-medium">{nom}</td>
                            <td className="px-4 py-3 nx-subtle">{data.leads}</td>
                            <td className="px-4 py-3 nx-subtle">{data.gagnes}</td>
                            <td className="px-4 py-3">
                              <span className={`font-semibold ${taux >= 30 ? 'text-emerald-400' : taux >= 15 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {taux}%
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold">{formatCurrency(data.potentiel)}<span className="text-xs font-normal nx-subtle">/mois</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

        </>
      )}
    </div>
  )
}
