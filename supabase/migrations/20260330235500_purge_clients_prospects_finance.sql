-- Purge complementaire: frais/clients/prospection/pv-amendes (partie base).
-- Objectif: supprimer les enregistrements restants visibles dans les modules
-- Clients et Prospection, en tenant compte des dependances FK.

DO $$
BEGIN
	IF to_regclass('public.prospects') IS NOT NULL THEN
		DELETE FROM public.prospects;
	END IF;

	IF to_regclass('public.factures') IS NOT NULL THEN
		DELETE FROM public.factures;
	END IF;

	IF to_regclass('public.ordres_transport') IS NOT NULL THEN
		DELETE FROM public.ordres_transport;
	END IF;

	IF to_regclass('public.contacts') IS NOT NULL THEN
		DELETE FROM public.contacts;
	END IF;

	IF to_regclass('public.adresses') IS NOT NULL THEN
		DELETE FROM public.adresses;
	END IF;

	IF to_regclass('public.sites_logistiques') IS NOT NULL THEN
		DELETE FROM public.sites_logistiques;
	END IF;

	IF to_regclass('public.clients') IS NOT NULL THEN
		DELETE FROM public.clients;
	END IF;
END $$;
