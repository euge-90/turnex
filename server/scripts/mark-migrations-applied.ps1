param(
  [string]$SchemaPath = "prisma\\schema.prisma"
)

if (-not $env:DATABASE_URL) {
  Write-Error "Please set the DATABASE_URL environment variable before running this script."
  exit 1
}


# Resolve migrations directory relative to script location (server/scripts -> server/prisma/migrations)
$migrationsDir = Join-Path -Path $PSScriptRoot -ChildPath "..\prisma\migrations"

Write-Output "Using DATABASE_URL (masked): $($env:DATABASE_URL.Substring(0, [Math]::Min(40, $env:DATABASE_URL.Length)))..."

# Resolve schema path to an absolute path so prisma CLI can find it regardless of CWD
$resolvedSchema = Resolve-Path -Path (Join-Path -Path $PSScriptRoot -ChildPath "..\$SchemaPath") -ErrorAction Stop
$schemaArg = $resolvedSchema.Path

Get-ChildItem -Path $migrationsDir -Directory | ForEach-Object {
  $folder = $_.Name
  Write-Output "Marking migration as applied: $folder"
  npx prisma migrate resolve --schema="$schemaArg" --applied $folder
}

Write-Output "Done. All migrations marked as applied."
