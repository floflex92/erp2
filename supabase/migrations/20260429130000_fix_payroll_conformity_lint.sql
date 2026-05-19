-- Fix Supabase DB linter warnings on fn_controle_conformite_paie.
-- PostgreSQL format() does not support printf numeric specifiers such as %.4f.

create or replace function public.fn_controle_conformite_paie(
  p_taux_horaire numeric,
  p_brut_mensuel numeric,
  p_coefficient text,
  p_indemnite_repas numeric,
  p_nb_repas integer,
  p_indemnite_gr_journalier numeric,
  p_nb_jours_gr integer,
  p_annee integer default date_part('year', now())::integer
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_config public.payroll_config_annuel%rowtype;
  v_bareme_repas numeric;
  v_bareme_gr numeric;
  v_alertes jsonb := '[]'::jsonb;
begin
  select *
  into v_config
  from public.payroll_config_annuel
  where annee = p_annee;

  if not found then
    select *
    into v_config
    from public.payroll_config_annuel
    order by annee desc
    limit 1;
  end if;

  select montant_max_exonere
  into v_bareme_repas
  from public.bareme_indemnites_transport
  where annee = p_annee
    and type_regime = 'gr_petit_deplacement';

  select montant_max_exonere
  into v_bareme_gr
  from public.bareme_indemnites_transport
  where annee = p_annee
    and type_regime = 'gr_grand_routier';

  if v_config.smic_horaire is not null and p_taux_horaire < v_config.smic_horaire then
    v_alertes := v_alertes || jsonb_build_object(
      'type', 'smic_horaire',
      'niveau', 'bloquant',
      'message', format(
        'Taux horaire %s EUR inferieur au SMIC %s EUR - bulletin bloque',
        to_char(p_taux_horaire, 'FM999999990.0000'),
        to_char(v_config.smic_horaire, 'FM999999990.0000')
      )
    );
  end if;

  if p_brut_mensuel is null or p_brut_mensuel <= 0 then
    v_alertes := v_alertes || jsonb_build_object(
      'type', 'brut_mensuel_invalide',
      'niveau', 'avertissement',
      'message', 'Brut mensuel absent ou invalide'
    );
  end if;

  if nullif(trim(p_coefficient), '') is null then
    v_alertes := v_alertes || jsonb_build_object(
      'type', 'coefficient_absent',
      'niveau', 'avertissement',
      'message', 'Coefficient conventionnel absent'
    );
  end if;

  if v_bareme_repas is not null and p_nb_repas > 0 then
    declare
      v_repas_unitaire numeric := case
        when p_nb_repas > 0 then coalesce(p_indemnite_repas, 0) / p_nb_repas
        else 0
      end;
    begin
      if v_repas_unitaire > v_bareme_repas then
        v_alertes := v_alertes || jsonb_build_object(
          'type', 'plafond_repas_urssaf',
          'niveau', 'avertissement',
          'message', format(
            'Indemnite repas unitaire %s EUR depasse le bareme URSSAF %s EUR - excedent soumis cotisations',
            to_char(v_repas_unitaire, 'FM999999990.00'),
            to_char(v_bareme_repas, 'FM999999990.00')
          )
        );
      end if;
    end;
  end if;

  if v_bareme_gr is not null and p_nb_jours_gr > 0 then
    declare
      v_gr_journalier numeric := case
        when p_nb_jours_gr > 0 then coalesce(p_indemnite_gr_journalier, 0) / p_nb_jours_gr
        else 0
      end;
    begin
      if v_gr_journalier > v_bareme_gr then
        v_alertes := v_alertes || jsonb_build_object(
          'type', 'plafond_grand_routier_urssaf',
          'niveau', 'avertissement',
          'message', format(
            'Indemnite GR journaliere %s EUR depasse le bareme URSSAF %s EUR - excedent cotisable',
            to_char(v_gr_journalier, 'FM999999990.00'),
            to_char(v_bareme_gr, 'FM999999990.00')
          )
        );
      end if;
    end;
  end if;

  return v_alertes;
end;
$$;
