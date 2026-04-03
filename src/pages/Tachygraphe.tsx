import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { deliverDemoMailToInbox, ensureDemoMailbox } from '@/lib/demoMail'
import { DEMO_PROFILES } from '@/lib/demoUsers'
import { createPdfDocument } from '@/lib/pdfDocument'
import { supabase } from '@/lib/supabase'
import { serializeTchatPayload } from '@/lib/tchatMessage'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConducteurDB {
  id: string
  nom: string
  prenom: string
  numero_permis: string | null
  carte_tachy_numero: string | null
  carte_tachy_expiration: string | null
  permis_expiration: string | null
  fco_expiration: string | null
  statut: string
  email: string | null
}

interface TachyData {
  conducteurId: string
  tempsConduiteJ: number
  pauseJ: number
  reposJ: number
  distanceJ: number
  vitesseMoy: number
  vitesseMax: number
  tempsConduiteSem: number
  distanceSem: number
  statutCompliance: 'conforme' | 'attention' | 'infraction'
}

interface Infraction {
  id: string
  conducteurId: string
  vehicule: string
  type: 'vitesse' | 'temps_conduite' | 'repos_insuffisant' | 'pause_manquante' | 'conduite_continue'
  gravite: 'mineure' | 'majeure' | 'critique'
  date: string
  heure: string
  description: string
  valeurMesuree: string
  valeurLimite: string
  lieu: string
  statut: 'nouvelle' | 'en_traitement' | 'cloturee'
  signee: boolean
}

interface Rapport {
  id: string
  conducteur_id: string
  type: 'releve_infraction' | 'attestation_activite'
  periode_debut: string
  periode_fin: string
  periode_label: string
  contenu: Record<string, unknown>
  statut: 'genere' | 'envoye' | 'signe'
  envoye_at: string | null
  created_at: string
}

interface AlerteDoc {
  id: string
  conducteurId: string
  conducteurNom: string
  type: 'permis' | 'fimo' | 'fcos' | 'carte_tachy' | 'visite_medicale' | 'adr'
  expiration: string
  joursRestants: number
}

interface AlerteEnvoyee {
  id: string
  conducteurId: string
  conducteurNom: string
  destinataires: ('conducteur' | 'exploitant')[]
  message: string
  niveau: 'info' | 'avertissement' | 'mise_en_demeure'
  date: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_INFRACTION_LABELS: Record<string, string> = {
  vitesse: 'Excès de vitesse', temps_conduite: 'Temps de conduite',
  repos_insuffisant: 'Repos insuffisant', pause_manquante: 'Pause manquante',
  conduite_continue: 'Conduite continue',
}
const TYPE_DOC_LABELS: Record<string, string> = {
  permis: 'Permis de conduire', fimo: 'FIMO', fcos: 'FCO/S',
  carte_tachy: 'Carte tachygraphe', visite_medicale: 'Visite médicale', adr: 'ADR',
}
const NIVEAU_ALERTE_LABELS: Record<string, string> = {
  info: 'Information', avertissement: 'Avertissement', mise_en_demeure: 'Mise en demeure',
}
const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

// ─── Mock data generators (stable via hash) ───────────────────────────────────

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

function makeTachyData(c: ConducteurDB): TachyData {
  const h = hashId(c.id)
  const tempsConduiteJ = 200 + (h % 200)
  const pauseJ = 30 + (h % 35)
  const vitesseMax = 88 + (h % 50)
  const tempsConduiteSem = 1400 + (h % 1900)
  const statut: TachyData['statutCompliance'] =
    vitesseMax > 130 || tempsConduiteJ > 540 ? 'infraction'
    : pauseJ < 45 || tempsConduiteSem > 3000 ? 'attention'
    : 'conforme'
  return {
    conducteurId: c.id,
    tempsConduiteJ,
    pauseJ,
    reposJ: 480 + (h % 240),
    distanceJ: 150 + (h % 200),
    vitesseMoy: 72 + (h % 20),
    vitesseMax,
    tempsConduiteSem,
    distanceSem: 1000 + (h % 1500),
    statutCompliance: statut,
  }
}

const INFRACTION_TEMPLATES: Omit<Infraction, 'id' | 'conducteurId' | 'vehicule'>[] = [
  { type: 'vitesse', gravite: 'majeure', date: '2026-03-28', heure: '05:42', description: 'Vitesse excessive sur A26 — 134 km/h en zone 110 km/h', valeurMesuree: '134 km/h', valeurLimite: '110 km/h', lieu: 'A26 — PK 87', statut: 'nouvelle', signee: false },
  { type: 'conduite_continue', gravite: 'critique', date: '2026-03-28', heure: '07:15', description: 'Conduite continue dépassant 4h30 sans interruption réglementaire', valeurMesuree: '5h12', valeurLimite: '4h30', lieu: 'A1 — Île-de-France', statut: 'nouvelle', signee: false },
  { type: 'vitesse', gravite: 'mineure', date: '2026-03-27', heure: '14:30', description: 'Vitesse excessive en zone chantier — 117 km/h en zone 90', valeurMesuree: '117 km/h', valeurLimite: '90 km/h', lieu: 'A2 — Zone chantier PK 44', statut: 'en_traitement', signee: true },
  { type: 'repos_insuffisant', gravite: 'majeure', date: '2026-03-27', heure: '21:00', description: 'Repos journalier insuffisant — 8h30 au lieu des 11h réglementaires', valeurMesuree: '8h30', valeurLimite: '11h00', lieu: 'Dépôt Lille', statut: 'en_traitement', signee: false },
  { type: 'pause_manquante', gravite: 'mineure', date: '2026-03-26', heure: '11:15', description: 'Pause de 45 min non respectée après 4h de conduite', valeurMesuree: '20 min', valeurLimite: '45 min', lieu: 'N43 — Hauts-de-France', statut: 'cloturee', signee: true },
]

function makeInfractions(conducteurs: ConducteurDB[]): Infraction[] {
  const result: Infraction[] = []
  conducteurs.forEach((c, ci) => {
    const h = hashId(c.id)
    const nbInf = h % 3  // 0, 1 ou 2 infractions par conducteur
    for (let i = 0; i < nbInf; i++) {
      const tpl = INFRACTION_TEMPLATES[(h + i + ci) % INFRACTION_TEMPLATES.length]
      result.push({
        ...tpl,
        id: `${c.id}-inf-${i}`,
        conducteurId: c.id,
        vehicule: `Véhicule ${ci + 1}`,
      })
    }
  })
  return result
}

function makeAlertesDoc(conducteurs: ConducteurDB[]): AlerteDoc[] {
  const alerts: AlerteDoc[] = []
  conducteurs.forEach(c => {
    const now = new Date('2026-03-28')
    if (c.carte_tachy_expiration) {
      const exp = new Date(c.carte_tachy_expiration)
      const j = Math.round((exp.getTime() - now.getTime()) / 86400000)
      alerts.push({ id: `${c.id}-carte_tachy`, conducteurId: c.id, conducteurNom: `${c.prenom} ${c.nom}`, type: 'carte_tachy', expiration: c.carte_tachy_expiration, joursRestants: j })
    }
    if (c.permis_expiration) {
      const exp = new Date(c.permis_expiration)
      const j = Math.round((exp.getTime() - now.getTime()) / 86400000)
      alerts.push({ id: `${c.id}-permis`, conducteurId: c.id, conducteurNom: `${c.prenom} ${c.nom}`, type: 'permis', expiration: c.permis_expiration, joursRestants: j })
    }
    if (c.fco_expiration) {
      const exp = new Date(c.fco_expiration)
      const j = Math.round((exp.getTime() - now.getTime()) / 86400000)
      alerts.push({ id: `${c.id}-fcos`, conducteurId: c.id, conducteurNom: `${c.prenom} ${c.nom}`, type: 'fcos', expiration: c.fco_expiration, joursRestants: j })
    }
  })
  return alerts
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMin(min: number) {
  return `${Math.floor(min / 60)}h${(min % 60).toString().padStart(2, '0')}`
}
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}
function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
function periodeLabel(debut: Date) {
  return `${MOIS_FR[debut.getMonth()]} ${debut.getFullYear()}`
}
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1) }
function lastDayOfMonth(y: number, m: number) { return new Date(y, m + 1, 0) }
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function loadConfig(): Promise<Record<string, string>> {
  const { data } = await (supabase.from('config_entreprise' as any).select('cle, valeur') as any)
  if (!data) return {}
  return Object.fromEntries(
    (data as Array<{ cle: string; valeur: unknown }>).map(r => [r.cle, typeof r.valeur === 'string' ? r.valeur.replace(/^"|"$/g, '') : String(r.valeur ?? '')]),
  )
}

