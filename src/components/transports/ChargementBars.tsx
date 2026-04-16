/**
 * ChargementBars.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Composant visuel de remplissage d'une remorque par rapport à un OT.
 * Affiche des barres de progression pour : poids, volume, longueur.
 *
 * Usage :
 *   <ChargementBars ot={ot} remorque={rem} />
 *   <ChargementBars ot={ot} remorque={rem} compact />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  calcRemplissageEtendu,
  couleurBarrePct,
  couleurTextePct,
  validateTrailerAssignment,
  badgeValidation,
  badgeCompatibilite,
  checkCompatibiliteMetier,
  resolveTrailerTypeCode,
  TRAILER_TYPE_MAP,
  type OtChargement,
  type RemorqueCapacite,
} from '@/lib/trailerValidation'

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composant : une barre de progression
// ─────────────────────────────────────────────────────────────────────────────
interface BarreProps {
  label:     string
  valeur:    string   // ex: "18 t"
  max:       string   // ex: "24 t"
  pct:       number | null
  libre:     string | null
  compact?:  boolean
}

function BarreRemplissage({ label, valeur, max, pct, libre, compact }: BarreProps) {
  if (pct === null) return null
  const colorBarre = couleurBarrePct(pct)
  const colorText  = couleurTextePct(pct)
  const fill = Math.min(pct, 100)
  return (
    <div className={compact ? '' : 'space-y-1'}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-600">
          {label}
          {!compact && (
            <span className="ml-1 font-medium text-slate-900">
              {valeur} / {max}
            </span>
          )}
        </span>
        <span className={`text-xs ${colorText}`}>{pct}%</span>
      </div>
      <div className={`w-full rounded-full bg-slate-200 ${compact ? 'h-2' : 'h-3'}`}>
        <div
          className={`${compact ? 'h-2' : 'h-3'} rounded-full transition-all duration-300 ${colorBarre}`}
          style={{ width: `${fill}%` }}
        />
      </div>
      {!compact && libre && (
        <p className="text-xs text-slate-500">
          Reste libre : <strong className="text-slate-700">{libre}</strong>
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Props du composant principal
// ─────────────────────────────────────────────────────────────────────────────
interface ChargementBarsProps {
  ot:       OtChargement
  remorque: RemorqueCapacite & { immatriculation?: string }
  /** Affichage réduit pour le planning / liste */
  compact?: boolean
  /** Masquer le bloc si aucune donnée de capacité (au lieu d'afficher un message) */
  hideIfEmpty?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function ChargementBars({
  ot,
  remorque,
  compact   = false,
  hideIfEmpty = false,
}: ChargementBarsProps) {
  const rem = remorque

  // Calcul du remplissage
  const remplissage = calcRemplissageEtendu(ot, rem)

  // Pas de capacité renseignée sur la remorque
  const noCapacity = !rem.charge_utile_kg && !rem.volume_max_m3 && !rem.longueur_m
  // Pas de données de chargement sur l'OT
  const noLoad = !ot.poids_kg && !ot.tonnage && !ot.volume_m3 && !ot.longueur_m && !ot.metrage_ml

  if (noCapacity && hideIfEmpty) return null
  if (noCapacity && noLoad && hideIfEmpty) return null

  // Validation complète
  const validation = validateTrailerAssignment(ot, rem)
  const badge      = badgeValidation(validation.status)

  // Compatibilité type
  const trailerCode = resolveTrailerTypeCode(rem)
  const compat      = checkCompatibiliteMetier(trailerCode, ot.type_chargement)
  const compatBadge = badgeCompatibilite(compat.niveau)
  const trailerLabel = TRAILER_TYPE_MAP.get(trailerCode ?? '')?.label ?? trailerCode ?? rem.immatriculation ?? 'Remorque'

  // ── Rendu compact (planning, liste remorques) ──────────────────────────────
  if (compact) {
    const hasBars = remplissage.poids_pct !== null || remplissage.volume_pct !== null || remplissage.longueur_pct !== null
    return (
      <div className="space-y-1.5">
        {/* Badge statut */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
            {badge.icon} {badge.label}
          </span>
          {compat.niveau !== 'compatible' && (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${compatBadge.cls}`}>
              {compatBadge.label}
            </span>
          )}
        </div>
        {/* Barres compactes */}
        {hasBars && (
          <div className="space-y-1">
            {remplissage.poids_pct !== null && (
              <BarreRemplissage
                label="Poids"
                valeur={`${((ot.poids_kg ?? (ot.tonnage ?? 0) * 1000) / 1000).toFixed(1)} t`}
                max={`${((rem.charge_utile_kg ?? 0) / 1000).toFixed(1)} t`}
                pct={remplissage.poids_pct}
                libre={null}
                compact
              />
            )}
            {remplissage.volume_pct !== null && (
              <BarreRemplissage
                label="Volume"
                valeur={`${ot.volume_m3} m³`}
                max={`${rem.volume_max_m3} m³`}
                pct={remplissage.volume_pct}
                libre={null}
                compact
              />
            )}
            {remplissage.longueur_pct !== null && (
              <BarreRemplissage
                label="Longueur"
                valeur={`${ot.longueur_m ?? ot.metrage_ml} m`}
                max={`${rem.longueur_m} m`}
                pct={remplissage.longueur_pct}
                libre={null}
                compact
              />
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Rendu complet (formulaire OT / détail) ────────────────────────────────
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">

      {/* En-tête */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Remplissage · {rem.immatriculation ?? trailerLabel}
          </span>
          {trailerLabel && trailerLabel !== rem.immatriculation && (
            <span className="text-xs text-slate-400">({trailerLabel})</span>
          )}
        </div>
        {/* Badge statut global */}
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${badge.cls}`}>
          {badge.icon} {badge.label}
        </span>
      </div>

      {/* Compatibilité type (si non-compatible) */}
      {compat.niveau !== 'compatible' && (
        <div className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${compatBadge.cls}`}>
          <span className="mt-0.5 text-base">
            {compat.niveau === 'incompatible' ? '⛔' : '⚠'}
          </span>
          <div>
            <p className="text-xs font-semibold">{compatBadge.label}</p>
            {compat.note && <p className="text-xs mt-0.5 opacity-90">{compat.note}</p>}
          </div>
        </div>
      )}

      {/* Avertissement capacité non renseignée */}
      {noCapacity && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Capacité non renseignée sur cette remorque — éditez la fiche remorque pour activer le calcul.
        </p>
      )}
      {!noCapacity && noLoad && (
        <p className="text-xs text-slate-400 italic">
          Renseignez le poids, le volume ou la longueur pour afficher le taux de remplissage.
        </p>
      )}

      {/* Barres de remplissage */}
      <div className="space-y-3">
        <BarreRemplissage
          label="Poids"
          valeur={`${((ot.poids_kg ?? (ot.tonnage ?? 0) * 1000) / 1000).toFixed(2)} t`}
          max={`${((rem.charge_utile_kg ?? 0) / 1000).toFixed(2)} t`}
          pct={remplissage.poids_pct}
          libre={remplissage.poids_libre_kg !== null
            ? `${remplissage.poids_libre_kg.toLocaleString('fr-FR')} kg`
            : null
          }
        />
        <BarreRemplissage
          label="Volume"
          valeur={`${ot.volume_m3 ?? 0} m³`}
          max={`${rem.volume_max_m3 ?? 0} m³`}
          pct={remplissage.volume_pct}
          libre={remplissage.volume_libre_m3 !== null
            ? `${remplissage.volume_libre_m3} m³`
            : null
          }
        />
        <BarreRemplissage
          label="Longueur"
          valeur={`${ot.longueur_m ?? ot.metrage_ml ?? 0} m`}
          max={`${rem.longueur_m ?? 0} m`}
          pct={remplissage.longueur_pct}
          libre={remplissage.longueur_libre_m !== null
            ? `${remplissage.longueur_libre_m} m`
            : null
          }
        />
      </div>

      {/* Liste des erreurs */}
      {validation.errors.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Blocages
          </p>
          {validation.errors.map(e => (
            <div key={e.code} className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-red-500 mt-0.5">⛔</span>
              <p className="text-xs font-medium text-red-700">{e.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Liste des warnings */}
      {validation.warnings.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Mises en garde
          </p>
          {validation.warnings.map(w => (
            <div key={w.code} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="text-amber-500 mt-0.5">⚠</span>
              <p className="text-xs font-medium text-amber-700">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Infos convoi exceptionnel */}
      {(ot.hors_gabarit || ot.charge_indivisible) && (
        <div className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
          <span className="text-indigo-500 mt-0.5">ℹ</span>
          <p className="text-xs text-indigo-700">
            {ot.hors_gabarit && 'Charge hors gabarit détectée. '}
            {ot.charge_indivisible && 'Charge indivisible. '}
            Vérifiez si un convoi exceptionnel et des autorisations préfectorales sont nécessaires.
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant inline pour la liste de remorques (badge + score)
// ─────────────────────────────────────────────────────────────────────────────
interface RemorqueBadgeProps {
  ot:       OtChargement
  remorque: RemorqueCapacite
}

export function RemorqueCompatBadge({ ot, remorque }: RemorqueBadgeProps) {
  const validation = validateTrailerAssignment(ot, remorque)
  const badge      = badgeValidation(validation.status)
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
      {badge.icon} {badge.label}
    </span>
  )
}
