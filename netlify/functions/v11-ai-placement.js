/**
 * v11-ai-placement.js
 *
 * Endpoint de placement IA "retour en charge".
 * Pour un vehicule donné, une position de référence (GPS ou dernière livraison)
 * et une plage de dates + contrainte de retour dépôt :
 * → retourne les courses non affectées les plus proches classées par rentabilité.
 *
 * L'IA (Anthropic Claude) sera branchée ici dans la phase suivante.
 * Pour l'instant le moteur de tri est interne (Haversine + score rentabilité).
 */
import {
  authorize,
  json,
  parseJsonBody,
  readTenantKey,
} from './_lib/v11-core.js'
import { callAiProvider, loadAiSettings } from './_lib/v11-ai-provider.js'

const ALLOWED_ROLES = ['admin', 'dirigeant', 'exploitant']

// ── Haversine (distance en km entre deux points GPS) ─────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Estimation temps trajet (vitesse moyenne PL : 75 km/h) ───────────────────
function estimatedDurationHours(distKm) {
  return distKm / 75
}

// ── Score de rentabilité simple ───────────────────────────────────────────────
// Plus le score est élevé, plus la course est intéressante.
// Facteurs : prix_ht / distance_km_vide + prix_ht brut
function scoreRentabilite(course, distVideKm) {
  const prix    = typeof course.prix_ht === 'number' ? course.prix_ht : 0
  const distCourse = typeof course.distance_km === 'number' ? course.distance_km : 100
  if (distVideKm === 0) distVideKm = 1
  // Ratio revenu / (km à vide + km course)
  return prix / (distVideKm + distCourse + 1)
}