async function saveRapport(
  conducteurId: string,
  type: 'releve_infraction' | 'attestation_activite',
  debut: Date, fin: Date,
  contenu: Record<string, unknown>,
  config: Record<string, string>,
): Promise<Rapport | null> {
  const { data, error } = await (supabase
    .from('rapports_conducteurs' as any)
    .insert({
      conducteur_id: conducteurId,
      type,
      periode_debut: toISO(debut),
      periode_fin: toISO(fin),
      periode_label: periodeLabel(debut),
      contenu: { ...contenu, config_snapshot: config },
      statut: 'genere',
    })
    .select()
    .single() as any)
  if (error) { console.error(error); return null }
  return data as Rapport
}

async function markEnvoye(rapportId: string): Promise<void> {
  await (supabase.from('rapports_conducteurs' as any)
    .update({ statut: 'envoye', envoye_at: new Date().toISOString() })
    .eq('id', rapportId) as any)
}

function normalizeIdentity(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase()
}

function conducteurIdentity(conducteur: Pick<ConducteurDB, 'prenom' | 'nom' | 'email'>) {
  return `${normalizeIdentity(conducteur.prenom)}-${normalizeIdentity(conducteur.nom)}`
}

function findMailboxProfileForConducteur(conducteur: ConducteurDB) {
  const normalizedEmail = normalizeIdentity(conducteur.email)
  const byEmail = normalizedEmail
    ? DEMO_PROFILES.find(profile => normalizeIdentity(profile.email) === normalizedEmail)
    : null
  if (byEmail) return byEmail

  const identity = conducteurIdentity(conducteur)
  const byName = DEMO_PROFILES.find(profile =>
    profile.role === 'conducteur'
    && conducteurIdentity({
      prenom: profile.prenom ?? '',
      nom: profile.nom ?? '',
      email: profile.email,
    }) === identity,
  )
  if (byName) return byName

  return DEMO_PROFILES.find(profile => profile.role === 'conducteur') ?? null
}

function buildReportText(
  type: 'releve_infraction' | 'attestation_activite',
  conducteur: ConducteurDB,
  debut: Date,
  contenu: Record<string, unknown>,
) {
  const title = type === 'releve_infraction' ? 'Releve d infraction' : 'Attestation d activite'
  const lines = [
    `${title} - ${periodeLabel(debut)}`,
    '',
    `Conducteur : ${conducteur.prenom} ${conducteur.nom}`,
    `Email : ${conducteur.email ?? 'Non renseigne'}`,
    `Date de generation : ${new Date().toLocaleString('fr-FR')}`,
    '',
    JSON.stringify(contenu, null, 2),
  ]
  return lines.join('\n')
}

function buildReportAttachment(
  type: 'releve_infraction' | 'attestation_activite',
  conducteur: ConducteurDB,
  debut: Date,
  contenu: Record<string, unknown>,
) {
  const slug = `${normalizeIdentity(conducteur.prenom)}-${normalizeIdentity(conducteur.nom) || 'conducteur'}`
  const filename = `${type === 'releve_infraction' ? 'releve-infraction' : 'attestation-activite'}-${slug}-${debut.getFullYear()}-${String(debut.getMonth() + 1).padStart(2, '0')}.pdf`
  const text = buildReportText(type, conducteur, debut, contenu)
  const pdf = createPdfDocument(
    type === 'releve_infraction' ? 'Releve d infraction' : 'Attestation d activite',
    text.split('\n'),
  )
  return {
    id: `tachy-${type}-${conducteur.id}-${toISO(debut)}`,
    kind: 'document' as const,
    name: filename,
    mimeType: 'application/pdf',
    size: pdf.size,
    url: pdf.url,
  }
}

