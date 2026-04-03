import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'
import { STATUT_OPS, type StatutOps } from '@/lib/statut-ops'
import type { Tables } from '@/lib/database.types'

type MissionRow = {
  id: string
  reference: string
  statut: string
  vehicule_id: string | null
  statut_operationnel: string | null
  date_livraison_prevue: string | null
  distance_km: number | null
  nature_marchandise: string | null
  clients: { nom: string } | { nom: string }[] | null
  conducteurs: { prenom: string; nom: string; statut: string | null } | { prenom: string; nom: string; statut: string | null }[] | null
  vehicules: { immatriculation: string; marque: string | null; statut: string | null } | { immatriculation: string; marque: string | null; statut: string | null }[] | null
}

type AddressRow = {
  latitude: number | null
  longitude: number | null
  nom_lieu: string
  ville: string
}

type StepRow = {
  id: string
  ot_id: string
  ordre: number
  ville: string | null
  adresse_libre: string | null
  statut: string
  adresses: AddressRow | AddressRow[] | null
}

type DriverHistoryRow = Pick<Tables<'historique_statuts'>, 'id' | 'ot_id' | 'created_at' | 'statut_nouveau' | 'commentaire'>

type GeoPoint = {
  lat: number
  lng: number
  label: string
}

type LiveMission = {
  id: string
  reference: string
  clientName: string
  conducteurName: string
  vehiculeName: string
  statutOperationnel: StatutOps | null
  distanceKm: number | null
  commodity: string | null
  lastPingMinutes: number
  etaLabel: string
  etaDelayMinutes: number | null
  etaConfidence: number | null
  progress: number
  alertLevel: 'normal' | 'warning' | 'critical'
  routePoints: GeoPoint[]
  livePosition: GeoPoint
  nextStopLabel: string
  driverStepLabel: string | null
  driverUpdateAt: string | null
  driverHasGps: boolean
  scheduleStatusLabel: string
  fuelPercent: number
  fuelLevel: 'ok' | 'low' | 'critical'
  tachyStatusLabel: string
  tachyDriveLeftMinutes: number
  driverStatusLabel: string
  vehicleStatusLabel: string
  punctualityBand: 'avance' | 'a_heure' | 'retard_surveillance' | 'retard_critique'
}

type MapRenderMode = 'points' | 'itineraires'

type TrackingLivePayload = {
  lat: number
  lng: number
  timestamp: string | null
}

type EtaLivePayload = {
  etaAt: string | null
  delayMinutes: number | null
  confidence: number | null
}

type DriverLivePayload = {
  stepLabel: string | null
  timestamp: string | null
  lat: number | null
  lng: number | null
}

type IncidentAiInsight = {
  summary: string
  recommendation: string | null
  priorityScore: number
  source: string
}

type RoutingSmokeResult = {
  provider: string | null
  distanceKm: number
  durationMinutes: number
  pointCount: number
  source: string | null
  testedAt: string
}

const CITY_COORDS: Record<string, GeoPoint> = {
  arras: { lat: 50.291, lng: 2.777, label: 'Arras' },
  bordeaux: { lat: 44.8378, lng: -0.5792, label: 'Bordeaux' },
  dijon: { lat: 47.322, lng: 5.0415, label: 'Dijon' },
  gennevilliers: { lat: 48.9333, lng: 2.3, label: 'Gennevilliers' },
  grenoble: { lat: 45.1885, lng: 5.7245, label: 'Grenoble' },
  'le havre': { lat: 49.4944, lng: 0.1079, label: 'Le Havre' },
  lens: { lat: 50.4319, lng: 2.8333, label: 'Lens' },
  lille: { lat: 50.6292, lng: 3.0573, label: 'Lille' },
  lyon: { lat: 45.764, lng: 4.8357, label: 'Lyon' },
  marseille: { lat: 43.2965, lng: 5.3698, label: 'Marseille' },
  metz: { lat: 49.1193, lng: 6.1757, label: 'Metz' },
  montpellier: { lat: 43.6119, lng: 3.8777, label: 'Montpellier' },
  nancy: { lat: 48.6921, lng: 6.1844, label: 'Nancy' },
  nantes: { lat: 47.2184, lng: -1.5536, label: 'Nantes' },
  nice: { lat: 43.7102, lng: 7.262, label: 'Nice' },
  orleans: { lat: 47.9029, lng: 1.9093, label: 'Orleans' },
  paris: { lat: 48.8566, lng: 2.3522, label: 'Paris' },
  reims: { lat: 49.2583, lng: 4.0317, label: 'Reims' },
  rennes: { lat: 48.1173, lng: -1.6778, label: 'Rennes' },
  rouen: { lat: 49.4431, lng: 1.0993, label: 'Rouen' },
  rungis: { lat: 48.746, lng: 2.3522, label: 'Rungis' },
  'saint nazaire': { lat: 47.2735, lng: -2.2137, label: 'Saint-Nazaire' },
  strasbourg: { lat: 48.5734, lng: 7.7521, label: 'Strasbourg' },
  toulouse: { lat: 43.6047, lng: 1.4442, label: 'Toulouse' },
  tours: { lat: 47.3941, lng: 0.6848, label: 'Tours' },
  valenciennes: { lat: 50.357, lng: 3.5235, label: 'Valenciennes' },
}

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'active', label: 'En route' },
  { key: 'warning', label: 'Retards' },
  { key: 'done', label: 'Termines' },
] as const

const STATUS_PROGRESS: Record<string, number> = {
  en_attente: 16,
  prise_en_charge: 40,
  a_l_heure: 72,
  retard_mineur: 66,
  retard_majeur: 58,
  termine: 100,
}

const DRIVER_STEP_LABELS: Record<string, string> = {
  vers_chargement: 'HLP vers chargement',
  chargement_en_cours: 'En cours de chargement',
  charge: 'Charge',
  vers_livraison: 'En route vers livraison',
  livre: 'Livre',
}

const ORS_SMOKE_ROUTE = {
  profile: 'driving-car',
  origin: { lat: 49.41461, lng: 8.681495 },
  destination: { lat: 49.420318, lng: 8.687872 },
}

const STATUS_BLOCKED_VEHICLE = new Set(['maintenance', 'hs', 'hors_service', 'vendu'])
const STATUS_BLOCKED_DRIVER = new Set(['inactif', 'conge', 'arret_maladie'])

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeStatus(value: string | null | undefined) {
  return (value ?? '').toLowerCase().trim()
}

function buildFallbackRoute(seed: string): GeoPoint[] {
  const pool = Object.values(CITY_COORDS)
  if (pool.length < 2) return [{ lat: 46.6034, lng: 1.8883, label: 'France' }]

  const hash = hashString(seed)
  const start = pool[hash % pool.length]
  let end = pool[(Math.floor(hash / 7) + 11) % pool.length]
  if (start.label === end.label) {
    end = pool[(Math.floor(hash / 11) + 17) % pool.length]
  }
  return [start, end]
}

function withDeterministicJitter(point: GeoPoint, seed: number, intensity = 0.006): GeoPoint {
  const latOffset = (((seed % 17) - 8) / 8) * intensity
  const lngOffset = ((((Math.floor(seed / 17)) % 17) - 8) / 8) * intensity
  return {
    lat: point.lat + latOffset,
    lng: point.lng + lngOffset,
    label: point.label,
  }
}

