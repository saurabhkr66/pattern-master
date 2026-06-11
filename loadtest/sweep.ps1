# Staged load sweep: run the k6 student journey at increasing concurrency
# (300 -> 500 -> 700 -> 1000 by default), one k6 process per wave, to find where
# the engine bends. Each wave gets its own summary JSON so you can compare p95s.
#
# WHY a process per wave: test-flow.js maps each iteration to a DISTINCT student
# (a student can only submit once). A fresh k6 process restarts that counter at
# 0, so after we reset attempts each wave cleanly reuses students 0..N-1.
#
# Run against a NON-PROD preview backed by a Neon dev branch. Example:
#   .\loadtest\sweep.ps1 -BaseUrl https://preview.example.com `
#       -Slug demo -TestId <coachingTestId>
#
# Knobs: -Waves 300,500,700,1000  -SpreadSecs 20  -ThinkSecs 5  -PauseSecs 45
#        -SkipSeed (reuse an existing seeded pool)  -HitLeaderboard

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$BaseUrl,
  [Parameter(Mandatory = $true)][string]$Slug,
  [Parameter(Mandatory = $true)][string]$TestId,
  [int[]]$Waves = @(300, 500, 700, 1000),
  [int]$SpreadSecs = 20,
  [int]$ThinkSecs = 5,
  [int]$PauseSecs = 45,
  [string]$EnvFile = ".env.local",
  # VPS split mode: the VPS Postgres is localhost-only (5432 firewalled), so
  # seed/reset CANNOT run from this laptop — they must run on the box. Pass the
  # SSH target (e.g. battle@1.2.3.4) and seed/reset are executed there over SSH,
  # while k6 still runs locally against -BaseUrl (the public HTTPS URL).
  [string]$VpsSsh,
  [string]$RemoteDir = "~/pattern-master",
  [switch]$SkipSeed,
  [switch]$HitLeaderboard
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot   # project root (sweep.ps1 lives in loadtest/)
Set-Location $root

$pool = ($Waves | Measure-Object -Maximum).Maximum   # seed/reset the largest wave
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $PSScriptRoot "results-$stamp"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "=== Load sweep ===" -ForegroundColor Cyan
Write-Host "Target : $BaseUrl  (slug=$Slug test=$TestId)"
Write-Host "Waves  : $($Waves -join ' -> ')   pool=$pool"
Write-Host "Output : $outDir`n"

# A prod target would autoscale Neon compute and hit real users. Refuse it.
if ($BaseUrl -match "www\.battleexam\.com|//battleexam\.com") {
  throw "BaseUrl looks like PROD ($BaseUrl). Point at a preview/dev target."
}

# Seed/reset run on the VPS over SSH when -VpsSsh is set (DB_DRIVER=standard,
# reading the server's own .env), else locally against the Neon dev branch.
function Invoke-Seed {
  if ($VpsSsh) {
    ssh $VpsSsh "cd $RemoteDir && DB_DRIVER=standard node --env-file=.env loadtest/seed-students.mjs --slug=$Slug --count=$pool"
  } else {
    node --env-file=$EnvFile loadtest/seed-students.mjs --slug=$Slug --count=$pool
  }
}
function Invoke-Reset {
  if ($VpsSsh) {
    ssh $VpsSsh "cd $RemoteDir && DB_DRIVER=standard node --env-file=.env loadtest/reset-attempts.mjs --slug=$Slug --testId=$TestId --count=$pool"
  } else {
    node --env-file=$EnvFile loadtest/reset-attempts.mjs --slug=$Slug --testId=$TestId --count=$pool
  }
}

if (-not $SkipSeed) {
  Write-Host "Seeding $pool students$(if ($VpsSsh) { " on $VpsSsh" })..." -ForegroundColor Yellow
  Invoke-Seed
  if ($LASTEXITCODE -ne 0) { throw "seed failed" }
}

$summary = @()
foreach ($n in $Waves) {
  Write-Host "`n--- Wave: $n students ---" -ForegroundColor Cyan

  Write-Host "Resetting attempts..." -ForegroundColor Yellow
  Invoke-Reset
  if ($LASTEXITCODE -ne 0) { throw "reset failed before wave $n" }

  $exportPath = Join-Path $outDir "wave-$n.json"
  $env:HIT_LEADERBOARD = if ($HitLeaderboard) { "1" } else { "" }

  k6 run `
    --summary-export="$exportPath" `
    -e BATCH_VUS=$n `
    -e COUNT=$pool `
    -e START_SPREAD_SECS=$SpreadSecs `
    -e THINK_SECS=$ThinkSecs `
    -e BASE_URL=$BaseUrl `
    -e SLUG=$Slug `
    -e TEST_ID=$TestId `
    loadtest/test-flow.js

  $k6Exit = $LASTEXITCODE   # non-zero == a threshold was breached this wave

  if (Test-Path $exportPath) {
    $m = (Get-Content $exportPath -Raw | ConvertFrom-Json).metrics
    $summary += [pscustomobject]@{
      Wave          = $n
      LoginP95ms    = [math]::Round($m.phase_login_ms.'p(95)')
      OpenP95ms     = [math]::Round($m.phase_open_ms.'p(95)')
      SubmitP95ms   = [math]::Round($m.phase_submit_ms.'p(95)')
      HttpFailPct   = [math]::Round($m.http_req_failed.rate * 100, 2)
      FlowErrPct    = [math]::Round($m.flow_errors.rate * 100, 2)
      ThresholdsOK  = ($k6Exit -eq 0)
    }
  }

  if ($n -ne $Waves[-1]) {
    Write-Host "Cooling down $PauseSecs s before next wave..." -ForegroundColor DarkGray
    Start-Sleep -Seconds $PauseSecs
  }
}

Write-Host "`n=== Sweep summary ===" -ForegroundColor Green
$summary | Format-Table -AutoSize
$summary | ConvertTo-Json | Out-File (Join-Path $outDir "summary.json") -Encoding utf8
Write-Host "`nPer-wave detail + summary.json in: $outDir"
