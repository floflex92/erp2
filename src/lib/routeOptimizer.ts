/**
 * routeOptimizer.ts
 *
 * Algorithme d'optimisation de tournées multi-stops pour le transport routier.
 * Approche : heuristique Nearest-Neighbor + amélioration locale 2-opt.
 * Contraintes métier prises en compte :
 *  - Précédence chargement → livraison (par OT)
 *  - Groupage figé (les OT d'un même groupage restent consécutifs)
 *  - Priorité express
 *  - Capacité véhicule (poids + volume, avertissement si dépassement)
 *  - Arrêts sans coordonnées GPS (exclus de l'algo, placés en fin de séquence)
 */

/** Rayon terrestre en kilomètres */
const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/** Distance Haversine en km entre deux points GPS */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

// ---------------------------------------------------------------------------
// Types publics
// ---------------------------------------------------------------------------

export type StopType = 'chargement' | 'livraison' | 'autre'

export interface OptimizationStop {
  /** Identifiant unique de l'arrêt (ex : `${otId}_chargement`) */
  id: string
  /** Type de l'opération sur ce site */
  type: StopType
  /** ID de l'OT associé */
  otId: string
  /** Libellé affiché (référence course + client) */
  label: string
  /** Adresse lisible */
  address: string
  lat: number | null
  lng: number | null
  /** Heure d'ouverture du site "HH:MM" ou null */
  timeWindowStart?: string | null
  /** Heure de fermeture du site "HH:MM" ou null */
  timeWindowEnd?: string | null
  poidsKg?: number | null
  volumeM3?: number | null
  temperatureRequise?: string | null
  isFixedGroupage?: boolean
  groupageId?: string | null
  /** Date limite de livraison (ISO date) pour la priorité */
  dateLivraison?: string | null
  priority?: 'express' | 'normal'
}

export interface OptimizationConstraints {
  /** Capacité de charge du véhicule en kg */
  vehicleCapacityKg?: number | null
  /** Capacité volumique du véhicule en m³ */
  vehicleCapacityM3?: number | null
  /** Latitude du point de départ (dépôt) */
  startLat?: number | null
  /** Longitude du point de départ (dépôt) */
  startLng?: number | null
  /** Vitesse moyenne en km/h (défaut : 70 km/h pour un PL) */
  averageSpeedKmh?: number
  /** Durée d'arrêt moyenne par étape en minutes (défaut : 15 min) */
  stopDurationMin?: number
}

export interface OptimizationStopResult extends OptimizationStop {
  /** Distance depuis l'arrêt précédent (km) */
  distanceFromPrev: number
  /** Heure d'arrivée estimée ("HH:MM") si une heure de départ est fournie */
  estimatedArrival?: string
  /** Respect de la fenêtre horaire */
  timeWindowOk?: boolean | null
}

export interface OptimizationResult {
  sequence: OptimizationStopResult[]
  totalDistanceKm: number
  estimatedDurationMin: number
  /** Kilomètres économisés par rapport à l'ordre d'origine */
  distanceSavedKm: number
  /** Gain en % par rapport à la distance initiale */
  savingsPercent: number
  warnings: string[]
  /** IDs des arrêts sans coordonnées GPS */
  stopsWithoutCoords: string[]
}

// ---------------------------------------------------------------------------
// Utilitaires internes
// ---------------------------------------------------------------------------

function hasCoords(stop: OptimizationStop): stop is OptimizationStop & { lat: number; lng: number } {
  return stop.lat != null && stop.lng != null && !isNaN(stop.lat) && !isNaN(stop.lng)
}

/** Distance totale d'une séquence depuis un point de départ optionnel */
function totalDistance(
  stops: Array<{ lat: number; lng: number }>,
  startLat: number | null,
  startLng: number | null,
): number {
  if (stops.length === 0) return 0
  let dist = 0
  let prevLat = startLat ?? stops[0].lat
  let prevLng = startLng ?? stops[0].lng
  for (const s of stops) {
    dist += haversineKm(prevLat, prevLng, s.lat, s.lng)
    prevLat = s.lat
    prevLng = s.lng
  }
  return dist
}