function getSimulatedProgress(
  transportStatus: string,
  statutOperationnel: StatutOps | null,
  vehicleStatus: string,
  driverStatus: string,
  hash: number,
) {
  if (transportStatus === 'livre' || transportStatus === 'facture' || statutOperationnel === 'termine') return 100

  const vehicleBlocked = STATUS_BLOCKED_VEHICLE.has(vehicleStatus)
  const driverBlocked = STATUS_BLOCKED_DRIVER.has(driverStatus)
  if (vehicleBlocked || driverBlocked) {
    const parkedBase = statutOperationnel === 'prise_en_charge' ? 34 : statutOperationnel === 'a_l_heure' ? 48 : 18
    return clamp(parkedBase + (hash % 8) - 3, 8, 64)
  }

  if (transportStatus === 'planifie' || statutOperationnel === 'en_attente') return 14 + (hash % 11)
  if (statutOperationnel === 'prise_en_charge') return 34 + (hash % 14)
  if (statutOperationnel === 'retard_majeur') return 52 + (hash % 9)
  if (statutOperationnel === 'retard_mineur') return 60 + (hash % 9)
  if (statutOperationnel === 'a_l_heure') return 68 + (hash % 12)

  const base = statutOperationnel ? (STATUS_PROGRESS[statutOperationnel] ?? 38) : 38
  return clamp(base + (hash % 10) - 4, 10, 90)
}

function getSimulatedLivePosition(
  routePoints: GeoPoint[],
  progress: number,
  transportStatus: string,
  vehicleStatus: string,
  driverStatus: string,
  hash: number,
) {
  const safeRoute = routePoints.length > 0 ? routePoints : [{ lat: 46.6034, lng: 1.8883, label: 'France' }]
  const first = safeRoute[0]
  const last = safeRoute[safeRoute.length - 1]
  const vehicleBlocked = STATUS_BLOCKED_VEHICLE.has(vehicleStatus)
  const driverBlocked = STATUS_BLOCKED_DRIVER.has(driverStatus)

  if (transportStatus === 'livre' || transportStatus === 'facture' || progress >= 99) {
    return withDeterministicJitter(last, hash, 0.003)
  }

  if (vehicleBlocked || driverBlocked) {
    return withDeterministicJitter(first, hash, 0.004)
  }

  return withDeterministicJitter(interpolateRoute(safeRoute, progress), hash, 0.005)
}

