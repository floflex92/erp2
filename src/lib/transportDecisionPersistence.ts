import { supabase } from '@/lib/supabase'
import type { EtaPrediction, JobScoreResult, JobSubScore } from '@/lib/transportDecisionEngine'

type PersistedEtaRecord = {
  companyId: number
  otId: string
  reference: string
  distanceKm: number | null
  prediction: EtaPrediction
  sourceEvent?: 'manual' | 'affectation' | 'traffic_refresh' | 'driver_delay' | 'planning_change' | 'cron'
  metadata?: Record<string, unknown>
}

type PersistedJobScoreRecord = {
  companyId: number
  requestReference: string
  requestPayload: object
  score: JobScoreResult
  metadata?: Record<string, unknown>
}

type LatestEtaRow = {
  id: string
  predicted_eta: string | null
  predicted_duration_minutes: number
  confidence_pct: number
  risk_level: EtaPrediction['riskLevel']
}

type LatestJobScoreRow = {
  id: string
  global_score: number
  recommendation: JobScoreResult['recommendation']
  estimated_margin: number
  distance_km: number | null
}

const recentWrites = new Map<string, number>()
const WRITE_DEDUP_MS = 90_000

function nowMs() {
  return Date.now()
}

function pruneRecentWrites() {
  const current = nowMs()
  for (const [key, value] of recentWrites.entries()) {
    if ((current - value) > WRITE_DEDUP_MS) recentWrites.delete(key)
  }
}

function shouldSkipRecentWrite(key: string) {
  pruneRecentWrites()
  const lastWrite = recentWrites.get(key)
  if (lastWrite && (nowMs() - lastWrite) <= WRITE_DEDUP_MS) return true
  recentWrites.set(key, nowMs())
  return false
}

function etaSignature(record: PersistedEtaRecord) {
  return JSON.stringify({
    companyId: record.companyId,
    otId: record.otId,
    predictedDurationMinutes: record.prediction.predictedDurationMinutes,
    etaIso: record.prediction.etaIso,
    confidencePct: record.prediction.confidencePct,
    riskLevel: record.prediction.riskLevel,
    deltaMinutes: record.prediction.deltaMinutes,
  })
}

function scoreSignature(record: PersistedJobScoreRecord) {
  return JSON.stringify({
    companyId: record.companyId,
    requestReference: record.requestReference,
    globalScore: record.score.globalScore,
    recommendation: record.score.recommendation,
    estimatedMargin: record.score.estimatedMargin,
    distanceKm: record.score.distanceKm,
  })
}

function mapSeverityFromImpact(impactMinutes: number) {
  if (impactMinutes >= 90) return 'critique'
  if (impactMinutes >= 45) return 'grave'
  if (impactMinutes >= 15) return 'normale'
  return 'legere'
}

function mapAxisKey(key: JobSubScore['key']) {
  if (key === 'impactOperationnel') return 'impact_operationnel'
  if (key === 'qualiteClient') return 'qualite_client'
  return key
}

async function fetchLatestEta(companyId: number, otId: string) {
  const client = supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: unknown) => {
          eq: (column: string, value: unknown) => {
            maybeSingle: () => Promise<{ data: LatestEtaRow | null; error: { message?: string } | null }>
          }
        }
      }
    }
  }
  const { data, error } = await client
    .from('vue_latest_eta_predictions')
    .select('id, predicted_eta, predicted_duration_minutes, confidence_pct, risk_level')
    .eq('company_id', companyId)
    .eq('ot_id', otId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function fetchLatestJobScore(companyId: number, requestReference: string) {
  const client = supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: unknown) => {
          eq: (column: string, value: unknown) => {
            maybeSingle: () => Promise<{ data: LatestJobScoreRow | null; error: { message?: string } | null }>
          }
        }
      }
    }
  }
  const { data, error } = await client
    .from('vue_latest_job_scores')
    .select('id, global_score, recommendation, estimated_margin, distance_km')
    .eq('company_id', companyId)
    .eq('request_reference', requestReference)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function persistEtaPredictions(records: PersistedEtaRecord[]) {
  const client = supabase as unknown as {
    from: (table: string) => {
      insert: (payload: Record<string, unknown> | Record<string, unknown>[]) => {
        select: (columns: string) => {
          single: () => Promise<{ data: { id: string } | null; error: { message?: string } | null }>
        }
      }
    }
  }

  await Promise.allSettled(records.map(async record => {
    const signature = etaSignature(record)
    const dedupKey = `eta:${record.companyId}:${record.otId}:${signature}`
    if (shouldSkipRecentWrite(dedupKey)) return

    const latest = await fetchLatestEta(record.companyId, record.otId)
    if (
      latest
      && latest.predicted_eta === record.prediction.etaIso
      && latest.predicted_duration_minutes === record.prediction.predictedDurationMinutes
      && Math.round(latest.confidence_pct) === record.prediction.confidencePct
      && latest.risk_level === record.prediction.riskLevel
    ) {
      return
    }

    const { data, error } = await client
      .from('eta_predictions')
      .insert({
        company_id: record.companyId,
        ot_id: record.otId,
        prediction_scope: 'course',
        source_event: record.sourceEvent ?? 'manual',
        distance_km: record.distanceKm,
        baseline_duration_minutes: record.prediction.baselineDurationMinutes,
        predicted_duration_minutes: record.prediction.predictedDurationMinutes,
        optimistic_eta: record.prediction.optimisticEtaIso,
        predicted_eta: record.prediction.etaIso,
        pessimistic_eta: record.prediction.pessimisticEtaIso,
        confidence_pct: record.prediction.confidencePct,
        risk_level: record.prediction.riskLevel,
        status_label: record.prediction.statusLabel,
        trace_json: record.prediction.traces,
        explanation_json: record.prediction.explanation,
        missing_data_json: record.prediction.missingData,
        metadata_json: {
          reference: record.reference,
          ...record.metadata,
        },
      })
      .select('id')
      .single()

    if (error || !data) throw error ?? new Error('Insertion eta_predictions impossible')

    if (latest) {
      await client.from('eta_history').insert({
        company_id: record.companyId,
        eta_prediction_id: data.id,
        ot_id: record.otId,
        previous_predicted_eta: latest.predicted_eta,
        next_predicted_eta: record.prediction.etaIso,
        delta_minutes: record.prediction.deltaMinutes,
        drift_reason: record.prediction.riskLevel,
        snapshot_json: {
          reference: record.reference,
          confidencePct: record.prediction.confidencePct,
          explanation: record.prediction.explanation,
        },
      })
    }

    if (record.prediction.traces.length > 0) {
      await client.from('constraint_logs').insert(
        record.prediction.traces.map(trace => ({
          company_id: record.companyId,
          ot_id: record.otId,
          request_reference: null,
          engine_name: 'eta_engine',
          constraint_type: trace.category,
          constraint_code: trace.code,
          severity: mapSeverityFromImpact(trace.impactMinutes),
          source: trace.source,
          impact_minutes: trace.impactMinutes,
          impact_score: null,
          detail_json: {
            reference: record.reference,
            label: trace.label,
            detail: trace.detail,
          },
        })),
      )
    }
  }))
}