/** Vérifie que chaque livraison apparaît après tous les chargements du même OT */
function satisfiesPrecedence(sequence: OptimizationStop[]): boolean {
  const visitedIds = new Set<string>()
  for (const stop of sequence) {
    if (stop.type === 'livraison') {
      const requiredChargements = sequence.filter(
        s => s.otId === stop.otId && s.type === 'chargement',
      )
      for (const req of requiredChargements) {
        if (!visitedIds.has(req.id)) return false
      }
    }
    visitedIds.add(stop.id)
  }
  return true
}

/** Vérifie si un groupage figé reste intact (stops consécutifs) */
function satisfiesFixedGroupage(sequence: OptimizationStop[]): boolean {
  const groupIds = new Set(
    sequence.filter(s => s.isFixedGroupage && s.groupageId).map(s => s.groupageId!),
  )
  for (const gid of groupIds) {
    const indices = sequence
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.groupageId === gid && s.isFixedGroupage)
      .map(({ i }) => i)
    if (indices.length < 2) continue
    const min = Math.min(...indices)
    const max = Math.max(...indices)
    if (max - min + 1 !== indices.length) return false
  }
  return true
}

/** Détermine si un arrêt est faisable compte tenu des arrêts déjà visités */
function isFeasible(
  stop: OptimizationStop,
  visitedIds: Set<string>,
  allStops: OptimizationStop[],
): boolean {
  if (visitedIds.has(stop.id)) return false
  if (stop.type === 'livraison') {
    const chargements = allStops.filter(s => s.otId === stop.otId && s.type === 'chargement')
    for (const c of chargements) {
      if (!visitedIds.has(c.id)) return false
    }
  }
  return true
}

// ---------------------------------------------------------------------------
// Heuristique Nearest-Neighbor
// ---------------------------------------------------------------------------

function nearestNeighbor(
  stops: OptimizationStop[],
  startLat: number | null,
  startLng: number | null,
): OptimizationStop[] {
  if (stops.length === 0) return []

  const result: OptimizationStop[] = []
  const visitedIds = new Set<string>()
  const remaining = new Set(stops)

  let curLat = startLat
  let curLng = startLng

  // Si pas de point de départ, on commence par l'arrêt express le plus urgent
  if (curLat == null || curLng == null) {
    const expressFirst = stops.find(s => s.priority === 'express' && hasCoords(s))
    const first = expressFirst ?? stops.find(hasCoords)
    if (first && hasCoords(first)) {
      curLat = first.lat
      curLng = first.lng
    }
  }

  while (remaining.size > 0) {
    const feasible = [...remaining].filter(s => isFeasible(s, visitedIds, stops) && hasCoords(s))
    const infeasible = [...remaining].filter(s => !hasCoords(s))

    if (feasible.length === 0 && infeasible.length === 0) break

    if (feasible.length === 0) {
      // Seuls des arrêts sans coords — on les ajoute en fin
      for (const s of infeasible) result.push(s)
      break
    }

    // Priorité express : chercher parmi les express en premier
    const expressFeasible = feasible.filter(s => s.priority === 'express')
    const candidates = expressFeasible.length > 0 ? expressFeasible : feasible

    // Voisin le plus proche
    let nearest = candidates[0]
    let minDist =
      curLat != null && curLng != null && hasCoords(nearest)
        ? haversineKm(curLat, curLng, nearest.lat, nearest.lng)
        : Infinity

    for (const s of candidates.slice(1)) {
      if (!hasCoords(s)) continue
      const d =
        curLat != null && curLng != null
          ? haversineKm(curLat, curLng, s.lat, s.lng)
          : Infinity
      if (d < minDist) {
        minDist = d
        nearest = s
      }
    }

    result.push(nearest)
    visitedIds.add(nearest.id)
    remaining.delete(nearest)
    if (hasCoords(nearest)) {
      curLat = nearest.lat
      curLng = nearest.lng
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Amélioration locale 2-opt
// ---------------------------------------------------------------------------

function twoOpt(
  sequence: OptimizationStop[],
  startLat: number | null,
  startLng: number | null,
): OptimizationStop[] {
  // On ne traite que les arrêts avec coords pour le 2-opt
  const withCoords = sequence.filter(hasCoords)
  const withoutCoords = sequence.filter(s => !hasCoords(s))

  if (withCoords.length < 4) return sequence

  let best = [...withCoords]
  let bestDist = totalDistance(best as Array<{ lat: number; lng: number }>, startLat, startLng)

  const MAX_ITER = 100
  let improved = true
  let iter = 0

  while (improved && iter < MAX_ITER) {
    improved = false
    iter++

    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 2; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i + 1),
          ...best.slice(i + 1, j + 1).reverse(),
          ...best.slice(j + 1),
        ]

        if (!satisfiesPrecedence(candidate)) continue
        if (!satisfiesFixedGroupage(candidate)) continue

        const candidateDist = totalDistance(
          candidate as Array<{ lat: number; lng: number }>,
          startLat,
          startLng,
        )
        if (candidateDist < bestDist - 0.01) {
          best = candidate
          bestDist = candidateDist
          improved = true
        }
      }
    }
  }

  return [...best, ...withoutCoords]
}

