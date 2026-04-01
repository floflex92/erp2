-- Purge complementaire: messagerie, documents et chronotachygraphe.

DO $$
BEGIN
  -- Messagerie tchat
  IF to_regclass('public.tchat_messages') IS NOT NULL THEN
    DELETE FROM public.tchat_messages;
  END IF;

  IF to_regclass('public.tchat_participants') IS NOT NULL THEN
    DELETE FROM public.tchat_participants;
  END IF;

  IF to_regclass('public.tchat_conversations') IS NOT NULL THEN
    DELETE FROM public.tchat_conversations;
  END IF;

  -- Documents
  IF to_regclass('public.documents') IS NOT NULL THEN
    DELETE FROM public.documents;
  END IF;

  -- Chronotachygraphe
  IF to_regclass('public.tachygraphe_entrees') IS NOT NULL THEN
    DELETE FROM public.tachygraphe_entrees;
  END IF;

  -- Rapports tachy
  IF to_regclass('public.rapports_conducteurs') IS NOT NULL THEN
    DELETE FROM public.rapports_conducteurs;
  END IF;
END $$;
