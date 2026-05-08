import type { CourseTemplate } from '@/lib/courseTemplates'
import type { OT, PlanningInlineType } from '@/pages/planning/planningTypes'

type ClientOption = {
  id: string
  nom: string
}

type SiteOption = {
  id: string
  nom: string
}

type NearestPlanningCourseSuggestion = {
  ot: OT
  beforeStartISO: string
  afterStartISO: string
  beforeLabel: string
  afterLabel: string
  preferredMode: 'before' | 'after'
}

type Props = {
  isOpen: boolean
  newBlockType: PlanningInlineType
  editingCustomBlockId: string | null
  creatingInlineEvent: boolean
  newBlockLabel: string
  newBlockClientId: string
  newBlockDonneurOrdreId: string
  newBlockReferenceCourse: string
  newBlockChargementSiteId: string
  newBlockLivraisonSiteId: string
  newBlockDateChargement: string
  newBlockTimeChargement: string
  newBlockDateLivraison: string
  newBlockTimeLivraison: string
  newBlockDistanceKm: string
  newBlockDurationHours: string
  newBlockDurationMinutes: string
  showSaveTemplate: boolean
  savingTemplate: boolean
  saveAsTemplateLabel: string
  courseTemplates: CourseTemplate[]
  clients: ClientOption[]
  logisticSites: SiteOption[]
  inlineEventTypes: PlanningInlineType[]
  inlineEventLabels: Record<PlanningInlineType, string>
  nearestPlanningCourseSuggestion: NearestPlanningCourseSuggestion | null
  onClose: () => void
  onSetNewBlockType: (value: PlanningInlineType) => void
  onSetNewBlockLabel: (value: string) => void
  onSetNewBlockClientId: (value: string) => void
  onSetNewBlockDonneurOrdreId: (value: string) => void
  onSetNewBlockReferenceCourse: (value: string) => void
  onSetNewBlockChargementSiteId: (value: string) => void
  onSetNewBlockLivraisonSiteId: (value: string) => void
  onSetNewBlockDateChargement: (value: string) => void
  onSetNewBlockTimeChargement: (value: string) => void
  onSetNewBlockDateLivraison: (value: string) => void
  onSetNewBlockTimeLivraison: (value: string) => void
  onSetNewBlockDistanceKm: (value: string) => void
  onSetPlanningEventDurationAndSync: (hours: string, minutes: string) => void
  onSetPlanningEventEndAndSync: (endISO: string) => void
  onSetPlanningEventStart: (startISO: string) => void
  onSetShowSaveTemplate: (value: boolean) => void
  onSetSaveAsTemplateLabel: (value: string) => void
  onAddCustomBlock: () => void
  onApplyTemplate: (template: CourseTemplate) => void
  onDeleteTemplate: (templateId: string) => void
  onSaveTemplate: () => void
  toDateTimeISO: (date: string, time: string) => string
}

