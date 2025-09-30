<#
automate-postgres-reset-and-migrate.ps1
Performs a safe, automated local flow to reset the 'postgres' password via temporary 'trust' in pg_hba.conf,
then runs the create-local-db.js helper, applies Prisma migrations and starts the server.

USAGE (PowerShell as Administrator):
  ./scripts/automate-postgres-reset-and-migrate.ps1 -NewPostgresPassword 'MyNewSecret123!'

This script will:
 - backup $PGDATA/pg_hba.conf
 - replace md5 -> trust for localhost entries
 - restart the Postgres service
 - run ALTER USER postgres WITH PASSWORD 'NewPostgresPassword'
 - restore pg_hba.conf to md5
 - reload/restart Postgres
 - run node scripts/create-local-db.js (installs 'pg' if missing)
 - run prisma migrate dev --name init
 - run npm run dev

WARNING: Must be run as Administrator. Use only on local developer machines. Don't run on production.
#>

param(
  [Parameter(Mandatory=$true)]
  [string]$NewPostgresPassword,
  [switch]$SkipPgHba
)

$ErrorActionPreference = 'Stop'

function Test-Admin {
  $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) {
    Write-Error "This script must be run as Administrator. Close this window and re-open PowerShell as Administrator."
    exit 1
  }
}

function Log {
  param([string]$Message, [string]$Level = 'INFO')
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Host "[$ts] [$Level] $Message"
}

function Invoke-ProcessChecked {
  param(
    [string]$Exe,
    [array]$Arguments,
    [string]$ErrorMessage
  )
  $argList = $Arguments -join ' '
  Log "Running: $Exe $argList"
  try {
    $proc = Start-Process -FilePath $Exe -ArgumentList $Arguments -NoNewWindow -Wait -PassThru -ErrorAction Stop
    if ($proc.ExitCode -ne 0) {
      Log "$ErrorMessage (exit code $($proc.ExitCode))" 'ERROR'
      exit $proc.ExitCode
    }
  } catch {
    Log "$ErrorMessage`n$($_.Exception.Message)" 'ERROR'
    exit 1
  }
}

function Wait-Service-State {
  param(
    [string]$Name,
    [string]$TargetState,
    [int]$TimeoutSec = 30
  )
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
    $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if ($null -eq $svc) { Start-Sleep -Seconds 1; continue }
    if ($svc.Status -eq $TargetState) { return $true }
    Start-Sleep -Seconds 1
  }
  return $false
}

Test-Admin

# Auto-detect PostgreSQL installation directory and service name
$defaultInstallRoot = 'C:\Program Files\PostgreSQL'
$pgInstallPath = $null
if (Test-Path $defaultInstallRoot) {
  $dirs = Get-ChildItem $defaultInstallRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
  if ($dirs -and $dirs.Count -gt 0) {
    $pgInstallPath = $dirs[0].FullName
    Log "Detected PostgreSQL install at $pgInstallPath"
  }
}

if (-not $pgInstallPath) {
  $pgInstallPath = 'C:\Program Files\PostgreSQL\15'
  Log "Could not auto-detect PostgreSQL install. Falling back to $pgInstallPath" 'WARN'
}

$pgData = Join-Path $pgInstallPath 'data'
$pgHba = Join-Path $pgData 'pg_hba.conf'

# Detect service name using pattern 'postgresql*'
$svc = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($svc) {
  $serviceName = $svc.Name
  Log "Detected Postgres service: $serviceName"
} else {
  $serviceName = 'postgresql-x64-15'
  Log "Could not detect Postgres service by pattern 'postgresql*'. Falling back to $serviceName" 'WARN'
}

# Try to discover the actual PGDATA used by the running service (PathName may include -D "C:\...\data")
$svcInfo = Get-CimInstance Win32_Service -Filter "Name='$serviceName'" -ErrorAction SilentlyContinue
if ($svcInfo -and $svcInfo.PathName) {
  $pathName = $svcInfo.PathName
  Log "Service PathName: $pathName"
  # Match -D "C:\path\to\data"  or -D C:\path\to\data  or --data-directory="..." or --data-directory=...
  $m = [regex]::Match($pathName, '-D\s+"([^"]+)"|-D\s+([^\s]+)|--data-directory=\"?([^\"]+)\"?|--data-directory=([^\s]+)')
  if ($m.Success) {
    $detectedData = $null
    for ($i = 1; $i -le 4; $i++) { if ($m.Groups[$i].Value) { $detectedData = $m.Groups[$i].Value; break } }
    if ($detectedData) {
      $pgData = $detectedData
      $pgHba = Join-Path $pgData 'pg_hba.conf'
      Log "Detected PGDATA from service: $pgData"
    }
  }
}