export async function persistJobScores(records: PersistedJobScoreRecord[]) {
  const client = supabase as unknown as {
    from: (table: string) => {
      insert: (payload: Record<string, unknown> | Record<string, unknown>[]) => {
        select?: (columns: string) => {
          single: () => Promise<{ data: { id: string } | null; error: { message?: string } | null }>
        }
      }
    }
  }

  await Promise.allSettled(records.map(async record => {
    const signature = scoreSignature(record)
    const dedupKey = `score:${record.companyId}:${record.requestReference}:${signature}`
    if (shouldSkipRecentWrite(dedupKey)) return

    const latest = await fetchLatestJobScore(record.companyId, record.requestReference)
    if (
      latest
      && Math.round(latest.global_score) === record.score.globalScore
      && latest.recommendation === record.score.recommendation
      && Math.round(latest.estimated_margin) === record.score.estimatedMargin
      && Math.round(latest.distance_km ?? 0) === record.score.distanceKm
    ) {
      return
    }

    const insertBuilder = client.from('job_scores').insert({
      company_id: record.companyId,
      ot_id: null,
      request_reference: record.requestReference,
      request_payload: record.requestPayload,
      global_score: record.score.globalScore,
      recommendation: record.score.recommendation,
      color: record.score.color,
      difficulty_label: record.score.difficultyLabel,
      impact_label: record.score.impactLabel,
      estimated_revenue: record.score.estimatedRevenue,
      estimated_cost: record.score.estimatedCost,
      estimated_margin: record.score.estimatedMargin,
      distance_km: record.score.distanceKm,
      weights_json: Object.fromEntries(record.score.subScores.map(subScore => [subScore.key, subScore.weight])),
      explanation_json: record.score.explanation,
      metadata_json: record.metadata ?? {},
    }) as { select: (columns: string) => { single: () => Promise<{ data: { id: string } | null; error: { message?: string } | null }> } }

    const { data, error } = await insertBuilder.select('id').single()
    if (error || !data) throw error ?? new Error('Insertion job_scores impossible')

    await client.from('scoring_details').insert(
      record.score.subScores.map(subScore => ({
        job_score_id: data.id,
        axis: mapAxisKey(subScore.key),
        axis_score: subScore.score,
        axis_weight: subScore.weight,
        detail_text: subScore.detail,
        detail_json: {
          label: subScore.label,
        },
      })),
    )

    await client.from('constraint_logs').insert(
      record.score.subScores.map(subScore => ({
        company_id: record.companyId,
        ot_id: null,
        request_reference: record.requestReference,
        engine_name: 'scoring_engine',
        constraint_type: subScore.key === 'faisabilite'
          ? 'ressource'
          : subScore.key === 'complexite'
            ? 'operationnel'
            : subScore.key === 'impactOperationnel'
              ? 'operationnel'
              : subScore.key === 'qualiteClient'
                ? 'historique'
                : 'buffer',
        constraint_code: subScore.key,
        severity: subScore.score < 40 ? 'grave' : subScore.score < 60 ? 'normale' : 'legere',
        source: 'heuristique',
        impact_minutes: null,
        impact_score: 100 - subScore.score,
        detail_json: {
          label: subScore.label,
          detail: subScore.detail,
        },
      })),
    )
  }))
}