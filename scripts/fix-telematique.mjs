import { readFileSync, writeFileSync, readdirSync } from 'fs'

const dir = 'c:/Users/Florent/erp2/erp2/src/site/pages'
const files = readdirSync(dir)
const name = files.find(f => f.includes('matique') && f.endsWith('.tsx'))
const fullPath = dir + '/' + name

console.log('File:', name)

let c = readFileSync(fullPath, 'utf8')

// Fix h2 -> h3 in solutionPillars mapping
c = c.replace(
  '<h2 className="text-lg font-semibold tracking-tight text-slate-950">{item.title}</h2>',
  '<h3 className="text-lg font-semibold tracking-tight text-slate-950">{item.title}</h3>'
)

// Fix meta title
c = c.replace(
  "title: 'Télématique transport : suivi GPS et données terrain intégrés',",
  "title: 'Télématique transport : GPS intégré ERP/TMS, alertes et kilométrage',"
)

// Fix meta description
c = c.replace(
  `description:
      'Télématique transport NEXORA Truck : géolocalisation en temps réel, alertes comportement conduite, kilométrage automatique et intégration ERP/TMS.',`,
  `description:
      'Télématique transport NEXORA Truck : géolocalisation native dans le TMS, kilométrage automatique par mission, alertes conduite contextualisées et rapprochement OT sans ressaisie.',`
)

// Fix H1
c = c.replace(
  'Télématique transport : suivi GPS et données terrain intégrés',
  'Télématique transport : GPS, kilométrage automatique et alertes dans votre exploitation'
)

// Fix hero paragraph
c = c.replace(
  `          Une solution de télématique transport isolée produit des données sans les relier à l'exploitation. Les équipes
          consultent deux outils différents et recopient les informations utiles à la main. Quand la télématique est intégrée
          à l'ERP et au TMS, les données GPS deviennent immédiatement actionnables pour le planning, la facturation et le
          suivi de flotte.`,
  `          Un boîtier GPS qui ne parle pas à votre TMS produit des données que personne ne consulte en temps réel. NEXORA Truck intègre la télématique transport nativement dans le cockpit exploitation : position des camions, kilométrage par mission et alertes conduite consultables depuis le même écran que le planning et les ordres de transport, sans outil satellite.`
)

// Rewrite problems
c = c.replace(
  `const problems = [
  'Position des véhicules inconnue en temps réel, relances conducteurs chronophages.',
  'Données terrain non remontées automatiquement : kilométrage, arrêts, incidents.',
  "Absence d'alertes sur les comportements de conduite ou les déviations de trajet.",
  'Rapprochements manuels entre données GPS et ordres de transport.',
]`,
  `const problems = [
  "Savoir où est un camion nécessite un appel téléphonique : position réelle inconnue, réponse approximative au client.",
  "Le kilométrage réel diffère du kilométrage facturé faute de relevé automatique : litiges et corrections en cascade.",
  "Les alertes comportement de conduite arrivent dans un outil GPS tiers et ne remontent jamais dans le planning.",
  "Chaque réconciliation entre données GPS et ordres de transport demande 20 à 40 minutes de rapprochement manuel.",
]`
)

// Rewrite solutionPillars
c = c.replace(
  `const solutionPillars = [
  {
    title: 'Géolocalisation en temps réel',
    body: "Position et statut de chaque véhicule visibles directement dans l'exploitation, sans outil tiers.",
  },
  {
    title: 'Données terrain exploitables',
    body: "Kilométrage, durée de trajet, arrêts non planifiés et incidents remontés automatiquement dans l'ERP.",
  },
  {
    title: 'Alertes automatisées',
    body: "Déviations de trajet, vitesse excessive, arrêts prolongés : l'équipe est informée avant que le problème ne s'aggrave.",
  },
  {
    title: 'Intégration TMS et gestion flotte',
    body: 'Les données télématiques alimentent directement le planning, la facturation kilométrique et le suivi de la flotte.',
  },
]`,
  `const solutionPillars = [
  {
    title: 'Géolocalisation native dans le TMS',
    body: "Position et ETA de chaque véhicule affichés directement sur le cockpit exploitation — sans basculer vers un outil GPS tiers.",
  },
  {
    title: 'Kilométrage et TCO automatiques',
    body: "Kilométrage réel relevé par mission pour une facturation précise, un suivi du coût total de possession et le déclenchement automatique des révisions.",
  },
  {
    title: 'Alertes conduite contextualisées',
    body: "Freinage brusque, excès de vitesse ou arrêt non planifié : l'alerte apparaît dans le contexte de la mission concernée, pas dans un tableau de bord isolé.",
  },
  {
    title: 'Rapprochement automatique OT / GPS',
    body: "Les données terrain se lient à l'ordre de transport correspondant sans aucune ressaisie. La preuve de passage horodatée est disponible immédiatement.",
  },
]`
)

// Rewrite keyFeatures
c = c.replace(
  `const keyFeatures = [
  { title: 'Suivi GPS temps réel', body: 'Carte live avec position, vitesse et statut de chaque poids lourd.' },
  { title: 'Kilométrage automatique', body: 'Relevé en continu pour facturation précise et suivi du TCO flotte.' },
  { title: 'Alertes comportement conduite', body: 'Notifications sur freinages brusques, excès de vitesse et conduite hors plage.' },
  { title: "Détection d'arrêts non planifiés", body: "Signalement immédiat des pauses non prévues pour réorganiser l'exploitation." },
  { title: 'Rapprochement automatique OT', body: "Les données GPS se lient à l'ordre de transport sans ressaisie manuelle." },
]`,
  `const keyFeatures = [
  { title: 'Carte live multi-véhicules', body: "Position, vitesse, statut et mission en cours de chaque poids lourd sur une carte intégrée au TMS — zéro bascule d'outil." },
  { title: 'Kilométrage mission automatique', body: "Relevé en continu par OT pour facturation précise au réel, suivi TCO flotte et déclenchement automatique des révisions." },
  { title: 'Alertes conduite contextualisées', body: "Freinage brusque, excès de vitesse, conduite hors plage : notifications rattachées à la mission et au conducteur concernés." },
  { title: 'Détection arrêts non planifiés', body: "Pause non prévue signalée en temps réel pour réorganiser l'exploitation et informer le client sans délai." },
  { title: 'Rapprochement automatique OT / GPS', body: "Données GPS liées à l'ordre de transport sans saisie manuelle. Preuve de passage horodatée disponible instantanément." },
]`
)

writeFileSync(fullPath, c, 'utf8')
console.log('Done — file written')
