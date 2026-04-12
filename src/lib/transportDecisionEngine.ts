export type RiskLevel = 'ok' | 'a_surveiller' | 'critique'
export type ScoreRecommendation = 'accepter' | 'a_optimiser' | 'risque' | 'a_refuser'

export interface EtaConstraintTrace {
  code: string
  label: string
  category: 'temps_reel' | 'operationnel' | 'reglementaire' | 'ressource' | 'historique' | 'buffer'
  impactMinutes: number
  detail: string
  source: 'api' | 'historique' | 'heuristique' | 'fallback'
}

export interface EtaPrediction {
  etaIso: string | null
  optimisticEtaIso: string | null
  pessimisticEtaIso: string | null
  predictedDurationMinutes: number
  baselineDurationMinutes: number
  deltaMinutes: number
  confidencePct: number
  riskLevel: RiskLevel
  statusLabel: 'OK' | 'A surveiller' | 'Critique'
  traces: EtaConstraintTrace[]
  explanation: string[]
  missingData: string[]
}

export interface EtaInput {
  nowIso?: string
  departureIso?: string | null
  distanceKm?: number | null
  multiStopCount?: number | null
  routeProfile?: {
    motorwayPct?: number | null
    secondaryPct?: number | null
    urbanPct?: number | null
    urbanDensity?: 'faible' | 'moyenne' | 'forte'
  }
  realtime?: {
    trafficLevel?: number | null
    weatherSeverity?: number | null
    incidentSeverity?: number | null
    worksSeverity?: number | null
    apiCoveragePct?: number | null
  }
  operations?: {
    loadingMinutes?: number | null
    unloadingMinutes?: number | null
    customerWindowTightness?: 'large' | 'normale' | 'serree'
    appointmentReliabilityPct?: number | null
  }
  regulatory?: {
    driveMinutesAlreadyUsed?: number | null
    remainingContinuousDriveMinutes?: number | null
    dailyRestDueMinutes?: number | null
    chronoRisk?: 'faible' | 'moyen' | 'fort'
  }
  resource?: {
    vehicleType?: string | null
    vehicleAverageSpeedKph?: number | null
    driverExperiencePct?: number | null
    availabilityPct?: number | null
  }
  historical?: {
    averageDelayMinutes?: number | null
    laneDelayMinutes?: number | null
    clientServiceMinutes?: number | null
    onTimePct?: number | null
    plannerPerformancePct?: number | null
  }
}

export interface ScoreWeights {
  rentabilite: number
  faisabilite: number
  impactOperationnel: number
  qualiteClient: number
  complexite: number
}

export interface JobScoreInput {
  reference?: string | null
  distanceKm?: number | null
  estimatedRevenue?: number | null
  estimatedCost?: number | null
  requestedPickupIso?: string | null
  requestedDeliveryIso?: string | null
  multiStopCount?: number | null
  difficultZoneCount?: number | null
  tightWindowLevel?: 'large' | 'normale' | 'serree'
  vehiclesAvailableCount?: number | null
  compatibleVehiclesCount?: number | null
  driversAvailableCount?: number | null
  planningConflictCount?: number | null
  legalRiskLevel?: 'faible' | 'moyen' | 'fort'
  exploitantLoadPct?: number | null
  serviceLoadPct?: number | null
  clientImportance?: 'standard' | 'important' | 'strategique'
  clientPaymentScore?: number | null
  slaPressurePct?: number | null
  penaltyRiskPct?: number | null
  historicalOnTimePct?: number | null
  weights?: Partial<ScoreWeights>
}

export interface JobSubScore {
  key: keyof ScoreWeights
  label: string
  score: number
  weight: number
  detail: string
}

export interface JobScoreResult {
  globalScore: number
  recommendation: ScoreRecommendation
  color: 'vert' | 'orange' | 'rouge'
  difficultyLabel: 'faible' | 'moyenne' | 'elevee'
  impactLabel: 'faible' | 'moyen' | 'fort'
  estimatedRevenue: number
  estimatedCost: number
  estimatedMargin: number
  distanceKm: number
  subScores: JobSubScore[]
  explanation: string[]
}

