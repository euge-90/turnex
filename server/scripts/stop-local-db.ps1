<#
stop-local-db.ps1
Stops (and optionally removes) the local Postgres container used for development.

Usage:
  ./stop-local-db.ps1            # stops the container
  ./stop-local-db.ps1 -Remove    # stops and removes the container
#>

param(
  [switch]$Remove
)

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker doesn't appear to be installed or available in PATH." -ForegroundColor Yellow
  Write-Host "Please install Docker Desktop for Windows: https://www.docker.com/get-started" -ForegroundColor Cyan
  exit 1
}

$exists = docker ps -a --filter "name=turnex-postgres" --format "{{.Names}}"
if ($exists -ne 'turnex-postgres') {
  Write-Host "No container named 'turnex-postgres' was found." -ForegroundColor Yellow
  exit 0
}

Write-Host "Stopping 'turnex-postgres'..." -ForegroundColor Green
docker stop turnex-postgres | Out-Null
Write-Host "Stopped." -ForegroundColor Green

if ($Remove) {
  Write-Host "Removing 'turnex-postgres'..." -ForegroundColor Green
  docker rm turnex-postgres | Out-Null
  Write-Host "Removed." -ForegroundColor Green
}
