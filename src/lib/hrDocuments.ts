import type { Profil, Role } from './auth'
import { ROLE_LABELS } from './auth'
import { readCompanySettings } from './companySettings'
import { deliverDemoMailToInbox } from './demoMail'
import { createPdfDocument, type PdfDocumentOptions } from './pdfDocument'
import { extractPayrollPeriodLabel, isPayrollReleased } from './payrollWorkflow'
import { getDigitalSignature, upsertDigitalSignature } from './signatureStore'
import { staffDisplayName, type StaffMember } from './staffDirectory'
import { serializeTchatPayload, type TchatAttachment } from './tchatMessage'

export type HrDocumentCategory =
  | 'contrat_travail'
  | 'fiche_paie'
  | 'livret_integration'
  | 'mutuelle'
  | 'fiche_information_embauche'
  | 'fiche_poste'
  | 'convention_collective'
  | 'carte_vitale'
  | 'carte_identite'
  | 'justificatif_domicile'
  | 'scan_complementaire'
  | 'charte_rgpd'
  | 'reglement_entreprise'

export interface HrDocumentRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeEmail: string | null
  employeeRole: Role
  category: HrDocumentCategory
  title: string
  mimeType: string
  fileName: string
  size: number
  url: string
  createdAt: string
  createdById: string
  createdByName: string
  source: 'generated' | 'uploaded'
  requiresSignature: boolean
  signedAt: string | null
  signatureLabel: string | null
  tags: string[]
  archived: boolean
  availableAt?: string | null
  paymentScheduledAt?: string | null
}

type HrDocumentState = {
  items: HrDocumentRecord[]
}

const STORAGE_KEY = 'nexora-hr-documents-v1'
const EVENT_NAME = 'nexora-hr-documents-updated'
const RGPD_VERSION_TAG = 'legal-rgpd-2026-03-28'
const CONVENTION_VERSION_TAG = 'legal-convention-idcc16-2026-03-28'
const JOB_SHEET_VERSION_TAG = 'job-sheet-2026-04-12'

export const HR_CATEGORY_LABELS: Record<HrDocumentCategory, string> = {
  contrat_travail: 'Contrat de travail',
  fiche_paie: 'Fiche de paie',
  livret_integration: 'Livret d integration',
  mutuelle: 'Dossier mutuelle',
  fiche_information_embauche: 'Fiche information embauche',
  fiche_poste: 'Fiche metier',
  convention_collective: 'Convention collective',
  carte_vitale: 'Carte Vitale',
  carte_identite: 'Carte d identite',
  justificatif_domicile: 'Justificatif de domicile',
  scan_complementaire: 'Document scanne complementaire',
  charte_rgpd: 'Charte RGPD',
  reglement_entreprise: 'Reglement entreprise',
}

