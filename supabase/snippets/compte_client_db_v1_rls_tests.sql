-- Tests RLS V1 - compte_client_db
-- Execution recommandee dans SQL Editor (serv dev)
-- Objectif: verifier l'isolation par compte_erp_id

-- ============================================================
-- 0) Preparation de donnees de test minimales
-- ============================================================

-- Compte principal (deja present via bootstrap normalement)
insert into core.comptes_erp (id, code, nom)
values ('11111111-1111-1111-1111-111111111111', 'channel_fret', 'Channel Fret')
on conflict (code) do nothing;

-- Deuxieme compte pour tester l'isolation
insert into core.comptes_erp (id, code, nom)
values ('22222222-2222-2222-2222-222222222222', 'other_account', 'Other Account')
on conflict (code) do nothing;

insert into core.partenaires (id, compte_erp_id, code, nom)
values
  ('11111111-aaaa-1111-aaaa-111111111111', '11111111-1111-1111-1111-111111111111', 'p_cf', 'Partenaire CF'),
  ('22222222-bbbb-2222-bbbb-222222222222', '22222222-2222-2222-2222-222222222222', 'p_ot', 'Partenaire OT')
on conflict (id) do nothing;

insert into core.ordres_transport (id, compte_erp_id, partenaire_id, reference, statut_transport)
values
  ('11111111-cccc-1111-cccc-111111111111', '11111111-1111-1111-1111-111111111111', '11111111-aaaa-1111-aaaa-111111111111', 'OT-CF-001', 'en_attente'),
  ('22222222-dddd-2222-dddd-222222222222', '22222222-2222-2222-2222-222222222222', '22222222-bbbb-2222-bbbb-222222222222', 'OT-OT-001', 'en_attente')
on conflict (id) do nothing;

-- ============================================================
-- 1) Simuler contexte compte Channel Fret
-- ============================================================

select set_config('app.current_compte_erp_id', '11111111-1111-1111-1111-111111111111', false);

-- Attendu: 1
select count(*) as count_cf_visible
from core.ordres_transport;

-- Attendu: renvoie uniquement OT-CF-001
select id, reference, compte_erp_id
from core.ordres_transport
order by reference;

-- Attendu: update autorise sur OT-CF-001
update core.ordres_transport
set statut_transport = 'en_cours'
where id = '11111111-cccc-1111-cccc-111111111111';

-- Attendu: update bloque (0 ligne modifiee ou erreur policy)
update core.ordres_transport
set statut_transport = 'en_cours'
where id = '22222222-dddd-2222-dddd-222222222222';

-- ============================================================
-- 2) Simuler contexte autre compte
-- ============================================================

select set_config('app.current_compte_erp_id', '22222222-2222-2222-2222-222222222222', false);

-- Attendu: 1
select count(*) as count_other_visible
from core.ordres_transport;

-- Attendu: renvoie uniquement OT-OT-001
select id, reference, compte_erp_id
from core.ordres_transport
order by reference;

-- ============================================================
-- 3) Tester refus sans contexte
-- ============================================================

select set_config('app.current_compte_erp_id', '', false);

-- Attendu: 0 ligne visible
select count(*) as count_no_context
from core.ordres_transport;

-- ============================================================
-- 4) Audit append-only
-- ============================================================

select set_config('app.current_compte_erp_id', '11111111-1111-1111-1111-111111111111', false);

-- Attendu: insert autorise
insert into audit.journal_actions (compte_erp_id, action, table_cible, cible_id, payload_after)
values (
  '11111111-1111-1111-1111-111111111111',
  'test_insert',
  'core.ordres_transport',
  '11111111-cccc-1111-cccc-111111111111',
  '{"ok": true}'::jsonb
);

-- Attendu: update refuse (append-only)
update audit.journal_actions
set action = 'test_update_forbidden'
where action = 'test_insert';

-- Attendu: delete refuse (append-only)
delete from audit.journal_actions
where action = 'test_insert';

-- ============================================================
-- 5) Nettoyage optionnel des jeux de test
-- ============================================================

-- A lancer seulement si tu veux nettoyer:
-- delete from core.ordres_transport where id in (
--   '11111111-cccc-1111-cccc-111111111111',
--   '22222222-dddd-2222-dddd-222222222222'
-- );
-- delete from core.partenaires where id in (
--   '11111111-aaaa-1111-aaaa-111111111111',
--   '22222222-bbbb-2222-bbbb-222222222222'
-- );
-- delete from core.comptes_erp where id in (
--   '11111111-1111-1111-1111-111111111111',
--   '22222222-2222-2222-2222-222222222222'
-- );
