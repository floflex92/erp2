export type SiteNavItem = {
  label: string
  to: string
}

export type FeatureHighlight = {
  title: string
  body: string
  tag: string
}

export type ScreenshotSlot = {
  title: string
  caption: string
  format: string
  label: string
  status: string
  highlights: string[]
}

export type WorkflowStep = {
  step: string
  title: string
  body: string
  timing: string
}

export type PlatformModule = {
  title: string
  body: string
  meta: string
}

export type PromoReel = {
  title: string
  audience: string
  duration: string
  summary: string
  outcome: string
  chapters: string[]
}

export type FeatureStage = {
  title: string
  eyebrow: string
  body: string
  items: string[]
}

export const siteNav: SiteNavItem[] = [
  { label: 'Accueil', to: '/' },
  { label: 'La solution', to: '/solution' },
  { label: 'Planning intelligent', to: '/planning-intelligent' },
  { label: 'Avantages & ROI', to: '/avantages-roi' },
  { label: 'Secteur transport', to: '/secteur-transport' },
  { label: 'Démonstration', to: '/demonstration' },
  { label: 'À propos', to: '/a-propos' },
  { label: 'SEO ERP', to: '/erp-transport-tms' },
  { label: 'Contact', to: '/contact' },
]

export const coreCapabilities: FeatureHighlight[] = [
  {
    tag: 'Exploitation',
    title: 'Pilotage quotidien des opérations transport',
    body: 'Vue centralisée des ordres de transport, des statuts, des alertes terrain et des priorités d exploitation.',
  },
  {
    tag: 'Courses',
    title: 'Exécution des missions et suivi des courses',
    body: 'Suivi de la préparation, de l affectation, de la feuille de route et de la trace d exécution sans sortir du même outil.',
  },
  {
    tag: 'Planning',
    title: 'Planning flotte, conducteurs et ressources',
    body: 'Arbitrage visuel des disponibilites, des contraintes materiel et des affectations a venir.',
  },
  {
    tag: 'Flotte',
    title: 'Camions, remorques et équipements reliés aux opérations',
    body: 'La flotte n est pas geree a part: elle alimente directement les missions, l atelier et la conformite.',
  },
  {
    tag: 'RH & conformite',
    title: 'Dossiers chauffeurs, tachygraphe, amendes et suivi RH',
    body: 'Les volets administratifs, sociaux et reglementaires restent relies au terrain et exploitables en contexte.',
  },
  {
    tag: 'Facturation',
    title: 'Du transport execute a la facturation',
    body: 'Les donnees operationnelles alimentent les etapes comptables pour limiter les ressaisies et fiabiliser la marge.',
  },
  {
    tag: 'API',
    title: 'Portails, connecteurs et flux dédiés',
    body: 'Le socle laisse une place propre aux integrations metier, aux espaces clients et aux extensions inter-ERP.',
  },
  {
    tag: 'Temps reel',
    title: 'Statuts et communication relies a l execution',
    body: 'Le suivi des missions, de la messagerie et des priorites reste lisible sans sortir du meme environnement.',
  },
]

export const productPillars: FeatureHighlight[] = [
  {
    tag: 'Temps reel',
    title: 'Statuts, alertes et arbitrages sans delai',
    body: 'L etat de l exploitation est visible immediatement: on ne court plus apres l information pour prendre une decision.',
  },
  {
    tag: 'Tout dans un seul outil',
    title: 'Pas de dispersion entre logiciels',
    body: 'Planning, documents, tachygraphe, facturation et communication restent dans le meme systeme, relies a l execution.',
  },
  {
    tag: 'ERP pour transporteurs',
    title: 'Concu pour la realite d un transporteur routier',
    body: 'Les categories, les vues et les workflows correspondent aux usages reels du transport: dispatch, groupage, rotations et conformite.',
  },
]

export const screenshotSlots: ScreenshotSlot[] = [
  {
    title: 'Cockpit exploitation live',
    caption: 'Lecture orientee operations pour montrer priorites, statuts, alertes terrain et arbitrages immediats sans sortir du meme cockpit.',
    format: 'Frame produit 1600x1000',
    label: 'Exploitation',
    status: 'Module developpe',
    highlights: ['Ordres de transport et priorites', 'Exceptions, retards et points bloquants', 'Lecture direction et exploitation'],
  },
  {
    title: 'Planning flotte, affectations et groupage',
    caption: 'Presentation du planning croisant courses, ressources, disponibilites et arbitrages de charge, avec marge pour les evolutions groupage et affretement.',
    format: 'Frame produit 1600x1000',
    label: 'Planning',
    status: 'Developpe, extensions en cours',
    highlights: ['Courses et feuilles de route', 'Affectations conducteurs et flotte', 'Groupage, charge et coordination'],
  },
  {
    title: 'Dossier chauffeur, RH et conformite',
    caption: 'Vue de synthese pour relier documents, suivi RH, tachygraphe, amendes et contraintes reglementaires au terrain.',
    format: 'Frame produit 1600x1000',
    label: 'RH & conformite',
    status: 'Socle actif, enrichissements en cours',
    highlights: ['Profils et pieces justificatives', 'Suivi tachygraphe et amendes', 'Lien avec l execution terrain'],
  },
]