export interface CockpitAlert {
  id: string
  type: 'eta_drift' | 'mission_risque' | 'surcharge_exploitant' | 'opportunite_rentable' | 'validation_risquee'
  level: RiskLevel
  title: string
  detail: string
  actionLabel: string
}

export interface TransportRequestLike {
  id: string
  reference: string
  pickupDatetime: string
  deliveryDatetime: string
  goodsDescription: string
  packageCount: number | null
  weightKg: number | null
  instructions: string | null
  status: string
}

export interface RequestScoringContext {
  vehiclesAvailableCount?: number | null
  compatibleVehiclesCount?: number | null
  driversAvailableCount?: number | null
  exploitantLoadPct?: number | null
  serviceLoadPct?: number | null
  planningConflictCount?: number | null
  clientPaymentScore?: number | null
  clientImportance?: 'standard' | 'important' | 'strategique'
  historicalOnTimePct?: number | null
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  rentabilite: 0.28,
  faisabilite: 0.26,
  impactOperationnel: 0.18,
  qualiteClient: 0.16,
  complexite: 0.12,
}

const SCORE_LABELS: Record<keyof ScoreWeights, string> = {
  rentabilite: 'Rentabilite',
  faisabilite: 'Faisabilite',
  impactOperationnel: 'Impact operationnel',
  qualiteClient: 'Qualite client',
  complexite: 'Complexite',
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number) {
  return Math.round(value)
}

function addMinutes(baseIso: string, minutes: number) {
  const date = new Date(baseIso)
  if (Number.isNaN(date.getTime())) return null
  date.setMinutes(date.getMinutes() + Math.round(minutes))
  return date.toISOString()
}

function diffMinutes(startIso: string | null | undefined, endIso: string | null | undefined) {
  if (!startIso || !endIso) return null
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
}

function computeEstimatedSpeed(input: EtaInput, traces: EtaConstraintTrace[], missingData: string[]) {
  const fallbackSpeed = 68
  const baseVehicleSpeed = input.resource?.vehicleAverageSpeedKph ?? fallbackSpeed
  const motorwayPct = input.routeProfile?.motorwayPct ?? 0.55
  const secondaryPct = input.routeProfile?.secondaryPct ?? 0.25
  const urbanPct = input.routeProfile?.urbanPct ?? Math.max(0, 1 - motorwayPct - secondaryPct)

  if (input.resource?.vehicleAverageSpeedKph == null) {
    missingData.push('vitesse vehicule moyenne')
    traces.push({
      code: 'fallback_speed',
      label: 'Vitesse vehicule fallback',
      category: 'ressource',
      impactMinutes: 0,
      detail: 'Vitesse moyenne estimee par defaut a 68 km/h.',
      source: 'fallback',
    })
  }

  const densityFactor = input.routeProfile?.urbanDensity === 'forte'
    ? 0.88
    : input.routeProfile?.urbanDensity === 'moyenne'
      ? 0.94
      : 1

  const routeFactor = (motorwayPct * 1.08) + (secondaryPct * 0.92) + (urbanPct * 0.72)
  return clamp(baseVehicleSpeed * routeFactor * densityFactor, 35, 92)
}

