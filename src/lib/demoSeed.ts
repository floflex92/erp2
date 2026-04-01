import { supabase } from './supabase'
import { looseSupabase } from './supabaseLoose'
import { isDemoDataEnabled } from './runtimeFlags'
import { MOCK_CLIENT_REFS, MOCK_TRAILER_REFS, MOCK_VEHICLE_REFS } from './mock/mockDomain'
import { getDemoLocalTable, hasDemoLocalData, replaceDemoLocalTables } from './demoLocalStore'

const DEMO_SEED_STORAGE_KEY = 'erp-demo-seed-20260328-v4'
const CLIENT_PORTAL_STORAGE_KEY = 'nexora-client-portal-v1'
const CLIENT_PORTAL_EVENT = 'nexora-client-portal-updated'
const AFFRETEMENT_PORTAL_STORAGE_KEY = 'nexora-affretement-portal-v1'
const AFFRETEMENT_PORTAL_EVENT = 'nexora-affretement-portal-updated'

type DemoSeedState = 'running' | 'done' | 'failed' | 'skipped'
type LifecycleStage =
  | 'en_attente_validation'
  | 'en_attente_prise_en_charge'
  | 'pris_en_charge'
  | 'en_cours_livraison'
  | 'livre'
  | 'facture'
  | 'paye'

type SeedClientRef = {
  id: string
  code: string
  name: string
  city: string
  email: string
  phone: string
  clientType: 'chargeur' | 'commissionnaire' | 'transitaire'
}

type SeedDriverRef = {
  id: string
  firstName: string
  lastName: string
  city: string
  email: string
  preferences: string
}

type SeedVehicleRef = {
  id: string
  plate: string
  brand: string
  model: string
  vehicleType: 'tracteur' | 'porteur'
  notes: string
}

type SeedTrailerRef = {
  id: string
  plate: string
  trailerType: string
  brand: string
  notes: string
}

type SeedAssignment = {
  id: string
  conducteurId: string
  vehiculeId: string
  remorqueId: string | null
  typeAffectation: 'fixe' | 'temporaire'
  dateDebutOffsetDays: number
  dateFinOffsetDays: number | null
  actif: boolean
  notes: string
}

type RouteTemplate = {
  pickupLabel: string
  pickupAddress: string
  pickupPostalCode: string
  pickupCity: string
  deliveryLabel: string
  deliveryAddress: string
  deliveryPostalCode: string
  deliveryCity: string
}

type GeneratedMission = {
  id: string
  reference: string
  clientId: string
  lifecycleStage: LifecycleStage
  affreted: boolean
  assignmentId: string | null
  conducteurId: string | null
  vehiculeId: string | null
  remorqueId: string | null
  typeTransport: 'complet' | 'partiel' | 'express' | 'groupage'
  statut: 'brouillon' | 'confirme' | 'planifie' | 'en_cours' | 'livre' | 'facture'
  statutOperationnel: 'en_attente' | 'prise_en_charge' | 'a_l_heure' | 'retard_mineur' | 'retard_majeur' | 'termine' | null
  pickupOffsetDays: number
  pickupTime: string
  deliveryOffsetDays: number
  deliveryTime: string
  pickupLabel: string
  pickupAddress: string
  pickupPostalCode: string
  pickupCity: string
  deliveryLabel: string
  deliveryAddress: string
  deliveryPostalCode: string
  deliveryCity: string
  distanceKm: number
  natureMarchandise: string
  poidsKg: number
  volumeM3: number
  nombreColis: number
  prixHt: number
  tauxTva: number
  numeroCmr: string
  numeroBl: string
  instructions: string
  notesInternes: string
  temperatureRequise: string | null
  dateLivraisonReelle: string | null
}

const DRIVER_FIRST_NAMES = [
  'Cedric', 'Yann', 'Antoine', 'Mathieu', 'Nicolas', 'Loic', 'Kevin', 'David', 'Hugo', 'Sofiane',
  'Lucas', 'Thomas', 'Arnaud', 'Mickael', 'Benoit', 'Florian', 'Jules', 'Remi', 'Brice', 'Noam',
]
const DRIVER_LAST_NAMES = [
  'Martin', 'Bernard', 'Dubois', 'Petit', 'Robert', 'Richard', 'Simon', 'Moreau', 'Fontaine', 'Garcia',
  'Weber', 'Girard', 'Leroux', 'Chevalier', 'Roux', 'Lambert', 'Mercier', 'Blanc', 'Perrin', 'Morin',
]
const DRIVER_CITIES = [
  'Lille', 'Arras', 'Lens', 'Valenciennes', 'Reims', 'Lyon', 'Tours', 'Rennes', 'Nantes', 'Marseille',
  'Mulhouse', 'Grenoble', 'Orleans', 'Bordeaux', 'Le Havre', 'Metz', 'Poitiers', 'Amiens', 'Rouen', 'Dijon',
]
const DRIVER_PREFERENCES = [
  'National frigo',
  'Regional palettes',
  'Plateau acier',
  'Porteur hayon',
  'Conteneur',
  'Distribution',
  'Retail',
  'Chantier',
  'Pharma',
  'Textile',
]
const CLIENT_EXTRA_NAMES = ['Alimarket Sud', 'EcoBat Ile de France', 'PaperLine Bourgogne', 'EuroPort Logistics']
const CLIENT_EXTRA_CITIES = ['Toulouse', 'Paris', 'Dijon', 'Dunkerque']
const VEHICLE_BRANDS = ['Volvo', 'DAF', 'Mercedes', 'Renault', 'Iveco', 'MAN', 'Scania']
const VEHICLE_MODELS = ['FH 500', 'XF 480', 'Actros 1845', 'T 480', 'S-Way', 'TGX 18.470', 'R 460']
const TRAILER_BRANDS = ['Lamberet', 'Schmitz', 'Krone', 'Chereau', 'Trouillet', 'Benalu']
const TRAILER_TYPES = ['frigo', 'tautliner', 'plateau', 'fourgon', 'porte_conteneur']
const GOODS = [
  'Produits frais',
  'Materiaux BTP',
  'Conteneur export',
  'Produits laitiers',
  'Colis express',
  'Bobines acier',
  'Retail sec',
  'Pharma',
  'Textile',
  'Pieces industrielles',
]
const PICKUP_TIMES = ['04:30', '05:15', '06:00', '06:45', '07:30', '08:15', '09:00']
const DELIVERY_TIMES = ['11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00']
const ROUTES: RouteTemplate[] = [
  { pickupLabel: 'Hub Lille', pickupAddress: '31 rue du Chargement', pickupPostalCode: '59000', pickupCity: 'Lille', deliveryLabel: 'Marche Rungis', deliveryAddress: '2 avenue du Marche', deliveryPostalCode: '94150', deliveryCity: 'Rungis' },
  { pickupLabel: 'Depot Nancy', pickupAddress: '18 avenue des Materiaux', pickupPostalCode: '54000', pickupCity: 'Nancy', deliveryLabel: 'Chantier Lyon Sud', deliveryAddress: '44 boulevard du BTP', deliveryPostalCode: '69007', deliveryCity: 'Lyon' },
  { pickupLabel: 'Terminal Havre', pickupAddress: '12 quai de l Export', pickupPostalCode: '76600', pickupCity: 'Le Havre', deliveryLabel: 'Hub Metz', deliveryAddress: '8 rue des Transitaires', deliveryPostalCode: '57000', deliveryCity: 'Metz' },
  { pickupLabel: 'Plateforme Tours', pickupAddress: '40 rue de la Logistique', pickupPostalCode: '37000', pickupCity: 'Tours', deliveryLabel: 'Hub Bordeaux', deliveryAddress: '9 impasse Supply', deliveryPostalCode: '33000', deliveryCity: 'Bordeaux' },
  { pickupLabel: 'Base Lyon', pickupAddress: '22 rue de l Affretement', pickupPostalCode: '69000', pickupCity: 'Lyon', deliveryLabel: 'Terminal Fos', deliveryAddress: '14 avenue du Port', deliveryPostalCode: '13000', deliveryCity: 'Marseille' },
  { pickupLabel: 'Usine Rennes', pickupAddress: '11 rue des Ateliers', pickupPostalCode: '35000', pickupCity: 'Rennes', deliveryLabel: 'Plateforme Nantes', deliveryAddress: '6 avenue Distribution', deliveryPostalCode: '44000', deliveryCity: 'Nantes' },
  { pickupLabel: 'Hub Bordeaux', pickupAddress: '5 quai Retail', pickupPostalCode: '33000', pickupCity: 'Bordeaux', deliveryLabel: 'Plateforme Toulouse', deliveryAddress: '17 avenue du Midi', deliveryPostalCode: '31000', deliveryCity: 'Toulouse' },
  { pickupLabel: 'Laboratoire Grenoble', pickupAddress: '7 rue de la Recherche', pickupPostalCode: '38000', pickupCity: 'Grenoble', deliveryLabel: 'Agence Nice', deliveryAddress: '20 boulevard du Littoral', deliveryPostalCode: '06000', deliveryCity: 'Nice' },
  { pickupLabel: 'Depot Marseille', pickupAddress: '88 avenue du Port', pickupPostalCode: '13000', pickupCity: 'Marseille', deliveryLabel: 'Base Montpellier', deliveryAddress: '31 rue des Travaux', deliveryPostalCode: '34000', deliveryCity: 'Montpellier' },
  { pickupLabel: 'Site Mulhouse', pickupAddress: '13 rue du Tissage', pickupPostalCode: '68100', pickupCity: 'Mulhouse', deliveryLabel: 'Hub Strasbourg', deliveryAddress: '4 route du Rhin', deliveryPostalCode: '67000', deliveryCity: 'Strasbourg' },
]
const CITY_GPS: Record<string, { lat: number; lng: number }> = {
  Lille: { lat: 50.6292, lng: 3.0573 },
  Nancy: { lat: 48.6921, lng: 6.1844 },
  'Le Havre': { lat: 49.4944, lng: 0.1079 },
  Tours: { lat: 47.3941, lng: 0.6848 },
  Lyon: { lat: 45.764, lng: 4.8357 },
  Rennes: { lat: 48.1173, lng: -1.6778 },
  Bordeaux: { lat: 44.8378, lng: -0.5792 },
  Grenoble: { lat: 45.1885, lng: 5.7245 },
  Marseille: { lat: 43.2965, lng: 5.3698 },
  Mulhouse: { lat: 47.7508, lng: 7.3359 },
}

