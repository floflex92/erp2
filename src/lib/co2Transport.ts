/**
 * co2Transport.ts
 * Calcul d'empreinte carbone transport routier - Methode ADEME Base Empreinte® 2023
 * Referentiel: Decret n°2017-639 relatif aux informations GES des prestations de transport
 * Formule: CO2 (kg) = distance (km) × poids_charge (t) × facteur (g CO2eq/t.km) / 1000
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClasseVehicule = 'articule_lourd' | 'porteur_moyen' | 'porteur_leger' | 'fourgon' | 'groupage'

export interface Co2EmissionFactor {
  classe: ClasseVehicule
  label: string
  gCo2eqParTkm: number // g CO2eq par tonne × km (retour à vide inclus, selon ADEME)
}

export interface OtForCo2 {
  id: string
  reference: string
  client_id: string | null
  client_nom: string | null
  type_transport: string
  distance_km: number | null
  poids_kg: number | null
  date_chargement_prevue: string | null
}

export interface OtCo2Result extends OtForCo2 {
  co2_kg: number
  co2_par_km: number       // kg CO2 par km (charge transportée × facteur)
  co2_par_tkm_g: number    // g CO2 par tonne.km (facteur appliqué)
  classe: ClasseVehicule
  poids_t_utilise: number  // tonnes utilisées pour le calcul
  distance_utilisee: number // km utilisés pour le calcul
  estimation: boolean       // true si poids ou distance estimé (non renseigné)
}

export interface Co2ClientSummary {
  client_id: string | null
  client_nom: string
  nb_transports: number
  co2_total_kg: number
  distance_totale_km: number
  poids_total_t: number
  co2_par_transport_kg: number
  co2_par_tkm_g: number | null
}

// ─── Facteurs d'émission ADEME Base Empreinte® 2023 ──────────────────────────

/**
 * Facteurs en g CO2eq / tonne.km
 * Source: ADEME Base Empreinte® v23.1, catégorie "Transport de marchandises"
 * Inclut: carburant + retour à vide (taux de fret ~ 50 %)
 */
export const CO2_FACTORS: Record<ClasseVehicule, Co2EmissionFactor> = {
  articule_lourd: { classe: 'articule_lourd', label: 'Camion articulé > 40t PTAC',     gCo2eqParTkm: 62  },
  porteur_moyen:  { classe: 'porteur_moyen',  label: 'Porteur 12–44t PTAC',            gCo2eqParTkm: 80  },
  porteur_leger:  { classe: 'porteur_leger',  label: 'Porteur 7.5–12t PTAC',           gCo2eqParTkm: 115 },
  fourgon:        { classe: 'fourgon',        label: 'Fourgon / VUL < 3.5t',           gCo2eqParTkm: 195 },
  groupage:       { classe: 'groupage',       label: 'Messagerie / groupage mutualisé', gCo2eqParTkm: 100 },
}

// ─── Valeurs par défaut ───────────────────────────────────────────────────────

/** Poids par défaut (en tonnes) selon type de transport, si poids non renseigné */
const DEFAULT_POIDS_T: Record<string, number> = {
  complet:  20,
  partiel:  10,
  groupage:  5,
  express:   2,
}
const DEFAULT_POIDS_FALLBACK = 15

/** Distance par défaut si non renseignée */
const DEFAULT_DISTANCE_KM = 150

/** Classe de véhicule déduite du type de transport */
function classeFromTypeTransport(typeTransport: string): ClasseVehicule {
  if (typeTransport === 'groupage') return 'groupage'
  if (typeTransport === 'express') return 'fourgon'
  return 'articule_lourd'
}

// ─── Calcul par OT ───────────────────────────────────────────────────────────