export function computePredictiveEta(input: EtaInput): EtaPrediction {
  const traces: EtaConstraintTrace[] = []
  const missingData: string[] = []
  const explanation: string[] = []
  const nowIso = input.nowIso ?? new Date().toISOString()
  const departureIso = input.departureIso ?? nowIso
  const estimatedSpeed = computeEstimatedSpeed(input, traces, missingData)
  const distanceKm = input.distanceKm ?? null

  let baselineDurationMinutes = 0
  if (distanceKm && distanceKm > 0) {
    baselineDurationMinutes = round((distanceKm / estimatedSpeed) * 60)
  } else {
    baselineDurationMinutes = diffMinutes(input.departureIso ?? nowIso, addMinutes(nowIso, 180)) ?? 180
    missingData.push('distance reelle')
    traces.push({
      code: 'fallback_distance',
      label: 'Distance fallback',
      category: 'operationnel',
      impactMinutes: 0,
      detail: 'Distance non renseignee, duree de base ramenee a 180 minutes.',
      source: 'fallback',
    })
  }

  const trafficLevel = clamp(input.realtime?.trafficLevel ?? 0.18, 0, 1)
  const weatherSeverity = clamp(input.realtime?.weatherSeverity ?? 0.1, 0, 1)
  const incidentSeverity = clamp((input.realtime?.incidentSeverity ?? 0) + (input.realtime?.worksSeverity ?? 0), 0, 1)
  const trafficImpact = round(baselineDurationMinutes * trafficLevel * 0.35)
  const weatherImpact = round(baselineDurationMinutes * weatherSeverity * 0.2)
  const incidentImpact = round(baselineDurationMinutes * incidentSeverity * 0.25)

  if (trafficImpact > 0) {
    traces.push({
      code: 'traffic',
      label: 'Trafic routier',
      category: 'temps_reel',
      impactMinutes: trafficImpact,
      detail: `Charge trafic estimee a ${round(trafficLevel * 100)}%.`,
      source: input.realtime?.trafficLevel == null ? 'heuristique' : 'api',
    })
  }
  if (weatherImpact > 0) {
    traces.push({
      code: 'weather',
      label: 'Meteo',
      category: 'temps_reel',
      impactMinutes: weatherImpact,
      detail: `Severite meteo estimee a ${round(weatherSeverity * 100)}%.`,
      source: input.realtime?.weatherSeverity == null ? 'heuristique' : 'api',
    })
  }
  if (incidentImpact > 0) {
    traces.push({
      code: 'incident',
      label: 'Incidents et travaux',
      category: 'temps_reel',
      impactMinutes: incidentImpact,
      detail: 'Perturbations routieres ajoutees au scenario ETA.',
      source: input.realtime?.incidentSeverity == null && input.realtime?.worksSeverity == null ? 'heuristique' : 'api',
    })
  }

  const multiStopImpact = Math.max(0, (input.multiStopCount ?? 1) - 1) * 18
  const loadingImpact = Math.max(0, input.operations?.loadingMinutes ?? 25)
  const unloadingImpact = Math.max(0, input.operations?.unloadingMinutes ?? 20)
  const clientWindowImpact = input.operations?.customerWindowTightness === 'serree'
    ? 26
    : input.operations?.customerWindowTightness === 'normale'
      ? 12
      : 4
  const serviceImpact = round((input.historical?.clientServiceMinutes ?? 0) * 0.4)
  const historicalDelayImpact = round((input.historical?.averageDelayMinutes ?? 0) * 0.55 + (input.historical?.laneDelayMinutes ?? 0) * 0.45)

  traces.push({
    code: 'operations',
    label: 'Operations site et multi-stop',
    category: 'operationnel',
    impactMinutes: loadingImpact + unloadingImpact + multiStopImpact + clientWindowImpact,
    detail: 'Chargement, dechargement, tournees et fenetres clients agregees.',
    source: 'heuristique',
  })

  if (serviceImpact > 0 || historicalDelayImpact > 0) {
    traces.push({
      code: 'history',
      label: 'Historique interne',
      category: 'historique',
      impactMinutes: serviceImpact + historicalDelayImpact,
      detail: 'Performance client, trajet et execution precedente reinjectees.',
      source: 'historique',
    })
  }

  const remainingContinuous = input.regulatory?.remainingContinuousDriveMinutes ?? null
  const chronoRisk = input.regulatory?.chronoRisk ?? 'moyen'
  const continuousRiskImpact = remainingContinuous != null && remainingContinuous < baselineDurationMinutes
    ? 45
    : chronoRisk === 'fort'
      ? 35
      : chronoRisk === 'moyen'
        ? 18
        : 8
  const dailyRestImpact = Math.max(0, round((input.regulatory?.dailyRestDueMinutes ?? 0) * 0.45))

  traces.push({
    code: 'regulatory',
    label: 'Temps de conduite et pauses',
    category: 'reglementaire',
    impactMinutes: continuousRiskImpact + dailyRestImpact,
    detail: 'Projection CE 561 et risque chronotachygraphe integres.',
    source: remainingContinuous == null ? 'heuristique' : 'historique',
  })

  const availabilityPenalty = round((1 - clamp((input.resource?.availabilityPct ?? 88) / 100, 0, 1)) * 24)
  const driverPenalty = round((1 - clamp((input.resource?.driverExperiencePct ?? 72) / 100, 0, 1)) * 18)
  if (availabilityPenalty > 0 || driverPenalty > 0) {
    traces.push({
      code: 'resource',
      label: 'Vehicule / conducteur',
      category: 'ressource',
      impactMinutes: availabilityPenalty + driverPenalty,
      detail: 'Disponibilite reelle et experience conducteur ajustent la prediction.',
      source: input.resource?.availabilityPct == null && input.resource?.driverExperiencePct == null ? 'heuristique' : 'historique',
    })
  }

  const traceImpact = traces.reduce((sum, trace) => sum + trace.impactMinutes, 0)
  const uncertaintyBuffer = round(Math.max(12, baselineDurationMinutes * (0.08 + (missingData.length * 0.02))))
  traces.push({
    code: 'buffer',
    label: 'Buffer intelligent',
    category: 'buffer',
    impactMinutes: uncertaintyBuffer,
    detail: 'Buffer pilote par l incertitude, la variabilite et les donnees manquantes.',
    source: 'heuristique',
  })

  const predictedDurationMinutes = round(baselineDurationMinutes + traceImpact + uncertaintyBuffer)
  const deltaMinutes = predictedDurationMinutes - baselineDurationMinutes
  const apiCoverage = clamp((input.realtime?.apiCoveragePct ?? 52) / 100, 0, 1)
  const historyCoverage = clamp(((input.historical?.onTimePct ?? 68) + (input.historical?.plannerPerformancePct ?? 70)) / 200, 0, 1)
  const dataCompleteness = clamp(1 - (missingData.length * 0.08), 0.35, 1)
  const perturbationPenalty = clamp((trafficLevel * 0.18) + (weatherSeverity * 0.12) + (incidentSeverity * 0.14), 0, 0.38)
  const confidencePct = round(clamp((dataCompleteness * 0.38) + (apiCoverage * 0.22) + (historyCoverage * 0.24) + (0.24 - perturbationPenalty), 0.42, 0.97) * 100)
  const riskLevel: RiskLevel = deltaMinutes >= 150 || confidencePct < 56
    ? 'critique'
    : deltaMinutes >= 70 || confidencePct < 72
      ? 'a_surveiller'
      : 'ok'

  if (trafficImpact > 0) explanation.push(`Trafic ajoute ${trafficImpact} min au temps de base.`)
  if (weatherImpact > 0 || incidentImpact > 0) explanation.push(`Perturbations externes ajoutees: ${weatherImpact + incidentImpact} min.`)
  explanation.push(`Contraintes operationnelles et legals ajoutees: ${loadingImpact + unloadingImpact + multiStopImpact + clientWindowImpact + continuousRiskImpact + dailyRestImpact} min.`)
  if (serviceImpact > 0 || historicalDelayImpact > 0) explanation.push(`Historique interne ajoute ${serviceImpact + historicalDelayImpact} min de prudence.`)
  if (missingData.length > 0) explanation.push(`Fallback active sur ${missingData.join(', ')}.`)

  return {
    etaIso: addMinutes(departureIso, predictedDurationMinutes),
    optimisticEtaIso: addMinutes(departureIso, Math.max(30, predictedDurationMinutes - round(uncertaintyBuffer * 0.75))),
    pessimisticEtaIso: addMinutes(departureIso, predictedDurationMinutes + round(uncertaintyBuffer * 1.35)),
    predictedDurationMinutes,
    baselineDurationMinutes,
    deltaMinutes,
    confidencePct,
    riskLevel,
    statusLabel: riskLevel === 'critique' ? 'Critique' : riskLevel === 'a_surveiller' ? 'A surveiller' : 'OK',
    traces,
    explanation,
    missingData,
  }
}

