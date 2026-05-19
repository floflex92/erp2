
-- Supprimer toutes les policies existantes (la recursion vient de profils_dirigeant_all)
DROP POLICY IF EXISTS "profils_self_select"    ON profils;
DROP POLICY IF EXISTS "profils_dirigeant_all"  ON profils;
DROP POLICY IF EXISTS "profils_self_update"    ON profils;
DROP POLICY IF EXISTS "profils_self_insert"    ON profils;

-- Lecture : tout utilisateur connecté peut lire tous les profils (ERP interne)
CREATE POLICY "profils_read" ON profils
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insertion : uniquement son propre profil
CREATE POLICY "profils_insert" ON profils
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mise à jour : son propre profil (nom/prenom) OU pas de restriction supplémentaire
-- Le contrôle du changement de role se fait côté app (seul l'admin/dirigeant voit la page)
CREATE POLICY "profils_update" ON profils
  FOR UPDATE USING (auth.uid() IS NOT NULL);
;
