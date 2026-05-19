import { describe, expect, it, vi } from 'vitest'
import { __testables } from '../netlify/functions/admin-users.js'

describe('admin-users testables', () => {
  it('valide la securite batch: succes, auto-protection, garde-fou privilegie', () => {
    const ok = __testables.validateBulkSafety({
      targets: [{ id: 'p2', user_id: 'u2', role: 'exploitant', account_status: 'actif' }],
      allProfiles: [
        { id: 'p1', role: 'admin', account_status: 'actif' },
        { id: 'p2', role: 'exploitant', account_status: 'actif' },
      ],
      currentUserId: 'u1',
      bulkAction: 'suspend',
    })
    expect(ok).toBeNull()

    const selfProtection = __testables.validateBulkSafety({
      targets: [{ id: 'p1', user_id: 'u1', role: 'admin', account_status: 'actif' }],
      allProfiles: [{ id: 'p1', role: 'admin', account_status: 'actif' }],
      currentUserId: 'u1',
      bulkAction: 'disable',
    })
    expect(selfProtection).toContain('cannot disable/suspend/archive your own account')

    const privilegedGuard = __testables.validateBulkSafety({
      targets: [{ id: 'p1', user_id: 'u2', role: 'admin', account_status: 'actif' }],
      allProfiles: [{ id: 'p1', role: 'admin', account_status: 'actif' }],
      currentUserId: 'u9',
      bulkAction: 'archive',
    })
    expect(privilegedGuard).toContain('admin/dirigeant actif')
  })

  it('trie par derniere connexion et pagine correctement', () => {
    const users = [
      { id: 'a', last_sign_in_at: '2026-04-02T10:00:00.000Z' },
      { id: 'b', last_sign_in_at: null },
      { id: 'c', last_sign_in_at: '2026-04-10T10:00:00.000Z' },
    ]

    const desc = __testables.sortUsersByLastSignIn(users, false)
    expect(desc.map(u => u.id)).toEqual(['c', 'a', 'b'])

    const asc = __testables.sortUsersByLastSignIn(users, true)
    expect(asc.map(u => u.id)).toEqual(['b', 'a', 'c'])

    const page2 = __testables.paginateCollection(desc, 2, 2)
    expect(page2.map(u => u.id)).toEqual(['b'])
  })

  it('cree des evenements audit pour create/update/delete/bulk', async () => {
    const inserted = []
    const dbClient = {
      from: vi.fn(() => ({
        insert: vi.fn((payload) => {
          inserted.push(payload)
          return Promise.resolve({ data: null, error: null })
        }),
      })),
    }

    const events = [
      'admin_user_created',
      'admin_user_updated',
      'admin_user_deleted',
      'admin_users_bulk_action',
    ]

    for (const eventType of events) {
      await __testables.logPlatformAuditEvent(dbClient, {
        currentUser: { id: 'u-admin', email: 'admin@test.local' },
        eventType,
        targetType: 'profile',
        targetId: 'p-1',
        payload: { probe: eventType },
        ipHash: 'abc123',
      })
    }

    expect(inserted).toHaveLength(4)
    expect(inserted.map(row => row.event_type)).toEqual(events)
  })
})