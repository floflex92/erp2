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
    body: 'Vue centralisée des ordres de transport, des statuts, des alertes terrain et des priorités d’exploitation.',
  },
  {
    tag: 'Courses',
    title: 'Exécution des missions et suivi des courses',
    body: 'Suivi de la préparation, de l’affectation, de la feuille de route et de la trace d’exécution sans sortir du même outil.',
  },
  {
    tag: 'Planning',
    title: 'Planning flotte, conducteurs et ressources',
    body: 'Arbitrage visuel des disponibilités, des contraintes matériel et des affectations à venir.',
  },
  {
    tag: 'Flotte',
    title: 'Camions, remorques et équipements reliés aux opérations',
    body: 'La flotte n’est pas gérée à part : elle alimente directement les missions, l’atelier et la conformité.',
  },
  {
    tag: 'RH & conformité',
    title: 'Dossiers chauffeurs, tachygraphe, amendes et suivi RH',
    body: 'Les volets administratifs, sociaux et réglementaires restent reliés au terrain et exploitables en contexte.',
  },
  {
    tag: 'Facturation',
    title: 'Du transport exécuté à la facturation',
    body: 'Les données opérationnelles alimentent les étapes comptables pour limiter les ressaisies et fiabiliser la marge.',
  },
  {
    tag: 'API',
    title: 'Portails, connecteurs et flux dédiés',
    body: 'Le socle laisse une place propre aux intégrations métier, aux espaces clients et aux extensions inter-ERP.',
  },
  {
    tag: 'Temps réel',
    title: 'Statuts et communication reliés à l’exécution',
    body: 'Le suivi des missions, de la messagerie et des priorités reste lisible sans sortir du même environnement.',
  },
]

export const productPillars: FeatureHighlight[] = [
  {
    tag: 'Temps réel',
    title: 'Statuts, alertes et arbitrages sans délai',
    body: 'L’état de l’exploitation est visible immédiatement : on ne court plus après l’information pour prendre une décision.',
  },
  {
    tag: 'Tout dans un seul outil',
    title: 'Pas de dispersion entre logiciels',
    body: 'Planning, documents, tachygraphe, facturation et communication restent dans le même système, reliés à l’exécution.',
  },
  {
    tag: 'ERP pour transporteurs',
    title: 'Conçu pour la réalité d’un transporteur routier',
    body: 'Les catégories, les vues et les workflows correspondent aux usages réels du transport : dispatch, groupage, rotations et conformité.',
  },
]

export const screenshotSlots: ScreenshotSlot[] = [
  {
    title: 'Cockpit exploitation live',
    caption: 'Lecture orientée opérations pour montrer priorités, statuts, alertes terrain et arbitrages immédiats sans sortir du même cockpit.',
    format: 'Frame produit 1600x1000',
    label: 'Exploitation',
    status: 'Module développé',
    highlights: ['Ordres de transport et priorités', 'Exceptions, retards et points bloquants', 'Lecture direction et exploitation'],
  },
  {
    title: 'Planning flotte, affectations et groupage',
    caption: 'Présentation du planning croisant courses, ressources, disponibilités et arbitrages de charge, avec marge pour les évolutions groupage et affrètement.',
    format: 'Frame produit 1600x1000',
    label: 'Planning',
    status: 'Développé, extensions en cours',
    highlights: ['Courses et feuilles de route', 'Affectations conducteurs et flotte', 'Groupage, charge et coordination'],
  },
  {
    title: 'Dossier chauffeur, RH et conformité',
    caption: 'Vue de synthèse pour relier documents, suivi RH, tachygraphe, amendes et contraintes réglementaires au terrain.',
    format: 'Frame produit 1600x1000',
    label: 'RH & conformité',
    status: 'Socle actif, enrichissements en cours',
    highlights: ['Profils et pièces justificatives', 'Suivi tachygraphe et amendes', 'Lien avec l’exécution terrain'],
  },
]

export const metrics = [
  { value: '12+', label: 'modules actifs', detail: 'dashboard, transports, planning, flotte, conformité, RH, documents...' },
  { value: '360°', label: 'couverture exploitation', detail: 'du dispatch à la livraison, en passant par la conformité et la paie' },
  { value: 'Temps réel', label: 'suivi des missions', detail: 'statuts, priorités, alertes et coordination conducteurs en direct' },
]