function toStatusLabel(value: string, fallback: string) {
  if (!value) return fallback
  const normalized = value.replace(/_/g, ' ')
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function buildScheduleStatusLabel(delayMinutes: number | null) {
  if (delayMinutes == null) return 'Ponctualite non estimee'
  if (delayMinutes <= -10) return `Avance ${Math.abs(delayMinutes)} min`
  if (delayMinutes <= 5) return 'A l heure'
  return `Retard ${delayMinutes} min`
}

function estimatePunctuality(
  delayMinutes: number | null,
  statutOperationnel: StatutOps | null,
  transportStatus: string,
) {
  if (delayMinutes != null) {
    if (delayMinutes <= -8) return { band: 'avance' as const, alertLevel: 'normal' as const, label: `En avance (${Math.abs(delayMinutes)} min)` }
    if (delayMinutes <= 7) return { band: 'a_heure' as const, alertLevel: 'normal' as const, label: 'A l heure' }
    if (delayMinutes <= 25) return { band: 'retard_surveillance' as const, alertLevel: 'warning' as const, label: `En retard (${delayMinutes} min)` }
    return { band: 'retard_critique' as const, alertLevel: 'critical' as const, label: `Retard critique (${delayMinutes} min)` }
  }

  if (transportStatus === 'livre' || transportStatus === 'facture' || statutOperationnel === 'termine') {
    return { band: 'a_heure' as const, alertLevel: 'normal' as const, label: 'Livraison terminee' }
  }
  if (statutOperationnel === 'retard_majeur') {
    return { band: 'retard_critique' as const, alertLevel: 'critical' as const, label: 'Retard critique estime' }
  }
  if (statutOperationnel === 'retard_mineur' || statutOperationnel === 'en_attente') {
    return { band: 'retard_surveillance' as const, alertLevel: 'warning' as const, label: 'Sous surveillance ponctualite' }
  }
  if (statutOperationnel === 'a_l_heure') {
    return { band: 'a_heure' as const, alertLevel: 'normal' as const, label: 'A l heure (statut exploitation)' }
  }

  return { band: 'retard_surveillance' as const, alertLevel: 'warning' as const, label: 'Ponctualite a confirmer' }
}

function buildFuelTelemetry(progress: number, delayMinutes: number | null, alertLevel: LiveMission['alertLevel'], hash: number) {
  const delayPenalty = delayMinutes && delayMinutes > 0 ? Math.min(16, Math.round(delayMinutes / 4)) : 0
  const severityPenalty = alertLevel === 'critical' ? 10 : alertLevel === 'warning' ? 4 : 0
  const baseFuel = 92 - Math.round(progress * 0.58) - delayPenalty - severityPenalty + ((hash % 7) - 3)
  const fuelPercent = clamp(baseFuel, 7, 98)
  const fuelLevel: LiveMission['fuelLevel'] = fuelPercent <= 15 ? 'critical' : fuelPercent <= 30 ? 'low' : 'ok'
  return { fuelPercent, fuelLevel }
}

function buildTachyTelemetry(progress: number, driverStatus: string, hash: number) {
  if (STATUS_BLOCKED_DRIVER.has(driverStatus)) {
    return { tachyStatusLabel: 'Conducteur indisponible', tachyDriveLeftMinutes: 0 }
  }

  const consumed = Math.round(progress * 2.7) + (hash % 40)
  const driveLeft = clamp(270 - consumed, 0, 270)
  const tachyStatusLabel = driveLeft <= 25 ? 'Pause reglementaire requise' : driveLeft <= 70 ? 'Pause proche' : 'Conduite conforme'
  return { tachyStatusLabel, tachyDriveLeftMinutes: driveLeft }
}

function pickSingle<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeCity(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function resolveGeoPoint(step: StepRow, seed: string): GeoPoint | null {
  const linkedAddress = pickSingle(step.adresses)
  if (linkedAddress?.latitude != null && linkedAddress.longitude != null) {
    return {
      lat: linkedAddress.latitude,
      lng: linkedAddress.longitude,
      label: linkedAddress.nom_lieu || linkedAddress.ville,
    }
  }

  const cityLabel = step.ville ?? step.adresse_libre
  const normalized = normalizeCity(cityLabel)
  if (normalized && CITY_COORDS[normalized]) return CITY_COORDS[normalized]

  if (!cityLabel) return null

  const hash = hashString(`${seed}:${cityLabel}`)
  return {
    lat: 43.9 + (hash % 650) / 100,
    lng: -1.7 + (Math.floor(hash / 37) % 900) / 100,
    label: cityLabel,
  }
}

function formatEta(value: string | null): string {
  if (!value) return 'ETA non communiquee'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function geoDistance(a: GeoPoint, b: GeoPoint): number {
  const dx = a.lng - b.lng
  const dy = a.lat - b.lat
  return Math.sqrt(dx * dx + dy * dy)
}

function interpolateRoute(points: GeoPoint[], progress: number): GeoPoint {
  if (points.length === 0) return { lat: 46.6034, lng: 1.8883, label: 'France' }
  if (points.length === 1) return points[0]

  const segments = points.slice(0, -1).map((point, index) => ({
    start: point,
    end: points[index + 1],
    length: geoDistance(point, points[index + 1]),
  }))

  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0)
  if (totalLength === 0) return points[0]

  let remaining = (Math.max(0, Math.min(100, progress)) / 100) * totalLength
  for (const segment of segments) {
    if (remaining <= segment.length) {
      const ratio = segment.length === 0 ? 0 : remaining / segment.length
      return {
        lat: segment.start.lat + (segment.end.lat - segment.start.lat) * ratio,
        lng: segment.start.lng + (segment.end.lng - segment.start.lng) * ratio,
        label: segment.end.label,
      }
    }
    remaining -= segment.length
  }

  return points[points.length - 1]
}

function createTruckIcon(alertLevel: LiveMission['alertLevel'], selected: boolean, label: string) {
  const fill = alertLevel === 'critical' ? '#e11d48' : alertLevel === 'warning' ? '#f59e0b' : '#0ea5e9'
  const ring = selected ? '#f8fafc' : 'rgba(255,255,255,0.78)'
  const shadow = selected ? '0 12px 30px rgba(15,23,42,0.42)' : '0 10px 24px rgba(15,23,42,0.28)'

  return L.divIcon({
    className: '',
    iconSize: [62, 54],
    iconAnchor: [31, 27],
    html: `
      <div style="position:relative;width:62px;height:54px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:10px 12px 12px 12px;border-radius:999px;background:${fill};opacity:0.18;"></div>
        <div style="position:relative;width:38px;height:38px;border-radius:999px;background:${fill};border:3px solid ${ring};box-shadow:${shadow};display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 8h11v7H3z"></path>
            <path d="M14 11h3l3 3v1h-6z"></path>
            <circle cx="7.5" cy="17.5" r="1.5"></circle>
            <circle cx="17.5" cy="17.5" r="1.5"></circle>
          </svg>
        </div>
        <div style="position:absolute;bottom:0;left:0;right:0;margin:0 auto;width:max-content;padding:4px 8px;border-radius:999px;background:rgba(2,6,23,0.86);color:#f8fafc;font:600 10px/1 Inter,system-ui,sans-serif;letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap;">${label}</div>
      </div>
    `,
  })
}

function createStopIcon(color: string) {
  return L.divIcon({
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<div style="width:18px;height:18px;border-radius:999px;background:${color};border:3px solid rgba(255,255,255,0.92);box-shadow:0 8px 20px rgba(15,23,42,0.22);"></div>`,
  })
}

function safeNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function fetchV11(path: string, accessToken: string) {
  try {
    const response = await fetch(path, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-tenant-key': 'default',
      },
    })

    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

function parseTrackingPayload(raw: unknown): TrackingLivePayload | null {
  if (!raw || typeof raw !== 'object') return null
  const root = raw as Record<string, unknown>
  const data = (root.data && typeof root.data === 'object') ? root.data as Record<string, unknown> : root

  const lat = safeNumber(data.latitude)
  const lng = safeNumber(data.longitude)
  if (lat == null || lng == null) return null

  const timestamp = typeof data.timestamp === 'string'
    ? data.timestamp
    : typeof data.position_at === 'string'
      ? data.position_at
      : null

  return { lat, lng, timestamp }
}

function parseEtaPayload(raw: unknown): EtaLivePayload | null {
  if (!raw || typeof raw !== 'object') return null
  const root = raw as Record<string, unknown>
  const data = (root.data && typeof root.data === 'object') ? root.data as Record<string, unknown> : root
  const etaPrediction = data.EtaPrediction && typeof data.EtaPrediction === 'object'
    ? data.EtaPrediction as Record<string, unknown>
    : null

  const etaAt = typeof etaPrediction?.eta_at === 'string'
    ? etaPrediction.eta_at
    : typeof data.eta_at === 'string'
      ? data.eta_at
      : null

  const delayMinutes = safeNumber(etaPrediction?.delay_minutes ?? data.delay_minutes)
  const confidence = safeNumber(etaPrediction?.confidence ?? data.confidence)

  return { etaAt, delayMinutes, confidence }
}

function parseDriverHistoryRow(row: DriverHistoryRow): DriverLivePayload | null {
  const rawStep = row.statut_nouveau?.startsWith('conducteur:')
    ? row.statut_nouveau.slice('conducteur:'.length)
    : null

  let payload: Record<string, unknown> | null = null
  if (row.commentaire) {
    try {
      const parsed = JSON.parse(row.commentaire) as unknown
      if (parsed && typeof parsed === 'object') payload = parsed as Record<string, unknown>
    } catch {
      payload = null
    }
  }

  const payloadStep = typeof payload?.step === 'string' ? payload.step : null
  const stepKey = rawStep ?? payloadStep
  const stepLabel = stepKey
    ? (DRIVER_STEP_LABELS[stepKey] ?? (typeof payload?.stepLabel === 'string' ? payload.stepLabel : stepKey))
    : null

  const gpsData = payload?.gps && typeof payload.gps === 'object'
    ? payload.gps as Record<string, unknown>
    : null

  const lat = safeNumber(gpsData?.lat)
  const lng = safeNumber(gpsData?.lng)
  const gpsTimestamp = typeof gpsData?.captured_at === 'string' ? gpsData.captured_at : null
  const timestamp = gpsTimestamp ?? row.created_at ?? null

  if (!stepLabel && lat == null && lng == null) return null
  return {
    stepLabel,
    timestamp,
    lat,
    lng,
  }
}

function closestLabel(points: GeoPoint[], fallback: string, lat: number, lng: number) {
  if (points.length === 0) return fallback
  const target: GeoPoint = { lat, lng, label: fallback }
  let nearest = points[0]
  let minDistance = geoDistance(points[0], target)

  for (let index = 1; index < points.length; index += 1) {
    const distance = geoDistance(points[index], target)
    if (distance < minDistance) {
      minDistance = distance
      nearest = points[index]
    }
  }
  return nearest.label
}

function minutesSince(timestamp: string | null, fallback: number) {
  if (!timestamp) return fallback
  const ms = new Date(timestamp).getTime()
  if (Number.isNaN(ms)) return fallback
  return Math.max(0, Math.round((Date.now() - ms) / 60000))
}

function fallbackIncidentScore(mission: LiveMission) {
  const base = mission.alertLevel === 'critical' ? 90 : mission.alertLevel === 'warning' ? 60 : 30
  const delay = mission.etaDelayMinutes ?? 0
  const confidencePenalty = mission.etaConfidence != null ? Math.max(0, Math.round((1 - mission.etaConfidence) * 20)) : 6
  return base + delay + confidencePenalty
}

function parseAiAnalysisPayload(raw: unknown) {
  if (!raw || typeof raw !== 'object') return { summary: 'Analyse IA indisponible.', recommendation: null as string | null }
  const data = raw as Record<string, unknown>
  const summary = typeof data.summary === 'string' && data.summary.trim()
    ? data.summary.trim()
    : 'Analyse IA disponible sans resume detaille.'
  const recommendations = Array.isArray(data.recommendations)
    ? data.recommendations.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())
    : []
  return {
    summary,
    recommendation: recommendations[0] ?? null,
  }
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function buildMission(
  row: MissionRow,
  steps: StepRow[],
  tracking: TrackingLivePayload | null,
  eta: EtaLivePayload | null,
  driverLive: DriverLivePayload | null,
): LiveMission {
  const client = pickSingle(row.clients)
  const conducteur = pickSingle(row.conducteurs)
  const vehicule = pickSingle(row.vehicules)
  const sortedSteps = [...steps].sort((left, right) => left.ordre - right.ordre)
  const routePointsFromSteps = sortedSteps
    .map(step => resolveGeoPoint(step, row.id))
    .filter((point): point is GeoPoint => Boolean(point))
  const routePoints = routePointsFromSteps.length > 0 ? routePointsFromSteps : buildFallbackRoute(`${row.reference}:${row.id}`)

  const statusKey = row.statut_operationnel && row.statut_operationnel in STATUT_OPS ? (row.statut_operationnel as StatutOps) : null
  const hash = hashString(`${row.reference}:${row.id}`)
  const transportStatus = normalizeStatus(row.statut)
  const vehicleStatus = normalizeStatus(vehicule?.statut)
  const driverStatus = normalizeStatus(conducteur?.statut)
  const nextStep = sortedSteps.find(step => step.statut === 'en_cours' || step.statut === 'en_attente') ?? sortedSteps[sortedSteps.length - 1] ?? null
  const progress = getSimulatedProgress(transportStatus, statusKey, vehicleStatus, driverStatus, hash)
  const fallbackLivePosition = getSimulatedLivePosition(routePoints, progress, transportStatus, vehicleStatus, driverStatus, hash)
  const punctuality = estimatePunctuality(eta?.delayMinutes ?? null, statusKey, transportStatus)
  const scheduleStatusLabel = eta?.delayMinutes != null ? buildScheduleStatusLabel(eta.delayMinutes) : punctuality.label
  const { fuelPercent, fuelLevel } = buildFuelTelemetry(progress, eta?.delayMinutes ?? null, punctuality.alertLevel, hash)
  const { tachyStatusLabel, tachyDriveLeftMinutes } = buildTachyTelemetry(progress, driverStatus, hash)
  const driverLat = driverLive?.lat ?? null
  const driverLng = driverLive?.lng ?? null
  const hasDriverGps = driverLat != null && driverLng != null
  const livePosition = hasDriverGps
    ? {
        lat: driverLat!,
        lng: driverLng!,
        label: closestLabel(routePoints, fallbackLivePosition.label, driverLat!, driverLng!),
      }
    : tracking
    ? {
        lat: tracking.lat,
        lng: tracking.lng,
        label: closestLabel(routePoints, fallbackLivePosition.label, tracking.lat, tracking.lng),
      }
    : fallbackLivePosition

  return {
    id: row.id,
    reference: row.reference,
    clientName: client?.nom ?? 'Client non renseigne',
    conducteurName: conducteur ? `${conducteur.prenom} ${conducteur.nom}` : 'Conducteur non affecte',
    vehiculeName: vehicule ? `${vehicule.immatriculation}${vehicule.marque ? ` - ${vehicule.marque}` : ''}` : 'Vehicule non affecte',
    statutOperationnel: statusKey,
    distanceKm: row.distance_km,
    commodity: row.nature_marchandise,
    lastPingMinutes: minutesSince(driverLive?.timestamp ?? tracking?.timestamp ?? null, 1 + (hash % 7)),
    etaLabel: formatEta(eta?.etaAt ?? row.date_livraison_prevue),
    etaDelayMinutes: eta?.delayMinutes ?? null,
    etaConfidence: eta?.confidence ?? null,
    progress,
    alertLevel: punctuality.alertLevel,
    routePoints,
    livePosition,
    nextStopLabel: nextStep?.ville ?? nextStep?.adresse_libre ?? routePoints[routePoints.length - 1]?.label ?? 'Prochaine etape',
    driverStepLabel: driverLive?.stepLabel ?? null,
    driverUpdateAt: driverLive?.timestamp ?? null,
    driverHasGps: hasDriverGps,
    scheduleStatusLabel,
    fuelPercent,
    fuelLevel,
    tachyStatusLabel,
    tachyDriveLeftMinutes,
    driverStatusLabel: toStatusLabel(driverStatus, 'Statut inconnu'),
    vehicleStatusLabel: toStatusLabel(vehicleStatus, 'Statut inconnu'),
    punctualityBand: punctuality.band,
  }
}

export default function MapLive() {
  const [searchParams] = useSearchParams()
  const [missions, setMissions] = useState<LiveMission[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('active')
  const [renderMode, setRenderMode] = useState<MapRenderMode>('points')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [incidentAiByMission, setIncidentAiByMission] = useState<Record<string, IncidentAiInsight>>({})
  const [incidentsRefreshing, setIncidentsRefreshing] = useState(false)
  const [routingSmokeRunning, setRoutingSmokeRunning] = useState(false)
  const [routingSmokeResult, setRoutingSmokeResult] = useState<RoutingSmokeResult | null>(null)
  const [routingSmokeError, setRoutingSmokeError] = useState<string | null>(null)
  const requestedOtId = searchParams.get('ot')
  const requestedRef = (searchParams.get('ref') ?? '').trim().toUpperCase()
  const requestedFilter = searchParams.get('filter')

  const mapFrameRef = useRef<HTMLDivElement | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const stopLayerRef = useRef<L.LayerGroup | null>(null)
  const focusKeyRef = useRef<string>('')
  const aiFingerprintRef = useRef<Record<string, string>>({})
  const incidentAiRef = useRef<Record<string, IncidentAiInsight>>({})

  async function fetchIncidentAiInsight(accessToken: string, mission: LiveMission): Promise<IncidentAiInsight | null> {
    const fallbackDelay = mission.alertLevel === 'critical' ? 45 : mission.alertLevel === 'warning' ? 18 : 5
    const delayMinutes = mission.etaDelayMinutes ?? fallbackDelay
    const confidence = mission.etaConfidence ?? 0.62

    try {
      const response = await fetch('/.netlify/functions/v11-ai', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-tenant-key': 'default',
        },
        body: JSON.stringify({
          action: 'assistant',
          payload: {
            ot_id: mission.id,
            mission_reference: mission.reference,
            status: mission.statutOperationnel,
            client: mission.clientName,
            driver: mission.conducteurName,
            vehicle: mission.vehiculeName,
            next_stop: mission.nextStopLabel,
            last_ping_minutes: mission.lastPingMinutes,
            delay_minutes: delayMinutes,
            confidence,
            eta: {
              delay_minutes: delayMinutes,
              confidence,
            },
          },
        }),
      })

      if (!response.ok) return null

      const payload = await response.json().catch(() => null) as Record<string, unknown> | null
      const data = payload?.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : null
      const analysis = parseAiAnalysisPayload(data?.analysis)
      const recommendationBoost = analysis.recommendation ? 8 : 0
      const summaryBoost = /immediat|reaffect|retard/i.test(analysis.summary) ? 6 : 0

      return {
        summary: analysis.summary,
        recommendation: analysis.recommendation,
        priorityScore: fallbackIncidentScore(mission) + recommendationBoost + summaryBoost,
        source: typeof data?.source === 'string' ? data.source : 'internal',
      }
    } catch {
      return null
    }
  }

  const loadData = useCallback(async () => {
    setRefreshing(true)

    let missionRows: unknown[] | null = null
    let missionError: { message?: string } | null = null

    // Essai avec FK joins
    const fullR = await supabase
      .from('ordres_transport')
      .select(`
        id,
        reference,
        statut,
        vehicule_id,
        statut_operationnel,
        date_livraison_prevue,
        distance_km,
        nature_marchandise,
        clients!ordres_transport_client_id_fkey(nom),
        conducteurs(prenom, nom, statut),
        vehicules(immatriculation, marque, statut)
      `)
      .in('statut', ['planifie', 'en_cours', 'livre', 'facture'])
      .neq('statut', 'annule')
      .order('updated_at', { ascending: false })
      .limit(28)

    if (fullR.error) {
      // Fallback sans FK joins
      const bareR = await supabase
        .from('ordres_transport')
        .select('id, reference, statut, vehicule_id, statut_operationnel, date_livraison_prevue, distance_km, nature_marchandise')
        .in('statut', ['planifie', 'en_cours', 'livre', 'facture'])
        .neq('statut', 'annule')
        .order('updated_at', { ascending: false })
        .limit(28)
      missionRows = bareR.data as unknown[] | null
      missionError = bareR.error
    } else {
      missionRows = fullR.data as unknown[] | null
      missionError = fullR.error
    }

    const [{ data: stepRows, error: stepError }, { data: sessionData }] = await Promise.all([
      supabase
        .from('etapes_mission')
        .select(`
          id,
          ot_id,
          ordre,
          ville,
          adresse_libre,
          statut,
          adresses(latitude, longitude, nom_lieu, ville)
        `)
        .order('ordre'),
      supabase.auth.getSession(),
    ])

    if (missionError || stepError) {
      setMissions([])
      setSelectedId(null)
      setLoading(false)
      setRefreshing(false)
      return
    }

    const stepsByMission = new Map<string, StepRow[]>()
    for (const step of (stepRows ?? []) as StepRow[]) {
      const current = stepsByMission.get(step.ot_id) ?? []
      current.push(step)
      stepsByMission.set(step.ot_id, current)
    }

    const accessToken = sessionData.session?.access_token ?? null
    const missionList = (missionRows ?? []) as MissionRow[]
    const latestDriverByMission = new Map<string, DriverLivePayload>()

    if (missionList.length > 0) {
      const { data: historyRows, error: historyError } = await supabase
        .from('historique_statuts')
        .select('id,ot_id,created_at,statut_nouveau,commentaire')
        .in('ot_id', missionList.map(mission => mission.id))
        .order('created_at', { ascending: false })

      if (!historyError && historyRows) {
        for (const row of historyRows as DriverHistoryRow[]) {
          if (latestDriverByMission.has(row.ot_id)) continue
          const parsed = parseDriverHistoryRow(row)
          if (!parsed) continue
          latestDriverByMission.set(row.ot_id, parsed)
        }
      }
    }

    const enrichments = new Map<string, { tracking: TrackingLivePayload | null; eta: EtaLivePayload | null }>()

    if (accessToken) {
      await Promise.all(
        missionList.map(async mission => {
          const trackingPath = mission.vehicule_id
            ? `/.netlify/functions/v11-tracking?vehicle_id=${encodeURIComponent(mission.vehicule_id)}`
            : null
          const etaPath = `/.netlify/functions/v11-eta?ot_id=${encodeURIComponent(mission.id)}`

          const [trackingRaw, etaRaw] = await Promise.all([
            trackingPath ? fetchV11(trackingPath, accessToken) : Promise.resolve(null),
            fetchV11(etaPath, accessToken),
          ])

          enrichments.set(mission.id, {
            tracking: parseTrackingPayload(trackingRaw),
            eta: parseEtaPayload(etaRaw),
          })
        }),
      )
    }

    const nextMissions = missionList
      .map(row => {
        const enrichment = enrichments.get(row.id)
        return buildMission(
          row,
          stepsByMission.get(row.id) ?? [],
          enrichment?.tracking ?? null,
          enrichment?.eta ?? null,
          latestDriverByMission.get(row.id) ?? null,
        )
      })
      .filter(mission => mission.routePoints.length > 0 || mission.driverHasGps)
      .sort((left, right) => {
        const severity = { critical: 0, warning: 1, normal: 2 }
        return severity[left.alertLevel] - severity[right.alertLevel]
      })

    setMissions(nextMissions)
    setSelectedId(current => current && nextMissions.some(mission => mission.id === current) ? current : nextMissions[0]?.id ?? null)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    const key = requestedFilter as (typeof FILTERS)[number]['key'] | null
    if (!key) return
    if (FILTERS.some(item => item.key === key)) setFilter(key)
  }, [requestedFilter])

  useEffect(() => {
    if (!missions.length) return

    if (requestedOtId) {
      const byId = missions.find(mission => mission.id === requestedOtId)
      if (byId && selectedId !== byId.id) setSelectedId(byId.id)
      return
    }

    if (requestedRef) {
      const byRef = missions.find(mission => mission.reference.toUpperCase() === requestedRef)
      if (byRef && selectedId !== byRef.id) setSelectedId(byRef.id)
      return
    }
  }, [missions, requestedOtId, requestedRef, selectedId])

  useEffect(() => {
    const db = looseSupabase
    let timerId: number | null = null
    const scheduleReload = () => {
      if (timerId !== null) window.clearTimeout(timerId)
      timerId = window.setTimeout(() => {
        void loadData()
      }, 280)
    }

    const channel = db
      .channel('map-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordres_transport' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'etapes_mission' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historique_statuts' }, scheduleReload)
      .subscribe()

    return () => {
      if (timerId !== null) window.clearTimeout(timerId)
      void supabase.removeChannel(channel)
    }
  }, [loadData])

  const filtered = useMemo(() => {
    if (filter === 'all') return missions
    if (filter === 'active') return missions.filter(mission => mission.statutOperationnel !== 'termine')
    if (filter === 'warning') return missions.filter(mission => mission.alertLevel !== 'normal')
    return missions.filter(mission => mission.statutOperationnel === 'termine')
  }, [filter, missions])

  const incidentCandidates = useMemo(
    () => missions.filter(mission => mission.alertLevel !== 'normal'),
    [missions],
  )

  useEffect(() => {
    let active = true

    async function loadIncidentInsights() {
      if (incidentCandidates.length === 0) {
        aiFingerprintRef.current = {}
        if (active) setIncidentAiByMission({})
        if (active) setIncidentsRefreshing(false)
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token ?? null
      if (!accessToken) {
        if (active) setIncidentsRefreshing(false)
        return
      }

      setIncidentsRefreshing(true)

      const nextInsights: Record<string, IncidentAiInsight> = {}
      await Promise.all(
        incidentCandidates.map(async mission => {
          const fingerprint = [
            mission.alertLevel,
            mission.statutOperationnel ?? 'none',
            mission.etaDelayMinutes ?? 'na',
            mission.etaConfidence ?? 'na',
            mission.lastPingMinutes,
          ].join('|')

          if (aiFingerprintRef.current[mission.id] === fingerprint && incidentAiRef.current[mission.id]) {
            nextInsights[mission.id] = incidentAiRef.current[mission.id]
            return
          }

          const insight = await fetchIncidentAiInsight(accessToken, mission)
          if (!insight) return
          aiFingerprintRef.current[mission.id] = fingerprint
          nextInsights[mission.id] = insight
        }),
      )

      if (!active) return

      const allowedIds = new Set(incidentCandidates.map(mission => mission.id))
      const merged: Record<string, IncidentAiInsight> = {}
      for (const missionId of Object.keys(incidentAiRef.current)) {
        if (allowedIds.has(missionId)) merged[missionId] = incidentAiRef.current[missionId]
      }
      for (const [missionId, insight] of Object.entries(nextInsights)) merged[missionId] = insight

      incidentAiRef.current = merged
      setIncidentAiByMission(merged)
      setIncidentsRefreshing(false)
    }

    void loadIncidentInsights().catch(() => {
      if (active) setIncidentsRefreshing(false)
    })

    return () => {
      active = false
    }
  }, [incidentCandidates])

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null)
      return
    }
    if (!filtered.some(mission => mission.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  const selected = filtered.find(mission => mission.id === selectedId) ?? filtered[0] ?? null
  const missionsOnTime = missions.filter(mission => mission.punctualityBand === 'a_heure' || mission.punctualityBand === 'avance').length
  const missionsInDelay = missions.filter(mission => mission.punctualityBand === 'retard_surveillance').length
  const criticalCount = missions.filter(mission => mission.punctualityBand === 'retard_critique').length
  const prioritizedIncidents = useMemo(() => {
    return missions
      .filter(mission => mission.alertLevel !== 'normal')
      .map(mission => ({
        mission,
        ai: incidentAiByMission[mission.id] ?? null,
        score: incidentAiByMission[mission.id]?.priorityScore ?? fallbackIncidentScore(mission),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 4)
  }, [incidentAiByMission, missions])

  useEffect(() => {
    if (filtered.length > 12 && renderMode === 'itineraires') {
      setRenderMode('points')
    }
  }, [filtered.length, renderMode])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true,
    }).setView([46.6034, 1.8883], 6)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }).addTo(map)

    L.control.attribution({ position: 'bottomright', prefix: false }).addAttribution('&copy; OpenStreetMap contributors &copy; CARTO').addTo(map)

    routeLayerRef.current = L.layerGroup().addTo(map)
    markerLayerRef.current = L.layerGroup().addTo(map)
    stopLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    function handleFullscreenChange() {
      const active = document.fullscreenElement === mapFrameRef.current
      setIsFullscreen(active)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Re-trigger invalidateSize AFTER React re-renders the new container height class
  useEffect(() => {
    const t1 = window.setTimeout(() => mapRef.current?.invalidateSize(), 80)
    const t2 = window.setTimeout(() => mapRef.current?.invalidateSize(), 350)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isFullscreen])

  useEffect(() => {
    const map = mapRef.current
    const routeLayer = routeLayerRef.current
    const markerLayer = markerLayerRef.current
    const stopLayer = stopLayerRef.current

    if (!map || !routeLayer || !markerLayer || !stopLayer) return

    routeLayer.clearLayers()
    markerLayer.clearLayers()
    stopLayer.clearLayers()

    if (!filtered.length) return

    const allBounds = L.latLngBounds([])
    const drawRoutes = renderMode === 'itineraires' && filtered.length <= 12

    for (const mission of filtered) {
      const isSelected = selected?.id === mission.id
      const color = mission.alertLevel === 'critical' ? '#e11d48' : mission.alertLevel === 'warning' ? '#f59e0b' : '#0ea5e9'
      const routeCoords: L.LatLngExpression[] = mission.routePoints.map(point => [point.lat, point.lng])

      if (drawRoutes && routeCoords.length >= 2) {
        L.polyline(routeCoords, {
          color,
          weight: isSelected ? 6 : 4,
          opacity: isSelected ? 0.92 : 0.48,
          dashArray: isSelected ? undefined : '10 8',
        }).addTo(routeLayer)
      }

      for (const point of mission.routePoints) {
        allBounds.extend([point.lat, point.lng])
      }
      allBounds.extend([mission.livePosition.lat, mission.livePosition.lng])

      const marker = L.marker([mission.livePosition.lat, mission.livePosition.lng], {
        icon: createTruckIcon(mission.alertLevel, isSelected, mission.reference),
        zIndexOffset: isSelected ? 1000 : 100,
      }).addTo(markerLayer)

      marker.on('click', () => setSelectedId(mission.id))
      marker.bindTooltip(`${mission.reference} - ${mission.clientName}`, {
        direction: 'top',
        offset: [0, -20],
        opacity: 0.94,
      })
      marker.bindPopup(
        `<div style="min-width:220px">
          <div style="font-weight:700;color:#0f172a">${mission.reference}</div>
          <div style="margin-top:4px;color:#334155">${mission.livePosition.label}</div>
          <div style="margin-top:6px;font-size:12px;color:#475569">${mission.scheduleStatusLabel}</div>
          <div style="margin-top:4px;font-size:12px;color:#475569">Essence: ${mission.fuelPercent}%</div>
          <div style="margin-top:4px;font-size:12px;color:#475569">Tachy: ${mission.tachyStatusLabel}</div>
        </div>`,
        { closeButton: true },
      )
    }

    if (selected) {
      const firstPoint = selected.routePoints[0]
      const lastPoint = selected.routePoints[selected.routePoints.length - 1]

      if (drawRoutes && firstPoint) {
        L.marker([firstPoint.lat, firstPoint.lng], { icon: createStopIcon('#0f172a') })
          .bindTooltip(`Depart - ${firstPoint.label}`, { direction: 'right', opacity: 0.94 })
          .addTo(stopLayer)
      }

      if (drawRoutes && lastPoint) {
        L.marker([lastPoint.lat, lastPoint.lng], { icon: createStopIcon('#16a34a') })
          .bindTooltip(`Arrivee - ${lastPoint.label}`, { direction: 'left', opacity: 0.94 })
          .addTo(stopLayer)
      }

      const selectedBounds = L.latLngBounds([])
      for (const point of selected.routePoints) {
        selectedBounds.extend([point.lat, point.lng])
      }
      selectedBounds.extend([selected.livePosition.lat, selected.livePosition.lng])

      const focusKey = `${selected.id}:${selected.progress}:${filter}:${renderMode}`
      if (selectedBounds.isValid() && focusKeyRef.current !== focusKey) {
        map.flyToBounds(selectedBounds.pad(0.28), { duration: 0.65 })
        focusKeyRef.current = focusKey
      }
      return
    }

    const focusKey = `all:${filter}:${filtered.length}:${renderMode}`
    if (allBounds.isValid() && focusKeyRef.current !== focusKey) {
      map.flyToBounds(allBounds.pad(0.22), { duration: 0.65 })
      focusKeyRef.current = focusKey
    }
  }, [filter, filtered, renderMode, selected])

  async function toggleFullscreen() {
    if (!mapFrameRef.current) return

    if (document.fullscreenElement === mapFrameRef.current) {
      await document.exitFullscreen()
      return
    }

    await mapFrameRef.current.requestFullscreen()
  }

  async function runRoutingSmokeTest() {
    setRoutingSmokeRunning(true)
    setRoutingSmokeError(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token ?? null
      if (!accessToken) {
        setRoutingSmokeResult(null)
        setRoutingSmokeError('Session invalide: reconnecte-toi pour tester v11-routing.')
        return
      }

      const response = await fetch('/.netlify/functions/v11-routing', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-tenant-key': 'default',
        },
        body: JSON.stringify({
          origin: ORS_SMOKE_ROUTE.origin,
          destination: ORS_SMOKE_ROUTE.destination,
          profile: ORS_SMOKE_ROUTE.profile,
        }),
      })

      const payload = await response.json().catch(() => null) as Record<string, unknown> | null
      if (!response.ok || !payload) {
        const errorMessage = (payload && typeof payload.error === 'string' && payload.error.trim())
          ? payload.error.trim()
          : `HTTP ${response.status}`
        setRoutingSmokeResult(null)
        setRoutingSmokeError(`Echec test ORS: ${errorMessage}`)
        return
      }

      const data = payload.data && typeof payload.data === 'object'
        ? payload.data as Record<string, unknown>
        : null
      const routePlan = data?.RoutePlan && typeof data.RoutePlan === 'object'
        ? data.RoutePlan as Record<string, unknown>
        : null
      const geometry = Array.isArray(routePlan?.geometry) ? routePlan.geometry : []
      const distanceKm = toFiniteNumber(routePlan?.distance_km)
      const durationMinutes = toFiniteNumber(routePlan?.duration_minutes)

      if (distanceKm == null || durationMinutes == null || geometry.length < 2) {
        setRoutingSmokeResult(null)
        setRoutingSmokeError('Reponse v11-routing incomplete (distance/duree/geometry manquante).')
        return
      }

      setRoutingSmokeResult({
        provider: typeof data?.provider === 'string' ? data.provider : null,
        distanceKm,
        durationMinutes,
        pointCount: geometry.length,
        source: typeof payload.source === 'string' ? payload.source : null,
        testedAt: new Date().toISOString(),
      })
    } catch {
      setRoutingSmokeResult(null)
      setRoutingSmokeError('Echec test ORS: fonction indisponible ou erreur reseau.')
    } finally {
      setRoutingSmokeRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <section
        className="nx-card overflow-hidden p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #08111f 0%, #0f172a 48%, #082f49 100%)' }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Exploitation navigation</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Map live</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Carte temps reel type dispatch, avec fond cartographique reel, trajets, vehicules et focus mission.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void runRoutingSmokeTest()}
              disabled={routingSmokeRunning}
              className="rounded-2xl border border-cyan-300/35 bg-cyan-400/12 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-60"
            >
              {routingSmokeRunning ? 'Test ORS...' : 'Test ORS driving-car'}
            </button>
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={refreshing}
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/14 disabled:opacity-60"
            >
              {refreshing ? 'Actualisation...' : 'Actualiser la carte'}
            </button>
          </div>
        </div>

        {(routingSmokeResult || routingSmokeError) && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${routingSmokeError ? 'border-rose-300/35 bg-rose-400/10 text-rose-100' : 'border-cyan-300/35 bg-cyan-400/8 text-cyan-50'}`}
          >
            {routingSmokeError ? (
              <p>{routingSmokeError}</p>
            ) : routingSmokeResult ? (
              <p>
                ORS OK ({ORS_SMOKE_ROUTE.profile}) - {routingSmokeResult.distanceKm.toFixed(1)} km, {routingSmokeResult.durationMinutes.toFixed(0)} min, {routingSmokeResult.pointCount} points.
                {' '}Provider: {routingSmokeResult.provider ?? 'internal'}.
                {routingSmokeResult.source ? ` Source: ${routingSmokeResult.source}.` : ''}
                {' '}Teste a {formatEta(routingSmokeResult.testedAt)}.
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Missions suivies" value={String(missions.length)} detail="Vehicules et routes visibles" />
          <MetricCard label="A l'heure / avance" value={String(missionsOnTime)} detail="Ponctualite tenue" />
          <MetricCard label="Sous surveillance" value={String(missionsInDelay)} detail="Retard modere a surveiller" />
          <MetricCard label="Critiques" value={String(criticalCount)} detail="Retard majeur prioritaire" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_380px]">
        <section className="nx-card overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b px-5 py-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--border)' }}>
            <div>
              <p className="text-sm font-semibold">Carte navigation</p>
              <p className="mt-1 text-xs nx-subtle">Mode points pour forte densite, ou itineraires quand la charge carte est faible.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={[
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                    filter === item.key ? 'text-white' : '',
                  ].join(' ')}
                  style={filter === item.key
                    ? { borderColor: '#0f172a', background: '#0f172a' }
                    : { borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                {isFullscreen ? 'Quitter plein ecran' : 'Plein ecran'}
              </button>
              <button
                type="button"
                onClick={() => setRenderMode('points')}
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
                style={renderMode === 'points'
                  ? { borderColor: '#0f172a', background: '#0f172a', color: '#fff' }
                  : { borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                Points
              </button>
              <button
                type="button"
                onClick={() => setRenderMode('itineraires')}
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
                style={renderMode === 'itineraires'
                  ? { borderColor: '#0f172a', background: '#0f172a', color: '#fff' }
                  : { borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                Itineraires
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div
              ref={mapFrameRef}
              className={`overflow-hidden rounded-[28px] border bg-slate-950 p-3 shadow-[0_24px_70px_rgba(2,6,23,0.24)]${isFullscreen ? ' flex flex-col' : ''}`}
              style={{ borderColor: 'rgba(15, 23, 42, 0.14)' }}
            >
              <div className={`rounded-[22px] border border-white/8 bg-slate-900 p-2${isFullscreen ? ' flex-1 flex flex-col' : ''}`}>
                <div ref={mapContainerRef} className={`${isFullscreen ? 'flex-1 h-full' : 'min-h-[72vh]'} w-full overflow-hidden rounded-[18px]`} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t px-4 pb-4 pt-0 sm:grid-cols-2 sm:px-5" style={{ borderColor: 'var(--border)' }}>
            <div className="rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Trafic live</p>
              <p className="mt-1 text-lg font-semibold">{criticalCount} critiques</p>
              <p className="text-xs nx-subtle">{missionsInDelay} missions a surveiller</p>
            </div>
            <div className="rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Code couleur</p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                <LegendDot color="bg-sky-400" label="A l'heure / En avance" />
                <LegendDot color="bg-amber-400" label="En retard" />
                <LegendDot color="bg-rose-500" label="Retard critique" />
              </div>
            </div>
          </div>

          {selected && (
            <div className="border-t px-4 pb-5 pt-4 sm:px-5" style={{ borderColor: 'var(--border)' }}>
              <div className="rounded-[28px] border p-5 shadow-sm" style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, #0f172a, #111827)', color: '#f8fafc' }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-mono">{selected.reference}</span>
                      <span>{selected.clientName}</span>
                      {selected.distanceKm != null && <span>{selected.distanceKm} km</span>}
                    </div>
                    <h3 className="mt-2 text-xl font-semibold">{selected.livePosition.label}</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {selected.conducteurName} sur {selected.vehiculeName}
                    </p>
                    {selected.commodity && <p className="mt-2 text-xs text-slate-400">{selected.commodity}</p>}
                    {selected.driverStepLabel && (
                      <p className="mt-2 text-xs text-cyan-200">
                        Retour conducteur: {selected.driverStepLabel}
                        {selected.driverUpdateAt ? ` (${formatEta(selected.driverUpdateAt)})` : ''}
                      </p>
                    )}
                  </div>

                  <div className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${
                    selected.alertLevel === 'critical'
                      ? 'border-rose-400/30 bg-rose-500/12 text-rose-100'
                      : selected.alertLevel === 'warning'
                        ? 'border-amber-400/30 bg-amber-500/12 text-amber-100'
                        : 'border-sky-400/30 bg-sky-500/12 text-sky-100'
                  }`}>
                    {selected.statutOperationnel ? STATUT_OPS[selected.statutOperationnel].label : 'Sans statut live'}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  <LiveInfo label="Dernier ping" value={`${selected.lastPingMinutes} min`} />
                  <LiveInfo label="Prochaine etape" value={selected.nextStopLabel} />
                  <LiveInfo label="ETA livraison" value={selected.etaLabel} />
                  <LiveInfo label="Progression" value={`${selected.progress}%`} />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                  <StatusChip label="Lieu" value={selected.livePosition.label} tone="neutral" />
                  <StatusChip label="Avance/Retard" value={selected.scheduleStatusLabel} tone={selected.alertLevel === 'critical' ? 'critical' : selected.alertLevel === 'warning' ? 'warning' : 'ok'} />
                  <StatusChip label="Essence" value={`${selected.fuelPercent}%`} tone={selected.fuelLevel === 'critical' ? 'critical' : selected.fuelLevel === 'low' ? 'warning' : 'ok'} />
                  <StatusChip label="Chronotachygraphe" value={selected.tachyStatusLabel} tone={selected.tachyDriveLeftMinutes <= 25 ? 'critical' : selected.tachyDriveLeftMinutes <= 70 ? 'warning' : 'ok'} />
                  <StatusChip label="Conducteur" value={selected.driverStatusLabel} tone="neutral" />
                  <StatusChip label="Camion" value={selected.vehicleStatusLabel} tone="neutral" />
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="nx-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">File dispatch</p>
                <p className="mt-1 text-xs nx-subtle">Lecture type Waze pour exploitation.</p>
              </div>
              <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {filtered.length} visibles
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm nx-subtle">Chargement de la carte...</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm nx-subtle">Aucune mission ne correspond au filtre.</p>
              ) : (
                filtered.map(mission => (
                  <button
                    key={mission.id}
                    type="button"
                    onClick={() => setSelectedId(mission.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected?.id === mission.id ? 'shadow-sm' : ''
                    }`}
                    style={selected?.id === mission.id
                      ? { borderColor: '#0f172a', background: 'color-mix(in srgb, var(--surface) 82%, var(--primary-soft))' }
                      : { borderColor: 'var(--border)', background: 'var(--surface)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-mono nx-subtle">{mission.reference}</p>
                        <p className="mt-1 truncate text-sm font-semibold">{mission.clientName}</p>
                        <p className="mt-1 truncate text-xs nx-subtle">{mission.vehiculeName}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                        mission.alertLevel === 'critical'
                          ? 'bg-rose-100 text-rose-700'
                          : mission.alertLevel === 'warning'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {mission.punctualityBand === 'retard_critique'
                          ? 'Retard critique'
                          : mission.punctualityBand === 'retard_surveillance'
                            ? 'En retard'
                            : mission.punctualityBand === 'avance'
                              ? 'En avance'
                              : 'A l heure'}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs nx-subtle sm:grid-cols-2">
                      <span>{mission.livePosition.label}</span>
                      <span>{mission.lastPingMinutes} min</span>
                      <span>{mission.nextStopLabel}</span>
                      <span>{mission.etaLabel}</span>
                    </div>
                    <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-2">
                      <span className="nx-subtle">{mission.scheduleStatusLabel}</span>
                      <span className={mission.fuelLevel === 'critical' ? 'text-rose-600' : mission.fuelLevel === 'low' ? 'text-amber-600' : 'text-emerald-600'}>
                        Essence {mission.fuelPercent}%
                      </span>
                    </div>
                    {mission.driverStepLabel && (
                      <p className="mt-2 text-xs text-cyan-700">
                        Conducteur: {mission.driverStepLabel}
                      </p>
                    )}

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${
                          mission.alertLevel === 'critical'
                            ? 'bg-rose-500'
                            : mission.alertLevel === 'warning'
                              ? 'bg-amber-400'
                              : 'bg-sky-500'
                        }`}
                        style={{ width: `${mission.progress}%` }}
                      />
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="nx-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Incidents terrain</p>
                <p className="mt-1 text-xs nx-subtle">Priorisation intelligente des retards via v11-ai.</p>
              </div>
              <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {incidentsRefreshing ? 'IA en cours...' : `${prioritizedIncidents.length} priorises`}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {prioritizedIncidents.map(item => (
                <div key={`alert-${item.mission.id}`} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono nx-subtle">{item.mission.reference}</p>
                      <p className="mt-1 text-sm font-semibold">{item.mission.nextStopLabel}</p>
                      {item.ai?.summary && <p className="mt-1 text-xs text-slate-300">{item.ai.summary}</p>}
                      {!item.ai?.summary && <p className="mt-1 text-xs text-slate-400">Analyse IA en attente.</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                        item.mission.alertLevel === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.mission.alertLevel === 'critical' ? 'Critique' : 'Risque'}
                      </span>
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-100">
                        Score {item.score}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs nx-subtle">{item.mission.conducteurName}</p>
                  <p className="mt-1 text-xs nx-subtle">
                    ETA: {item.mission.etaLabel}
                    {item.mission.etaDelayMinutes != null ? ` - retard estime ${item.mission.etaDelayMinutes} min` : ''}
                  </p>
                  {item.ai?.recommendation && (
                    <p className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                      Action IA: {item.ai.recommendation}
                    </p>
                  )}
                </div>
              ))}

              {prioritizedIncidents.length === 0 && (
                <p className="text-sm nx-subtle">Aucun incident terrain majeur.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  )
}

function LiveInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

function StatusChip({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'neutral' | 'ok' | 'warning' | 'critical'
}) {
  const palette = tone === 'critical'
    ? 'border-rose-400/30 bg-rose-500/12 text-rose-100'
    : tone === 'warning'
      ? 'border-amber-400/30 bg-amber-500/12 text-amber-100'
      : tone === 'ok'
        ? 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100'
        : 'border-white/12 bg-white/5 text-slate-100'

  return (
    <div className={`rounded-xl border px-3 py-2 ${palette}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className="mt-1 text-xs font-medium">{value}</p>
    </div>
  )
}