function normalizeWeights(custom?: Partial<ScoreWeights>): ScoreWeights {
  const merged: ScoreWeights = {
    rentabilite: custom?.rentabilite ?? DEFAULT_WEIGHTS.rentabilite,
    faisabilite: custom?.faisabilite ?? DEFAULT_WEIGHTS.faisabilite,
    impactOperationnel: custom?.impactOperationnel ?? DEFAULT_WEIGHTS.impactOperationnel,
    qualiteClient: custom?.qualiteClient ?? DEFAULT_WEIGHTS.qualiteClient,
    complexite: custom?.complexite ?? DEFAULT_WEIGHTS.complexite,
  }
  const total = Object.values(merged).reduce((sum, value) => sum + value, 0) || 1
  return {
    rentabilite: merged.rentabilite / total,
    faisabilite: merged.faisabilite / total,
    impactOperationnel: merged.impactOperationnel / total,
    qualiteClient: merged.qualiteClient / total,
    complexite: merged.complexite / total,
  }
}

function computeRevenuePerKm(revenue: number | null | undefined, distanceKm: number | null | undefined) {
  if (!revenue || !distanceKm || distanceKm <= 0) return null
  return revenue / distanceKm
}

export function computeJobScore(input: JobScoreInput): JobScoreResult {
  const weights = normalizeWeights(input.weights)
  const revenue = input.estimatedRevenue ?? 0
  const cost = input.estimatedCost ?? 0
  const distanceKm = input.distanceKm ?? 0
  const marginPct = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
  const revenuePerKm = computeRevenuePerKm(revenue, distanceKm) ?? 0
  const rentabilite = clamp(
    (marginPct * 1.7) + (revenuePerKm * 16) + (revenue > 0 ? 18 : 0),
    0,
    100,
  )

  const vehiclesAvailable = input.vehiclesAvailableCount ?? 0
  const compatibleVehicles = input.compatibleVehiclesCount ?? vehiclesAvailable
  const driversAvailable = input.driversAvailableCount ?? 0
  const planningPenalty = (input.planningConflictCount ?? 0) * 18
  const legalPenalty = input.legalRiskLevel === 'fort' ? 34 : input.legalRiskLevel === 'moyen' ? 18 : 4
  const capacitySignal = clamp((compatibleVehicles * 18) + (driversAvailable * 16), 0, 72)
  const faisabilite = clamp(capacitySignal - planningPenalty - legalPenalty + 32, 0, 100)

  const exploitantLoadPct = input.exploitantLoadPct ?? 72
  const serviceLoadPct = input.serviceLoadPct ?? 68
  const impactOperationnel = clamp(
    100 - ((exploitantLoadPct - 55) * 0.7) - ((serviceLoadPct - 55) * 0.5) - planningPenalty,
    0,
    100,
  )

  const clientImportanceBoost = input.clientImportance === 'strategique'
    ? 26
    : input.clientImportance === 'important'
      ? 14
      : 6
  const qualiteClient = clamp(
    clientImportanceBoost
    + (input.clientPaymentScore ?? 64) * 0.28
    + (input.historicalOnTimePct ?? 72) * 0.26
    + (100 - (input.penaltyRiskPct ?? 24)) * 0.22
    + (input.slaPressurePct ?? 60) * 0.12,
    0,
    100,
  )

  const leadTimeMinutes = diffMinutes(input.requestedPickupIso ?? null, input.requestedDeliveryIso ?? null) ?? 0
  const complexityPenalty = (
    Math.max(0, (input.multiStopCount ?? 1) - 1) * 12
    + (input.difficultZoneCount ?? 0) * 10
    + (input.tightWindowLevel === 'serree' ? 24 : input.tightWindowLevel === 'normale' ? 10 : 0)
    + (leadTimeMinutes > 0 && leadTimeMinutes < 240 ? 22 : leadTimeMinutes > 0 && leadTimeMinutes < 480 ? 10 : 0)
  )
  const complexite = clamp(100 - complexityPenalty, 0, 100)

  const subScores: JobSubScore[] = [
    { key: 'rentabilite', label: SCORE_LABELS.rentabilite, score: round(rentabilite), weight: weights.rentabilite, detail: `Marge estimee ${round(marginPct)}% et ${revenuePerKm.toFixed(2)} / km.` },
    { key: 'faisabilite', label: SCORE_LABELS.faisabilite, score: round(faisabilite), weight: weights.faisabilite, detail: `${compatibleVehicles} vehicule(s) compatibles, ${driversAvailable} conducteur(s), ${input.planningConflictCount ?? 0} conflit(s).` },
    { key: 'impactOperationnel', label: SCORE_LABELS.impactOperationnel, score: round(impactOperationnel), weight: weights.impactOperationnel, detail: `Charge exploitation ${round(exploitantLoadPct)}%, service ${round(serviceLoadPct)}%.` },
    { key: 'qualiteClient', label: SCORE_LABELS.qualiteClient, score: round(qualiteClient), weight: weights.qualiteClient, detail: `Importance client ${input.clientImportance ?? 'standard'}, SLA ${round(input.slaPressurePct ?? 60)}%.` },
    { key: 'complexite', label: SCORE_LABELS.complexite, score: round(complexite), weight: weights.complexite, detail: `${Math.max(1, input.multiStopCount ?? 1)} stop(s), ${input.difficultZoneCount ?? 0} zone(s) difficile(s).` },
  ]

  const globalScore = round(subScores.reduce((sum, item) => sum + (item.score * item.weight), 0))
  const recommendation: ScoreRecommendation = globalScore >= 76 && faisabilite >= 58
    ? 'accepter'
    : globalScore >= 58 && faisabilite >= 42
      ? 'a_optimiser'
      : globalScore >= 42
        ? 'risque'
        : 'a_refuser'

  const explanation = [
    `Score global ${globalScore}/100 avec faisabilite ${round(faisabilite)}/100.`,
    `Rentabilite calculee sur marge estimee ${round(marginPct)}% et revenu kilometrique ${revenuePerKm.toFixed(2)}.`,
    `Charge operationnelle courante: exploitation ${round(exploitantLoadPct)}%, service ${round(serviceLoadPct)}%.`,
  ]

  if ((input.planningConflictCount ?? 0) > 0) {
    explanation.push(`Conflits planning detectes: ${input.planningConflictCount}.`)
  }
  if (input.legalRiskLevel === 'fort') {
    explanation.push('Le risque legal est fort, ce qui degrade la recommandation.')
  }

  return {
    globalScore,
    recommendation,
    color: globalScore >= 76 ? 'vert' : globalScore >= 52 ? 'orange' : 'rouge',
    difficultyLabel: complexite >= 72 ? 'faible' : complexite >= 44 ? 'moyenne' : 'elevee',
    impactLabel: impactOperationnel >= 72 ? 'faible' : impactOperationnel >= 44 ? 'moyen' : 'fort',
    estimatedRevenue: round(revenue),
    estimatedCost: round(cost),
    estimatedMargin: round(revenue - cost),
    distanceKm: round(distanceKm),
    subScores,
    explanation,
  }
}

