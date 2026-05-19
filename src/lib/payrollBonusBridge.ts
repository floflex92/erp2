import { supabase } from '@/lib/supabase'

type BonusCalculationLight = {
  id: string
  company_id: number
  profil_id: string | null
  period_key: string
  total_calculated_bonus: number
}

type LinkResult = {
  status: 'linked' | 'accounting_failed'
  accountingEntryId: string | null
  errorMessage: string | null
}

export type PayrollBonusLinkStatus = {
  payrollSlipId: string
  payrollPeriodLabel: string
  status: 'pending' | 'linked' | 'accounting_failed'
  accountingEntryId: string | null
  errorMessage: string | null
  updatedAt: string
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function periodLabelToKey(periodLabel: string): string | null {
  const mois: Record<string, string> = {
    janvier: '01',
    fevrier: '02',
    mars: '03',
    avril: '04',
    mai: '05',
    juin: '06',
    juillet: '07',
    aout: '08',
    septembre: '09',
    octobre: '10',
    novembre: '11',
    decembre: '12',
  }

  const normalized = normalize(periodLabel)
  const parts = normalized.split(/\s+/)
  if (parts.length !== 2) return null
  const month = mois[parts[0]]
  const year = Number.parseInt(parts[1], 10)
  if (!month || Number.isNaN(year)) return null
  return `${year}-${month}`
}

function matchesPayrollPeriod(periodKey: string, periodLabel: string) {
  const key = periodLabelToKey(periodLabel)
  const normalizedPeriodKey = normalize(periodKey)
  if (normalizedPeriodKey === normalize(periodLabel)) return true
  if (!key) return false
  return normalizedPeriodKey.startsWith(key)
}

function toMoney(value: number) {
  return Math.round(value * 100) / 100
}

async function createAccountingEntryForPayrollBonus(params: {
  companyId: number
  profilId: string
  periodLabel: string
  payrollSlipId: string
  amount: number
}): Promise<string> {
  const amount = toMoney(params.amount)
  const exercice = new Date().getFullYear()

  const { data: journals, error: journalsError } = await supabase
    .from('compta_journaux')
    .select('id, code_journal, libelle')
    .eq('actif', true)
    .order('code_journal')

  if (journalsError || !journals || journals.length === 0) {
    throw new Error(`Aucun journal comptable actif disponible (${journalsError?.message ?? 'inconnu'}).`)
  }

  const journal = journals.find(j => j.code_journal === 'OD') ?? journals.find(j => j.code_journal === 'PA') ?? journals[0]

  const { data: maxMvtRows, error: maxMvtError } = await (supabase as any)
    .from('compta_ecritures')
    .select('numero_mouvement')
    .eq('journal_id', journal.id)
    .eq('exercice', exercice)
    .order('numero_mouvement', { ascending: false })
    .limit(1)

  if (maxMvtError) throw new Error(`Lecture numero de mouvement impossible (${maxMvtError.message}).`)

  const nextMvt = ((maxMvtRows?.[0]?.numero_mouvement as number | undefined) ?? 0) + 1

  const ecritureLibelle = `Prime objectifs paie ${params.periodLabel} (${params.profilId.slice(0, 8)})`

  const { data: ecriture, error: ecritureError } = await (supabase as any)
    .from('compta_ecritures')
    .insert({
      journal_id: journal.id,
      date_ecriture: new Date().toISOString().slice(0, 10),
      exercice,
      numero_mouvement: nextMvt,
      libelle: ecritureLibelle,
      statut: 'brouillon',
    })
    .select('id')
    .single()

  if (ecritureError || !ecriture?.id) {
    throw new Error(`Creation ecriture comptable impossible (${ecritureError?.message ?? 'inconnu'}).`)
  }

  const lines = [
    {
      ecriture_id: ecriture.id,
      ordre: 1,
      compte_code: '641000',
      libelle_ligne: `Charge prime objectifs paie ${params.periodLabel}`,
      debit: amount,
      credit: 0,
      axe_chauffeur_id: params.profilId,
      axe_mission_id: null,
      axe_client_id: null,
      axe_camion_id: null,
    },
    {
      ecriture_id: ecriture.id,
      ordre: 2,
      compte_code: '421000',
      libelle_ligne: `Dette salariale prime objectifs paie ${params.periodLabel}`,
      debit: 0,
      credit: amount,
      axe_chauffeur_id: params.profilId,
      axe_mission_id: null,
      axe_client_id: null,
      axe_camion_id: null,
    },
  ]

  const { error: linesError } = await (supabase as any).from('compta_ecriture_lignes').insert(lines)
  if (linesError) throw new Error(`Creation lignes comptables impossible (${linesError.message}).`)

  const { error: validateError } = await (supabase as any).rpc('compta_valider_ecriture', { p_ecriture_id: ecriture.id })
  if (validateError) {
    throw new Error(`Ecriture creee mais validation impossible (${validateError.message}).`)
  }

  const { error: linkError } = await (supabase as any)
    .from('bonus_payroll_accounting_links')
    .update({
      company_id: params.companyId,
      compta_ecriture_id: ecriture.id,
      statut: 'linked',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('payroll_slip_id', params.payrollSlipId)

  if (linkError) {
    throw new Error(`Ecriture validee mais lien bonus/paie non mis a jour (${linkError.message}).`)
  }

  return ecriture.id
}

export async function listValidatedUnpaidBonusesForPayroll(profilId: string, periodLabel: string): Promise<{ items: BonusCalculationLight[]; totalAmount: number }> {
  const { data, error } = await (supabase as any)
    .from('bonus_calculations')
    .select('id, company_id, profil_id, period_key, total_calculated_bonus')
    .eq('profil_id', profilId)
    .eq('is_validated', true)
    .eq('is_paid', false)
    .gt('total_calculated_bonus', 0)

  if (error) throw new Error(`Lecture des bonus valides impossible (${error.message}).`)

  const rows = ((data as BonusCalculationLight[] | null) ?? []).filter(row =>
    matchesPayrollPeriod(row.period_key, periodLabel),
  )

  const totalAmount = toMoney(rows.reduce((sum, row) => sum + (row.total_calculated_bonus ?? 0), 0))
  return { items: rows, totalAmount }
}

export async function linkPayrollBonusesToAccounting(params: {
  profilId: string
  periodLabel: string
  payrollSlipId: string
  payrollPeriodLabel: string
  bonusCalculations: BonusCalculationLight[]
}): Promise<LinkResult> {
  if (params.bonusCalculations.length === 0) {
    return { status: 'linked', accountingEntryId: null, errorMessage: null }
  }

  // Anti-doublon: si un lien est deja rapproche pour ce bulletin, on ne recree pas d'OD.
  const { data: existingLinkedRows, error: existingLinkedError } = await (supabase as any)
    .from('bonus_payroll_accounting_links')
    .select('compta_ecriture_id')
    .eq('payroll_slip_id', params.payrollSlipId)
    .eq('statut', 'linked')
    .not('compta_ecriture_id', 'is', null)
    .limit(1)

  if (!existingLinkedError && existingLinkedRows && existingLinkedRows.length > 0) {
    const existingEntryId = (existingLinkedRows[0].compta_ecriture_id as string | null) ?? null
    return { status: 'linked', accountingEntryId: existingEntryId, errorMessage: null }
  }

  const companyId = params.bonusCalculations[0].company_id
  const totalAmount = toMoney(params.bonusCalculations.reduce((sum, item) => sum + item.total_calculated_bonus, 0))

  const linkRows = params.bonusCalculations.map(item => ({
    company_id: item.company_id,
    bonus_calculation_id: item.id,
    profil_id: params.profilId,
    period_key: item.period_key,
    payroll_slip_id: params.payrollSlipId,
    payroll_period_label: params.payrollPeriodLabel,
    statut: 'pending',
  }))

  const { error: insertLinksError } = await (supabase as any)
    .from('bonus_payroll_accounting_links')
    .upsert(linkRows, { onConflict: 'bonus_calculation_id,payroll_slip_id' })

  if (insertLinksError) {
    return { status: 'accounting_failed', accountingEntryId: null, errorMessage: `Creation des liens bonus/paie impossible (${insertLinksError.message}).` }
  }

  try {
    const accountingEntryId = await createAccountingEntryForPayrollBonus({
      companyId,
      profilId: params.profilId,
      periodLabel: params.periodLabel,
      payrollSlipId: params.payrollSlipId,
      amount: totalAmount,
    })

    const paymentReference = `PAYROLL:${params.payrollSlipId};COMPTA:${accountingEntryId}`

    const { error: markPaidError } = await (supabase as any)
      .from('bonus_calculations')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        payment_reference: paymentReference,
      })
      .in('id', params.bonusCalculations.map(item => item.id))

    if (markPaidError) {
      throw new Error(`Mise a jour des bonus en paye impossible (${markPaidError.message}).`)
    }

    return { status: 'linked', accountingEntryId, errorMessage: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue de rapprochement comptable.'

    await (supabase as any)
      .from('bonus_payroll_accounting_links')
      .update({
        statut: 'accounting_failed',
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('payroll_slip_id', params.payrollSlipId)

    return { status: 'accounting_failed', accountingEntryId: null, errorMessage: message }
  }
}

export async function retryPayrollBonusAccounting(payrollSlipId: string): Promise<LinkResult> {
  const { data: links, error: linksError } = await (supabase as any)
    .from('bonus_payroll_accounting_links')
    .select('bonus_calculation_id, profil_id, payroll_period_label')
    .eq('payroll_slip_id', payrollSlipId)

  if (linksError || !links || links.length === 0) {
    return {
      status: 'accounting_failed',
      accountingEntryId: null,
      errorMessage: `Aucun lien bonus/paie trouve pour ce bulletin (${linksError?.message ?? 'inconnu'}).`,
    }
  }

  const profilId = (links.find((row: { profil_id: string | null }) => !!row.profil_id)?.profil_id as string | null) ?? null
  const payrollPeriodLabel = ((links[0] as { payroll_period_label: string }).payroll_period_label ?? '') as string
  if (!profilId) {
    return {
      status: 'accounting_failed',
      accountingEntryId: null,
      errorMessage: 'Profil absent sur les liens bonus/paie, reprise impossible.',
    }
  }

  const bonusIds = Array.from(new Set((links as Array<{ bonus_calculation_id: string }>).map(row => row.bonus_calculation_id)))
  const { data: bonusRows, error: bonusError } = await (supabase as any)
    .from('bonus_calculations')
    .select('id, company_id, profil_id, period_key, total_calculated_bonus')
    .in('id', bonusIds)
    .eq('is_validated', true)
    .eq('is_paid', false)
    .gt('total_calculated_bonus', 0)

  if (bonusError) {
    return {
      status: 'accounting_failed',
      accountingEntryId: null,
      errorMessage: `Lecture bonus pour reprise impossible (${bonusError.message}).`,
    }
  }

  const bonusCalculations = ((bonusRows as BonusCalculationLight[] | null) ?? []).filter(row =>
    matchesPayrollPeriod(row.period_key, payrollPeriodLabel),
  )

  if (bonusCalculations.length === 0) {
    return {
      status: 'accounting_failed',
      accountingEntryId: null,
      errorMessage: 'Aucun bonus valide/non paye a reprendre sur cette periode.',
    }
  }

  return linkPayrollBonusesToAccounting({
    profilId,
    periodLabel: payrollPeriodLabel,
    payrollSlipId,
    payrollPeriodLabel,
    bonusCalculations,
  })
}

export async function listPayrollBonusLinkStatuses(profilId: string): Promise<PayrollBonusLinkStatus[]> {
  const { data, error } = await (supabase as any)
    .from('bonus_payroll_accounting_links')
    .select('payroll_slip_id, payroll_period_label, statut, compta_ecriture_id, error_message, updated_at')
    .eq('profil_id', profilId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Lecture des statuts de rapprochement impossible (${error.message}).`)

  const rows = (data as Array<{
    payroll_slip_id: string
    payroll_period_label: string
    statut: 'pending' | 'linked' | 'accounting_failed'
    compta_ecriture_id: string | null
    error_message: string | null
    updated_at: string
  }> | null) ?? []

  return rows.map(row => ({
    payrollSlipId: row.payroll_slip_id,
    payrollPeriodLabel: row.payroll_period_label,
    status: row.statut,
    accountingEntryId: row.compta_ecriture_id,
    errorMessage: row.error_message,
    updatedAt: row.updated_at,
  }))
}