const LIFECYCLE_PHASES: Array<{
  stage: LifecycleStage
  statut: 'brouillon' | 'confirme' | 'planifie' | 'en_cours' | 'livre' | 'facture'
  statutOperationnel: 'en_attente' | 'prise_en_charge' | 'a_l_heure' | 'retard_mineur' | 'retard_majeur' | 'termine' | null
  count: number
  offsetStart: number
  offsetSpread: number
  notes: string
}> = [
  { stage: 'en_attente_validation', statut: 'brouillon', statutOperationnel: null, count: 12, offsetStart: 2, offsetSpread: 12, notes: 'En attente validation exploitation.' },
  { stage: 'en_attente_prise_en_charge', statut: 'confirme', statutOperationnel: 'en_attente', count: 10, offsetStart: 0, offsetSpread: 7, notes: 'Validee client, attente prise en charge.' },
  { stage: 'pris_en_charge', statut: 'en_cours', statutOperationnel: 'prise_en_charge', count: 12, offsetStart: -2, offsetSpread: 4, notes: 'Prise en charge conducteur validee.' },
  { stage: 'en_cours_livraison', statut: 'en_cours', statutOperationnel: 'a_l_heure', count: 12, offsetStart: -3, offsetSpread: 5, notes: 'En cours de livraison.' },
  { stage: 'livre', statut: 'livre', statutOperationnel: 'termine', count: 10, offsetStart: -10, offsetSpread: 7, notes: 'Livree, POD recu.' },
  { stage: 'facture', statut: 'facture', statutOperationnel: 'termine', count: 8, offsetStart: -18, offsetSpread: 8, notes: 'Facturee, attente reglement.' },
  { stage: 'paye', statut: 'facture', statutOperationnel: 'termine', count: 8, offsetStart: -28, offsetSpread: 10, notes: 'Facturee et reglee.' },
]