export const workflowSteps: WorkflowStep[] = [
  {
    step: '01',
    title: 'Un ordre de transport entre dans le système',
    body: 'Saisie ou import, l’OT alimente immédiatement le cockpit exploitation : statut, conducteur, remorque, client et délai. Tout le monde voit la même chose au même moment.',
    timing: 'De la création à la prise en charge',
  },
  {
    step: '02',
    title: 'L’exploitation arbitre, affecte et suit',
    body: 'Planning, groupage, disponibilités et feuille de route sont gérés depuis une vue centrale. Les alertes remontent automatiquement : dépassement HSE, CT, retard, alerte atelier.',
    timing: 'Arbitrage et coordination temps réel',
  },
  {
    step: '03',
    title: 'La course est livrée, la trace reste',
    body: 'Confirmation de livraison, documents associés, paie conducteur, facturation client : tout est capturé dans le même système sans ressaisie manuelle.',
    timing: 'De l’exécution à la comptabilisation',
  },
]

export const valuePoints: FeatureHighlight[] = [
  {
    tag: 'Exploitation',
    title: 'Un cockpit unique pour toute l’activité du jour',
    body: 'Priorités, statuts, alertes et décisions d’exploitation regroupées dans une seule vue lisible, accessible à l’exploitant comme à la direction.',
  },
  {
    tag: 'Planning',
    title: 'Planning flotte et conducteurs sans jongler entre outils',
    body: 'Disponibilités, contraintes HSE, groupage, affectations et feuilles de route dans le même espace que le cockpit exploitation.',
  },
  {
    tag: 'Conformite',
    title: 'RH, tachygraphe et documents restés dans le système',
    body: 'Profils conducteurs, suivi des heures, amendes, pièces justificatives et alertes réglementaires ne sortent pas vers un autre logiciel.',
  },
  {
    tag: 'Traçabilité',
    title: 'La trace de chaque mission reste exploitable',
    body: 'Chaque course laisse une empreinte : exécution, photo de livraison, incident, commentaire et lien vers le dossier conducteur.',
  },
  {
    tag: 'Finance',
    title: 'Du transport exécuté à la facturation sans ressaisie',
    body: 'Les données opérationnelles alimentent la facturation client et la paie conducteur pour limiter les doubles saisies et fiabiliser la marge réelle.',
  },
  {
    tag: 'Extensions',
    title: 'Portail client, API et interconnexions déjà prévues',
    body: 'Espace client, espace affréteur, flux dédiés et connectivité inter-ERP font partie de la feuille de route. Le socle est conçu pour les accueillir.',
  },
]

export const platformModules: PlatformModule[] = [
  {
    title: 'Cockpit exploitation',
    body: 'Transports en cours, statuts, priorités et alertes dans une lecture unique. L’exploitant voit ce qui avance, ce qui bloque et ce qui attend.',
    meta: 'Socle actif',
  },
  {
    title: 'Planning & affectations',
    body: 'Planning flotte, disponibilités conducteurs, groupage et feuilles de route. La charge réelle est visible avant de valider chaque mission.',
    meta: 'Socle actif',
  },
  {
    title: 'RH, tachygraphe et documents',
    body: 'Profils, heures, alertes HSE, visite médicale, amendes et coffre numérique. Tout reste dans le logiciel sans sortir vers un outil annexe.',
    meta: 'En cours d’enrichissement',
  },
  {
    title: 'Facturation, portail et API',
    body: 'Du transport exécuté à la facturation client sans ressaisie. L’espace client et les interconnexions externes font partie de la feuille de route.',
    meta: 'En cours de développement',
  },
]

export const roleViews: FeatureHighlight[] = [
  {
    tag: 'Exploitant',
    title: 'Priorites, statuts et decisions en direct',
    body: 'Le cockpit centralise les transports en cours, les points bloquants, les alertes terrain et les arbitrages immédiats. L’exploitant ne cherche plus : il voit, il décide.',
  },
  {
    tag: 'Direction',
    title: 'Vue d’ensemble sans attendre un rapport',
    body: 'Charge du jour, taux de livraison, alertes flotte et avancement financier sont lisibles depuis le même système, en temps réel, sans export manuel.',
  },
  {
    tag: 'Chauffeurs & RH',
    title: 'Profils, conformité et terrain dans le même outil',
    body: 'Feuilles de route, documents, heures, tachygraphe et amendes restent liés à l’exécution. Pas de double saisie entre le terrain et le bureau.',
  },
]

