import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ST_BROUILLON, ST_CONFIRME, ST_EN_COURS, ST_TERMINE } from '@/lib/transportCourses'

interface SyntheseData {
  brouillon: number
  confirme: number
  enCours: number
  livre: number
  alertes30j: number
}

export function WidgetSyntheseOperationnelle() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SyntheseData>({
    brouillon: 0,
    confirme: 0,
    enCours: 0,
    livre: 0,
    alertes30j: 0,
  })

  useEffect(() => {
    async function load() {
      try {
        const [brouillonRes, confirmeRes, enCoursRes, livreRes, alertesRes] = await Promise.all([
          supabase.from('ordres_transport').select('id', { count: 'exact', head: true }).in('statut_transport', ST_BROUILLON),
          supabase.from('ordres_transport').select('id', { count: 'exact', head: true }).in('statut_transport', ST_CONFIRME),
          supabase.from('ordres_transport').select('id', { count: 'exact', head: true }).in('statut_transport', ST_EN_COURS),
          supabase.from('ordres_transport').select('id', { count: 'exact', head: true }).in('statut_transport', ST_TERMINE),
          supabase.from('vue_conducteur_alertes').select('id', { count: 'exact', head: true }).lte('days_remaining', 30),
        ])

        setData({
          brouillon: brouillonRes.count ?? 0,
          confirme: confirmeRes.count ?? 0,
          enCours: enCoursRes.count ?? 0,
          livre: livreRes.count ?? 0,
          alertes30j: alertesRes.count ?? 0,
        })
      } catch {
        setData({
          brouillon: 0,
          confirme: 0,
          enCours: 0,
          livre: 0,
          alertes30j: 0,
        })
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const totalActif = useMemo(
    () => data.brouillon + data.confirme + data.enCours,
    [data.brouillon, data.confirme, data.enCours],
  )

  const metrics = [
    { id: 'brouillon', label: 'Brouillons', value: data.brouillon, tone: 'bg-slate-400' },
    { id: 'confirme', label: 'Confirmes', value: data.confirme, tone: 'bg-amber-500' },
    { id: 'en-cours', label: 'En cours', value: data.enCours, tone: 'bg-blue-600' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs text-slate-500">Flux actif</p>
          <p className="mt-1 text-xl font-semibold text-slate-950">{totalActif}</p>
          <p className="text-xs text-slate-500">OT a traiter</p>
        </div>
        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs text-slate-500">OT livres</p>
          <p className="mt-1 text-xl font-semibold text-slate-950">{data.livre}</p>
          <p className="text-xs text-slate-500">Suivi qualite</p>
        </div>
      </div>

      <div className="space-y-2">
        {metrics.map(metric => {
          const percent = totalActif > 0 ? Math.round((metric.value / totalActif) * 100) : 0
          return (
            <div key={metric.id}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-slate-600">{metric.label}</span>
                <span className="font-semibold text-slate-900">{metric.value} ({percent}%)</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full ${metric.tone}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className={`rounded-xl border px-3 py-2 text-xs ${data.alertes30j > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
        {data.alertes30j > 0
          ? `${data.alertes30j} alertes documents a moins de 30 jours.`
          : 'Aucune alerte document critique.'}
      </div>
    </div>
  )
}