function isoDate(offsetDays: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function isoDateTime(offsetDays: number, time: string) {
  return `${isoDate(offsetDays)}T${time}:00`
}

function nowIsoMinus(daysAgo: number, hour = 9, minute = 0) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

function isLocalHost() {
  if (typeof window === 'undefined') return false
  return ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

function isOptionalSchemaError(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('does not exist') || normalized.includes('could not find') || normalized.includes('schema cache')
}

function isWritePermissionError(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('row-level security')
    || normalized.includes('permission denied')
    || normalized.includes('forbidden')
    || normalized.includes('insufficient privilege')
}

function pick<T>(array: T[], index: number): T {
  return array[index % array.length]
}

function mockId(prefixDigit: number, index: number) {
  return `${prefixDigit}0000000-0000-0000-0000-${String(index).padStart(12, '0')}`
}

async function upsertRows(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return
  const { error } = await looseSupabase.from(table).upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

function writePortalState(storageKey: string, eventName: string, payload: unknown) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(payload))
  window.dispatchEvent(new CustomEvent(eventName))
}

function missionStepStatuses(mission: Pick<GeneratedMission, 'statut' | 'statutOperationnel'>) {
  if (mission.statutOperationnel === 'termine' || mission.statut === 'livre' || mission.statut === 'facture') {
    return { chargement: 'realise', livraison: 'realise' }
  }
  if (mission.statut === 'en_cours' && mission.statutOperationnel === 'prise_en_charge') {
    return { chargement: 'en_cours', livraison: 'en_attente' }
  }
  if (mission.statut === 'en_cours') {
    return { chargement: 'realise', livraison: 'en_cours' }
  }
  return { chargement: 'en_attente', livraison: 'en_attente' }
}

function buildClientRefs(): SeedClientRef[] {
  const base = MOCK_CLIENT_REFS.map((client) => ({
    id: client.id,
    code: client.code,
    name: client.name,
    city: client.city,
    email: client.email,
    phone: client.phone,
    clientType: client.clientType,
  }))
  const extra = CLIENT_EXTRA_NAMES.map((name, index) => ({
    id: mockId(2, base.length + index + 1),
    code: `CLI-${String(base.length + index + 1).padStart(3, '0')}`,
    name,
    city: CLIENT_EXTRA_CITIES[index] ?? 'Paris',
    email: `ops${index + 11}@demo-client.fr`,
    phone: `01 50 60 7${index} ${index}${index}`,
    clientType: (['chargeur', 'commissionnaire', 'transitaire'] as const)[index % 3],
  }))
  return [...base, ...extra]
}

function buildDriverRefs(total: number): SeedDriverRef[] {
  return Array.from({ length: total }, (_, index) => {
    const firstName = pick(DRIVER_FIRST_NAMES, index)
    const lastName = pick(DRIVER_LAST_NAMES, Math.floor(index / DRIVER_FIRST_NAMES.length) + index)
    const city = pick(DRIVER_CITIES, index)
    const uniqueSuffix = String(index + 1).padStart(3, '0')
    const emailSlug = `${firstName}.${lastName}.${uniqueSuffix}`.toLowerCase().replace(/\s+/g, '')
    return {
      id: mockId(3, index + 1),
      firstName,
      lastName,
      city,
      email: `${emailSlug}@erp-demo.fr`,
      preferences: pick(DRIVER_PREFERENCES, index),
    }
  })
}

function buildVehicleRefs(total: number): SeedVehicleRef[] {
  const seeded = MOCK_VEHICLE_REFS.map((vehicle) => ({
    id: vehicle.id,
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    vehicleType: vehicle.vehicleType,
    notes: vehicle.notes,
  }))
  if (seeded.length >= total) return seeded.slice(0, total)
  const extra = Array.from({ length: total - seeded.length }, (_, index) => {
    const rank = seeded.length + index + 1
    return {
      id: mockId(4, rank),
      plate: `NX-${String(200 + rank).padStart(3, '0')}-TR`,
      brand: pick(VEHICLE_BRANDS, rank),
      model: pick(VEHICLE_MODELS, rank),
      vehicleType: rank % 5 === 0 ? 'porteur' : 'tracteur',
      notes: rank % 5 === 0 ? 'Porteur distribution' : 'Tracteur longue distance',
    } satisfies SeedVehicleRef
  })
  return [...seeded, ...extra]
}

function buildTrailerRefs(total: number): SeedTrailerRef[] {
  const seeded = MOCK_TRAILER_REFS.map((trailer) => ({
    id: trailer.id,
    plate: trailer.plate,
    trailerType: trailer.trailerType,
    brand: trailer.brand,
    notes: trailer.notes,
  }))
  if (seeded.length >= total) return seeded.slice(0, total)
  const extra = Array.from({ length: total - seeded.length }, (_, index) => {
    const rank = seeded.length + index + 1
    return {
      id: mockId(5, rank),
      plate: `RM-${String(300 + rank).padStart(3, '0')}-NX`,
      trailerType: pick(TRAILER_TYPES, rank),
      brand: pick(TRAILER_BRANDS, rank),
      notes: `Remorque parc ${rank}`,
    } satisfies SeedTrailerRef
  })
  return [...seeded, ...extra]
}

function buildAssignments(drivers: SeedDriverRef[], vehicles: SeedVehicleRef[], trailers: SeedTrailerRef[]) {
  const assignmentCount = Math.min(drivers.length, 90)
  return Array.from({ length: assignmentCount }, (_, index) => {
    const isFixed = index < vehicles.length
    return {
      id: mockId(6, index + 1),
      conducteurId: drivers[index].id,
      vehiculeId: vehicles[index % vehicles.length].id,
      remorqueId: index % 4 === 0 ? null : trailers[index % trailers.length].id,
      typeAffectation: isFixed ? 'fixe' : 'temporaire',
      dateDebutOffsetDays: -(210 - index * 2),
      dateFinOffsetDays: isFixed ? null : 60 + (index % 25),
      actif: index % 13 !== 0,
      notes: isFixed ? 'Affectation flotte principale' : 'Affectation rotation',
    } satisfies SeedAssignment
  })
}

function buildMissions(clients: SeedClientRef[], assignments: SeedAssignment[]) {
  const activeAssignments = assignments.filter(item => item.actif)
  let missionRank = 0

  return LIFECYCLE_PHASES.flatMap((phase) =>
    Array.from({ length: phase.count }, (_, index) => {
      missionRank += 1
      const route = pick(ROUTES, missionRank - 1)
      const client = pick(clients, missionRank - 1)
      const assignment = phase.stage === 'en_attente_validation'
        ? null
        : (
          phase.stage === 'en_attente_prise_en_charge' && index % 4 === 0
            ? null
            : pick(activeAssignments, missionRank - 1)
        )
      const pickupOffset = phase.offsetStart + (index % phase.offsetSpread)
      const deliveryOffset = pickupOffset + (1 + ((missionRank + index) % 2))
      const pickupTime = pick(PICKUP_TIMES, missionRank - 1)
      const deliveryTime = pick(DELIVERY_TIMES, missionRank + 1)
      const distanceKm = 120 + ((missionRank * 37) % 620)
      const typeTransport = (['complet', 'partiel', 'express', 'groupage'] as const)[missionRank % 4]
      const natureMarchandise = pick(GOODS, missionRank - 1)
      const affreted = (missionRank % 4 === 0) || (phase.stage === 'paye' && index % 2 === 0)
      const dateLivraisonReelle = phase.stage === 'livre' || phase.stage === 'facture' || phase.stage === 'paye'
        ? isoDateTime(deliveryOffset, deliveryTime)
        : null

      return {
        id: mockId(7, missionRank),
        reference: `OT-26${String(400 + missionRank).padStart(4, '0')}`,
        clientId: client.id,
        lifecycleStage: phase.stage,
        affreted,
        assignmentId: assignment?.id ?? null,
        conducteurId: assignment?.conducteurId ?? null,
        vehiculeId: assignment?.vehiculeId ?? null,
        remorqueId: assignment?.remorqueId ?? null,
        typeTransport,
        statut: phase.statut,
        statutOperationnel: phase.statutOperationnel,
        pickupOffsetDays: pickupOffset,
        pickupTime,
        deliveryOffsetDays: deliveryOffset,
        deliveryTime,
        pickupLabel: route.pickupLabel,
        pickupAddress: route.pickupAddress,
        pickupPostalCode: route.pickupPostalCode,
        pickupCity: route.pickupCity,
        deliveryLabel: route.deliveryLabel,
        deliveryAddress: route.deliveryAddress,
        deliveryPostalCode: route.deliveryPostalCode,
        deliveryCity: route.deliveryCity,
        distanceKm,
        natureMarchandise,
        poidsKg: 4200 + ((missionRank * 310) % 14200),
        volumeM3: 16 + ((missionRank * 7) % 36),
        nombreColis: 6 + (missionRank % 30),
        prixHt: 520 + ((missionRank * 43) % 1320),
        tauxTva: 20,
        numeroCmr: `CMR-${String(500 + missionRank).padStart(4, '0')}`,
        numeroBl: `BL-${String(500 + missionRank).padStart(4, '0')}`,
        instructions: `Rdv ${route.pickupLabel} -> ${route.deliveryLabel}. Contacter exploitation en cas de retard.`,
        notesInternes: `${phase.notes}${affreted ? ' [AFFRETEMENT]' : ''}`,
        temperatureRequise: natureMarchandise === 'Pharma' || natureMarchandise === 'Produits frais' ? '2-8 C' : null,
        dateLivraisonReelle,
      } satisfies GeneratedMission
    }),
  )
}

function buildClientPortalState(clients: SeedClientRef[], missions: GeneratedMission[]) {
  const statuses = [
    { commercialReview: 'valide', comptableReview: 'valide', status: 'validee' },
    { commercialReview: 'valide', comptableReview: 'en_attente', status: 'en_verification_comptable' },
    { commercialReview: 'en_attente', comptableReview: 'en_attente', status: 'en_verification_commerciale' },
    { commercialReview: 'refuse', comptableReview: 'en_attente', status: 'refusee' },
    { commercialReview: 'valide', comptableReview: 'valide', status: 'validee' },
    { commercialReview: 'valide', comptableReview: 'valide', status: 'validee' },
  ] as const
  const selectedClients = clients.slice(0, statuses.length)

  const onboardings = selectedClients.map((client, index) => {
    const review = statuses[index]
    const id = `onb-demo-${String(index + 1).padStart(3, '0')}`
    return {
      id,
      ownerProfileId: `client-owner-${String(index + 1).padStart(3, '0')}`,
      submittedAt: nowIsoMinus(32 - index * 2, 10, 0),
      updatedAt: nowIsoMinus(5 - index, 11, 0),
      companyName: client.name,
      siret: `${55220010000000 + index}`,
      vatNumber: `FR${index + 11}5522001000${String(index).padStart(2, '0')}`,
      contactEmail: client.email.toLowerCase(),
      contactPhone: client.phone,
      billingAddress: `${20 + index} rue Comptable, ${client.city}`,
      operationAddress: `${40 + index} avenue Logistique, ${client.city}`,
      notes: `Dossier client demo ${client.name}.`,
      commercialReview: review.commercialReview,
      comptableReview: review.comptableReview,
      status: review.status,
      rejectionReason: review.status === 'refusee' ? 'Pieces Kbis non conformes.' : null,
      clientId: review.status === 'validee' ? client.id : null,
      history: [
        { at: nowIsoMinus(32 - index * 2, 10, 0), actorRole: 'client', actorName: 'Client', message: 'Inscription entreprise envoyee.' },
        { at: nowIsoMinus(30 - index * 2, 14, 30), actorRole: 'commercial', actorName: 'Service Commercial', message: review.commercialReview === 'valide' ? 'Validation commerciale.' : review.commercialReview === 'refuse' ? 'Refus commercial.' : 'Dossier en attente commerciale.' },
      ],
    }
  })

  const employees = onboardings.flatMap((onboarding, index) => {
    if (onboarding.status !== 'validee') return []
    const base = [
      { fullName: `Responsable Transport ${index + 1}`, email: `transport${index + 1}@client-demo.fr`, permissions: ['demandes:create', 'demandes:read', 'factures:read', 'users:manage'] },
      { fullName: `Approvisionneur ${index + 1}`, email: `appro${index + 1}@client-demo.fr`, permissions: ['demandes:create', 'demandes:read'] },
      { fullName: `Comptable ${index + 1}`, email: `compta${index + 1}@client-demo.fr`, permissions: ['factures:read'] },
    ]
    return base.map((employee, rowIndex) => ({
      id: `client-emp-${String(index + 1).padStart(2, '0')}-${rowIndex + 1}`,
      onboardingId: onboarding.id,
      fullName: employee.fullName,
      email: employee.email,
      title: rowIndex === 0 ? 'Responsable logistique' : rowIndex === 1 ? 'Approvisionnement' : 'Comptabilite',
      permissions: employee.permissions,
      active: !(index === 2 && rowIndex === 2),
      createdAt: nowIsoMinus(20 - index, 9, 0),
      updatedAt: nowIsoMinus(2, 17, 0),
    }))
  })

  const lifecycleToRequestStatus = ['soumise', 'en_etude', 'modification_demandee', 'acceptee', 'refusee'] as const
  const acceptedMissionByClient = new Map<string, GeneratedMission[]>()
  missions
    .filter(mission => mission.statut !== 'brouillon')
    .forEach((mission) => {
      const bucket = acceptedMissionByClient.get(mission.clientId) ?? []
      bucket.push(mission)
      acceptedMissionByClient.set(mission.clientId, bucket)
    })

  const transportRequests = onboardings.flatMap((onboarding, onboardingIndex) => {
    const targetMissions = acceptedMissionByClient.get(onboarding.clientId ?? '') ?? missions.slice(onboardingIndex * 2, onboardingIndex * 2 + 4)
    const requestCount = 5
    return Array.from({ length: requestCount }, (_, requestIndex) => {
      const mission = targetMissions[requestIndex % Math.max(1, targetMissions.length)] ?? missions[(onboardingIndex + requestIndex) % missions.length]
      const status = lifecycleToRequestStatus[(onboardingIndex + requestIndex) % lifecycleToRequestStatus.length]
      return {
        id: `client-req-${String(onboardingIndex + 1).padStart(2, '0')}-${String(requestIndex + 1).padStart(2, '0')}`,
        onboardingId: onboarding.id,
        requesterProfileId: onboarding.ownerProfileId,
        submittedAt: nowIsoMinus(18 - requestIndex, 8 + (requestIndex % 4), 20),
        updatedAt: nowIsoMinus(3 + (requestIndex % 4), 11, 10),
        reference: `REQ-26${String(700 + onboardingIndex * 10 + requestIndex).padStart(4, '0')}`,
        pickupAddress: `${mission.pickupAddress}, ${mission.pickupPostalCode} ${mission.pickupCity}`,
        pickupDatetime: isoDateTime(mission.pickupOffsetDays, mission.pickupTime),
        deliveryAddress: `${mission.deliveryAddress}, ${mission.deliveryPostalCode} ${mission.deliveryCity}`,
        deliveryDatetime: isoDateTime(mission.deliveryOffsetDays, mission.deliveryTime),
        goodsDescription: mission.natureMarchandise,
        packageCount: mission.nombreColis,
        weightKg: mission.poidsKg,
        contactName: `Contact ${onboarding.companyName}`,
        contactPhone: onboarding.contactPhone,
        instructions: mission.instructions,
        status,
        exploitationNote: status === 'modification_demandee'
          ? 'Merci de preciser le creneau exact de livraison.'
          : status === 'refusee'
            ? 'Capacite indisponible sur ce creneau.'
            : status === 'acceptee'
              ? 'Demande validee et OT cree.'
              : null,
        decidedAt: status === 'soumise' ? null : nowIsoMinus(2, 14, 0),
        decidedByRole: status === 'soumise' ? null : 'exploitant',
        createdOtId: status === 'acceptee' ? mission.id : null,
        history: [
          { at: nowIsoMinus(18 - requestIndex, 8, 15), actorRole: 'client', actorName: 'Client', message: 'Demande transport envoyee.' },
          status === 'soumise'
            ? { at: nowIsoMinus(17 - requestIndex, 10, 0), actorRole: 'system', actorName: 'System', message: 'Demande recue et en attente.' }
            : { at: nowIsoMinus(2, 14, 0), actorRole: 'exploitant', actorName: 'Exploitation', message: `Decision exploitation: ${status}` },
        ],
      }
    })
  })

  return {
    onboardings,
    employees,
    transportRequests,
  }
}

function buildAffretementPortalState(missions: GeneratedMission[]) {
  const companyNames = ['Atlas Affretement', 'Nordic Freight Partners', 'Sud Route Services', 'EuroRelais Transport']
  const statuses = ['validee', 'validee', 'validee', 'en_verification_comptable'] as const

  const onboardings = companyNames.map((companyName, index) => ({
    id: `aff-onb-${String(index + 1).padStart(3, '0')}`,
    ownerProfileId: `aff-owner-${String(index + 1).padStart(3, '0')}`,
    submittedAt: nowIsoMinus(40 - index * 3, 9, 0),
    updatedAt: nowIsoMinus(4 - index, 12, 0),
    companyName,
    siret: `${72330050000000 + index}`,
    vatNumber: `FR${index + 31}7233005000${String(index).padStart(2, '0')}`,
    contactEmail: `contact@${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.fr`,
    contactPhone: `06 50 40 3${index} ${index}${index}`,
    billingAddress: `${12 + index} boulevard Affretement, Paris`,
    operationAddress: `${60 + index} rue des Conducteurs, Lyon`,
    notes: 'Partenaire sous-traitance demo.',
    commercialReview: 'valide',
    comptableReview: statuses[index] === 'validee' ? 'valide' : 'en_attente',
    status: statuses[index],
    rejectionReason: null,
    history: [
      { at: nowIsoMinus(40 - index * 3, 9, 0), actorRole: 'affreteur', actorName: 'Affreteur', message: 'Inscription affreteur envoyee.' },
      { at: nowIsoMinus(35 - index * 3, 14, 0), actorRole: 'commercial', actorName: 'Commercial', message: 'Validation commerciale.' },
    ],
  }))

  const validatedOnboardings = onboardings.filter(item => item.status === 'validee')

  const employees = validatedOnboardings.flatMap((onboarding, onboardingIndex) => [
    {
      id: `aff-emp-${onboardingIndex + 1}-1`,
      onboardingId: onboarding.id,
      fullName: `Gestionnaire ${onboardingIndex + 1}`,
      email: `gestionnaire${onboardingIndex + 1}@aff-demo.fr`,
      role: 'gestionnaire',
      permissions: ['contrats:read', 'contrats:update', 'drivers:manage', 'fleet:manage', 'users:manage'],
      active: true,
      createdAt: nowIsoMinus(25, 9, 0),
      updatedAt: nowIsoMinus(2, 17, 0),
    },
    {
      id: `aff-emp-${onboardingIndex + 1}-2`,
      onboardingId: onboarding.id,
      fullName: `Conducteur Relais ${onboardingIndex + 1}`,
      email: `driver${onboardingIndex + 1}@aff-demo.fr`,
      role: 'conducteur_affreteur',
      permissions: ['contrats:read', 'contrats:update'],
      active: true,
      createdAt: nowIsoMinus(20, 8, 0),
      updatedAt: nowIsoMinus(1, 18, 0),
    },
  ])

  const drivers = validatedOnboardings.flatMap((onboarding, onboardingIndex) =>
    Array.from({ length: 8 }, (_, index) => ({
      id: `aff-driver-${onboardingIndex + 1}-${index + 1}`,
      onboardingId: onboarding.id,
      fullName: `AFF ${pick(DRIVER_FIRST_NAMES, onboardingIndex + index)} ${pick(DRIVER_LAST_NAMES, onboardingIndex + index * 2)}`,
      email: `aff.driver.${onboardingIndex + 1}.${index + 1}@demo.fr`,
      phone: `06 60 2${onboardingIndex}${index} ${index}${index}`,
      licenseNumber: `AFFCE${onboardingIndex + 1}${String(index + 1).padStart(3, '0')}`,
      active: !(index === 7 && onboardingIndex === 1),
      createdAt: nowIsoMinus(22 - index, 9, 0),
      updatedAt: nowIsoMinus(1, 16, 0),
    })))

  const vehicles = validatedOnboardings.flatMap((onboarding, onboardingIndex) =>
    Array.from({ length: 6 }, (_, index) => ({
      id: `aff-veh-${onboardingIndex + 1}-${index + 1}`,
      onboardingId: onboarding.id,
      plate: `AFF-${onboardingIndex + 1}${String(index + 1).padStart(2, '0')}-PL`,
      brand: pick(VEHICLE_BRANDS, onboardingIndex + index),
      model: pick(VEHICLE_MODELS, onboardingIndex + index),
      capacityKg: 18000 + index * 1200,
      active: true,
      createdAt: nowIsoMinus(18 - index, 8, 30),
      updatedAt: nowIsoMinus(1, 15, 0),
    })))

  const equipments = validatedOnboardings.flatMap((onboarding, onboardingIndex) =>
    Array.from({ length: 10 }, (_, index) => ({
      id: `aff-eq-${onboardingIndex + 1}-${index + 1}`,
      onboardingId: onboarding.id,
      label: `Equipement ${index + 1}`,
      kind: index % 3 === 0 ? 'Sangles' : index % 3 === 1 ? 'Transpalette' : 'Kit ADR',
      serialNumber: `AEQ-${onboardingIndex + 1}-${String(index + 1).padStart(4, '0')}`,
      active: true,
      createdAt: nowIsoMinus(16 - index, 10, 0),
      updatedAt: nowIsoMinus(2, 12, 0),
    })))

  const affretedMissions = missions.filter(mission => mission.affreted).slice(0, 36)
  const statusOrderByStage: Record<LifecycleStage, 'propose' | 'accepte' | 'en_cours' | 'termine'> = {
    en_attente_validation: 'propose',
    en_attente_prise_en_charge: 'accepte',
    pris_en_charge: 'en_cours',
    en_cours_livraison: 'en_cours',
    livre: 'termine',
    facture: 'termine',
    paye: 'termine',
  }
  const operationFlow = ['hlp_vers_chargement', 'en_cours_chargement', 'charge', 'en_route_livraison', 'livre'] as const

  const driversByOnboarding = new Map<string, typeof drivers>()
  drivers.forEach((driver) => {
    const list = driversByOnboarding.get(driver.onboardingId) ?? []
    list.push(driver)
    driversByOnboarding.set(driver.onboardingId, list)
  })
  const vehiclesByOnboarding = new Map<string, typeof vehicles>()
  vehicles.forEach((vehicle) => {
    const list = vehiclesByOnboarding.get(vehicle.onboardingId) ?? []
    list.push(vehicle)
    vehiclesByOnboarding.set(vehicle.onboardingId, list)
  })
  const equipmentsByOnboarding = new Map<string, typeof equipments>()
  equipments.forEach((equipment) => {
    const list = equipmentsByOnboarding.get(equipment.onboardingId) ?? []
    list.push(equipment)
    equipmentsByOnboarding.set(equipment.onboardingId, list)
  })

  const contracts = affretedMissions.map((mission, index) => {
    const onboarding = validatedOnboardings[index % validatedOnboardings.length]
    const contractStatus = index % 9 === 0 && mission.lifecycleStage !== 'paye'
      ? 'refuse'
      : statusOrderByStage[mission.lifecycleStage]
    const onboardingDrivers = driversByOnboarding.get(onboarding.id) ?? []
    const onboardingVehicles = vehiclesByOnboarding.get(onboarding.id) ?? []
    const onboardingEquipments = equipmentsByOnboarding.get(onboarding.id) ?? []
    const selectedDriver = onboardingDrivers[index % Math.max(1, onboardingDrivers.length)] ?? null
    const selectedVehicle = onboardingVehicles[index % Math.max(1, onboardingVehicles.length)] ?? null
    const selectedEquipments = onboardingEquipments.slice(index % 4, (index % 4) + 2).map(item => item.id)
    const completedSteps = contractStatus === 'termine'
      ? operationFlow.length
      : contractStatus === 'en_cours'
        ? 4
        : contractStatus === 'accepte'
          ? 2
          : 0

    const operationalUpdates = operationFlow.slice(0, completedSteps).map((key, stepIndex) => {
      const gps = key === 'livre' || key === 'en_route_livraison' || key === 'charge'
        ? CITY_GPS[mission.deliveryCity] ?? CITY_GPS[mission.pickupCity] ?? null
        : CITY_GPS[mission.pickupCity] ?? null
      return {
        key,
        at: nowIsoMinus(Math.max(1, 8 - stepIndex), 9 + stepIndex, 5),
        note: `${key} renseigne automatiquement dans la demo.`,
        gpsLat: gps ? Number((gps.lat + stepIndex * 0.0012).toFixed(6)) : null,
        gpsLng: gps ? Number((gps.lng + stepIndex * 0.0012).toFixed(6)) : null,
      }
    })

    return {
      id: `aff-contract-${String(index + 1).padStart(3, '0')}`,
      otId: mission.id,
      onboardingId: onboarding.id,
      status: contractStatus,
      proposedAt: nowIsoMinus(12 - (index % 4), 10, 0),
      decidedAt: contractStatus === 'propose' ? null : nowIsoMinus(6 - (index % 3), 15, 30),
      updatedAt: nowIsoMinus(1, 18, 0),
      proposedByRole: 'exploitant',
      proposedByName: 'Exploitation NEXORA',
      exploitationNote: mission.lifecycleStage === 'en_attente_validation'
        ? 'A valider avec planning principal.'
        : 'Contrat conforme aux exigences donneur d ordre.',
      affreteurNote: contractStatus === 'refuse' ? 'Capacite indisponible ce jour.' : 'Moyens valides pour la mission.',
      assignedDriverId: selectedDriver?.id ?? null,
      assignedVehicleId: selectedVehicle?.id ?? null,
      assignedEquipmentIds: selectedEquipments,
      operationalUpdates,
      history: [
        { at: nowIsoMinus(12 - (index % 4), 10, 0), actorRole: 'exploitant', actorName: 'Exploitation NEXORA', message: 'Proposition contrat affrete.' },
        contractStatus === 'refuse'
          ? { at: nowIsoMinus(5, 11, 30), actorRole: 'affreteur', actorName: onboarding.companyName, message: 'Refus contrat affrete.' }
          : { at: nowIsoMinus(5, 11, 30), actorRole: 'affreteur', actorName: onboarding.companyName, message: `Contrat ${contractStatus}.` },
      ],
    }
  })

  return {
    onboardings,
    employees,
    drivers,
    vehicles,
    equipments,
    contracts,
  }
}

export async function shouldAutoSeedTransportDemo() {
  if (!isDemoDataEnabled()) return false
  if (!isLocalHost() || typeof window === 'undefined') return false
  const state = window.localStorage.getItem(DEMO_SEED_STORAGE_KEY)
  if (state === 'running') return false

  const localCounts = {
    clients: getDemoLocalTable('clients').length,
    conducteurs: getDemoLocalTable('conducteurs').length,
    vehicules: getDemoLocalTable('vehicules').length,
    remorques: getDemoLocalTable('remorques').length,
    ordresTransport: getDemoLocalTable('ordres_transport').length,
  }

  const localLooksComplete = (
    localCounts.clients >= 14
    && localCounts.conducteurs >= 150
    && localCounts.vehicules >= 17
    && localCounts.remorques >= 22
    && localCounts.ordresTransport >= 72
  )

  if ((state === 'done' || state === 'skipped') && localLooksComplete) return false
  if (localLooksComplete) return false
  if (hasDemoLocalData('ordres_transport') && localCounts.conducteurs >= 150) return false

  const checks = await Promise.all([
    supabase.from('clients').select('id', { head: true, count: 'exact' }),
    supabase.from('conducteurs').select('id', { head: true, count: 'exact' }),
    supabase.from('vehicules').select('id', { head: true, count: 'exact' }),
    supabase.from('remorques').select('id', { head: true, count: 'exact' }),
    supabase.from('ordres_transport').select('id', { head: true, count: 'exact' }),
  ])

  if (checks.some(result => Boolean(result.error))) return true
  const remoteCounts = {
    clients: checks[0]?.count ?? 0,
    conducteurs: checks[1]?.count ?? 0,
    vehicules: checks[2]?.count ?? 0,
    remorques: checks[3]?.count ?? 0,
    ordresTransport: checks[4]?.count ?? 0,
  }
  const remoteLooksComplete = (
    remoteCounts.clients >= 14
    && remoteCounts.conducteurs >= 150
    && remoteCounts.vehicules >= 17
    && remoteCounts.remorques >= 22
    && remoteCounts.ordresTransport >= 72
  )
  return !remoteLooksComplete
}

export function getDemoSeedState(): DemoSeedState | null {
  if (typeof window === 'undefined') return null
  const state = window.localStorage.getItem(DEMO_SEED_STORAGE_KEY)
  return state === 'running' || state === 'done' || state === 'failed' || state === 'skipped' ? state : null
}

export function resetDemoSeedState() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(DEMO_SEED_STORAGE_KEY)
}

