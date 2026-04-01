
CREATE TABLE profils (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'exploitant'
             CHECK (role IN ('dirigeant','exploitant','mecanicien','commercial','comptable')),
  nom        text,
  prenom     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profils ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur peut lire son propre profil
CREATE POLICY "profils_self_select" ON profils
  FOR SELECT USING (auth.uid() = user_id);

-- Le dirigeant peut tout lire/modifier
CREATE POLICY "profils_dirigeant_all" ON profils
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profils p2
      WHERE p2.user_id = auth.uid() AND p2.role = 'dirigeant'
    )
  );

-- Un utilisateur peut mettre à jour son propre profil (nom/prénom seulement, pas le role)
CREATE POLICY "profils_self_update" ON profils
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = (SELECT role FROM profils WHERE user_id = auth.uid()));

SELECT add_updated_at_trigger('profils');
;
