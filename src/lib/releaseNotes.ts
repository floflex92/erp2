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
    version: '1.13.0',
    date: '2026-04-15',
    title: 'Refonte V2 – Architecture multi-tenant, impersonation et planning',
    summary: 'Refonte complète de l architecture base de données (blocs 1-7), couche auth multi-tenant avec impersonation admin, résolution de rôle robuste et améliorations majeures du Planning et du SuperAdmin.',
    additions: [
      'Architecture DB refonte V2 complète : 14 migrations (diagnostic, mapping tables, fondations persons/assets, refs uniqueness, runtime, seed mappings, réconciliation auto v1-v3, bridge documents/coffre salarié, complétion phases 3-7).',
      'Couche auth multi-tenant centralisée : getCurrentTenant(), getActiveRole(), isPlatformAdmin() avec fallback robuste.',
      'Impersonation admin par tenant : démarrage/fin de session d impersonation, bannière ImpersonationBanner visible en contexte de simulation.',
      'SessionPicker multi-tenant : sélection de tenant au login, persistance de la session active.',
      'Planning transport : refonte majeure de la vue avec gains de lisibilité et nouvelles interactions.',
      'SuperAdminPage refondue : gestion centralisée des tenants, utilisateurs, rôles et impersonation.',
      'Composants routing centralisés et hook useScrollToTopOnChange.',
      'Couche services (src/lib/services/) pour les appels API métier.',
    ],
    modifications: [
      'L onglet Développement dans Réglages reflète les livraisons refonte V2 et multi-tenant.',
      'Version portée à 1.13.0 avec synchronisation package, build et affichage site.',
      'Résolution RLS planning et clients_read alignée sur les rôles multi-tenant.',
    ],
    fixes: [
      'Résolue : get_user_role sans fallback empêchait l accès pour les users sans profil candidat.',
      'Résolue : RLS clients_read bloquait les rôles exploitant/conducteur sur la table contacts.',
      'Résolue : RLS planning bloquait les rôles de lecture sur certains tenants.',
    ],
  },
  {
    version: '1.12.12',
    date: '2026-04-15',
    title: 'Benchmark marché TMS – 24 nouvelles features roadmap',
    summary: 'Ajout de 24 fonctionnalités issues du benchmark concurrentiel (Akanea, Dashdoc, GedTrans, Transporeon) dans le catalogue produit.',
    additions: [
      'App mobile chauffeur, mode hors-ligne et eCMR dématérialisée (features 102-104).',
      'Preuve de livraison photo/signature, portail client et portail affrété autonome (features 105-107, 113).',
      'Saisie commandes par IA, suivi client temps réel et bilan CO2 réglementaire (features 108-110).',
      'White-label multi-marque, pointage automatique factures et messagerie embarquée (features 111-112, 114).',
      'WMS simplifié transport et optimisation tournées multi-contraintes (features 115-116).',
      'Grilles tarifaires versionnées, prise de RDV quai et gestion doc fournisseurs (features 117-119).',
      'Notification approche livraison, API ouverte et e-formulaires terrain (features 120-122).',
      'Multi-devises/taxes, suivi température frigo et booking chargeurs (features 123-125).',
    ],
    modifications: [
      'L onglet Développement dans Réglages reflète les 24 nouvelles features roadmap.',
      'Version portée à 1.12.12 avec synchronisation package, build et affichage site.',
    ],
    fixes: [],
  },
  {
    version: '1.12.11',
    date: '2026-04-14',
    title: 'Groupage multi-courses et missions transport',
    summary: 'Table transport_missions avec groupage figeable/déliable, couche métier missions complète et génération PDF facture côté client.',
    additions: [
      'Table transport_missions (groupage, complet, partiel) avec RLS métier et liaison conducteur/véhicule/remorque.',
      'Couche métier complète pour créer, regrouper, figer et délier des courses dans une mission.',
      'Génération PDF facture côté client avec SHA-256 d intégrité et références OT.',
    ],
    modifications: [
      'L onglet Développement dans Réglages reflète les livraisons groupage et missions.',
      'Version portée à 1.12.11 avec synchronisation package, build et affichage site.',
    ],
    fixes: [
      'Résolue : les courses indépendantes du groupage conservent leur autonomie après déliaison.',
    ],
  },
  {
    version: '1.12.10',
    date: '2026-04-14',
    title: 'Audit ERP léger et factures PDF authentifiées',
    summary: 'Traçabilité métier ciblée, sécurisation du flux PDF facture et amélioration SEO post-build avant déploiement global.',
    additions: [
      'Journal d audit ERP léger par société avec acteur, action, date et champs modifiés sur les tables prioritaires.',
      'Champs de génération PDF facture, bucket privé et stockage sécurisé pour les documents de facturation.',
      'Soumission IndexNow automatique du sitemap après build pour accélérer la prise en compte des pages publiées.',
    ],
    modifications: [
      'L onglet Développement dans Réglages reflète désormais ces livraisons côté Développé.',
      'Le chaînage comptable utilise explicitement extensions.digest pour fiabiliser la résolution du schéma SQL.',
    ],
    fixes: [
      'Résolue : incohérence potentielle entre version package, version injectée au build et version affichée sur le site.',
      'Résolue : résolution de digest côté migrations comptables dans les environnements où le search_path était trop strict.',
    ],
  },
  {
    version: '1.12.9',
    date: '2026-04-13',
    title: 'Navigation et accès rôles — exploitant complet',
    summary: 'Refonte des accès rôles : navigation entièrement réactivée, exploitant ne peut plus être bloqué par les restrictions modules tenant, dirigeant obtient un accès total.',
    additions: [
      'Le rôle exploitant bypasse désormais les filtres tenant et modules — OT/Fret, Map live, Demandes clients, Tâches et tous les outils opérationnels restent visibles.',
      'Le rôle dirigeant bénéficie d un accès complet à toutes les pages, comparable à super_admin.',
      'Saisie frais rapide déplacée sous Finance (après Frais) pour une meilleure cohérence métier.',
    ],
    modifications: [
      'La section Administration n est plus masquée pour les rôles admin et super_admin dans la sidebar.',
      'La page /alertes est maintenant un alias de l Ops Center, doublon de navigation retiré.',
    ],
    fixes: [
      'Resolue : exploitants perdaient l accès à leurs outils sur certains tenants à modules restrictifs.',
      'Resolue : rôle exploitant ne voyait plus clients, maintenance, portails client et affréteur.',
    ],
  },
  {
    version: '1.12.8',
    date: '2026-04-13',
    title: 'Annuaire partenaire et cadrage développement',
    summary: 'Ajout du lien annuaire partenaire sur le site et maintien explicite du pilotage Développé / En cours / Features dans Réglages.',
    additions: [
      'Section Partenaires du footer enrichie avec un lien vers annuaire-transports.fr.',
      'Historique de version mis à jour pour la livraison du 13 avril 2026.',
    ],
    modifications: [
      'Le pilotage produit côté Réglages conserve une lecture claire sur les trois statuts: Développé, En cours de développement et Features.',
    ],
    fixes: [],
  },
  {
    version: '1.12.7',
    date: '2026-04-12',
    title: 'Coffre-fort salarié sécurisé',
    summary: 'Livraison du coffre-fort numérique salarié avec endpoints dédiés et campagne de validation.',
    additions: [
      'Endpoints Netlify list, sign et process-exit pour le coffre-fort numérique salarié.',
      'Validation de périmètre salarié pour restreindre correctement les accès documentaires.',
      'Script de tests fonctionnels, sécurité et charge autour du coffre-fort salarié.',
    ],
    modifications: [
      'Le parcours documentaire salarié passe d un flux partiellement local à un circuit piloté par endpoints dédiés.',
      'Le suivi de sortie salarié est désormais intégré au même flux de traitement documentaire.',
    ],
    fixes: [
      'Réduction du risque d accès hors périmètre sur les documents RH sensibles.',
    ],
  },
  {
    version: '1.12.6',
    date: '2026-04-11',
    title: 'Workflow congés multi-étapes',
    summary: 'Structuration complète du circuit de congés avec validations successives et document final.',
    additions: [
      'Workflow demande → validation exploitation → validation direction → intégration paie → validation finale.',
      'PDF d attestation de congé en fin de circuit.',
    ],
    modifications: [
      'Le module absences évolue vers un workflow métier plus strict et traçable.',
    ],
    fixes: [
      'Sécurisation du passage d une étape de validation à la suivante.',
    ],
  },
  {
    version: '1.12.5',
    date: '2026-04-10',
    title: 'Planning Supabase plus fin',
    summary: 'Le planning gagne des blocs personnalisés persistés, les pauses intelligentes et la visibilité RH.',
    additions: [
      'Lignes et blocs personnalisés persistés en base avec drag-and-drop inter-lignes.',
      'Placement automatique des pauses dans les créneaux libres avec édition au clic.',
      'Bandes visuelles d absence, badge ABSENT et blocage d assignation sur conducteur absent.',
      'Onglet Mes absences pour le portail conducteur.',
    ],
    modifications: [
      'Le Gantt planning devient un écran de pilotage plus riche et moins dépendant des données locales.',
    ],
    fixes: [
      'Filtrage des sélecteurs pour éviter les affectations sur conducteurs indisponibles.',
    ],
  },
  {
    version: '1.12.4',
    date: '2026-04-09',
    title: 'Brique RH, clients et tachy en base',
    summary: 'Plusieurs modules critiques basculent sur Supabase et gagnent une vraie persistance métier.',
    additions: [
      'Tables absences RH avec soldes CP/RTT et workflow de validation.',
      'Journal comptable manuel persistant côté facturation.',
      'Données tachygraphe dynamiques et rapports conducteurs persistés.',
      'Fiche client ERP complète avec conditions de paiement, IBAN/BIC, contacts et adresses.',
    ],
    modifications: [
      'Le tachygraphe s appuie désormais sur de vraies entrées métier et non plus sur un simple mock.',
      'La fiche client ERP devient une vraie base relationnelle exploitable par l exploitation et la facturation.',
    ],
    fixes: [
      'Meilleure cohérence des alertes documents et des états de conformité conducteur.',
    ],
  },
  {
    version: '1.12.3',
    date: '2026-04-08',
    title: 'Observabilité et modules par tenant',
    summary: 'Le socle technique gagne un suivi d erreurs complet et l activation métier par client ERP.',
    additions: [
      'Table app_error_logs, Error Boundary React, handlers window.onerror et unhandledrejection.',
      'Panel admin d observabilité avec KPIs, filtres et traces API.',
      'Activation et désactivation des métiers par tenant depuis Clients ERP.',
    ],
    modifications: [
      'La gouvernance tenant passe d une logique globale à une activation fine par métier.',
    ],
    fixes: [
      'Réduction du bruit d erreurs invisibles côté front et amélioration du diagnostic.',
    ],
  },
  {
    version: '1.12.2',
    date: '2026-04-07',
    title: 'Corrections SEO et UX homepage',
    summary: 'Ajustements de contraste, accessibilité et densité visuelle sur la home publique.',
    additions: [
      'Aria-label sur liens features et cartes blog.',
      'Dimensions explicites pour limiter le CLS sur les captures produit.',
    ],
    modifications: [
      'Réduction des paddings et compression verticale de plusieurs sections de la home.',
      'Raccourcissement du titre principal pour améliorer lisibilité et SEO.',
    ],
    fixes: [
      'Correction de plusieurs contrastes insuffisants et d un overflow mobile.',
    ],
  },
  {
    version: '1.12.1',
    date: '2026-04-06',
    title: 'Ancres API discriminantes',
    summary: 'Les liens de documentation des intégrations deviennent spécifiques par fournisseur.',
    additions: [
      'Textes de liens uniques par API sur la page intégrations.',
    ],
    modifications: [
      'La page intégrations remplace les libellés génériques par des ancres sémantiques.',
    ],
    fixes: [
      'Correction SEO liée aux ancres répétitives non discriminantes.',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-04-05',
    title: 'Intégrations API et perf site public',
    summary: 'Publication du répertoire complet des intégrations avec un travail de performance et d audit UX.',
    additions: [
      'Page Intégrations API avec 9 intégrations documentées et priorisées.',
      'Chargement non bloquant des Google Fonts et préconnect dédié.',
    ],
    modifications: [
      'Chunking Vite séparé pour la homepage et désactivation du reportCompressedSize.',
      'Réduction significative de la hauteur de page et amélioration des touch targets.',
    ],
    fixes: [
      'Correction de contrastes WCAG AA et suppression d une animation box-shadow non composite.',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-04-01',
    title: 'Bloc métier exploitation et finance',
    summary: 'Montée en puissance de l ERP avec CRM, War Room, analytique, règlements, trésorerie et paie.',
    additions: [
      'CRM prospection complet avec pipeline Kanban et devis auto-pricés.',
      'War Room imprévu en temps réel liée aux OT, véhicules et conducteurs.',
      'Analytique transport, règlements clients, trésorerie et paie transport MVP.',
      'Badges planning maintenance et radar km à vide.',
    ],
    modifications: [
      'Le cockpit exploitation devient aussi un cockpit de pilotage marge et imprévus.',
    ],
    fixes: [
      'Clarification des indicateurs planning grâce aux badges de maintenance et de charge.',
    ],
  },
  {
    version: '1.10.22',
    date: '2026-03-31',
    title: 'Refonte auth et connexion Google',
    summary: 'Nettoyage complet du système d authentification avec sécurisation des rôles et connexion Google OAuth.',
    additions: [
      'Connexion Google OAuth avec bootstrap profil automatique.',
    ],
    modifications: [
      'Exports auth unifiés, simplification signIn/signOut et nettoyage des doublons RequireAuth, SessionPicker, Login et DemoAccess.',
      'Déconnexion locale immédiate et protection de race condition TOKEN_REFRESHED.',
    ],
    fixes: [
      'Suppression d un risque de rôle admin par défaut sur échec de chargement profil.',
      'Correction du portail dropdown et du reset profilLoading au logout.',
    ],
  },
  {
    version: '1.10.21',
    date: '2026-03-30',
    title: 'Présentation ERP PDF publique',
    summary: 'Ajout d une page publique dédiée à la présentation ERP avec visionneuse intégrée.',
    additions: [
      'Page présentation avec visionneuse PDF intégrée.',
      'Téléchargement direct du support ERP TMS.',
    ],
    modifications: [
      'Le site public gagne un support de vente autonome directement consultable en ligne.',
    ],
    fixes: [],
  },
  {
    version: '1.10.20',
    date: '2026-03-29',
    title: 'Magic Link démo',
    summary: 'Le parcours d accès démo est réduit à un email avec génération sécurisée de lien unique.',
    additions: [
      'Function Netlify demo-magic-link avec rate limiting IP.',
      'Upsert profil démo et génération de lien unique sans mot de passe exposé.',
    ],
    modifications: [
      'Le formulaire démo multi-champs est remplacé par un accès instantané plus fluide.',
    ],
    fixes: [
      'Réduction de la surface d exposition du mot de passe dans le parcours démo.',
    ],
  },
  {
    version: '1.10.19',
    date: '2026-03-28',
    title: 'Design system ERP et durcissement RLS',
    summary: 'Refonte du confort visuel ERP et sécurisation de plusieurs tables publiques Supabase.',
    additions: [
      'Variables CSS revues pour clair, sombre et nocturne WCAG AA.',
      'Mode nocturne à trois états et hiérarchie KPI plus lisible.',
    ],
    modifications: [
      'Lisibilité planning, boutons disabled et scrollbar fine retravaillés.',
    ],
    fixes: [
      'Activation RLS stricte sur erp_v11_tenants, permissions, platform_admins et role_permissions.',
    ],
  },
  {
    version: '1.10.18',
    date: '2026-03-27',
    title: 'Heroes publics plus lisibles',
    summary: 'Amélioration de la lecture des pages héroïques du site public.',
    additions: [
      'Overlay sombre homogène sur 11 pages héroïques.',
    ],
    modifications: [
      'Textes et liens hero repassés en blanc et bleu clair sur fond sombre.',
    ],
    fixes: [
      'Correction de problèmes de lisibilité sur images de fond chargées.',
    ],
  },
  {
    version: '1.10.17',
    date: '2026-03-26',
    title: 'Audit SEO technique',
    summary: 'Passage d audit SEO technique avec corrections structurantes sur analytics, Open Graph et schema.org.',
    additions: [
      'GTM conditionnel au consentement RGPD.',
      'og:image width/height et alt paramétrables par page.',
      'Schemas AggregateRating et VideoObject sur la homepage.',
    ],
    modifications: [
      'Logo Organization mis à jour vers un PNG 192px avec ImageObject complet.',
    ],
    fixes: [
      'Suppression de la directive Host non standard dans robots.txt.',
    ],
  },
  {
    version: '1.10.15',
    date: '2026-03-24',
    title: 'Bloc SEO Facturation et Affrètement',
    summary: 'Nouvelles pages de positionnement et enrichissement du footer public.',
    additions: [
      'Pages Facturation transport et Affrètement transport.',
      'Cinq articles métier supplémentaires.',
      'OG images individuelles sur dix pages publiques.',
    ],
    modifications: [
      'Footer enrichi pour mieux répartir les entrées SEO.',
    ],
    fixes: [
      'Corrections accessibilité avec variables CSS WCAG AA et couleurs footer revues.',
    ],
  },
  {
    version: '1.10.14',
    date: '2026-03-23',
    title: 'Groupes conducteurs et IA retour en charge',
    summary: 'Accélération sur l exploitation métier, la segmentation planning et le multi-tenant.',
    additions: [
      'Groupes de conducteurs avec isolation planning par exploitant.',
      'IA de placement retour en charge avec provider Ollama ou Anthropic.',
      'Multi-tenant phases 1 à 3 avec super admin et tenant admin.',
      'Trois nouvelles pages SEO: télématique, chronotachygraphe et IA transport.',
    ],
    modifications: [
      'Le planning respecte désormais des périmètres d exploitation plus fins.',
    ],
    fixes: [
      'Durcissement RLS et endpoint Netlify associé aux groupes de conducteurs.',
    ],
  },
  {
    version: '1.10.13',
    date: '2026-03-22',
    title: 'SEO contenu maximal',
    summary: 'Réécriture profonde des pages métier pour améliorer clarté produit et maillage interne.',
    additions: [
      'Sections Cas d usage sur plusieurs pages transport.',
      'Scénarios avant/après concrets et maillage interne systématique.',
    ],
    modifications: [
      'H1, blocks problems, solutionPillars et keyFeatures retravaillés sur plusieurs verticales.',
    ],
    fixes: [],
  },
  {
    version: '1.10.12',
    date: '2026-03-21',
    title: 'Logistique multi-site et relais',
    summary: 'Appui fort sur la logistique terrain avec entrepôts, dépôts et rôle logisticien.',
    additions: [
      'Page Entrepôts et Dépôts avec GPS map picker et filtrage tenant.',
      'Relais transport avec onglet dédié, assignation ressources, statuts et historique.',
      'Rôle logisticien avec accès ciblés et simulateur métier.',
    ],
    modifications: [
      'Le menu ERP intègre une vraie section logistique.',
    ],
    fixes: [],
  },
]

function buildFallbackRelease(): ReleaseNote {
  return {
    version: APP_VERSION,
    date: BUILD_DATE,
    title: 'Version déployée automatiquement',
    summary: 'Cette version courante est injectée au build pour que la page Versions reflète toujours le push Netlify le plus récent.',
    additions: [
      'Numéro de version synchronisé automatiquement avec le build en cours.',
    ],
    modifications: [
      'Compléter le détail de cette version dans src/lib/releaseNotes.ts avant ou pendant le prochain push Netlify.',
    ],
    fixes: [],
  }
}

export const releaseNotes = documentedReleaseNotes.some(note => note.version === APP_VERSION)
  ? documentedReleaseNotes
  : [buildFallbackRelease(), ...documentedReleaseNotes]

export const latestReleaseNote = releaseNotes[0]