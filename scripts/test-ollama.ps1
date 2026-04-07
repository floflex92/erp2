#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Teste que l'endpoint Ollama répond correctement avant un commit.

.DESCRIPTION
  Envoie un prompt minimal à POST /api/chat et vérifie que la réponse est un
  JSON valide contenant un champ message.content non vide.

  Intégration pre-commit (Husky ou hook natif git) :
    1. Installez Husky :
         npm install --save-dev husky
         npx husky init
    2. Créez ou éditez .husky/pre-commit :
         #!/usr/bin/env sh
         . "$(dirname "$0")/_/husky.sh"
         pwsh -NoProfile -File scripts/test-ollama.ps1
    3. Rendez le hook exécutable (Linux / macOS) :
         chmod +x .husky/pre-commit

  Sur Windows sans Husky, copiez test-ollama.ps1 dans
    .git/hooks/pre-commit   (le fichier doit être exécutable via Git Bash)
  ou ajoutez dans .git/hooks/pre-commit :
    #!/bin/sh
    pwsh -NoProfile -File scripts/test-ollama.ps1 || exit 1

  Le commit est bloqué si le script retourne un code != 0.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$host_url  = $env:VITE_OLLAMA_HOST  ?? 'http://localhost:11434'
$model     = $env:VITE_OLLAMA_MODEL ?? 'mistral'
$endpoint  = "$host_url/api/chat"

$body = @{
    model    = $model
    messages = @(@{ role = 'user'; content = 'Réponds uniquement par le mot : ok' })
    stream   = $false
} | ConvertTo-Json -Depth 5

Write-Host "==> Test Ollama : $endpoint (modèle : $model)" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod `
        -Method Post `
        -Uri $endpoint `
        -ContentType 'application/json' `
        -Body $body `
        -TimeoutSec 30

    $content = $response.message?.content
    if ([string]::IsNullOrWhiteSpace($content)) {
        Write-Error "Ollama a répondu mais le champ message.content est vide."
        exit 1
    }

    Write-Host "==> Ollama OK. Réponse : $content" -ForegroundColor Green
    exit 0
} catch {
    Write-Error "Ollama inaccessible ou erreur : $_"
    Write-Host "   Assurez-vous qu'Ollama tourne : ollama serve" -ForegroundColor Yellow
    exit 1
}