export function estimateRevenueForRequest(request: TransportRequestLike, distanceKm: number) {
  const urgencyHours = diffMinutes(new Date().toISOString(), request.pickupDatetime) ?? 720
  const urgencyPremium = urgencyHours < 240 ? 180 : urgencyHours < 720 ? 90 : 0
  const handlingPremium = (request.packageCount ?? 0) * 2.5 + ((request.weightKg ?? 0) / 1000) * 24
  return round((distanceKm * 1.95) + urgencyPremium + handlingPremium)
}

export function estimateCostForRequest(request: TransportRequestLike, distanceKm: number, multiStopCount = 1) {
  const base = (distanceKm * 1.28) + (multiStopCount - 1) * 34 + ((request.weightKg ?? 0) / 1000) * 16
  return round(base)
}

function inferDistanceKmFromRequest(request: TransportRequestLike) {
  const text = `${request.pickupDatetime}|${request.deliveryDatetime}|${request.goodsDescription}|${request.instructions ?? ''}`
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index)
    hash |= 0
  }
  return 120 + Math.abs(hash % 540)
}

export function deriveJobScoreFromTransportRequest(request: TransportRequestLike, context: RequestScoringContext = {}): JobScoreResult {
  const distanceKm = inferDistanceKmFromRequest(request)
  const multiStopCount = request.instructions?.toLowerCase().includes('multi') ? 2 : 1
  const tightWindowLevel: JobScoreInput['tightWindowLevel'] = (diffMinutes(request.pickupDatetime, request.deliveryDatetime) ?? 0) < 240
    ? 'serree'
    : (diffMinutes(request.pickupDatetime, request.deliveryDatetime) ?? 0) < 600
      ? 'normale'
      : 'large'
  const difficultZoneCount = /paris|lyon|marseille|centre-ville|zsfe|port/i.test(`${request.goodsDescription} ${request.instructions ?? ''}`) ? 1 : 0
  const estimatedRevenue = estimateRevenueForRequest(request, distanceKm)
  const estimatedCost = estimateCostForRequest(request, distanceKm, multiStopCount)

  return computeJobScore({
    reference: request.reference,
    distanceKm,
    estimatedRevenue,
    estimatedCost,
    requestedPickupIso: request.pickupDatetime,
    requestedDeliveryIso: request.deliveryDatetime,
    multiStopCount,
    difficultZoneCount,
    tightWindowLevel,
    vehiclesAvailableCount: context.vehiclesAvailableCount ?? 2,
    compatibleVehiclesCount: context.compatibleVehiclesCount ?? context.vehiclesAvailableCount ?? 2,
    driversAvailableCount: context.driversAvailableCount ?? 2,
    planningConflictCount: context.planningConflictCount ?? 0,
    legalRiskLevel: tightWindowLevel === 'serree' ? 'moyen' : 'faible',
    exploitantLoadPct: context.exploitantLoadPct ?? 74,
    serviceLoadPct: context.serviceLoadPct ?? 66,
    clientImportance: context.clientImportance ?? 'standard',
    clientPaymentScore: context.clientPaymentScore ?? 68,
    historicalOnTimePct: context.historicalOnTimePct ?? 72,
    slaPressurePct: tightWindowLevel === 'serree' ? 86 : tightWindowLevel === 'normale' ? 64 : 48,
    penaltyRiskPct: tightWindowLevel === 'serree' ? 42 : 18,
  })
}

