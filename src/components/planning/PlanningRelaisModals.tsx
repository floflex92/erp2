import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Conducteur, RelaisAssignForm, RelaisDepotForm, RelaisModal, Vehicule } from '@/pages/planning/planningTypes'

type RelaisDepotSite = {
  id: string
  nom: string
  ville: string | null
  adresse: string | null
}

type Props = {
  relaisModal: RelaisModal
  relaisDepotForm: RelaisDepotForm
  setRelaisDepotForm: Dispatch<SetStateAction<RelaisDepotForm>>
  relaisAssignForm: RelaisAssignForm
  setRelaisAssignForm: Dispatch<SetStateAction<RelaisAssignForm>>
  relaisSaving: boolean
  relaisDepotSites: RelaisDepotSite[]
  conducteurs: Conducteur[]
  vehicules: Vehicule[]
  onClose: () => void
  onSubmitRelaisDepot: (event: FormEvent<HTMLFormElement>) => void
  onSubmitRelaisAssign: (event: FormEvent<HTMLFormElement>) => void
}

export default function PlanningRelaisModals({
  relaisModal,
  relaisDepotForm,
  setRelaisDepotForm,
  relaisAssignForm,
  setRelaisAssignForm,
  relaisSaving,
  relaisDepotSites,
  conducteurs,
  vehicules,
  onClose,
  onSubmitRelaisDepot,
  onSubmitRelaisAssign,
}: Props) {
  if (!relaisModal.mode) return null

  return (
    <>
      {(relaisModal.mode === 'depot' || relaisModal.mode === 'relais_conducteur') && relaisModal.ot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[160] p-4" onClick={onClose}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">
                {relaisModal.mode === 'relais_conducteur' ? 'Relais conducteur' : 'Deposer en entrepot / depot'}
              </h3>
              <p className="text-xs text-muted mt-0.5">Course {relaisModal.ot.reference} - {relaisModal.ot.client_nom}</p>
            </div>
            <form onSubmit={onSubmitRelaisDepot} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Site connu (optionnel)</label>
                <select
                  value={relaisDepotForm.site_id}
                  onChange={event => {
                    const site = relaisDepotSites.find(item => item.id === event.target.value)
                    setRelaisDepotForm(current => ({
                      ...current,
                      site_id: event.target.value,
                      lieu_nom: site?.nom ?? current.lieu_nom,
                      lieu_adresse: site?.adresse ?? current.lieu_adresse,
                    }))
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">- Saisie libre -</option>
                  {relaisDepotSites.map(site => (
                    <option key={site.id} value={site.id}>{site.nom}{site.ville ? ` (${site.ville})` : ''}</option>
                  ))}
                </select>
              </div>

              {!relaisDepotForm.site_id && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {relaisModal.mode === 'relais_conducteur' ? 'Point de rendez-vous (optionnel)' : 'Nom du depot *'}
                    </label>
                    <input
                      required={relaisModal.mode !== 'relais_conducteur'}
                      value={relaisDepotForm.lieu_nom}
                      onChange={event => setRelaisDepotForm(current => ({ ...current, lieu_nom: event.target.value }))}
                      placeholder={relaisModal.mode === 'relais_conducteur' ? 'Optionnel: ex: Aire A7 km 142, Montelimar' : 'ex: Entrepot Nexora Lille'}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Adresse (optionnel)</label>
                    <input
                      value={relaisDepotForm.lieu_adresse}
                      onChange={event => setRelaisDepotForm(current => ({ ...current, lieu_adresse: event.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {relaisModal.mode === 'relais_conducteur' ? 'Date / heure du RDV' : 'Date de depot'}
                </label>
                <input
                  type="datetime-local"
                  value={relaisDepotForm.date_depot}
                  onChange={event => setRelaisDepotForm(current => ({ ...current, date_depot: event.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {relaisModal.mode === 'relais_conducteur' ? 'Conducteur qui repart (conducteur A)' : 'Conducteur qui depose'}
                </label>
                <select
                  value={relaisDepotForm.conducteur_depose_id}
                  onChange={event => setRelaisDepotForm(current => ({ ...current, conducteur_depose_id: event.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">- Aucun -</option>
                  {conducteurs.map(conducteur => (
                    <option key={conducteur.id} value={conducteur.id}>{conducteur.prenom} {conducteur.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={relaisDepotForm.notes}
                  onChange={event => setRelaisDepotForm(current => ({ ...current, notes: event.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-muted hover:text-white transition-colors">Annuler</button>
                <button
                  type="submit"
                  disabled={relaisSaving}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 transition-colors"
                >
                  {relaisSaving ? 'Enregistrement...' : relaisModal.mode === 'relais_conducteur' ? 'Creer le relais' : 'Deposer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {relaisModal.mode === 'assign' && relaisModal.relais && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[160] p-4" onClick={onClose}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">
                {relaisModal.relais.type_relais === 'relais_conducteur' ? 'Affecter conducteur de relais' : 'Affecter la reprise'}
              </h3>
              <p className="text-xs text-muted mt-0.5">
                {relaisModal.relais.lieu_nom || 'Relais conducteur (sans lieu fixe)'}
                {relaisModal.relais.ordres_transport ? ` - Course ${relaisModal.relais.ordres_transport.reference}` : ''}
              </p>
            </div>
            <form onSubmit={onSubmitRelaisAssign} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {relaisModal.relais.type_relais === 'relais_conducteur' ? 'Conducteur B (continue la route)' : 'Conducteur qui reprend'}
                </label>
                <select
                  value={relaisAssignForm.conducteur_reprise_id}
                  onChange={event => setRelaisAssignForm(current => ({ ...current, conducteur_reprise_id: event.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">- Aucun -</option>
                  {conducteurs.map(conducteur => (
                    <option key={conducteur.id} value={conducteur.id}>{conducteur.prenom} {conducteur.nom}</option>
                  ))}
                </select>
              </div>

              {relaisModal.relais.type_relais === 'depot_marchandise' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Vehicule pour la reprise</label>
                  <select
                    value={relaisAssignForm.vehicule_reprise_id}
                    onChange={event => setRelaisAssignForm(current => ({ ...current, vehicule_reprise_id: event.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">- Aucun -</option>
                    {vehicules.map(vehicule => (
                      <option key={vehicule.id} value={vehicule.id}>{vehicule.immatriculation}{vehicule.modele ? ` - ${vehicule.modele}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {relaisModal.relais.type_relais === 'relais_conducteur' ? 'Date / heure RDV' : 'Date de reprise prevue'}
                </label>
                <input
                  type="datetime-local"
                  value={relaisAssignForm.date_reprise_prevue}
                  onChange={event => setRelaisAssignForm(current => ({ ...current, date_reprise_prevue: event.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={relaisAssignForm.notes}
                  onChange={event => setRelaisAssignForm(current => ({ ...current, notes: event.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-muted hover:text-white transition-colors">Annuler</button>
                <button
                  type="submit"
                  disabled={relaisSaving}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
                >
                  {relaisSaving ? 'Enregistrement...' : 'Affecter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}