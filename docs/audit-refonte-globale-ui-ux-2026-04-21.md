# Audit global + refonte prioritaire (2026-04-21)

## Perimetre
- Site vitrine: pages publiques chargees via `SiteLayout` et routes publiques.
- ERP web: `AppLayout`, `Sidebar`, pages metier critiques (`Planning`, `Transports`, `Dashboard`, `DashboardConducteur`).
- Branding web: logos, favicons, meta OG/Twitter, manifest.

## Phase 1 — Audit global

### 1) Site internet (vitrine)

#### Clarte du message / comprehension produit
- Point fort: la home explique le probleme terrain et couvre planning/flotte/facturation.
- Point faible: proposition de valeur pas assez immediate sur "ERP + TMS + IA all-in-one" en 3 secondes.
- Friction: CTA principal historiquement oriente demo, test ERP pas assez prioritaire.

#### Structure / hierarchie visuelle
- Point fort: sections ordonnees et completees (pain points, modules, ROI, blog, CTA final).
- Point faible: densite elevee, parcours parfois long avant conversion forte.
- Point faible: certains blocs melangent discours SEO et promesse produit, ce qui dilue la priorite conversion.

#### Conversion (CTA)
- Point fort: plusieurs CTA existants.
- Point faible: CTA "Tester l'ERP" pas assez dominant au hero avant refonte.

#### Lisibilite
- Point fort: contrastes corrects sur la majorite des sections claires.
- Point faible: coherence chromatique globale heterogene (palette historique melangee).

#### Ce qui nuit
- Ce qui n'est pas clair: la promesse "all-in-one" n'etait pas formulee de facon immediate.
- Ce qui ne donne pas envie: CTA d'acces test pas assez frontal des le hero.
- Ce qui nuit a la credibilite: branding OG/Twitter dispersé entre assets historiques.

### 2) ERP (web app)

#### Exploitant (priorite)
- Pertes de temps: navigation lourde entre modules, trop de decisions contextuelles avant action.
- Frictions UX: acces rapide aux 3 actions critiques (planning, OT, ops) peu explicite en haut d'ecran.
- Surcharge info: beaucoup de sections sidebar simultanees.
- Complexite inutile: parcours multi-clic pour actions quotidiennes repetitives.
- Incoherences UI: couleurs et priorites visuelles pas toujours uniformes selon pages.

#### Dirigeant
- Pertes de temps: bascule entre dashboard, analytique, tresorerie sans raccourci metier explicite.
- Frictions UX: pas de rail d'action rapide contextualise role.

#### Conducteur
- Pertes de temps: acces a la feuille de route et frais rapide present, mais peut etre accelere via raccourcis fixes.
- Frictions UX: priorite action terrain pas toujours visible des le haut.

#### Affreteur
- Pertes de temps: entree vers espace dedie/planning/map live non priorisee en tete.
- Frictions UX: navigation possible mais non optimisee "3 clics max".

#### Client
- Pertes de temps: parcours espace client/demandes/messagerie pas explicitement mis en avant.
- Frictions UX: manque de rail d'actions visible par role.

## Phase 2 — DA globale commune
- Palette cible appliquee sur vitrine (tokens site):
  - `#0EA5E9`, `#1E3A8A`, `#22C55E`, `#4ADE80`
  - Fonds: `#020617` et `#0B1220`
  - Texte clair: `#E5E7EB`, secondaire: `#94A3B8`
  - Gradient: `linear-gradient(135deg, #0EA5E9, #22C55E)`
- Contraste: priorite lisibilite, textes clairs sur fonds fonces dans la couche vitrine.

## Phase 3 — Refonte UI/UX vitrine (livre dans ce lot)
- Hero reformule en promesse immediate "ERP + TMS + IA" et "all-in-one".
- CTA principal bascule sur test ERP immediat.
- CTA demo maintenu en secondaire.
- Parcours metier etendu a 5 roles (exploitant, dirigeant, conducteur, affreteur, client).

## Phase 4 — Refonte UX ERP coeur produit (livre partiellement)
- Ajout d'un rail "Actions rapides" par role dans le header ERP pour reduire le temps d'action.
- Focus sur 3 actions maximum par role pour limiter la charge cognitive.

## Phase 5 — Refonte UI ERP (livre partiellement)
- Harmonisation des tokens de marque (primary/accent/gradient) pour meilleure coherence.
- A completer ensuite sur composants lourds (`Planning`, `Transports`, `Dashboard`) via refonte par lot ecran.

## Phase 6 — Logos (critique)
- Verification effectuee: assets de marque actifs utilises depuis `public/site/logo/brand`.
- References OG/Twitter/logo standardisees vers le logo officiel actuel.
- Dossier source `docs/vieux logo` conserve comme archive de travail (non utilise en runtime).

## Phase 7 — Favicon / app icon
- Verification web: `index.html`, `site.webmanifest`, `public/sw.js`, `public/site/logo/favicon/*` coherents.
- Theme color harmonise en `#020617`.

## Phase 8 — App Android
- Bloquant workspace: aucun projet Android natif detecte (pas de `AndroidManifest.xml`, pas d'`ic_launcher`).
- Action recommandee: brancher ce plan sur le repo Android des que disponible.

## Phase 9 — Coherence globale
- Systeme de couleur et message unifies entre vitrine et ERP web (premiere passe).
- Reste a faire: harmonisation fine page par page sur modules ERP denses.

## Phase 10 — Validation
- Verifier apres build:
  - aucune regression route publique/ERP
  - CTAs hero fonctionnels
  - OG/Twitter/logo/favicons resolvent correctement
  - lisibilite/contraste conformes

## Interdits respectes
- Pas de suppression de fonctionnalites metier.
- Pas d'ajout de pages inutiles.
- Refonte orientee utilite et conversion, sans complexification gratuite.

## Suite recommandee
1. Sprint UX exploitant: simplification du haut de `Planning` + creation course guidee en 1 flux.
2. Sprint cockpit dirigeant: vue KPI en 2 secondes avec priorisation decisionnelle.
3. Sprint conducteur mobile web: grossir cibles tactiles, reduire texte secondaire, parcours 1 ecran = 1 objectif.
4. Lot Android (si repo fourni): ic_launcher adaptive + UX mobile simplifiee.