export function buildOrderEtaInput(order: {
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  distance_km: number | null
  conducteur_id: string | null
  vehicule_id: string | null
  statut_operationnel: string | null
  statut_transport: string | null
  est_affretee?: boolean | null
}): EtaInput {
  const transportStatus = order.statut_transport ?? ''
  const opStatus = order.statut_operationnel ?? ''
  const realtimePenalty = /retard/i.test(opStatus) ? 0.55 : transportStatus === 'en_livraison' ? 0.2 : 0.12
  const incidentSeverity = order.est_affretee ? 0.12 : 0.05

  return {
    departureIso: order.date_chargement_prevue,
    distanceKm: order.distance_km,
    realtime: {
      trafficLevel: realtimePenalty,
      weatherSeverity: transportStatus === 'en_transit' ? 0.18 : 0.1,
      incidentSeverity,
      apiCoveragePct: 38,
    },
    operations: {
      loadingMinutes: 30,
      unloadingMinutes: 25,
      customerWindowTightness: /retard/i.test(opStatus) ? 'serree' : 'normale',
    },
    regulatory: {
      chronoRisk: order.conducteur_id ? 'moyen' : 'fort',
      remainingContinuousDriveMinutes: order.conducteur_id ? 240 : 120,
    },
    resource: {
      availabilityPct: order.vehicule_id && order.conducteur_id ? 84 : 52,
      driverExperiencePct: order.conducteur_id ? 72 : 40,
    },
    historical: {
      averageDelayMinutes: /retard/i.test(opStatus) ? 38 : 12,
      onTimePct: /retard/i.test(opStatus) ? 58 : 79,
      plannerPerformancePct: 74,
    },
  }
}

