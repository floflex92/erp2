# Checklist review visuelle DA (ERP)

Usage: appliquer cette checklist a chaque ecran migre (Login, Dashboard, modules metier).

## A) Lisibilite immediate

- [ ] Le titre principal est visible instantanement
- [ ] La priorite 1 metier est identifiable en moins de 5 secondes
- [ ] Les actions principales sont clairement separees des secondaires
- [ ] Le texte utile est concise et sans bruit marketing

## B) Cohesion visuelle

- [ ] Toutes les couleurs proviennent de tokens
- [ ] Les rayons sont coherents avec le systeme (champs, cards, modales)
- [ ] Les ombres sont homogenes (pas de mix arbitraire)
- [ ] Les icones suivent un style unique (epaisseur, arrondis, ton)

## C) Signature NEXORA

- [ ] Atmosphere de page conforme (fond/gradient discret et reconnaissable)
- [ ] Zones de pilotage KPI ont un rendu distinctif NEXORA
- [ ] Badges statut ont un pattern visuel constant
- [ ] L ecran reste identifiable NEXORA meme sans logo

## D) Ergonomie metier

- [ ] Les informations critiques sont au-dessus de la ligne de flottaison
- [ ] Les etats vides expliquent quoi faire ensuite
- [ ] Les etats erreur sont actionnables
- [ ] Les libelles sont metier et comprehensibles par role

## E) Accessibilite

- [ ] Focus clavier visible sur tous les controles interactifs
- [ ] Contraste texte/fond conforme AA minimum
- [ ] Les formulaires ont labels explicites
- [ ] Les status loading/success/error sont comprehensibles sans couleur seule

## F) Responsive

- [ ] Desktop: la hierarchie reste stable
- [ ] Tablet: aucun bloc critique coupe
- [ ] Mobile: action principale toujours accessible sans friction
- [ ] Aucune superposition genante (modale, dropdown, sticky)

## G) Qualite implementation

- [ ] Pas de hardcode couleur nouveau hors token
- [ ] Pas de duplication de styles evitables
- [ ] Regressions visuelles controlees par captures avant/apres
- [ ] Tests critiques passes (login/navigation/dashboard)

## H) Validation finale

- [ ] Revue interne produit validee
- [ ] Revue metier (role cible) validee
- [ ] Commentaires restants convertis en tickets
- [ ] Ecran eligible a deploiement
