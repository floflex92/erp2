/**
 * Fix: remplace les blocs faqItems mal quotés (apostrophes ASCII dans singles quotes)
 * dans toutes les pages SEO patched par replace_string_in_file.
 */
import { readFileSync, writeFileSync } from 'fs'

function patchFaqItems(filePath, authorMarker, newMid) {
  let c = readFileSync(filePath, 'utf8')
  const nl = c.includes('\r\n') ? '\r\n' : '\n'

  const useSiteMetaIdx = c.indexOf('useSiteMeta(')
  const authorIdx = c.indexOf(authorMarker, useSiteMetaIdx)
  // Find end of useSiteMeta block
  const endMarker = '  })' + nl
  const endIdx = c.indexOf(endMarker, authorIdx)

  if (authorIdx === -1 || endIdx === -1) {
    console.error('Markers not found in', filePath)
    return
  }

  const before = c.substring(0, authorIdx + authorMarker.length)
  const after = c.substring(endIdx)
  writeFileSync(filePath, before + nl + newMid.replace(/\n/g, nl) + after, 'utf8')
  console.log('\u2713', filePath)
}

// ── LogicielGestionFlotteCamionPage ────────────────────────────────────────
patchFaqItems(
  'src/site/pages/LogicielGestionFlotteCamionPage.tsx',
  "    author: 'NEXORA Truck',",
  `    breadcrumbs: [{ name: 'Gestion flotte camion', path: '/logiciel-gestion-flotte-camion' }],
    faqItems: [
      {
        question: "Qu\u2019est-ce qu\u2019un logiciel de gestion de flotte camion\u00a0?",
        answer: "Un logiciel de gestion de flotte camion centralise le suivi des v\u00e9hicules poids lourds\u00a0: disponibilit\u00e9s, localisation GPS, alertes de maintenance (CT, VGP, r\u00e9visions), documents r\u00e9glementaires et int\u00e9gration avec le planning transport pour optimiser les affectations.",
      },
      {
        question: "Comment \u00e9viter les immobilisations non planifi\u00e9es dans un parc poids lourd\u00a0?",
        answer: "En connectant la maintenance pr\u00e9ventive au planning\u00a0: NEXORA Truck alerte l\u2019exploitant avant qu\u2019un CT ou une r\u00e9vision devienne bloquant, et d\u00e9conseille automatiquement l\u2019affectation d\u2019un v\u00e9hicule non conforme.",
      },
      {
        question: "Un logiciel flotte camion peut-il fonctionner sans GPS\u00a0?",
        answer: "Oui. Les disponibilit\u00e9s v\u00e9hicules, les statuts de maintenance et les documents sont g\u00e9r\u00e9s manuellement ou via l\u2019application conducteur. L\u2019int\u00e9gration GPS enrichit le suivi mais n\u2019est pas obligatoire.",
      },
      {
        question: "Quelle diff\u00e9rence entre un logiciel flotte et un TMS transport\u00a0?",
        answer: "Le logiciel flotte g\u00e8re le parc v\u00e9hicules (maintenance, disponibilit\u00e9s, conformit\u00e9). Le TMS g\u00e8re les ordres de transport et le dispatch. NEXORA Truck int\u00e8gre les deux\u00a0: la disponibilit\u00e9 r\u00e9elle du camion est visible au moment de l\u2019affectation de la mission.",
      },
    ],
`
)

// ── TmsTransportPage ────────────────────────────────────────────────────────
patchFaqItems(
  'src/site/pages/TmsTransportPage.tsx',
  "    author: 'NEXORA Truck',",
  `    breadcrumbs: [{ name: 'TMS transport', path: '/tms-transport' }],
    faqItems: [
      {
        question: "Qu\u2019est-ce qu\u2019un TMS transport\u00a0?",
        answer: "Un TMS (Transport Management System) est un logiciel d\u00e9di\u00e9 \u00e0 la gestion des ordres de transport\u00a0: dispatch des missions, suivi de l\u2019ex\u00e9cution en temps r\u00e9el, communication conducteurs et g\u00e9n\u00e9ration de la facturation. Il est souvent int\u00e9gr\u00e9 dans un ERP transport.",
      },
      {
        question: "Quelle diff\u00e9rence entre un TMS et un ERP transport\u00a0?",
        answer: "Le TMS g\u00e8re le c\u0153ur op\u00e9rationnel des missions transport. L\u2019ERP transport englobe en plus la gestion flotte, les conducteurs, la paie, la comptabilit\u00e9 et la t\u00e9l\u00e9matique. NEXORA Truck int\u00e8gre TMS et ERP dans un seul outil.",
      },
      {
        question: "Comment le TMS r\u00e9duit-il les ressaisies dans le transport\u00a0?",
        answer: "En reliant directement l\u2019ordre de transport \u00e0 la facturation, le TMS NEXORA Truck supprime les saisies manuelles entre dispatch, cl\u00f4ture de mission et \u00e9mission de facture. Les statuts conducteurs remontent automatiquement depuis l\u2019application mobile.",
      },
      {
        question: "Un TMS transport fonctionne-t-il sans t\u00e9l\u00e9matique\u00a0?",
        answer: "Oui. Le TMS NEXORA Truck peut fonctionner avec ou sans t\u00e9l\u00e9matique connect\u00e9e. Avec un bo\u00eetier GPS ou une application conducteur, les statuts remontent automatiquement. Sans mat\u00e9riel, les mises \u00e0 jour sont saisies manuellement.",
      },
    ],
`
)

