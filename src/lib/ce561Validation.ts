import { looseSupabase } from '@/lib/supabaseLoose'

export type CEAlertLevel = 'bloquant' | 'avertissement'

export type CEAlert = {
  code: string
  type: CEAlertLevel
  message: string
}

export type PlanningDropAuditInput = {
  otId: string
  conducteurId: string | null
  startISO: string
  endISO: string
}

export type PlanningDropAuditResult = {
  alerts: CEAlert[]
  source: 'database' | 'defaults'
}

type RuleCode =
  | 'CONDUITE_JOUR_MAX'
  | 'CONDUITE_JOUR_ETENDU'
  | 'CONDUITE_HEBDO_MAX'
  | 'CONDUITE_BI_HEBDO_MAX'
  | 'REPOS_JOURNALIER_NORMAL'
  | 'REPOS_JOURNALIER_REDUIT'
  | 'REPOS_HEBDO_NORMAL'
  | 'REPOS_HEBDO_REDUIT'
  | 'NB_REPOS_REDUIT_MAX'
  | 'JOURS_CONSECUTIFS_MAX'
  | 'CONDUITE_CONTINUE_MAX'
  | 'PAUSE_MIN'

const DEFAULT_RULES: Record<RuleCode, number> = {
  CONDUITE_JOUR_MAX: 540,
  CONDUITE_JOUR_ETENDU: 600,
  CONDUITE_HEBDO_MAX: 3360,
  CONDUITE_BI_HEBDO_MAX: 5400,
  REPOS_JOURNALIER_NORMAL: 660,
  REPOS_JOURNALIER_REDUIT: 540,
  REPOS_HEBDO_NORMAL: 2700,
  REPOS_HEBDO_REDUIT: 1440,
  NB_REPOS_REDUIT_MAX: 3,
  JOURS_CONSECUTIFS_MAX: 6,
  CONDUITE_CONTINUE_MAX: 270,
  PAUSE_MIN: 45,
}

const RULE_CODES: RuleCode[] = [
  'CONDUITE_JOUR_MAX',
  'CONDUITE_JOUR_ETENDU',
  'CONDUITE_HEBDO_MAX',
  'CONDUITE_BI_HEBDO_MAX',
  'REPOS_JOURNALIER_NORMAL',
  'REPOS_JOURNALIER_REDUIT',
  'REPOS_HEBDO_NORMAL',
  'REPOS_HEBDO_REDUIT',
  'NB_REPOS_REDUIT_MAX',
  'JOURS_CONSECUTIFS_MAX',
  'CONDUITE_CONTINUE_MAX',
  'PAUSE_MIN',
]

function minutesDiff(startISO: string, endISO: string): number {
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.max(0, Math.round((end - start) / 60000))
}

function isoDay(iso: string): string {
  return iso.slice(0, 10)
}

