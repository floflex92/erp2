import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '../dist')
const distIndexPath = resolve(distDir, 'index.html')
const sitemapPath = resolve(distDir, 'sitemap.xml')

if (!existsSync(distIndexPath)) {
  console.error('[seo-prerender] dist/index.html introuvable. Lancez d\'abord vite build.')
  process.exit(1)
}

const BASE_URL = 'https://nexora-truck.fr'
const DEFAULT_OG_IMAGE = `${BASE_URL}/site/logo/brand/nexora-logo-dark.png`
const DEFAULT_META = {
  title: 'ERP transport | NEXORA Truck',
  description:
    'NEXORA Truck, ERP transport et logiciel TMS pour piloter exploitation, planning, flotte, conformite et facturation.',
  keywords:
    'ERP transport, logiciel transport, TMS transport, gestion flotte, planning transport, NEXORA Truck',
}

const ARTICLE_ROUTE_META = {
  '/articles/comment-organiser-un-planning-transport-efficacement': {
    title: 'Planning transport efficace : methode terrain | NEXORA Truck',
    description:
      'Methode concrete pour structurer un planning transport, absorber les urgences et garder une exploitation lisible au quotidien.',
    keywords: 'planning transport, organisation exploitation, optimisation planning transport',
  },
  '/articles/erp-transport-pourquoi-abandonner-excel': {
    title: 'ERP transport : pourquoi abandonner Excel | NEXORA Truck',
    description:
      'Pourquoi Excel atteint ses limites dans le transport routier et ce qu un ERP transport change sur le terrain.',
    keywords: 'ERP transport, excel transport, digitalisation transport routier',
  },
  '/articles/tms-transport-definition-simple-et-complete': {
    title: 'TMS transport : definition simple et complete | NEXORA Truck',
    description:
      'Definition claire du TMS transport, de son role operationnel et de sa difference avec un ERP transport.',
    keywords: 'TMS transport, definition TMS, ERP vs TMS',
  },
  '/articles/gestion-de-flotte-poids-lourd-erreurs-courantes': {
    title: 'Gestion flotte poids lourd : erreurs a eviter | NEXORA Truck',
    description:
      'Les erreurs frequentes de gestion de flotte poids lourd et les bonnes pratiques pour fiabiliser l exploitation.',
    keywords: 'gestion flotte poids lourd, erreurs flotte, maintenance transport',
  },
  '/articles/comment-ameliorer-la-rentabilite-d-une-entreprise-de-transport': {
    title: 'Rentabilite transport : methodes concretes | NEXORA Truck',
    description:
      'Les leviers concrets pour ameliorer la rentabilite d une entreprise de transport sans alourdir l organisation.',
    keywords: 'rentabilite transport, marge transport, optimisation couts transport',
  },
  '/articles/reduire-les-kilometres-a-vide-dans-le-transport-routier': {
    title: 'Reduire les kilometres a vide : guide transport | NEXORA Truck',
    description:
      'Methodes operationnelles pour reduire les kilometres a vide et ameliorer la marge du transport routier.',
    keywords: 'kilometres a vide, optimisation transport routier, marge transport',
  },
  '/articles/otif-transport-comment-fiabiliser-la-livraison-client': {
    title: 'OTIF transport : fiabiliser la livraison client | NEXORA Truck',
    description:
      'Guide pratique pour ameliorer l OTIF transport avec un suivi mission fiable et des arbitrages plus rapides.',
    keywords: 'OTIF transport, livraison client, suivi operations transport',
  },
  '/articles/transport-routier-systeme-coherent': {
    title: 'Transport routier : construire un systeme coherent | NEXORA Truck',
    description:
      'Pourquoi les transporteurs ont besoin d un systeme coherent pour connecter planning, flotte et execution.',
    keywords: 'transport routier, systeme coherent, ERP transport',
  },
  '/articles/facturation-transport-automatiser': {
    title: 'Facturation transport : automatiser sans perdre le controle | NEXORA Truck',
    description:
      'Comment automatiser la facturation transport de bout en bout tout en gardant rigueur et tracabilite.',
    keywords: 'facturation transport, automatisation facture, ERP transport finance',
  },
  '/articles/affretement-transport-sous-traitance': {
    title: 'Affretement transport : reprendre le controle | NEXORA Truck',
    description:
      'Comment integrer la sous-traitance dans le TMS pour mieux piloter l affretement transport.',
    keywords: 'affretement transport, sous-traitance transport, TMS affretement',
  },
  '/articles/couts-transport-routier-reduire-optimiser': {
    title: 'Couts transport routier : 10 leviers utiles | NEXORA Truck',
    description:
      '10 leviers concrets pour reduire les couts du transport routier sans degrader la qualite de service.',
    keywords: 'couts transport routier, reduction couts transport, optimisation exploitation',
  },
  '/articles/conformite-transport-routier-reglementation': {
    title: 'Conformite transport routier : 5 obligations cles | NEXORA Truck',
    description:
      'Les obligations reglementaires transport routier que les PME sous-estiment et comment s y conformer.',
    keywords: 'conformite transport routier, reglementation transport, obligations PME transport',
  },
  '/articles/digitalisation-transport-routier-2026': {
    title: 'Digitalisation transport routier 2026 : etat des lieux | NEXORA Truck',
    description:
      'Etat des lieux de la digitalisation des PME transport en 2026 : outils adoptes, freins persistants, prochaines etapes.',
    keywords: 'digitalisation transport routier 2026, PME transport, transformation digitale transport',
  },
}

