-- Rattachement des profils a un client ERP et parametrage par client

CREATE TABLE IF NOT EXISTS public.erp_v11_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.erp_v11_tenants (tenant_key, display_name)
VALUES ('default', 'Tenant par defaut')
ON CONFLICT (tenant_key) DO NOTHING;

ALTER TABLE public.profils
  ADD COLUMN IF NOT EXISTS tenant_key text NULL;

ALTER TABLE public.erp_v11_tenants
  ADD COLUMN IF NOT EXISTS default_max_concurrent_screens integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS allowed_pages jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'erp_v11_tenants_default_max_concurrent_screens_check'
  ) THEN
    ALTER TABLE public.erp_v11_tenants
      ADD CONSTRAINT erp_v11_tenants_default_max_concurrent_screens_check
      CHECK (default_max_concurrent_screens BETWEEN 1 AND 12);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profils_tenant_key_fk'
  ) THEN
    ALTER TABLE public.profils
      ADD CONSTRAINT profils_tenant_key_fk
      FOREIGN KEY (tenant_key)
      REFERENCES public.erp_v11_tenants(tenant_key)
      ON DELETE SET NULL;
  END IF;
END $$;

UPDATE public.profils
SET tenant_key = 'default'
WHERE tenant_key IS NULL;

ALTER TABLE public.profils
  ALTER COLUMN tenant_key SET DEFAULT 'default';

CREATE INDEX IF NOT EXISTS profils_tenant_key_idx
  ON public.profils(tenant_key);
