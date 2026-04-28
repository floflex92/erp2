/**
 * Génère public/sitemap.xml avec lastmod = date du jour pour les pages commerciales.
 * Les pages légales conservent une date fixe (contenu rarement modifié).
 * Lancé automatiquement avant le build via package.json.
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const today = new Date().toISOString().slice(0, 10);

// Pages légales : date fixe car le contenu n'évolue pas souvent
const LEGAL_DATE = '2026-04-03';

const pages = [
  { loc: '/',                                                                  lastmod: today,      changefreq: 'weekly',  priority: '1.0'  },
  { loc: '/fonctionnalites',                                                   lastmod: today,      changefreq: 'weekly',  priority: '0.95' },
  { loc: '/toutes-les-fonctionnalites',                                        lastmod: today,      changefreq: 'weekly',  priority: '0.92' },
  { loc: '/versions',                                                          lastmod: today,      changefreq: 'weekly',  priority: '0.82' },
  { loc: '/solution',                                                          lastmod: today,      changefreq: 'weekly',  priority: '0.95' },
  { loc: '/plateforme-erp-transport',                                          lastmod: today,      changefreq: 'weekly',  priority: '0.9'  },
  { loc: '/erp-transport-tms',                                                 lastmod: today,      changefreq: 'weekly',  priority: '0.9'  },
  { loc: '/tarifs-erp-transport',                                              lastmod: today,      changefreq: 'weekly',  priority: '0.88' },
  { loc: '/comparatif-erp-transport',                                          lastmod: today,      changefreq: 'weekly',  priority: '0.88' },
  { loc: '/planning-intelligent',                                              lastmod: today,      changefreq: 'weekly',  priority: '0.95' },
  { loc: '/avantages-roi',                                                     lastmod: today,      changefreq: 'weekly',  priority: '0.9'  },
  { loc: '/secteur-transport',                                                 lastmod: today,      changefreq: 'weekly',  priority: '0.85' },
  { loc: '/erp-transport',                                                     lastmod: today,      changefreq: 'weekly',  priority: '0.96' },
  { loc: '/erp-transport-routier',                                             lastmod: today,      changefreq: 'weekly',  priority: '0.94' },
  { loc: '/tms-transport',                                                     lastmod: today,      changefreq: 'weekly',  priority: '0.93' },
  { loc: '/logiciel-gestion-flotte-camion',                                    lastmod: today,      changefreq: 'weekly',  priority: '0.93' },
  { loc: '/telematique-transport',                                             lastmod: today,      changefreq: 'weekly',  priority: '0.92' },
  { loc: '/chronotachygraphe',                                                 lastmod: today,      changefreq: 'weekly',  priority: '0.92' },
  { loc: '/ia-transport',                                                      lastmod: today,      changefreq: 'weekly',  priority: '0.92' },
  { loc: '/facturation-transport',                                             lastmod: today,      changefreq: 'weekly',  priority: '0.91' },
  { loc: '/affretement-transport',                                             lastmod: today,      changefreq: 'weekly',  priority: '0.91' },
  { loc: '/logiciel-transport',                                                lastmod: today,      changefreq: 'weekly',  priority: '0.92' },
  { loc: '/integrations',                                                      lastmod: today,      changefreq: 'weekly',  priority: '0.85' },
  { loc: '/articles',                                                          lastmod: today,      changefreq: 'weekly',  priority: '0.88' },
  { loc: '/articles/comment-organiser-un-planning-transport-efficacement',    lastmod: today,      changefreq: 'monthly', priority: '0.84' },
  { loc: '/articles/erp-transport-pourquoi-abandonner-excel',                 lastmod: today,      changefreq: 'monthly', priority: '0.84' },
  { loc: '/articles/tms-transport-definition-simple-et-complete',             lastmod: today,      changefreq: 'monthly', priority: '0.84' },
  { loc: '/articles/gestion-de-flotte-poids-lourd-erreurs-courantes',         lastmod: today,      changefreq: 'monthly', priority: '0.84' },
  { loc: '/articles/comment-ameliorer-la-rentabilite-d-une-entreprise-de-transport', lastmod: today, changefreq: 'monthly', priority: '0.84' },
  { loc: '/articles/reduire-les-kilometres-a-vide-dans-le-transport-routier', lastmod: today,      changefreq: 'monthly', priority: '0.84' },
  { loc: '/articles/otif-transport-comment-fiabiliser-la-livraison-client',   lastmod: today,      changefreq: 'monthly', priority: '0.84' },
  { loc: '/articles/transport-routier-systeme-coherent',                      lastmod: today,      changefreq: 'monthly', priority: '0.84' },
  { loc: '/articles/facturation-transport-automatiser',                       lastmod: today,      changefreq: 'monthly', priority: '0.84' },
  { loc: '/articles/affretement-transport-sous-traitance',                    lastmod: today,      changefreq: 'monthly', priority: '0.84' },
  { loc: '/articles/couts-transport-routier-reduire-optimiser',               lastmod: today,      changefreq: 'monthly', priority: '0.84' },
  { loc: '/articles/conformite-transport-routier-reglementation',             lastmod: today,      changefreq: 'monthly', priority: '0.84' },
  { loc: '/articles/digitalisation-transport-routier-2026',                   lastmod: today,      changefreq: 'monthly', priority: '0.84' },
  { loc: '/a-propos',                                                          lastmod: today,      changefreq: 'monthly', priority: '0.75' },
  { loc: '/demonstration',                                                     lastmod: today,      changefreq: 'weekly',  priority: '0.92' },
  { loc: '/connexion-erp',                                                     lastmod: today,      changefreq: 'weekly',  priority: '0.78' },
  { loc: '/contact',                                                           lastmod: today,      changefreq: 'weekly',  priority: '0.8'  },
  { loc: '/presentation',                                                      lastmod: today,      changefreq: 'monthly', priority: '0.7'  },
  { loc: '/politique-confidentialite',                                         lastmod: LEGAL_DATE, changefreq: 'monthly', priority: '0.42' },
  { loc: '/conditions-generales-utilisation',                                  lastmod: LEGAL_DATE, changefreq: 'monthly', priority: '0.4'  },
  { loc: '/mentions-legales-public',                                           lastmod: LEGAL_DATE, changefreq: 'yearly',  priority: '0.3'  },
];

const BASE = 'https://nexora-truck.fr';

function canonicalLoc(loc) {
  return loc === '/' ? loc : `${loc}/`;
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    ({ loc, lastmod, changefreq, priority }) =>
      `  <url>\n    <loc>${BASE}${canonicalLoc(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
  )
  .join('\n')}
</urlset>
`;

const outPath = resolve(__dirname, '../public/sitemap.xml');
writeFileSync(outPath, xml, 'utf-8');
console.log(`✅ sitemap.xml généré (${pages.length} URLs) — lastmod: ${today}`);
