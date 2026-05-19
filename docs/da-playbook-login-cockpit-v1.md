# DA Playbook v1 - Login + Cockpit ERP

Date: 2026-05-08
Portee: appliquer une DA orientee B2B premium inspiree du niveau de lisibilite AKANEA, tout en renforcant les marqueurs NEXORA.

## 1) Objectif produit

- Clarifier la lecture metier en moins de 5 secondes (priorites visuelles evidentes)
- Augmenter la confiance (interface sobre, stable, solide)
- Garder une reconnaissance immediate NEXORA (meme sans logo)

## 2) Principes DA a respecter (non negociables)

1. Une hierarchie nette par ecran: H1, sous-titre, zone action, zone preuve
2. Densite maitrisee: moins d effets decoratifs, plus de signal metier
3. Un seul accent operationnel par ecran (pas de multicolore concurrent)
4. Contrastes robustes dans les 3 themes (light, dark, night)
5. Signature NEXORA visible via atmosphere de fond + badges + style des blocs KPI

## 3) Cartographie tokens (base existante)

Source: src/index.css

- Fonds: --background, --surface, --surface-soft, --surface-elevated
- Texte: --text-heading, --text, --text-secondary, --text-discreet
- Bordures: --border, --border-strong
- Marque: --primary, --primary-hover, --accent, --brand-gradient, --page-gradient
- Inputs: --input-bg, --input-text, --input-border, --input-border-focus, --input-placeholder
- Elevation: --shadow-card, --shadow-panel

Regle:
- Toute nouvelle couleur inline doit etre remplacee par un token.
- Si un token manque, on ajoute le token dans src/index.css avant usage composant.

## 4) Declinaison ecran Login

Fichier cible: src/pages/Login.tsx

### 4.1 Structure de reference

1. Colonne gauche (desktop): preuve metier + reassurance + image contexte
2. Colonne droite: formulaire tres lisible + actions primaires/secondaires
3. Bas formulaire: bloc confiance compact (3 preuves)

### 4.2 Ajustements visuels cibles

- Limiter les variations de bleu sur le formulaire a 1 axe principal (primary/accent)
- Harmoniser rayons: 10-12px sur champs et CTA, 16-20px sur blocs
- Uniformiser contrastes des labels/aides/placeholder via tokens texte
- Garder le hero immersif mais reduire la concurrence visuelle avec le form

### 4.3 Regles de composition

- H1 court et direct (1 a 3 mots)
- Sous-texte: une phrase utile, pas marketing generique
- Erreur: message actionnable, ton calme, sans jargon technique
- CTA principal: verbes operationnels (ex: Se connecter, Acceder a la demo)
- CTA secondaire: lien discret, jamais au meme niveau visuel que le primaire

### 4.4 Accessibilite et robustesse

- Focus visible clavier sur tous les champs et boutons
- Contraste minimum AA pour texte et elements interactifs
- Etats loading/success/error non ambigus
- Mobile: priorite formulaire, hero non bloquant

Definition of Done Login:
- Validation visuelle desktop + mobile
- Aucun hardcode couleur nouveau hors token
- Parcours login et reset complet sans regression

## 5) Declinaison ecran Home Cockpit (Dashboard ERP)

Fichier cible: src/pages/Dashboard.tsx

### 5.1 Intention UX

- Le cockpit doit donner la priorite metier en 3 niveaux:
  1. Situation immediate
  2. Decisions a prendre
  3. Exploration detaillee

### 5.2 Hierarchie visuelle cible

1. Bandeau haut: role courant + contexte + action personnaliser
2. Zone prioritaire: widgets critiques (colSpan full/half)
3. Zone approfondie: widgets secondaires
4. Zone personnalisation: claire, separee, non intrusive

### 5.3 Regles widgets

- Titres courts, orientes action
- Sous-titres explicites, sans redondance
- Etats vides utiles (quoi faire ensuite)
- Etats masque/ajoute clairs et consistants
- Taille widget: conserver la logique third/half/full et labels lisibles

### 5.4 Marqueurs NEXORA a maintenir

- Atmosphere de fond (page-gradient) presente mais discrete
- Elements de decision (cards KPI, alertes, badges) avec rendu net
- Micro-retours de personnalisation (drag/drop, selection) clairs et non agressifs

Definition of Done Cockpit:
- Lecture des priorites possible en moins de 5 secondes
- Personnalisation comprenable sans tutoriel
- Rendu coherent light/dark/night

## 6) Plan implementation rapide (sprint court)

1. Sprint A - Login
- Remplacer styles inline critiques par tokens
- Verrouiller palette et rayons
- Revue A11y du formulaire

2. Sprint B - Cockpit
- Renforcer bandeau de contexte role
- Recalibrer styles de personnalisation (selection, etat, badges)
- Nettoyer les ecarts de contraste

3. Sprint C - Stabilisation
- Tests critiques + captures avant/apres
- Ajustements finaux sur mobile

## 7) Metriques de validation

- Temps moyen de connexion percu (retour utilisateur)
- Taux erreur sur login/reset
- Taux usage personnalisation dashboard
- Satisfaction interne sur lisibilite cockpit

## 8) Livrables attendus par ecran

1. Capture avant
2. Capture apres
3. Liste des composants modifies
4. Liste des tokens utilises/ajoutes
5. Validation QA (fonctionnel + visuel + accessibilite)
