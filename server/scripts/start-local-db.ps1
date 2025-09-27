<#
start-local-db.ps1
Starts a local Postgres container for development using Docker.
If Docker is not available the script prints installation instructions.

Usage:
  ./start-local-db.ps1
  ./start-local-db.ps1 -User turnex -Password turnexpass -Db turnex -Port 5432
#>
param(
  [string]$User = 'turnex',
  # We keep Password as string for easy local dev scripting. For production consider using SecureString/credentials.
  [string]$Password = 'turnexpass',
  [string]$Db = 'turnex',
  [int]$Port = 5432
)

function InstallDockerHelp {
  Write-Host "Docker doesn't appear to be installed or available in PATH." -ForegroundColor Yellow
  Write-Host "Please install Docker Desktop for Windows: https://www.docker.com/get-started" -ForegroundColor Cyan
  Write-Host "After installing, log out / log in or restart the shell so 'docker' is available." -ForegroundColor Cyan
}

# Check for docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  InstallDockerHelp
  exit 1
}

# Check if container already exists
$existing = docker ps -a --filter "name=turnex-postgres" --format "{{.Names}}"
if ($existing -eq 'turnex-postgres') {
  Write-Host "Container 'turnex-postgres' already exists. Starting it..." -ForegroundColor Green
  docker start turnex-postgres | Out-Null
  Write-Host "Started existing container 'turnex-postgres'" -ForegroundColor Green
  exit 0
}

# Run a new container
Write-Host "Starting Postgres container 'turnex-postgres' on port $Port..." -ForegroundColor Green
$cmd = "docker run --name turnex-postgres -e POSTGRES_USER=$User -e POSTGRES_PASSWORD=$Password -e POSTGRES_DB=$Db -p $Port:5432 -d postgres:15"
Invoke-Expression $cmd
if ($LASTEXITCODE -eq 0) {
  Write-Host "Postgres container started successfully." -ForegroundColor Green
  Write-Host "Update server/.env: DATABASE_URL=postgresql://${User}:${Password}@127.0.0.1:${Port}/${Db}?schema=public" -ForegroundColor Cyan
} else {
  Write-Host "Failed to start Postgres container. Ensure Docker Desktop is running." -ForegroundColor Red
  exit 1
}
