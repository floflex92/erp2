# Checklist verification - compte_client_db V1

Date: 2026-03-31
Usage: validation post-execution sur serv dev.

## A. Foundation

- [ ] Schema `core` present
- [ ] Schema `docs` present
- [ ] Schema `rt` present
- [ ] Schema `audit` present
- [ ] Schema `backup` present
- [ ] Table `core.comptes_erp` presente
- [ ] Table `core.ordres_transport` presente
- [ ] Table `docs.documents` presente
- [ ] Table `rt.evenements_transport` presente
- [ ] Table `audit.journal_actions` presente

## B. Bootstrap Channel Fret

- [ ] `core.comptes_erp.code = channel_fret`
- [ ] Role `operationnel` present
- [ ] Utilisateur operationnel present
- [ ] Partenaire par defaut present

## C. RLS strict

- [ ] RLS active sur tables core/docs/rt/audit/backup
- [ ] Policies `same_compte` creees
- [ ] Lecture cross-compte refusee
- [ ] Ecriture cross-compte refusee
- [ ] `audit.journal_actions` insert OK
- [ ] `audit.journal_actions` update/delete refuses

## D. Fonctionnel MVP

- [ ] Creation OT OK
- [ ] Update statut OT OK
- [ ] Message lie OT OK
- [ ] Upload document OK
- [ ] Version document OK
- [ ] Notification document OK

## E. Performance et stabilite

- [ ] Ecran OT charge en temps acceptable
- [ ] Flux statut temps reel recu sans erreur
- [ ] Flux messages temps reel recu sans erreur
- [ ] Pas d'erreurs SQL dans logs

## F. Gouvernance

- [ ] Aucun delete physique expose en UI
- [ ] Archivage logique actif (`archived_at`)
- [ ] Journalisation des ecritures active
