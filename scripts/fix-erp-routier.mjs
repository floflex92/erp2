/**
 * Corrige le bloc faqItems de ErpTransportRoutierPage.tsx (apostrophes ASCII -> guillemets doubles)
 */
import { readFileSync, writeFileSync } from 'fs'

const path = 'src/site/pages/ErpTransportRoutierPage.tsx'
let c = readFileSync(path, 'utf8')
const nl = c.includes('\r\n') ? '\r\n' : '\n'

// On repère le début de la section author dans useSiteMeta et le endMarker
const useSiteMetaIdx = c.indexOf('useSiteMeta(')
const authorMarker = "    author: 'NEXORA Truck',"
const authorIdx = c.indexOf(authorMarker, useSiteMetaIdx)
const endMarker = '  })' + nl + nl + '  return ('
const endIdx = c.indexOf(endMarker, authorIdx)

if (authorIdx === -1 || endIdx === -1) {
  console.error('Markers not found')
  process.exit(1)
}

const before = c.substring(0, authorIdx + authorMarker.length)
const after = c.substring(endIdx)

const newMid = nl
  + `    breadcrumbs: [{ name: 'ERP transport routier', path: '/erp-transport-routier' }],` + nl
  + `    faqItems: [` + nl
  + `      {` + nl
  + `        question: "Qu\u2019est-ce qu\u2019un ERP transport routier\u00a0?",` + nl
  + `        answer: "Un ERP transport routier est un logiciel int\u00e9gr\u00e9 couvrant toutes les op\u00e9rations d\u2019une entreprise de transport\u00a0: prise d\u2019ordre, planning, dispatch, suivi flotte, conducteurs, facturation et reporting dans un seul outil.",` + nl
  + `      },` + nl
  + `      {` + nl
  + `        question: "Pourquoi choisir un ERP d\u00e9di\u00e9 au transport routier plut\u00f4t qu\u2019un ERP g\u00e9n\u00e9raliste\u00a0?",` + nl
  + `        answer: "Un ERP transport routier int\u00e8gre des fonctions m\u00e9tier absentes des ERP g\u00e9n\u00e9ralistes\u00a0: gestion tachygraphe, suivi temps r\u00e9el des missions, communication conducteurs, groupage de tourn\u00e9es et conformit\u00e9 transport. Prise en main beaucoup plus rapide pour les \u00e9quipes exploitation.",` + nl
  + `      },` + nl
  + `      {` + nl
  + `        question: "Un ERP transport routier peut-il g\u00e9rer plusieurs agences\u00a0?",` + nl
  + `        answer: "Oui. NEXORA Truck est multi-agences et multi-entit\u00e9s. Chaque agence dispose de son propre espace de planning tout en partageant une vue consolid\u00e9e des indicateurs pour la direction.",` + nl
  + `      },` + nl
  + `      {` + nl
  + `        question: "Combien faut-il de v\u00e9hicules pour justifier un ERP transport routier\u00a0?",` + nl
  + `        answer: "\u00c0 partir de 5 v\u00e9hicules, un ERP transport routier fait gagner du temps chaque jour. L\u2019automatisation de la facturation, du suivi conducteurs et du planning devient rentable tr\u00e8s rapidement.",` + nl
  + `      },` + nl
  + `    ],` + nl

writeFileSync(path, before + newMid + after, 'utf8')
console.log('\u2713 ErpTransportRoutierPage patched')