if (-not (Test-Path $pgHba)) {
  Log "pg_hba.conf not found at $pgHba. Adjust the script to point to your PGDATA." 'ERROR'
  exit 1
}

try {
  # Collect candidate pg_hba.conf files (fallback to detected pg_hba if none found)
  $candidatePgHbas = @()
  if (Test-Path 'C:\Program Files\PostgreSQL') {
    $candidatePgHbas = Get-ChildItem 'C:\Program Files\PostgreSQL' -Recurse -Filter 'pg_hba.conf' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -ErrorAction SilentlyContinue
  }
  if (-not $candidatePgHbas -or $candidatePgHbas.Count -eq 0) { $candidatePgHbas = @($pgHba) }
  $appliedHbas = @()
  $appliedBackups = @()

  foreach ($h in $candidatePgHbas) {
    try {
      $bak = "$h.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
      Copy-Item -Path $h -Destination $bak -Force
      Log "Backed up pg_hba.conf to $bak"
      # Track originals and backups
      $appliedHbas += $h
      $appliedBackups += $bak

      if ($SkipPgHba) { Log "Skipping patching $h due to -SkipPgHba" 'INFO'; continue }

      $lines = Get-Content -Path $h -ErrorAction Stop
      $filtered = $lines | Where-Object { -not ($_ -match '\b127\.0\.0\.1\/32\b') -and -not ($_ -match '\b::1\/128\b') }
      $trustLines = @(
        'host    all             all             127.0.0.1/32            trust',
        'host    all             all             ::1/128                 trust'
      )
      $newLines = $trustLines + '' + $filtered
      Set-Content -Path $h -Value $newLines -Force
      Log "Temporarily inserted explicit 'trust' entries at top of $h"
    } catch {
      Log ([string]::Format('Failed to backup/patch {0}: {1}', $h, $_.Exception.Message)) 'WARN'
    }
  }
  if ($appliedHbas.Count -eq 0) { Log 'No pg_hba.conf files were patched/backed up' 'WARN' }

  # Restart service (stop/start). Use sc.exe and check results.
  Log "Stopping service $serviceName..."
  sc.exe stop $serviceName | Out-Null
  if (-not (Wait-Service-State -Name $serviceName -TargetState 'Stopped' -TimeoutSec 20)) { Log "Service did not stop within timeout" 'WARN' }
  Start-Sleep -Seconds 1
  Log "Starting service $serviceName..."
  sc.exe start $serviceName | Out-Null
  if (-not (Wait-Service-State -Name $serviceName -TargetState 'Running' -TimeoutSec 20)) { Log "Service did not start within timeout" 'WARN' }
  Start-Sleep -Seconds 2

  # Change postgres password (no password required due to trust)
  if (-not $SkipPgHba) {
  # Find a psql executable - prefer the one from the same install dir the service uses
  $psqlPath = $null
  if ($svcInfo -and $svcInfo.PathName) {
    # try to extract the bin directory containing pg_ctl.exe from the service PathName
    $m2 = [regex]::Match($svcInfo.PathName, '"?([A-Za-z]:\\[^\"]*?\\bin)\\pg_ctl.exe"?', 'IgnoreCase')
    if ($m2.Success) {
      $svcBin = $m2.Groups[1].Value
      $candidate = Join-Path $svcBin 'psql.exe'
      if (Test-Path $candidate) { $psqlPath = $candidate; Log "Using psql from service install: $psqlPath" }
    }
  }
  if (-not $psqlPath) {
    $psqlCandidates = @()
    if (Test-Path 'C:\Program Files\PostgreSQL') {
      $psqlCandidates = Get-ChildItem 'C:\Program Files\PostgreSQL' -Recurse -Filter 'psql.exe' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
    }
    if ($psqlCandidates -and $psqlCandidates.Count -gt 0) {
      # pick the newest psql executable as a reasonable fallback
      $psqlPath = $psqlCandidates | Sort-Object -Property { (Get-Item $_).LastWriteTime } -Descending | Select-Object -First 1
      Log "Using discovered psql: $psqlPath"
    } else {
      $psqlPath = Join-Path $pgInstallPath 'bin\psql.exe'
    }
  }
  if (-not (Test-Path $psqlPath)) {
    Log "psql not found at $psqlPath. Adjust path or install Postgres client tools." 'ERROR'
    exit 1
  }
  Log "Altering postgres user password..."
  # Log psql version for debugging
  try { & $psqlPath --version | ForEach-Object { Log "psql version: $_" } } catch { Log "Could not run psql --version" 'WARN' }
  # Run psql directly with the call operator so the -c argument is passed as a single parameter
  $alterSql = "ALTER USER postgres WITH PASSWORD '$NewPostgresPassword';"
  Log "Running: $psqlPath -U postgres -h 127.0.0.1 -c \"$alterSql\""
  try {
    & $psqlPath -U postgres -h 127.0.0.1 -c $alterSql
    if ($LASTEXITCODE -ne 0) { Log "Failed to ALTER postgres password (exit code $LASTEXITCODE)" 'ERROR'; exit $LASTEXITCODE }
  } catch {
    Log "Failed to ALTER postgres password: $($_.Exception.Message)" 'ERROR'
    exit 1
  }

    # Restore pg_hba.conf from backups (revert to original) if we patched any files
    if (-not $SkipPgHba -and $appliedHbas.Count -gt 0) {
      try {
        for ($i = 0; $i -lt $appliedHbas.Count; $i++) {
          $file = $appliedHbas[$i]
          $bakfile = $appliedBackups[$i]
          if (Test-Path $bakfile) {
            Copy-Item -Path $bakfile -Destination $file -Force
            Log "Restored $file from $bakfile"
          } else {
            Log "Backup $bakfile not found for $file" 'WARN'
          }
        }
      } catch {
        Log "Failed restoring backups: $($_.Exception.Message)" 'ERROR'
      }
    } else {
      Log 'Skipping restore because -SkipPgHba was set or no files patched' 'INFO'
    }
  } else {
    Log 'Skipping restore because -SkipPgHba was set' 'INFO'
  }

  # Reload Postgres config or restart
  $pgCtl = Join-Path $pgInstallPath 'bin\pg_ctl.exe'
  if (-not (Test-Path $pgCtl)) { $pgCtl = 'C:\Program Files\PostgreSQL\15\bin\pg_ctl.exe' }
  if (Test-Path $pgCtl) {
    Log "Reloading Postgres configuration"
    & $pgCtl reload -D $pgData
    if ($LASTEXITCODE -ne 0) {
      Log "pg_ctl reload failed (exit code $LASTEXITCODE), restarting service" 'WARN'
      sc.exe stop $serviceName | Out-Null
      Start-Sleep -Seconds 3
      sc.exe start $serviceName | Out-Null
    }
  } else {
    Log "pg_ctl not found, restarting service instead"
    sc.exe stop $serviceName | Out-Null
    Start-Sleep -Seconds 3
    sc.exe start $serviceName | Out-Null
  }
  Start-Sleep -Seconds 2

  # Change to server directory (one level up from scripts)
  Push-Location (Join-Path $PSScriptRoot '..')

  # Ensure node/npm available
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Log "node is not installed or not in PATH" 'ERROR'; exit 1 }
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Log "npm is not installed or not in PATH" 'ERROR'; exit 1 }

  # Ensure 'pg' installed
  # Build node_modules pg path without passing an array to Join-Path
  $nodeModulesPg = Join-Path (Join-Path $PWD 'node_modules') 'pg'
  if (-not (Test-Path $nodeModulesPg)) {
    Log "Installing 'pg' package..."
  Invoke-ProcessChecked -Exe 'npm' -Arguments @('install','pg','--no-audit','--no-fund') -ErrorMessage 'Failed to install pg'
  }

  Log "Running create-local-db.js to create database and user (turnex)..."
  # pass admin URL via env var to avoid exposing password in process list
  $prevAdmin = $env:ADMIN_DB_URL
  $env:ADMIN_DB_URL = "postgresql://postgres:$NewPostgresPassword@127.0.0.1:5432/postgres"
  Invoke-ProcessChecked -Exe 'node' -Arguments @('scripts/create-local-db.js','--url',$env:ADMIN_DB_URL) -ErrorMessage 'create-local-db.js failed'
  if ($null -ne $prevAdmin) { $env:ADMIN_DB_URL = $prevAdmin } else { Remove-Item env:ADMIN_DB_URL -ErrorAction SilentlyContinue }

  Log "Running Prisma generate and applying migrations (non-interactive)..."
  Invoke-ProcessChecked -Exe 'npx' -Arguments @('prisma','generate') -ErrorMessage 'prisma generate failed'
  # Use migrate deploy to apply existing migrations non-interactively
  Invoke-ProcessChecked -Exe 'npx' -Arguments @('prisma','migrate','deploy') -ErrorMessage 'prisma migrate deploy failed'

  Log "Starting server (npm run dev)..."
  Invoke-ProcessChecked -Exe 'npm' -Arguments @('run','dev') -ErrorMessage 'Failed to start server'

  Pop-Location
  Log "Done. If the server started successfully, open http://localhost:3000"

} catch {
  Log "Unhandled error: $($_.Exception.Message)" 'ERROR'
  exit 1
}