// ── Validation de la contrainte retour dépôt ─────────────────────────────────
// Vérifie que le camion peut réaliser la course ET rentrer au dépôt avant la deadline.
function respectsRetourDepot(course, posLat, posLng, depotLat, depotLng, retourAvant) {
  if (!retourAvant || depotLat == null || depotLng == null) return true

  const livLat = typeof course.livraison_lat === 'number' ? course.livraison_lat : null
  const livLng = typeof course.livraison_lng === 'number' ? course.livraison_lng : null
  if (livLat == null || livLng == null) return true // pas assez de données, on laisse passer

  const dateLivraison = course.date_livraison_prevue ? new Date(course.date_livraison_prevue) : null
  if (!dateLivraison) return true

  const distRetour = haversineKm(livLat, livLng, depotLat, depotLng)
  const heuresRetour = estimatedDurationHours(distRetour)
  const estimatedArrivalDepot = new Date(dateLivraison.getTime() + heuresRetour * 3600000)

  return estimatedArrivalDepot <= new Date(retourAvant)
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST uniquement.' })

  const auth = await authorize(event, ALLOWED_ROLES)
  if (!auth.ok) return json(auth.status ?? 401, { error: auth.error })

  await readTenantKey(event, auth)

  const body = parseJsonBody(event)
  if (!body) return json(400, { error: 'Body JSON invalide.' })

  // ── Paramètres d'entrée ───────────────────────────────────────────────────
  const {
    vehicule_id,
    conducteur_id,
    position_lat,
    position_lng,
    date_debut,
    date_fin,
    retour_depot_avant,
    depot_lat,
    depot_lng,
    rayon_km = 200,
    limit = 10,
  } = body

  if (!vehicule_id)       return json(400, { error: 'vehicule_id requis.' })
  if (!date_debut || !date_fin) return json(400, { error: 'date_debut et date_fin requis.' })
  if (typeof position_lat !== 'number' || typeof position_lng !== 'number') {
    return json(400, { error: 'position_lat et position_lng (number) requis.' })
  }

  const rayonMax = Math.min(Number(rayon_km) || 200, 1000)
  const limitMax = Math.min(Number(limit) || 10, 50)

  // ── Upsert contrainte en base ─────────────────────────────────────────────
  await auth.dbClient
    .from('ai_placement_constraints')
    .upsert({
      vehicule_id,
      conducteur_id: conducteur_id ?? null,
      date_debut,
      date_fin,
      retour_depot_avant: retour_depot_avant ?? null,
      depot_lat: typeof depot_lat === 'number' ? depot_lat : null,
      depot_lng: typeof depot_lng === 'number' ? depot_lng : null,
      position_ref_lat: position_lat,
      position_ref_lng: position_lng,
      rayon_km: rayonMax,
      statut: 'active',
      created_by: auth.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'vehicule_id' })

  // ── Récupérer les courses non affectées dans la plage ────────────────────
  const { data: courses, error: coursesError } = await auth.dbClient
    .from('ordres_transport')
    .select(`
      id, reference, client_nom,
      date_chargement_prevue, date_livraison_prevue,
      nature_marchandise, type_transport,
      prix_ht, distance_km,
      chargement_lat, chargement_lng,
      livraison_lat, livraison_lng,
      statut
    `)
    .is('conducteur_id', null)
    .is('vehicule_id', null)
    .in('statut', ['planifie', 'en_attente'])
    .gte('date_chargement_prevue', date_debut)
    .lte('date_chargement_prevue', date_fin)
    .order('date_chargement_prevue', { ascending: true })
    .limit(200)

  if (coursesError) return json(500, { error: coursesError.message })

  // ── Filtrage et scoring ───────────────────────────────────────────────────
  const suggestions = []

  for (const course of (courses ?? [])) {
    const chargLat = typeof course.chargement_lat === 'number' ? course.chargement_lat : null
    const chargLng = typeof course.chargement_lng === 'number' ? course.chargement_lng : null

    // Distance à vide (position actuelle → point de chargement)
    let distVideKm = null
    if (chargLat != null && chargLng != null) {
      distVideKm = haversineKm(position_lat, position_lng, chargLat, chargLng)
    }

    // Filtre rayon
    if (distVideKm != null && distVideKm > rayonMax) continue

    // Filtre contrainte retour dépôt
    if (!respectsRetourDepot(course, position_lat, position_lng, depot_lat, depot_lng, retour_depot_avant)) continue

    const score = scoreRentabilite(course, distVideKm ?? rayonMax)

    suggestions.push({
      ...course,
      dist_vide_km: distVideKm != null ? Math.round(distVideKm * 10) / 10 : null,
      score_rentabilite: Math.round(score * 1000) / 1000,
      duree_vide_estimee_h: distVideKm != null ? Math.round(estimatedDurationHours(distVideKm) * 10) / 10 : null,
      retour_depot_ok: respectsRetourDepot(course, position_lat, position_lng, depot_lat, depot_lng, retour_depot_avant),
      explication_ia: null,
      ia_provider: 'internal',
    })
  }

  // Tri : d'abord par score décroissant
  suggestions.sort((a, b) => b.score_rentabilite - a.score_rentabilite)
  const top = suggestions.slice(0, limitMax)

  // ── Enrichissement IA : explication par course ────────────────────────────
  let iaReady = false
  let iaProviderUsed = 'internal'

  try {
    const aiSettings = await loadAiSettings(auth.systemClient)
    if (aiSettings.enabled && top.length > 0) {
      const coursesResume = top.map((c, i) => ({
        rang: i + 1,
        id: c.id,
        reference: c.reference,
        client: c.client_nom,
        prix_ht: c.prix_ht,
        dist_vide_km: c.dist_vide_km,
        score: c.score_rentabilite,
        date_chargement: c.date_chargement_prevue,
      }))

      const prompt = [
        `Tu es un assistant de planification transport.`,
        `Pour un camion en position (${position_lat.toFixed(4)}, ${position_lng.toFixed(4)}),`,
        `voici les ${top.length} meilleures courses disponibles triées par score de rentabilité.`,
        `Pour chaque course, génère une explication courte (1 phrase, max 15 mots) pourquoi elle est recommandée.`,
        `Réponds UNIQUEMENT en JSON valide, tableau d'objets: [{"id":"<uuid>","explication":"<texte>"}]`,
        `Courses: ${JSON.stringify(coursesResume)}`,
      ].join('\n')

      const result = await callAiProvider(aiSettings, prompt, 800)

      if (result.used && result.text) {
        // Extraire le tableau JSON du texte (les modèles de raisonnement peuvent ajouter du texte)
        const match = result.text.match(/\[[\s\S]*\]/)
        if (match) {
          try {
            const explications = JSON.parse(match[0])
            if (Array.isArray(explications)) {
              const map = new Map(explications.map(e => [e.id, e.explication]))
              for (const course of top) {
                if (map.has(course.id)) {
                  course.explication_ia = String(map.get(course.id))
                  course.ia_provider = aiSettings.provider
                }
              }
              iaReady = true
              iaProviderUsed = aiSettings.provider
            }
          } catch {
            // JSON mal formé → on garde explication_ia: null, non-bloquant
          }
        }
      }
    }
  } catch {
    // Erreur IA non-bloquante : les suggestions sont retournées sans explication
  }

  return json(200, {
    object: 'AiPlacementResult',
    vehicule_id,
    position_ref: { lat: position_lat, lng: position_lng },
    date_debut,
    date_fin,
    retour_depot_avant: retour_depot_avant ?? null,
    rayon_km: rayonMax,
    total_candidates: suggestions.length,
    suggestions: top,
    ia_provider: iaProviderUsed,
    ia_ready: iaReady,
  })
}
