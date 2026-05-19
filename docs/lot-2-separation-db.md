# Lot 2 - Separation base de donnees: Platform / Tenant / App Core

Date: 2026-05-03
Statut: planifie
Prerequis: Lot 1 execute et valide

---

## Objectif global

Creer une isolation forte et progressive des donnees par perimetre.
Sans migration lourde dans un premier temps: isolation logique dans la base actuelle.
Puis separation physique par etapes selon la maturite produit.

---

## 1. Definition des 3 perimètres de données

### Périmètre Platform
- Comptes super admin (platform_admins)
- Catalogue modules globaux
- Facturation SaaS globale
- Audit plateforme (logs niveau plateforme)

### Périmètre Tenant
- Toutes les données métier d'une entreprise: OT, RH, flotte, planification, etc.
- Tables: profils, tenant_users, tenant_user_roles, roles, companies, services, vehicules, conducteurs, ordres_transport...
- Règle absolue: aucune table métier tenant lisible hors contexte tenant résolu.

### Périmètre App Core (technique web app)
- Sessions utilisateur
- Logs applicatifs
- Préférences UI non métier
- demo_access_requests

---

## 2. Lot 2A - Isolation stricte dans la base actuelle (sans changer d'infra)

Objectif: isolation forte dès maintenant, sans migration lourde.

### 2A.1 - Inventaire et classification des tables

Classer chaque table en: platform | tenant | app_core | shared

Livrable: fichier inventory-tables.md avec colonnes:
- table_name
- schema_actuel
- perimetre_cible (platform/tenant/app_core)
- company_id present (oui/non)
- RLS actif (oui/non)
- action requise

### 2A.2 - company_id obligatoire sur toutes les tables tenant

Pour chaque table classifiée "tenant":
1. Vérifier que company_id est present et NOT NULL.
2. Backfill des lignes sans company_id (valeur DEFAULT_COMPANY_ID si migration legacy).
3. Ajouter contrainte NOT NULL si absente.
4. Mettre à jour les indexes si nécessaire.

Critère de done: 0 ligne tenant sans company_id.

### 2A.3 - RLS obligatoire sur toutes les tables tenant

Pour chaque table classifiée "tenant":
1. Activer RLS (ALTER TABLE ... ENABLE ROW LEVEL SECURITY).
2. Créer policy SELECT: auth.uid() lié à tenant ayant company_id = table.company_id.
3. Créer policy INSERT/UPDATE/DELETE: même vérification.
4. Documenter les exceptions (tables en lecture publique intentionnelle).

Règle: aucune table tenant sans RLS actif en production.

### 2A.4 - Audit des fonctions SECURITY DEFINER

1. Lister toutes les fonctions SECURITY DEFINER.
2. Vérifier que chaque fonction impose un tenant_context en paramètre.
3. Supprimer ou refactoriser celles qui bypasse l'isolation.
4. Interdire toute nouvelle fonction SECURITY DEFINER sans revue.

### 2A.5 - Refactor backend: 0 requête sans contexte tenant

1. Auditer toutes les netlify functions: repérer les requêtes sans .eq('company_id', ...).
2. Pour chaque manque: ajouter le filtre ou rejeter avec 400 si contexte manquant.
3. Ajouter un helper assertTenantContext() dans _lib/v11-core.js.
4. Aucun merge autorisé sans review du filtre tenant.

---

## 3. Lot 2B - Séparation logique Platform vs Tenant dans la base

Objectif: frontière logique nette sans migration infra.

### 3B.1 - Création des schémas Supabase

```sql
CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS tenant;
CREATE SCHEMA IF NOT EXISTS app_core;
```

### 3B.2 - Migration des tables par schéma

Ordre de migration:
1. Tables platform (faible dépendance métier): platform_admins, modules_catalogue, billing_saas...
2. Tables app_core: sessions, logs, demo_access_requests...
3. Tables tenant (critique, à faire en dernier après validation):
   - profils, tenant_users, tenant_user_roles, roles, companies, services...
   - conserver les FK et indexes existants
   - mettre à jour les vues si nécessaire

### 3B.3 - Interdire les jointures cross-schéma directes

1. Documenter les jointures cross-schéma existantes.
2. Remplacer par des appels via services autorisés (fonctions ou APIs internes).
3. Ajouter un test automatique qui détecte les jointures cross-schéma non autorisées.

