#!/usr/bin/env powershell
<#
.SYNOPSIS
  Employee vault endpoint test suite
.DESCRIPTION
  Runs functional checks, security checks, and stress checks for:
  - employee-vault-list-documents
  - employee-vault-sign-document
  - employee-vault-process-exit
#>

param(
  [string]$BaseUrl = 'http://localhost:8888/.netlify/functions',
  [string]$Token = 'test-jwt-token-placeholder',
  [int]$StressIterations = 40,
  [string]$DocumentId = '11111111-1111-4111-8111-111111111111',
  [string]$EmployeeId = '22222222-2222-4222-8222-222222222222'
)

$ErrorActionPreference = 'Stop'

$testDocumentId = $DocumentId
$testEmployeeId = $EmployeeId

function Truncate {
  param([string]$InputValue, [int]$Length = 120)
  if (-not $InputValue) { return '' }
  if ($InputValue.Length -le $Length) { return $InputValue }
  return $InputValue.Substring(0, $Length)
}

function New-Headers {
  param([string]$AuthToken)
  return @{
    'Content-Type'  = 'application/json'
    'Authorization' = "Bearer $AuthToken"
  }
}

function Invoke-EndpointRaw {
  param(
    [string]$Method,
    [string]$Endpoint,
    [string]$AuthToken,
    [object]$Payload = $null
  )

  $params = @{
    Uri        = "$BaseUrl/$Endpoint"
    Method     = $Method
    Headers    = New-Headers -AuthToken $AuthToken
    TimeoutSec = 20
  }

  if ($Method -ne 'GET' -and $null -ne $Payload) {
    $params.Body = $Payload | ConvertTo-Json -Depth 10
  }

  try {
    $res = Invoke-WebRequest @params -ErrorAction Stop
    return @{ Ok = $true; StatusCode = [int]$res.StatusCode; Body = $res.Content }
  }
  catch {
    $statusCode = 0
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode.value__
    }
    return @{ Ok = $false; StatusCode = $statusCode; Body = $_.ErrorDetails.Message }
  }
}

function Invoke-EndpointTest {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Endpoint,
    [object]$Payload,
    [string]$AuthToken
  )

  Write-Host "Testing: $Name" -ForegroundColor Yellow
  Write-Host "  Method: $Method | Endpoint: $Endpoint"

  $res = Invoke-EndpointRaw -Method $Method -Endpoint $Endpoint -AuthToken $AuthToken -Payload $Payload

  if ($res.Ok) {
    Write-Host "  OK Status: $($res.StatusCode)" -ForegroundColor Green
    Write-Host "  Response: $(Truncate -InputValue $res.Body -Length 180)"
    return $true
  }

  Write-Host "  Error Status: $($res.StatusCode)" -ForegroundColor Red
  Write-Host "  Details: $(Truncate -InputValue $res.Body -Length 180)"
  return $false
}

function Invoke-SecurityTests {
  param([string]$AuthToken)

  Write-Host '--------------------------------------------------' -ForegroundColor DarkGray
  Write-Host 'Security Tests' -ForegroundColor Yellow

  $badDocType = Invoke-EndpointRaw -Method 'GET' -Endpoint 'employee-vault-list-documents?document_type=../../etc/passwd' -AuthToken $AuthToken
  Write-Host "  Invalid document_type status: $($badDocType.StatusCode)"

  $headers = New-Headers -AuthToken $AuthToken
  $badJsonStatus = 0
  try {
    $null = Invoke-WebRequest -Uri "$BaseUrl/employee-vault-sign-document" -Method 'POST' -Headers $headers -Body '{ bad-json' -TimeoutSec 20 -ErrorAction Stop
    $badJsonStatus = 200
  }
  catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $badJsonStatus = [int]$_.Exception.Response.StatusCode.value__
    }
  }

  Write-Host "  Invalid JSON on sign endpoint status: $badJsonStatus"

  return ($badDocType.StatusCode -in 400, 401, 403) -and ($badJsonStatus -in 400, 401, 403)
}

