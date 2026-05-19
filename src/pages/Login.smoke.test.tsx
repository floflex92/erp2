import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/auth', () => ({
  firstPage: () => '/dashboard',
  useAuth: () => ({
    session: null,
    signIn: vi.fn(async () => ({ error: null })),
    loading: false,
    profilLoading: false,
    authError: null,
    canUseSessionPicker: false,
    sessionRole: null,
    role: null,
    tenantAllowedPages: null,
    enabledModules: null,
  }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(async () => ({ error: null })),
      verifyOtp: vi.fn(async () => ({ error: null })),
    },
  },
}))

vi.mock('@/site/lib/sitePhotos', () => ({
  sitePhotos: {
    loginHero: {
      src: () => '/mock-login.webp',
      srcSet: () => '/mock-login.webp 768w',
    },
  },
}))

vi.mock('@/site/lib/analytics', () => ({
  EVENTS: {},
  FUNNELS: { AUTH_LOGIN: 'auth_login', MARKETING_DEMO: 'marketing_demo' },
  FUNNEL_STEPS: { AUTH_LOGIN: { SUBMIT: 'submit', SUCCESS: 'success' } },
  trackEvent: vi.fn(),
  trackFunnelStep: vi.fn(),
  trackPageView: vi.fn(),
}))

import Login from './Login'

describe('Login smoke', () => {
  it('affiche le formulaire principal de connexion', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Connexion' })).not.toBeNull()
    expect(screen.getByLabelText('Adresse email')).not.toBeNull()
    expect(screen.getByLabelText('Mot de passe')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Se connecter' })).not.toBeNull()
  })
})