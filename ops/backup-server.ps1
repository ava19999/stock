param(
  [string]$BackupRoot = "backups\supabase",
  [int]$Keep = 14,
  [string]$DbUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  [switch]$IncludeStorage
)

. "$PSScriptRoot\_common.ps1"

Enter-RepoRoot
Assert-Command "npx"
Assert-DockerReady

$repoRoot = Get-RepoRoot
$projectId = Get-ProjectId -RepoRoot $repoRoot

Write-Step "Validasi status server lokal..."
$statusCode = Invoke-CmdCommand -Command "npx supabase status >nul 2>nul"
if ($statusCode -ne 0) {
  Write-Warn "Supabase belum aktif. Menjalankan start otomatis."
  & "$PSScriptRoot\start-server.ps1"
  if ($LASTEXITCODE -ne 0) {
    throw "Tidak bisa melanjutkan backup karena start server gagal."
  }
}

$rootPath = Join-Path $repoRoot $BackupRoot
New-Item -Path $rootPath -ItemType Directory -Force *> $null

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $rootPath $stamp
New-Item -Path $backupDir -ItemType Directory -Force *> $null

$schemaPath = Join-Path $backupDir "schema.sql"
$dataPath = Join-Path $backupDir "data.sql"

Write-Step "Dump schema..."
$dumpSchemaCommand = "npx supabase db dump -f `"$schemaPath`" --db-url `"$DbUrl`""
$schemaCode = Invoke-CmdCommand -Command $dumpSchemaCommand
if ($schemaCode -ne 0) {
  throw "Gagal dump schema."
}

Write-Step "Dump data..."
$dumpDataCommand = "npx supabase db dump --data-only --use-copy -f `"$dataPath`" --db-url `"$DbUrl`""
$dataCode = Invoke-CmdCommand -Command $dumpDataCommand
if ($dataCode -ne 0) {
  throw "Gagal dump data."
}

$envLocalPath = Join-Path $repoRoot ".env.local"
if (Test-Path $envLocalPath) {
  Copy-Item $envLocalPath (Join-Path $backupDir ".env.local") -Force
}

$configPath = Join-Path $repoRoot "supabase\config.toml"
if (Test-Path $configPath) {
  Copy-Item $configPath (Join-Path $backupDir "config.toml") -Force
}

if ($IncludeStorage) {
  Write-Step "Backup storage volume..."
  $volumeName = "supabase_storage_$projectId"
  $absoluteBackupDir = (Resolve-Path $backupDir).Path
  & docker run --rm -v "${volumeName}:/volume" -v "${absoluteBackupDir}:/backup" alpine sh -c "cd /volume && tar czf /backup/storage-volume.tgz ."
  if ($LASTEXITCODE -ne 0) {
    Write-Warn "Backup storage gagal. Schema dan data SQL tetap tersimpan."
  }
}

$meta = @{
  project_id   = $projectId
  created_at   = (Get-Date).ToString("o")
  include_storage = [bool]$IncludeStorage
  backup_dir   = $backupDir
}
$meta | ConvertTo-Json | Set-Content -Path (Join-Path $backupDir "metadata.json") -Encoding ASCII

$zipPath = Join-Path $rootPath "$stamp.zip"
Compress-Archive -Path (Join-Path $backupDir "*") -DestinationPath $zipPath -Force

if ($Keep -gt 0) {
  $backupFolders = @(Get-ChildItem $rootPath -Directory | Sort-Object Name -Descending)
  if ($backupFolders.Count -gt $Keep) {
    $backupFolders | Select-Object -Skip $Keep | Remove-Item -Recurse -Force
  }

  $backupZipFiles = @(Get-ChildItem $rootPath -File -Filter "*.zip" | Sort-Object Name -Descending)
  if ($backupZipFiles.Count -gt $Keep) {
    $backupZipFiles | Select-Object -Skip $Keep | Remove-Item -Force
  }
}

Write-Step "Backup selesai: $backupDir"
Write-Step "Arsip zip: $zipPath"
exit 0