function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(day: string, days: number): string {
  const date = parseDay(day)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

function getMonday(day: string): string {
  const date = parseDay(day)
  const weekDay = date.getDay()
  date.setDate(date.getDate() - (weekDay === 0 ? 6 : weekDay - 1))
  return toISODate(date)
}

function activityDurationMinutes(row: { date_debut?: string; date_fin?: string | null; duree_minutes?: number | null }): number {
  if (row.duree_minutes != null && Number.isFinite(Number(row.duree_minutes))) {
    return Math.max(0, Number(row.duree_minutes))
  }
  if (!row.date_debut || !row.date_fin) return 0
  return minutesDiff(row.date_debut, row.date_fin)
}

async function loadRules(): Promise<{ rules: Record<RuleCode, number>; source: 'database' | 'defaults' }> {
  const fallback = { rules: DEFAULT_RULES, source: 'defaults' as const }
  const query = await looseSupabase
    .from('parametre_regle')
    .select('code_regle, valeur')
    .in('code_regle', RULE_CODES)

  if (query.error || !Array.isArray(query.data)) return fallback

  const fromDb: Partial<Record<RuleCode, number>> = {}
  for (const row of query.data as Array<{ code_regle?: string; valeur?: number }>) {
    if (!row.code_regle || row.valeur == null) continue
    if (RULE_CODES.includes(row.code_regle as RuleCode)) {
      fromDb[row.code_regle as RuleCode] = Number(row.valeur)
    }
  }

  return {
    rules: {
      CONDUITE_JOUR_MAX: fromDb.CONDUITE_JOUR_MAX ?? DEFAULT_RULES.CONDUITE_JOUR_MAX,
      CONDUITE_JOUR_ETENDU: fromDb.CONDUITE_JOUR_ETENDU ?? DEFAULT_RULES.CONDUITE_JOUR_ETENDU,
      CONDUITE_HEBDO_MAX: fromDb.CONDUITE_HEBDO_MAX ?? DEFAULT_RULES.CONDUITE_HEBDO_MAX,
      CONDUITE_BI_HEBDO_MAX: fromDb.CONDUITE_BI_HEBDO_MAX ?? DEFAULT_RULES.CONDUITE_BI_HEBDO_MAX,
      REPOS_JOURNALIER_NORMAL: fromDb.REPOS_JOURNALIER_NORMAL ?? DEFAULT_RULES.REPOS_JOURNALIER_NORMAL,
      REPOS_JOURNALIER_REDUIT: fromDb.REPOS_JOURNALIER_REDUIT ?? DEFAULT_RULES.REPOS_JOURNALIER_REDUIT,
      REPOS_HEBDO_NORMAL: fromDb.REPOS_HEBDO_NORMAL ?? DEFAULT_RULES.REPOS_HEBDO_NORMAL,
      REPOS_HEBDO_REDUIT: fromDb.REPOS_HEBDO_REDUIT ?? DEFAULT_RULES.REPOS_HEBDO_REDUIT,
      NB_REPOS_REDUIT_MAX: fromDb.NB_REPOS_REDUIT_MAX ?? DEFAULT_RULES.NB_REPOS_REDUIT_MAX,
      JOURS_CONSECUTIFS_MAX: fromDb.JOURS_CONSECUTIFS_MAX ?? DEFAULT_RULES.JOURS_CONSECUTIFS_MAX,
      CONDUITE_CONTINUE_MAX: fromDb.CONDUITE_CONTINUE_MAX ?? DEFAULT_RULES.CONDUITE_CONTINUE_MAX,
      PAUSE_MIN: fromDb.PAUSE_MIN ?? DEFAULT_RULES.PAUSE_MIN,
    },
    source: Object.keys(fromDb).length > 0 ? 'database' : 'defaults',
  }
}

export async function validatePlanningDropAudit(input: PlanningDropAuditInput): Promise<PlanningDropAuditResult> {
  const alerts: CEAlert[] = []
  if (!input.conducteurId) return { alerts, source: 'defaults' }

  const day = isoDay(input.startISO)
  const monday = getMonday(day)
  const sunday = addDays(monday, 6)
  const biWeekStart = addDays(monday, -7)
  const historyStart = `${addDays(day, -56)}T00:00:00`

  const [{ rules, source }, conducteurRes, overlapRes, tachyRes, lastActivityRes, otHistoryRes] = await Promise.all([
    loadRules(),
    looseSupabase
      .from('conducteurs')
      .select('permis_expiration, fco_expiration, carte_tachy_expiration')
      .eq('id', input.conducteurId)
      .maybeSingle(),
    looseSupabase
      .from('ordres_transport')
      .select('id, date_chargement_prevue, date_livraison_prevue, statut')
      .eq('conducteur_id', input.conducteurId)
      .neq('id', input.otId)
      .neq('statut', 'annule')
      .gte('date_livraison_prevue', input.startISO)
      .lte('date_chargement_prevue', input.endISO),
    looseSupabase
      .from('tachygraphe_entrees')
      .select('type_activite, date_debut, date_fin, duree_minutes')
      .eq('conducteur_id', input.conducteurId)
      .gte('date_debut', historyStart)
      .lt('date_debut', `${day}T23:59:59`),
    looseSupabase
      .from('tachygraphe_entrees')
      .select('date_fin')
      .eq('conducteur_id', input.conducteurId)
      .in('type_activite', ['conduite', 'travail', 'disponibilite', 'autre'])
      .not('date_fin', 'is', null)
      .lt('date_fin', input.startISO)
      .order('date_fin', { ascending: false })
      .limit(1),
    looseSupabase
      .from('ordres_transport')
      .select('date_chargement_prevue, date_livraison_prevue')
      .eq('conducteur_id', input.conducteurId)
      .neq('statut', 'annule')
      .gte('date_chargement_prevue', addDays(day, -20))
      .lte('date_chargement_prevue', day),
  ])

  if (!conducteurRes.error && conducteurRes.data) {
    const conducteur = conducteurRes.data as {
      permis_expiration?: string | null
      fco_expiration?: string | null
      carte_tachy_expiration?: string | null
    }
    if (conducteur.permis_expiration && conducteur.permis_expiration < day) {
      alerts.push({ code: 'PERMIS_EXPIRE', type: 'bloquant', message: 'Permis CE expire.' })
    }
    if (conducteur.fco_expiration && conducteur.fco_expiration < day) {
      alerts.push({ code: 'FCO_EXPIREE', type: 'bloquant', message: 'FIMO/FCO expiree.' })
    }
    if (conducteur.carte_tachy_expiration && conducteur.carte_tachy_expiration < day) {
      alerts.push({ code: 'CARTE_EXPIREE', type: 'bloquant', message: 'Carte conducteur expiree.' })
    }
  }

  if (!overlapRes.error && Array.isArray(overlapRes.data) && overlapRes.data.length > 0) {
    alerts.push({
      code: 'CHEVAUCHEMENT',
      type: 'bloquant',
      message: `Conflit horaire detecte avec ${overlapRes.data.length} mission(s) existante(s).`,
    })
  }

  const missionMinutes = minutesDiff(input.startISO, input.endISO)
  const tachyRows = Array.isArray(tachyRes.data)
    ? (tachyRes.data as Array<{
      type_activite?: string
      date_debut?: string
      date_fin?: string | null
      duree_minutes?: number | null
    }>)
    : []
  const drivingRows = tachyRows.filter(row => row.type_activite === 'conduite')
  const restRows = tachyRows.filter(row => row.type_activite === 'repos')

  if (tachyRows.length === 0) {
    alerts.push({
      code: 'DONNEES_TACHY_ABSENTES',
      type: 'avertissement',
      message: 'Aucune donnee tachygraphe recente: controle CE561 partiel.',
    })
  }

  const alreadyDrivenMinutes = drivingRows
    .filter(row => row.date_debut && isoDay(row.date_debut) === day)
    .reduce((sum, row) => sum + activityDurationMinutes(row), 0)

  const weekDriven = drivingRows
    .filter(row => row.date_debut && isoDay(row.date_debut) >= monday && isoDay(row.date_debut) <= sunday)
    .reduce((sum, row) => sum + activityDurationMinutes(row), 0)

  const biWeekDriven = drivingRows
    .filter(row => row.date_debut && isoDay(row.date_debut) >= biWeekStart && isoDay(row.date_debut) <= sunday)
    .reduce((sum, row) => sum + activityDurationMinutes(row), 0)

  const weekProjected = weekDriven + missionMinutes
  const biWeekProjected = biWeekDriven + missionMinutes
  const projected = alreadyDrivenMinutes + missionMinutes

  if (projected > rules.CONDUITE_JOUR_ETENDU) {
    alerts.push({
      code: 'CONDUITE_JOUR_MAX',
      type: 'bloquant',
      message: `Conduite journaliere estimee ${projected} min (> ${rules.CONDUITE_JOUR_ETENDU} min).`,
    })
  } else if (projected > rules.CONDUITE_JOUR_MAX) {
    alerts.push({
      code: 'CONDUITE_JOUR_ETENDU',
      type: 'avertissement',
      message: `Conduite journaliere etendue ${projected} min (> ${rules.CONDUITE_JOUR_MAX} min).`,
    })
  }

  // Art. 7 CE561 — conduite continue > 4h30 sans pause de 45 min
  // On calcule la conduite continue depuis la derniere pause/repos sur la journee, puis on projette la mission
  const todayDriveRowsSorted = drivingRows
    .filter(row => row.date_debut && isoDay(row.date_debut) === day)
    .sort((a, b) => (a.date_debut ?? '').localeCompare(b.date_debut ?? ''))
  const pauseRowsToday = tachyRows
    .filter(row => row.type_activite === 'repos' && row.date_debut && isoDay(row.date_debut) === day)
    .concat(tachyRows.filter(row => row.type_activite === 'pause' && row.date_debut && isoDay(row.date_debut) === day))
    .sort((a, b) => (a.date_debut ?? '').localeCompare(b.date_debut ?? ''))

  // Derniere pause qualifiante (>= PAUSE_MIN) avant la mission projetee
  const qualifyingPauseBefore = [...pauseRowsToday]
    .filter(row => row.date_fin && row.date_fin < input.startISO)
    .filter(row => activityDurationMinutes(row) >= rules.PAUSE_MIN)
    .pop()

  const continueStartISO = qualifyingPauseBefore?.date_fin ?? `${day}T00:00:00`
  // Conduite accumulee depuis la derniere pause qualifiante jusqu'au debut de la mission
  const continueDrivenBeforeMission = todayDriveRowsSorted
    .filter(row => row.date_debut && row.date_debut >= continueStartISO && row.date_debut < input.startISO)
    .reduce((sum, row) => sum + activityDurationMinutes(row), 0)
  const continueTotalProjected = continueDrivenBeforeMission + missionMinutes

  if (continueTotalProjected > rules.CONDUITE_CONTINUE_MAX) {
    const hasPauseDuringMission = pauseRowsToday.some(
      row => row.date_debut && row.date_debut >= input.startISO && activityDurationMinutes(row) >= rules.PAUSE_MIN,
    )
    if (!hasPauseDuringMission) {
      if (tachyRows.length > 0) {
        alerts.push({
          code: 'PAUSE_OBLIGATOIRE',
          type: 'bloquant',
          message: `Conduite continue estimee ${continueTotalProjected} min sans pause suffisante (> ${rules.CONDUITE_CONTINUE_MAX} min, Art. 7 CE561).`,
        })
      } else {
        alerts.push({
          code: 'PAUSE_A_VERIFIER',
          type: 'avertissement',
          message: `Mission > ${rules.CONDUITE_CONTINUE_MAX} min — verifie la pause obligatoire de ${rules.PAUSE_MIN} min (Art. 7 CE561). Donnees tachy absentes.`,
        })
      }
    }
  }

  if (weekProjected > rules.CONDUITE_HEBDO_MAX) {
    alerts.push({
      code: 'CONDUITE_HEBDO_MAX',
      type: 'bloquant',
      message: `Conduite hebdomadaire estimee ${weekProjected} min (> ${rules.CONDUITE_HEBDO_MAX} min).`,
    })
  }

  if (biWeekProjected > rules.CONDUITE_BI_HEBDO_MAX) {
    alerts.push({
      code: 'CONDUITE_BI_HEBDO_MAX',
      type: 'bloquant',
      message: `Conduite bi-hebdomadaire estimee ${biWeekProjected} min (> ${rules.CONDUITE_BI_HEBDO_MAX} min).`,
    })
  }

  if (restRows.length > 0) {
    const maxWeeklyRestByWeek: Record<string, number> = {}
    for (const row of restRows) {
      if (!row.date_debut) continue
      const weekKey = getMonday(isoDay(row.date_debut))
      const duration = activityDurationMinutes(row)
      maxWeeklyRestByWeek[weekKey] = Math.max(maxWeeklyRestByWeek[weekKey] ?? 0, duration)
    }

    const previousWeek = addDays(monday, -7)
    const prevWeekRest = maxWeeklyRestByWeek[previousWeek] ?? 0
    if (prevWeekRest < rules.REPOS_HEBDO_REDUIT) {
      alerts.push({
        code: 'REPOS_HEBDO_INSUFFISANT',
        type: 'bloquant',
        message: `Repos hebdomadaire precedent ${prevWeekRest} min (< ${rules.REPOS_HEBDO_REDUIT} min).`,
      })
    } else if (prevWeekRest < rules.REPOS_HEBDO_NORMAL) {
      alerts.push({
        code: 'REPOS_HEBDO_REDUIT',
        type: 'avertissement',
        message: `Repos hebdomadaire precedent reduit ${prevWeekRest} min (< ${rules.REPOS_HEBDO_NORMAL} min).`,
      })
    }

    let reducedWeeklyRestCount = 0
    for (let i = 1; i <= 6; i += 1) {
      const weekKey = addDays(monday, -7 * i)
      const duration = maxWeeklyRestByWeek[weekKey] ?? 0
      if (duration >= rules.REPOS_HEBDO_REDUIT && duration < rules.REPOS_HEBDO_NORMAL) {
        reducedWeeklyRestCount += 1
      }
    }
    if (reducedWeeklyRestCount > rules.NB_REPOS_REDUIT_MAX) {
      alerts.push({
        code: 'NB_REPOS_HEBDO_REDUIT_MAX',
        type: 'bloquant',
        message: `Repos hebdomadaires reduits: ${reducedWeeklyRestCount} sur 6 semaines (> ${rules.NB_REPOS_REDUIT_MAX}).`,
      })
    }
  } else {
    alerts.push({
      code: 'REPOS_HEBDO_NON_CALCULABLE',
      type: 'avertissement',
      message: 'Aucune donnee de repos exploitable pour evaluer le repos hebdomadaire.',
    })
  }

  if (!lastActivityRes.error && Array.isArray(lastActivityRes.data) && lastActivityRes.data.length > 0) {
    const lastEnd = (lastActivityRes.data[0] as { date_fin?: string | null }).date_fin
    if (lastEnd) {
      const restMinutes = minutesDiff(lastEnd, input.startISO)
      if (restMinutes < rules.REPOS_JOURNALIER_REDUIT) {
        alerts.push({
          code: 'REPOS_INSUFFISANT',
          type: 'bloquant',
          message: `Repos journalier estime ${restMinutes} min (< ${rules.REPOS_JOURNALIER_REDUIT} min).`,
        })
      } else if (restMinutes < rules.REPOS_JOURNALIER_NORMAL) {
        alerts.push({
          code: 'REPOS_REDUIT',
          type: 'avertissement',
          message: `Repos journalier reduit ${restMinutes} min (< ${rules.REPOS_JOURNALIER_NORMAL} min).`,
        })
      }
    }
  } else {
    alerts.push({
      code: 'REPOS_NON_CALCULABLE',
      type: 'avertissement',
      message: 'Historique d activite insuffisant: repos journalier non calculable de facon fiable.',
    })
  }

  const workedDays = new Set<string>()
  for (const row of drivingRows) {
    if (row.date_debut) workedDays.add(isoDay(row.date_debut))
  }
  if (!otHistoryRes.error && Array.isArray(otHistoryRes.data)) {
    for (const row of otHistoryRes.data as Array<{
      date_chargement_prevue?: string | null
      date_livraison_prevue?: string | null
    }>) {
      const start = row.date_chargement_prevue?.slice(0, 10)
      const end = (row.date_livraison_prevue ?? row.date_chargement_prevue)?.slice(0, 10)
      if (!start || !end) continue
      let cursor = parseDay(start)
      const endDate = parseDay(end)
      let safety = 0
      while (cursor.getTime() <= endDate.getTime() && safety < 14) {
        workedDays.add(toISODate(cursor))
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
        safety += 1
      }
    }
  }
  if ((otHistoryRes.error || !Array.isArray(otHistoryRes.data) || otHistoryRes.data.length === 0) && drivingRows.length === 0) {
    alerts.push({
      code: 'DONNEES_PLANNING_FAIBLES',
      type: 'avertissement',
      message: 'Historique planning/tachy limite: calcul des jours consecutifs approximatif.',
    })
  }
  workedDays.add(day)

  let consecutiveDays = 0
  let cursor = parseDay(day)
  for (let i = 0; i < 30; i += 1) {
    const key = toISODate(cursor)
    if (!workedDays.has(key)) break
    consecutiveDays += 1
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1)
  }

  if (consecutiveDays > rules.JOURS_CONSECUTIFS_MAX) {
    alerts.push({
      code: 'JOURS_CONSECUTIFS_MAX',
      type: 'bloquant',
      message: `Sequence de ${consecutiveDays} jours travailles consecutifs (> ${rules.JOURS_CONSECUTIFS_MAX}).`,
    })
  }

  return { alerts, source }
}
