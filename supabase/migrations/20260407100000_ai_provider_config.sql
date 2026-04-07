-- ── Migration : config provider IA ───────────────────────────────────────────
-- Ajoute les clés de configuration pour l'abstraction provider IA :
--   v11.ai.provider       : 'local' (Ollama, phase dev) | 'openai' (cloud prod)
--   v11.ai.local_endpoint : URL de l'instance Ollama locale
--   v11.ai.local_model    : modèle Ollama à utiliser
--
-- Pour passer en prod cloud : UPDATE config_entreprise SET valeur='openai'
--   WHERE cle='v11.ai.provider';
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.config_entreprise (cle, valeur, description)
VALUES
  ('v11.ai.provider',        '"local"',                       'Provider IA actif : local (Ollama) ou openai (cloud)'),
  ('v11.ai.local_endpoint',  '"http://localhost:11434"',      'URL base de l''instance Ollama locale (netlify dev uniquement)'),
  ('v11.ai.local_model',     '"mistral"',                     'Modèle Ollama par défaut pour le provider local')
ON CONFLICT (cle) DO NOTHING;
