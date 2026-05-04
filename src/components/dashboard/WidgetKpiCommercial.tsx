import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ST_EN_COURS } from '@/lib/transportCourses'

interface KpiData {
  nb_clients: number
  ca_mois: number
  nb_ot_en_cours: number
  nb_factures_retard: number
  nb_prospects_actifs: number
  taux_conversion: number
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone: 'blue' | 'green' | 'amber' | 'red' | 'emerald'
}) {
  const accent = {
    blue: '#2563EB',
    green: '#16A34A',
    emerald: '#16A34A',
    amber: '#D97706',
    red: '#DC2626',
  }[tone]

  return (
    <div className="nx-kpi-card px-4 py-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <p className="nx-kpi-label">{label}</p>
      </div>
      <p className="mt-2 nx-kpi-value">{value}</p>
      <p className="mt-1 nx-kpi-meta">{sub}</p>
    </div>
  )
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M EUR`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k EUR`
  return `${n} EUR`
}

export function WidgetKpiCommercial() {
  const [data, setData] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

        const [clientsRes, margeRes, otRes, facturesRes, prospectsRes, prospectsGagnesRes] = await Promise.all([
          supabase.from('clients').select('id', { count: 'exact', head: true }),
          supabase.from('vue_marge_ot').select('chiffre_affaires').gte('created_at', startOfMonth),
          supabase.from('ordres_transport').select('id', { count: 'exact', head: true }).in('statut_transport', ST_EN_COURS),
          supabase.from('factures').select('id', { count: 'exact', head: true }).eq('statut', 'en_retard'),
          (supabase.from('prospects' as any).select('id', { count: 'exact', head: true }).in('statut', ['lead', 'qualification', 'devis_envoye', 'negociation', 'closing']) as any),
          (supabase.from('prospects' as any).select('id', { count: 'exact', head: true }).eq('statut', 'gagne') as any),
        ])

        const ca = (margeRes.data ?? []).reduce((s, r) => s + (r.chiffre_affaires ?? 0), 0)
        const totalProspects = (prospectsRes.count ?? 0) + (prospectsGagnesRes.count ?? 0)
        const tauxConv = totalProspects > 0 ? Math.round(((prospectsGagnesRes.count ?? 0) / totalProspects) * 100) : 0

        setData({
          nb_clients: clientsRes.count ?? 0,
          ca_mois: ca,
          nb_ot_en_cours: otRes.count ?? 0,
          nb_factures_retard: facturesRes.count ?? 0,
          nb_prospects_actifs: prospectsRes.count ?? 0,
          taux_conversion: tauxConv,
        })
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
      </div>
    )
  }

  const d = data ?? { nb_clients: 0, ca_mois: 0, nb_ot_en_cours: 0, nb_factures_retard: 0, nb_prospects_actifs: 0, taux_conversion: 0 }

  return (
    <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
      <KpiCard label="CLIENTS ACTIFS" value={String(d.nb_clients)} sub="Portefeuille" tone="blue" />
      <KpiCard label="CA CE MOIS" value={fmt(d.ca_mois)} sub="Chiffre d'affaires HT" tone="emerald" />
      <KpiCard label="OT EN COURS" value={String(d.nb_ot_en_cours)} sub="Livraisons actives" tone="blue" />
      <KpiCard label="PROSPECTS ACTIFS" value={String(d.nb_prospects_actifs)} sub="Pipeline en cours" tone="amber" />
      <KpiCard label="TAUX CONVERSION" value={`${d.taux_conversion}%`} sub="Prospects gagnes" tone="green" />
      <KpiCard label="FACTURES EN RETARD" value={String(d.nb_factures_retard)} sub="A relancer" tone={d.nb_factures_retard > 0 ? 'red' : 'green'} />
    </div>
  )
}