function nextId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100_000)}`
}

function readState(): HrDocumentState {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const fallback = { items: [] } satisfies HrDocumentState
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }

  try {
    const parsed = JSON.parse(raw) as Partial<HrDocumentState>
    if (Array.isArray(parsed.items)) {
      return {
        items: parsed.items.filter(item =>
          item
          && typeof item.id === 'string'
          && typeof item.employeeId === 'string'
          && typeof item.category === 'string',
        ).map(item => ({
          ...item,
          availableAt: typeof item.availableAt === 'string' ? item.availableAt : null,
          paymentScheduledAt: typeof item.paymentScheduledAt === 'string' ? item.paymentScheduledAt : null,
        })) as HrDocumentRecord[],
      }
    }
  } catch {
    // Ignore and reset below.
  }

  const fallback = { items: [] } satisfies HrDocumentState
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
  return fallback
}

function saveState(state: HrDocumentState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function attachmentFromRecord(record: HrDocumentRecord): TchatAttachment {
  return {
    id: `attachment-${record.id}`,
    kind: record.mimeType.startsWith('image/') ? 'image' : 'document',
    name: record.fileName,
    mimeType: record.mimeType,
    size: record.size,
    url: record.url,
  }
}

function createPdfAttachment(title: string, fileName: string, lines: string[], options: PdfDocumentOptions): TchatAttachment {
  const pdf = createPdfDocument(title, lines, options)
  return {
    id: nextId('hr-attachment'),
    kind: 'document',
    name: fileName,
    mimeType: 'application/pdf',
    size: pdf.size,
    url: pdf.url,
  }
}

export function createHrPdfAttachment(title: string, fileName: string, lines: string[], options: PdfDocumentOptions = {}) {
  return createPdfAttachment(title, fileName, lines, options)
}

function createRecord(input: Omit<HrDocumentRecord, 'id' | 'createdAt' | 'archived'>) {
  const state = readState()
  const record: HrDocumentRecord = {
    ...input,
    id: nextId('hr-doc'),
    createdAt: new Date().toISOString(),
    archived: false,
  }
  state.items.unshift(record)
  saveState(state)
  return record
}

export function registerHrDocument(input: Omit<HrDocumentRecord, 'id' | 'createdAt' | 'archived'>) {
  return createRecord(input)
}

function roleContractClauses(role: Role) {
  const roleLabel = ROLE_LABELS[role] ?? role
  return [
    `Fonction: ${roleLabel}`,
    'Duree hebdomadaire de reference: 35 heures, avec adaptation selon l exploitation.',
    'Remuneration et primes selon accords internes et variables de mission.',
    'Le collaborateur respecte les consignes securite, confidentialite et processus ERP.',
    'Les outils numeriques et signatures electroniques sont reserves a un usage professionnel.',
  ]
}

function classificationReference(role: Role) {
  if (role === 'conducteur' || role === 'mecanicien' || role === 'maintenance') {
    return 'Classification de reference a verifier avec le contrat: annexe I ouvriers de la CCN transports routiers.'
  }
  if (
    role === 'exploitant'
    || role === 'commercial'
    || role === 'comptable'
    || role === 'rh'
    || role === 'administratif'
    || role === 'facturation'
    || role === 'flotte'
    || role === 'logisticien'
  ) {
    return 'Classification de reference a verifier avec le contrat: annexe II employes ou annexe III techniciens et agents de maitrise selon le poste exact.'
  }
  return 'Classification de reference a verifier avec le contrat: annexe III techniciens/agents de maitrise ou annexe IV cadres selon les responsabilites effectives.'
}

function composeRoleSheet(common: string[], payload: {
  purpose: string
  missions: string[]
  competences: string[]
  pilotage: string[]
}) {
  return [
    ...common,
    'Positionnement et finalite du poste:',
    payload.purpose,
    '',
    'Missions principales:',
    ...payload.missions.map(item => `- ${item}`),
    '',
    'Competences et exigences:',
    ...payload.competences.map(item => `- ${item}`),
    '',
    'Indicateurs de pilotage et traces attendues:',
    ...payload.pilotage.map(item => `- ${item}`),
    '',
    'Engagement du collaborateur:',
    'La fiche metier complete le contrat de travail. Elle doit etre lue, comprise puis signee numeriquement.',
    'Toute evolution de mission ou de responsabilite doit etre formalisee par une nouvelle version de la fiche metier.',
  ]
}

function roleSheetLines(employee: StaffMember) {
  const label = ROLE_LABELS[employee.role] ?? employee.role
  const common = [
    'FICHE METIER INDIVIDUELLE',
    '',
    `Collaborateur: ${staffDisplayName(employee)}`,
    `Fonction: ${label}`,
    `Service: ${employee.domain}`,
    classificationReference(employee.role),
    '',
  ]

  const roleSheets: Partial<Record<Role, { purpose: string; missions: string[]; competences: string[]; pilotage: string[] }>> = {
    conducteur: {
      purpose: 'Le conducteur execute les transports de marchandises, represente l entreprise chez les clients et garantit le respect des consignes securite et de la reglementation sociale europeenne.',
      missions: [
        'Assurer la conduite, la securisation du chargement et la relation terrain.',
        'Respecter chronotachygraphe, protocoles clients et consignes de prevention.',
        'Verifier les documents de transport, signaler incidents, amendes et anomalies.',
      ],
      competences: [
        'Maitrise de la conduite PL et des regles de securite applicables.',
        'Capacite a remonter rapidement les blocages a l exploitation et a l atelier.',
        'Rigueur documentaire (lettres de voiture, bons, preuves de livraison).',
      ],
      pilotage: [
        'Respect des horaires et des consignes de livraison.',
        'Taux de conformite documentaire et absence de reserves non traitees.',
        'Suivi des alertes securite et infractions conducteur.',
      ],
    },
    conducteur_affreteur: {
      purpose: 'Le conducteur affreteur realise les transports sous mandat operationnel, en appliquant les memes exigences de qualite, securite et tracabilite que les equipes internes.',
      missions: [
        'Executer les ordres confirms et remonter les etapes d avancement.',
        'Respecter les contraintes contractuelles, horaires et procedures de preuve.',
        'Alerter immediatement en cas de risque de retard, refus ou incident.',
      ],
      competences: [
        'Autonomie terrain avec discipline de reporting.',
        'Maitrise des standards qualite client et des contraintes legales transport.',
        'Communication claire avec affretement et exploitation.',
      ],
      pilotage: [
        'Fiabilite ETA et ponctualite de livraison.',
        'Taux d incidents anticipe et traite dans les delais.',
        'Completude des justificatifs transmis.',
      ],
    },
    exploitant: {
      purpose: 'L exploitant pilote les moyens humains et materiels pour garantir qualite de service, rentabilite et continuite d exploitation.',
      missions: [
        'Planifier les missions et affecter les moyens selon priorites et contraintes.',
        'Coordonner conducteurs, clients, quais et sites de chargement/dechargement.',
        'Arbitrer les aleas en temps reel et mettre a jour les statuts operationnels.',
      ],
      competences: [
        'Maitrise planning, OT, contraintes RSE et relation client transport.',
        'Prise de decision rapide avec traçabilite dans l ERP.',
        'Lecture conjointe performance-cout-risque.',
      ],
      pilotage: [
        'Taux de service et ponctualite des missions.',
        'Marge operationnelle par ordre ou tournee.',
        'Nombre d incidents resolus dans le delai cible.',
      ],
    },
    mecanicien: {
      purpose: 'Le mecanicien garantit la disponibilite, la securite et la conformite technique du parc roulant et tracte.',
      missions: [
        'Assurer entretien preventif, controles et interventions correctives.',
        'Declarer immobilisations, besoins pieces et priorites atelier.',
        'Tracer les interventions dans l ERP et informer exploitation/flotte.',
      ],
      competences: [
        'Diagnostic, maintenance et prevention des pannes.',
        'Rigueur documentaire atelier et suivi des conformites.',
        'Coordination efficace avec exploitation et chauffeurs.',
      ],
      pilotage: [
        'Taux de disponibilite du parc.',
        'Delai moyen de remise en service.',
        'Respect des echeances de controle et de maintenance.',
      ],
    },
    commercial: {
      purpose: 'Le commercial developpe l activite et transforme les besoins clients en opportunites exploitables et rentables.',
      missions: [
        'Prospecter, qualifier et developper le portefeuille clients.',
        'Construire les offres avec transmission complete a l exploitation.',
        'Maintenir des donnees clients fiables dans l ERP.',
      ],
      competences: [
        'Negociation B2B et comprehension des contraintes transport.',
        'Capacite a cadrer prix, service et risques contractuels.',
        'Rigueur de suivi des relances et engagements.',
      ],
      pilotage: [
        'Taux de conversion et chiffre d affaires signe.',
        'Marge theorique des dossiers transmis.',
        'Delai de traitement devis et relances.',
      ],
    },
    comptable: {
      purpose: 'Le comptable securise les flux financiers, la paie, les frais et la qualite des justificatifs.',
      missions: [
        'Suivre facturation, reglements, encours et rapprochements.',
        'Controler coherence paie-frais-variables et pieces associees.',
        'Produire les traces comptables et les alertes de risque.',
      ],
      competences: [
        'Rigueur comptable, confidentialite et maitrise des echeances.',
        'Capacite d analyse des ecarts et anomalies.',
        'Collaboration transverse avec RH, exploitation et direction.',
      ],
      pilotage: [
        'Delai moyen de facturation et taux de recouvrement.',
        'Nombre d ecarts detectes puis regularises.',
        'Fiabilite des clotures periodiques.',
      ],
    },
    rh: {
      purpose: 'Le service RH assure la conformite sociale, la tenue des dossiers et la securisation des parcours collaborateurs.',
      missions: [
        'Piloter contrat, onboarding, paie et suivi documentaire obligatoire.',
        'Assurer la disponibilite des documents dans le coffre numerique.',
        'Coordonner les acteurs internes sur les flux RH sensibles.',
      ],
      competences: [
        'Maitrise des obligations sociales et de la confidentialite.',
        'Qualite de formalisation et de tracabilite des decisions RH.',
        'Capacite a accompagner managers et collaborateurs.',
      ],
      pilotage: [
        'Taux de dossiers collaborateurs complets.',
        'Delai de production des documents obligatoires.',
        'Niveau de conformite des signatures et archivages.',
      ],
    },
    dirigeant: {
      purpose: 'Le dirigeant pilote l organisation, les decisions structurantes et la maitrise des risques de l entreprise.',
      missions: [
        'Definir orientations strategiques et arbitrer les priorites de developpement.',
        'Superviser performance operationnelle, RH, financiere et commerciale.',
        'Garantir conformite, gouvernance et robustesse des processus cles.',
      ],
      competences: [
        'Vision transverse et capacite d arbitrage rapide.',
        'Maitrise du pilotage par indicateurs et du management des risques.',
        'Communication claire des decisions et responsabilites.',
      ],
      pilotage: [
        'Evolution marge, tresorerie et qualite de service.',
        'Suivi des risques critiques et plans de mitigation.',
        'Execution des chantiers strategiques valides.',
      ],
    },
    admin: {
      purpose: 'L administrateur garantit la disponibilite des espaces, la gouvernance des acces et la coherence globale des parametrages metier.',
      missions: [
        'Piloter droits, habilitations et configurations critiques.',
        'Superviser la qualite des donnees de reference et des workflows.',
        'Coordonner les evolutions impactant plusieurs equipes.',
      ],
      competences: [
        'Vision systeme et comprehension des dependances metier.',
        'Rigueur sur la securite des acces et la confidentialite.',
        'Capacite a formaliser des standards d utilisation.',
      ],
      pilotage: [
        'Stabilite des parametres critiques et incidents d acces.',
        'Conformite des profils utilisateur au moindre privilege.',
        'Delai de traitement des demandes de changement.',
      ],
    },
  }

  const sheet = roleSheets[employee.role]
  if (sheet) {
    return composeRoleSheet(common, sheet)
  }

  return composeRoleSheet(common, {
    purpose: 'Le collaborateur contribue a la performance de son perimetre en appliquant les procedures et obligations de conformite de l entreprise.',
    missions: [
      'Executer les taches confiees selon les standards internes.',
      'Tracer l activite et les documents dans l ERP.',
      'Alerter en cas de risque, blocage ou non-conformite.',
    ],
    competences: [
      'Rigueur operationnelle et respect des consignes.',
      'Utilisation fiable des outils metier et du coffre numerique.',
      'Communication claire avec les equipes concernees.',
    ],
    pilotage: [
      'Respect des delais et de la qualite attendue.',
      'Traçabilite des actions et documents produits.',
      'Reduction des anomalies recurrentes sur le perimetre.',
    ],
  })
}

function pdfOptionsForUser(ownerId: string): PdfDocumentOptions {
  const settings = readCompanySettings()
  const signature = getDigitalSignature(ownerId)
  return {
    companyName: settings.companyName,
    companyLogoDataUrl: settings.logoDataUrl,
    signatures: signature && signature.isActive
      ? [{ label: 'Signe numeriquement par', value: `${signature.ownerName} - ${signature.signatureText}` }]
      : [],
  }
}

function notifyEmployee(record: HrDocumentRecord, employee: StaffMember, actor: Profil) {
  if (!employee.email) return

  const body = serializeTchatPayload(
    `${HR_CATEGORY_LABELS[record.category]} disponible pour ${record.employeeName}. Consulte le coffre numerique pour suivi.`,
    [attachmentFromRecord(record)],
  )

  deliverDemoMailToInbox(
    {
      id: employee.id,
      role: employee.role,
      nom: employee.nom,
      prenom: employee.prenom,
      email: employee.email,
      domain: employee.domain,
      isDemo: true,
    },
    [actor.prenom, actor.nom].filter(Boolean).join(' ') || 'Service RH',
    actor.email ?? `${actor.role}@nexora.local`,
    `${HR_CATEGORY_LABELS[record.category]} - ${record.title}`,
    body,
    ['rh', record.category],
  )
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error(`Lecture impossible pour ${file.name}.`))
    reader.onerror = () => reject(new Error(`Lecture impossible pour ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