// ---------------------------------------------------------------------------
// Heure estimée d'arrivée
// ---------------------------------------------------------------------------

function minutesToHHMM(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24
  const m = Math.round(totalMin % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function checkTimeWindow(
  arrivalMin: number,
  windowStart?: string | null,
  windowEnd?: string | null,
): boolean | null {
  if (!windowStart && !windowEnd) return null
  if (windowEnd && arrivalMin > hhmmToMinutes(windowEnd)) return false
  if (windowStart && arrivalMin < hhmmToMinutes(windowStart)) return false
  return true
}

// ---------------------------------------------------------------------------
// Vérification capacité
// ---------------------------------------------------------------------------

function buildCapacityWarnings(
  sequence: OptimizationStop[],
  vehicleCapacityKg?: number | null,
  vehicleCapacityM3?: number | null,
): string[] {
  if (!vehicleCapacityKg && !vehicleCapacityM3) return []
  const warnings: string[] = []
  let cumPoids = 0
  let cumVol = 0
  let maxPoids = 0
  let maxVol = 0

  for (const s of sequence) {
    const delta = s.type === 'chargement' ? 1 : s.type === 'livraison' ? -1 : 0
    cumPoids += delta * (s.poidsKg ?? 0)
    cumVol += delta * (s.volumeM3 ?? 0)
    if (cumPoids > maxPoids) maxPoids = cumPoids
    if (cumVol > maxVol) maxVol = cumVol
  }

  if (vehicleCapacityKg != null && maxPoids > vehicleCapacityKg) {
    warnings.push(
      `Dépassement poids : charge max estimée ${Math.round(maxPoids)} kg > capacité ${vehicleCapacityKg} kg`,
    )
  }
  if (vehicleCapacityM3 != null && maxVol > vehicleCapacityM3) {
    warnings.push(
      `Dépassement volume : charge max estimée ${maxVol.toFixed(1)} m³ > capacité ${vehicleCapacityM3} m³`,
    )
  }
  return warnings
}

// ---------------------------------------------------------------------------
// Fonction principale exportée
// ---------------------------------------------------------------------------

/**
 * Optimise une liste de stops transport.
 * Retourne la séquence optimisée avec les métriques associées.
 */
export function optimizeRoute(
  stops: OptimizationStop[],
  constraints: OptimizationConstraints = {},
  departureTimeHHMM?: string,
): OptimizationResult {
  const warnings: string[] = []
  const stopsWithoutCoords: string[] = []

  // Séparer stops valides / sans coords
  const validStops: OptimizationStop[] = []
  for (const s of stops) {
    if (!hasCoords(s)) {
      stopsWithoutCoords.push(s.id)
      warnings.push(`"${s.label}" (${s.type}) : coordonnées GPS manquantes — placé en fin de séquence`)
      continue
    }
    validStops.push(s)
  }

  const {
    startLat = null,
    startLng = null,
    averageSpeedKmh = 70,
    stopDurationMin = 15,
    vehicleCapacityKg,
    vehicleCapacityM3,
  } = constraints

  // Séquence originale pour calcul du gain
  const validCoordStops = validStops as Array<OptimizationStop & { lat: number; lng: number }>
  const originalDist = totalDistance(validCoordStops, startLat, startLng)

  let optimizedSeq: OptimizationStop[]

  if (validStops.length <= 1) {
    optimizedSeq = [...validStops, ...stops.filter(s => stopsWithoutCoords.includes(s.id))]
  } else {
    const nn = nearestNeighbor(validStops, startLat, startLng)
    optimizedSeq = twoOpt(nn, startLat, startLng)
  }

  // Distance finale
  const optimizedCoordStops = optimizedSeq.filter(hasCoords) as Array<
    OptimizationStop & { lat: number; lng: number }
  >
  const optimizedDist = totalDistance(optimizedCoordStops, startLat, startLng)

  // Avertissements capacité
  warnings.push(...buildCapacityWarnings(optimizedSeq, vehicleCapacityKg, vehicleCapacityM3))

  // Vérification cohérence précédence (sécurité)
  if (!satisfiesPrecedence(optimizedSeq)) {
    warnings.push("Avertissement : la contrainte chargement->livraison n'a pas pu etre respectee sur certains OT.")
  }

  // Construction de la séquence enrichie avec distances et ETA
  let elapsedMin = departureTimeHHMM ? hhmmToMinutes(departureTimeHHMM) : null
  let prevLat = startLat ?? (hasCoords(optimizedSeq[0]) ? (optimizedSeq[0] as OptimizationStop & { lat: number }).lat : null)
  let prevLng = startLng ?? (hasCoords(optimizedSeq[0]) ? (optimizedSeq[0] as OptimizationStop & { lat: number }).lng : null)

  const sequence: OptimizationStopResult[] = optimizedSeq.map(stop => {
    let distFromPrev = 0
    if (hasCoords(stop) && prevLat != null && prevLng != null) {
      distFromPrev = haversineKm(prevLat, prevLng, stop.lat, stop.lng)
    }

    let estimatedArrival: string | undefined
    let timeWindowOk: boolean | null | undefined
    if (elapsedMin != null) {
      elapsedMin += (distFromPrev / averageSpeedKmh) * 60
      estimatedArrival = minutesToHHMM(elapsedMin)
      timeWindowOk = checkTimeWindow(elapsedMin, stop.timeWindowStart, stop.timeWindowEnd)
      // Attente si on arrive avant l'ouverture
      if (
        stop.timeWindowStart &&
        elapsedMin < hhmmToMinutes(stop.timeWindowStart)
      ) {
        elapsedMin = hhmmToMinutes(stop.timeWindowStart)
      }
      elapsedMin += stopDurationMin
    }

    if (hasCoords(stop)) {
      prevLat = stop.lat
      prevLng = stop.lng
    }

    return {
      ...stop,
      distanceFromPrev: Math.round(distFromPrev * 10) / 10,
      estimatedArrival,
      timeWindowOk,
    }
  })

  const distanceSavedKm = Math.max(0, originalDist - optimizedDist)
  const savingsPercent =
    originalDist > 0 ? Math.round((distanceSavedKm / originalDist) * 100) : 0

  const estimatedDurationMin =
    averageSpeedKmh > 0
      ? Math.round((optimizedDist / averageSpeedKmh) * 60 + optimizedSeq.length * stopDurationMin)
      : 0

  return {
    sequence,
    totalDistanceKm: Math.round(optimizedDist * 10) / 10,
    estimatedDurationMin,
    distanceSavedKm: Math.round(distanceSavedKm * 10) / 10,
    savingsPercent,
    warnings: [...new Set(warnings)],
    stopsWithoutCoords,
  }
}

/**
 * Convertit une liste d'OT (avec leurs sites) en OptimizationStop[].
 * Un OT génère 1 ou 2 arrêts : chargement + livraison.
 */
export interface OtInputForOptimization {
  id: string
  reference: string
  clientNom?: string | null
  typeTransport?: string | null
  poidsKg?: number | null
  volumeM3?: number | null
  temperatureRequise?: string | null
  groupageId?: string | null
  groupageFige?: boolean
  dateLivraisonPrevue?: string | null
  chargementSite?: {
    nom: string
    adresse: string
    ville?: string | null
    latitude?: number | null
    longitude?: number | null
    horairesOuverture?: string | null
  } | null
  livraisonSite?: {
    nom: string
    adresse: string
    ville?: string | null
    latitude?: number | null
    longitude?: number | null
    horairesOuverture?: string | null
  } | null
}

/** Parse "08:00-17:00" → { start: "08:00", end: "17:00" } */
function parseHoraires(horaires?: string | null): { start: string | null; end: string | null } {
  if (!horaires) return { start: null, end: null }
  const match = horaires.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/)
  if (!match) return { start: null, end: null }
  return { start: match[1], end: match[2] }
}

export function buildStopsFromOts(ots: OtInputForOptimization[]): OptimizationStop[] {
  const stops: OptimizationStop[] = []

  for (const ot of ots) {
    const isExpress = ot.typeTransport === 'express'
    const label = `${ot.reference}${ot.clientNom ? ` — ${ot.clientNom}` : ''}`

    if (ot.chargementSite) {
      const hw = parseHoraires(ot.chargementSite.horairesOuverture)
      stops.push({
        id: `${ot.id}_chargement`,
        type: 'chargement',
        otId: ot.id,
        label,
        address: `${ot.chargementSite.nom} — ${ot.chargementSite.adresse}${ot.chargementSite.ville ? `, ${ot.chargementSite.ville}` : ''}`,
        lat: ot.chargementSite.latitude ?? null,
        lng: ot.chargementSite.longitude ?? null,
        timeWindowStart: hw.start,
        timeWindowEnd: hw.end,
        poidsKg: ot.poidsKg,
        volumeM3: ot.volumeM3,
        temperatureRequise: ot.temperatureRequise,
        groupageId: ot.groupageId,
        isFixedGroupage: ot.groupageFige ?? false,
        dateLivraison: ot.dateLivraisonPrevue,
        priority: isExpress ? 'express' : 'normal',
      })
    }

    if (ot.livraisonSite) {
      const hw = parseHoraires(ot.livraisonSite.horairesOuverture)
      stops.push({
        id: `${ot.id}_livraison`,
        type: 'livraison',
        otId: ot.id,
        label,
        address: `${ot.livraisonSite.nom} — ${ot.livraisonSite.adresse}${ot.livraisonSite.ville ? `, ${ot.livraisonSite.ville}` : ''}`,
        lat: ot.livraisonSite.latitude ?? null,
        lng: ot.livraisonSite.longitude ?? null,
        timeWindowStart: hw.start,
        timeWindowEnd: hw.end,
        poidsKg: ot.poidsKg,
        volumeM3: ot.volumeM3,
        temperatureRequise: ot.temperatureRequise,
        groupageId: ot.groupageId,
        isFixedGroupage: ot.groupageFige ?? false,
        dateLivraison: ot.dateLivraisonPrevue,
        priority: isExpress ? 'express' : 'normal',
      })
    }
  }

  return stops
}