function Invoke-StressGetList {
  param(
    [int]$Iterations,
    [string]$AuthToken
  )

  Write-Host '--------------------------------------------------' -ForegroundColor DarkGray
  Write-Host "Stress Test: GET list-documents ($Iterations calls)" -ForegroundColor Yellow

  $ok = 0
  $unauth = 0
  $forbidden = 0
  $throttled = 0
  $other = 0

  $sw = [System.Diagnostics.Stopwatch]::StartNew()

  for ($i = 0; $i -lt $Iterations; $i++) {
    $r = Invoke-EndpointRaw -Method 'GET' -Endpoint 'employee-vault-list-documents?limit=10&offset=0' -AuthToken $AuthToken
    switch ($r.StatusCode) {
      200 { $ok++ }
      401 { $unauth++ }
      403 { $forbidden++ }
      429 { $throttled++ }
      default { $other++ }
    }
  }

  $sw.Stop()
  $avgMs = [math]::Round(($sw.Elapsed.TotalMilliseconds / [math]::Max($Iterations, 1)), 2)

  Write-Host "  Duration: $([math]::Round($sw.Elapsed.TotalSeconds, 2))s | Avg: ${avgMs}ms/req"
  Write-Host "  200=$ok | 401=$unauth | 403=$forbidden | 429=$throttled | other=$other"

  return ($ok + $unauth + $forbidden + $throttled) -gt 0
}

Write-Host 'EMPLOYEE VAULT ENDPOINTS TEST SUITE' -ForegroundColor Cyan
Write-Host "  Base URL: $BaseUrl"
Write-Host "  Auth Token: $($Token.Substring(0, [Math]::Min(10, $Token.Length)))...(truncated)"
Write-Host "  Test Document ID: $testDocumentId"
Write-Host "  Stress Iterations: $StressIterations"
Write-Host ''

Write-Host '--------------------------------------------------' -ForegroundColor DarkGray
$result1 = Invoke-EndpointTest `
  -Name 'GET /employee-vault-list-documents' `
  -Method 'GET' `
  -Endpoint 'employee-vault-list-documents?role=salarie&limit=10' `
  -AuthToken $Token

Write-Host ''

Write-Host '--------------------------------------------------' -ForegroundColor DarkGray
$signPayload = @{
  documentId = $testDocumentId
  signerName = 'Test Vault User'
  metadata = @{
    userAgent = 'PowerShell-Test/1.0'
    timestamp = (Get-Date).ToUniversalTime().ToString('O')
  }
}

$result2 = Invoke-EndpointTest `
  -Name 'POST /employee-vault-sign-document' `
  -Method 'POST' `
  -Endpoint 'employee-vault-sign-document' `
  -Payload $signPayload `
  -AuthToken $Token

Write-Host ''

Write-Host '--------------------------------------------------' -ForegroundColor DarkGray
$exitPayload = @{
  employeeId = $testEmployeeId
  departureAt = (Get-Date).AddDays(30).ToString('yyyy-MM-dd')
  departureReason = 'depart retraite'
  disableInternalAccount = $true
  keepVaultAccess = $true
  vaultAccessExpiresAt = (Get-Date).AddYears(10).ToString('yyyy-MM-dd')
}

$result3 = Invoke-EndpointTest `
  -Name 'POST /employee-vault-process-exit' `
  -Method 'POST' `
  -Endpoint 'employee-vault-process-exit' `
  -Payload $exitPayload `
  -AuthToken $Token

Write-Host ''
$result4 = Invoke-SecurityTests -AuthToken $Token

Write-Host ''
$result5 = Invoke-StressGetList -Iterations $StressIterations -AuthToken $Token

Write-Host ''
Write-Host '--------------------------------------------------' -ForegroundColor DarkGray
Write-Host 'TEST SUMMARY' -ForegroundColor Cyan
$passed = @($result1, $result2, $result3, $result4, $result5) | Where-Object { $_ } | Measure-Object | Select-Object -ExpandProperty Count
$total = 5

Write-Host "  Passed: $passed/$total" -ForegroundColor $(if ($passed -eq $total) { 'Green' } else { 'Yellow' })

if ($passed -eq $total) {
  Write-Host 'All endpoint tests passed.' -ForegroundColor Green
  exit 0
}

Write-Host 'Some endpoint tests failed. Review logs above.' -ForegroundColor Yellow
exit 1
