import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '../dist')
const distSsrDir = resolve(__dirname, '../dist-ssr')
const distIndexPath = resolve(distDir, 'index.html')
const sitemapPath = resolve(distDir, 'sitemap.xml')
const distServerEntryPath = resolve(distSsrDir, 'entry-server.js')

if (!existsSync(distIndexPath)) {
  console.error('[seo-prerender] dist/index.html introuvable. Lancez d\'abord vite build.')
  process.exit(1)
}

if (!existsSync(distServerEntryPath)) {
  console.error('[seo-prerender] bundle SSR introuvable. Lancez d\'abord le build SSR.')
  process.exit(1)
}

const BASE_URL = 'https://nexora-truck.fr'
const DEFAULT_OG_IMAGE = `${BASE_URL}/site/logo/brand/nexora-logo-dark.png`
const DEFAULT_META = {
  title: 'ERP transport | NEXORA Truck',
  description:
    'NEXORA Truck, ERP transport et logiciel TMS pour piloter exploitation, planning, flotte, conformité et facturation.',
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
    title: 'Kilometres a vide transport | NEXORA Truck',
    description:
      'Methodes operationnelles pour reduire les kilometres a vide et ameliorer la marge du transport routier.',
    keywords: 'kilometres a vide, optimisation transport routier, marge transport',
  },
  '/articles/otif-transport-comment-fiabiliser-la-livraison-client': {
    title: 'OTIF transport et livraison client | NEXORA Truck',
    description:
      'Guide pratique pour ameliorer l OTIF transport avec un suivi mission fiable et des arbitrages plus rapides.',
    keywords: 'OTIF transport, livraison client, suivi operations transport',
  },
  '/articles/transport-routier-systeme-coherent': {
    title: 'Transport routier : systeme coherent | NEXORA Truck',
    description:
      'Pourquoi les transporteurs ont besoin d un systeme coherent pour connecter planning, flotte et execution.',
    keywords: 'transport routier, systeme coherent, ERP transport',
  },
  '/articles/facturation-transport-automatiser': {
    title: 'Facturation transport automatisee | NEXORA Truck',
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
    title: 'Conformite transport routier PME | NEXORA Truck',
    description:
      'Les obligations reglementaires transport routier que les PME sous-estiment et comment s y conformer.',
    keywords: 'conformite transport routier, reglementation transport, obligations PME transport',
  },
  '/articles/digitalisation-transport-routier-2026': {
    title: 'Digitalisation transport 2026 | NEXORA Truck',
    description:
      'Etat des lieux de la digitalisation des PME transport en 2026 : outils adoptes, freins persistants, prochaines etapes.',
    keywords: 'digitalisation transport routier 2026, PME transport, transformation digitale transport',
  },
}

