-- ============================================================
-- FIX BOOTSTRAP PROFIL : contrainte matricule NOT NULL
-- Date : 2026-04-04
-- Probleme : upsert_my_profile() et le bootstrap frontend insèrent
--   un profil sans specifier matricule, mais la colonne est NOT NULL
--   sans valeur par defaut → erreur 23502 silencieuse côté frontend.
-- Solution :
--   1. Ajouter un DEFAULT sur profils.matricule (generé depuis user_id)
--   2. Mettre a jour upsert_my_profile() pour passer un matricule auto
--   3. Corriger les lignes existantes où matricule est vide/null (sécurité)
-- ============================================================

-- 1. Ajouter le DEFAULT sur matricule
-- Format : 'USR-' + 8 premiers chars de gen_random_uuid() en majuscules
ALTER TABLE public.profils
  ALTER COLUMN matricule SET DEFAULT 'USR-' || upper(substr(gen_random_uuid()::text, 1, 8));

-- 2. Mettre a jour upsert_my_profile() pour passer un matricule coherent
CREATE OR REPLACE FUNCTION public.upsert_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_email     text;
  v_meta_role text;
  v_role      text;
  v_matricule text;
  v_profile   public.profils;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifie';
  END IF;

  SELECT
    lower(trim(u.email)),
    lower(trim(coalesce(u.raw_app_meta_data->>'role', u.raw_user_meta_data->>'role', '')))
  INTO v_email, v_meta_role
  FROM auth.users u
  WHERE u.id = v_uid;

  v_meta_role := regexp_replace(v_meta_role, '[^a-z0-9_]+', '_', 'g');

  v_role := CASE
    WHEN v_email IN ('chabre.florent@gmail.com', 'admin@erp-demo.fr', 'contact@nexora-truck.fr') THEN 'admin'
    WHEN v_email = 'direction@erp-demo.fr' THEN 'dirigeant'
    WHEN length(v_meta_role) BETWEEN 2 AND 64 THEN v_meta_role
    ELSE 'dirigeant'
  END;

  -- Matricule auto si non existant
  v_matricule := 'USR-' || upper(substr(v_uid::text, 1, 8));

  INSERT INTO public.profils (user_id, role, account_origin, matricule)
  VALUES (v_uid, v_role, 'auto_auth_signup', v_matricule)
  ON CONFLICT (user_id) DO UPDATE
    SET role = excluded.role,
        updated_at = now()
  RETURNING * INTO v_profile;

  RETURN jsonb_build_object(
    'id', v_profile.id,
    'role', v_profile.role,
    'nom', v_profile.nom,
    'prenom', v_profile.prenom,
    'tenant_key', v_profile.tenant_key,
    'matricule', v_profile.matricule
  );
END;
$$;

-- 3. Mettre a jour handle_new_user() egalement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meta_role text;
  v_role      text;
  v_email     text := lower(trim(new.email));
  v_matricule text;
BEGIN
  v_meta_role := lower(trim(coalesce(new.raw_app_meta_data->>'role', new.raw_user_meta_data->>'role', '')));
  v_meta_role := regexp_replace(v_meta_role, '[^a-z0-9_]+', '_', 'g');

  v_role := CASE
    WHEN v_email IN ('chabre.florent@gmail.com', 'admin@erp-demo.fr', 'contact@nexora-truck.fr') THEN 'admin'
    WHEN v_email = 'direction@erp-demo.fr' THEN 'dirigeant'
    WHEN length(v_meta_role) BETWEEN 2 AND 64 THEN v_meta_role
    ELSE 'dirigeant'
  END;

  v_matricule := 'USR-' || upper(substr(new.id::text, 1, 8));

  INSERT INTO public.profils (user_id, role, account_origin, matricule)
  VALUES (new.id, v_role, 'auto_auth_signup', v_matricule)
  ON CONFLICT (user_id) DO UPDATE
    SET role = excluded.role,
        updated_at = now();

  RETURN new;
END;
$$;

-- 4. Creer les profils manquants pour les utilisateurs Auth sans profil
INSERT INTO public.profils (user_id, role, account_origin, matricule)
SELECT
  u.id,
  CASE
    WHEN lower(trim(u.email)) IN ('chabre.florent@gmail.com', 'admin@erp-demo.fr', 'contact@nexora-truck.fr') THEN 'admin'
    WHEN lower(trim(u.email)) = 'direction@erp-demo.fr' THEN 'dirigeant'
    ELSE 'exploitant'
  END,
  'auto_auth_signup',
  'USR-' || upper(substr(u.id::text, 1, 8))
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profils p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;