export const metrics = [
  { value: '12+', label: 'modules actifs', detail: 'dashboard, transports, planning, flotte, conformite, RH, documents...' },
  { value: '360°', label: 'couverture exploitation', detail: 'du dispatch a la livraison, en passant par la conformite et la paie' },
  { value: 'Temps reel', label: 'suivi des missions', detail: 'statuts, priorites, alertes et coordination conducteurs en direct' },
]

export const workflowSteps: WorkflowStep[] = [
  {
    step: '01',
    title: 'Un ordre de transport entre dans le système',
    body: 'Saisie ou import, l OT alimente immediatement le cockpit exploitation: statut, conducteur, remorque, client et delai. Tout le monde voit la meme chose au meme moment.',
    timing: 'De la creation a la prise en charge',
  },
  {
    step: '02',
    title: 'L exploitation arbitre, affecte et suit',
    body: 'Planning, groupage, disponibilites et feuille de route sont geres depuis une vue centrale. Les alertes remontent automatiquement: depassement HSE, CT, retard, alerte atelier.',
    timing: 'Arbitrage et coordination temps reel',
  },
  {
    step: '03',
    title: 'La course est livree, la trace reste',
    body: 'Confirmation de livraison, documents associes, paie conducteur, facturation client: tout est capture dans le meme systeme sans ressaisie manuelle.',
    timing: 'De l execution a la comptabilisation',
  },
]

export const valuePoints: FeatureHighlight[] = [
  {
    tag: 'Exploitation',
    title: 'Un cockpit unique pour toute l activité du jour',
    body: 'Priorites, statuts, alertes et decisions d exploitation regroupes dans une seule vue lisible, accessible a l exploitant comme a la direction.',
  },
  {
    tag: 'Planning',
    title: 'Planning flotte et conducteurs sans jongler entre outils',
    body: 'Disponibilites, contraintes HSE, groupage, affectations et feuilles de route dans le meme espace que le cockpit exploitation.',
  },
  {
    tag: 'Conformite',
    title: 'RH, tachygraphe et documents restes dans le systeme',
    body: 'Profils conducteurs, suivi des heures, amendes, pieces justificatives et alertes reglementaires ne sortent pas vers un autre logiciel.',
  },
  {
    tag: 'Traçabilité',
    title: 'La trace de chaque mission reste exploitable',
    body: 'Chaque course laisse une empreinte: execution, photo de livraison, incident, commentaire et lien vers le dossier conducteur.',
  },
  {
    tag: 'Finance',
    title: 'Du transport execute a la facturation sans ressaisie',
    body: 'Les donnees operationnelles alimentent la facturation client et la paie conducteur pour limiter les doubles saisies et fiabiliser la marge reelle.',
  },
  {
    tag: 'Extensions',
    title: 'Portail client, API et interconnexions déjà prévues',
    body: 'Espace client, espace affreteur, flux dedies et connectivite inter-ERP font partie de la feuille de route. Le socle est concu pour les accueillir.',
  },
]

export const platformModules: PlatformModule[] = [
  {
    title: 'Cockpit exploitation',
    body: 'Transports en cours, statuts, priorites et alertes dans une lecture unique. L exploitant voit ce qui avance, ce qui bloque et ce qui attend.',
    meta: 'Socle actif',
  },
  {
    title: 'Planning & affectations',
    body: 'Planning flotte, disponibilites conducteurs, groupage et feuilles de route. La charge reelle est visible avant de valider chaque mission.',
    meta: 'Socle actif',
  },
  {
    title: 'RH, tachygraphe et documents',
    body: 'Profils, heures, alertes HSE, visite medicale, amendes et coffre numerique. Tout reste dans le logiciel sans sortir vers un outil annexe.',
    meta: 'En cours d enrichissement',
  },
  {
    title: 'Facturation, portail et API',
    body: 'Du transport execute a la facturation client sans ressaisie. L espace client et les interconnexions externes font partie de la feuille de route.',
    meta: 'En cours de developpement',
  },
]

export const roleViews: FeatureHighlight[] = [
  {
    tag: 'Exploitant',
    title: 'Priorites, statuts et decisions en direct',
    body: 'Le cockpit centralise les transports en cours, les points bloquants, les alertes terrain et les arbitrages immediats. L exploitant ne cherche plus: il voit, il decide.',
  },
  {
    tag: 'Direction',
    title: 'Vue d ensemble sans attendre un rapport',
    body: 'Charge du jour, taux de livraison, alertes flotte et avancement financier sont lisibles depuis le meme systeme, en temps reel, sans export manuel.',
  },
  {
    tag: 'Chauffeurs & RH',
    title: 'Profils, conformite et terrain dans le meme outil',
    body: 'Feuilles de route, documents, heures, tachygraphe et amendes restent lies a l execution. Pas de double saisie entre le terrain et le bureau.',
  },
]