const ROUTE_META = {
  '/': {
    title: 'ERP transport routier : planning et flotte | NEXORA Truck',
    description:
      'ERP transport et TMS transport tout-en-un pour exploitation, gestion flotte, optimisation transport, suivi conducteur et facturation sans double saisie.',
    keywords:
      'ERP transport, TMS transport, gestion flotte, optimisation transport, suivi conducteur, logiciel transport, planning transport',
  },
  '/fonctionnalites': {
    title: 'Fonctionnalités ERP transport | NEXORA Truck',
    description:
      'Fonctionnalités ERP transport NEXORA Truck : planning, flotte, conducteurs, facturation, télématique, IA et API.',
    keywords:
      'fonctionnalités ERP transport, planning transport, gestion flotte, facturation transport, TMS transport',
  },
  '/toutes-les-fonctionnalites': {
    title: 'Fonctionnalites ERP transport NEXORA | NEXORA Truck',
    description:
      'Vue complète des fonctionnalités NEXORA Truck : développé, en cours de développement et fonctionnalités à venir.',
    keywords: 'roadmap ERP transport, fonctionnalités TMS transport, évolution produit transport',
  },
  '/solution': {
    title: 'Solution ERP transport tout-en-un | NEXORA Truck',
    description:
      'Une solution ERP transport qui unifie exploitation, planning, flotte, conducteurs et facturation dans un seul outil.',
    keywords: 'solution ERP transport, logiciel exploitation transport, TMS transport',
  },
  '/planning-intelligent': {
    title: 'Planning transport intelligent | NEXORA Truck',
    description:
      'Planning intelligent NEXORA Truck : affectations dynamiques, groupage maîtrise et pilotage en temps réel des opérations transport.',
    keywords: 'planning transport intelligent, optimisation tournees transport, planning chauffeurs camions, groupage transport',
  },
  '/secteur-transport': {
    title: 'Secteur transport routier | NEXORA Truck',
    description:
      'Analyse du secteur transport routier francophone : défis, pression opérationnelle et modernisation par ERP transport.',
    keywords: 'secteur transport routier, marche transport francophone, transformation digitale transport, ERP transport',
  },
  '/plateforme-erp-transport': {
    title: 'Plateforme ERP transport pour PME | NEXORA Truck',
    description:
      'Plateforme ERP transport NEXORA Truck pour centraliser exploitation, planning, flotte, conformité, documents et facturation dans un seul système.',
    keywords:
      'plateforme ERP transport, logiciel exploitation transport, ERP flotte transport, planning transport routier',
  },
  '/erp-transport-tms': {
    title: 'ERP transport TMS pour PME | NEXORA Truck',
    description:
      'Guide ERP transport TMS pour relier dispatch, planning, flotte, conducteurs et facturation dans un système PME transport.',
    keywords:
      'ERP transport TMS, guide ERP transport, TMS pour PME transport, logiciel exploitation transport, ERP TMS transport routier',
  },
  '/tarifs-erp-transport': {
    title: 'Tarifs ERP transport : comprendre le prix | NEXORA Truck',
    description:
      'Tarifs ERP transport NEXORA Truck : comprendre comment se construit le prix selon la flotte, les modules, les intégrations et le niveau d accompagnement.',
    keywords:
      'tarifs ERP transport, prix logiciel transport, prix TMS transport, cout ERP transport routier, devis ERP transport',
  },
  '/comparatif-erp-transport': {
    title: 'Comparatif ERP transport 2026 | NEXORA Truck',
    description:
      'Comparatif ERP transport pour PME et TPE transport : quoi comparer entre ERP généraliste, TMS isolé et plateforme métier orientée exploitation.',
    keywords:
      'comparatif ERP transport, comparer logiciel transport, ERP transport vs TMS, meilleur ERP transport routier, comparatif TMS transport',
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
      'NEXORA Truck : ERP transport tout-en-un qui relie TMS, flotte, conducteurs, télématique et IA dans une seule interface.',
    keywords:
      'ERP transport, ERP transport routier, logiciel transport routier, TMS transport, gestion flotte',
  },
  '/tms-transport': {
    title: 'TMS transport dispatch et facturation | NEXORA Truck',
    description:
      'TMS transport NEXORA Truck : pilotez chaque ordre de mission du dispatch a la facturation avec statuts en temps reel.',
    keywords: 'TMS transport, logiciel TMS, dispatch transport, ordres de transport, ERP transport',
  },
  '/logiciel-transport': {
    title: 'Logiciel transport opérationnel | NEXORA Truck',
    description:
      'Comment choisir un logiciel transport vraiment utile pour l\'exploitation, le planning, la flotte et la facturation.',
    keywords: 'logiciel transport, ERP transport, planning transport, gestion flotte',
  },
  '/logiciel-gestion-flotte-camion': {
    title: 'Logiciel gestion flotte camion | NEXORA Truck',
    description:
      'Gestion flotte camion reliée à l\'exploitation : disponibilité, maintenance, conformité et suivi terrain.',
    keywords: 'gestion flotte camion, logiciel flotte poids lourd, maintenance transport',
  },
  '/telematique-transport': {
    title: 'Télématique transport GPS | NEXORA Truck',
    description:
      'Télématique transport connectée à l\'ERP : géolocalisation, alertes conduite, kilométrage et suivi en temps réel.',
    keywords: 'télématique transport, gps poids lourd, suivi flotte transport',
  },
  '/chronotachygraphe': {
    title: 'Chronotachygraphe conformité | NEXORA Truck',
    description:
      'Chronotachygraphe intégré à l\'ERP transport pour suivre les temps de conduite et la conformité réglementaire.',
    keywords: 'chronotachygraphe, temps de conduite, conformité transport routier',
  },
  '/ia-transport': {
    title: 'IA transport : optimisation opérationnelle | NEXORA Truck',
    description:
      'IA transport pour assister la planification, detecter les anomalies et optimiser les decisions d\'exploitation.',
    keywords: 'IA transport, optimisation transport, intelligence artificielle logistique',
  },
  '/facturation-transport': {
    title: 'Facturation transport automatisée | NEXORA Truck',
    description:
      'Facturation transport sans ressaisie : génération de factures depuis les ordres de transport et suivi des règlements.',
    keywords: 'facturation transport, factures OT, ERP transport finance',
  },
  '/affretement-transport': {
    title: 'Affrètement transport et sous-traitance | NEXORA Truck',
    description:
      'Pilotez l\'affrètement transport avec traçabilité, coordination sous-traitants et suivi opérationnel intégré.',
    keywords: 'affrètement transport, sous-traitance transport, portail affréteur',
  },
  '/articles': {
    title: 'Blog transport : ERP, TMS et gestion flotte | NEXORA Truck',
    description:
      'Articles métier transport sur le planning, la gestion flotte, le TMS transport et la rentabilité des opérations.',
    keywords: 'blog transport, article ERP transport, conseils TMS transport, gestion flotte',
  },
  '/demonstration': {
    title: 'Démonstration ERP transport : accès gratuit | NEXORA Truck',
    description:
      'Demandez une démonstration NEXORA Truck et visualisez un ERP transport complet adapté à vos opérations.',
    keywords: 'démonstration ERP transport, demo TMS transport, essai ERP',
  },
  '/contact': {
    title: 'Contact NEXORA Truck | ERP transport routier',
    description: 'Parlons de votre projet ERP transport : démonstration, cadrage besoin et feuille de route de déploiement.',
    keywords: 'contact ERP transport, demo TMS, projet digitalisation transport',
  },
  '/a-propos': {
    title: 'À propos de NEXORA Truck | ERP transport routier',
    description:
      'Découvrez la vision NEXORA Truck : un ERP transport conçu pour l\'exploitation terrain et la performance opérationnelle.',
    keywords: 'à propos NEXORA Truck, éditeur ERP transport, logiciel transport routier',
  },
  '/integrations': {
    title: 'Intégrations API ERP transport | NEXORA Truck',
    description:
      'Intégrations API pour connecter télématique, tachygraphe, portails et écosystème transport à NEXORA Truck.',
    keywords: 'intégrations API transport, interconnexion ERP TMS, API télématique',
  },
  '/presentation': {
    title: 'Présentation ERP TMS NEXORA Truck | NEXORA Truck',
    description:
      'Consultez la présentation ERP TMS NEXORA Truck avec les modules, l architecture et les bénéfices pour les transporteurs routiers.',
    keywords: 'présentation ERP transport, brochure TMS, PDF logiciel transport, NEXORA Truck',
  },
  '/conditions-generales-utilisation': {
    title: 'CGU NEXORA Truck | ERP transport',
    description:
      'Conditions générales d utilisation du site public et de la plateforme ERP transport NEXORA Truck.',
    keywords: 'CGU NEXORA Truck, conditions utilisation ERP transport',
  },
  '/mentions-legales-public': {
    title: 'Mentions légales NEXORA Truck',
    description:
      'Mentions légales du site NEXORA Truck, ERP transport routier pour exploitation, planning, flotte et facturation.',
    keywords: 'mentions legales NEXORA Truck, editeur ERP transport',
  },
  '/versions': {
    title: 'Historique des versions ERP transport NEXORA | NEXORA Truck',
    description:
      'Consultez l historique des versions NEXORA Truck avec les ajouts, modifications et corrections de chaque release.',
    keywords: 'versions ERP transport, changelog NEXORA Truck, releases produit',
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

function normalizeMetaRoute(route) {
  if (route === '/') return route
  return route.replace(/\/+$/, '')
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function escapeJsonForScript(value) {
  return JSON.stringify(value).replaceAll('</script', '<\\/script')
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

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: meta.title.replace(/\s*\|\s*NEXORA Truck$/, ''),
    description: meta.description,
    inLanguage: 'fr-FR',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      name: 'NEXORA Truck',
      url: `${BASE_URL}/`,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'NEXORA Truck',
      url: `${BASE_URL}/`,
    },
  }
  html = html.replace(
    '</head>',
    `  <script type="application/ld+json" data-route-schema="webpage">${escapeJsonForScript(webPageJsonLd)}</script>\n  </head>`,
  )

  return html
}

function injectAppHtml(template, appHtml) {
  const html = template.replace(
    /<div id="root"><\/div>/i,
    `<div id="root" data-ssr="true">${appHtml}</div>`,
  )
  return html.replace(/\s*<noscript>\s*<section>[\s\S]*?<\/section>\s*<\/noscript>/i, '')
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

const { render } = await import(new URL('../dist-ssr/entry-server.js', import.meta.url))
const template = readFileSync(distIndexPath, 'utf8')
const routes = readRoutesFromSitemap()
let generatedCount = 0

for (const route of routes) {
  const metaRoute = normalizeMetaRoute(route)
  const meta = ROUTE_META[metaRoute] ?? ARTICLE_ROUTE_META[metaRoute] ?? fallbackMeta(metaRoute)
  const appHtml = render(route)
  const html = applySeoMeta(injectAppHtml(template, appHtml), route, meta)
  const outputPath =
    route === '/'
      ? distIndexPath
      : resolve(distDir, route.replace(/^\//, ''), 'index.html')

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, html, 'utf8')
  generatedCount += 1
}

rmSync(distSsrDir, { recursive: true, force: true })

console.log(`[seo-prerender] HTML SEO statique genere pour ${generatedCount} routes`)
