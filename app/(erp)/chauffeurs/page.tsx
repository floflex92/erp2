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

type Chauffeur = Tables<"chauffeurs">

const STATUT_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  actif:          { label: "Actif",           variant: "default" },
  inactif:        { label: "Inactif",         variant: "secondary" },
  conge:          { label: "Congé",           variant: "outline" },
  arret_maladie:  { label: "Arrêt maladie",   variant: "destructive" },
}

function expirationColor(dateStr: string | null): string {
  if (!dateStr) return "text-slate-400"
  const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (diff < 0)   return "text-red-600 font-semibold"
  if (diff < 60)  return "text-orange-500 font-semibold"
  return "text-slate-600"
}

const EMPTY_FORM: TablesInsert<"chauffeurs"> = {
  nom: "", prenom: "", telephone: "", email: "", adresse: "",
  date_naissance: null, numero_permis: "", permis_categories: [],
  permis_expiration: null, fimo_date: null, fco_date: null,
  fco_expiration: null, carte_tachy_numero: "", carte_tachy_expiration: null,
  statut: "actif", notes: "",
}

export default function ChauffeursPage() {
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<TablesInsert<"chauffeurs">>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")

  async function fetchChauffeurs() {
    setLoading(true)
    const { data } = await supabase.from("chauffeurs").select("*").order("nom")
    setChauffeurs(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchChauffeurs() }, [])

  const filtered = chauffeurs.filter(c =>
    `${c.nom} ${c.prenom}`.toLowerCase().includes(search.toLowerCase())
  )

  function setField(key: keyof TablesInsert<"chauffeurs">, value: string | null) {
    setForm(f => ({ ...f, [key]: value || null }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from("chauffeurs").insert(form)
    setSaving(false)
    setOpen(false)
    setForm(EMPTY_FORM)
    fetchChauffeurs()
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce chauffeur ?")) return
    await supabase.from("chauffeurs").delete().eq("id", id)
    fetchChauffeurs()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Chauffeurs</h2>
          <p className="text-slate-500 text-sm mt-1">{chauffeurs.length} chauffeur{chauffeurs.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Ajouter un chauffeur</Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Rechercher un chauffeur..."
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
            {search ? "Aucun résultat" : "Aucun chauffeur enregistré"}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Chauffeur</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Permis</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">FCO</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Carte tachy</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{c.nom} {c.prenom}</div>
                    {c.date_naissance && (
                      <div className="text-xs text-slate-400">{new Date(c.date_naissance).toLocaleDateString("fr-FR")}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-600">{c.telephone ?? "—"}</div>
                    <div className="text-xs text-slate-400">{c.email ?? ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-600">{c.numero_permis ?? "—"}</div>
                    <div className={`text-xs ${expirationColor(c.permis_expiration)}`}>
                      {c.permis_expiration ? `Exp. ${new Date(c.permis_expiration).toLocaleDateString("fr-FR")}` : ""}
                    </div>
                    {c.permis_categories && c.permis_categories.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {c.permis_categories.map(cat => (
                          <span key={cat} className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded">{cat}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-sm ${expirationColor(c.fco_expiration)}`}>
                      {c.fco_expiration ? new Date(c.fco_expiration).toLocaleDateString("fr-FR") : "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-600">{c.carte_tachy_numero ?? "—"}</div>
                    <div className={`text-xs ${expirationColor(c.carte_tachy_expiration)}`}>
                      {c.carte_tachy_expiration ? `Exp. ${new Date(c.carte_tachy_expiration).toLocaleDateString("fr-FR")}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUT_META[c.statut]?.variant ?? "secondary"}>
                      {STATUT_META[c.statut]?.label ?? c.statut}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
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
            <DialogTitle>Ajouter un chauffeur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">

              <div className="space-y-1">
                <Label>Nom *</Label>
                <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Prénom *</Label>
                <Input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} required />
              </div>

              <div className="space-y-1">
                <Label>Téléphone</Label>
                <Input value={form.telephone ?? ""} onChange={e => setField("telephone", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email ?? ""} onChange={e => setField("email", e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Date de naissance</Label>
                <Input type="date" value={form.date_naissance ?? ""} onChange={e => setField("date_naissance", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Statut</Label>
                <Select value={form.statut ?? "actif"} onValueChange={v => setField("statut", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                    <SelectItem value="conge">Congé</SelectItem>
                    <SelectItem value="arret_maladie">Arrêt maladie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 border-t pt-4 mt-2">
                <p className="text-sm font-medium text-slate-700 mb-3">Permis de conduire</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Numéro de permis</Label>
                    <Input value={form.numero_permis ?? ""} onChange={e => setField("numero_permis", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Expiration permis</Label>
                    <Input type="date" value={form.permis_expiration ?? ""} onChange={e => setField("permis_expiration", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="col-span-2 border-t pt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">FCO / Formation</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Date FIMO</Label>
                    <Input type="date" value={form.fimo_date ?? ""} onChange={e => setField("fimo_date", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Date FCO</Label>
                    <Input type="date" value={form.fco_date ?? ""} onChange={e => setField("fco_date", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Expiration FCO</Label>
                    <Input type="date" value={form.fco_expiration ?? ""} onChange={e => setField("fco_expiration", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="col-span-2 border-t pt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Carte conducteur tachygraphe</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Numéro carte</Label>
                    <Input value={form.carte_tachy_numero ?? ""} onChange={e => setField("carte_tachy_numero", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Expiration carte</Label>
                    <Input type="date" value={form.carte_tachy_expiration ?? ""} onChange={e => setField("carte_tachy_expiration", e.target.value)} />
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
