const DEMO_PURGE_FLAG_KEY = 'nexora-demo-data-purged-v4'

const DEMO_LOCAL_KEYS = [
  'nexora-demo-local-db-v1',
  'nexora-demo-dirty-ids',
  'nexora-demo-chat-v1',
  'nexora-demo-mail-v1',
  'nexora-secure-vault-v1',
  'nexora-hr-documents-v1',
  'nexora-signatures-v1',
  'nexora-expense-tickets-v1',
  'nexora-expense-presets-v1',
  'nexora-fines-v1',
  'erp-demo-seed-20260328-v4',
  'nexora-client-portal-v1',
  'nexora-affretement-portal-v1',
  'nexora_mock_data_mode_v1',
  'nexora_planning_custom_rows_v1',
  'nexora_planning_custom_blocks_v1',
  'nexora_planning_conductor_colors_v1',
  'nexora_planning_row_order_v1',
  'nexora_planning_show_affretement_assets_v1',
  'nexora_planning_compliance_block_v1',
  'nexora_planning_compliance_block_rules_v1',
  'nexora_planning_simulation_mode_v1',
  'nexora_planning_auto_habillage_v1',
  'nexora_planning_auto_pause_v1',
]

export function clearDemoAndMockLocalData() {
  if (typeof window === 'undefined') return
  const alreadyPurged = window.localStorage.getItem(DEMO_PURGE_FLAG_KEY) === '1'
  if (alreadyPurged) return

  DEMO_LOCAL_KEYS.forEach(key => window.localStorage.removeItem(key))
  window.localStorage.setItem(DEMO_PURGE_FLAG_KEY, '1')
}