export function computeOtCo2(ot: OtForCo2): OtCo2Result {
  const classe = classeFromTypeTransport(ot.type_transport)
  const factor = CO2_FACTORS[classe]
  const estimation = ot.distance_km === null || ot.poids_kg === null

  const distKm = ot.distance_km ?? DEFAULT_DISTANCE_KM
  const poidsTon = ot.poids_kg !== null
    ? ot.poids_kg / 1000
    : (DEFAULT_POIDS_T[ot.type_transport] ?? DEFAULT_POIDS_FALLBACK)

  // CO2 (kg) = distance (km) × poids (t) × facteur (g/t.km) / 1000
  const co2Kg = (distKm * poidsTon * factor.gCo2eqParTkm) / 1000
  const co2ParKm = (poidsTon * factor.gCo2eqParTkm) / 1000

  return {
    ...ot,
    co2_kg: co2Kg,
    co2_par_km: co2ParKm,
    co2_par_tkm_g: factor.gCo2eqParTkm,
    classe,
    poids_t_utilise: poidsTon,
    distance_utilisee: distKm,
    estimation,
  }
}

// ─── Agrégation par client ────────────────────────────────────────────────────

export function computeClientCo2(results: OtCo2Result[]): Co2ClientSummary[] {
  const map = new Map<string, Co2ClientSummary>()

  for (const r of results) {
    const key = r.client_id ?? '__inconnu__'
    const existing = map.get(key)

    if (!existing) {
      map.set(key, {
        client_id: r.client_id,
        client_nom: r.client_nom ?? 'Client inconnu',
        nb_transports: 1,
        co2_total_kg: r.co2_kg,
        distance_totale_km: r.distance_utilisee,
        poids_total_t: r.poids_t_utilise,
        co2_par_transport_kg: r.co2_kg,
        co2_par_tkm_g: r.co2_par_tkm_g,
      })
    } else {
      existing.nb_transports++
      existing.co2_total_kg += r.co2_kg
      existing.distance_totale_km += r.distance_utilisee
      existing.poids_total_t += r.poids_t_utilise
      existing.co2_par_transport_kg = existing.co2_total_kg / existing.nb_transports
      // Moyenne pondérée des g/t.km
      const prevTkm = (existing.nb_transports - 1) * (existing.co2_par_tkm_g ?? 0)
      existing.co2_par_tkm_g = (prevTkm + r.co2_par_tkm_g) / existing.nb_transports
    }
  }

  return [...map.values()].sort((a, b) => b.co2_total_kg - a.co2_total_kg)
}

// ─── Formatage ────────────────────────────────────────────────────────────────

export function formatCo2(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tCO₂`
  }
  return `${kg.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kgCO₂`
}

export function formatCo2Short(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`
  return `${kg.toFixed(1)} kg`
}

// ─── Export CSV ──────────────────────────────────────────────────────────────

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportCo2TransportCsv(results: OtCo2Result[], filename = 'bilan-co2-transport.csv') {
  const headers = [
    'Reference', 'Client', 'Type transport', 'Distance (km)', 'Poids declare (kg)',
    'CO2 (kg)', 'CO2 par km (kg)', 'gCO2 par t.km', 'Classe vehicule', 'Estimation', 'Date chargement',
  ]
  const rows = results.map(r => [
    r.reference,
    r.client_nom ?? '',
    r.type_transport,
    r.distance_km?.toString() ?? '',
    r.poids_kg?.toString() ?? '',
    r.co2_kg.toFixed(2),
    r.co2_par_km.toFixed(4),
    r.co2_par_tkm_g.toFixed(1),
    CO2_FACTORS[r.classe]?.label ?? r.classe,
    r.estimation ? 'Oui' : 'Non',
    r.date_chargement_prevue ?? '',
  ])
  downloadCsv([headers.join(';'), ...rows.map(row => row.join(';'))].join('\n'), filename)
}

export function exportCo2ClientCsv(summaries: Co2ClientSummary[], filename = 'bilan-co2-clients.csv') {
  const headers = [
    'Client', 'Nb transports', 'CO2 total (kg)', 'Distance totale (km)',
    'Poids total (t)', 'CO2 moyen / transport (kg)', 'gCO2 / t.km',
  ]
  const rows = summaries.map(s => [
    s.client_nom,
    s.nb_transports.toString(),
    s.co2_total_kg.toFixed(2),
    s.distance_totale_km.toFixed(0),
    s.poids_total_t.toFixed(2),
    s.co2_par_transport_kg.toFixed(2),
    s.co2_par_tkm_g?.toFixed(1) ?? '',
  ])
  downloadCsv([headers.join(';'), ...rows.map(row => row.join(';'))].join('\n'), filename)
}