export function buildCockpitAlerts(input: {
  etaPredictions: Array<{ reference: string; prediction: EtaPrediction }>
  scoredRequests: Array<{ reference: string; score: JobScoreResult; status: string }>
  exploitantLoadPct: number
}): CockpitAlert[] {
  const alerts: CockpitAlert[] = []

  input.etaPredictions
    .filter(item => item.prediction.riskLevel !== 'ok')
    .slice(0, 2)
    .forEach(item => {
      alerts.push({
        id: `eta-${item.reference}`,
        type: item.prediction.riskLevel === 'critique' ? 'eta_drift' : 'mission_risque',
        level: item.prediction.riskLevel,
        title: `${item.reference} - ETA ${item.prediction.statusLabel.toLowerCase()}`,
        detail: `${item.prediction.deltaMinutes} min d ecart et confiance ${item.prediction.confidencePct}%.`,
        actionLabel: 'Verifier affectation',
      })
    })

  if (input.exploitantLoadPct >= 88) {
    alerts.push({
      id: 'ops-load',
      type: 'surcharge_exploitant',
      level: 'critique',
      title: 'Charge exploitation sous tension',
      detail: `Charge estimee a ${round(input.exploitantLoadPct)}% avec risque de conflit planning.`,
      actionLabel: 'Repartir la charge',
    })
  }

  const bestOpportunity = input.scoredRequests
    .filter(item => item.status === 'soumise' || item.status === 'en_etude')
    .sort((left, right) => right.score.globalScore - left.score.globalScore)[0]
  if (bestOpportunity && bestOpportunity.score.globalScore >= 76) {
    alerts.push({
      id: `opp-${bestOpportunity.reference}`,
      type: 'opportunite_rentable',
      level: 'ok',
      title: `${bestOpportunity.reference} - demande a forte valeur`,
      detail: `Score ${bestOpportunity.score.globalScore}/100, recommandation ${bestOpportunity.score.recommendation}.`,
      actionLabel: 'Traiter maintenant',
    })
  }

  input.scoredRequests
    .filter(item => item.status === 'en_etude' && item.score.recommendation !== 'accepter')
    .slice(0, 1)
    .forEach(item => {
      alerts.push({
        id: `review-${item.reference}`,
        type: 'validation_risquee',
        level: item.score.globalScore < 42 ? 'critique' : 'a_surveiller',
        title: `${item.reference} - validation risquee`,
        detail: `Sous-score faisabilite ${item.score.subScores.find(score => score.key === 'faisabilite')?.score ?? 0}/100.`,
        actionLabel: 'Optimiser avant accord',
      })
    })

  return alerts.slice(0, 5)
}