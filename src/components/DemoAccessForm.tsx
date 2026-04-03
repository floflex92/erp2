import { useState } from 'react'
import NexoraTruckLogo from '@/components/layout/NexoraTruckLogo'

interface FormData {
  prenom: string
  nom: string
  email: string
  telephone: string
  objectif: string
  description: string
  nom_entreprise: string
  secteur_activite: string
  nombre_salaries: string
}

interface CredentialsResponse {
  email: string
  password: string
}

const OBJECTIFS = [
  'Évaluer la plateforme',
  'Tester une fonctionnalité spécifique',
  'Présentation interne',
  'Démonstration client',
  'Intégration API',
  'Autre',
]

const SECTEURS = [
  'Transport routier',
  'Logistique',
  'Affrètement',
  'Groupage',
  'Express/Colis',
  'Déménagement',
  'Construction',
  'Autre',
]

const TAILLES = [
  '1-5 salariés',
  '5-20 salariés',
  '20-50 salariés',
  '50-100 salariés',
  '100+ salariés',
]

export default function DemoAccessForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState<FormData>({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    objectif: '',
    description: '',
    nom_entreprise: '',
    secteur_activite: '',
    nombre_salaries: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [credentials, setCredentials] = useState<CredentialsResponse | null>(null)
  const [passwordCopied, setPasswordCopied] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.currentTarget
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation minimale
    if (!formData.prenom.trim() || !formData.nom.trim() || !formData.email.trim() || !formData.objectif) {
      setError('Veuillez remplir les champs obligatoires.')
      setLoading(false)
      return
    }

    try {
      // Appeler la fonction Netlify pour créer le compte
      const response = await fetch('/.netlify/functions/demo-access-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: formData.prenom.trim(),
          nom: formData.nom.trim(),
          email: formData.email.trim().toLowerCase(),
          telephone: formData.telephone.trim() || null,
          objectif: formData.objectif,
          description: formData.description.trim() || null,
          nom_entreprise: formData.nom_entreprise.trim() || null,
          secteur_activite: formData.secteur_activite || null,
          nombre_salaries: formData.nombre_salaries || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du compte')
      }

      if (data.account_created && data.credentials) {
        setCredentials(data.credentials)
      }
      
      setSuccess(true)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Une erreur inattendue s\'est produite.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-8">
            <div className="mb-4 text-4xl">✓</div>
            <h2 className="text-xl font-semibold text-white mb-2">Compte créé avec succès!</h2>
            <p className="text-sm text-slate-300 mb-6">
              Vos identifiants vous permettront d'accéder à la plateforme complète.
            </p>

            {credentials && (
              <div className="space-y-4 mb-6 text-left">
                <div className="rounded-xl bg-slate-900/50 p-4 border border-slate-700">
                  <p className="text-xs font-semibold text-slate-400 mb-1">Email</p>
                  <p className="text-sm font-mono text-emerald-400">{credentials.email}</p>
                </div>

                <div className="rounded-xl bg-slate-900/50 p-4 border border-slate-700">
                  <p className="text-xs font-semibold text-slate-400 mb-1">Mot de passe</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-emerald-400 flex-1 overflow-hidden truncate">
                      {credentials.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(credentials.password)
                        setPasswordCopied(true)
                        setTimeout(() => setPasswordCopied(false), 2000)
                      }}
                      className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition"
                    >
                      {passwordCopied ? '✓' : 'Copier'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={onSuccess}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 transition"
            >
              Aller à la connexion
            </button>

            <p className="text-xs text-slate-400 mt-4">
              Vous serez automatiquement connecté avec ces identifiants
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <NexoraTruckLogo dark size="md" />
          </div>
          <h1 className="text-3xl font-semibold text-white">Accédez à la plateforme</h1>
          <p className="mt-3 text-slate-300">
            Remplissez ce formulaire pour accéder à une démonstration complète de NEXORA Truck
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-white/5 p-8 space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Identité */}
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 mb-3">
              Votre identité
            </legend>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prenom" className="text-sm font-medium text-slate-200 block mb-2">
                  Prénom *
                </label>
                <input
                  type="text"
                  id="prenom"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  placeholder="Jean"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition"
                />
              </div>
              <div>
                <label htmlFor="nom" className="text-sm font-medium text-slate-200 block mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  id="nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Dupont"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition"
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="email" className="text-sm font-medium text-slate-200 block mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="jean.dupont@entreprise.fr"
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition"
              />
            </div>
            <div className="mt-4">
              <label htmlFor="telephone" className="text-sm font-medium text-slate-200 block mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                placeholder="+33 6 12 34 56 78"
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition"
              />
            </div>
          </fieldset>

          {/* Contexte */}
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 mb-3">
              Votre visite
            </legend>
            <div>
              <label htmlFor="objectif" className="text-sm font-medium text-slate-200 block mb-2">
                Qu'est-ce que vous cherchez? *
              </label>
              <select
                id="objectif"
                name="objectif"
                value={formData.objectif}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition"
              >
                <option value="">Sélectionnez un objectif</option>
                {OBJECTIFS.map(obj => (
                  <option key={obj} value={obj}>
                    {obj}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4">
              <label htmlFor="description" className="text-sm font-medium text-slate-200 block mb-2">
                Dites-nous plus (optionnel)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Je souhaite tester le planning intelligent..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition resize-none"
              />
            </div>
          </fieldset>

          {/* Entreprise */}
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 mb-3">
              Votre entreprise
            </legend>
            <div>
              <label htmlFor="nom_entreprise" className="text-sm font-medium text-slate-200 block mb-2">
                Nom
              </label>
              <input
                type="text"
                id="nom_entreprise"
                name="nom_entreprise"
                value={formData.nom_entreprise}
                onChange={handleChange}
                placeholder="SARL Transport Dupont"
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition"
              />
            </div>
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="secteur_activite" className="text-sm font-medium text-slate-200 block mb-2">
                  Secteur
                </label>
                <select
                  id="secteur_activite"
                  name="secteur_activite"
                  value={formData.secteur_activite}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition"
                >
                  <option value="">Sélectionnez un secteur</option>
                  {SECTEURS.map(secteur => (
                    <option key={secteur} value={secteur}>
                      {secteur}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="nombre_salaries" className="text-sm font-medium text-slate-200 block mb-2">
                  Taille
                </label>
                <select
                  id="nombre_salaries"
                  name="nombre_salaries"
                  value={formData.nombre_salaries}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition"
                >
                  <option value="">Sélectionnez une taille</option>
                  {TAILLES.map(taille => (
                    <option key={taille} value={taille}>
                      {taille}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-2xl transition-all"
          >
            {loading ? 'Enregistrement...' : 'Accéder à la plateforme'}
          </button>

          <p className="text-center text-xs text-slate-400 mt-4">
            * Champs obligatoires. Vos données sont sécurisées et utilisées uniquement pour améliorer NEXORA Truck.
          </p>
        </form>
      </div>
    </div>
  )
}
