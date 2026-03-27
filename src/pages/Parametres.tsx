import { Link } from 'react-router-dom'
import { useAuth, ROLE_LABELS, canAccess, type Role } from '@/lib/auth'

type SettingSection = {
  id: string
  title: string
  description: string
  roles: Role[]
  accent: string
  actions: Array<{
    label: string
    detail: string
    to?: string
  }>
}

const SECTIONS: SettingSection[] = [
  {
    id: 'session',
    title: 'Compte et session',
    description: "Reglages visibles par tous les profils pour suivre la session ouverte dans l'ERP.",
    roles: ['admin', 'dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable'],
    accent: 'from-slate-900 to-slate-800',
    actions: [
      { label: 'Type de session actif', detail: "Verifier le profil actuellement utilise dans l'application." },
      { label: 'Informations personnelles', detail: 'Nom, prenom et acces associes au compte courant.' },
    ],
  },
  {
    id: 'exploitation',
    title: 'Exploitation',
    description: "Parametres pour piloter le planning, les OT et la disponibilite des ressources d'exploitation.",
    roles: ['admin', 'dirigeant', 'exploitant'],
    accent: 'from-blue-900 to-blue-700',
    actions: [
      { label: 'Planning et affectations', detail: 'Reglages des flux de travail, affectations et priorites terrain.' },
      { label: 'Ordres de transport', detail: 'Standards de saisie, statuts et suivi operationnel.' },
    ],
  },
  {
    id: 'flotte',
    title: 'Flotte et maintenance',
    description: 'Reglages lies aux vehicules, remorques, tachygraphe et maintenance.',
    roles: ['admin', 'dirigeant', 'exploitant', 'mecanicien'],
    accent: 'from-orange-900 to-orange-700',
    actions: [
      { label: 'Suivi vehicules', detail: 'Visibilite sur disponibilite, entretien et documents techniques.' },
      { label: 'Tachygraphe', detail: 'Regles de suivi et controle des activites conducteurs.' },
    ],
  },
  {
    id: 'commercial',
    title: 'Commercial et clients',
    description: 'Reglages concernant la relation client, les donnees commerciales et les offres.',
    roles: ['admin', 'dirigeant', 'commercial'],
    accent: 'from-emerald-900 to-emerald-700',
    actions: [
      { label: 'Base clients', detail: 'Organisation des comptes clients, contacts et informations de facturation.' },
      { label: 'Flux commercial', detail: 'Suivi des opportunites, informations de vente et priorites commerciales.' },
    ],
  },
  {
    id: 'finance',
    title: 'Facturation et finance',
    description: 'Reglages utiles a la facturation, aux echeances et au suivi des paiements.',
    roles: ['admin', 'dirigeant', 'commercial', 'comptable'],
    accent: 'from-violet-900 to-violet-700',
    actions: [
      { label: 'Factures et echeances', detail: 'Controle des statuts de facture et des delais de paiement.' },
      { label: 'Suivi financier', detail: 'Visibilite sur les montants, encours et relances.' },
    ],
  },
  {
    id: 'users',
    title: 'Utilisateurs et droits',
    description: "Section reservee aux roles qui peuvent gerer les comptes et attribuer les types de session.",
    roles: ['admin', 'dirigeant'],
    accent: 'from-yellow-700 to-amber-500',
    actions: [
      { label: 'Creer un compte', detail: "Ajouter un nouvel utilisateur et definir son type de session.", to: '/utilisateurs' },
      { label: 'Attribuer les droits', detail: 'Modifier le type de session et les informations de profil.', to: '/utilisateurs' },
    ],
  },
]

function canSeeSection(role: Role | null, section: SettingSection) {
  return role ? section.roles.includes(role) : false
}

export default function Parametres() {
  const { role, sessionRole, isAdmin, profil } = useAuth()

  const visibleSections = SECTIONS.filter(section => canSeeSection(role, section))
  const assignedRole = profil?.role ?? null
  const modeLabel = role ? ROLE_LABELS[role] : 'Session inconnue'
  const assignedLabel = assignedRole ? ROLE_LABELS[assignedRole] : 'Non defini'

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Parametres</p>
            <h2 className="mt-2 text-3xl font-bold">Reglages par type de session</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Les blocs affiches ici dependent du type de session ouvert dans l&apos;application.
              Un exploitant ne voit pas les reglages reserves a l&apos;administration des comptes.
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-white/5 px-4 py-3 text-sm">
            <div className="text-slate-400">Session active</div>
            <div className="mt-1 text-lg font-semibold">{modeLabel}</div>
            <div className="mt-2 text-xs text-slate-400">
              Profil attribue : <span className="text-slate-200">{assignedLabel}</span>
            </div>
            {isAdmin && sessionRole && (
              <div className="mt-1 text-xs text-yellow-300">
                Mode simulation admin actif
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {visibleSections.map(section => (
          <section key={section.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className={`bg-gradient-to-r ${section.accent} px-5 py-4 text-white`}>
              <h3 className="text-lg font-semibold">{section.title}</h3>
              <p className="mt-1 text-sm text-white/80">{section.description}</p>
            </div>
            <div className="space-y-3 p-5">
              {section.actions.map(action => (
                <div key={action.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                      <p className="mt-1 text-sm text-slate-500">{action.detail}</p>
                    </div>
                    {action.to && canAccess(role, action.to.replace('/', '')) && (
                      <Link
                        to={action.to}
                        className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700"
                      >
                        Ouvrir
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {!canAccess(role, 'utilisateurs') && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-800">Acces restreints</h3>
          <p className="mt-2 text-sm text-slate-500">
            Ce type de session ne donne pas acces a la gestion des comptes, a la creation de nouveaux utilisateurs
            ni aux reglages reserves a l&apos;administration.
          </p>
        </div>
      )}
    </div>
  )
}