// ── LogicielTransportPage ───────────────────────────────────────────────────
patchFaqItems(
  'src/site/pages/LogicielTransportPage.tsx',
  "    author: 'NEXORA Truck',",
  `    breadcrumbs: [{ name: 'Logiciel transport', path: '/logiciel-transport' }],
    faqItems: [
      {
        question: "Quels sont les crit\u00e8res pour choisir un logiciel transport routier\u00a0?",
        answer: "Les crit\u00e8res essentiels sont\u00a0: la couverture fonctionnelle (planning, TMS, flotte, facturation), la facilit\u00e9 de prise en main par les exploitants, la capacit\u00e9 d\u2019int\u00e9gration avec la t\u00e9l\u00e9matique existante, la r\u00e9activit\u00e9 du support et le rapport qualit\u00e9/prix selon la taille de votre flotte.",
      },
      {
        question: "Un logiciel transport routier peut-il remplacer Excel\u00a0?",
        answer: "Oui. Un logiciel transport bien con\u00e7u centralise l\u2019ensemble des op\u00e9rations dans un seul outil, \u00e9liminant les tableaux Excel, les ressaisies et les erreurs de synchronisation entre fichiers.",
      },
      {
        question: "Quelle diff\u00e9rence entre un logiciel transport et un TMS\u00a0?",
        answer: "Le terme \u00ab\u00a0logiciel transport\u00a0\u00bb d\u00e9signe souvent un ERP transport complet couvrant toutes les fonctions de l\u2019entreprise. Un TMS est sp\u00e9cifiquement d\u00e9di\u00e9 \u00e0 la gestion des missions et du dispatch. NEXORA Truck combine les deux dans une seule plateforme.",
      },
      {
        question: "Faut-il former ses \u00e9quipes pour utiliser un logiciel transport\u00a0?",
        answer: "La formation est souvent surestim\u00e9e pour les solutions modernes. NEXORA Truck est con\u00e7u pour des exploitants, pas des informaticiens. La plupart des \u00e9quipes sont autonomes en quelques jours.",
      },
    ],
`
)

// ── SeoErpTransportPage ─────────────────────────────────────────────────────
patchFaqItems(
  'src/site/pages/SeoErpTransportPage.tsx',
  "    author: 'NEXORA Truck',",
  `    breadcrumbs: [{ name: 'ERP transport', path: '/erp-transport' }],
    faqItems: [
      {
        question: "Qu\u2019est-ce qu\u2019un ERP transport\u00a0?",
        answer: "Un ERP transport est un logiciel de gestion int\u00e9gr\u00e9 qui centralise toutes les fonctions d\u2019une entreprise de transport routier\u00a0: planification des missions, ordres de transport, suivi flotte, gestion des conducteurs, t\u00e9l\u00e9matique, facturation et reporting dans un seul outil.",
      },
      {
        question: "Quelle diff\u00e9rence entre un ERP transport et un TMS\u00a0?",
        answer: "Un TMS (Transport Management System) g\u00e8re uniquement les ordres de transport et le dispatch. Un ERP transport int\u00e8gre en plus la gestion flotte, les conducteurs, la t\u00e9l\u00e9matique, la comptabilit\u00e9 et la facturation. L\u2019ERP est un sur-ensemble du TMS.",
      },
      {
        question: "Combien co\u00fbte un ERP transport\u00a0?",
        answer: "Le co\u00fbt d\u2019un ERP transport varie selon la taille de la flotte et les modules activ\u00e9s. NEXORA Truck propose un mod\u00e8le SaaS transparent, adapt\u00e9 aux transporteurs de 5 \u00e0 plusieurs centaines de v\u00e9hicules. Demandez une d\u00e9monstration pour obtenir un tarif personnalis\u00e9.",
      },
      {
        question: "Combien de temps dure l\u2019installation d\u2019un ERP transport\u00a0?",
        answer: "Avec NEXORA Truck, la mise en production se compte en jours. La configuration initiale se fait en ligne\u00a0; les donn\u00e9es flotte et conducteurs sont import\u00e9es depuis vos fichiers existants.",
      },
      {
        question: "Un ERP transport fonctionne-t-il avec la t\u00e9l\u00e9matique existante\u00a0?",
        answer: "Oui. NEXORA Truck s\u2019int\u00e8gre avec Webfleet, FleetBoard, Samsara et d\u2019autres solutions pour remonter automatiquement positions GPS, statuts de conduite et donn\u00e9es tachygraphe.",
      },
    ],
`
)
