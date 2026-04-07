-- ============================================================
-- Groupes de conducteurs + contraintes placement IA
-- ============================================================
-- driver_groups : groupes de conducteurs crees par les exploitants/admins
-- driver_group_members : appartenance conducteur → groupe
-- ai_placement_constraints : plage dates + retour depot par vehicule
-- ============================================================

-- ── driver_groups ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         text NOT NULL,
  description text,
  couleur     text DEFAULT '#6366f1',
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS driver_groups_created_by_idx ON public.driver_groups(created_by);

ALTER TABLE public.driver_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_groups_read" ON public.driver_groups
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin','dirigeant','exploitant','rh'));

CREATE POLICY "driver_groups_write" ON public.driver_groups
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant'));

CREATE POLICY "driver_groups_update" ON public.driver_groups
  FOR UPDATE TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant','exploitant'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant'));

CREATE POLICY "driver_groups_delete" ON public.driver_groups
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('admin','dirigeant'));

-- ── driver_group_members ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_group_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid NOT NULL REFERENCES public.driver_groups(id) ON DELETE CASCADE,
  conducteur_id uuid NOT NULL REFERENCES public.conducteurs(id) ON DELETE CASCADE,
  added_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, conducteur_id)
);

CREATE INDEX IF NOT EXISTS driver_group_members_group_idx       ON public.driver_group_members(group_id);
CREATE INDEX IF NOT EXISTS driver_group_members_conducteur_idx  ON public.driver_group_members(conducteur_id);

ALTER TABLE public.driver_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_group_members_read" ON public.driver_group_members
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin','dirigeant','exploitant','rh'));

CREATE POLICY "driver_group_members_write" ON public.driver_group_members
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant'));

CREATE POLICY "driver_group_members_delete" ON public.driver_group_members
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('admin','dirigeant','exploitant'));

-- ── ai_placement_constraints ─────────────────────────────────────────────────
-- Une contrainte par vehicule (upsert par vehicule_id).
-- date_debut/fin : plage dans laquelle l'IA peut placer des courses.
-- retour_depot_avant : deadline de retour depot (NULL = pas de contrainte).
-- depot_lat/lng : coordonnees du depot de retour.
-- position_ref_lat/lng : position de reference du vehicule (GPS ou derniere livraison).
-- statut : 'active' | 'traitee' | 'annulee'
CREATE TABLE IF NOT EXISTS public.ai_placement_constraints (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id           uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  conducteur_id         uuid REFERENCES public.conducteurs(id) ON DELETE SET NULL,
  date_debut            date NOT NULL,
  date_fin              date NOT NULL,
  retour_depot_avant    timestamptz,
  depot_lat             numeric(10,7),
  depot_lng             numeric(10,7),
  position_ref_lat      numeric(10,7),
  position_ref_lng      numeric(10,7),
  rayon_km              integer NOT NULL DEFAULT 150,
  statut                text NOT NULL DEFAULT 'active'
                          CHECK (statut IN ('active','traitee','annulee')),
  notes                 text,
  created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_placement_dates_check CHECK (date_fin >= date_debut)
);

CREATE INDEX IF NOT EXISTS ai_placement_vehicule_idx ON public.ai_placement_constraints(vehicule_id, statut);
CREATE INDEX IF NOT EXISTS ai_placement_dates_idx    ON public.ai_placement_constraints(date_debut, date_fin);

ALTER TABLE public.ai_placement_constraints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_placement_read" ON public.ai_placement_constraints
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin','dirigeant','exploitant'));

CREATE POLICY "ai_placement_write" ON public.ai_placement_constraints
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant'));

CREATE POLICY "ai_placement_update" ON public.ai_placement_constraints
  FOR UPDATE TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant','exploitant'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant'));

CREATE POLICY "ai_placement_delete" ON public.ai_placement_constraints
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('admin','dirigeant','exploitant'));
