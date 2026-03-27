import { Button } from "@/components/ui/button"

export default function ChauffeursPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Chauffeurs</h2>
        <Button>+ Ajouter un chauffeur</Button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-400 text-sm">Aucun chauffeur enregistré</p>
      </div>
    </div>
  )
}
