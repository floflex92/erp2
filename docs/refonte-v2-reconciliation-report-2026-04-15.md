# Refonte V2 - Rapport reconciliation auto

Date: 2026-04-15
Source: migration [supabase/migrations/20260415118000_refonte_v2_auto_reconciliation_and_conflict_snapshot.sql](supabase/migrations/20260415118000_refonte_v2_auto_reconciliation_and_conflict_snapshot.sql)

## Resultat par tenant et source

| day | company_id | company_name | domain_code | source_table | mapped_count | pending_count | conflict_count |
|---|---:|---|---|---|---:|---:|---:|
| 2026-04-15 | 1 | Tenant Test | asset | remorques | 0 | 0 | 22 |
| 2026-04-15 | 1 | Tenant Test | asset | vehicules | 0 | 0 | 24 |
| 2026-04-15 | 1 | Tenant Test | document | employee_vault_documents | 0 | 0 | 0 |
| 2026-04-15 | 1 | Tenant Test | person | conducteurs | 0 | 0 | 22 |
| 2026-04-15 | 1 | Tenant Test | person | employee_directory | 8 | 0 | 24 |
| 2026-04-15 | 1 | Tenant Test | person | profils | 14 | 0 | 0 |

## Totaux par domaine

| day | company_id | company_name | domain_code | mapped_total | conflict_total |
|---|---:|---|---|---:|---:|
| 2026-04-15 | 1 | Tenant Test | asset | 0 | 46 |
| 2026-04-15 | 1 | Tenant Test | document | 0 | 0 |
| 2026-04-15 | 1 | Tenant Test | person | 22 | 46 |

## Documents differes (ignored)

| company_id | source_table | ignored_count |
|---:|---|---:|
| 1 | employee_vault_documents | 2 |

## Lecture rapide

1. Mapping automatique reussi sur profils (14) et partiellement sur employee_directory (8).
2. Aucun mapping auto sur conducteurs, vehicules, remorques: conflits a traiter.
3. Le domaine document est explicitement differe pour le moment.

## Priorites suivantes

1. Conducteurs: enrichir la correspondance par email/telephone + normalisation matricule.
2. Vehicules/remorques: matcher registration apres normalisation (espaces, tirets, casse).
3. Documents: mise en place de cible documentaire transverse puis relance mapping.

## Passe v2 (migration 20260415119000) - Delta

Comparaison avant/apres la passe v2 de matching normalise:

| domain_code | source_table | mapped_before | mapped_after | delta_mapped | conflict_before | conflict_after | delta_conflict |
|---|---|---:|---:|---:|---:|---:|---:|
| asset | remorques | 0 | 0 | 0 | 22 | 22 | 0 |
| asset | vehicules | 0 | 0 | 0 | 24 | 24 | 0 |
| person | conducteurs | 0 | 0 | 0 | 22 | 22 | 0 |
| person | employee_directory | 8 | 8 | 0 | 24 | 24 | 0 |
| person | profils | 14 | 14 | 0 | 0 | 0 | 0 |

Conclusion: la normalisation seule ne suffit pas sur ce jeu de donnees; les prochains gains necessitent enrichissement des pivots (email/phone/matricule) et regles de correspondance metier supplementaires.

## Passe v3 (migration 20260415120000) - Delta

Comparaison avant/apres la passe v3 (autocreate bridge):

| domain_code | source_table | mapped_before_v3 | mapped_after_v3 | delta_mapped | conflict_before_v3 | conflict_after_v3 | delta_conflict |
|---|---|---:|---:|---:|---:|---:|---:|
| asset | remorques | 0 | 22 | +22 | 22 | 0 | -22 |
| asset | vehicules | 0 | 24 | +24 | 24 | 0 | -24 |
| person | conducteurs | 0 | 22 | +22 | 22 | 0 | -22 |
| person | employee_directory | 8 | 32 | +24 | 24 | 0 | -24 |
| person | profils | 14 | 14 | 0 | 0 | 0 | 0 |

Totaux domaine:

| domain_code | mapped_before_v3 | mapped_after_v3 | conflict_before_v3 | conflict_after_v3 |
|---|---:|---:|---:|---:|
| person | 22 | 68 | 46 | 0 |
| asset | 0 | 46 | 46 | 0 |

Conclusion v3: le bridge d autocreation a absorbe la totalite des conflits person et asset sur le tenant analyse.

## Passe documents (migration 20260415121000) - Delta

| source_table | mapped_before | mapped_after | delta_mapped | conflict_before | conflict_after | delta_conflict |
|---|---:|---:|---:|---:|---:|---:|
| employee_vault_documents | 0 | 2 | +2 | 0 | 0 | 0 |

Statut final map_document_legacy:

| source_table | mapping_status | count |
|---|---|---:|
| employee_vault_documents | mapped | 2 |

Conclusion documents: les 2 lignes deferrees ont ete bridgees vers `public.documents` avec `target_document_id` renseigne.
