import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { ST_EN_COURS, TRANSPORT_STATUS_LABELS } from '@/lib/transportCourses'
import { looseSupabase } from '@/lib/supabaseLoose'
import { listExpenseTicketsForViewer } from '@/lib/expenseTickets'
import { listPayrollSlips, calculatePayrollPreview } from '@/lib/payroll'
import { getEmployeeRecord } from '@/lib/employeeRecords'

// ─── Types ────────────────────────────────────────────────────────────────────

type MissionAujourd = {
  id: string
  reference: string
  statut: string
  statut_transport: string | null
  statut_operationnel: string | null
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  distance_km: number | null
  nature_marchandise: string | null
  client_nom: string
  vehicule_label: string | null
  chargement_label: string | null
  livraison_label: string | null
  contact_chargement: string | null
  contact_livraison: string | null
}

type AlerteDoc = {
  type: string
  expiration: string
  joursRestants: number
}

type MessageCount = { count: number }

type TachyData = {
  dailyMinutes: number
  weeklyMinutes: number
  remainingMinutes: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHeure(iso: string | null) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateCourte(iso: string | null) {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function statutLabel(s: string) {
  const map: Record<string, string> = {
    ...TRANSPORT_STATUS_LABELS,
    brouillon: 'Brouillon', confirme: 'Confirmee', planifie: 'Planifiee',
    en_cours: 'En cours', livre: 'Livree', facture: 'Facturee', annule: 'Annulee',
  }
  return map[s] ?? s
}

function statutColor(s: string) {
  if (ST_EN_COURS.includes(s as never) || s === 'en_cours') return 'text-amber-400'
  if (s === 'termine' || s === 'livre' || s === 'facture') return 'text-emerald-400'
  if (s === 'annule') return 'text-red-400'
  return 'text-blue-400'
}

function docLabel(type: string) {
  const map: Record<string, string> = {
    permis: 'Permis', fimo: 'FIMO', fcos: 'FCO', carte_tachy: 'Carte tachy',
    visite_medicale: 'Visite medicale', adr: 'ADR',
  }
  return map[type] ?? type
}

// ─── Icônes ───────────────────────────────────────────────────────────────────

function IconMission() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M6 19c0-2.2 1.8-4 4-4h4a4 4 0 1 0-4-4H8a4 4 0 1 1 0-8h10" /><circle cx="18" cy="3" r="1.4" /><circle cx="6" cy="21" r="1.4" /></svg>
}
function IconClock() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
}
function IconEuro() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M17 7a6 6 0 1 0 0 10M3 10h10M3 14h10" /></svg>
}
function IconFrais() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M7 3h10v18l-3-2-2 2-2-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>
}
function IconChat() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
}
function IconWarning() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
}
function IconArrow() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
}
function IconCalendar() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function DashboardConducteur() {
  const { profil, role } = useAuth()

  const [missionsAujourd, setMissionsAujourd] = useState<MissionAujourd[]>([])
  const [missionsSemaine, setMissionsSemaine] = useState<{ id: string; reference: string; date: string | null; statut: string; statut_transport: string | null }[]>([])
  const [alertesDocs, setAlertesDocs] = useState<AlerteDoc[]>([])
  const [msgCount, setMsgCount] = useState(0)
  const [fraisCount, setFraisCount] = useState(0)
  const [tachyData, setTachyData] = useState<TachyData | null>(null)
  const [dernierBulletin, setDernierBulletin] = useState<{ periodLabel: string; netToPay: number } | null>(null)
  const [salaireEstimation, setSalaireEstimation] = useState<{ netEstime: number; tauxHoraire: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const prenom = profil?.prenom ?? 'Conducteur'

  const jourSemaine = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const jourCapitalize = jourSemaine.charAt(0).toUpperCase() + jourSemaine.slice(1)

  // ── Chargement données ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!profil) return

    async function load() {
      setLoading(true)

      // 1. Trouver le conducteur lié au profil connecté
      const emailNorm = (profil?.email ?? '').toLowerCase().trim()
      const { data: condData } = await supabase
        .from('conducteurs')
        .select('id, nom, prenom, email, permis_expiration, fco_expiration, carte_tachy_expiration')
        .eq('statut', 'actif')

      const conducteur = (condData ?? []).find((c: { email: string | null }) =>
        c.email && c.email.toLowerCase().trim() === emailNorm,
      ) as {
        id: string; nom: string; prenom: string; email: string | null
        permis_expiration: string | null; fco_expiration: string | null; carte_tachy_expiration: string | null
      } | undefined

      const condId = conducteur?.id ?? null

      // 2. Alerts docs expirations
      if (conducteur) {
        const today = new Date()
        const docs: AlerteDoc[] = []
        for (const [type, exp] of [
          ['permis', conducteur.permis_expiration],
          ['fcos', conducteur.fco_expiration],
          ['carte_tachy', conducteur.carte_tachy_expiration],
        ] as [string, string | null][]) {
          if (!exp) continue
          const diff = Math.ceil((new Date(exp).getTime() - today.getTime()) / 86400000)
          if (diff <= 60) docs.push({ type, expiration: exp, joursRestants: diff })
        }
        setAlertesDocs(docs)
      }

      // 3. Missions : en cours + aujourd'hui + prochaines (7 jours)
      if (condId) {
        const now = new Date()
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
        const semaineFin = new Date(now); semaineFin.setDate(semaineFin.getDate() + 7); semaineFin.setHours(23, 59, 59, 999)

        const { data: ots } = await supabase
          .from('ordres_transport')
          .select('id, reference, statut, statut_transport, statut_operationnel, date_chargement_prevue, date_livraison_prevue, distance_km, nature_marchandise, client_id, vehicule_id, clients!inner(nom)')
          .eq('conducteur_id', condId)
          .not('statut_transport', 'in', '("termine","annule")')
          .order('date_chargement_prevue', { ascending: true, nullsFirst: false })
          .limit(10)

        const allOts = ((ots ?? []) as unknown[]).map((o: unknown) => {
          const row = o as Record<string, unknown>
          const clientsRaw = row.clients
          const clientNom = (Array.isArray(clientsRaw) ? (clientsRaw[0] as { nom: string } | undefined)?.nom : (clientsRaw as { nom?: string } | null)?.nom) ?? ''
          return { ...row, client_nom: clientNom } as {
            id: string; reference: string; statut: string; statut_transport: string | null; statut_operationnel: string | null
            date_chargement_prevue: string | null; date_livraison_prevue: string | null
            distance_km: number | null; nature_marchandise: string | null; client_nom: string
            vehicule_id: string | null
          }
        })

        // Vehicule labels
        const vehiculeIds = [...new Set(allOts.map(o => o.vehicule_id).filter(Boolean))]
        let vehiculeMap: Record<string, string> = {}
        if (vehiculeIds.length > 0) {
          const { data: vData } = await supabase
            .from('vehicules')
            .select('id, immatriculation, marque')
            .in('id', vehiculeIds as string[])
          ;(vData ?? []).forEach((v: { id: string; immatriculation: string; marque: string | null }) => {
            vehiculeMap[v.id] = [v.marque, v.immatriculation].filter(Boolean).join(' ')
          })
        }

        // Etapes mission → adresses + contacts
        const otIds = allOts.map(o => o.id)
        let stepsMap: Record<string, { chargement: string | null; livraison: string | null; contactCharg: string | null; contactLiv: string | null }> = {}
        if (otIds.length > 0) {
          const { data: steps } = await supabase
            .from('etapes_mission')
            .select('ot_id, type_etape, ville, adresse_libre, code_postal, contact_nom, contact_tel')
            .in('ot_id', otIds)
          ;(steps ?? []).forEach((s: {
            ot_id: string; type_etape: string; ville: string | null
            adresse_libre: string | null; code_postal: string | null
            contact_nom: string | null; contact_tel: string | null
          }) => {
            if (!stepsMap[s.ot_id]) stepsMap[s.ot_id] = { chargement: null, livraison: null, contactCharg: null, contactLiv: null }
            const adresse = [s.ville, s.code_postal ? `(${s.code_postal})` : null].filter(Boolean).join(' ') || s.adresse_libre || null
            const contact = [s.contact_nom, s.contact_tel].filter(Boolean).join(' · ') || null
            if (s.type_etape === 'chargement') {
              stepsMap[s.ot_id].chargement = adresse
              stepsMap[s.ot_id].contactCharg = contact
            }
            if (s.type_etape === 'livraison') {
              stepsMap[s.ot_id].livraison = adresse
              stepsMap[s.ot_id].contactLiv = contact
            }
          })
        }

        // Filtre missions du jour / en cours
        const missionsDuJour = allOts
          .filter(o => {
            if (ST_EN_COURS.includes(o.statut_transport as never)) return true
            const charg = o.date_chargement_prevue ? new Date(o.date_chargement_prevue) : null
            const liv = o.date_livraison_prevue ? new Date(o.date_livraison_prevue) : null
            const isToday = charg ? charg >= todayStart && charg <= new Date(todayStart.getTime() + 86400000) : false
            const isOngoing = charg && liv ? charg <= now && liv >= todayStart : false
            return isToday || isOngoing
          })
          .map(o => ({
            id: o.id, reference: o.reference, statut: o.statut,
            statut_transport: o.statut_transport,
            statut_operationnel: o.statut_operationnel,
            date_chargement_prevue: o.date_chargement_prevue,
            date_livraison_prevue: o.date_livraison_prevue,
            distance_km: o.distance_km, nature_marchandise: o.nature_marchandise,
            client_nom: o.client_nom,
            vehicule_label: o.vehicule_id ? (vehiculeMap[o.vehicule_id] ?? null) : null,
            chargement_label: stepsMap[o.id]?.chargement ?? null,
            livraison_label: stepsMap[o.id]?.livraison ?? null,
            contact_chargement: stepsMap[o.id]?.contactCharg ?? null,
            contact_livraison: stepsMap[o.id]?.contactLiv ?? null,
          }))

        setMissionsAujourd(missionsDuJour)

        // Semaine complète à venir (hors aujourd'hui)
        const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1)
        setMissionsSemaine(
          allOts
            .filter(o => {
              const d = o.date_chargement_prevue ? new Date(o.date_chargement_prevue) : null
              return d && d >= tomorrow && d <= semaineFin
            })
            .slice(0, 5)
            .map(o => ({ id: o.id, reference: o.reference, date: o.date_chargement_prevue, statut: o.statut, statut_transport: o.statut_transport })),
        )
      }

      // 4. Messages non lus
      if (condId) {
        const now2 = new Date()
        const dayStart = new Date(now2); dayStart.setHours(0, 0, 0, 0)
        const weekStart = new Date(now2); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0)
        const { data: tachyEntries } = await supabase
          .from('tachygraphe_entrees')
          .select('type_activite, duree_minutes, date_debut')
          .eq('conducteur_id', condId)
          .gte('date_debut', weekStart.toISOString())

        let dailyMinutes = 0
        let weeklyMinutes = 0
        ;(tachyEntries ?? []).forEach((e: { type_activite: string; duree_minutes: number | null; date_debut: string | null }) => {
          if (e.type_activite !== 'conduite') return
          const dur = e.duree_minutes ?? 0
          if (e.date_debut && new Date(e.date_debut) >= dayStart) dailyMinutes += dur
          weeklyMinutes += dur
        })
        setTachyData({ dailyMinutes, weeklyMinutes, remainingMinutes: Math.max(0, 540 - dailyMinutes) })
      }

      // 5. Messages non lus
      if (profil?.id) {
        const { data: convData } = await looseSupabase
          .from('tchat_participants')
          .select('conversation_id')
          .eq('profil_id', profil.id)

        const convIds = ((convData ?? []) as Array<{ conversation_id: string }>).map(r => r.conversation_id)
        if (convIds.length > 0) {
          const { count } = await looseSupabase
            .from('tchat_messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', convIds)
            .neq('profil_id', profil.id)
            .eq('read', false) as unknown as MessageCount & { count: number | null }
          setMsgCount(count ?? 0)
        }
      }

      // 5. Frais en attente
      if (profil?.id && role) {
        const tickets = listExpenseTicketsForViewer(profil.id, role)
        setFraisCount(tickets.filter(t => t.status === 'submitted' || t.status === 'rh_approved').length)
      }

      // 6. Dernier bulletin + estimation mois en cours
      if (profil?.id) {
        const slips = listPayrollSlips(profil.id)
        if (slips.length > 0) {
          setDernierBulletin({ periodLabel: slips[0].periodLabel, netToPay: slips[0].netToPay })
        }
        // Estimation mois en cours si pas encore de bulletin ce mois
        const record = getEmployeeRecord(profil.id)
        if (record && (record.hourlyRate ?? 0) > 0) {
          const now3 = new Date()
          const moisLabels = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre']
          const currentPeriod = `${moisLabels[now3.getMonth()]} ${now3.getFullYear()}`
          const alreadyPaid = slips.some(s => s.periodLabel === currentPeriod)
          if (!alreadyPaid) {
            const preview = calculatePayrollPreview(record, {
              periodLabel: currentPeriod,
              workedHours: 151.67, overtime25Hours: 0, overtime50Hours: 0,
              absenceHours: 0, heuresNuit: 0, joursTravailles: 21,
              sourceHeures: 'manuel',
              performanceBonus: 0, exceptionalBonus: 0,
              indemniteRepasExo: 0, indemniteGrandRoutierExo: 0, indemniteTpExo: 0,
              depassementBaremeCotisable: 0, nbRepas: 0, nbJoursGr: 0,
              manualExpenseAdjustment: 0,
              incomeTaxWithholding: 0, advanceDeduction: 0, otherDeduction: 0,
            })
            setSalaireEstimation({ netEstime: preview.netToPay, tauxHoraire: record.hourlyRate ?? 0 })
          }
        }
      }

      setLoading(false)
    }

    void load()
  }, [profil, role])

  // ─── Rendu ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
      </div>
    )
  }

  const missionActive = missionsAujourd[0] ?? null

  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">

      {/* ── En-tête ── */}
      <div className="rounded-2xl border bg-[color:var(--surface)] p-5">
        <p className="text-xs text-[color:var(--muted)]">{jourCapitalize}</p>
        <h1 className="mt-0.5 text-xl font-bold text-[color:var(--text)]">
          Bonjour {prenom} 👋
        </h1>
        {missionActive?.vehicule_label && (
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Véhicule affecté — <span className="font-medium text-[color:var(--text)]">{missionActive.vehicule_label}</span>
          </p>
        )}
      </div>

      {/* ── ALERTES DOCUMENTS ── */}
      {alertesDocs.length > 0 && (
        <div className="space-y-2">
          {alertesDocs.map(alerte => (
            <div
              key={alerte.type}
              className={[
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm',
                alerte.joursRestants <= 7
                  ? 'border-red-500/40 bg-red-500/10 text-red-400'
                  : alerte.joursRestants <= 30
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    : 'border-blue-500/30 bg-blue-500/8 text-blue-400',
              ].join(' ')}
            >
              <IconWarning />
              <span className="font-medium">{docLabel(alerte.type)}</span>
              <span className="ml-auto font-bold">
                {alerte.joursRestants <= 0
                  ? 'EXPIRÉ'
                  : `dans ${alerte.joursRestants} j`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── MISSION EN COURS ── */}
      {missionActive ? (
        <div className="rounded-2xl border border-[color:var(--primary)]/30 bg-[color:var(--surface)] overflow-hidden">
          <div className="flex items-center gap-2 bg-[color:var(--primary)]/10 px-5 py-3">
            <IconMission />
            <span className="font-semibold text-[color:var(--text)]">Mission en cours</span>
            <span className={['ml-auto text-xs font-bold', statutColor(missionActive.statut_transport ?? missionActive.statut)].join(' ')}>
              {statutLabel(missionActive.statut_transport ?? missionActive.statut)}
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs text-[color:var(--muted)]">Référence · Client</p>
              <p className="mt-0.5 font-semibold text-[color:var(--text)]">
                {missionActive.reference} — {missionActive.client_nom}
              </p>
              {missionActive.nature_marchandise && (
                <p className="text-xs text-[color:var(--muted)] mt-0.5">{missionActive.nature_marchandise}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[color:var(--bg)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--muted)]">Chargement</p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">
                  {formatHeure(missionActive.date_chargement_prevue)}
                </p>
                <p className="text-xs text-[color:var(--muted)] mt-0.5">{formatDateCourte(missionActive.date_chargement_prevue)}</p>
                {missionActive.chargement_label && (
                  <p className="text-xs text-[color:var(--text)] mt-1 font-medium">{missionActive.chargement_label}</p>
                )}
                {missionActive.contact_chargement && (
                  <a
                    href={`tel:${missionActive.contact_chargement.split(' · ')[1] ?? ''}`}
                    className="mt-1 flex items-center gap-1 text-xs text-[color:var(--primary)] underline-offset-2 hover:underline"
                  >
                    📞 {missionActive.contact_chargement}
                  </a>
                )}
              </div>

              <div className="rounded-xl bg-[color:var(--bg)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--muted)]">Livraison</p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">
                  {formatHeure(missionActive.date_livraison_prevue)}
                </p>
                <p className="text-xs text-[color:var(--muted)] mt-0.5">{formatDateCourte(missionActive.date_livraison_prevue)}</p>
                {missionActive.livraison_label && (
                  <p className="text-xs text-[color:var(--text)] mt-1 font-medium">{missionActive.livraison_label}</p>
                )}
                {missionActive.contact_livraison && (
                  <a
                    href={`tel:${missionActive.contact_livraison.split(' · ')[1] ?? ''}`}
                    className="mt-1 flex items-center gap-1 text-xs text-[color:var(--primary)] underline-offset-2 hover:underline"
                  >
                    📞 {missionActive.contact_livraison}
                  </a>
                )}
              </div>
            </div>

            {missionActive.distance_km && missionActive.distance_km > 0 && (
              <p className="text-xs text-[color:var(--muted)]">
                Distance estimée — <span className="font-medium text-[color:var(--text)]">{missionActive.distance_km} km</span>
              </p>
            )}

            <Link
              to="/feuille-route"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--primary)] text-base font-bold text-white shadow transition hover:opacity-90 active:scale-[0.98]"
            >
              <IconMission />
              Ouvrir la feuille de route
              <IconArrow />
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-[color:var(--surface)] p-6 text-center">
          <p className="text-[color:var(--muted)] text-sm">Aucune mission aujourd'hui</p>
          <Link
            to="/feuille-route"
            className="mt-3 inline-flex items-center gap-2 text-sm text-[color:var(--primary)] hover:underline"
          >
            Voir toutes les missions <IconArrow />
          </Link>
        </div>
      )}

      {/* ── PLANNING SEMAINE ── */}
      {missionsSemaine.length > 0 && (
        <div className="rounded-2xl border bg-[color:var(--surface)] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[color:var(--border)]">
            <IconCalendar />
            <span className="font-semibold text-[color:var(--text)]">À venir cette semaine</span>
            <Link to="/planning-conducteur" className="ml-auto text-xs text-[color:var(--primary)] hover:underline">Tout voir</Link>
          </div>
          <div className="divide-y divide-[color:var(--border)]">
            {missionsSemaine.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="text-center min-w-[48px]">
                  <p className="text-xs text-[color:var(--muted)]">{formatDateCourte(m.date)}</p>
                </div>
                <p className="text-sm font-medium text-[color:var(--text)] flex-1 truncate">{m.reference}</p>
                <span className={['text-xs font-semibold', statutColor(m.statut_transport ?? m.statut)].join(' ')}>{statutLabel(m.statut_transport ?? m.statut)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WIDGET TACHYGRAPHE ── */}
      {tachyData !== null && (
        <div className={`rounded-2xl border overflow-hidden ${
          tachyData.remainingMinutes <= 0
            ? 'border-red-500/40 bg-red-500/5'
            : tachyData.remainingMinutes <= 90
              ? 'border-amber-500/40 bg-amber-500/5'
              : 'border-[color:var(--border)] bg-[color:var(--surface)]'
        }`}>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[color:var(--border)]">
            <IconClock />
            <span className="font-semibold text-[color:var(--text)]">
              Temps de conduite aujourd'hui
            </span>
            {tachyData.remainingMinutes <= 90 && (
              <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                tachyData.remainingMinutes <= 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
              }`}>
                {tachyData.remainingMinutes <= 0 ? '⛔ LIMITE' : '⚠ BIENTOT'}
              </span>
            )}
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[color:var(--muted)]">
                Conduit : <span className="font-bold text-[color:var(--text)]">{
                  `${Math.floor(tachyData.dailyMinutes / 60)}h${String(tachyData.dailyMinutes % 60).padStart(2, '0')}`
                }</span>
              </span>
              <span className={`font-bold ${
                tachyData.remainingMinutes <= 0 ? 'text-red-500' :
                tachyData.remainingMinutes <= 90 ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                Reste : {
                  tachyData.remainingMinutes <= 0 ? 'STOP'
                  : `${Math.floor(tachyData.remainingMinutes / 60)}h${String(tachyData.remainingMinutes % 60).padStart(2, '0')}`
                }
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  tachyData.remainingMinutes <= 0 ? 'bg-red-500' :
                  tachyData.remainingMinutes <= 90 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.round((tachyData.dailyMinutes / 540) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[color:var(--muted)]">
              <span>0h</span>
              <span>Limite 9h (règl. EU)</span>
            </div>
            {tachyData.weeklyMinutes > 0 && (
              <p className="text-xs text-[color:var(--muted)]">
                Semaine en cours — <span className="font-medium text-[color:var(--text)]">
                  {Math.floor(tachyData.weeklyMinutes / 60)}h{String(tachyData.weeklyMinutes % 60).padStart(2, '0')}
                </span> / 56h max
              </p>
            )}
            <Link to="/tachygraphe" className="flex items-center gap-1 text-xs text-[color:var(--primary)] hover:underline">
              Voir le détail tachygraphe <IconArrow />
            </Link>
          </div>
        </div>
      )}

      {/* ── RACCOURCIS ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Frais */}
        <Link
          to="/frais-rapide"
          className="flex flex-col items-center gap-2 rounded-2xl border bg-[color:var(--surface)] p-4 text-center relative transition hover:border-[color:var(--primary)]/40 active:scale-[0.97]"
        >
          <IconFrais />
          <span className="text-xs font-medium text-[color:var(--text)]">Frais</span>
          {fraisCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
              {fraisCount}
            </span>
          )}
        </Link>

        {/* Messagerie */}
        <Link
          to="/tchat"
          className="flex flex-col items-center gap-2 rounded-2xl border bg-[color:var(--surface)] p-4 text-center relative transition hover:border-[color:var(--primary)]/40 active:scale-[0.97]"
        >
          <IconChat />
          <span className="text-xs font-medium text-[color:var(--text)]">Messages</span>
          {msgCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
              {msgCount > 9 ? '9+' : msgCount}
            </span>
          )}
        </Link>

        {/* Tachygraphe */}
        <Link
          to="/tachygraphe"
          className="flex flex-col items-center gap-2 rounded-2xl border bg-[color:var(--surface)] p-4 text-center transition hover:border-[color:var(--primary)]/40 active:scale-[0.97]"
        >
          <IconClock />
          <span className="text-xs font-medium text-[color:var(--text)]">Tachy</span>
        </Link>
      </div>

      {/* ── ESTIMATION SALAIRE MOIS EN COURS ── */}
      {salaireEstimation && !dernierBulletin && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-blue-500/20">
            <IconEuro />
            <span className="font-semibold text-[color:var(--text)]">Estimation salaire ce mois</span>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">Provisoire</span>
          </div>
          <div className="px-5 py-4">
            <p className="text-2xl font-bold text-[color:var(--text)]">
              {salaireEstimation.netEstime.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
            <p className="text-xs text-[color:var(--muted)] mt-0.5">
              Net estimé · base 151h67 à {salaireEstimation.tauxHoraire.toFixed(2)} €/h · hors primes, IK, GR
            </p>
            <Link to="/paie" className="mt-2 flex items-center gap-1 text-xs text-[color:var(--primary)] hover:underline">
              Voir fiche de paie <IconArrow />
            </Link>
          </div>
        </div>
      )}

      {/* ── DERNIER BULLETIN ── */}
      {dernierBulletin && (
        <div className="rounded-2xl border bg-[color:var(--surface)] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[color:var(--border)]">
            <IconEuro />
            <span className="font-semibold text-[color:var(--text)]">Dernier bulletin</span>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[color:var(--muted)]">{dernierBulletin.periodLabel}</p>
                <p className="mt-1 text-2xl font-bold text-[color:var(--text)]">
                  {dernierBulletin.netToPay.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
                <p className="text-xs text-[color:var(--muted)] mt-0.5">Net à payer</p>
              </div>
              <Link
                to="/paie"
                className="flex items-center gap-1 text-sm text-[color:var(--primary)] hover:underline"
              >
                Voir <IconArrow />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── URGENCE ── */}
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600 mb-3">🚨 Urgence / Signalement</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={async () => {
              let gpsInfo = ''
              if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
                await new Promise<void>(resolve => {
                  navigator.geolocation.getCurrentPosition(
                    pos => {
                      gpsInfo = `\n📍 Ma position GPS : ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
                      resolve()
                    },
                    () => resolve(),
                    { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 },
                  )
                })
              }
              const missionRef = missionsAujourd[0] ? ` — OT ${missionsAujourd[0].reference}` : ''
              const message = encodeURIComponent(`URGENCE${missionRef} — ${new Date().toLocaleTimeString('fr-FR')}${gpsInfo}`)
              window.location.href = `/tchat?autostart=1&prefill=${message}`
            }}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-500 text-base font-bold text-white shadow transition hover:bg-red-600 active:scale-[0.97]"
          >
            🚨 Contacter l'exploitation (urgence)
          </button>
          <Link
            to="/feuille-route"
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line-strong bg-[color:var(--surface)] text-sm font-medium text-[color:var(--text)] transition hover:border-amber-500/40 active:scale-[0.97]"
          >
            🔧 Signaler une panne / incident
          </Link>
        </div>
      </div>

      <div className="h-4" />
    </div>
  )
}
