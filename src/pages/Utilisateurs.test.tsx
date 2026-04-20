import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/auth', () => ({
  ROLE_LABELS: {
    dirigeant: 'Dirigeant',
    admin: 'Admin',
    exploitant: 'Exploitant',
  },
  useAuth: () => ({
    session: { access_token: 'token-test' },
    isPlatformAdmin: false,
  }),
}))

import Utilisateurs from './Utilisateurs'

function makeGetPayload(overrides: Record<string, unknown> = {}) {
  return {
    users: [
      {
        id: 'p1',
        user_id: 'u1',
        role: 'dirigeant',
        matricule: 'M1',
        company_id: 1,
        tenant_key: 't1',
        account_status: 'actif',
        account_type: 'standard',
        account_origin: 'manuel_admin',
        is_demo_account: false,
        is_investor_account: false,
        requested_from_public_form: false,
        demo_expires_at: null,
        notes_admin: null,
        permissions: [],
        max_concurrent_screens: 1,
        nom: 'Martin',
        prenom: 'Alice',
        created_at: '2026-04-01T10:00:00.000Z',
        updated_at: '2026-04-01T10:00:00.000Z',
        email: 'alice@example.com',
        external_email: 'alice@example.com',
        company_name: 'Nexora',
        phone: '0102030405',
        email_confirmed_at: '2026-04-01T10:00:00.000Z',
        last_sign_in_at: '2026-04-15T10:00:00.000Z',
      },
    ],
    requests: [],
    role_changes: [],
    audit_events: [],
    audit_pagination: { page: 1, page_size: 25, total: 0, days: 90, search: '' },
    permissions_catalog: [],
    pagination: { page: 1, page_size: 20, total: 1 },
    ...overrides,
  }
}

describe('Utilisateurs page', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/.netlify/functions/admin-users') && (!init?.method || init.method === 'GET')) {
        return {
          ok: true,
          json: async () => makeGetPayload(),
        } as Response
      }
      return {
        ok: true,
        json: async () => ({ ok: true }),
      } as Response
    }))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('persiste les filtres dans localStorage', async () => {
    render(
      <MemoryRouter>
        <Utilisateurs />
      </MemoryRouter>,
    )

    const triSelect = await screen.findByLabelText('Tri')
    await userEvent.selectOptions(triSelect, 'last_sign_in_at')

    await waitFor(() => {
      const raw = localStorage.getItem('utilisateurs_filters_v1')
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw as string).sortBy).toBe('last_sign_in_at')
    })
  })

  it('envoie une seule requete PATCH pour une action en lot', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/.netlify/functions/admin-users') && (!init?.method || init.method === 'GET')) {
        return { ok: true, json: async () => makeGetPayload() } as Response
      }
      if (url.includes('/.netlify/functions/admin-users') && init?.method === 'PATCH') {
        return { ok: true, json: async () => ({ ok: true }) } as Response
      }
      return { ok: true, json: async () => ({}) } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter>
        <Utilisateurs />
      </MemoryRouter>,
    )

    const userRow = await screen.findByRole('row', { name: /Alice Martin/ })
    const rowCheckbox = within(userRow).getByRole('checkbox')
    await userEvent.click(rowCheckbox)
    await userEvent.click(screen.getByRole('button', { name: /Appliquer sur 1 compte/ }))

    const patchCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')
    expect(patchCalls).toHaveLength(1)

    const body = JSON.parse(String(patchCalls[0][1]?.body ?? '{}'))
    expect(Array.isArray(body.ids)).toBe(true)
    expect(body.ids).toEqual(['p1'])
  })

  it('exporte en CSV toutes les pages filtrees', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:test'),
      writable: true,
      configurable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(() => {}),
      writable: true,
      configurable: true,
    })

    const createElementSpy = vi.spyOn(document, 'createElement')
    const clickSpy = vi.fn()
    createElementSpy.mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === 'a') {
        const a = document.createElementNS('http://www.w3.org/1999/xhtml', 'a') as HTMLAnchorElement
        a.click = clickSpy
        return a
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
    })

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (!url.includes('/.netlify/functions/admin-users') || (init?.method && init.method !== 'GET')) {
        return { ok: true, json: async () => ({ ok: true }) } as Response
      }

      const u = new URL(url, 'http://localhost')
      const page = Number(u.searchParams.get('page') ?? '1')
      const pageSize = Number(u.searchParams.get('page_size') ?? '20')

      if (pageSize === 100 && page === 1) {
        return { ok: true, json: async () => makeGetPayload({ pagination: { page: 1, page_size: 100, total: 2 } }) } as Response
      }
      if (pageSize === 100 && page === 2) {
        return {
          ok: true,
          json: async () => makeGetPayload({
            users: [
              {
                ...makeGetPayload().users[0],
                id: 'p2',
                user_id: 'u2',
                nom: 'Durand',
                prenom: 'Bob',
              },
            ],
            pagination: { page: 2, page_size: 100, total: 2 },
          }),
        } as Response
      }

      return { ok: true, json: async () => makeGetPayload() } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter>
        <Utilisateurs />
      </MemoryRouter>,
    )

    const rows = await screen.findAllByText('Alice Martin')
    expect(rows.length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV (filtres actifs)' }))

    await waitFor(() => {
      const exportCalls = fetchMock.mock.calls.filter(([input]) => {
        const url = String(input)
        return url.includes('page_size=100')
      })
      expect(exportCalls.length).toBeGreaterThanOrEqual(2)
      expect(clickSpy).toHaveBeenCalledTimes(1)
    })
  })
})