const ROUTE_META = {
  '/': {
    title: 'Le systeme d\'exploitation du transport routier | NEXORA Truck',
    description:
      'ERP transport et TMS transport tout-en-un pour exploitation, gestion flotte, optimisation transport, suivi conducteur et facturation sans double saisie.',
    keywords:
      'ERP transport, TMS transport, gestion flotte, optimisation transport, suivi conducteur, logiciel transport, planning transport',
  },
  '/fonctionnalites': {
    title: 'Fonctionnalites ERP transport : planning et flotte | NEXORA Truck',
    description:
      'Decouvrez les fonctionnalites de l\'ERP transport NEXORA Truck : planning intelligent, gestion flotte, suivi conducteurs, facturation transport, telematique, IA et API.',
    keywords:
      'fonctionnalites ERP transport, planning transport, gestion flotte, facturation transport, TMS transport',
  },
  '/toutes-les-fonctionnalites': {
    title: 'Toutes les fonctionnalites ERP transport NEXORA | NEXORA Truck',
    description:
      'Vue complete des fonctionnalites NEXORA Truck : developpe, en cours de developpement et features a venir.',
    keywords: 'roadmap ERP transport, fonctionnalites TMS transport, evolution produit transport',
  },
  '/solution': {
    title: 'Solution ERP transport tout-en-un | NEXORA Truck',
    description:
      'Une solution ERP transport qui unifie exploitation, planning, flotte, conducteurs et facturation dans un seul outil.',
    keywords: 'solution ERP transport, logiciel exploitation transport, TMS transport',
  },
  '/versions': {
    title: 'Historique des versions ERP transport NEXORA | NEXORA Truck',
    description:
      'Consultez l\'historique des versions NEXORA Truck avec les ajouts, modifications et corrections de chaque release.',
    keywords: 'versions ERP transport, changelog NEXORA Truck, releases produit',
  },
  '/erp-transport': {
    title: 'ERP transport : plateforme ERP + TMS + flotte | NEXORA Truck',
    description:
      'NEXORA Truck : ERP transport tout-en-un qui relie TMS, flotte, conducteurs, telematique et IA dans une seule interface.',
    keywords:
      'ERP transport, ERP transport routier, logiciel transport routier, TMS transport, gestion flotte',
  },
  '/tms-transport': {
    title: 'TMS transport : pilotage dispatch et facturation | NEXORA Truck',
    description:
      'TMS transport NEXORA Truck : pilotez chaque ordre de mission du dispatch a la facturation avec statuts en temps reel.',
    keywords: 'TMS transport, logiciel TMS, dispatch transport, ordres de transport, ERP transport',
  },
  '/logiciel-transport': {
    title: 'Logiciel transport : choisir un outil operationnel | NEXORA Truck',
    description:
      'Comment choisir un logiciel transport vraiment utile pour l\'exploitation, le planning, la flotte et la facturation.',
    keywords: 'logiciel transport, ERP transport, planning transport, gestion flotte',
  },
  '/logiciel-gestion-flotte-camion': {
    title: 'Logiciel gestion flotte camion | NEXORA Truck',
    description:
      'Gestion flotte camion reliee a l\'exploitation : disponibilite, maintenance, conformite et suivi terrain.',
    keywords: 'gestion flotte camion, logiciel flotte poids lourd, maintenance transport',
  },
  '/telematique-transport': {
    title: 'Telematique transport : GPS et donnees terrain | NEXORA Truck',
    description:
      'Telematique transport connectee a l\'ERP : geolocalisation, alertes conduite, kilometrage et suivi en temps reel.',
    keywords: 'telematique transport, gps poids lourd, suivi flotte transport',
  },
  '/chronotachygraphe': {
    title: 'Chronotachygraphe : conformite et suivi conduite | NEXORA Truck',
    description:
      'Chronotachygraphe integre a l\'ERP transport pour suivre les temps de conduite et la conformite reglementaire.',
    keywords: 'chronotachygraphe, temps de conduite, conformite transport routier',
  },
  '/ia-transport': {
    title: 'IA transport : optimisation operationnelle | NEXORA Truck',
    description:
      'IA transport pour assister la planification, detecter les anomalies et optimiser les decisions d\'exploitation.',
    keywords: 'IA transport, optimisation transport, intelligence artificielle logistique',
  },
  '/facturation-transport': {
    title: 'Facturation transport automatisee | NEXORA Truck',
    description:
      'Facturation transport sans ressaisie : generation de factures depuis les ordres de transport et suivi des reglements.',
    keywords: 'facturation transport, factures OT, ERP transport finance',
  },
  '/affretement-transport': {
    title: 'Affretement transport et sous-traitance | NEXORA Truck',
    description:
      'Pilotez l\'affretement transport avec tracabilite, coordination sous-traitants et suivi operationnel integre.',
    keywords: 'affretement transport, sous-traitance transport, portail affreteur',
  },
  '/articles': {
    title: 'Blog transport : ERP, TMS et gestion flotte | NEXORA Truck',
    description:
      'Articles metier transport sur le planning, la gestion flotte, le TMS transport et la rentabilite des operations.',
    keywords: 'blog transport, article ERP transport, conseils TMS transport, gestion flotte',
  },
  '/demonstration': {
    title: 'Demonstration ERP transport : acces gratuit | NEXORA Truck',
    description:
      'Demandez une demonstration NEXORA Truck et visualisez un ERP transport complet adapte a vos operations.',
    keywords: 'demonstration ERP transport, demo TMS transport, essai ERP',
  },
  '/contact': {
    title: 'Contact NEXORA Truck | ERP transport routier',
    description: 'Parlons de votre projet ERP transport : demonstration, cadrage besoin et feuille de route de deploiement.',
    keywords: 'contact ERP transport, demo TMS, projet digitalisation transport',
  },
  '/a-propos': {
    title: 'A propos de NEXORA Truck | ERP transport routier',
    description:
      'Decouvrez la vision NEXORA Truck : un ERP transport concu pour l\'exploitation terrain et la performance operationnelle.',
    keywords: 'a propos NEXORA Truck, editeur ERP transport, logiciel transport routier',
  },
  '/integrations': {
    title: 'Integrations API ERP transport | NEXORA Truck',
    description:
      'Integrations API pour connecter telematique, tachygraphe, portails et ecosysteme transport a NEXORA Truck.',
    keywords: 'integrations API transport, interconnexion ERP TMS, API telematique',
  },
}

