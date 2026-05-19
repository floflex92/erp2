# Regles Agents du Projet

- Ce document reprend le meme socle de regles que `AGENTS.md` et doit rester strictement aligne avec lui.
- Ces regles s'appliquent a Claude Code, GitHub Copilot, Codex de ChatGPT et a tout autre agent intervenant sur ce repo.
- En cas de divergence, `AGENTS.md` fait foi.

## 1) Netlify (regle critique)

- Interdiction de pousser ou deployer sur Netlify sans demande explicite de l'utilisateur dans la conversation en cours.
- Interdit par defaut :
  - `netlify deploy`
  - `netlify init`
  - `netlify link`
  - `git push <netlify-remote> ...`
- Si une action Netlify est demandee, confirmer que la demande est explicite et actuelle avant execution.
- Si un push Netlify est explicitement demande, faire avant le push :
  - la mise a jour de version selon les regles de versioning du projet
  - la mise a jour de l'onglet `Developpement` dans `Reglages`
- Le push Netlify reste toujours supervise et interdit sans demande explicite actuelle de l'utilisateur.

## 2) Langue du logiciel

- Le logiciel doit etre uniquement en francais.
- Ne pas ajouter de systeme de traduction / i18n sauf demande explicite de l'utilisateur.

## 3) Nommage des environnements

- L'environnement local doit etre nomme `serv dev`.
- L'environnement Netlify (production) doit etre nomme `serv prod`.

## 4) Versioning des deploiements

- Version actuelle de reference : `1.2.0`.
- L'incrementation de version se fait uniquement au moment du deploiement Netlify (`serv prod`), pas avant.
- Aucun bump de version pendant le travail local (`serv dev`) ni au simple push Git.
- Priorite des increments : `+1` est plus important que `+0.1`, et `+0.1` est plus important que `+0.01`.
- Type `+1` (MAJEUR) :
  - Rupture de compatibilite, gros changement d'architecture, suppression/modification non compatible.
  - Effet de version : incrementer `MAJOR`, remettre `MINOR` et `PATCH` a 0.
- Type `+0.1` (MINEUR) :
  - Nouvelle fonctionnalite compatible, evolution metier importante sans rupture.
  - Effet de version : incrementer `MINOR`, remettre `PATCH` a 0.
- Type `+0.01` (CORRECTIF) :
  - Bugfix, ajustement UI/UX mineur, optimisation ou petite correction sans nouvelle fonctionnalite majeure.
  - Effet de version : incrementer `PATCH`.
- Si un meme lot contient plusieurs types de changements, appliquer le niveau le plus eleve.

## 5) Garde-fous operationnels

### Git securite
- Interdit sans accord explicite de l'utilisateur :
  - `git reset --hard`
  - `git clean -fd`
  - `git push --force`

### Portee des changements
- Modifier uniquement les fichiers lies a la demande.
- Ne jamais lancer de refactor large sans validation explicite.

### Validation obligatoire
- Avant de terminer, lancer tests + build (+ lint si disponible).
- Si une verification ne peut pas etre executee, le signaler explicitement dans le compte-rendu final.

### Base de donnees
- Toute migration doit etre reversible.
- Interdiction de suppression de donnees en production sans accord explicite.
- Les actions Supabase et les commandes de run liees au projet sont autorisees en autonomie quand elles sont necessaires a la demande.
- Le push Supabase effectif est autorise en autonomie pour tous les agents du repo des lors que la sequence `supabase migration list` puis `supabase db push --dry-run` est propre.
- Pour toute nouvelle migration Supabase ajoutee, conserver obligatoirement cette methode avant push :
  - `supabase migration list`
  - puis `supabase db push --dry-run`
  - puis seulement le push effectif si le dry-run est propre

### Secrets
- Interdiction de committer des secrets (`.env`, tokens, cles).
- Utiliser uniquement des variables d'environnement pour les informations sensibles.

### Dependances
- Ne pas ajouter de dependance sans raison claire (taille, maintenance, securite).

### Actions irreversibles
- Toute action destructive ou externe (deploy, push distant, suppression) exige une confirmation explicite dans la conversation en cours.

### Compte-rendu final
- Toujours fournir :
  - fichiers modifies
  - commandes lancees
  - resultats de validation
  - risques restants

## 6) Mode de travail par defaut (obligatoire)

- Ne pas demander de prompt supplementaire: appliquer directement ces regles de base a chaque nouvelle conversation sur ce repo.
- Au debut de chaque demande:
  - reformuler l'objectif en 2 a 4 lignes
  - proposer un plan court
- Pendant l'execution:
  - privilegier des changements a impact minimal
  - rester strictement dans le perimetre demande
- En fin de demande:
  - fournir le compte-rendu final defini dans la section "Compte-rendu final"
- Les operations Supabase utiles peuvent etre executees sans validation supplementaire.
- Si un dry-run Supabase est propre, le push reel correspondant doit etre execute sans demander de confirmation supplementaire.
- Les operations Netlify restent exclues de cette autonomie et exigent une demande explicite de l'utilisateur.

## 7) Definition d'agents personnalisés
- Pour ce projet, un agent de support a été ajouté : `task-manager-helper` dans `.agent.md`.
- Fichier Copilot custom instructions : `.copilot-instructions.md`.
- Si des agents supplémentaires sont nécessaires, documenter dans `AGENTS.md` avec: nom, rôle, commandes, et scope.
