"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Tables, TablesInsert } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

type Vehicule = Tables<"vehicules">

const STATUT_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  disponible:   { label: "Disponible",  variant: "default" },
  en_service:   { label: "En service",  variant: "secondary" },
  maintenance:  { label: "Maintenance", variant: "outline" },
  hs:           { label: "Hors service",variant: "destructive" },
  vendu:        { label: "Vendu",       variant: "secondary" },
}

const TYPE_META: Record<string, string> = {
  tracteur: "Tracteur", porteur: "Porteur", semi: "Semi-remorque",
  remorque: "Remorque", utilitaire: "Utilitaire",
}

function expirationColor(dateStr: string | null): string {
  if (!dateStr) return "text-slate-400"
  const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (diff < 0)   return "text-red-600 font-semibold"
  if (diff < 60)  return "text-orange-500 font-semibold"
  return "text-slate-600"
}

const EMPTY_FORM: TablesInsert<"vehicules"> = {
  immatriculation: "", marque: null, modele: null, annee: null,
  type_vehicule: "tracteur", ptac_kg: null,
  ct_date: null, ct_expiration: null, assurance_expiration: null, vignette_expiration: null,
  tachy_serie: null, tachy_etalonnage: null, tachy_etalonnage_prochain: null,
  km_actuel: 0, km_dernier_entretien: null, km_prochain_entretien: null,
  statut: "disponible", notes: null,
}

export default function VehiculesPage() {
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<TablesInsert<"vehicules">>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")

  async function fetchVehicules() {
    setLoading(true)
    const { data } = await supabase.from("vehicules").select("*").order("immatriculation")
    setVehicules(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchVehicules() }, [])

  const filtered = vehicules.filter(v =>
    `${v.immatriculation} ${v.marque ?? ""} ${v.modele ?? ""}`.toLowerCase().includes(search.toLowerCase())
  )

  function setField<K extends keyof TablesInsert<"vehicules">>(key: K, value: TablesInsert<"vehicules">[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from("vehicules").insert(form)
    setSaving(false)
    setOpen(false)
    setForm(EMPTY_FORM)
    fetchVehicules()
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce véhicule ?")) return
    await supabase.from("vehicules").delete().eq("id", id)
    fetchVehicules()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Véhicules</h2>
          <p className="text-slate-500 text-sm mt-1">{vehicules.length} véhicule{vehicules.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Ajouter un véhicule</Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Rechercher par immatriculation, marque..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {search ? "Aucun résultat" : "Aucun véhicule enregistré"}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Véhicule</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">CT</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Assurance</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Tachygraphe</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Km</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr key={v.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 font-mono">{v.immatriculation}</div>
                    <div className="text-xs text-slate-400">{v.marque} {v.modele} {v.annee ? `(${v.annee})` : ""}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{TYPE_META[v.type_vehicule] ?? v.type_vehicule}</td>
                  <td className="px-4 py-3">
                    <div className={`text-sm ${expirationColor(v.ct_expiration)}`}>
                      {v.ct_expiration ? new Date(v.ct_expiration).toLocaleDateString("fr-FR") : "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-sm ${expirationColor(v.assurance_expiration)}`}>
                      {v.assurance_expiration ? new Date(v.assurance_expiration).toLocaleDateString("fr-FR") : "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-500">{v.tachy_serie ?? "—"}</div>
                    <div className={`text-xs ${expirationColor(v.tachy_etalonnage_prochain)}`}>
                      {v.tachy_etalonnage_prochain ? `Étal. ${new Date(v.tachy_etalonnage_prochain).toLocaleDateString("fr-FR")}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {v.km_actuel ? v.km_actuel.toLocaleString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUT_META[v.statut]?.variant ?? "secondary"}>
                      {STATUT_META[v.statut]?.label ?? v.statut}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(v.id)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un véhicule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">

              <div className="space-y-1">
                <Label>Immatriculation *</Label>
                <Input value={form.immatriculation} onChange={e => setField("immatriculation", e.target.value.toUpperCase())} required />
              </div>
              <div className="space-y-1">
                <Label>Type *</Label>
                <Select value={form.type_vehicule ?? "tracteur"} onValueChange={v => setField("type_vehicule", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Marque</Label>
                <Input value={form.marque ?? ""} onChange={e => setField("marque", e.target.value || null)} />
              </div>
              <div className="space-y-1">
                <Label>Modèle</Label>
                <Input value={form.modele ?? ""} onChange={e => setField("modele", e.target.value || null)} />
              </div>

              <div className="space-y-1">
                <Label>Année</Label>
                <Input type="number" value={form.annee ?? ""} onChange={e => setField("annee", e.target.value ? parseInt(e.target.value) : null)} />
              </div>
              <div className="space-y-1">
                <Label>PTAC (kg)</Label>
                <Input type="number" value={form.ptac_kg ?? ""} onChange={e => setField("ptac_kg", e.target.value ? parseInt(e.target.value) : null)} />
              </div>

              <div className="space-y-1">
                <Label>Km actuel</Label>
                <Input type="number" value={form.km_actuel ?? ""} onChange={e => setField("km_actuel", e.target.value ? parseInt(e.target.value) : 0)} />
              </div>
              <div className="space-y-1">
                <Label>Statut</Label>
                <Select value={form.statut ?? "disponible"} onValueChange={v => setField("statut", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUT_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 border-t pt-4 mt-2">
                <p className="text-sm font-medium text-slate-700 mb-3">Documents</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Date CT</Label>
                    <Input type="date" value={form.ct_date ?? ""} onChange={e => setField("ct_date", e.target.value || null)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Expiration CT</Label>
                    <Input type="date" value={form.ct_expiration ?? ""} onChange={e => setField("ct_expiration", e.target.value || null)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Expiration assurance</Label>
                    <Input type="date" value={form.assurance_expiration ?? ""} onChange={e => setField("assurance_expiration", e.target.value || null)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Expiration vignette</Label>
                    <Input type="date" value={form.vignette_expiration ?? ""} onChange={e => setField("vignette_expiration", e.target.value || null)} />
                  </div>
                </div>
              </div>

              <div className="col-span-2 border-t pt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Tachygraphe</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>N° série tachygraphe</Label>
                    <Input value={form.tachy_serie ?? ""} onChange={e => setField("tachy_serie", e.target.value || null)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Dernier étalonnage</Label>
                    <Input type="date" value={form.tachy_etalonnage ?? ""} onChange={e => setField("tachy_etalonnage", e.target.value || null)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Prochain étalonnage</Label>
                    <Input type="date" value={form.tachy_etalonnage_prochain ?? ""} onChange={e => setField("tachy_etalonnage_prochain", e.target.value || null)} />
                  </div>
                </div>
              </div>

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
