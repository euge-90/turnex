param(
  [string]$SchemaPath = "..\prisma\schema.prisma"
)

if (-not $env:DATABASE_URL) {
  Write-Error "Please set the DATABASE_URL environment variable before running this script."
  exit 1
}

$migrationsDir = Join-Path -Path $PSScriptRoot -ChildPath "..\prisma\migrations"
Write-Output "Using DATABASE_URL (masked): $($env:DATABASE_URL.Substring(0, [Math]::Min(40, $env:DATABASE_URL.Length)))..."

Get-ChildItem -Path $migrationsDir -Directory | ForEach-Object {
  $folder = $_.Name
  Write-Output "Marking migration as applied: $folder"
  npx prisma migrate resolve --schema=$SchemaPath --applied $folder
}

Write-Output "Done. All migrations marked as applied."
