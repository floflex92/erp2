# Lot 1 - Securite immediate: isolation tenant et separation web app

Date: 2026-05-03
Statut: pret a executer
Portee: web app uniquement (frontend + netlify functions + supabase)

## Objectif

Bloquer immediatement les fuites inter-tenant et separer clairement:
- plateforme web app (super admin)
- espace tenant metier
- donnees techniques application

Ce lot ne change pas encore l infrastructure physique. Il impose une isolation forte dans la base actuelle.

## Resultat attendu

1. Aucun acces cross-tenant en lecture ou ecriture.
2. Super admin hors impersonation sans acces metier tenant.
3. Creation utilisateur atomique: auth user + profil + tenant_users + tenant_user_roles.
4. Logs d erreur exploitables en moins de 5 minutes.

## Perimetre technique

### Backend web app

- Netlify functions v11:
  - v11-tenant-admin
  - admin-users
  - _lib/v11-core

### Frontend web app

- Routage et guards:
  - App.tsx
  - RequireAuth.tsx
  - Sidebar.tsx
  - auth.tsx

### Base Supabase

- Tables auth/metier multi-tenant:
  - profils
  - tenant_users
  - tenant_user_roles
  - roles
  - companies
  - platform_admins

## Plan d execution (ordre obligatoire)

### Etape 1 - Cadrage des regles de securite

1. Definir les invariants non negociables:
   - Toute requete metier est scopee par tenant.
   - Tout compte metier possede un tenant_users actif.
   - Super admin agit en metier seulement via impersonation.
2. Valider la matrice des acteurs:
   - platform_admin
   - tenant_admin (admin/dirigeant)
   - utilisateur tenant standard

Sortie etape 1:
- Document de regles valide par backend + produit.

### Etape 2 - Verrouillage creation utilisateur

1. Imposer un flux unique de creation dans les fonctions admin.
2. Rendre obligatoire la synchronisation:
   - insertion auth user
   - insertion profil
   - upsert tenant_users
   - upsert tenant_user_roles
3. En cas d echec partiel, rollback complet.
4. Ajouter un message erreur normalise par etape (AUTH, PROFIL, MEMBERSHIP, ROLE_LINK).

Sortie etape 2:
- 0 utilisateur orphelin sur tests manuels et QA.

### Etape 3 - Isolation stricte tenant dans les endpoints

1. Interdire toute operation metier sans contexte tenant resolu.
2. Dans les endpoints critiques, verifier explicitement:
   - companyId autorise
   - role autorise
   - coherence user/tenant
3. Ajouter une garde centralisee reutilisable dans _lib/v11-core.

Sortie etape 3:
- Chaque endpoint metier echoue proprement sans tenant context.

### Etape 4 - Separation parcours super admin

1. Conserver un parcours plateforme dedie.
2. Hors impersonation:
   - redirection forcee vers espace plateforme
   - aucun acces pages metier tenant
3. En impersonation:
   - acces metier possible sur tenant cible
   - sortie impersonation ramene a plateforme

Sortie etape 4:
- Plus de melange super admin dans tenant test par defaut.

### Etape 5 - Observabilite minimale

1. Ajouter un correlation_id par creation utilisateur.
2. Logger les etapes critiques avec tenant_id et user_id.
3. Ajouter un endpoint simple de diagnostic de consistance utilisateur.

Sortie etape 5:
- Un incident creation est tracable de bout en bout.

## Checklist implementation

### Backend

1. Harmoniser les validations dans v11-tenant-admin et admin-users.
2. Factoriser la logique ensureTenantMembership si dupliquee.
3. Uniformiser les codes HTTP et messages de retour.
4. Refuser toute creation si tenant introuvable ou role introuvable sans fallback explicite.

### Frontend

1. Bloquer les routes metier pour super admin non impersonne.
2. Afficher un message clair si creation echoue a l etape membership.
3. Rafraichir la liste utilisateurs apres creation reussie uniquement.

### SQL/RLS

1. Verifier les policies des tables tenant_users et tenant_user_roles.
2. Verifier les fonctions de resolution:
   - get_active_role
   - get_user_role
   - get_user_tenants
3. Ajouter les tests anti fuite inter-tenant.

## Tests d acceptance

### Cas 1 - Creation conducteur valide

1. Creer un conducteur depuis tenant admin.
2. Verifier presence dans:
   - auth.users
   - profils
   - tenant_users
   - tenant_user_roles
3. Verifier affichage dans liste utilisateurs tenant.

### Cas 2 - Role invalide

1. Soumettre role inconnu.
2. Verifier erreur 400 claire.
3. Verifier absence totale de creation partielle.

### Cas 3 - Super admin hors impersonation

1. Login super admin.
2. Verifier redirection plateforme.
3. Verifier impossibilite d ouvrir une route metier tenant.

### Cas 4 - Isolation inter-tenant

1. Creer tenant A et tenant B.
2. Login utilisateur tenant A.
3. Verifier impossibilite de lire/modifier donnees tenant B.

## KPI lot 1

1. Taux comptes orphelins: 0.
2. Taux erreurs creation non qualifiees: < 5%.
3. Incidents cross-tenant: 0.
4. Duree diagnostic incident creation: < 5 min.

## Definition of Done

1. Flux creation utilisateur atomique prouve en QA.
2. Guards tenant actifs sur endpoints critiques.
3. Parcours super admin separe hors impersonation.
4. Logs et erreurs exploitables en production.
5. Plan de passage lot 2 valide (separation schema puis separation physique).
