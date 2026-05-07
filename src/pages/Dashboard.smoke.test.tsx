import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/auth', () => ({
  ROLE_LABELS: { exploitant: 'Exploitant' },
  useAuth: () => ({ role: 'exploitant' }),
}))

vi.mock('@/lib/dashboardPrefs', () => ({
  getDefaultPrefs: () => ({}),
  loadPrefs: () => ({}),
  savePrefs: vi.fn(),
  toggleWidget: vi.fn(),
  moveWidget: vi.fn(),
  moveWidgetToTarget: vi.fn(),
  sortedWidgets: () => [],
}))

import Dashboard from './Dashboard'

describe('Dashboard smoke', () => {
  it('affiche le shell du cockpit decisionnel sans dependre des widgets lourds', () => {
    render(<Dashboard />)

    expect(screen.getByRole('heading', { name: 'Cockpit decisionnel' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Personnaliser le dashboard' })).not.toBeNull()
  })
})