Règle: platform ne lit jamais tenant directement. tenant ne lit jamais platform directement.

---

## 4. Lot 2C - Séparation physique (étape suivante, optionnelle court terme)

Objectif: réduire blast radius.

### Architecture cible

```
DB Platform  (projet Supabase dédié)
  - platform_admins
  - modules_catalogue
  - billing_saas
  - audit_platform

DB Tenant Hub  (projet Supabase dédié)
  - toutes les tables tenant.*
  - Auth centralisé ou fédéré selon contrainte produit
```

### Contraintes à résoudre avant split

1. Auth: Supabase Auth est par projet. Définir Auth centralisé ou JWT fédéré.
2. Migrations: les FK cross-DB doivent être supprimées ou transformées en appels API.
3. RLS: chaque projet gère ses propres policies.
4. Rollback: prévoir un plan si le split doit être annulé.

Condition de déclenchement: atteindre 10+ tenants actifs ou exigence conformité client.

---

## 5. Option cible premium: un tenant = une base

Pour tenants sensibles / enterprise.

- Base Supabase dédiée par tenant.
- Chiffrement, sauvegardes, rétention et restauration par tenant.
- Tenant registry (table de routage: tenant_slug → db_connection_string).
- Routage dynamique au runtime dans les netlify functions.
- Provisioning automatisé à la création tenant.

Condition de déclenchement: premier contrat enterprise ou exigence RGPD/ISO 27001 explicite.

---

## 6. Plan de migration progressif (ordre des étapes)

| Etape | Action | Lot |
|-------|--------|-----|
| 1 | Inventaire et classification tables | 2A.1 |
| 2 | Ajout company_id manquant + backfill | 2A.2 |
| 3 | RLS obligatoire sur tables tenant | 2A.3 |
| 4 | Audit fonctions SECURITY DEFINER | 2A.4 |
| 5 | Refactor backend 0 requête sans tenant context | 2A.5 |
| 6 | Création schémas platform/tenant/app_core | 2B.1 |
| 7 | Migration tables par schéma | 2B.2 |
| 8 | Interdiction jointures cross-schéma | 2B.3 |
| 9 | Split DB platform vs tenant (optionnel) | 2C |
| 10 | Tenant dédié par client enterprise (optionnel) | premium |

---

## 7. Contrôles anti-régression obligatoires

### Tests automatiques (à implémenter dès Lot 2A)

| Test | Description | Résultat attendu |
|------|-------------|-----------------|
| T1 | Tenant A ne lit jamais les données Tenant B | 0 ligne retournée cross-tenant |
| T2 | Super admin hors impersonation ne lit aucune donnée métier | 403 systématique |
| T3 | Création user = auth + profil + tenant_users + tenant_user_roles atomique | 0 orphelin |
| T4 | Requête sans filtre company_id sur table tenant | Rejetée en erreur |
| T5 | Jointure cross-schéma non autorisée | Bloquée par policy ou test |

### KPI lot 2

- 0 fuite inter-tenant mesurée.
- 0 compte orphelin.
- 100% tables tenant avec company_id NOT NULL.
- 100% tables tenant avec RLS actif.
- 0 fonction SECURITY DEFINER sans revue.

---

## 8. Gouvernance et exploitation

- Clés de service séparées platform/tenant (dès Lot 2C).
- Logs d'accès avec tenant_id obligatoire dans toutes les fonctions.
- Sauvegarde/restauration testée par périmètre.
- Procédure d'incident: isolation immédiate d'un tenant sans couper toute la plateforme.
- Propriétaire de chaque schéma désigné (platform owner ≠ tenant owner).

---

## 9. Definition of Done - Lot 2A (minimal immédiat)

1. Inventaire tables classifié et validé.
2. 100% tables tenant avec company_id NOT NULL.
3. 100% tables tenant avec RLS actif et testé.
4. 0 fonction backend sans contexte tenant sur les endpoints métier.
5. Tests T1, T2, T3 passants.

## Definition of Done - Lot 2B (schémas séparés)

1. Schémas platform, tenant, app_core créés.
2. Tables migrées dans le bon schéma.
3. 0 jointure cross-schéma directe non autorisée.
4. Tests T4, T5 passants.