export default function PlanningAddBlockModal({
  isOpen,
  newBlockType,
  editingCustomBlockId,
  creatingInlineEvent,
  newBlockLabel,
  newBlockClientId,
  newBlockDonneurOrdreId,
  newBlockReferenceCourse,
  newBlockChargementSiteId,
  newBlockLivraisonSiteId,
  newBlockDateChargement,
  newBlockTimeChargement,
  newBlockDateLivraison,
  newBlockTimeLivraison,
  newBlockDistanceKm,
  newBlockDurationHours,
  newBlockDurationMinutes,
  showSaveTemplate,
  savingTemplate,
  saveAsTemplateLabel,
  courseTemplates,
  clients,
  logisticSites,
  inlineEventTypes,
  inlineEventLabels,
  nearestPlanningCourseSuggestion,
  onClose,
  onSetNewBlockType,
  onSetNewBlockLabel,
  onSetNewBlockClientId,
  onSetNewBlockDonneurOrdreId,
  onSetNewBlockReferenceCourse,
  onSetNewBlockChargementSiteId,
  onSetNewBlockLivraisonSiteId,
  onSetNewBlockDateChargement,
  onSetNewBlockTimeChargement,
  onSetNewBlockDateLivraison,
  onSetNewBlockTimeLivraison,
  onSetNewBlockDistanceKm,
  onSetPlanningEventDurationAndSync,
  onSetPlanningEventEndAndSync,
  onSetPlanningEventStart,
  onSetShowSaveTemplate,
  onSetSaveAsTemplateLabel,
  onAddCustomBlock,
  onApplyTemplate,
  onDeleteTemplate,
  onSaveTemplate,
  toDateTimeISO,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[160] p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-xl shadow-2xl" onClick={event => event.stopPropagation()}>
        <h3 className="text-sm font-semibold text-white mb-1">{newBlockType === 'course' ? 'Creer une course' : editingCustomBlockId ? 'Modifier un evenement planning' : 'Ajouter un evenement planning'}</h3>
        <p className="text-[11px] text-muted mb-3">
          {newBlockType === 'course'
            ? 'Creer une course directement depuis la ligne du planning.'
            : editingCustomBlockId
            ? 'Ajustez le type, le libelle ou la duree du bloc selectionne.'
            : 'Ajoutez un HLP, une pause, une maintenance ou un autre bloc directement sur la ligne choisie.'}
        </p>

        {newBlockType === 'course' && courseTemplates.length > 0 && (
          <div className="mb-3 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Charger un modele</p>
            <div className="flex flex-wrap gap-1.5">
              {courseTemplates.map(template => (
                <div key={template.id} className="group flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1">
                  <button type="button" onClick={() => onApplyTemplate(template)} className="text-[11px] text-slate-200 hover:text-white transition-colors">
                    {template.label}
                  </button>
                  <button type="button" onClick={() => onDeleteTemplate(template.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-300 text-[10px] leading-none">x</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="block mb-2">
          <span className="text-[11px] text-muted">Type</span>
          <select
            value={newBlockType}
            onChange={event => onSetNewBlockType(event.target.value as PlanningInlineType)}
            className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
          >
            {inlineEventTypes.map(type => (
              <option key={type} value={type}>{inlineEventLabels[type]}</option>
            ))}
          </select>
        </label>

        <input
          autoFocus
          value={newBlockLabel}
          onChange={event => onSetNewBlockLabel(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') onAddCustomBlock()
            if (event.key === 'Escape') onClose()
          }}
          placeholder={newBlockType === 'course' ? 'Libelle de la course...' : `Description ${inlineEventLabels[newBlockType].toLowerCase()}...`}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-indigo-500 mb-3"
        />

        {newBlockType === 'course' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <label className="block">
              <span className="text-[11px] text-muted">Client</span>
              <select value={newBlockClientId} onChange={event => onSetNewBlockClientId(event.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500">
                <option value="">Selectionner</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.nom}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] text-muted">Donneur d ordre</span>
              <select value={newBlockDonneurOrdreId} onChange={event => onSetNewBlockDonneurOrdreId(event.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500">
                <option value="">Selectionner</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.nom}</option>)}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-[11px] text-muted">Numero de reference course</span>
              <input value={newBlockReferenceCourse} onChange={event => onSetNewBlockReferenceCourse(event.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500" />
            </label>
            <label className="block">
              <span className="text-[11px] text-muted">Lieu de chargement</span>
              <select value={newBlockChargementSiteId} onChange={event => onSetNewBlockChargementSiteId(event.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500">
                <option value="">Selectionner</option>
                {logisticSites.map(site => <option key={site.id} value={site.id}>{site.nom}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] text-muted">Lieu de livraison</span>
              <select value={newBlockLivraisonSiteId} onChange={event => onSetNewBlockLivraisonSiteId(event.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500">
                <option value="">Selectionner</option>
                {logisticSites.map(site => <option key={site.id} value={site.id}>{site.nom}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] text-muted">Date chargement</span>
              <input type="date" value={newBlockDateChargement} onChange={event => onSetNewBlockDateChargement(event.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500" />
            </label>
            <label className="block">
              <span className="text-[11px] text-muted">Heure chargement</span>
              <input type="time" step={900} value={newBlockTimeChargement} onChange={event => onSetNewBlockTimeChargement(event.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500" />
            </label>
            <label className="block">
              <span className="text-[11px] text-muted">Date livraison</span>
              <input type="date" value={newBlockDateLivraison} onChange={event => onSetNewBlockDateLivraison(event.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500" />
            </label>
            <label className="block">
              <span className="text-[11px] text-muted">Heure livraison</span>
              <input type="time" step={900} value={newBlockTimeLivraison} onChange={event => onSetNewBlockTimeLivraison(event.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-[11px] text-muted">Distance du parcours (km)</span>
              <input type="number" min={0} step={1} value={newBlockDistanceKm} onChange={event => onSetNewBlockDistanceKm(event.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500" />
            </label>
          </div>
        )}

        {newBlockType !== 'course' && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="block">
                <span className="text-[11px] text-muted">Date debut</span>
                <input type="date" value={newBlockDateChargement} onChange={event => onSetNewBlockDateChargement(event.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500" />
              </label>
              <label className="block">
                <span className="text-[11px] text-muted">Heure debut</span>
                <input type="time" step={300} value={newBlockTimeChargement} onChange={event => onSetNewBlockTimeChargement(event.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500" />
              </label>
            </div>

            {nearestPlanningCourseSuggestion && (
              <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                <p className="text-[11px] font-semibold text-amber-100">Course la plus proche : {nearestPlanningCourseSuggestion.ot.reference}</p>
                <p className="mt-1 text-[10px] text-amber-200/80">
                  {nearestPlanningCourseSuggestion.preferredMode === 'before'
                    ? 'Ce type de bloc est propose en priorite avant le depart de la course.'
                    : 'Ce type de bloc est propose en priorite a la fin de la course.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onSetPlanningEventStart(nearestPlanningCourseSuggestion.beforeStartISO)} className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-800 ${nearestPlanningCourseSuggestion.preferredMode === 'before' ? 'border-amber-300/60 bg-amber-400/20 text-amber-50' : 'border-amber-400/30 bg-slate-900/60 text-amber-100'}`}>
                    Coller avant - {nearestPlanningCourseSuggestion.beforeLabel}
                  </button>
                  <button type="button" onClick={() => onSetPlanningEventStart(nearestPlanningCourseSuggestion.afterStartISO)} className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-800 ${nearestPlanningCourseSuggestion.preferredMode === 'after' ? 'border-amber-300/60 bg-amber-400/20 text-amber-50' : 'border-amber-400/30 bg-slate-900/60 text-amber-100'}`}>
                    Coller apres - {nearestPlanningCourseSuggestion.afterLabel}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="block">
                <span className="text-[11px] text-muted">Duree heures</span>
                <input type="number" min={0} step={1} value={newBlockDurationHours} onChange={event => onSetPlanningEventDurationAndSync(event.target.value, newBlockDurationMinutes)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500" />
              </label>
              <label className="block">
                <span className="text-[11px] text-muted">Duree minutes</span>
                <input type="number" min={0} max={59} step={5} value={newBlockDurationMinutes} onChange={event => onSetPlanningEventDurationAndSync(newBlockDurationHours, event.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="block">
                <span className="text-[11px] text-muted">Date fin</span>
                <input type="date" value={newBlockDateLivraison} onChange={event => onSetPlanningEventEndAndSync(toDateTimeISO(event.target.value, newBlockTimeLivraison))} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500" />
              </label>
              <label className="block">
                <span className="text-[11px] text-muted">Heure fin</span>
                <input type="time" step={300} value={newBlockTimeLivraison} onChange={event => onSetPlanningEventEndAndSync(toDateTimeISO(newBlockDateLivraison, event.target.value))} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500" />
              </label>
            </div>
          </>
        )}

        {newBlockType === 'course' && (
          <div className="mb-3">
            {showSaveTemplate ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={saveAsTemplateLabel}
                  onChange={event => onSetSaveAsTemplateLabel(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') onSaveTemplate()
                    if (event.key === 'Escape') onSetShowSaveTemplate(false)
                  }}
                  placeholder="Nom du modele..."
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                />
                <button type="button" onClick={onSaveTemplate} disabled={savingTemplate || !saveAsTemplateLabel.trim()} className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-xl disabled:opacity-60 transition-colors">
                  {savingTemplate ? '...' : 'Sauvegarder'}
                </button>
                <button type="button" onClick={() => onSetShowSaveTemplate(false)} className="px-3 py-2 text-muted hover:text-white text-xs transition-colors">Annuler</button>
              </div>
            ) : (
              <button type="button" onClick={() => { onSetSaveAsTemplateLabel(newBlockLabel || ''); onSetShowSaveTemplate(true) }} className="text-[11px] text-discreet hover:text-emerald-400 transition-colors">
                + Sauvegarder comme modele
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 text-sm text-muted hover:text-white transition-colors">Annuler</button>
          <button onClick={onAddCustomBlock} disabled={creatingInlineEvent} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60">
            {creatingInlineEvent ? 'Creation...' : newBlockType === 'course' ? 'Creer la course' : editingCustomBlockId ? 'Mettre a jour' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}