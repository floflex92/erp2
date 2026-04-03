import type { ReactNode } from 'react'

export type HomePainPoint = {
  title: string
  description: string
}

export type HomeBenefit = {
  title: string
  description: string
}

export type HomeFeature = {
  title: string
  description: string
  icon: ReactNode
}

export type HomeWorkflowStep = {
  title: string
  description: string
}

export type HomeProofStat = {
  value: string
  label: string
  note: string
}

export const homePainPoints: HomePainPoint[] = [
  {
    title: 'Planning chaotique',
    description: 'Les changements de mission en cascade vous font perdre du temps.',
  },
  {
    title: 'Erreurs coûteuses',
    description: 'La double saisie crée des litiges, des retards et des coûts cachés.',
  },
  {
    title: 'Perte de rentabilité',
    description: 'Sans vision précise des marges, vous pilotez à l’aveugle.',
  },
  {
    title: 'Manque de vision globale',
    description: 'Planning, flotte et finance restent dispersés dans plusieurs outils.',
  },
]

export const homeBenefits: HomeBenefit[] = [
  {
    title: 'Centralisez vos opérations',
    description: 'Un seul écran pour le planning, la flotte, les conducteurs et la finance.',
  },
  {
    title: 'Automatisez ce qui ralentit',
    description: 'Réduisez la saisie manuelle et accélérez vos décisions.',
  },
  {
    title: 'Simplifiez l’exploitation',
    description: 'Des process clairs et des informations fiables pour agir vite.',
  },
  {
    title: 'Pilotez la rentabilité',
    description: 'Identifiez vite ce qui rapporte et ce qui coûte.',
  },
]

export const homeWorkflow: HomeWorkflowStep[] = [
  {
    title: 'Créer la mission',
    description: 'Créez l’ordre avec les contraintes clés en quelques clics.',
  },
  {
    title: 'Planifier intelligemment',
    description: 'Affectez les ressources selon charge, disponibilité et priorité.',
  },
  {
    title: 'Suivre en temps réel',
    description: 'Suivez l’avancement et anticipez les écarts immédiatement.',
  },
  {
    title: 'Analyser la performance',
    description: 'Mesurez les coûts et la qualité pour décider vite.',
  },
  {
    title: 'Facturer sans friction',
    description: 'Transformez l’exécution en facturation fiable et traçable.',
  },
]

export const homeProofStats: HomeProofStat[] = [
  {
    value: '-31%',
    label: 'de temps passé sur le planning',
    note: 'simulation réaliste sur une PME transport de 38 véhicules',
  },
  {
    value: '+14%',
    label: 'de marge opérationnelle',
    note: 'grâce au pilotage mission par mission des coûts et revenus',
  },
  {
    value: '1 cockpit',
    label: 'pour toute votre exploitation',
    note: 'de la mission à la facturation sans rupture de données',
  },
]
