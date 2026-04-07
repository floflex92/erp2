-- ============================================================
-- MULTI-TENANT PHASE 2 : Roles & Permissions
-- Date : 2026-04-04
-- Objectif : Infrastructure roles/permissions complementaire au systeme
--             legacy (colonne 'role' de profils).
--
-- IMPORTANT : NE SUPPRIME PAS la colonne 'role' de profils.
--             Les deux systemes coexistent. Le nouveau systeme peut etre
--             adopte progressivement via user_roles sans casser quoi que
--             ce soit dans l'application existante.
--
-- STRATEGIE :
--   - roles      : table des roles par company (system + custom)
--   - permissions: table des droits atomiques (ressource:action)
--   - user_roles : junction profil ↔ role
--   - role_permissions : junction role ↔ permission
-- ============================================================


-- ============================================================
-- 1. TABLE ROLES
--    Contient les roles disponibles par company.
--    is_system=true = roles integres, non modifiables par les tenants.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.roles (
  id          serial        PRIMARY KEY,
  company_id  integer       NOT NULL DEFAULT 1
                REFERENCES public.companies(id) ON DELETE CASCADE,
  name        text          NOT NULL,
  label       text          NOT NULL,
  description text          NULL,
  -- true = role systeme integre (admin, conducteur...) ; false = role custom tenant
  is_system   boolean       NOT NULL DEFAULT false,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS roles_company_id_idx ON public.roles(company_id);
CREATE INDEX IF NOT EXISTS roles_is_system_idx  ON public.roles(is_system);


-- ============================================================
-- 2. TABLE PERMISSIONS
--    Droits atomiques independants des companies (partagees).
--    Format : "resource:action" (ex: 'transport:read', 'clients:write')
-- ============================================================

CREATE TABLE IF NOT EXISTS public.permissions (
  id          serial      PRIMARY KEY,
  name        text        NOT NULL UNIQUE,  -- ex: 'transport:read'
  resource    text        NOT NULL,         -- ex: 'transport'
  action      text        NOT NULL,         -- ex: 'read', 'write', 'delete', 'admin'
  label       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS permissions_resource_idx ON public.permissions(resource);


-- ============================================================
-- 3. TABLE USER_ROLES
--    Junction : un profil peut avoir plusieurs roles dans sa company.
--    RISQUE : granted_by peut etre NULL si l'admin est supprime.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id uuid        NOT NULL REFERENCES public.profils(id) ON DELETE CASCADE,
  role_id         integer     NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  company_id      integer     NOT NULL DEFAULT 1
                    REFERENCES public.companies(id) ON DELETE CASCADE,
  -- Qui a accorde ce role (traçabilite)
  granted_by      uuid        NULL REFERENCES public.profils(id) ON DELETE SET NULL,
  granted_at      timestamptz NOT NULL DEFAULT now(),
  -- Expiration optionnelle (ex: acces temporaire)
  expires_at      timestamptz NULL,
  UNIQUE (user_profile_id, role_id)
);

CREATE INDEX IF NOT EXISTS user_roles_profile_idx     ON public.user_roles(user_profile_id);
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx     ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS user_roles_company_id_idx  ON public.user_roles(company_id);


-- ============================================================
-- 4. TABLE ROLE_PERMISSIONS
--    Junction : un role a un ensemble de permissions.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id       integer NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id integer NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS role_permissions_role_idx       ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS role_permissions_permission_idx ON public.role_permissions(permission_id);


-- ============================================================
-- 5. SEED : Roles systeme (mappe les roles existants de profils.role)
--    ON CONFLICT DO NOTHING = idempotent, safe a rejouer.
-- ============================================================

INSERT INTO public.roles (company_id, name, label, is_system) VALUES
  (1, 'admin',                'Administrateur',          true),
  (1, 'super_admin',          'Super Administrateur',    true),
  (1, 'dirigeant',            'Dirigeant',               true),
  (1, 'exploitant',           'Exploitant',              true),
  (1, 'mecanicien',           'Mecanicien',              true),
  (1, 'commercial',           'Commercial',              true),
  (1, 'comptable',            'Comptable',               true),
  (1, 'rh',                   'Ressources Humaines',     true),
  (1, 'conducteur',           'Conducteur',              true),
  (1, 'conducteur_affreteur', 'Conducteur Affreteur',    true),
  (1, 'client',               'Client',                  true),
  (1, 'affreteur',            'Affreteur',               true),
  (1, 'administratif',        'Administratif',           true),
  (1, 'facturation',          'Facturation',             true),
  (1, 'flotte',               'Flotte',                  true),
  (1, 'maintenance',          'Maintenance',             true),
  (1, 'observateur',          'Observateur',             true),
  (1, 'demo',                 'Demo',                    true),
  (1, 'investisseur',         'Investisseur',            true)
ON CONFLICT (company_id, name) DO NOTHING;


-- ============================================================
-- 6. SEED : Permissions de base (ressource:action)
-- ============================================================

INSERT INTO public.permissions (name, resource, action, label) VALUES
  -- Transport
  ('transport:read',          'transport',    'read',   'Lire les transports'),
  ('transport:write',         'transport',    'write',  'Creer et modifier les transports'),
  ('transport:delete',        'transport',    'delete', 'Supprimer les transports'),
  ('transport:validate',      'transport',    'admin',  'Valider et cloture les transports'),
  -- Clients
  ('clients:read',            'clients',      'read',   'Lire les clients'),
  ('clients:write',           'clients',      'write',  'Creer et modifier les clients'),
  ('clients:delete',          'clients',      'delete', 'Supprimer les clients'),
  -- Factures
  ('factures:read',           'factures',     'read',   'Lire les factures'),
  ('factures:write',          'factures',     'write',  'Creer et modifier les factures'),
  ('factures:validate',       'factures',     'admin',  'Valider et emettre les factures'),
  -- Conducteurs
  ('conducteurs:read',        'conducteurs',  'read',   'Lire les conducteurs'),
  ('conducteurs:write',       'conducteurs',  'write',  'Gerer les conducteurs'),
  -- Vehicules / Flotte
  ('vehicules:read',          'vehicules',    'read',   'Lire la flotte'),
  ('vehicules:write',         'vehicules',    'write',  'Gerer la flotte'),
  -- RH
  ('rh:read',                 'rh',           'read',   'Lire les donnees RH'),
  ('rh:write',                'rh',           'write',  'Modifier les donnees RH'),
  -- Comptabilite
  ('comptabilite:read',       'comptabilite', 'read',   'Lire la comptabilite'),
  ('comptabilite:write',      'comptabilite', 'write',  'Modifier la comptabilite'),
  ('comptabilite:export',     'comptabilite', 'admin',  'Exporter la comptabilite (FEC)'),
  -- Planning
  ('planning:read',           'planning',     'read',   'Lire le planning'),
  ('planning:write',          'planning',     'write',  'Modifier le planning'),
  -- Tachygraphe
  ('tachygraphe:read',        'tachygraphe',  'read',   'Lire le tachygraphe'),
  ('tachygraphe:write',       'tachygraphe',  'write',  'Modifier le tachygraphe'),
  -- Administration
  ('parametres:admin',        'parametres',   'admin',  'Administrer les parametres'),
  ('utilisateurs:admin',      'utilisateurs', 'admin',  'Administrer les utilisateurs'),
  ('utilisateurs:read',       'utilisateurs', 'read',   'Lire les utilisateurs'),
  -- Communication
  ('tchat:read',              'tchat',        'read',   'Lire le tchat'),
  ('tchat:write',             'tchat',        'write',  'Ecrire dans le tchat'),
  -- Maintenance
  ('maintenance:read',        'maintenance',  'read',   'Lire la maintenance'),
  ('maintenance:write',       'maintenance',  'write',  'Gerer la maintenance'),
  -- Affretement
  ('affretement:read',        'affretement',  'read',   'Lire les affrètements'),
  ('affretement:write',       'affretement',  'write',  'Gerer les affrètements')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 7. SEED : Permissions de base pour le role admin (tous les droits)
-- ============================================================

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin' AND r.company_id = 1
ON CONFLICT DO NOTHING;

-- dirigeant : memes droits que admin sauf administration utilisateurs
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'dirigeant' AND r.company_id = 1
  AND p.name != 'utilisateurs:admin'
ON CONFLICT DO NOTHING;


-- ============================================================
-- 8. FONCTION HELPER : verifie si un profil a un droit (usage futur)
--    Exemple : public.has_permission('transport:write')
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_permission(p_permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE ur.user_profile_id = (
      SELECT id FROM public.profils WHERE user_id = auth.uid() LIMIT 1
    )
    AND perm.name = p_permission_name
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;


-- ============================================================
-- 9. RLS sur les nouvelles tables (lecture restreinte a la company)
-- ============================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- roles : un tenant lit seulement ses propres roles
  DROP POLICY IF EXISTS roles_select_own_company ON public.roles;
  CREATE POLICY roles_select_own_company
    ON public.roles FOR SELECT
    USING (company_id = public.my_company_id());

  DROP POLICY IF EXISTS roles_insert_admin ON public.roles;
  CREATE POLICY roles_insert_admin
    ON public.roles FOR INSERT
    WITH CHECK (
      company_id = public.my_company_id()
      -- Seuls admin/dirigeant peuvent creer des roles custom
      AND (SELECT role FROM public.profils WHERE user_id = auth.uid() LIMIT 1)
          IN ('admin', 'dirigeant', 'super_admin')
    );

  -- user_roles : un utilisateur peut lire ses propres roles
  DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
  CREATE POLICY user_roles_select_own
    ON public.user_roles FOR SELECT
    USING (
      user_profile_id = (SELECT id FROM public.profils WHERE user_id = auth.uid() LIMIT 1)
      OR company_id = public.my_company_id()
    );

  DROP POLICY IF EXISTS user_roles_manage_admin ON public.user_roles;
  CREATE POLICY user_roles_manage_admin
    ON public.user_roles FOR ALL
    USING (
      company_id = public.my_company_id()
      AND (SELECT role FROM public.profils WHERE user_id = auth.uid() LIMIT 1)
          IN ('admin', 'dirigeant', 'super_admin')
    );

EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
