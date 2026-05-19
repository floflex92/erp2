/**
 * Ajoute breadcrumbs + faqItems dans useSiteMeta pour télémat., chrono, IA.
 */
import { readFileSync, writeFileSync } from 'fs'

const BASE = 'src/site/pages/'

function patchFile(filePath, search, replace) {
  let c = readFileSync(filePath, 'utf8')
  const nl = c.includes('\r\n') ? '\r\n' : '\n'
  const s = search.replace(/\n/g, nl)
  const r = replace.replace(/\n/g, nl)
  if (!c.includes(s)) { console.warn('NOT FOUND:', filePath); return }
  c = c.replace(s, r)
  writeFileSync(filePath, c, 'utf8')
  console.log('\u2713', filePath)
}

const TAIL = `    ogType: 'article',
    author: 'NEXORA Truck',
  })

  return (`

// ── Télématique ────────────────────────────────────────────────────────────
patchFile(BASE + 'Tel\u00e9matiqueTransportPage.tsx', TAIL, `    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'T\u00e9l\u00e9matique transport', path: '/telematique-transport' }],
    faqItems: [
      {
        question: 'Qu\u2019est-ce que la t\u00e9l\u00e9matique transport\u00a0?',
        answer: 'La t\u00e9l\u00e9matique transport d\u00e9signe les syst\u00e8mes embarqu\u00e9s sur poids lourds transmettant en temps r\u00e9el g\u00e9olocalisation, statuts de conduite, kilom\u00e9trage et alertes comportement \u00e0 l\u2019ERP de l\u2019entreprise.',
      },
      {
        question: 'Comment la t\u00e9l\u00e9matique est-elle int\u00e9gr\u00e9e dans un ERP transport\u00a0?',
        answer: 'NEXORA Truck se connecte aux principales bo\u00eetes noires (Webfleet, FleetBoard, Samsara) via API. Positions GPS, statuts et kilom\u00e9trage remontent automatiquement dans le TMS sans saisie manuelle.',
      },
      {
        question: 'La t\u00e9l\u00e9matique transport est-elle obligatoire\u00a0?',
        answer: 'Le chronotachygraphe num\u00e9rique est obligatoire pour les PL > 3,5 t en transport professionnel. La t\u00e9l\u00e9matique GPS n\u2019est pas l\u00e9galement obligatoire mais devient indispensable d\u00e8s quelques v\u00e9hicules pour piloter une exploitation s\u00e9rieuse.',
      },
      {
        question: 'Quelle diff\u00e9rence entre t\u00e9l\u00e9matique et chronotachygraphe\u00a0?',
        answer: 'Le chronotachygraphe enregistre les temps de conduite pour la conformit\u00e9 r\u00e9glementaire. La t\u00e9l\u00e9matique couvre un p\u00e9rim\u00e8tre plus large : GPS, alertes conduite, kilom\u00e9trage, surveillance de zone. Les deux sont compl\u00e9mentaires dans NEXORA Truck.',
      },
    ],
  })

  return (`)

// ── Chronotachygraphe ──────────────────────────────────────────────────────
patchFile(BASE + 'ChronotachygraphePage.tsx', TAIL, `    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'Chronotachygraphe', path: '/chronotachygraphe' }],
    faqItems: [
      {
        question: 'Qu\u2019est-ce que le chronotachygraphe num\u00e9rique\u00a0?',
        answer: 'Le chronotachygraphe num\u00e9rique est un appareil de contr\u00f4le obligatoire sur les poids lourds > 3,5 t. Il enregistre les temps de conduite, coupures et repos conform\u00e9ment au r\u00e8glement CE 561/2006.',
      },
      {
        question: 'Qu\u2019est-ce que le chronotachygraphe intelligent (G2)\u00a0?',
        answer: 'Le chronotachygraphe intelligent G2 (obligatoire d\u00e8s ao\u00fbt 2023 sur les nouveaux v\u00e9hicules) transmet les donn\u00e9es en temps r\u00e9el par satellite et facilite les contr\u00f4les mobiles.',
      },
      {
        question: 'Comment analyser les donn\u00e9es tachygraphe avec un ERP\u00a0?',
        answer: 'NEXORA Truck lit les fichiers DDD ou re\u00e7oit les donn\u00e9es via Webfleet / FleetBoard. Les infractions potentielles et les alertes r\u00e9glementaires sont affich\u00e9es dans le tableau de bord sans logiciel suppl\u00e9mentaire.',
      },
      {
        question: 'Quelles amendes pour non-conformit\u00e9 tachygraphe\u00a0?',
        answer: 'Les infractions entra\u00eenent des amendes de 750 \u20ac \u00e0 plus de 15\u202f000 \u20ac selon la gravit\u00e9. Un suivi proactif via ERP r\u00e9duit consid\u00e9rablement ce risque.',
      },
    ],
  })

  return (`)

// ── IA Transport ───────────────────────────────────────────────────────────
patchFile(BASE + 'IaTransportPage.tsx', TAIL, `    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'IA transport', path: '/ia-transport' }],
    faqItems: [
      {
        question: 'Comment l\u2019IA am\u00e9liore-t-elle le transport routier\u00a0?',
        answer: 'L\u2019IA transport analyse les historiques d\u2019exploitation pour optimiser le placement conducteurs, pr\u00e9dire les ETAs, d\u00e9tecter des anomalies et proposer des regroupements de missions, r\u00e9duisant le temps de d\u00e9cision de l\u2019exploitant.',
      },
      {
        question: 'L\u2019IA peut-elle optimiser le planning transport\u00a0?',
        answer: 'Oui, sur des probl\u00e8mes structur\u00e9s : placement conducteurs/v\u00e9hicules, groupage de tourn\u00e9es, d\u00e9tection de surcharges. Le module IA placement de NEXORA Truck sugg\u00e8re les affectations optimales en tenant compte des contraintes r\u00e9glementaires et de la disponibilit\u00e9 flotte.',
      },
      {
        question: 'L\u2019IA remplacera-t-elle l\u2019exploitant transport\u00a0?',
        answer: 'Non. L\u2019IA propose, l\u2019exploitant d\u00e9cide. Elle acc\u00e9l\u00e8re le traitement de sc\u00e9narios complexes mais la connaissance m\u00e9tier et la relation client restent irremplaçables.',
      },
      {
        question: 'Faut-il des donn\u00e9es historiques pour utiliser l\u2019IA dans le transport\u00a0?',
        answer: 'Le module IA de NEXORA Truck devient pertinent d\u00e8s quelques semaines d\u2019utilisation et s\u2019am\u00e9liore avec le temps. Il ne n\u00e9cessite pas d\u2019infrastructure data sp\u00e9cifique.',
      },
    ],
  })

  return (`)
