
ALTER TABLE profils
  DROP CONSTRAINT IF EXISTS profils_role_check;

ALTER TABLE profils
  ADD CONSTRAINT profils_role_check
  CHECK (role IN ('admin','dirigeant','exploitant','mecanicien','commercial','comptable'));
;