export function markDemoSeedState(state: DemoSeedState) {
  if (typeof window !== 'undefined') window.localStorage.setItem(DEMO_SEED_STORAGE_KEY, state)
}

export async function seedTransportDemoData() {
  if (!isDemoDataEnabled()) {
    throw new Error('Mode donnees demo desactive. Active VITE_ENABLE_DEMO_DATA=true en local si necessaire.')
  }

  const clientBankRefs = [
    ['FR16512345678', 30, 'virement', 'BNPAFRPPXXX', 'FR7630004000031234567890143'],
    ['FR24523456789', 45, 'virement', 'AGRIFRPP540', 'FR7630006000011122334455667'],
    ['FR33534567890', 60, 'traite', 'CMCIFRPP', 'FR7630011000019988776655443'],
    ['FR42545678901', 30, 'prelevement', 'SOGEFRPP', 'FR7630018000025544332211009'],
    ['FR51556789012', 30, 'virement', 'PSSTFRPPLYO', 'FR7630041000080011223344556'],
    ['FR60567890123', 45, 'cheque', 'CMCIFRPPREN', 'FR7630066000098877665544332'],
    ['FR73578901234', 30, 'prelevement', 'NORDFRPP', 'FR7630076000055667788990012'],
    ['FR84589012345', 30, 'virement', 'CCBPFRPPGRE', 'FR7630096000001122334455668'],
    ['FR95590123456', 50, 'traite', 'BREDFRPPXXX', 'FR7630107000076543212345678'],
    ['FR06601234567', 35, 'virement', 'CEPAFRPP681', 'FR7630115000022221111000099'],
    ['FR17612345678', 30, 'virement', 'SOGEFRPPLIL', 'FR7630116000010192837465555'],
    ['FR28623456789', 40, 'prelevement', 'AGRIFRPPTLS', 'FR7630117000099988877766654'],
    ['FR39634567890', 50, 'traite', 'CMCIFRPPPAR', 'FR7630118000018181818181818'],
    ['FR40645678901', 45, 'virement', 'BNPAFRPPDKQ', 'FR7630119000027272727272727'],
  ] as const

  const clientRefs = buildClientRefs()
  const driverRefs = buildDriverRefs(150)
  const vehicleRefs = buildVehicleRefs(17)
  const trailerRefs = buildTrailerRefs(22)
  const assignments = buildAssignments(driverRefs, vehicleRefs, trailerRefs)
  const missions = buildMissions(clientRefs, assignments)

  const clients = clientRefs.map((clientRef, index) => {
    const bank = clientBankRefs[index % clientBankRefs.length]
    return {
      id: clientRef.id,
      nom: clientRef.name,
      type_client: clientRef.clientType,
      telephone: clientRef.phone,
      email: clientRef.email,
      adresse: `${10 + index} avenue Logistique`,
      code_postal: String(59000 + (index * 7 % 3200)).padStart(5, '0'),
      ville: clientRef.city,
      pays: 'France',
      siret: `${55210000000000 + index}`.slice(0, 14),
      tva_intra: bank[0],
      conditions_paiement: bank[1],
      encours_max: 45000 + index * 5000,
      taux_tva_defaut: 20,
      notes: `Client demo ${clientRef.name}, suivi transport + facturation.`,
      actif: true,
      code_client: clientRef.code,
      adresse_facturation: `${20 + index} rue Comptable`,
      code_postal_facturation: String(59000 + (index * 7 % 3200)).padStart(5, '0'),
      ville_facturation: clientRef.city,
      pays_facturation: 'France',
      contact_facturation_nom: `Responsable ${clientRef.name.split(' ')[0]}`,
      contact_facturation_email: `compta${index + 1}@demo-client.fr`,
      contact_facturation_telephone: `03 10 20 30 ${String(10 + index).padStart(2, '0')}`,
      mode_paiement_defaut: bank[2],
      type_echeance: index % 3 === 0 ? 'fin_de_mois' : index % 3 === 1 ? 'date_facture_plus_delai' : 'jour_fixe',
      jour_echeance: index % 3 === 2 ? 15 : null,
      iban: bank[4],
      bic: bank[3],
      banque: ['BNP', 'Credit Agricole', 'CIC', 'Societe Generale', 'La Banque Postale', 'Banque Populaire', 'Banque Courtois'][index % 7],
      titulaire_compte: clientRef.name,
    }
  })

  const contacts = clients.map((client, index) => ({
    id: mockId(21, index + 1),
    client_id: client.id,
    nom: pick(DRIVER_LAST_NAMES, index),
    prenom: pick(DRIVER_FIRST_NAMES, index),
    poste: pick(['Approvisionnement', 'Magasin', 'Operations', 'Affretement', 'Planning', 'Expedition'], index),
    telephone: `06 ${String(index + 11).padStart(2, '0')} ${String(index + 12).padStart(2, '0')} ${String(index + 13).padStart(2, '0')} ${String(index + 14).padStart(2, '0')}`,
    email: `contact${index + 1}@demo-client.fr`,
    principal: true,
  }))

  const clientsCore = clients.map(({
    id, nom, type_client, telephone, email, adresse, code_postal, ville, pays, siret, tva_intra, conditions_paiement, encours_max, taux_tva_defaut, notes, actif,
  }) => ({
    id, nom, type_client, telephone, email, adresse, code_postal, ville, pays, siret, tva_intra, conditions_paiement, encours_max, taux_tva_defaut, notes, actif,
  }))

  const clientsDetails = clients.map(({
    id, code_client, adresse_facturation, code_postal_facturation, ville_facturation, pays_facturation, contact_facturation_nom, contact_facturation_email,
    contact_facturation_telephone, mode_paiement_defaut, type_echeance, jour_echeance, iban, bic, banque, titulaire_compte,
  }) => ({
    id, code_client, adresse_facturation, code_postal_facturation, ville_facturation, pays_facturation, contact_facturation_nom, contact_facturation_email,
    contact_facturation_telephone, mode_paiement_defaut, type_echeance, jour_echeance, iban, bic, banque, titulaire_compte,
  }))

  const adresses = clients.flatMap((client, index) => [
    {
      id: mockId(22, index * 2 + 1),
      client_id: client.id,
      nom_lieu: `${client.nom} Enlevement`,
      type_lieu: 'enlevement',
      adresse: `${30 + index} rue du Chargement`,
      code_postal: client.code_postal,
      ville: client.ville,
      pays: 'France',
      contact_nom: `${contacts[index]?.prenom ?? ''} ${contacts[index]?.nom ?? ''}`.trim(),
      contact_tel: contacts[index]?.telephone ?? null,
      horaires: '06:00-14:00',
      instructions: 'Prise de quai standard',
      actif: true,
    },
    {
      id: mockId(22, index * 2 + 2),
      client_id: client.id,
      nom_lieu: `${client.nom} Livraison`,
      type_lieu: 'livraison',
      adresse: `${60 + index} avenue de la Livraison`,
      code_postal: client.code_postal,
      ville: client.ville,
      pays: 'France',
      contact_nom: 'Equipe reception',
      contact_tel: `01 40 50 60 ${String(10 + index).padStart(2, '0')}`,
      horaires: '07:00-17:00',
      instructions: 'Livraison sur rendez-vous',
      actif: true,
    },
  ])

  const conducteurs = driverRefs.map((driverRef, index) => ({
    id: driverRef.id,
    nom: driverRef.lastName,
    prenom: driverRef.firstName,
    telephone: `06 71 10 ${String(10 + (index % 80)).padStart(2, '0')} ${String(index + 1).padStart(3, '0').slice(-3)}`,
    email: driverRef.email,
    adresse: driverRef.city,
    date_naissance: isoDate(-(11000 + index * 33)),
    numero_permis: `CE${driverRef.lastName.toUpperCase().slice(0, 4)}${String(index + 1).padStart(3, '0')}`,
    permis_categories: index % 5 === 0 ? ['B', 'C', 'CE'] : ['C', 'CE'],
    permis_expiration: isoDate(220 + index * 7),
    fimo_date: isoDate(-(2200 - index * 12)),
    fco_date: isoDate(-(600 - index * 3)),
    fco_expiration: isoDate(900 + index * 8),
    carte_tachy_numero: `TACHY${String(index + 1).padStart(4, '0')}`,
    carte_tachy_expiration: isoDate(180 + index * 6),
    statut: index % 37 === 0 ? 'arret_maladie' : index % 29 === 0 ? 'conges' : 'actif',
    notes: `Conducteur demo ${driverRef.preferences}.`,
    preferences: driverRef.preferences,
    matricule: `CH${String(index + 1).padStart(4, '0')}`,
    poste: `Conducteur ${driverRef.preferences}`,
    type_contrat: index % 11 === 0 ? 'Interim' : index % 5 === 0 ? 'CDD' : 'CDI',
    date_entree: isoDate(-(2200 - index * 5)),
    contact_urgence_nom: `Urgence ${driverRef.lastName}`,
    contact_urgence_telephone: `06 90 10 ${String(20 + (index % 70)).padStart(2, '0')} ${String(10 + (index % 50)).padStart(2, '0')}`,
    visite_medicale_date: isoDate(-(180 - (index % 30))),
    visite_medicale_expiration: isoDate(40 + (index % 120)),
    recyclage_date: isoDate(-(220 - (index % 50))),
    recyclage_expiration: isoDate(120 + (index % 220)),
  }))

  const conducteursCore = conducteurs.map(({
    id, nom, prenom, telephone, email, adresse, date_naissance, numero_permis, permis_categories, permis_expiration, fimo_date, fco_date, fco_expiration,
    carte_tachy_numero, carte_tachy_expiration, statut, notes, preferences,
  }) => ({
    id, nom, prenom, telephone, email, adresse, date_naissance, numero_permis, permis_categories, permis_expiration, fimo_date, fco_date, fco_expiration,
    carte_tachy_numero, carte_tachy_expiration, statut, notes, preferences,
  }))

  const conducteursDetails = conducteurs.map(({
    id, matricule, poste, type_contrat, date_entree, contact_urgence_nom, contact_urgence_telephone, visite_medicale_date, visite_medicale_expiration,
    recyclage_date, recyclage_expiration,
  }) => ({
    id, matricule, poste, type_contrat, date_entree, contact_urgence_nom, contact_urgence_telephone, visite_medicale_date, visite_medicale_expiration,
    recyclage_date, recyclage_expiration,
  }))

  const vehicules = vehicleRefs.map((vehicleRef, index) => ({
    id: vehicleRef.id,
    immatriculation: vehicleRef.plate,
    marque: vehicleRef.brand,
    modele: vehicleRef.model,
    annee: 2018 + (index % 7),
    type_vehicule: vehicleRef.vehicleType,
    ptac_kg: vehicleRef.vehicleType === 'porteur' ? 26000 : 44000,
    km_actuel: 140000 + index * 27000,
    statut: index % 11 === 0 ? 'maintenance' : index % 3 === 0 ? 'en_service' : 'disponible',
    notes: vehicleRef.notes,
    preferences: vehicleRef.notes,
    numero_carte_grise: `CG-TR-${String(index + 1).padStart(4, '0')}`,
    vin: `VINTR${String(index + 1).padStart(6, '0')}`,
    date_mise_en_circulation: isoDate(-(3000 - index * 85)),
    date_achat: isoDate(-(2920 - index * 80)),
    cout_achat_ht: 62000 + index * 4300,
    type_propriete: index % 3 === 0 ? 'achat' : index % 3 === 1 ? 'leasing' : 'location',
    garantie_expiration: isoDate(80 + index * 25),
    contrat_entretien: index % 2 === 0,
    prestataire_entretien: pick(['Volvo Services', 'DAF Care', 'Mercedes Fleet', 'Renault Trucks Care', 'Iveco Service', 'MAN Center', 'Scania Premium Care'], index),
    garage_entretien: pick(['Garage Nord Truck', 'Garage Est PL', 'Garage Centre Truck', 'Garage Sud Truck', 'Garage Atlantique Trucks'], index),
    ct_expiration: isoDate(-20 + index * 16),
    assurance_expiration: isoDate(35 + index * 14),
    tachy_serie: `TCH-${String(index + 1).padStart(4, '0')}`,
    tachy_etalonnage_prochain: isoDate(40 + index * 12),
    vignette_expiration: isoDate(90 + index * 10),
  }))

  const vehiculesCore = vehicules.map(({
    id, immatriculation, marque, modele, annee, type_vehicule, ptac_kg, km_actuel, statut, notes, preferences,
  }) => ({
    id, immatriculation, marque, modele, annee, type_vehicule, ptac_kg, km_actuel, statut, notes, preferences,
  }))

  const vehiculesDetails = vehicules.map(({
    id, numero_carte_grise, vin, date_mise_en_circulation, date_achat, cout_achat_ht, type_propriete, garantie_expiration, contrat_entretien,
    prestataire_entretien, garage_entretien, ct_expiration, assurance_expiration, tachy_serie, tachy_etalonnage_prochain, vignette_expiration,
  }) => ({
    id, numero_carte_grise, vin, date_mise_en_circulation, date_achat, cout_achat_ht, type_propriete, garantie_expiration, contrat_entretien,
    prestataire_entretien, garage_entretien, ct_expiration, assurance_expiration, tachy_serie, tachy_etalonnage_prochain, vignette_expiration,
  }))

  const remorques = trailerRefs.map((trailerRef, index) => ({
    id: trailerRef.id,
    immatriculation: trailerRef.plate,
    type_remorque: trailerRef.trailerType,
    marque: trailerRef.brand,
    charge_utile_kg: 25000 + index * 320,
    longueur_m: 13.6,
    statut: index % 9 === 0 ? 'maintenance' : index % 3 === 0 ? 'en_service' : 'disponible',
    notes: trailerRef.notes,
    preferences: trailerRef.notes,
    numero_carte_grise: `CG-RM-${String(index + 1).padStart(4, '0')}`,
    vin: `VINRM${String(index + 1).padStart(6, '0')}`,
    date_mise_en_circulation: isoDate(-(3400 - index * 70)),
    date_achat: isoDate(-(3320 - index * 67)),
    cout_achat_ht: 32000 + index * 1500,
    type_propriete: index % 3 === 0 ? 'achat' : index % 3 === 1 ? 'leasing' : 'location',
    garantie_expiration: isoDate(45 + index * 20),
    ct_expiration: isoDate(-15 + index * 19),
    assurance_expiration: isoDate(55 + index * 14),
    contrat_entretien: index % 2 === 0,
    prestataire_entretien: pick(['Frigo Service', 'Schmitz Partner', 'Krone Service', 'Trouillet Care', 'Cold Fleet'], index),
    garage_entretien: pick(['Garage Nord Truck', 'Garage Est PL', 'Garage Centre Truck', 'Garage Ouest PL', 'Garage Alpes Truck'], index),
  }))

  const remorquesCore = remorques.map(({
    id, immatriculation, type_remorque, marque, charge_utile_kg, longueur_m, statut, notes, preferences,
  }) => ({
    id, immatriculation, type_remorque, marque, charge_utile_kg, longueur_m, statut, notes, preferences,
  }))

  const remorquesDetails = remorques.map(({
    id, numero_carte_grise, vin, date_mise_en_circulation, date_achat, cout_achat_ht, type_propriete, garantie_expiration, ct_expiration,
    assurance_expiration, contrat_entretien, prestataire_entretien, garage_entretien,
  }) => ({
    id, numero_carte_grise, vin, date_mise_en_circulation, date_achat, cout_achat_ht, type_propriete, garantie_expiration, ct_expiration,
    assurance_expiration, contrat_entretien, prestataire_entretien, garage_entretien,
  }))

  const contactByClientId = new Map(contacts.map(contact => [contact.client_id, contact]))

  const affectations = assignments.map((assignment) => ({
    id: assignment.id,
    conducteur_id: assignment.conducteurId,
    vehicule_id: assignment.vehiculeId,
    remorque_id: assignment.remorqueId,
    type_affectation: assignment.typeAffectation,
    date_debut: isoDate(assignment.dateDebutOffsetDays),
    date_fin: assignment.dateFinOffsetDays != null ? isoDate(assignment.dateFinOffsetDays) : null,
    actif: assignment.actif,
    notes: assignment.notes,
  }))

  const ordresTransport = missions.map((mission) => ({
    id: mission.id,
    client_id: mission.clientId,
    conducteur_id: mission.conducteurId,
    vehicule_id: mission.vehiculeId,
    remorque_id: mission.remorqueId,
    reference: mission.reference,
    type_transport: mission.typeTransport,
    statut: mission.statut,
    statut_operationnel: mission.statutOperationnel,
    date_chargement_prevue: isoDateTime(mission.pickupOffsetDays, mission.pickupTime),
    date_livraison_prevue: isoDateTime(mission.deliveryOffsetDays, mission.deliveryTime),
    date_livraison_reelle: mission.dateLivraisonReelle,
    distance_km: mission.distanceKm,
    nature_marchandise: mission.natureMarchandise,
    poids_kg: mission.poidsKg,
    volume_m3: mission.volumeM3,
    nombre_colis: mission.nombreColis,
    prix_ht: mission.prixHt,
    taux_tva: mission.tauxTva,
    numero_cmr: mission.numeroCmr,
    numero_bl: mission.numeroBl,
    instructions: mission.instructions,
    notes_internes: mission.notesInternes,
    temperature_requise: mission.temperatureRequise,
  }))

  const etapesMission = missions.flatMap((mission, index) => {
    const stepStatuses = missionStepStatuses(mission)
    const contact = contactByClientId.get(mission.clientId) ?? null
    const chargementDateReelle = stepStatuses.chargement === 'realise'
      ? isoDateTime(mission.pickupOffsetDays, mission.pickupTime)
      : null
    const livraisonDateReelle = stepStatuses.livraison === 'realise'
      ? mission.dateLivraisonReelle ?? isoDateTime(mission.deliveryOffsetDays, mission.deliveryTime)
      : null

    return [
      {
        id: mockId(74, index * 2 + 1),
        ot_id: mission.id,
        ordre: 1,
        type_etape: 'chargement',
        adresse_id: null,
        adresse_libre: mission.pickupAddress,
        ville: mission.pickupCity,
        code_postal: mission.pickupPostalCode,
        pays: 'France',
        contact_nom: contact ? `${contact.prenom} ${contact.nom}` : null,
        contact_tel: contact?.telephone ?? null,
        date_prevue: isoDateTime(mission.pickupOffsetDays, mission.pickupTime),
        date_reelle: chargementDateReelle,
        instructions: `Chargement - ${mission.pickupLabel}`,
        statut: stepStatuses.chargement,
        poids_kg: mission.poidsKg,
        nombre_colis: mission.nombreColis,
        reference_marchandise: mission.reference,
        notes: mission.notesInternes,
      },
      {
        id: mockId(74, index * 2 + 2),
        ot_id: mission.id,
        ordre: 2,
        type_etape: 'livraison',
        adresse_id: null,
        adresse_libre: mission.deliveryAddress,
        ville: mission.deliveryCity,
        code_postal: mission.deliveryPostalCode,
        pays: 'France',
        contact_nom: 'Equipe reception',
        contact_tel: contact?.telephone ?? null,
        date_prevue: isoDateTime(mission.deliveryOffsetDays, mission.deliveryTime),
        date_reelle: livraisonDateReelle,
        instructions: `Livraison - ${mission.deliveryLabel}`,
        statut: stepStatuses.livraison,
        poids_kg: mission.poidsKg,
        nombre_colis: mission.nombreColis,
        reference_marchandise: mission.reference,
        notes: mission.instructions,
      },
    ]
  })

  const facturableMissions = missions.filter(mission => mission.lifecycleStage === 'facture' || mission.lifecycleStage === 'paye')
  const factures = facturableMissions.map((mission, index) => {
    const dateEmissionOffset = mission.deliveryOffsetDays + 1
    const isPaid = mission.lifecycleStage === 'paye'
    return {
      id: mockId(75, index + 1),
      client_id: mission.clientId,
      ot_id: mission.id,
      numero: `FAC-26${String(500 + index).padStart(4, '0')}`,
      date_emission: isoDate(dateEmissionOffset),
      date_echeance: isoDate(dateEmissionOffset + 30),
      date_paiement: isPaid ? isoDate(dateEmissionOffset + 7) : null,
      mode_paiement: pick(['virement', 'prelevement', 'traite', 'cheque'], index),
      montant_ht: mission.prixHt,
      montant_tva: Math.round(mission.prixHt * 0.2),
      montant_ttc: Math.round(mission.prixHt * 1.2),
      taux_tva: 20,
      statut: isPaid ? 'payee' : (index % 3 === 0 ? 'en_retard' : 'envoyee'),
      notes: isPaid ? 'Reglement recu.' : 'Facture envoyee au client.',
    }
  })

  const conducteurEvents = conducteurs.slice(0, 24).map((conducteur, index) => ({
    id: mockId(71, index + 1),
    conducteur_id: conducteur.id,
    event_type: pick(['visite_medicale', 'arret_maladie', 'formation', 'entretien', 'absence'], index),
    title: `Evenement RH demo ${index + 1}`,
    description: 'Suivi RH conducteur.',
    severity: index % 4 === 0 ? 'warning' : 'info',
    start_date: isoDate(index - 20),
    end_date: index % 6 === 0 ? isoDate(index - 18) : null,
    reminder_at: isoDate(index + 3),
  }))

  const vehiculeKm = vehicules.slice(0, 17).flatMap((vehicule, index) => [
    {
      id: mockId(72, index * 2 + 1),
      vehicule_id: vehicule.id,
      reading_date: isoDate(-45),
      km_compteur: (vehicule.km_actuel as number) - 6200,
      source: 'atelier',
      notes: null,
    },
    {
      id: mockId(72, index * 2 + 2),
      vehicule_id: vehicule.id,
      reading_date: isoDate(-1),
      km_compteur: vehicule.km_actuel,
      source: 'atelier',
      notes: null,
    },
  ])

  const flotteEntretiens = [
    ...vehicules.slice(0, 10).map((vehicule, index) => ({
      id: mockId(73, index + 1),
      vehicule_id: vehicule.id,
      remorque_id: null,
      maintenance_type: pick(['revision', 'reparation', 'vidange', 'freinage'], index),
      service_date: isoDate(-(60 - index * 3)),
      km_compteur: vehicule.km_actuel ? (vehicule.km_actuel as number) - (index * 900) : null,
      cout_ht: 520 + index * 120,
      cout_ttc: (520 + index * 120) * 1.2,
      covered_by_contract: index % 2 === 0,
      prestataire: vehicule.prestataire_entretien,
      garage: vehicule.garage_entretien,
      next_due_date: isoDate(40 + index * 14),
      next_due_km: vehicule.km_actuel ? (vehicule.km_actuel as number) + 14000 : null,
      notes: 'Entretien flotte demo.',
    })),
    ...remorques.slice(0, 8).map((remorque, index) => ({
      id: mockId(73, 200 + index + 1),
      vehicule_id: null,
      remorque_id: remorque.id,
      maintenance_type: pick(['controle_technique', 'groupe_froid', 'entretien_general'], index),
      service_date: isoDate(-(48 - index * 4)),
      km_compteur: null,
      cout_ht: 240 + index * 85,
      cout_ttc: (240 + index * 85) * 1.2,
      covered_by_contract: index % 2 === 1,
      prestataire: remorque.prestataire_entretien,
      garage: remorque.garage_entretien,
      next_due_date: isoDate(80 + index * 20),
      next_due_km: null,
      notes: 'Entretien remorque demo.',
    })),
  ]

  const flotteEquipements = [
    ...vehicules.slice(0, 17).map((vehicule, index) => ({
      id: mockId(76, index + 1),
      vehicule_id: vehicule.id,
      remorque_id: null,
      nom: pick(['Kit ADR', 'Transpalette', 'Extincteur', 'Sangles arrimage', 'Hayon 2T'], index),
      category: pick(['securite', 'manutention', 'arrimage', 'capacite'], index),
      quantite: index % 3 === 0 ? 2 : 1,
      statut: index % 11 === 0 ? 'a_controler' : 'conforme',
      notes: 'Equipement flotte societe mere.',
    })),
    ...remorques.slice(0, 22).map((remorque, index) => ({
      id: mockId(76, 300 + index + 1),
      vehicule_id: null,
      remorque_id: remorque.id,
      nom: pick(['Groupe froid', 'Double plancher', 'Kit coils', 'Securite quai'], index),
      category: pick(['temperature', 'capacite', 'arrimage'], index),
      quantite: 1,
      statut: index % 8 === 0 ? 'a_controler' : 'conforme',
      notes: 'Equipement remorque societe mere.',
    })),
  ]

  const driverStepLabels: Record<string, string> = {
    vers_chargement: 'HLP vers chargement',
    chargement_en_cours: 'En cours de chargement',
    charge: 'Charge',
    vers_livraison: 'En route vers livraison',
    livre: 'Livre',
  }
  const lifecycleSteps: Record<LifecycleStage, Array<'vers_chargement' | 'chargement_en_cours' | 'charge' | 'vers_livraison' | 'livre'>> = {
    en_attente_validation: [],
    en_attente_prise_en_charge: [],
    pris_en_charge: ['vers_chargement', 'chargement_en_cours'],
    en_cours_livraison: ['vers_chargement', 'chargement_en_cours', 'charge', 'vers_livraison'],
    livre: ['vers_chargement', 'chargement_en_cours', 'charge', 'vers_livraison', 'livre'],
    facture: ['vers_chargement', 'chargement_en_cours', 'charge', 'vers_livraison', 'livre'],
    paye: ['vers_chargement', 'chargement_en_cours', 'charge', 'vers_livraison', 'livre'],
  }
  const historiqueStatuts = missions.flatMap((mission, index) => {
    const baseStatuses = mission.statut === 'brouillon'
      ? ['brouillon']
      : mission.statut === 'confirme'
        ? ['brouillon', 'confirme']
        : mission.statut === 'en_cours'
          ? ['brouillon', 'confirme', 'en_cours']
          : ['brouillon', 'confirme', 'en_cours', mission.statut]

    const statusRows = baseStatuses.slice(1).map((status, stepIndex) => ({
      id: mockId(77, index * 20 + stepIndex + 1),
      ot_id: mission.id,
      statut_ancien: baseStatuses[stepIndex],
      statut_nouveau: status,
      commentaire: JSON.stringify({
        source: 'mock_seed',
        message: `Transition ${baseStatuses[stepIndex]} -> ${status}`,
      }),
      created_by: null,
      created_at: nowIsoMinus(Math.max(1, 18 - stepIndex - (index % 7)), 8 + stepIndex, 0),
    }))

    const cityGps = CITY_GPS[mission.deliveryCity] ?? CITY_GPS[mission.pickupCity] ?? null
    const driverRows = lifecycleSteps[mission.lifecycleStage].map((step, stepIndex) => ({
      id: mockId(77, index * 20 + 10 + stepIndex + 1),
      ot_id: mission.id,
      statut_ancien: stepIndex === 0 ? mission.statutOperationnel : `conducteur:${lifecycleSteps[mission.lifecycleStage][stepIndex - 1]}`,
      statut_nouveau: `conducteur:${step}`,
      commentaire: JSON.stringify({
        source: 'mock_seed_driver',
        step,
        stepLabel: driverStepLabels[step],
        note: `${driverStepLabels[step]} renseigne dans la simulation.`,
        gps: cityGps
          ? {
              lat: Number((cityGps.lat + stepIndex * 0.001).toFixed(6)),
              lng: Number((cityGps.lng + stepIndex * 0.001).toFixed(6)),
              accuracy: 12 + stepIndex * 2,
              captured_at: nowIsoMinus(Math.max(1, 6 - stepIndex), 9 + stepIndex, 20),
            }
          : null,
      }),
      created_by: null,
      created_at: nowIsoMinus(Math.max(1, 6 - stepIndex), 9 + stepIndex, 20),
    }))
    return [...statusRows, ...driverRows]
  })

  replaceDemoLocalTables({
    clients,
    contacts,
    adresses,
    conducteurs,
    vehicules,
    remorques,
    affectations,
    ordres_transport: ordresTransport,
    etapes_mission: etapesMission,
    factures,
    historique_statuts: historiqueStatuts,
    conducteur_evenements_rh: conducteurEvents,
    vehicule_releves_km: vehiculeKm,
    flotte_entretiens: flotteEntretiens,
    flotte_equipements: flotteEquipements,
  })

  const remoteWriteErrors: string[] = []
  let remoteWritesSucceeded = 0
  let remoteWritesSkipped = 0

  async function attemptUpsert(table: string, rows: Record<string, unknown>[], options?: { optionalSchema?: boolean }) {
    if (rows.length === 0) return
    try {
      await upsertRows(table, rows)
      remoteWritesSucceeded += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const optionalSchema = options?.optionalSchema === true
      if (isWritePermissionError(message) || (optionalSchema && isOptionalSchemaError(message))) {
        remoteWritesSkipped += 1
        remoteWriteErrors.push(`${table}: ${message}`)
        return
      }
      throw error
    }
  }

  await attemptUpsert('clients', clientsCore)
  await attemptUpsert('clients', clientsDetails, { optionalSchema: true })
  await attemptUpsert('contacts', contacts)
  await attemptUpsert('adresses', adresses)
  await attemptUpsert('conducteurs', conducteursCore)
  await attemptUpsert('conducteurs', conducteursDetails, { optionalSchema: true })
  await attemptUpsert('vehicules', vehiculesCore)
  await attemptUpsert('vehicules', vehiculesDetails, { optionalSchema: true })
  await attemptUpsert('remorques', remorquesCore)
  await attemptUpsert('remorques', remorquesDetails, { optionalSchema: true })
  await attemptUpsert('affectations', affectations)
  await attemptUpsert('ordres_transport', ordresTransport)
  await attemptUpsert('etapes_mission', etapesMission)
  await attemptUpsert('factures', factures)
  await attemptUpsert('historique_statuts', historiqueStatuts, { optionalSchema: true })
  await attemptUpsert('conducteur_evenements_rh', conducteurEvents, { optionalSchema: true })
  await attemptUpsert('vehicule_releves_km', vehiculeKm, { optionalSchema: true })
  await attemptUpsert('flotte_entretiens', flotteEntretiens, { optionalSchema: true })
  await attemptUpsert('flotte_equipements', flotteEquipements, { optionalSchema: true })

  const clientPortalState = buildClientPortalState(clientRefs, missions)
  writePortalState(CLIENT_PORTAL_STORAGE_KEY, CLIENT_PORTAL_EVENT, clientPortalState)

  const affretementPortalState = buildAffretementPortalState(missions)
  writePortalState(AFFRETEMENT_PORTAL_STORAGE_KEY, AFFRETEMENT_PORTAL_EVENT, affretementPortalState)

  return {
    clients: clients.length,
    contacts: contacts.length,
    adresses: adresses.length,
    conducteurs: conducteurs.length,
    vehicules: vehicules.length,
    remorques: remorques.length,
    affectations: affectations.length,
    ordresTransport: ordresTransport.length,
    etapesMission: etapesMission.length,
    factures: factures.length,
    historiqueStatuts: historiqueStatuts.length,
    equipements: flotteEquipements.length,
    clientOnboardings: clientPortalState.onboardings.length,
    clientRequests: clientPortalState.transportRequests.length,
    affretementOnboardings: affretementPortalState.onboardings.length,
    affretementContracts: affretementPortalState.contracts.length,
    remoteWritesSucceeded,
    remoteWritesSkipped,
    remoteWriteErrors,
    localFallback: remoteWritesSucceeded === 0,
    users: 0,
  }
}
