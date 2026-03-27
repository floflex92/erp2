import { Button } from "@/components/ui/button"

export default function FacturationPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Facturation</h2>
        <Button>+ Nouvelle facture</Button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-400 text-sm">Aucune facture</p>
      </div>
    </div>
  )
}