async function sendRapportToConducteurMailbox(
  conducteur: ConducteurDB,
  type: 'releve_infraction' | 'attestation_activite',
  debut: Date,
  contenu: Record<string, unknown>,
  config: Record<string, string>,
) {
  const mailboxProfile = findMailboxProfileForConducteur(conducteur)
  if (!mailboxProfile) return false

  ensureDemoMailbox(mailboxProfile)

  const companyName = config.societe_nom ?? 'NEXORA truck'
  const senderName = config.responsable_exploitation_nom
    ? `${config.responsable_exploitation_nom} - ${companyName}`
    : `${companyName} - Service tachygraphe`
  const senderEmail = config.mail_from ?? 'tachygraphe@nexora.local'
  const subject = type === 'releve_infraction'
    ? `Releve d infraction ${periodeLabel(debut)}`
    : `Attestation d activite ${periodeLabel(debut)}`
  const body = serializeTchatPayload(
    [
      `Bonjour ${conducteur.prenom},`,
      '',
      type === 'releve_infraction'
        ? `Votre releve d infraction pour ${periodeLabel(debut)} est disponible en piece jointe.`
        : `Votre attestation d activite pour ${periodeLabel(debut)} est disponible en piece jointe.`,
      '',
      'Ce document a ete genere automatiquement depuis le module Tachygraphe.',
    ].join('\n'),
    [buildReportAttachment(type, conducteur, debut, contenu)],
  )

  deliverDemoMailToInbox(
    mailboxProfile,
    senderName,
    senderEmail,
    subject,
    body,
    ['tachygraphe', type === 'releve_infraction' ? 'infraction' : 'attestation'],
  )

  return true
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function GraviteBadge({ g }: { g: string }) {
  if (g === 'critique') return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />Critique</span>
  if (g === 'majeure') return <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-orange-400"><span className="h-1.5 w-1.5 rounded-full bg-orange-400" />Majeure</span>
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Mineure</span>
}
function StatutBadge({ s }: { s: string }) {
  if (s === 'nouvelle') return <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-medium text-blue-400">Nouvelle</span>
  if (s === 'en_traitement') return <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-medium text-violet-400">En traitement</span>
  return <span className="rounded-full bg-slate-500/15 px-2.5 py-0.5 text-[10px] font-medium text-slate-400">Clôturée</span>
}
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(value / max * 100))}%`, background: color }} />
    </div>
  )
}

// ─── Modal Relevé d'infraction ────────────────────────────────────────────────

function ModalReleve({
  conducteur, infractions, config, onClose, onSaved, onDeliver,
}: {
  conducteur: ConducteurDB
  infractions: Infraction[]
  config: Record<string, string>
  onClose: () => void
  onSaved: (r: Rapport) => void
  onDeliver: (conducteur: ConducteurDB, type: 'releve_infraction' | 'attestation_activite', debut: Date, contenu: Record<string, unknown>, config: Record<string, string>) => Promise<boolean>
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<Rapport | null>(null)
  const today = fmtDate(new Date().toISOString().slice(0, 10))
  const actives = infractions.filter(i => i.statut !== 'cloturee')
  const debut = firstDayOfMonth(2026, 2)  // Mars 2026
  const fin = lastDayOfMonth(2026, 2)

  async function handleSave(alsoSend: boolean) {
    setSaving(true)
    const contenu: Record<string, unknown> = {
      conducteur: { nom: conducteur.nom, prenom: conducteur.prenom, permis: conducteur.numero_permis, carteTachy: conducteur.carte_tachy_numero },
      infractions: actives,
      date_generation: new Date().toISOString(),
    }
    const rapport = await saveRapport(conducteur.id, 'releve_infraction', debut, fin, contenu, config)
    if (rapport) {
      let final = rapport
      if (alsoSend) {
        const delivered = await onDeliver(conducteur, 'releve_infraction', debut, contenu, config)
        if (delivered) {
          const envoyeAt = new Date().toISOString()
          await markEnvoye(rapport.id)
          final = { ...rapport, statut: 'envoye' as const, envoye_at: envoyeAt }
        }
      }
      setSaved(final)
      onSaved(final)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-8 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-white">Relevé d'infraction — {conducteur.prenom} {conducteur.nom} — {periodeLabel(debut)}</p>
          <div className="flex items-center gap-2">
            {!saved && (
              <>
                <button type="button" onClick={() => void handleSave(false)} disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white hover:bg-white/14 disabled:opacity-50">
                  {saving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
                  Sauvegarder
                </button>
                <button type="button" onClick={() => void handleSave(true)} disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z" /></svg>
                  Sauvegarder &amp; Envoyer
                </button>
              </>
            )}
            {saved && (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400">
                ✓ {saved.statut === 'envoye' ? 'Sauvegardé & envoyé' : 'Sauvegardé'}
              </span>
            )}
            <button type="button" onClick={() => { window.print() }} className="flex items-center gap-1.5 rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 9V4h12v5" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></svg>
              Imprimer
            </button>
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20">✕</button>
          </div>
        </div>

        <div className="rounded-2xl bg-white text-gray-900 shadow-2xl print:shadow-none" style={{ fontFamily: 'Georgia, serif' }}>
          <div className="border-b-2 border-gray-800 px-8 py-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xl font-bold">{config.societe_nom ?? 'NEXORA truck'}</p>
                <p className="text-sm text-gray-600">{config.societe_adresse}</p>
                <p className="text-sm text-gray-600">SIRET : {config.societe_siret}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-gray-500">Document officiel</p>
                <p className="mt-1 text-2xl font-bold">RELEVÉ D'INFRACTION</p>
                <p className="mt-1 text-sm text-gray-600">Réf. : INF-2026-{conducteur.id.slice(0, 6).toUpperCase()}</p>
                <p className="text-sm text-gray-600">Période : {periodeLabel(debut)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-8 py-6">
            <div className="flex justify-between text-sm">
              <span><strong>Établi le :</strong> {today}</span>
              <span><strong>Lieu :</strong> Lille</span>
              <span><strong>Par :</strong> {config.responsable_exploitation_nom ?? 'Service Exploitation'}</span>
            </div>

            <div className="rounded border border-gray-300 p-4">
              <p className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-700">Conducteur</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <div><strong>Nom :</strong> {conducteur.nom.toUpperCase()}</div>
                <div><strong>Prénom :</strong> {conducteur.prenom}</div>
                <div><strong>N° permis :</strong> {conducteur.numero_permis ?? 'N/A'}</div>
                <div><strong>Carte tachygraphe :</strong> {conducteur.carte_tachy_numero ?? 'N/A'}</div>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Infractions relevées ({actives.length})</p>
              {actives.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucune infraction active sur la période.</p>
              ) : (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      {['Date','Heure','Type','Description','Constaté','Limite','Gravité','Lieu'].map(h => (
                        <th key={h} className="border border-gray-300 px-2 py-2 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {actives.map((inf, i) => (
                      <tr key={inf.id} className={i % 2 ? 'bg-gray-50' : ''}>
                        <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{fmtDate(inf.date)}</td>
                        <td className="border border-gray-300 px-2 py-2">{inf.heure}</td>
                        <td className="border border-gray-300 px-2 py-2 whitespace-nowrap">{TYPE_INFRACTION_LABELS[inf.type]}</td>
                        <td className="border border-gray-300 px-2 py-2">{inf.description}</td>
                        <td className="border border-gray-300 px-2 py-2 font-semibold">{inf.valeurMesuree}</td>
                        <td className="border border-gray-300 px-2 py-2">{inf.valeurLimite}</td>
                        <td className="border border-gray-300 px-2 py-2 capitalize">{inf.gravite}</td>
                        <td className="border border-gray-300 px-2 py-2">{inf.lieu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 leading-relaxed">
              <p className="font-bold text-gray-800 mb-1">Rappel réglementaire</p>
              <p>Conformément au <strong>Règlement (CE) n°561/2006</strong> et à la <strong>Directive 2006/22/CE</strong>, les conducteurs sont tenus de respecter les temps de conduite (9h/j, 56h/sem), de repos (11h/j) et les pauses (45 min après 4h30 de conduite continue). Tout dépassement est passible de sanctions.</p>
            </div>

            <div className="border-t border-gray-300 pt-5">
              <p className="mb-4 text-sm">Je soussigné(e), <strong>{conducteur.prenom} {conducteur.nom.toUpperCase()}</strong>, reconnais avoir pris connaissance des infractions ci-dessus et m'engage à respecter la réglementation en vigueur.</p>
              <div className="mt-6 grid grid-cols-2 gap-16 text-sm">
                <div>
                  <p className="font-semibold mb-1">Le conducteur</p>
                  <p className="text-xs text-gray-500 mb-16">Date et signature :</p>
                  <div className="border-t border-gray-400 pt-1 text-xs text-gray-400">Nom, date, signature</div>
                </div>
                <div>
                  <p className="font-semibold mb-1">Le responsable d'exploitation</p>
                  <p className="text-xs text-gray-500 mb-16">{config.responsable_exploitation_nom}</p>
                  <div className="border-t border-gray-400 pt-1 text-xs text-gray-400">Nom, date, cachet société</div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3 text-center text-[10px] text-gray-400">
              Document généré par NEXORA truck · {today} · Ce document a valeur de notification officielle.
              {saved && <span> · ID rapport : {saved.id.slice(0, 8)}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Attestation d'activité ─────────────────────────────────────────────

function ModalAttestation({
  conducteur, tachyData, config, onClose, onSaved, onDeliver,
}: {
  conducteur: ConducteurDB
  tachyData: TachyData
  config: Record<string, string>
  onClose: () => void
  onSaved: (r: Rapport) => void
  onDeliver: (conducteur: ConducteurDB, type: 'releve_infraction' | 'attestation_activite', debut: Date, contenu: Record<string, unknown>, config: Record<string, string>) => Promise<boolean>
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<Rapport | null>(null)
  const today = fmtDate(new Date().toISOString().slice(0, 10))
  const debut = firstDayOfMonth(2026, 2)
  const fin = lastDayOfMonth(2026, 2)
  // Données mensuelles calculées
  const joursTravail = 20; const joursRepos = 8; const joursCongé = 2
  const conduiteTotale = Math.round(tachyData.tempsConduiteSem * 4.3)
  const autresTravaux = Math.round(conduiteTotale * 0.15)
  const distanceMois = tachyData.distanceSem * 4
  const nbMissions = 12 + (hashId(conducteur.id) % 8)

  // Détail semaines
  const semaines = [
    { label: 'Sem. 1 (01–07 mars)', conduite: fmtMin(Math.round(conduiteTotale / 4.3 * 1.1)), autres: fmtMin(Math.round(autresTravaux / 4)), repos: '2 j' },
    { label: 'Sem. 2 (08–14 mars)', conduite: fmtMin(Math.round(conduiteTotale / 4.3 * 0.9)), autres: fmtMin(Math.round(autresTravaux / 4)), repos: '2 j' },
    { label: 'Sem. 3 (15–21 mars)', conduite: fmtMin(Math.round(conduiteTotale / 4.3 * 1.05)), autres: fmtMin(Math.round(autresTravaux / 4)), repos: '2 j' },
    { label: 'Sem. 4 (22–28 mars)', conduite: fmtMin(Math.round(conduiteTotale / 4.3 * 0.95)), autres: fmtMin(Math.round(autresTravaux / 4)), repos: '2 j' },
  ]

  async function handleSave(alsoSend: boolean) {
    setSaving(true)
    const contenu: Record<string, unknown> = {
      conducteur: { nom: conducteur.nom, prenom: conducteur.prenom, permis: conducteur.numero_permis, carteTachy: conducteur.carte_tachy_numero },
      activite: { joursTravail, joursRepos, joursCongé, conduiteTotale, autresTravaux, distanceMois, nbMissions },
      semaines,
      date_generation: new Date().toISOString(),
    }
    const rapport = await saveRapport(conducteur.id, 'attestation_activite', debut, fin, contenu, config)
    if (rapport) {
      let final = rapport
      if (alsoSend) {
        const delivered = await onDeliver(conducteur, 'attestation_activite', debut, contenu, config)
        if (delivered) {
          const envoyeAt = new Date().toISOString()
          await markEnvoye(rapport.id)
          final = { ...rapport, statut: 'envoye' as const, envoye_at: envoyeAt }
        }
      }
      setSaved(final)
      onSaved(final)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-8 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-white">Attestation d'activité — {conducteur.prenom} {conducteur.nom} — {periodeLabel(debut)}</p>
          <div className="flex items-center gap-2">
            {!saved && (
              <>
                <button type="button" onClick={() => void handleSave(false)} disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white hover:bg-white/14 disabled:opacity-50">
                  Sauvegarder
                </button>
                <button type="button" onClick={() => void handleSave(true)} disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z" /></svg>
                  Sauvegarder &amp; Envoyer
                </button>
              </>
            )}
            {saved && <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400">✓ {saved.statut === 'envoye' ? 'Sauvegardé & envoyé' : 'Sauvegardé'}</span>}
            <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 9V4h12v5" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></svg>
              Imprimer
            </button>
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20">✕</button>
          </div>
        </div>

        <div className="rounded-2xl bg-white text-gray-900 shadow-2xl" style={{ fontFamily: 'Georgia, serif' }}>
          <div className="border-b-2 border-gray-800 px-8 py-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xl font-bold">{config.societe_nom ?? 'NEXORA truck'}</p>
                <p className="text-sm text-gray-600">{config.societe_adresse}</p>
                <p className="text-sm text-gray-600">SIRET : {config.societe_siret}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-gray-500">Document officiel</p>
                <p className="mt-1 text-xl font-bold">ATTESTATION D'ACTIVITÉ</p>
                <p className="text-sm text-gray-600">Art. R.3312-11 Code des transports</p>
                <p className="mt-1 text-sm text-gray-600">Réf. : ATT-2026-{conducteur.id.slice(0, 6).toUpperCase()}</p>
                <p className="text-sm text-gray-600">Période : {periodeLabel(debut)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-8 py-6">
            <div className="text-sm leading-relaxed">
              Je soussigné(e), <strong>{config.responsable_exploitation_nom ?? 'le Responsable d\'Exploitation'}</strong>, en qualité de responsable de la société <strong>{config.societe_nom ?? 'NEXORA truck'}</strong> (SIRET : {config.societe_siret}), certifie que le conducteur :
            </div>

            <div className="rounded border border-gray-300 p-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <div><strong>Nom :</strong> {conducteur.nom.toUpperCase()}</div>
                <div><strong>Prénom :</strong> {conducteur.prenom}</div>
                <div><strong>N° permis :</strong> {conducteur.numero_permis ?? 'N/A'}</div>
                <div><strong>Carte tachygraphe :</strong> {conducteur.carte_tachy_numero ?? 'N/A'}</div>
              </div>
            </div>

            <p className="text-sm">a exercé les activités suivantes du <strong>{fmtDate(toISO(debut))}</strong> au <strong>{fmtDate(toISO(fin))}</strong> :</p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Jours travaillés', value: `${joursTravail} j` },
                { label: 'Jours de repos', value: `${joursRepos} j` },
                { label: 'Congés / absence', value: `${joursCongé} j` },
                { label: 'Temps de conduite', value: fmtMin(conduiteTotale) },
                { label: 'Autres activités', value: fmtMin(autresTravaux) },
                { label: 'Distance totale', value: `${distanceMois} km` },
              ].map(kpi => (
                <div key={kpi.label} className="rounded border border-gray-200 p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">{kpi.value}</p>
                </div>
              ))}
            </div>

            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  {['Semaine','Temps de conduite','Autres activités','Repos'].map(h => (
                    <th key={h} className="border border-gray-300 px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semaines.map((s, i) => (
                  <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                    <td className="border border-gray-300 px-3 py-2">{s.label}</td>
                    <td className="border border-gray-300 px-3 py-2">{s.conduite}</td>
                    <td className="border border-gray-300 px-3 py-2">{s.autres}</td>
                    <td className="border border-gray-300 px-3 py-2">{s.repos}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="rounded border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
              <p className="font-bold text-gray-800 mb-1">Base légale</p>
              <p>Cette attestation est établie conformément à l'<strong>Art. R.3312-11 du Code des transports</strong> et au <strong>Règlement (CE) n°561/2006</strong>. Elle certifie les activités du conducteur pour la période non couverte ou complétée par les données du tachygraphe numérique.</p>
            </div>

            <div className="border-t border-gray-300 pt-5">
              <div className="mt-6 grid grid-cols-2 gap-16 text-sm">
                <div>
                  <p className="font-semibold mb-1">Le conducteur — Prise de connaissance</p>
                  <p className="text-xs text-gray-500 mb-16">Signature :</p>
                  <div className="border-t border-gray-400 pt-1 text-xs text-gray-400">Nom, date, signature</div>
                </div>
                <div>
                  <p className="font-semibold mb-1">L'employeur</p>
                  <p className="text-xs text-gray-500 mb-16">{config.responsable_exploitation_nom} — {config.societe_nom}</p>
                  <div className="border-t border-gray-400 pt-1 text-xs text-gray-400">Signature et cachet de la société</div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3 text-center text-[10px] text-gray-400">
              Attestation générée par NEXORA truck · {today}{saved ? ` · ID : ${saved.id.slice(0, 8)}` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Génération en masse ────────────────────────────────────────────────

function ModalGenerationBulk({
  conducteurs, tachyData, infractions, config, rapports, onClose, onGenerated, onDeliver,
}: {
  conducteurs: ConducteurDB[]
  tachyData: Record<string, TachyData>
  infractions: Infraction[]
  config: Record<string, string>
  rapports: Rapport[]
  onClose: () => void
  onGenerated: (nouveaux: Rapport[]) => void
  onDeliver: (conducteur: ConducteurDB, type: 'releve_infraction' | 'attestation_activite', debut: Date, contenu: Record<string, unknown>, config: Record<string, string>) => Promise<boolean>
}) {
  const now = new Date('2026-03-28')
  const [mois, setMois] = useState(now.getMonth() === 0 ? 11 : now.getMonth() - 1)
  const [annee, setAnnee] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear())
  const [types, setTypes] = useState<('releve_infraction' | 'attestation_activite')[]>(['releve_infraction', 'attestation_activite'])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(conducteurs.map(c => c.id)))
  const [alsoSend, setAlsoSend] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)

  const debut = firstDayOfMonth(annee, mois)
  const fin = lastDayOfMonth(annee, mois)

  function toggleType(t: 'releve_infraction' | 'attestation_activite') {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function toggleConducteur(id: string) {
    setSelectedIds(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  // Déjà générés pour cette période+type
  function alreadyExists(conducteurId: string, type: 'releve_infraction' | 'attestation_activite') {
    return rapports.some(r => r.conducteur_id === conducteurId && r.type === type && r.periode_debut === toISO(debut))
  }

  const nbAGenerer = [...selectedIds].reduce((n, id) => n + types.filter(t => !alreadyExists(id, t)).length, 0)

  async function handleGenerate() {
    setGenerating(true)
    const nouveaux: Rapport[] = []
    for (const id of selectedIds) {
      const c = conducteurs.find(x => x.id === id)!
      const td = tachyData[id]
      for (const type of types) {
        if (alreadyExists(id, type)) continue
        let contenu: Record<string, unknown> = {}
        if (type === 'releve_infraction') {
          contenu = { conducteur: { nom: c.nom, prenom: c.prenom }, infractions: infractions.filter(i => i.conducteurId === id && i.statut !== 'cloturee') }
        } else {
          contenu = { conducteur: { nom: c.nom, prenom: c.prenom }, activite: { conduiteTotale: Math.round(td.tempsConduiteSem * 4.3), distanceMois: td.distanceSem * 4 } }
        }
        const r = await saveRapport(id, type, debut, fin, contenu, config)
        if (r) {
          if (alsoSend) {
            const delivered = await onDeliver(c, type, debut, contenu, config)
            if (delivered) {
              const envoyeAt = new Date().toISOString()
              await markEnvoye(r.id)
              nouveaux.push({ ...r, statut: 'envoye', envoye_at: envoyeAt })
            } else {
              nouveaux.push(r)
            }
          } else {
            nouveaux.push(r)
          }
        }
      }
    }
    onGenerated(nouveaux)
    setGenerating(false)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border shadow-2xl" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="text-sm font-semibold">Génération en masse des documents</p>
            <p className="text-xs nx-subtle mt-0.5">Relevés d'infraction &amp; attestations d'activité</p>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-white/8 nx-subtle">✕</button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Période */}
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.2em] nx-muted">Période</p>
            <div className="flex items-center gap-3">
              <select value={mois} onChange={e => setMois(Number(e.target.value))}
                className="rounded-xl border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--border)' }}>
                {MOIS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={annee} onChange={e => setAnnee(Number(e.target.value))}
                className="rounded-xl border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--border)' }}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="text-sm nx-subtle">→ {fmtDate(toISO(debut))} au {fmtDate(toISO(fin))}</span>
            </div>
          </div>

          {/* Types */}
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.2em] nx-muted">Types de documents</p>
            <div className="flex gap-2">
              {[
                { id: 'releve_infraction' as const, label: 'Relevé d\'infraction', color: 'text-indigo-400' },
                { id: 'attestation_activite' as const, label: 'Attestation d\'activité', color: 'text-emerald-400' },
              ].map(t => (
                <button key={t.id} type="button" onClick={() => toggleType(t.id)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${types.includes(t.id) ? `border-current ${t.color} bg-white/4` : 'nx-subtle'}`}
                  style={!types.includes(t.id) ? { borderColor: 'var(--border)' } : {}}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conducteurs */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] nx-muted">Conducteurs ({selectedIds.size}/{conducteurs.length})</p>
              <button type="button" onClick={() => setSelectedIds(selectedIds.size === conducteurs.length ? new Set() : new Set(conducteurs.map(c => c.id)))}
                className="text-xs nx-subtle hover:text-[color:var(--primary)]">
                {selectedIds.size === conducteurs.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border p-2" style={{ borderColor: 'var(--border)' }}>
              {conducteurs.map(c => {
                const checked = selectedIds.has(c.id)
                const dejaRI = alreadyExists(c.id, 'releve_infraction')
                const dejaAtt = alreadyExists(c.id, 'attestation_activite')
                return (
                  <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/4">
                    <input type="checkbox" checked={checked} onChange={() => toggleConducteur(c.id)} className="h-4 w-4 rounded accent-blue-500" />
                    <span className="flex-1 text-sm">{c.prenom} {c.nom}</span>
                    <div className="flex gap-1">
                      {dejaRI && <span className="rounded-full bg-indigo-500/15 px-1.5 py-0.5 text-[9px] text-indigo-400">relevé ✓</span>}
                      {dejaAtt && <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] text-emerald-400">attest. ✓</span>}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Options */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: 'var(--border)' }}>
            <input type="checkbox" checked={alsoSend} onChange={e => setAlsoSend(e.target.checked)} className="h-4 w-4 accent-blue-500" />
            <div>
              <p className="text-sm font-medium">Marquer comme envoyé au conducteur</p>
              <p className="text-xs nx-subtle">Enregistre la date d'envoi et passe le statut à "envoyé"</p>
            </div>
          </label>

          {/* Résumé */}
          {!done && (
            <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <strong>{nbAGenerer}</strong> document{nbAGenerer > 1 ? 's' : ''} à générer pour <strong>{periodeLabel(debut)}</strong>
              {nbAGenerer === 0 && <span className="ml-2 text-emerald-400">— tous déjà générés</span>}
            </div>
          )}
          {done && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400">
              ✓ Génération terminée — documents sauvegardés en base de données
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-sm nx-subtle" style={{ borderColor: 'var(--border)' }}>
            {done ? 'Fermer' : 'Annuler'}
          </button>
          {!done && (
            <button type="button" onClick={() => void handleGenerate()}
              disabled={generating || nbAGenerer === 0 || types.length === 0}
              className="flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
              {generating && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {generating ? 'Génération...' : `Générer ${nbAGenerer} document${nbAGenerer > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal Alerte ─────────────────────────────────────────────────────────────

function ModalAlerte({ conducteur, infractions, onClose, onSend }: {
  conducteur: ConducteurDB
  infractions: Infraction[]
  onClose: () => void
  onSend: (a: AlerteEnvoyee) => void
}) {
  const [dest, setDest] = useState<('conducteur' | 'exploitant')[]>(['conducteur', 'exploitant'])
  const [niveau, setNiveau] = useState<'info' | 'avertissement' | 'mise_en_demeure'>('avertissement')
  const actives = infractions.filter(i => i.statut !== 'cloturee')
  const [message, setMessage] = useState(
    `Bonjour ${conducteur.prenom},\n\nNous avons relevé ${actives.length} infraction(s) sur vos dernières activités${actives.some(i => i.gravite === 'critique') ? ' dont des infractions critiques' : ''}.\n\nNous vous demandons de respecter scrupuleusement la réglementation (Règlement CE n°561/2006).\n\nCordialement,\nService Exploitation NEXORA truck`
  )
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!dest.length) return
    setSending(true)
    await new Promise(r => setTimeout(r, 900))
    onSend({ id: `a-${Date.now()}`, conducteurId: conducteur.id, conducteurNom: `${conducteur.prenom} ${conducteur.nom}`, destinataires: dest, message, niveau, date: new Date().toISOString() })
    setSending(false)
    onClose()
  }

  const NIVEAUX = [
    { id: 'info' as const, label: 'Information', color: 'text-blue-400', bg: 'bg-blue-500/15', sym: 'i' },
    { id: 'avertissement' as const, label: 'Avertissement', color: 'text-amber-400', bg: 'bg-amber-500/15', sym: '!' },
    { id: 'mise_en_demeure' as const, label: 'Mise en demeure', color: 'text-red-400', bg: 'bg-red-500/15', sym: '!!' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl border shadow-2xl" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold">Envoyer une alerte — {conducteur.prenom} {conducteur.nom}</p>
          <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-white/8 nx-subtle">✕</button>
        </div>
        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.2em] nx-muted">Destinataires</p>
            <div className="flex gap-2">
              {(['conducteur', 'exploitant'] as const).map(d => (
                <button key={d} type="button" onClick={() => setDest(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${dest.includes(d) ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--primary)]' : 'nx-subtle'}`}
                  style={!dest.includes(d) ? { borderColor: 'var(--border)' } : {}}>
                  {d === 'conducteur' ? 'Conducteur' : 'Exploitant'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.2em] nx-muted">Niveau</p>
            <div className="space-y-2">
              {NIVEAUX.map(n => (
                <button key={n.id} type="button" onClick={() => setNiveau(n.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${niveau === n.id ? `${n.bg} border-current ${n.color}` : 'nx-subtle'}`}
                  style={niveau !== n.id ? { borderColor: 'var(--border)' } : {}}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.bg} font-bold text-sm ${n.color}`}>{n.sym}</div>
                  <p className="text-sm font-medium">{n.label}</p>
                  {niveau === n.id && <svg className={`ml-auto h-4 w-4 ${n.color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 13 4 4L19 7" /></svg>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.2em] nx-muted">Message</p>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
              className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[color:var(--primary)] resize-none" style={{ borderColor: 'var(--border)' }} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-sm nx-subtle" style={{ borderColor: 'var(--border)' }}>Annuler</button>
          <button type="button" onClick={() => void handleSend()} disabled={!dest.length || sending}
            className="flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {sending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Envoyer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab Infractions ──────────────────────────────────────────────────────────

function TabInfractions({ conducteurs, infractions, rapports, alertesEnvoyees, onReleve, onAlerte, onBulk, canManageDocuments }:
  { conducteurs: ConducteurDB[]; infractions: Infraction[]; rapports: Rapport[]; alertesEnvoyees: AlerteEnvoyee[]; onReleve: (c: ConducteurDB, i: Infraction[]) => void; onAlerte: (c: ConducteurDB, i: Infraction[]) => void; onBulk: () => void; canManageDocuments: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'conducteurs' | 'global'>('conducteurs')
  const [filterStatut, setFilterStatut] = useState('tous')
  const sel = conducteurs.find(c => c.id === selectedId) ?? null
  const selInfs = sel ? infractions.filter(i => i.conducteurId === sel.id) : []
  const selRapports = sel ? rapports.filter(r => r.conducteur_id === sel.id && r.type === 'releve_infraction') : []
  const globalFiltered = infractions.filter(i => filterStatut === 'tous' || i.statut === filterStatut)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Critiques actives', value: infractions.filter(i => i.gravite === 'critique' && i.statut !== 'cloturee').length, color: 'text-red-400' },
          { label: 'Majeures actives', value: infractions.filter(i => i.gravite === 'majeure' && i.statut !== 'cloturee').length, color: 'text-orange-400' },
          { label: 'Total actives', value: infractions.filter(i => i.statut !== 'cloturee').length, color: '' },
        ].map(kpi => (
          <div key={kpi.label} className="nx-panel px-5 py-4">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${kpi.color || 'nx-muted'}`}>{kpi.label}</p>
            <p className={`mt-2 text-3xl font-semibold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1">
          {([{ id: 'conducteurs', label: 'Par conducteur' }, { id: 'global', label: 'Liste globale' }] as const).map(v => (
            <button key={v.id} onClick={() => setViewMode(v.id)}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${viewMode === v.id ? 'border-[color:var(--primary)] text-[color:var(--primary)]' : 'border-transparent nx-subtle'}`}
              style={{ marginBottom: -1 }}>
              {v.label}
            </button>
          ))}
        </div>
        {canManageDocuments && <button type="button" onClick={onBulk}
          className="mb-1 flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium text-indigo-400 transition hover:bg-indigo-500/10"
          style={{ borderColor: 'rgba(99,102,241,0.3)' }}>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14" /></svg>
          Générer tous les relevés
        </button>}
      </div>

      {viewMode === 'conducteurs' && (
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-2">
            {conducteurs.map(c => {
              const cInfs = infractions.filter(i => i.conducteurId === c.id && i.statut !== 'cloturee')
              const nbRapports = rapports.filter(r => r.conducteur_id === c.id && r.type === 'releve_infraction').length
              const hasCritique = cInfs.some(i => i.gravite === 'critique')
              const hasMajeure = cInfs.some(i => i.gravite === 'majeure')
              const dot = hasCritique ? '#ef4444' : hasMajeure ? '#f97316' : cInfs.length > 0 ? '#f59e0b' : '#10b981'
              return (
                <button key={c.id} onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                  className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-all ${selectedId === c.id ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)]' : 'hover:bg-white/4'}`}
                  style={{ borderColor: selectedId === c.id ? undefined : 'var(--border)' }}>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: dot, boxShadow: `0 0 5px ${dot}` }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{c.prenom} {c.nom}</p>
                        {cInfs.length > 0 && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${dot}20`, color: dot }}>{cInfs.length} inf.</span>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] nx-subtle">
                        {nbRapports > 0 && <span style={{ color: 'var(--primary)' }}>{nbRapports} relevé(s) généré(s)</span>}
                        {alertesEnvoyees.filter(a => a.conducteurId === c.id).length > 0 && <span>{alertesEnvoyees.filter(a => a.conducteurId === c.id).length} alerte(s)</span>}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {sel ? (
            <div className="nx-panel overflow-hidden">
              <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{sel.prenom} {sel.nom}</p>
                    <p className="text-xs nx-subtle">Permis : {sel.numero_permis ?? 'N/A'} · Tachy : {sel.carte_tachy_numero ?? 'N/A'}</p>
                  </div>
                  {canManageDocuments && <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onAlerte(sel, selInfs)}
                      className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/10" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                      Alerter
                    </button>
                    <button type="button" onClick={() => onReleve(sel, selInfs)}
                      className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium text-indigo-400 hover:bg-indigo-500/10" style={{ borderColor: 'rgba(99,102,241,0.3)' }}>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>
                      Générer relevé
                    </button>
                  </div>}
                </div>
                {/* Rapports existants */}
                {selRapports.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selRapports.map(r => (
                      <span key={r.id} className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium" style={{ borderColor: 'var(--border)', color: r.statut === 'envoye' ? '#10b981' : 'var(--text-secondary)' }}>
                        {r.periode_label} — {r.statut === 'envoye' ? '✓ Envoyé' : 'Généré'} {r.envoye_at ? fmtDateTime(r.envoye_at) : ''}
                      </span>
                    ))}
                  </div>
                )}
                {alertesEnvoyees.filter(a => a.conducteurId === sel.id).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {alertesEnvoyees.filter(a => a.conducteurId === sel.id).map(a => (
                      <span key={a.id} className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] text-amber-400">{NIVEAU_ALERTE_LABELS[a.niveau]} — {fmtDateTime(a.date)}</span>
                    ))}
                  </div>
                )}
              </div>
              {selInfs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="text-3xl opacity-20 mb-2">✅</div>
                  <p className="text-sm nx-subtle">Aucune infraction pour ce conducteur</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {selInfs.map(inf => (
                    <div key={inf.id} className="flex flex-col gap-2 px-5 py-4 hover:bg-white/2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <GraviteBadge g={inf.gravite} />
                          <span className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium nx-subtle" style={{ borderColor: 'var(--border)' }}>{TYPE_INFRACTION_LABELS[inf.type]}</span>
                          <StatutBadge s={inf.statut} />
                          {inf.signee && <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] text-emerald-400">✓ Signé</span>}
                        </div>
                        <p className="mt-2 text-sm">{inf.description}</p>
                        <p className="mt-1 text-xs nx-subtle">{fmtDate(inf.date)} {inf.heure} · {inf.lieu}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold" style={{ color: inf.gravite === 'critique' ? 'var(--danger)' : inf.gravite === 'majeure' ? '#f97316' : '#f59e0b' }}>{inf.valeurMesuree}</p>
                        <p className="text-xs nx-subtle">/ {inf.valeurLimite}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="nx-panel flex flex-col items-center justify-center p-12 text-center">
              <div className="text-3xl opacity-20 mb-2">👆</div>
              <p className="text-sm nx-subtle">Sélectionnez un conducteur</p>
            </div>
          )}
        </div>
      )}

      {viewMode === 'global' && (
        <div className="nx-panel overflow-hidden">
          <div className="flex items-center gap-1 border-b px-5 py-3" style={{ borderColor: 'var(--border)' }}>
            {[{ id: 'tous', label: 'Toutes' }, { id: 'nouvelle', label: 'Nouvelles' }, { id: 'en_traitement', label: 'En traitement' }, { id: 'cloturee', label: 'Clôturées' }].map(t => (
              <button key={t.id} onClick={() => setFilterStatut(t.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${filterStatut === t.id ? 'bg-[color:var(--primary-soft)] text-[color:var(--primary)]' : 'nx-subtle'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {globalFiltered.map(inf => {
              const c = conducteurs.find(x => x.id === inf.conducteurId)
              return (
                <div key={inf.id} className="flex flex-col gap-2 px-5 py-4 hover:bg-white/2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <GraviteBadge g={inf.gravite} />
                      <span className="rounded-full border px-2.5 py-0.5 text-[10px] nx-subtle" style={{ borderColor: 'var(--border)' }}>{TYPE_INFRACTION_LABELS[inf.type]}</span>
                      <StatutBadge s={inf.statut} />
                      {inf.signee && <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] text-emerald-400">✓ Signé</span>}
                    </div>
                    <p className="mt-2 text-sm">{inf.description}</p>
                    <p className="mt-1 text-xs nx-subtle">{c?.prenom} {c?.nom} · {fmtDate(inf.date)} {inf.heure} · {inf.lieu}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold" style={{ color: inf.gravite === 'critique' ? 'var(--danger)' : '#f97316' }}>{inf.valeurMesuree}</p>
                    <p className="text-xs nx-subtle">/ {inf.valeurLimite}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Attestations ─────────────────────────────────────────────────────────

function TabAttestations({ conducteurs, tachyData, rapports, onAttestation, onBulk, canManageDocuments }: {
  conducteurs: ConducteurDB[]; tachyData: Record<string, TachyData>; rapports: Rapport[]
  onAttestation: (c: ConducteurDB) => void; onBulk: () => void; canManageDocuments: boolean
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sel = conducteurs.find(c => c.id === selectedId) ?? null
  const selRapports = sel ? rapports.filter(r => r.conducteur_id === sel.id && r.type === 'attestation_activite') : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm nx-subtle">{rapports.filter(r => r.type === 'attestation_activite').length} attestation(s) générée(s) au total</p>
        {canManageDocuments && <button type="button" onClick={onBulk}
          className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10"
          style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14" /></svg>
          Générer toutes les attestations
        </button>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-2">
          {conducteurs.map(c => {
            const nbAtt = rapports.filter(r => r.conducteur_id === c.id && r.type === 'attestation_activite').length
            const td = tachyData[c.id]
            return (
              <button key={c.id} onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-all ${selectedId === c.id ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)]' : 'hover:bg-white/4'}`}
                style={{ borderColor: selectedId === c.id ? undefined : 'var(--border)' }}>
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${td?.statutCompliance === 'conforme' ? 'bg-emerald-500' : td?.statutCompliance === 'attention' ? 'bg-amber-400' : 'bg-red-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{c.prenom} {c.nom}</p>
                      {nbAtt > 0 && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400">{nbAtt} doc.</span>}
                    </div>
                    <p className="text-xs nx-subtle">{td ? `${fmtMin(td.tempsConduiteSem)} sem. · ${td.distanceSem} km` : ''}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {sel ? (
          <div className="nx-panel overflow-hidden">
            <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{sel.prenom} {sel.nom}</p>
                  <p className="text-xs nx-subtle">Permis : {sel.numero_permis ?? 'N/A'} · Tachy : {sel.carte_tachy_numero ?? 'N/A'}</p>
                </div>
                {canManageDocuments && <button type="button" onClick={() => onAttestation(sel)}
                  className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8" /></svg>
                  Générer attestation
                </button>}
              </div>
              {selRapports.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selRapports.map(r => (
                    <span key={r.id} className="rounded-full border px-2.5 py-0.5 text-[10px]" style={{ borderColor: 'var(--border)', color: r.statut === 'envoye' ? '#10b981' : 'var(--text-secondary)' }}>
                      {r.periode_label} — {r.statut === 'envoye' ? '✓ Envoyé' : 'Généré'} {r.envoye_at ? fmtDateTime(r.envoye_at) : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {tachyData[sel.id] && (
              <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
                {[
                  { label: 'Conduite semaine', value: fmtMin(tachyData[sel.id].tempsConduiteSem), sub: '/ 56h max' },
                  { label: 'Distance semaine', value: `${tachyData[sel.id].distanceSem} km`, sub: '' },
                  { label: 'Vitesse max', value: `${tachyData[sel.id].vitesseMax} km/h`, sub: '' },
                ].map(kpi => (
                  <div key={kpi.label} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <p className="text-[10px] uppercase tracking-[0.2em] nx-muted">{kpi.label}</p>
                    <p className="mt-1 text-xl font-semibold">{kpi.value}</p>
                    {kpi.sub && <p className="text-xs nx-subtle">{kpi.sub}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="nx-panel flex flex-col items-center justify-center p-12 text-center">
            <div className="text-3xl opacity-20 mb-2">📋</div>
            <p className="text-sm nx-subtle">Sélectionnez un conducteur pour générer son attestation</p>
          </div>
        )}
      </div>

      {/* Historique global */}
      {rapports.filter(r => r.type === 'attestation_activite').length > 0 && (
        <div className="nx-panel overflow-hidden">
          <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold">Attestations générées</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {rapports.filter(r => r.type === 'attestation_activite').map(r => {
              const c = conducteurs.find(x => x.id === r.conducteur_id)
              return (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{c?.prenom} {c?.nom}</p>
                    <p className="text-xs nx-subtle">{r.periode_label} · Généré le {fmtDateTime(r.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${r.statut === 'envoye' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                    {r.statut === 'envoye' ? '✓ Envoyé' : 'Généré'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Données ──────────────────────────────────────────────────────────────

function TabDonnees({ conducteurs, tachyData }: { conducteurs: ConducteurDB[]; tachyData: Record<string, TachyData> }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sel = conducteurs.find(c => c.id === selectedId)
  const td = sel ? tachyData[sel.id] : null

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="nx-panel overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold">Données tachygraphe — journée en cours</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[11px] font-semibold uppercase tracking-[0.18em] nx-muted" style={{ borderColor: 'var(--border)' }}>
                {['Conducteur','Conduite J','Pause J','Distance','Vit. max','Semaine','Statut'].map(h => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {conducteurs.map(c => {
                const d = tachyData[c.id]
                if (!d) return null
                return (
                  <tr key={c.id} onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                    className="cursor-pointer border-b transition-colors hover:bg-white/3 last:border-0"
                    style={{ borderColor: 'var(--border)', background: selectedId === c.id ? 'rgba(59,130,246,0.06)' : undefined }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 rounded-full ${d.statutCompliance === 'infraction' ? 'bg-red-500' : d.statutCompliance === 'attention' ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                        <div><p className="font-medium">{c.prenom} {c.nom}</p><p className="text-xs nx-subtle">{c.statut}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><span className={d.tempsConduiteJ > 540 ? 'text-red-400 font-semibold' : d.tempsConduiteJ > 480 ? 'text-amber-400' : ''}>{fmtMin(d.tempsConduiteJ)}</span></td>
                    <td className="px-4 py-3 text-center"><span className={d.pauseJ < 45 ? 'text-orange-400' : ''}>{fmtMin(d.pauseJ)}</span></td>
                    <td className="px-4 py-3 text-center">{d.distanceJ} km</td>
                    <td className="px-4 py-3 text-center"><span className={d.vitesseMax > 130 ? 'text-red-400 font-semibold' : d.vitesseMax > 110 ? 'text-amber-400' : ''}>{d.vitesseMax} km/h</span></td>
                    <td className="px-4 py-3 text-center">
                      <p className={d.tempsConduiteSem > 3000 ? 'text-orange-400' : ''}>{fmtMin(d.tempsConduiteSem)}</p>
                      <ProgressBar value={d.tempsConduiteSem} max={3360} color={d.tempsConduiteSem > 3000 ? '#f97316' : '#3b82f6'} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {d.statutCompliance === 'infraction' && <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-red-400">Infraction</span>}
                      {d.statutCompliance === 'attention' && <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">Attention</span>}
                      {d.statutCompliance === 'conforme' && <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">Conforme</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {td && sel ? (
        <div className="nx-panel p-5 space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] nx-muted">Fiche conducteur</p>
            <h3 className="mt-2 text-lg font-semibold">{sel.prenom} {sel.nom}</h3>
            <p className="text-xs nx-subtle">{sel.email}</p>
          </div>
          <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-[10px] uppercase tracking-[0.2em] nx-muted">Conduite journée</p>
            <div className="mt-1.5 flex items-end justify-between"><p className="text-2xl font-semibold">{fmtMin(td.tempsConduiteJ)}</p><p className="text-xs nx-subtle">/ 9h</p></div>
            <ProgressBar value={td.tempsConduiteJ} max={540} color={td.tempsConduiteJ > 540 ? '#ef4444' : td.tempsConduiteJ > 480 ? '#f59e0b' : '#10b981'} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[{ l: 'Pause', v: fmtMin(td.pauseJ), sub: 'min 45 min', warn: td.pauseJ < 45 }, { l: 'Repos', v: fmtMin(td.reposJ), sub: 'min 11h', warn: td.reposJ < 660 }].map(k => (
              <div key={k.l} className="rounded-2xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <p className="text-[10px] uppercase nx-muted">{k.l}</p>
                <p className={`mt-1 text-lg font-semibold ${k.warn ? 'text-orange-400' : ''}`}>{k.v}</p>
                <p className="text-[10px] nx-subtle">{k.sub}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-[10px] uppercase nx-muted">Vitesse</p>
            <div className="mt-1.5 flex justify-between">
              <div><p className="text-xs nx-subtle">Moy.</p><p className="text-lg font-semibold">{td.vitesseMoy} km/h</p></div>
              <div className="text-right"><p className="text-xs nx-subtle">Max</p><p className={`text-lg font-semibold ${td.vitesseMax > 130 ? 'text-red-400' : td.vitesseMax > 110 ? 'text-amber-400' : ''}`}>{td.vitesseMax} km/h</p></div>
            </div>
          </div>
          <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-[10px] uppercase nx-muted">Semaine</p>
            <div className="mt-1.5 flex items-end justify-between"><p className="text-xl font-semibold">{fmtMin(td.tempsConduiteSem)}</p><p className="text-xs nx-subtle">/ 56h</p></div>
            <ProgressBar value={td.tempsConduiteSem} max={3360} color={td.tempsConduiteSem > 3000 ? '#f97316' : '#3b82f6'} />
            <p className="mt-1 text-xs nx-subtle">{td.distanceSem} km</p>
          </div>
        </div>
      ) : (
        <div className="nx-panel flex flex-col items-center justify-center p-10 text-center">
          <div className="text-3xl opacity-20 mb-2">📊</div>
          <p className="text-sm nx-subtle">Sélectionnez un conducteur</p>
        </div>
      )}
    </div>
  )
}

// ─── Tab Alertes docs ─────────────────────────────────────────────────────────

function TabAlertes({ alertes }: { alertes: AlerteDoc[] }) {
  const urgentes = alertes.filter(a => a.joursRestants <= 30).sort((a, b) => a.joursRestants - b.joursRestants)
  const ok = alertes.filter(a => a.joursRestants > 30)
  function Row({ a }: { a: AlerteDoc }) {
    const color = a.joursRestants <= 7 ? '#ef4444' : a.joursRestants <= 30 ? '#f59e0b' : '#10b981'
    return (
      <div className="flex items-center gap-4 border-b px-5 py-4 last:border-0 hover:bg-white/2" style={{ borderColor: 'var(--border)' }}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}20`, color }}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8" /></svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{TYPE_DOC_LABELS[a.type]}</p>
          <p className="text-xs nx-subtle">{a.conducteurNom}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold" style={{ color }}>{fmtDate(a.expiration)}</p>
          <p className="text-xs nx-subtle">{a.joursRestants <= 0 ? 'Expiré' : `${a.joursRestants} j`}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="nx-panel overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold text-amber-400">⚠ À renouveler — 30 jours</p>
          <p className="text-xs nx-subtle mt-0.5">{urgentes.length} document(s)</p>
        </div>
        {urgentes.length === 0 ? <p className="px-5 py-8 text-center text-sm nx-subtle">Aucun document urgent</p> : urgentes.map(a => <Row key={a.id} a={a} />)}
      </div>
      <div className="nx-panel overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold text-emerald-400">✓ Documents valides</p>
        </div>
        {ok.map(a => <Row key={a.id} a={a} />)}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

type Tab = 'donnees' | 'infractions' | 'attestations' | 'alertes'

export default function Tachygraphe() {
  const { profil, role } = useAuth()
  const [tab, setTab] = useState<Tab>('infractions')
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(new Date().toISOString())
  const [loading, setLoading] = useState(true)

  const [conducteurs, setConducteurs] = useState<ConducteurDB[]>([])
  const [tachyData, setTachyData] = useState<Record<string, TachyData>>({})
  const [infractions, setInfractions] = useState<Infraction[]>([])
  const [alertesDoc, setAlertesDoc] = useState<AlerteDoc[]>([])
  const [rapports, setRapports] = useState<Rapport[]>([])
  const [config, setConfig] = useState<Record<string, string>>({})
  const [alertesEnvoyees, setAlertesEnvoyees] = useState<AlerteEnvoyee[]>([])

  const [releveState, setReleveState] = useState<{ conducteur: ConducteurDB; infractions: Infraction[] } | null>(null)
  const [attestationState, setAttestationState] = useState<ConducteurDB | null>(null)
  const [alerteState, setAlerteState] = useState<{ conducteur: ConducteurDB; infractions: Infraction[] } | null>(null)
  const [showBulk, setShowBulk] = useState(false)
  const isConducteurSession = role === 'conducteur'

  const currentConducteurId = useMemo(() => {
    if (!isConducteurSession || !profil) return null
    const profilEmail = normalizeIdentity(profil.email)
    return { email: profilEmail, identity: conducteurIdentity({ prenom: profil.prenom ?? '', nom: profil.nom ?? '', email: profil.email ?? null }) }
  }, [isConducteurSession, profil])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [cRes, rRes, cfg] = await Promise.all([
      supabase.from('conducteurs').select('id,nom,prenom,numero_permis,carte_tachy_numero,carte_tachy_expiration,permis_expiration,fco_expiration,statut,email').eq('statut', 'actif'),
      (supabase.from('rapports_conducteurs' as any).select('*').order('created_at', { ascending: false }) as any),
      loadConfig(),
    ])
    const conds = (cRes.data ?? []) as ConducteurDB[]
    const visibleConducteurs = isConducteurSession && currentConducteurId
      ? conds.filter(conducteur =>
          (currentConducteurId.email && normalizeIdentity(conducteur.email) === currentConducteurId.email)
          || conducteurIdentity(conducteur) === currentConducteurId.identity,
        )
      : conds
    const visibleIds = new Set(visibleConducteurs.map(conducteur => conducteur.id))

    setConducteurs(visibleConducteurs)
    const td: Record<string, TachyData> = {}
    for (const c of visibleConducteurs) td[c.id] = makeTachyData(c)
    setTachyData(td)
    setInfractions(makeInfractions(visibleConducteurs))
    setAlertesDoc(makeAlertesDoc(visibleConducteurs))
    setRapports(((rRes.data ?? []) as Rapport[]).filter(rapport => visibleIds.has(rapport.conducteur_id)))
    setConfig(cfg)
    setLoading(false)
  }, [currentConducteurId, isConducteurSession])

  const handleDeliverRapport = useCallback(async (
    conducteur: ConducteurDB,
    type: 'releve_infraction' | 'attestation_activite',
    debut: Date,
    contenu: Record<string, unknown>,
    currentConfig: Record<string, string>,
  ) => {
    return sendRapportToConducteurMailbox(conducteur, type, debut, contenu, currentConfig)
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  async function handleSync() {
    setSyncing(true)
    await loadData()
    setLastSync(new Date().toISOString())
    setSyncing(false)
  }

  const nbInfractions = infractions.filter(i => i.statut !== 'cloturee').length
  const nbAlertes = alertesDoc.filter(a => a.joursRestants <= 30).length

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'donnees', label: 'Lecture des données' },
    { id: 'infractions', label: 'Infractions', badge: nbInfractions },
    { id: 'attestations', label: 'Attestations d\'activité', badge: rapports.filter(r => r.type === 'attestation_activite').length || undefined },
    { id: 'alertes', label: 'Alertes documents', badge: nbAlertes },
  ]

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-5 p-5 md:p-6">
      {/* Header */}
      <div className="nx-panel px-6 py-5" style={{ background: 'linear-gradient(135deg, #08111f 0%, #0f172a 60%, #1e1b4b 100%)' }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-300/70">Exploitation — Réglementation</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Chronotachygraphe</h2>
            <p className="mt-1.5 text-sm text-slate-300">Lecture · Contrôle des temps · Infractions · Attestations mensuelle</p>
            <p className="mt-2 text-xs text-slate-500">Dernière remontée : {fmtDateTime(lastSync)}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            {!isConducteurSession && <button type="button" onClick={() => setShowBulk(true)}
              className="flex items-center gap-2 rounded-2xl border border-white/15 bg-emerald-600/20 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-600/35">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" /></svg>
              Génération mensuelle
            </button>}
            <button type="button" onClick={() => void handleSync()} disabled={syncing}
              className="flex items-center gap-2 rounded-2xl border border-white/15 bg-indigo-600/25 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-600/40 disabled:opacity-60">
              <svg className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />
              </svg>
              {syncing ? 'Remontée...' : 'Remonter les données'}
            </button>
          </div>
        </div>
      </div>

      {isConducteurSession && (
        <div className="nx-panel border border-blue-500/20 bg-blue-500/5 px-5 py-4">
          <p className="text-sm font-medium text-blue-300">Vue conducteur</p>
          <p className="mt-1 text-sm text-slate-300">Seules vos donnees tachygraphe, vos infractions et vos documents generes sont visibles depuis cette session.</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Conducteurs actifs', value: String(conducteurs.length), sub: `${Object.values(tachyData).filter(t => t.statutCompliance === 'conforme').length} conformes` },
          { label: 'Infractions actives', value: String(nbInfractions), sub: `${infractions.filter(i => i.gravite === 'critique' && i.statut !== 'cloturee').length} critique(s)`, accent: nbInfractions > 0 ? 'var(--danger)' : undefined },
          { label: 'Documents générés', value: String(rapports.length), sub: `${rapports.filter(r => r.statut === 'envoye').length} envoyé(s)`, accent: rapports.length > 0 ? '#6366f1' : undefined },
          { label: 'Docs à renouveler', value: String(nbAlertes), sub: 'Expirant dans 30 j', accent: nbAlertes > 0 ? '#f59e0b' : undefined },
        ].map(kpi => (
          <div key={kpi.label} className="nx-panel px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] nx-muted">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold" style={kpi.accent ? { color: kpi.accent } : {}}>{kpi.value}</p>
            <p className="mt-1 text-xs nx-subtle">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div>
        <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${tab === t.id ? 'border-[color:var(--primary)] text-[color:var(--primary)]' : 'border-transparent nx-subtle hover:text-[color:var(--text)]'}`}
              style={{ marginBottom: -1 }}>
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tab === t.id ? 'bg-[color:var(--primary-soft)] text-[color:var(--primary)]' : 'bg-white/8 nx-muted'}`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-5">
          {tab === 'donnees' && <TabDonnees conducteurs={conducteurs} tachyData={tachyData} />}
          {tab === 'infractions' && (
            <TabInfractions conducteurs={conducteurs} infractions={infractions} rapports={rapports} alertesEnvoyees={alertesEnvoyees}
              onReleve={(c, infs) => setReleveState({ conducteur: c, infractions: infs })}
              onAlerte={(c, infs) => setAlerteState({ conducteur: c, infractions: infs })}
              onBulk={() => setShowBulk(true)}
              canManageDocuments={!isConducteurSession} />
          )}
          {tab === 'attestations' && (
            <TabAttestations conducteurs={conducteurs} tachyData={tachyData} rapports={rapports}
              onAttestation={c => setAttestationState(c)}
              onBulk={() => setShowBulk(true)}
              canManageDocuments={!isConducteurSession} />
          )}
          {tab === 'alertes' && <TabAlertes alertes={alertesDoc} />}
        </div>
      </div>

      {/* Modals */}
      {releveState && (
        <ModalReleve conducteur={releveState.conducteur} infractions={releveState.infractions} config={config} onClose={() => setReleveState(null)}
          onSaved={r => setRapports(prev => [r, ...prev])}
          onDeliver={handleDeliverRapport} />
      )}
      {attestationState && (
        <ModalAttestation conducteur={attestationState} tachyData={tachyData[attestationState.id]} config={config} onClose={() => setAttestationState(null)}
          onSaved={r => setRapports(prev => [r, ...prev])}
          onDeliver={handleDeliverRapport} />
      )}
      {alerteState && (
        <ModalAlerte conducteur={alerteState.conducteur} infractions={alerteState.infractions} onClose={() => setAlerteState(null)}
          onSend={a => { setAlertesEnvoyees(prev => [...prev, a]); setAlerteState(null) }} />
      )}
      {showBulk && (
        <ModalGenerationBulk conducteurs={conducteurs} tachyData={tachyData} infractions={infractions} config={config} rapports={rapports}
          onClose={() => setShowBulk(false)}
          onGenerated={nouveaux => { setRapports(prev => [...nouveaux, ...prev]) }}
          onDeliver={handleDeliverRapport} />
      )}
    </div>
  )
}