export const contactPoints = [
  'Presenter le logiciel en contexte sur vos donnees',
  'Cadrer le perimetre: exploitation, planning, RH, conformite ou facturation',
  'Identifier les modules actifs qui couvrent vos enjeux immediats',
  'Evaluer les extensions ou connexions specifiques a votre organisation',
]

export const teamPromises: FeatureHighlight[] = [
  {
    tag: 'Équipe à l écoute',
    title: 'Un interlocuteur qui comprend l exploitation avant de parler habillage',
    body: 'Les demandes sont traitees a partir des realites terrain: charge d exploitation, organisation planning, documents, RH, conformite et circulation d information.',
  },
  {
    tag: 'Développement continu',
    title: 'Le logiciel evolue en continu au lieu de figer un perimetre trop tot',
    body: 'Le site public assume cette logique: socle deja solide, modules en cours, et feuille de route claire pour les besoins qui arrivent ensuite.',
  },
  {
    tag: 'Fonctionnalites sur demande',
    title: 'Des ajouts métier peuvent être cadrés sans casser le cœur ERP',
    body: 'La base a ete pensee pour integrer de nouveaux besoins: portail, connectivite, automatisations, vues affreteur, groupage avance ou workflows internes specifiques.',
  },
]

export const promoReels: PromoReel[] = [
  {
    title: 'Matinée exploitation en 45 secondes',
    audience: 'Exploitants et direction',
    duration: '00:45',
    summary: 'Un reel court qui montre la prise de poste, les priorites visibles, les exceptions qui remontent et les decisions immediates dans le cockpit.',
    outcome: 'Objectif: faire sentir la valeur du pilotage temps reel des la premiere lecture.',
    chapters: ['Ouverture du cockpit exploitation', 'Lecture des statuts et alertes', 'Priorisation des actions terrain'],
  },
  {
    title: 'Du planning a la feuille de route',
    audience: 'Planning, exploitation, affretement',
    duration: '01:00',
    summary: 'Ce reel raconte le passage entre charge a couvrir, affectations, coordination flotte et construction de la feuille de route.',
    outcome: 'Objectif: montrer que le planning n est pas isole du reste du logiciel.',
    chapters: ['Vue planning et disponibilites', 'Affectations ressources', 'Validation feuille de route'],
  },
  {
    title: 'Dossier chauffeur, conformite et preuves',
    audience: 'RH, conformite, direction',
    duration: '00:50',
    summary: 'Un format plus administratif pour montrer que NEXORA Truck relie aussi documents, suivi RH et cadre reglementaire a l execution.',
    outcome: 'Objectif: sortir du simple discours dispatch et faire comprendre la profondeur ERP.',
    chapters: ['Fiche chauffeur et pieces', 'Tachygraphe, amendes, alertes', 'Coffre et suivi documentaire'],
  },
]

export const featureStages: FeatureStage[] = [
  {
    title: 'Déjà développé',
    eyebrow: 'Socle operationnel',
    body: 'Les briques suivantes existent deja dans le produit et structurent la valeur immediate du logiciel.',
    items: ['Dashboard', 'Tasks', 'Transports', 'Planning', 'Feuille de route', 'Map live', 'Chauffeurs', 'Remorques', 'Maintenance', 'Demandes clients', 'Login, auth et roles', 'Parametres'],
  },
  {
    title: 'En cours de développement',
    eyebrow: 'Extensions actives',
    body: 'Ces modules avancent deja et font partie du discours produit car ils prolongent directement le socle existant.',
    items: ['Clients', 'Facturation', 'Paie et RH', 'Frais', 'Prospection', 'Tachygraphe', 'Amendes', 'Espace client', 'Espace affreteur', 'Tchat et communication', 'Coffre numerique', 'Utilisateurs'],
  },
  {
    title: 'Futur et demandes avancees',
    eyebrow: 'Feuille de route',
    body: 'Les sujets suivants sont identifies dans le projet pour pousser plus loin le logiciel ou repondre a des besoins sur demande.',
    items: ['Connectivite et discussion inter-ERP', 'Planning affreteur dedie', 'Groupage multi-courses figeable et deliable', 'Mail et messagerie persistants', 'Assistant IA', 'Notifications push intelligentes', 'Cockpit KPI visuel', 'Application mobile conducteur', 'Detection d emails transport', 'Parsing intelligent des demandes', 'Creation de course depuis email avec validation', 'API bourses de fret', 'Tracking temps reel via APIs externes'],
  },
]