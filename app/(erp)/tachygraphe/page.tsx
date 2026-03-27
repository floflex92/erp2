import { Button } from "@/components/ui/button"

export default function TachygraphePage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Tachygraphe</h2>
        <Button>+ Saisir des données</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {["Conduite", "Repos", "Disponibilité"].map((type) => (
          <div key={type} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-700 mb-2">{type}</h3>
            <p className="text-3xl font-bold text-slate-800">0h00</p>
            <p className="text-slate-400 text-sm mt-1">Cette semaine</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-700 mb-4">Alertes réglementaires</h3>
        <p className="text-slate-400 text-sm">Aucune alerte · Intégration Webfleet à configurer</p>
      </div>
    </div>
  )
}
