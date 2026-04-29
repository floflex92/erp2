import { APP_VERSION, BUILD_DATE } from '@/lib/appVersion'

export type ReleaseNote = {
  version: string
  date: string
  title: string
  summary: string
  additions: string[]
  modifications: string[]
  fixes: string[]
}

const documentedReleaseNotes: ReleaseNote[] = [
  {
    version: '1.15.20',
    date: '2026-04-22',
    title: 'Refonte page Connexion, nouveaux logos NEXORA et lisibilite page A propos',
    summary: 'Refonte complete de la page de connexion (panneau sombre immersif + nouvelle photo convoi NEXORA avec nouveau logo X degrade bleu/vert, suppression Google OAuth, lisibilite renforcee). Deploiement des nouveaux logos NEXORA (texte + X degrade) sur tout le site public. Correction navbar invisible sur la page A propos refaite en fond clair.',
    additions: [
      'Page /login: panneau gauche sombre immersif avec photo convoi NEXORA, pill plateforme, titre "En toute simplicite" en degrade cyan, 4 proof items en cartes glass sombres (Performance optimisee, Donnees securisees, Equipe connectee, Gain de temps).',
      'Page /login: panneau droit epure avec formulaire email/mot de passe, toggle oeil sur le mot de passe, "Se souvenir de moi", "Mot de passe oublie", bouton Se connecter avec fleche, trust strip 3 items (Acces securise, Disponibilite 24/7, Support reactif).',
      'Nouveau asset login-hero 1400 et 768 genere a partir du mockup convoi Scania NEXORA.',
    ],
    modifications: [
      'Page /login: bouton "Continuer avec Google" et handler signInWithOAuth retires, divider "ou" retire, formulaire email/mot de passe unique chemin de connexion.',
      'Deploiement des nouveaux logos NEXORA (texte + X degrade bleu vers vert) dans public/site/logo/brand: nexora-logo-dark.png et nexora-logo-light.png remplacent les anciens logos cercle reseau.',
      'UI/UX page /login: image assombrie (brightness 0.58), triple overlay (voile global + degrade colonne gauche + vignette), text-shadow double sur le titre, couleurs #E2E8F0 sur sous-textes.',
      'Version portee a 1.15.20 avec synchronisation package, appVersion et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable avec courses independantes.',
    ],
    fixes: [
      'Corrige : navbar invisible sur la page /a-propos refaite en fond clair (texte blanc sur fond blanc). Chemin retire de DARK_HERO_PATHS pour retour au texte fonce + logo dark.',
    ],
  },
  {
    version: '1.15.19',
    date: '2026-04-21',
    title: 'Favicon NEXORA: pack carre + rond + maskable regenere depuis le logo solo',
    summary: 'Regeneration complete du pack favicon/PWA a partir du vrai logo NEXORA (logo solo.png): icones carrees (16 a 1024), icones rondes, maskable Android, apple-touch-icon, tuiles MS et ICO multi-tailles. Manifest mis a jour avec icones maskable dediees.',
    additions: [
      'Icones carrees regenerees: 16, 32, 48, 64, 96, 128, 180, 192, 256, 384, 512, 1024.',
      'Icones rondes dediees: 64, 128, 192, 256, 512 (cercle plein + logo centre).',
      'Icones maskable PWA 192 et 512 avec safe-zone Android 80%.',
      'Tuiles Microsoft mstile 150x150 et 270x270.',
      'Script scripts/generate-favicons.mjs relançable pour toute future mise a jour du logo.',
    ],
    modifications: [
      'favicon.ico regenere en multi-tailles 16/32/48 a partir du logo solo.',
      'Manifest: icones "maskable" separees des "any" (meilleure compatibilite Android).',
      'index.html: cache-bust favicon/manifest passe a v=1.16.3, ajout du lien favicon-48x48.',
      'Version portee a 1.15.19 avec synchronisation package, appVersion et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable avec courses independantes.',
    ],
    fixes: [
      'Corrige : favicons precedents generes depuis la mauvaise image source.',
    ],
  },
  {
    version: '1.15.18',
    date: '2026-04-21',
    title: 'Push prod: maintenance espace Developpement et Features prioritaires',
    summary: 'Push Netlify de maintenance avec mise a jour de la version et de l espace Developpement (Developpe / En cours de developpement / Features).',
    additions: [],
    modifications: [
      'Version portee a 1.15.18 avec synchronisation package, appVersion et environnement Netlify.',
      'Onglet Developpement: rappel des onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable avec courses independantes.',
    ],
    fixes: [],
  },
  {
    version: '1.15.17',
    date: '2026-04-21',
    title: 'Favicon NEXORA: pack ICO multi-tailles et SVG cassé supprimé',
    summary: 'Regeneration complete du pack favicon a partir du nouveau logo NEXORA carre haute resolution. Suppression du favicon.svg qui pointait vers un PNG externe (ignore par les navigateurs en favicon SVG) et generation d un vrai .ico multi-resolutions (16/32/48/64).',
    additions: [
      'Nouveau favicon.ico multi-resolutions (16/32/48/64) genere depuis le logo NEXORA 1254x1254.',
      'Tous les PNG favicon (16/32/180/192/512 + pwa 192/512) regeneres en haute qualite (HighQualityBicubic).',
    ],
    modifications: [
      'Suppression du link rel=icon type=image/svg+xml et du fichier public/favicon.svg (SVG referencant un PNG externe non supporte).',
      'Cache-bust passe a v=1.16.2 sur tous les liens favicon/manifest.',
      'Service worker bumpe en v1-6-13 et favicon.svg retire de l app shell.',
      'Version portee a 1.15.17 avec synchronisation package, appVersion et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable.',
    ],
    fixes: [
      'Corrige : favicon NEXORA invisible dans l onglet navigateur (Chrome/Firefox prenaient prioritairement le favicon.svg vide).',
      'Corrige : favicon non remonte par Google Search a cause de l ICO mal forme et du SVG bloquant.',
    ],
  },
  {
    version: '1.15.16',
    date: '2026-04-21',
    title: 'Favicon NEXORA: pack complet et invalidation cache',
    summary: 'Le favicon onglet et le favicon utilise par les moteurs de recherche sont realignes sur le nouveau pack NEXORA, avec invalidation cache forcee (head, manifest, service worker).',
    additions: [
      'Tags icon supplementaires en 192x192 et 512x512 dans le head pour mieux servir les crawlers et navigateurs mobiles.',
      'Balise shortcut icon explicite vers /favicon.ico pour Google Search et navigateurs anciens.',
    ],
    modifications: [
      'Regeneration des PNG android-chrome 192/512 et pwa 192/512 depuis le nouveau logo NEXORA carre.',
      'Cache-bust des references favicon/manifest passe a v=1.16.1 pour forcer le rafraichissement client.',
      'Service worker bumpe en v1-6-12 pour invalider l ancien cache d icones.',
      'Version portee a 1.15.16 avec synchronisation package, appVersion et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable.',
    ],
    fixes: [
      'Corrige : favicon NEXORA absent dans l onglet navigateur et dans les resultats de recherche apres la refonte logo.',
      'Corrige : icones android/PWA encore servies depuis l ancien pack en 192x192 et 512x512.',
    ],
  },
  {
    version: '1.15.15',
    date: '2026-04-21',
    title: 'Refonte globale UI/UX: vitrine, ERP et identite visuelle',
    summary: 'Lot de refonte transversale issue de l audit du 21/04/2026: vitrine recentree sur la promesse ERP+TMS+IA all-in-one, rail d actions rapides par role dans l ERP, harmonisation des tokens de marque et bascule sur le nouveau pack logo/favicon.',
    additions: [
      'Nouveau pack logo et favicon (brand) deploye sur le site, l ERP et les assets PWA.',
      'Cockpit dirigeant: nouveau widget KPI et composants cockpit dedies dans le dashboard.',
      'Planning: utilitaires extraits et testes (assignation, conflits, urgence, regles communes) pour fiabiliser les actions critiques.',
    ],
    modifications: [
      'Vitrine: hero reformule sur la promesse "ERP + TMS + IA all-in-one", CTA principal bascule sur le test ERP, parcours metier etendu a 5 roles.',
      'ERP: rail Actions rapides par role dans le header pour reduire le temps d action exploitant/dirigeant/conducteur/affreteur/client.',
      'Harmonisation des tokens de marque (palette, gradient, contrastes) sur layout, login, dashboard, planning et pages site.',
      'Prerendu SEO et sitemap regeneres avec les nouveaux assets de marque.',
      'Version portee a 1.15.15 avec synchronisation package, appVersion, index et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable.',
    ],
    fixes: [
      'Corrige : incoherences chromatiques residuelles entre vitrine et ERP suite aux anciens assets de marque.',
      'Corrige : references favicon/manifest dispersees entre dossiers historiques et nouveau pack brand.',
    ],
  },
  {
    version: '1.15.14',
    date: '2026-04-20',
    title: 'Planning fiabilise: navigation, CE561 et fenetre de reglage courses',
    summary: 'Stabilisation du planning avec correctifs de crash/navigation, audit CE561 non bloquant par defaut et refonte de la fenetre de reglage des courses pour une exploitation plus rapide.',
    additions: [
      'Nouvelle fenetre de reglage course elargie avec mise en page 2 colonnes et lecture plus claire des informations.',
      'Outils rapides de planification: decalage depart (-30, +30, +60 min), presets de duree (2h, 4h, 8h, 10h) et option conserver la duree.',
      'Indicateur de validite de fenetre temporelle (chargement/livraison) directement dans la fenetre de reglage.',
    ],
    modifications: [
      'Audit CE561 conserve en mode non bloquant par defaut, avec activation explicite possible du mode conformite bloquante.',
      'Messages d audit CE561 clarifies pour distinguer audit informatif et blocage actif.',
      'Version portee a 1.15.14 avec synchronisation package, appVersion, index et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable.',
    ],
    fixes: [
      'Corrige : superposition de fenetres sur planning lors de l ouverture edition course (z-index overlays).',
      'Corrige : plantages intermittents lors des changements de page/retour arriere sur les zones de navigation globales.',
      'Corrige : crash sur actions HLP/PAUSE des OT deja places dans le planning.',
    ],
  },
  {
    version: '1.15.13',
    date: '2026-04-19',
    title: 'Durcissement icone racine pour indexation Google',
    summary: 'Correction definitive du icone pour les crawlers: la racine /icone.ico est forcee a partir du pack valide logo/icone lors du build, afin d eviter tout fallback vers un fichier verrouille/corrompu.',
    additions: [
      'Nouveau script build scripts/sync-icone-to-dist.mjs pour copier le icone canonique vers dist/icone.ico.',
      'Controle de taille minimal dans le script pour bloquer un artefact icone suspect avant deploiement.',
    ],
    modifications: [
      'Pipeline build complete avec synchronisation icone en fin de build avant publication Netlify.',
      'Version portee a 1.15.13 avec synchronisation package, appVersion et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable.',
    ],
    fixes: [
      'Corrige : /icone.ico pouvait rester sur un ancien binaire de 120 octets mal interprete par certains robots (dont Google).',
    ],
  },
  {
    version: '1.15.12',
    date: '2026-04-19',
    title: 'icone unifie depuis le pack logo/icone utilisateur',
    summary: 'Migration complete du icone sur les assets fournis dans docs/logo/icone, avec references head/manifest/service worker harmonisees et fallback /icone.ico force vers le fichier unique servi.',
    additions: [
      'Utilisation du pack icone utilisateur depuis /site/logo/icone (ico, 16x16, 32x32, mobile, android 192/512).',
      'Redirect Netlify explicite de /icone.ico vers /site/logo/icone/icone.ico pour neutraliser les anciens fichiers locaux verrouilles.',
    ],
    modifications: [
      'Head HTML aligne sur les assets /site/logo/icone avec versionnement de cache.',
      'Service worker et webmanifest alignes sur le meme jeu d icones.',
      'Version portee a 1.15.12 avec synchronisation package, appVersion et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable.',
    ],
    fixes: [
      'Corrige : rendu icone incoherent en production cause par conflit d anciens fichiers et cache.',
    ],
  },
  {
    version: '1.15.11',
    date: '2026-04-19',
    title: 'icone ICO stable en production via asset valide',
    summary: 'Publication du correctif icone avec bascule vers un fichier ICO valide non verrouille et invalidation du cache applicatif pour propagation immediate.',
    additions: [
      'Reference head du icone migree vers /icone.new.ico avec versionning de cache.',
      'Artefact ICO valide garanti dans la sortie build pour la production.',
    ],
    modifications: [
      'Service worker aligne sur icone.new.ico avec bump de cache pour forcer le rafraichissement client.',
      'Version portee a 1.15.11 avec synchronisation package, appVersion et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable.',
    ],
    fixes: [
      'Corrige : icone incoherent en production quand public/icone.ico restait verrouille localement.',
    ],
  },
  {
    version: '1.15.10',
    date: '2026-04-19',
    title: 'icone en format ico et harmonisation logo globale',
    summary: 'Bascule complete du icone vers le format /icone.ico et alignement global des references logo (head, manifest, donnees structurees, cache).',
    additions: [
      'Nouveau fichier public icone.ico genere depuis le logo officiel.',
      'Support icone explicite en image/x-icon pour meilleure compatibilite navigateurs.',
    ],
    modifications: [
      'Head HTML mis a jour pour pointer vers /icone.ico avec invalidation cache versionnee.',
      'Service worker ajuste pour precacher icone.ico et forcer le refresh des icones.',
      'Manifest PWA et donnees structurees homepage alignes sur le logo icone.png officiel.',
      'Version portee a 1.15.10 avec synchronisation package, appVersion et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable.',
    ],
    fixes: [
      'Corrige : incoherences de rendu icone selon navigateurs et cache stale des anciennes references logo.',
    ],
  },
  {
    version: '1.15.9',
    date: '2026-04-19',
    title: 'icone logo recherche force et cache nettoye',
    summary: 'Le icone du site est force sur le logo moteur de recherche avec invalidation cache pour propagation immediate.',
    additions: [
      'icone principal et shortcut icon alignes sur le logo recherche Nexora.',
      'Apple touch icon aligne sur le meme asset logo.',
    ],
    modifications: [
      'Priorite de l ancien icone SVG retiree pour eviter les retours visuels incoherents.',
      'Cache service worker mis a jour pour forcer le refresh de l icone.',
      'Version portee a 1.15.9 avec synchronisation package, appVersion et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable.',
    ],
    fixes: [
      'Corrige : affichage icone parfois stale ou remplace par l ancien SVG selon le cache navigateur.',
    ],
  },
  {
    version: '1.15.8',
    date: '2026-04-19',
    title: 'Nouvelle identite logo web et presentation',
    summary: 'Integration des nouveaux logos ajoutes dans docs avec branchement site public, icone/moteur de recherche et page de presentation.',
    additions: [
      'Nouveau logo moteur de recherche publie et branche dans les assets web publics.',
      'Nouveau logo de presentation ajoute visuellement sur la page Presentation.',
      'Mise a jour manifeste/service worker pour inclure le nouvel asset logo.',
    ],
    modifications: [
      'Metadonnees structurees Organization/Publisher ajustees pour pointer vers le nouveau logo public.',
      'Version portee a 1.15.8 avec synchronisation package, appVersion et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable.',
    ],
    fixes: [
      'Corrige : coherence logo entre presentation du site et signaux visuels web (icone/metadata).',
    ],
  },
  {
    version: '1.15.7',
    date: '2026-04-19',
    title: 'Utilisateurs: templates droits, exports asynchrones et securite admin',
    summary: 'Livraison complete des ajouts sur la gestion utilisateurs avec audit enrichi lisible, alertes de securite, exports CSV asynchrones historises et recette guidee integree.',
    additions: [
      'Templates de permissions metier (exploitant standard, responsable atelier, commercial senior) applicables en edition et creation.',
      'Export CSV asynchrone avec historique des jobs et indicateurs de statut.',
      'Panneau de recette guidee integre pour valider batch, tri derniere connexion, export, persistance filtres et audit.',
      'Alertes securite admin derivees des evenements sensibles (suppression, actions en lot, promotion privilegiee).',
    ],
    modifications: [
      'Journal audit enrichi avec filtre/recherche/pagination et diff avant/apres lisible sur les payloads.',
      'Version portee a 1.15.7 avec synchronisation package, appVersion et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable.',
    ],
    fixes: [
      'Corrige : lecture audit brute JSON peu exploitable, desormais contextualisee par differenciels metier.',
    ],
  },
  {
    version: '1.15.6',
    date: '2026-04-19',
    title: 'SuperAdmin: creation compte rattachee au bon tenant',
    summary: 'Correction du flux backoffice SuperAdmin pour forcer le rattachement au tenant cible lors de la creation utilisateur.',
    additions: [
      'Selection explicite du tenant cible dans le formulaire de creation utilisateur SuperAdmin.',
      'Transmission de company_id a la function admin-users pour creation dans le bon tenant.',
    ],
    modifications: [
      'Version portee a 1.15.6 avec synchronisation package, appVersion et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement, Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable.',
    ],
    fixes: [
      'Corrige : les creations de compte SuperAdmin pouvaient etre rattachees au mauvais tenant.',
    ],
  },
  {
    version: '1.15.5',
    date: '2026-04-18',
    title: 'Gestion tenant: creation utilisateur directe',
    summary: 'Ajout du formulaire de creation utilisateur directement dans la page de gestion du tenant, avec synchronisation release et suivi Developpement.',
    additions: [
      'Section Utilisateurs du tenant enrichie avec un formulaire de creation (email, nom, prenom, role, mot de passe optionnel).',
      'Generation et affichage du mot de passe temporaire quand aucun mot de passe n est fourni.',
    ],
    modifications: [
      'Version portee a 1.15.5 avec synchronisation package, appVersion et environnement Netlify.',
      'Espace Developpement maintenu sur les onglets Developpe, En cours de developpement et Features.',
      'Features prioritaires maintenues: connectivite/discussion inter-ERP, planning affreteur dedie, groupage multi-courses figeable/deliable.',
    ],
    fixes: [
      'Corrige : impossibilite de creer un utilisateur directement depuis Reglages tenant.',
    ],
  },
  {
    version: '1.15.4',
    date: '2026-04-18',
    title: 'Cockpit KPI V2.1 par role et finance SQL dediee',
    summary: 'Livraison du cockpit V2.1 metier avec lisibilite renforcee mobile/contraste et branchement finance sur des vues SQL dediees Supabase.',
    additions: [
      'Nouveau cockpit KPI V2.1 par role avec widgets utiles et fallback cockpit historique.',
      'Vues Supabase finance dediees: vue_finance_kpis_v21, vue_finance_client_perf_v21, vue_finance_charge_breakdown_v21, vue_finance_late_payments_v21.',
      'Composants dashboard-v21 reutilisables (KPI, alertes, charts lazy, synthese finance, retards paiement).',
    ],
    modifications: [
      'Branchement prioritaire des widgets finance sur les vues SQL avec fallback calcul historique.',
      'Contrastes et densite mobile ajustes sur les cartes et graphiques V2.1.',
      'Version portee a 1.15.4 avec synchronisation package et affichage application.',
      'Espace Developpement mis a jour sur les onglets Developpe / En cours / Features.',
    ],
    fixes: [
      'Corrige : source finance heterogene en cockpit, desormais consolidee par vues SQL dediees.',
    ],
  },
  {
    version: '1.15.3',
    date: '2026-04-18',
    title: 'SEO articles: metas uniques et titres optimisÃ©s',
    summary: 'AmÃ©lioration SEO on-page des contenus Ã©ditoriaux avec metas spÃ©cifiques par article et optimisation de plusieurs titles trop longs.',
    additions: [
      'Metadonnees dediees pour chaque page article (title, description, keywords) dans le prerender SEO.',
      'Couverture route-level etendue pour renforcer la pertinence des snippets Google sur le blog.',
    ],
    modifications: [
      'Optimisation de titles commerciaux depassant la longueur cible pour limiter la troncature SERP.',
      'Version portee a 1.15.3 avec synchronisation package et affichage application.',
      'Espace Developpement mis a jour sur les onglets Developpe / En cours / Features.',
    ],
    fixes: [
      'Corrige : descriptions generiques reutilisees sur plusieurs pages articles en HTML initial.',
    ],
  },
  {
    version: '1.15.2',
    date: '2026-04-18',
    title: 'SEO technique: prÃ©-rendu HTML par route publique',
    summary: 'Mise en place d un prÃ©-rendu SEO statique route-level pour livrer des balises title/meta/canonical diffÃ©renciÃ©es dÃ¨s la rÃ©ponse HTML initiale.',
    additions: [
      'Nouveau script scripts/prerender-seo-routes.mjs pour gÃ©nÃ©rer un index.html par route dans dist.',
      'Balises SEO injectÃ©es par route: title, description, keywords, canonical, Open Graph et Twitter.',
      'GÃ©nÃ©ration appliquÃ©e automatiquement aprÃ¨s le build front via npm run seo:prerender.',
    ],
    modifications: [
      'Pipeline build ajustÃ© pour inclure le prÃ©-rendu SEO statique en sortie.',
      'Version portÃ©e Ã  1.15.2 avec synchronisation package et affichage application.',
      'Onglet DÃ©veloppement mis Ã  jour pour tracer la livraison SEO route-level.',
    ],
    fixes: [
      'RÃ©solue : HTML initial gÃ©nÃ©rique multi-routes en production, limitant la lisibilitÃ© SEO sans JavaScript.',
    ],
  },
  {
    version: '1.15.1',
    date: '2026-04-18',
    title: 'Homepage v1.1 conversion SEO et performance perÃ§ue',
    summary: 'Restructuration de la page d accueil en mode amÃ©lioration v1.1 avec message clarifiÃ©, parcours conversion, SEO mÃ©tier transport et chargement progressif des sections.',
    additions: [
      'Nouvelle architecture homepage: Hero clarifiÃ©, ProblÃ¨me marchÃ©, Solution, Parcours mÃ©tier, Modules simplifiÃ©s, Preuve ROI, CTA final.',
      'Lazy loading des sections hors hero avec skeleton pour amÃ©liorer la perception de vitesse.',
      'Nouveaux blocs mÃ©tier SEO: ERP transport, TMS transport, gestion flotte, optimisation transport, suivi conducteur.',
    ],
    modifications: [
      'HiÃ©rarchie Ã©ditoriale simplifiÃ©e pour une lecture en moins de 5 secondes et un CTA principal immÃ©diat.',
      'Espacements et densitÃ© visuelle ajustÃ©s pour amÃ©liorer lisibilitÃ© sans changer la direction artistique globale.',
      'Onglet DÃ©veloppement dans RÃ©glages mis Ã  jour avec la livraison homepage v1.1 et maintien des prioritÃ©s Features.',
      'Version portÃ©e Ã  1.15.1 avec synchronisation package, build et affichage site.',
    ],
    fixes: [
      'Observer data-reveal rendu compatible avec les sections montÃ©es dynamiquement en lazy loading.',
    ],
  },
  {
    version: '1.15.0',
    date: '2026-04-16',
    title: 'Chargement Ã©tendu, remorques, CO2, alertes et optimiseur de routes',
    summary: 'Module chargement complet (types, tonnage, barres visuelles), catalogue types remorques avec compatibilitÃ© fret, page Bilan CO2, tableau de bord Alertes transport et optimiseur de routes front.',
    additions: [
      'Page BilanCo2 : calcul empreinte carbone par transport (distance, tonnage, type vÃ©hicule), indicateurs rÃ©glementaires.',
      'Page Alertes transport : tableau de bord alertes actives avec hook useAlertesTransport (retards, dÃ©passements capacitÃ©, anomalies).',
      'RouteOptimizerPanel + lib routeOptimizer : suggestions de routes et calcul distances cÃ´tÃ© front.',
      'Migrations Supabase : longueur_m / tonnage_kg sur ordres_transport, type_chargement Ã©tendu, catalogue trailer_types, champs capacitÃ© remorques, compatibilitÃ© remorque/fret.',
      'Composants flotte : vue dÃ©prÃ©ciation flotte via lib fleetDepreciation.',
      'ChargementBars : visualisation taux de remplissage chargeant/dÃ©chargeant sur les OT.',
      'Skeletons UI : DataState, Skeleton, SkeletonKpi, SkeletonTable pour les Ã©tats de chargement.',
      'Hooks useAsyncData et useRouteOptimizer pour la gestion d Ã©tat asynchrone.',
      'Libs mÃ©tier : chargementRules, trailerValidation, alertesTransport, co2Transport.',
      'Migration normalize_super_admin_role_for_rls : alignement rÃ´le super_admin dans les policies RLS.',
    ],
    modifications: [
      'Pages Transports, Remorques, VÃ©hicules, Chauffeurs, OpsCenter, MapLive, Planning, AnalytiqueTransport mises Ã  jour.',
      'L onglet DÃ©veloppement dans RÃ©glages reflÃ¨te les livraisons CO2, alertes et chargement.',
      'CSV features : CO2 et Alertes transport passent de Features Ã  DÃ©veloppÃ©.',
      'Version portÃ©e Ã  1.15.0 avec synchronisation package, build et affichage site.',
    ],
    fixes: [
      'RÃ©solue : backfill statut transport depuis legacy colonne statut pour cohÃ©rence donnÃ©es historiques.',
    ],
  },
  {
    version: '1.14.0',
    date: '2026-04-16',
    title: 'Planning â€“ Drag & drop robuste, file d attente sticky, villes OT, fix backoffice',
    summary: 'AmÃ©liorations majeures de l expÃ©rience planning : drag & drop fiabilisÃ©, panel file d attente toujours visible, villes dÃ©part/arrivÃ©e sur chaque carte OT, filtre groupage par conducteur et jour, et correction erreur 502 SuperAdmin.',
    additions: [
      'Villes dÃ©part et arrivÃ©e affichÃ©es sous chaque course dans le gantt planning (via sitesMap + getOtVilles).',
      'Filtre candidats groupage limitÃ© au mÃªme conducteur et Ã  la mÃªme journÃ©e.',
    ],
    modifications: [
      'Drag & drop planning : ghost cursor alignÃ© sur curseur, snap semaine/jour corrigÃ©, canMove normalisÃ© (null-safe), anti-vibration RAF throttle.',
      'Panel file d attente planning : position sticky + overflow clip sur ancÃªtres â†’ toujours visible lors du scroll page.',
      'Version portÃ©e Ã  1.14.0.',
    ],
    fixes: [
      'RÃ©solue : erreur 502 sur SuperAdminPage due Ã  SUPABASE_SERVICE_ROLE_KEY manquant dans .env.',
    ],
  },
  {
    version: '1.13.0',
    date: '2026-04-15',
    title: 'Refonte V2 â€“ Architecture multi-tenant, impersonation et planning',
    summary: 'Refonte complÃ¨te de l architecture base de donnÃ©es (blocs 1-7), couche auth multi-tenant avec impersonation admin, rÃ©solution de rÃ´le robuste et amÃ©liorations majeures du Planning et du SuperAdmin.',
    additions: [
      'Architecture DB refonte V2 complÃ¨te : 14 migrations (diagnostic, mapping tables, fondations persons/assets, refs uniqueness, runtime, seed mappings, rÃ©conciliation auto v1-v3, bridge documents/coffre salariÃ©, complÃ©tion phases 3-7).',
      'Couche auth multi-tenant centralisÃ©e : getCurrentTenant(), getActiveRole(), isPlatformAdmin() avec fallback robuste.',
      'Impersonation admin par tenant : dÃ©marrage/fin de session d impersonation, banniÃ¨re ImpersonationBanner visible en contexte de simulation.',
      'SessionPicker multi-tenant : sÃ©lection de tenant au login, persistance de la session active.',
      'Planning transport : refonte majeure de la vue avec gains de lisibilitÃ© et nouvelles interactions.',
      'SuperAdminPage refondue : gestion centralisÃ©e des tenants, utilisateurs, rÃ´les et impersonation.',
      'Composants routing centralisÃ©s et hook useScrollToTopOnChange.',
      'Couche services (src/lib/services/) pour les appels API mÃ©tier.',
    ],
    modifications: [
      'L onglet DÃ©veloppement dans RÃ©glages reflÃ¨te les livraisons refonte V2 et multi-tenant.',
      'Version portÃ©e Ã  1.13.0 avec synchronisation package, build et affichage site.',
      'RÃ©solution RLS planning et clients_read alignÃ©e sur les rÃ´les multi-tenant.',
    ],
    fixes: [
      'RÃ©solue : get_user_role sans fallback empÃªchait l accÃ¨s pour les users sans profil candidat.',
      'RÃ©solue : RLS clients_read bloquait les rÃ´les exploitant/conducteur sur la table contacts.',
      'RÃ©solue : RLS planning bloquait les rÃ´les de lecture sur certains tenants.',
    ],
  },
  {
    version: '1.12.12',
    date: '2026-04-15',
    title: 'Benchmark marchÃ© TMS â€“ 24 nouvelles features roadmap',
    summary: 'Ajout de 24 fonctionnalitÃ©s issues du benchmark concurrentiel (Akanea, Dashdoc, GedTrans, Transporeon) dans le catalogue produit.',
    additions: [
      'App mobile chauffeur, mode hors-ligne et eCMR dÃ©matÃ©rialisÃ©e (features 102-104).',
      'Preuve de livraison photo/signature, portail client et portail affrÃ©tÃ© autonome (features 105-107, 113).',
      'Saisie commandes par IA, suivi client temps rÃ©el et bilan CO2 rÃ©glementaire (features 108-110).',
      'White-label multi-marque, pointage automatique factures et messagerie embarquÃ©e (features 111-112, 114).',
      'WMS simplifiÃ© transport et optimisation tournÃ©es multi-contraintes (features 115-116).',
      'Grilles tarifaires versionnÃ©es, prise de RDV quai et gestion doc fournisseurs (features 117-119).',
      'Notification approche livraison, API ouverte et e-formulaires terrain (features 120-122).',
      'Multi-devises/taxes, suivi tempÃ©rature frigo et booking chargeurs (features 123-125).',
    ],
    modifications: [
      'L onglet DÃ©veloppement dans RÃ©glages reflÃ¨te les 24 nouvelles features roadmap.',
      'Version portÃ©e Ã  1.12.12 avec synchronisation package, build et affichage site.',
    ],
    fixes: [],
  },
  {
    version: '1.12.11',
    date: '2026-04-14',
    title: 'Groupage multi-courses et missions transport',
    summary: 'Table transport_missions avec groupage figeable/dÃ©liable, couche mÃ©tier missions complÃ¨te et gÃ©nÃ©ration PDF facture cÃ´tÃ© client.',
    additions: [
      'Table transport_missions (groupage, complet, partiel) avec RLS mÃ©tier et liaison conducteur/vÃ©hicule/remorque.',
      'Couche mÃ©tier complÃ¨te pour crÃ©er, regrouper, figer et dÃ©lier des courses dans une mission.',
      'GÃ©nÃ©ration PDF facture cÃ´tÃ© client avec SHA-256 d intÃ©gritÃ© et rÃ©fÃ©rences OT.',
    ],
    modifications: [
      'L onglet DÃ©veloppement dans RÃ©glages reflÃ¨te les livraisons groupage et missions.',
      'Version portÃ©e Ã  1.12.11 avec synchronisation package, build et affichage site.',
    ],
    fixes: [
      'RÃ©solue : les courses indÃ©pendantes du groupage conservent leur autonomie aprÃ¨s dÃ©liaison.',
    ],
  },
  {
    version: '1.12.10',
    date: '2026-04-14',
    title: 'Audit ERP lÃ©ger et factures PDF authentifiÃ©es',
    summary: 'TraÃ§abilitÃ© mÃ©tier ciblÃ©e, sÃ©curisation du flux PDF facture et amÃ©lioration SEO post-build avant dÃ©ploiement global.',
    additions: [
      'Journal d audit ERP lÃ©ger par sociÃ©tÃ© avec acteur, action, date et champs modifiÃ©s sur les tables prioritaires.',
      'Champs de gÃ©nÃ©ration PDF facture, bucket privÃ© et stockage sÃ©curisÃ© pour les documents de facturation.',
      'Soumission IndexNow automatique du sitemap aprÃ¨s build pour accÃ©lÃ©rer la prise en compte des pages publiÃ©es.',
    ],
    modifications: [
      'L onglet DÃ©veloppement dans RÃ©glages reflÃ¨te dÃ©sormais ces livraisons cÃ´tÃ© DÃ©veloppÃ©.',
      'Le chaÃ®nage comptable utilise explicitement extensions.digest pour fiabiliser la rÃ©solution du schÃ©ma SQL.',
    ],
    fixes: [
      'RÃ©solue : incohÃ©rence potentielle entre version package, version injectÃ©e au build et version affichÃ©e sur le site.',
      'RÃ©solue : rÃ©solution de digest cÃ´tÃ© migrations comptables dans les environnements oÃ¹ le search_path Ã©tait trop strict.',
    ],
  },
  {
    version: '1.12.9',
    date: '2026-04-13',
    title: 'Navigation et accÃ¨s rÃ´les â€” exploitant complet',
    summary: 'Refonte des accÃ¨s rÃ´les : navigation entiÃ¨rement rÃ©activÃ©e, exploitant ne peut plus Ãªtre bloquÃ© par les restrictions modules tenant, dirigeant obtient un accÃ¨s total.',
    additions: [
      'Le rÃ´le exploitant bypasse dÃ©sormais les filtres tenant et modules â€” OT/Fret, Map live, Demandes clients, TÃ¢ches et tous les outils opÃ©rationnels restent visibles.',
      'Le rÃ´le dirigeant bÃ©nÃ©ficie d un accÃ¨s complet Ã  toutes les pages, comparable Ã  super_admin.',
      'Saisie frais rapide dÃ©placÃ©e sous Finance (aprÃ¨s Frais) pour une meilleure cohÃ©rence mÃ©tier.',
    ],
    modifications: [
      'La section Administration n est plus masquÃ©e pour les rÃ´les admin et super_admin dans la sidebar.',
      'La page /alertes est maintenant un alias de l Ops Center, doublon de navigation retirÃ©.',
    ],
    fixes: [
      'Resolue : exploitants perdaient l accÃ¨s Ã  leurs outils sur certains tenants Ã  modules restrictifs.',
      'Resolue : rÃ´le exploitant ne voyait plus clients, maintenance, portails client et affrÃ©teur.',
    ],
  },
  {
    version: '1.12.8',
    date: '2026-04-13',
    title: 'Annuaire partenaire et cadrage dÃ©veloppement',
    summary: 'Ajout du lien annuaire partenaire sur le site et maintien explicite du pilotage DÃ©veloppÃ© / En cours / Features dans RÃ©glages.',
    additions: [
      'Section Partenaires du footer enrichie avec un lien vers annuaire-transports.fr.',
      'Historique de version mis Ã  jour pour la livraison du 13 avril 2026.',
    ],
    modifications: [
      'Le pilotage produit cÃ´tÃ© RÃ©glages conserve une lecture claire sur les trois statuts: DÃ©veloppÃ©, En cours de dÃ©veloppement et Features.',
    ],
    fixes: [],
  },
  {
    version: '1.12.7',
    date: '2026-04-12',
    title: 'Coffre-fort salariÃ© sÃ©curisÃ©',
    summary: 'Livraison du coffre-fort numÃ©rique salariÃ© avec endpoints dÃ©diÃ©s et campagne de validation.',
    additions: [
      'Endpoints Netlify list, sign et process-exit pour le coffre-fort numÃ©rique salariÃ©.',
      'Validation de pÃ©rimÃ¨tre salariÃ© pour restreindre correctement les accÃ¨s documentaires.',
      'Script de tests fonctionnels, sÃ©curitÃ© et charge autour du coffre-fort salariÃ©.',
    ],
    modifications: [
      'Le parcours documentaire salariÃ© passe d un flux partiellement local Ã  un circuit pilotÃ© par endpoints dÃ©diÃ©s.',
      'Le suivi de sortie salariÃ© est dÃ©sormais intÃ©grÃ© au mÃªme flux de traitement documentaire.',
    ],
    fixes: [
      'RÃ©duction du risque d accÃ¨s hors pÃ©rimÃ¨tre sur les documents RH sensibles.',
    ],
  },
  {
    version: '1.12.6',
    date: '2026-04-11',
    title: 'Workflow congÃ©s multi-Ã©tapes',
    summary: 'Structuration complÃ¨te du circuit de congÃ©s avec validations successives et document final.',
    additions: [
      'Workflow demande â†’ validation exploitation â†’ validation direction â†’ intÃ©gration paie â†’ validation finale.',
      'PDF d attestation de congÃ© en fin de circuit.',
    ],
    modifications: [
      'Le module absences Ã©volue vers un workflow mÃ©tier plus strict et traÃ§able.',
    ],
    fixes: [
      'SÃ©curisation du passage d une Ã©tape de validation Ã  la suivante.',
    ],
  },
  {
    version: '1.12.5',
    date: '2026-04-10',
    title: 'Planning Supabase plus fin',
    summary: 'Le planning gagne des blocs personnalisÃ©s persistÃ©s, les pauses intelligentes et la visibilitÃ© RH.',
    additions: [
      'Lignes et blocs personnalisÃ©s persistÃ©s en base avec drag-and-drop inter-lignes.',
      'Placement automatique des pauses dans les crÃ©neaux libres avec Ã©dition au clic.',
      'Bandes visuelles d absence, badge ABSENT et blocage d assignation sur conducteur absent.',
      'Onglet Mes absences pour le portail conducteur.',
    ],
    modifications: [
      'Le Gantt planning devient un Ã©cran de pilotage plus riche et moins dÃ©pendant des donnÃ©es locales.',
    ],
    fixes: [
      'Filtrage des sÃ©lecteurs pour Ã©viter les affectations sur conducteurs indisponibles.',
    ],
  },
  {
    version: '1.12.4',
    date: '2026-04-09',
    title: 'Brique RH, clients et tachy en base',
    summary: 'Plusieurs modules critiques basculent sur Supabase et gagnent une vraie persistance mÃ©tier.',
    additions: [
      'Tables absences RH avec soldes CP/RTT et workflow de validation.',
      'Journal comptable manuel persistant cÃ´tÃ© facturation.',
      'DonnÃ©es tachygraphe dynamiques et rapports conducteurs persistÃ©s.',
      'Fiche client ERP complÃ¨te avec conditions de paiement, IBAN/BIC, contacts et adresses.',
    ],
    modifications: [
      'Le tachygraphe s appuie dÃ©sormais sur de vraies entrÃ©es mÃ©tier et non plus sur un simple mock.',
      'La fiche client ERP devient une vraie base relationnelle exploitable par l exploitation et la facturation.',
    ],
    fixes: [
      'Meilleure cohÃ©rence des alertes documents et des Ã©tats de conformitÃ© conducteur.',
    ],
  },
  {
    version: '1.12.3',
    date: '2026-04-08',
    title: 'ObservabilitÃ© et modules par tenant',
    summary: 'Le socle technique gagne un suivi d erreurs complet et l activation mÃ©tier par client ERP.',
    additions: [
      'Table app_error_logs, Error Boundary React, handlers window.onerror et unhandledrejection.',
      'Panel admin d observabilitÃ© avec KPIs, filtres et traces API.',
      'Activation et dÃ©sactivation des mÃ©tiers par tenant depuis Clients ERP.',
    ],
    modifications: [
      'La gouvernance tenant passe d une logique globale Ã  une activation fine par mÃ©tier.',
    ],
    fixes: [
      'RÃ©duction du bruit d erreurs invisibles cÃ´tÃ© front et amÃ©lioration du diagnostic.',
    ],
  },
  {
    version: '1.12.2',
    date: '2026-04-07',
    title: 'Corrections SEO et UX homepage',
    summary: 'Ajustements de contraste, accessibilitÃ© et densitÃ© visuelle sur la home publique.',
    additions: [
      'Aria-label sur liens features et cartes blog.',
      'Dimensions explicites pour limiter le CLS sur les captures produit.',
    ],
    modifications: [
      'RÃ©duction des paddings et compression verticale de plusieurs sections de la home.',
      'Raccourcissement du titre principal pour amÃ©liorer lisibilitÃ© et SEO.',
    ],
    fixes: [
      'Correction de plusieurs contrastes insuffisants et d un overflow mobile.',
    ],
  },
  {
    version: '1.12.1',
    date: '2026-04-06',
    title: 'Ancres API discriminantes',
    summary: 'Les liens de documentation des intÃ©grations deviennent spÃ©cifiques par fournisseur.',
    additions: [
      'Textes de liens uniques par API sur la page intÃ©grations.',
    ],
    modifications: [
      'La page intÃ©grations remplace les libellÃ©s gÃ©nÃ©riques par des ancres sÃ©mantiques.',
    ],
    fixes: [
      'Correction SEO liÃ©e aux ancres rÃ©pÃ©titives non discriminantes.',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-04-05',
    title: 'IntÃ©grations API et perf site public',
    summary: 'Publication du rÃ©pertoire complet des intÃ©grations avec un travail de performance et d audit UX.',
    additions: [
      'Page IntÃ©grations API avec 9 intÃ©grations documentÃ©es et priorisÃ©es.',
      'Chargement non bloquant des Google Fonts et prÃ©connect dÃ©diÃ©.',
    ],
    modifications: [
      'Chunking Vite sÃ©parÃ© pour la homepage et dÃ©sactivation du reportCompressedSize.',
      'RÃ©duction significative de la hauteur de page et amÃ©lioration des touch targets.',
    ],
    fixes: [
      'Correction de contrastes WCAG AA et suppression d une animation box-shadow non composite.',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-04-01',
    title: 'Bloc mÃ©tier exploitation et finance',
    summary: 'MontÃ©e en puissance de l ERP avec CRM, War Room, analytique, rÃ¨glements, trÃ©sorerie et paie.',
    additions: [
      'CRM prospection complet avec pipeline Kanban et devis auto-pricÃ©s.',
      'War Room imprÃ©vu en temps rÃ©el liÃ©e aux OT, vÃ©hicules et conducteurs.',
      'Analytique transport, rÃ¨glements clients, trÃ©sorerie et paie transport MVP.',
      'Badges planning maintenance et radar km Ã  vide.',
    ],
    modifications: [
      'Le cockpit exploitation devient aussi un cockpit de pilotage marge et imprÃ©vus.',
    ],
    fixes: [
      'Clarification des indicateurs planning grÃ¢ce aux badges de maintenance et de charge.',
    ],
  },
  {
    version: '1.10.22',
    date: '2026-03-31',
    title: 'Refonte auth et connexion Google',
    summary: 'Nettoyage complet du systÃ¨me d authentification avec sÃ©curisation des rÃ´les et connexion Google OAuth.',
    additions: [
      'Connexion Google OAuth avec bootstrap profil automatique.',
    ],
    modifications: [
      'Exports auth unifiÃ©s, simplification signIn/signOut et nettoyage des doublons RequireAuth, SessionPicker, Login et DemoAccess.',
      'DÃ©connexion locale immÃ©diate et protection de race condition TOKEN_REFRESHED.',
    ],
    fixes: [
      'Suppression d un risque de rÃ´le admin par dÃ©faut sur Ã©chec de chargement profil.',
      'Correction du portail dropdown et du reset profilLoading au logout.',
    ],
  },
  {
    version: '1.10.21',
    date: '2026-03-30',
    title: 'PrÃ©sentation ERP PDF publique',
    summary: 'Ajout d une page publique dÃ©diÃ©e Ã  la prÃ©sentation ERP avec visionneuse intÃ©grÃ©e.',
    additions: [
      'Page prÃ©sentation avec visionneuse PDF intÃ©grÃ©e.',
      'TÃ©lÃ©chargement direct du support ERP TMS.',
    ],
    modifications: [
      'Le site public gagne un support de vente autonome directement consultable en ligne.',
    ],
    fixes: [],
  },
  {
    version: '1.10.20',
    date: '2026-03-29',
    title: 'Magic Link dÃ©mo',
    summary: 'Le parcours d accÃ¨s dÃ©mo est rÃ©duit Ã  un email avec gÃ©nÃ©ration sÃ©curisÃ©e de lien unique.',
    additions: [
      'Function Netlify demo-magic-link avec rate limiting IP.',
      'Upsert profil dÃ©mo et gÃ©nÃ©ration de lien unique sans mot de passe exposÃ©.',
    ],
    modifications: [
      'Le formulaire dÃ©mo multi-champs est remplacÃ© par un accÃ¨s instantanÃ© plus fluide.',
    ],
    fixes: [
      'RÃ©duction de la surface d exposition du mot de passe dans le parcours dÃ©mo.',
    ],
  },
  {
    version: '1.10.19',
    date: '2026-03-28',
    title: 'Design system ERP et durcissement RLS',
    summary: 'Refonte du confort visuel ERP et sÃ©curisation de plusieurs tables publiques Supabase.',
    additions: [
      'Variables CSS revues pour clair, sombre et nocturne WCAG AA.',
      'Mode nocturne Ã  trois Ã©tats et hiÃ©rarchie KPI plus lisible.',
    ],
    modifications: [
      'LisibilitÃ© planning, boutons disabled et scrollbar fine retravaillÃ©s.',
    ],
    fixes: [
      'Activation RLS stricte sur erp_v11_tenants, permissions, platform_admins et role_permissions.',
    ],
  },
  {
    version: '1.10.18',
    date: '2026-03-27',
    title: 'Heroes publics plus lisibles',
    summary: 'AmÃ©lioration de la lecture des pages hÃ©roÃ¯ques du site public.',
    additions: [
      'Overlay sombre homogÃ¨ne sur 11 pages hÃ©roÃ¯ques.',
    ],
    modifications: [
      'Textes et liens hero repassÃ©s en blanc et bleu clair sur fond sombre.',
    ],
    fixes: [
      'Correction de problÃ¨mes de lisibilitÃ© sur images de fond chargÃ©es.',
    ],
  },
  {
    version: '1.10.17',
    date: '2026-03-26',
    title: 'Audit SEO technique',
    summary: 'Passage d audit SEO technique avec corrections structurantes sur analytics, Open Graph et schema.org.',
    additions: [
      'GTM conditionnel au consentement RGPD.',
      'og:image width/height et alt paramÃ©trables par page.',
      'Schemas AggregateRating et VideoObject sur la homepage.',
    ],
    modifications: [
      'Logo Organization mis Ã  jour vers un PNG 192px avec ImageObject complet.',
    ],
    fixes: [
      'Suppression de la directive Host non standard dans robots.txt.',
    ],
  },
  {
    version: '1.10.15',
    date: '2026-03-24',
    title: 'Bloc SEO Facturation et AffrÃ¨tement',
    summary: 'Nouvelles pages de positionnement et enrichissement du footer public.',
    additions: [
      'Pages Facturation transport et AffrÃ¨tement transport.',
      'Cinq articles mÃ©tier supplÃ©mentaires.',
      'OG images individuelles sur dix pages publiques.',
    ],
    modifications: [
      'Footer enrichi pour mieux rÃ©partir les entrÃ©es SEO.',
    ],
    fixes: [
      'Corrections accessibilitÃ© avec variables CSS WCAG AA et couleurs footer revues.',
    ],
  },
  {
    version: '1.10.14',
    date: '2026-03-23',
    title: 'Groupes conducteurs et IA retour en charge',
    summary: 'AccÃ©lÃ©ration sur l exploitation mÃ©tier, la segmentation planning et le multi-tenant.',
    additions: [
      'Groupes de conducteurs avec isolation planning par exploitant.',
      'IA de placement retour en charge avec provider Ollama ou Anthropic.',
      'Multi-tenant phases 1 Ã  3 avec super admin et tenant admin.',
      'Trois nouvelles pages SEO: tÃ©lÃ©matique, chronotachygraphe et IA transport.',
    ],
    modifications: [
      'Le planning respecte dÃ©sormais des pÃ©rimÃ¨tres d exploitation plus fins.',
    ],
    fixes: [
      'Durcissement RLS et endpoint Netlify associÃ© aux groupes de conducteurs.',
    ],
  },
  {
    version: '1.10.13',
    date: '2026-03-22',
    title: 'SEO contenu maximal',
    summary: 'RÃ©Ã©criture profonde des pages mÃ©tier pour amÃ©liorer clartÃ© produit et maillage interne.',
    additions: [
      'Sections Cas d usage sur plusieurs pages transport.',
      'ScÃ©narios avant/aprÃ¨s concrets et maillage interne systÃ©matique.',
    ],
    modifications: [
      'H1, blocks problems, solutionPillars et keyFeatures retravaillÃ©s sur plusieurs verticales.',
    ],
    fixes: [],
  },
  {
    version: '1.10.12',
    date: '2026-03-21',
    title: 'Logistique multi-site et relais',
    summary: 'Appui fort sur la logistique terrain avec entrepÃ´ts, dÃ©pÃ´ts et rÃ´le logisticien.',
    additions: [
      'Page EntrepÃ´ts et DÃ©pÃ´ts avec GPS map picker et filtrage tenant.',
      'Relais transport avec onglet dÃ©diÃ©, assignation ressources, statuts et historique.',
      'RÃ´le logisticien avec accÃ¨s ciblÃ©s et simulateur mÃ©tier.',
    ],
    modifications: [
      'Le menu ERP intÃ¨gre une vraie section logistique.',
    ],
    fixes: [],
  },
]

function buildFallbackRelease(): ReleaseNote {
  return {
    version: APP_VERSION,
    date: BUILD_DATE,
    title: 'Version dÃ©ployÃ©e automatiquement',
    summary: 'Cette version courante est injectÃ©e au build pour que la page Versions reflÃ¨te toujours le push Netlify le plus rÃ©cent.',
    additions: [
      'NumÃ©ro de version synchronisÃ© automatiquement avec le build en cours.',
    ],
    modifications: [
      'ComplÃ©ter le dÃ©tail de cette version dans src/lib/releaseNotes.ts avant ou pendant le prochain push Netlify.',
    ],
    fixes: [],
  }
}

export const releaseNotes = documentedReleaseNotes.some(note => note.version === APP_VERSION)
  ? documentedReleaseNotes
  : [buildFallbackRelease(), ...documentedReleaseNotes]

export const latestReleaseNote = releaseNotes[0]
