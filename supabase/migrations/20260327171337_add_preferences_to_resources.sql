
ALTER TABLE conducteurs ADD COLUMN IF NOT EXISTS preferences text;
ALTER TABLE vehicules   ADD COLUMN IF NOT EXISTS preferences text;
ALTER TABLE remorques   ADD COLUMN IF NOT EXISTS preferences text;
;