export function listHrDocuments() {
  return readState().items
    .filter(item => !item.archived)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

function archiveDocuments(predicate: (item: HrDocumentRecord) => boolean) {
  const state = readState()
  let changed = false
  state.items = state.items.map(item => {
    if (!item.archived && predicate(item)) {
      changed = true
      return { ...item, archived: true }
    }
    return item
  })
  if (changed) saveState(state)
}

function rgpdCharterLines(employee: StaffMember) {
  const settings = readCompanySettings()
  return [
    'CHARTE RGPD ET PROTECTION DES DONNEES PERSONNELLES',
    '',
    `Entreprise: ${settings.companyName}`,
    `Collaborateur concerne: ${staffDisplayName(employee)}`,
    '',
    '1. Objet de la charte',
    'Cette charte encadre la collecte, l utilisation, la consultation, la conservation et la transmission des donnees personnelles traitees dans les activites RH, paie, exploitation, flotte, surete et communication professionnelle.',
    '',
    '2. Principes applicables',
    '- Finalites determinees, explicites et legitimes.',
    '- Minimisation des donnees et mise a jour reguliere.',
    '- Acces reserves aux seules personnes habilitees.',
    '- Securite, confidentialite et durees de conservation appropriees.',
    '',
    '3. Regles pour les collaborateurs',
    '- Ne consulter que les donnees utiles a la mission.',
    '- Ne jamais partager ses identifiants ni contourner les habilitations.',
    '- Signaler toute perte, erreur, diffusion non autorisee ou suspicion de violation.',
    '- Ne pas exporter ni transmettre des donnees hors cadre professionnel sans autorisation.',
    '',
    '4. Droits des personnes concernees',
    '- Droit a l information avant la collecte.',
    '- Droit d acces, de rectification et, selon les cas, d opposition, de limitation ou d effacement.',
    '- Communication des seules donnees concernant la personne dans le respect des droits des tiers.',
    '',
    '5. References officielles',
    'Cette charte est fondee sur les principes du RGPD et les recommandations officielles de la CNIL.',
    'Sources consultees le 28 mars 2026:',
    '- CNIL, La gestion des ressources humaines: https://www.cnil.fr/fr/la-gestion-des-ressources-humaines',
    '- CNIL, RGPD en pratique : proteger les donnees de vos collaborateurs: https://www.cnil.fr/fr/rgpd-en-pratique-proteger-les-donnees',
    '- CNIL, Evaluation annuelle des salaries: https://www.cnil.fr/fr/levaluation-annuelle-des-salaries-droits-et-obligations-des-employeurs',
    '',
    '6. Opposabilite interne',
    'Le collaborateur reconnait avoir lu la presente charte et s engage a respecter les regles de confidentialite et de protection des donnees au sein de l entreprise.',
  ]
}

function conventionCollectiveLines(employee: StaffMember) {
  const applicableAnnex =
    employee.role === 'conducteur' || employee.role === 'mecanicien'
      ? 'Annexe I ouvriers'
      : employee.role === 'exploitant' || employee.role === 'commercial' || employee.role === 'comptable' || employee.role === 'rh'
        ? 'Annexe II employes ou annexe III techniciens et agents de maitrise selon le poste exact'
        : 'Annexe III techniciens/agents de maitrise ou annexe IV cadres selon le contrat'

  return [
    'CONVENTION COLLECTIVE NATIONALE DE REFERENCE',
    '',
    'Convention collective nationale des transports routiers et activites auxiliaires du transport du 21 decembre 1950.',
    'Identifiant officiel de branche: IDCC 16.',
    `Collaborateur concerne: ${staffDisplayName(employee)}.`,
    `Annexe de rattachement a verifier par RH selon le contrat: ${applicableAnnex}.`,
    '',
    'Base officielle',
    '- Texte de base: convention collective nationale des transports routiers et activites auxiliaires du transport du 21 decembre 1950.',
    '- Pour le transport routier de marchandises et les activites auxiliaires: accord du 3 fevrier 2022 relatif aux diverses dispositions conventionnelles.',
    '- Les annexes historiques restent a verifier selon la categorie du poste et le contrat de travail.',
    '',
    'Themes de reference pour le collaborateur',
    '- Classification et emploi de reference selon l annexe applicable.',
    '- Temps de travail, repos, remuneration et majorations prevues par les textes applicables.',
    '- Frais professionnels et indemnites de deplacement prevus par la branche et les accords applicables.',
    '- Formation professionnelle, protection sociale et dispositions collectives de branche.',
    '',
    'Sources officielles consultees le 28 mars 2026',
    '- Texte de base Légifrance: https://www.legifrance.gouv.fr/conv_coll/id/KALIARTI000005849309/',
    '- Accord marchandises et activites auxiliaires du 3 fevrier 2022: https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000045953105',
    '',
    'Notice de remise',
    'Le present PDF constitue la fiche officielle de remise et de reference de la convention collective applicable dans l entreprise. La version integrale opposable reste celle publiee sur Legifrance et les textes de branche en vigueur.',
  ]
}

export function listHrDocumentsForViewer(viewerId: string, viewerRole: Role, employeeFilterId?: string | null) {
  const all = listHrDocuments()
  if (viewerRole === 'admin' || viewerRole === 'dirigeant' || viewerRole === 'rh') {
    return employeeFilterId ? all.filter(item => item.employeeId === employeeFilterId) : all
  }
  return all.filter(item => item.employeeId === viewerId).filter(item => {
    if (item.category !== 'fiche_paie') return true
    const periodLabel = extractPayrollPeriodLabel(item.tags)
    if (!periodLabel) return true
    return isPayrollReleased(periodLabel, item.availableAt ?? null)
  })
}

export function ensurePolicyDocuments(staff: StaffMember[], actor: Profil) {
  const current = listHrDocuments()
  const settings = readCompanySettings()
  staff.forEach(employee => {
    ;(['charte_rgpd', 'reglement_entreprise', 'convention_collective'] as const).forEach(category => {
      const versionTag =
        category === 'charte_rgpd'
          ? RGPD_VERSION_TAG
          : category === 'convention_collective'
            ? CONVENTION_VERSION_TAG
            : null
      const exists = current.some(item => item.employeeId === employee.id && item.category === category && (!versionTag || item.tags.includes(versionTag)))
      if (exists) return
      if (versionTag) {
        archiveDocuments(item => item.employeeId === employee.id && item.category === category)
      }
      const title =
        category === 'charte_rgpd'
          ? 'Charte RGPD a approuver'
          : category === 'reglement_entreprise'
            ? 'Reglement entreprise a approuver'
            : 'Convention collective transport routier marchandises'
      const contentLines =
        category === 'charte_rgpd'
          ? rgpdCharterLines(employee)
          : category === 'reglement_entreprise'
            ? settings.internalRules.split('\n')
            : conventionCollectiveLines(employee)
      saveGeneratedHrPdfDocument(
        employee,
        actor,
        category,
        title,
        `${category}-${employee.id}.pdf`,
        [
          `Collaborateur: ${staffDisplayName(employee)}`,
          `Fonction: ${ROLE_LABELS[employee.role] ?? employee.role}`,
          '',
          ...contentLines,
        ],
        {
          requiresSignature: category !== 'convention_collective',
          tags: ['obligatoire', category, ...(versionTag ? [versionTag] : [])],
          notify: false,
        },
      )
    })
  })
}

export function generateJobSheet(employee: StaffMember, actor: Profil, notify = true) {
  const title = `Fiche metier - ${ROLE_LABELS[employee.role] ?? employee.role}`
  archiveDocuments(item => item.employeeId === employee.id && item.category === 'fiche_poste' && !item.tags.includes(JOB_SHEET_VERSION_TAG))
  return saveGeneratedHrPdfDocument(
    employee,
    actor,
    'fiche_poste',
    title,
    `fiche-metier-${employee.id}.pdf`,
    roleSheetLines(employee),
    {
      requiresSignature: true,
      tags: ['onboarding', 'poste', 'metier', employee.role, JOB_SHEET_VERSION_TAG],
      notify,
    },
  )
}

export function ensureEmployeeJobSheets(staff: StaffMember[], actor: Profil) {
  const current = listHrDocuments()
  staff.forEach(employee => {
    const exists = current.some(item => item.employeeId === employee.id && item.category === 'fiche_poste' && item.tags.includes(JOB_SHEET_VERSION_TAG))
    if (exists) return
    generateJobSheet(employee, actor, false)
  })
}

export function saveGeneratedHrPdfDocument(
  employee: StaffMember,
  actor: Profil,
  category: HrDocumentCategory,
  title: string,
  fileName: string,
  lines: string[],
  options: {
    requiresSignature?: boolean
    tags?: string[]
    notify?: boolean
    signatures?: PdfDocumentOptions['signatures']
  } = {},
) {
  const attachment = createPdfAttachment(
    title,
    fileName,
    lines,
    {
      ...pdfOptionsForUser(actor.id),
      signatures: options.signatures ?? pdfOptionsForUser(actor.id).signatures,
    },
  )

  const record = createRecord({
    employeeId: employee.id,
    employeeName: staffDisplayName(employee),
    employeeEmail: employee.email,
    employeeRole: employee.role,
    category,
    title,
    mimeType: attachment.mimeType,
    fileName: attachment.name,
    size: attachment.size,
    url: attachment.url,
    createdById: actor.id,
    createdByName: [actor.prenom, actor.nom].filter(Boolean).join(' ') || 'Service RH',
    source: 'generated',
    requiresSignature: options.requiresSignature ?? false,
    signedAt: null,
    signatureLabel: null,
    tags: options.tags ?? [category],
  })

  if (options.notify !== false) {
    notifyEmployee(record, employee, actor)
  }

  return record
}

export function generateEmploymentContract(employee: StaffMember, actor: Profil) {
  const title = `Contrat de travail - ${staffDisplayName(employee)}`
  const attachment = createPdfAttachment(
    title,
    `contrat-${employee.id}.pdf`,
    [
      `Collaborateur: ${staffDisplayName(employee)}`,
      `Email: ${employee.email ?? 'A renseigner'}`,
      `Service: ${employee.domain}`,
      '',
      ...roleContractClauses(employee.role),
      '',
      'Le contrat doit etre lu, signe numeriquement puis archive dans le coffre numerique.',
    ],
    pdfOptionsForUser(actor.id),
  )

  const record = createRecord({
    employeeId: employee.id,
    employeeName: staffDisplayName(employee),
    employeeEmail: employee.email,
    employeeRole: employee.role,
    category: 'contrat_travail',
    title,
    mimeType: attachment.mimeType,
    fileName: attachment.name,
    size: attachment.size,
    url: attachment.url,
    createdById: actor.id,
    createdByName: [actor.prenom, actor.nom].filter(Boolean).join(' ') || 'Service RH',
    source: 'generated',
    requiresSignature: true,
    signedAt: null,
    signatureLabel: null,
    tags: ['contrat', employee.role],
  })

  notifyEmployee(record, employee, actor)
  return record
}

export function generatePayslip(employee: StaffMember, actor: Profil, periodLabel: string, grossAmount: number) {
  const title = `Fiche de paie - ${periodLabel}`
  const attachment = createPdfAttachment(
    title,
    `paie-${employee.id}-${periodLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`,
    [
      `Collaborateur: ${staffDisplayName(employee)}`,
      `Periode: ${periodLabel}`,
      `Fonction: ${ROLE_LABELS[employee.role] ?? employee.role}`,
      `Salaire brut indicatif: ${grossAmount.toFixed(2)} EUR`,
      'Document RH remis sans signature attendue du collaborateur.',
    ],
    pdfOptionsForUser(actor.id),
  )

  const record = createRecord({
    employeeId: employee.id,
    employeeName: staffDisplayName(employee),
    employeeEmail: employee.email,
    employeeRole: employee.role,
    category: 'fiche_paie',
    title,
    mimeType: attachment.mimeType,
    fileName: attachment.name,
    size: attachment.size,
    url: attachment.url,
    createdById: actor.id,
    createdByName: [actor.prenom, actor.nom].filter(Boolean).join(' ') || 'Service paie',
    source: 'generated',
    requiresSignature: false,
    signedAt: null,
    signatureLabel: null,
    tags: ['paie', periodLabel],
  })

  notifyEmployee(record, employee, actor)
  return record
}

export async function uploadEmployeeDocument(employee: StaffMember, actor: Profil, category: Extract<HrDocumentCategory, 'carte_vitale' | 'carte_identite' | 'justificatif_domicile' | 'scan_complementaire'>, file: File) {
  const url = await fileToDataUrl(file)
  const record = createRecord({
    employeeId: employee.id,
    employeeName: staffDisplayName(employee),
    employeeEmail: employee.email,
    employeeRole: employee.role,
    category,
    title: `${HR_CATEGORY_LABELS[category]} - ${staffDisplayName(employee)}`,
    mimeType: file.type || 'application/octet-stream',
    fileName: file.name,
    size: file.size,
    url,
    createdById: actor.id,
    createdByName: [actor.prenom, actor.nom].filter(Boolean).join(' ') || 'Service RH',
    source: 'uploaded',
    requiresSignature: false,
    signedAt: null,
    signatureLabel: null,
    tags: ['scan', category],
  })

  notifyEmployee(record, employee, actor)
  return record
}

export function signHrDocument(documentId: string, employee: StaffMember) {
  const state = readState()
  const document = state.items.find(item => item.id === documentId)
  if (!document) throw new Error('Document introuvable.')
  if (!document.requiresSignature) {
    throw new Error('Ce document ne demande aucune signature.')
  }
  if (document.signedAt) {
    throw new Error('Ce document est deja signe.')
  }
  if (document.employeeId !== employee.id) {
    throw new Error('Seul le collaborateur concerne peut signer ce document.')
  }

  let signature = getDigitalSignature(employee.id)
  if (!signature) {
    const ownerName = staffDisplayName(employee)
    signature = upsertDigitalSignature({
      ownerId: employee.id,
      ownerName,
      role: employee.role,
      signatureText: ownerName,
      signatureImageUrl: null,
      isActive: true,
      updatedAt: new Date().toISOString(),
    })
  }
  if (!signature.isActive) {
    throw new Error('Signature numerique desactivee. Activez-la dans Parametres > Signature.')
  }

  const signedLabel = `${signature.ownerName} - ${signature.signatureText}`
  const signedAttachment = createPdfAttachment(
    document.title,
    document.fileName,
    [
      `Collaborateur: ${document.employeeName}`,
      `Categorie: ${HR_CATEGORY_LABELS[document.category]}`,
      '',
      'Document approuve et signe numeriquement.',
      `Signature: ${signedLabel}`,
      `Horodatage: ${new Date().toLocaleString('fr-FR')}`,
    ],
    {
      ...pdfOptionsForUser(employee.id),
      signatures: [{ label: 'Signature collaborateur', value: signedLabel }],
    },
  )

  state.items = state.items.map(item => item.id === documentId ? {
    ...item,
    url: signedAttachment.url,
    size: signedAttachment.size,
    mimeType: signedAttachment.mimeType,
    signedAt: new Date().toISOString(),
    signatureLabel: signedLabel,
  } : item)

  saveState(state)
  return state.items.find(item => item.id === documentId) ?? null
}

export function subscribeHrDocuments(listener: () => void) {
  const handleUpdate = () => listener()
  window.addEventListener(EVENT_NAME, handleUpdate)
  window.addEventListener('storage', handleUpdate)
  return () => {
    window.removeEventListener(EVENT_NAME, handleUpdate)
    window.removeEventListener('storage', handleUpdate)
  }
}
