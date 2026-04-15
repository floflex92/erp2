$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $PSScriptRoot
$log = Join-Path $root 'serv-dev.log'

Set-Location $root

while ($true) {
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Start dev server" | Out-File -FilePath $log -Append -Encoding utf8
  npm run dev -- --host 127.0.0.1 --port 5173 *>> $log
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Dev server exited (code: $LASTEXITCODE) - restarting" | Out-File -FilePath $log -Append -Encoding utf8
}
