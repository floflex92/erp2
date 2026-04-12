import { describe, expect, it } from 'vitest'
import {
  computeJobScore,
  computePredictiveEta,
  deriveJobScoreFromTransportRequest,
} from './transportDecisionEngine'

describe('transportDecisionEngine', () => {
  it('produit un ETA critique quand les perturbations et contraintes sont fortes', () => {
    const prediction = computePredictiveEta({
      departureIso: '2026-04-12T08:00:00.000Z',
      distanceKm: 420,
      multiStopCount: 3,
      routeProfile: {
        motorwayPct: 0.35,
        secondaryPct: 0.3,
        urbanPct: 0.35,
        urbanDensity: 'forte',
      },
      realtime: {
        trafficLevel: 0.82,
        weatherSeverity: 0.64,
        incidentSeverity: 0.55,
        worksSeverity: 0.28,
        apiCoveragePct: 24,
      },
      operations: {
        loadingMinutes: 55,
        unloadingMinutes: 45,
        customerWindowTightness: 'serree',
      },
      regulatory: {
        remainingContinuousDriveMinutes: 90,
        dailyRestDueMinutes: 120,
        chronoRisk: 'fort',
      },
      resource: {
        vehicleAverageSpeedKph: 58,
        driverExperiencePct: 34,
        availabilityPct: 45,
      },
      historical: {
        averageDelayMinutes: 44,
        laneDelayMinutes: 28,
        clientServiceMinutes: 22,
        onTimePct: 49,
        plannerPerformancePct: 52,
      },
    })

    expect(prediction.etaIso).not.toBeNull()
    expect(prediction.predictedDurationMinutes).toBeGreaterThan(prediction.baselineDurationMinutes)
    expect(prediction.deltaMinutes).toBeGreaterThanOrEqual(150)
    expect(prediction.riskLevel).toBe('critique')
    expect(prediction.confidencePct).toBeLessThan(72)
  })

  it('active les fallbacks de prediction si la distance n est pas renseignee', () => {
    const prediction = computePredictiveEta({
      departureIso: '2026-04-12T08:00:00.000Z',
      realtime: {
        apiCoveragePct: 40,
      },
    })

    expect(prediction.missingData).toContain('distance reelle')
    expect(prediction.traces.some(trace => trace.code === 'fallback_distance')).toBe(true)
    expect(prediction.predictedDurationMinutes).toBeGreaterThan(0)
  })

  it('recommande accepter pour une demande rentable et faisable', () => {
    const result = computeJobScore({
      reference: 'REQ-ACCEPT',
      distanceKm: 280,
      estimatedRevenue: 1450,
      estimatedCost: 760,
      requestedPickupIso: '2026-04-13T07:00:00.000Z',
      requestedDeliveryIso: '2026-04-13T13:00:00.000Z',
      multiStopCount: 1,
      difficultZoneCount: 0,
      tightWindowLevel: 'large',
      vehiclesAvailableCount: 4,
      compatibleVehiclesCount: 3,
      driversAvailableCount: 4,
      planningConflictCount: 0,
      legalRiskLevel: 'faible',
      exploitantLoadPct: 54,
      serviceLoadPct: 52,
      clientImportance: 'strategique',
      clientPaymentScore: 92,
      slaPressurePct: 58,
      penaltyRiskPct: 8,
      historicalOnTimePct: 94,
    })

    expect(result.globalScore).toBeGreaterThanOrEqual(76)
    expect(result.recommendation).toBe('accepter')
    expect(result.color).toBe('vert')
    expect(result.estimatedMargin).toBe(690)
  })

  it('recommande refuser quand la charge et les risques rendent la demande fragile', () => {
    const result = computeJobScore({
      reference: 'REQ-REJECT',
      distanceKm: 190,
      estimatedRevenue: 420,
      estimatedCost: 510,
      requestedPickupIso: '2026-04-12T08:00:00.000Z',
      requestedDeliveryIso: '2026-04-12T10:00:00.000Z',
      multiStopCount: 3,
      difficultZoneCount: 2,
      tightWindowLevel: 'serree',
      vehiclesAvailableCount: 1,
      compatibleVehiclesCount: 0,
      driversAvailableCount: 0,
      planningConflictCount: 3,
      legalRiskLevel: 'fort',
      exploitantLoadPct: 94,
      serviceLoadPct: 91,
      clientImportance: 'standard',
      clientPaymentScore: 42,
      slaPressurePct: 92,
      penaltyRiskPct: 66,
      historicalOnTimePct: 48,
    })

    expect(result.globalScore).toBeLessThan(42)
    expect(result.recommendation).toBe('a_refuser')
    expect(result.color).toBe('rouge')
    expect(result.subScores.find(score => score.key === 'faisabilite')?.score).toBeLessThan(42)
  })

  it('derive un score coherent depuis une demande transport client', () => {
    const score = deriveJobScoreFromTransportRequest({
      id: 'req-1',
      reference: 'REQ-PORT-001',
      pickupDatetime: '2026-04-12T08:00:00.000Z',
      deliveryDatetime: '2026-04-12T11:00:00.000Z',
      goodsDescription: 'Conteneur port Marseille centre-ville',
      packageCount: 12,
      weightKg: 18500,
      instructions: 'Livraison multi stop prioritaire en zone ZSFE',
      status: 'soumise',
    }, {
      vehiclesAvailableCount: 2,
      compatibleVehiclesCount: 1,
      driversAvailableCount: 2,
      exploitantLoadPct: 71,
      serviceLoadPct: 68,
      planningConflictCount: 1,
      clientImportance: 'important',
      clientPaymentScore: 76,
      historicalOnTimePct: 82,
    })

    expect(score.distanceKm).toBeGreaterThan(0)
    expect(score.estimatedRevenue).toBeGreaterThan(score.estimatedCost)
    expect(score.subScores).toHaveLength(5)
    expect(score.explanation[0]).toContain('Score global')
  })
})