export const contactPoints = [
  'Présenter le logiciel en contexte sur vos données',
  'Cadrer le périmètre : exploitation, planning, RH, conformité ou facturation',
  'Identifier les modules actifs qui couvrent vos enjeux immédiats',
  'Évaluer les extensions ou connexions spécifiques à votre organisation',
]

export const teamPromises: FeatureHighlight[] = [
  {
    tag: 'Équipe à l’écoute',
    title: 'Un interlocuteur qui comprend l’exploitation avant de parler habillage',
    body: 'Les demandes sont traitées à partir des réalités terrain : charge d’exploitation, organisation planning, documents, RH, conformité et circulation d’information.',
  },
  {
    tag: 'Développement continu',
    title: 'Le logiciel évolue en continu au lieu de figer un périmètre trop tôt',
    body: 'Le site public assume cette logique : socle déjà solide, modules en cours, et feuille de route claire pour les besoins qui arrivent ensuite.',
  },
  {
    tag: 'Fonctionnalités sur demande',
    title: 'Des ajouts métier peuvent être cadrés sans casser le cœur ERP',
    body: 'La base a été pensée pour intégrer de nouveaux besoins : portail, connectivité, automatisations, vues affréteur, groupage avancé ou workflows internes spécifiques.',
  },
]

export const promoReels: PromoReel[] = [
  {
    title: 'Matinée exploitation en 45 secondes',
    audience: 'Exploitants et direction',
    duration: '00:45',
    summary: 'Un reel court qui montre la prise de poste, les priorités visibles, les exceptions qui remontent et les décisions immédiates dans le cockpit.',
    outcome: 'Objectif : faire sentir la valeur du pilotage temps réel dès la première lecture.',
    chapters: ['Ouverture du cockpit exploitation', 'Lecture des statuts et alertes', 'Priorisation des actions terrain'],
  },
  {
    title: 'Du planning à la feuille de route',
    audience: 'Planning, exploitation, affretement',
    duration: '01:00',
    summary: 'Ce reel raconte le passage entre charge à couvrir, affectations, coordination flotte et construction de la feuille de route.',
    outcome: 'Objectif : montrer que le planning n’est pas isolé du reste du logiciel.',
    chapters: ['Vue planning et disponibilités', 'Affectations ressources', 'Validation feuille de route'],
  },
  {
    title: 'Dossier chauffeur, conformité et preuves',
    audience: 'RH, conformite, direction',
    duration: '00:50',
    summary: 'Un format plus administratif pour montrer que NEXORA Truck relie aussi documents, suivi RH et cadre réglementaire à l’exécution.',
    outcome: 'Objectif : sortir du simple discours dispatch et faire comprendre la profondeur ERP.',
    chapters: ['Fiche chauffeur et pièces', 'Tachygraphe, amendes, alertes', 'Coffre et suivi documentaire'],
  },
]

export const featureStages: FeatureStage[] = [
  {
    title: 'Déjà développé',
    eyebrow: 'Socle opérationnel',
    body: 'Les briques suivantes existent déjà dans le produit et structurent la valeur immédiate du logiciel.',
    items: ['Dashboard', 'Tasks', 'Transports', 'Planning', 'Feuille de route', 'Map live', 'Chauffeurs', 'Remorques', 'Maintenance', 'Entretiens RH', 'Demandes clients', 'Login, auth et rôles', 'Paramètres'],
  },
  {
    title: 'En cours de développement',
    eyebrow: 'Extensions actives',
    body: 'Ces modules avancent déjà et font partie du discours produit car ils prolongent directement le socle existant.',
    items: ['Clients', 'Facturation', 'Paie et RH', 'Frais', 'Prospection', 'Tachygraphe', 'Amendes', 'Espace client', 'Espace affréteur', 'Tchat et communication', 'Coffre numérique', 'Utilisateurs', 'Workflow démo et qualification commerciale'],
  },
  {
    title: 'Futur et demandes avancées',
    eyebrow: 'Feuille de route',
    body: 'Les sujets suivants sont identifiés dans le projet pour pousser plus loin le logiciel ou répondre à des besoins sur demande.',
    items: ['Connectivité et discussion inter-ERP', 'Planning affréteur dédié', 'Groupage multi-courses figeable et déliable', 'Mail et messagerie persistants', 'Assistant IA', 'Notifications push intelligentes', 'Cockpit KPI visuel', 'Application mobile conducteur', 'Détection d’e-mails transport', 'Parsing intelligent des demandes', 'Création de course depuis e-mail avec validation', 'API bourses de fret', 'Tracking temps réel via APIs externes'],
  },
]