function toRoutePath(url) {
  try {
    const parsed = new URL(url)
    return parsed.pathname === '' ? '/' : parsed.pathname
  } catch {
    return null
  }
}

function readRoutesFromSitemap() {
  if (!existsSync(sitemapPath)) return ['/']
  const xml = readFileSync(sitemapPath, 'utf8')
  const routes = new Set(['/'])
  const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g)
  for (const m of matches) {
    const route = toRoutePath(m[1])
    if (!route) continue
    routes.add(route)
  }
  return [...routes]
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function upsertTag(html, pattern, buildTag) {
  if (pattern.test(html)) {
    return html.replace(pattern, buildTag)
  }
  return html.replace('</head>', `  ${buildTag}\n  </head>`)
}

function applySeoMeta(template, route, meta) {
  const canonical = `${BASE_URL}${route}`

  let html = template
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`)

  html = upsertTag(
    html,
    /<meta[^>]*name="description"[^>]*>/i,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
  )
  html = upsertTag(
    html,
    /<meta[^>]*name="keywords"[^>]*>/i,
    `<meta name="keywords" content="${escapeHtml(meta.keywords)}" />`,
  )
  html = upsertTag(
    html,
    /<link[^>]*rel="canonical"[^>]*>/i,
    `<link rel="canonical" href="${canonical}" />`,
  )

  html = upsertTag(
    html,
    /<meta[^>]*property="og:title"[^>]*>/i,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
  )
  html = upsertTag(
    html,
    /<meta[^>]*property="og:description"[^>]*>/i,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
  )
  html = upsertTag(
    html,
    /<meta[^>]*property="og:url"[^>]*>/i,
    `<meta property="og:url" content="${canonical}" />`,
  )
  html = upsertTag(
    html,
    /<meta[^>]*property="og:image"[^>]*>/i,
    `<meta property="og:image" content="${DEFAULT_OG_IMAGE}" />`,
  )

  html = upsertTag(
    html,
    /<meta[^>]*name="twitter:title"[^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
  )
  html = upsertTag(
    html,
    /<meta[^>]*name="twitter:description"[^>]*>/i,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
  )
  html = upsertTag(
    html,
    /<meta[^>]*name="twitter:image"[^>]*>/i,
    `<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />`,
  )

  return html
}

function fallbackMeta(route) {
  if (route === '/') return DEFAULT_META
  const slug = route
    .replace(/^\//, '')
    .replaceAll('/', ' ')
    .replaceAll('-', ' ')
    .trim()
  const pretty = slug
    ? slug.charAt(0).toUpperCase() + slug.slice(1)
    : 'ERP transport'

  return {
    title: `${pretty} | NEXORA Truck`,
    description: DEFAULT_META.description,
    keywords: DEFAULT_META.keywords,
  }
}

const template = readFileSync(distIndexPath, 'utf8')
const routes = readRoutesFromSitemap()
let generatedCount = 0

for (const route of routes) {
  const meta = ROUTE_META[route] ?? ARTICLE_ROUTE_META[route] ?? fallbackMeta(route)
  const html = applySeoMeta(template, route, meta)
  const outputPath =
    route === '/'
      ? distIndexPath
      : resolve(distDir, route.replace(/^\//, ''), 'index.html')

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, html, 'utf8')
  generatedCount += 1
}

console.log(`[seo-prerender] HTML SEO statique genere pour ${generatedCount} routes`)