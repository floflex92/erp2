#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Repart de zéro : supprime node_modules + package-lock.json, réinstalle les
  dépendances avec npm ci, puis lance le serveur de dev (Netlify dev sur :8888).

.DESCRIPTION
  Utile après :
    - l'ajout / la mise à jour d'une dépendance dans package.json
    - un conflit de lockfile suite à un merge
    - une installation corrompue provoquant des erreurs "module not found"

  npm ci (vs npm install) :
    * lit package-lock.json à la lettre → installation strictement reproductible
    * échoue si package-lock.json est absent ou désynchronisé → détecte les
      oublis de commit du lockfile
    * ne modifie jamais package.json → adapté à la CI et aux environnements
      partagés

.NOTES
  À exécuter depuis le dossier erp2/ (là où se trouvent package.json et
  package-lock.json).
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot           # dossier du script = erp2/scripts/
$project = Split-Path $root     # dossier parent    = erp2/

Push-Location $project
try {
    Write-Host "==> Nettoyage node_modules..." -ForegroundColor Cyan
    if (Test-Path 'node_modules') { Remove-Item -Recurse -Force 'node_modules' }

    Write-Host "==> Suppression package-lock.json..." -ForegroundColor Cyan
    if (Test-Path 'package-lock.json') { Remove-Item -Force 'package-lock.json' }

    Write-Host "==> npm ci (installation propre)..." -ForegroundColor Cyan
    npm ci

    Write-Host "==> Démarrage du serveur de dev (netlify dev)..." -ForegroundColor Green
    npm run serv:dev
} finally {
    Pop-Location
}
