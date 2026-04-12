/**
 * Composant modal alertes compliance CE 561
 * Affiche infractions bloquantes et avertissements avec options de forçage
 */

import { useState } from 'react'
import type { CEAlert } from '@/lib/ce561Validation'

interface ComplianceAlertModalProps {
  visible: boolean
  alerts: CEAlert[]
  onCancel: () => void
  onConfirm: (forced: boolean) => void
  loading?: boolean
}

export default function ComplianceAlertModal({
  visible,
  alerts,
  onCancel,
  onConfirm,
  loading = false,
}: ComplianceAlertModalProps) {
  const [forced, setForced] = useState(false)

  if (!visible || alerts.length === 0) return null

  const blockingAlerts = alerts.filter(a => a.type === 'bloquant')
  const warningAlerts = alerts.filter(a => a.type === 'avertissement')
  const canForce = blockingAlerts.length > 0 && blockingAlerts.length <= 3

  const handleConfirm = () => {
    if (!loading) {
      onConfirm(forced)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-11/12 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-200 px-6 py-4">
          <h2 className="text-lg font-bold text-red-900">
            ⚠️ Validation CE 561/2006
          </h2>
          <p className="text-sm text-red-700 mt-1">
            {blockingAlerts.length} infraction(s) détectée(s)
          </p>
        </div>

        {/* Alertes bloquantes */}
        {blockingAlerts.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-red-800 mb-3">
              🚫 Infractions bloquantes
            </h3>
            <div className="space-y-2">
              {blockingAlerts.map((alert, i) => (
                <div
                  key={i}
                  className="bg-red-50 border-l-4 border-red-500 p-3 rounded"
                >
                  <p className="text-sm font-medium text-red-900">{alert.message}</p>
                  <p className="text-xs text-red-700 mt-1">Code: {alert.code}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avertissements */}
        {warningAlerts.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-yellow-800 mb-3">
              ⚡ Avertissements
            </h3>
            <div className="space-y-2">
              {warningAlerts.map((alert, i) => (
                <div
                  key={i}
                  className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded"
                >
                  <p className="text-sm text-yellow-900">{alert.message}</p>
                  <p className="text-xs text-yellow-700 mt-1">Code: {alert.code}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Option forçage */}
        {canForce && blockingAlerts.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={forced}
                onChange={e => setForced(e.target.checked)}
                disabled={loading}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Forcer l'assignation
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Enregistre la mission malgré les infractions (audit tracé)
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Buttons */}
        <div className="px-6 py-4 flex gap-3 justify-end bg-gray-50">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || (!canForce && blockingAlerts.length > 0 && !forced)}
            className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors ${
              forced
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Assignation...' : forced ? 'Forcer & Assigner' : 'Assigner'}
          </button>
        </div>
      </div>
    </div>
  )
}
