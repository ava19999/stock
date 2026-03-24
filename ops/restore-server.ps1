param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [switch]$ResetFirst,
  [switch]$RestoreStorage
)

. "$PSScriptRoot\_common.ps1"

Enter-RepoRoot
Assert-Command "npx"
Assert-DockerReady

$repoRoot = Get-RepoRoot
$projectId = Get-ProjectId -RepoRoot $repoRoot
$dbContainer = "supabase_db_$projectId"

function Resolve-BackupFolder {
  param([string]$PathInput)
  $resolved = Resolve-Path $PathInput -ErrorAction Stop
  $fullPath = $resolved.Path

  if (Test-Path $fullPath -PathType Container) {
    return $fullPath
  }

  if ((Test-Path $fullPath -PathType Leaf) -and $fullPath.EndsWith(".zip")) {
    $tmpRoot = Join-Path $repoRoot "backups\.restore_tmp"
    New-Item -Path $tmpRoot -ItemType Directory -Force *> $null
    $target = Join-Path $tmpRoot ("restore_" + [guid]::NewGuid().ToString("N"))
    Expand-Archive -Path $fullPath -DestinationPath $target -Force
    return $target
  }

  throw "BackupPath harus folder backup atau file .zip."
}

function Filter-DataFile {
  param(
    [string]$SourcePath,
    [string]$TargetPath
  )

  $skipBlock = $false
  $sourceLines = Get-Content $SourcePath
  foreach ($line in $sourceLines) {
    if ($line -match '^COPY "storage"\."buckets_vectors"' -or $line -match '^COPY "storage"\."vector_indexes"') {
      $skipBlock = $true
      continue
    }
    if ($skipBlock -and $line -eq '\.') {
      $skipBlock = $false
      continue
    }
    if (-not $skipBlock) {
      Add-Content -Path $TargetPath -Value $line -Encoding ASCII
    }
  }
}

$sourceFolder = Resolve-BackupFolder -PathInput $BackupPath
$schemaPath = Join-Path $sourceFolder "schema.sql"
$dataPath = Join-Path $sourceFolder "data.sql"

if (-not (Test-Path $schemaPath)) {
  throw "File schema.sql tidak ditemukan di backup."
}
if (-not (Test-Path $dataPath)) {
  throw "File data.sql tidak ditemukan di backup."
}

Write-Step "Menjalankan server lokal sebelum restore..."
& "$PSScriptRoot\start-server.ps1"
if ($LASTEXITCODE -ne 0) {
  throw "Start server gagal, restore dibatalkan."
}

if ($ResetFirst) {
  Write-Step "Reset database lokal dulu..."
  & cmd /c "npx supabase db reset"
  if ($LASTEXITCODE -ne 0) {
    throw "Reset database gagal."
  }
}

Write-Step "Import schema..."
$schemaSql = Get-Content -Raw $schemaPath
$schemaSql | & docker exec -i $dbContainer psql -v ON_ERROR_STOP=1 -U postgres -d postgres
if ($LASTEXITCODE -ne 0) {
  throw "Import schema gagal."
}

Write-Step "Siapkan data SQL (filter tabel vector storage yang sering error permission)..."
$filteredDataPath = Join-Path $sourceFolder "data.filtered.sql"
if (Test-Path $filteredDataPath) {
  Remove-Item $filteredDataPath -Force
}
Filter-DataFile -SourcePath $dataPath -TargetPath $filteredDataPath

Write-Step "Import data..."
$dataSql = Get-Content -Raw $filteredDataPath
$dataSql | & docker exec -i $dbContainer psql -v ON_ERROR_STOP=1 -U postgres -d postgres
if ($LASTEXITCODE -ne 0) {
  throw "Import data gagal."
}

if ($RestoreStorage) {
  $storageArchivePath = Join-Path $sourceFolder "storage-volume.tgz"
  if (Test-Path $storageArchivePath) {
    Write-Step "Restore storage volume..."
    $absoluteSource = (Resolve-Path $sourceFolder).Path
    $volumeName = "supabase_storage_$projectId"
    & docker run --rm -v "${volumeName}:/volume" -v "${absoluteSource}:/backup" alpine sh -c "rm -rf /volume/* && cd /volume && tar xzf /backup/storage-volume.tgz"
    if ($LASTEXITCODE -ne 0) {
      Write-Warn "Restore storage gagal. Database sudah ter-restore."
    }
  } else {
    Write-Warn "storage-volume.tgz tidak ditemukan, lewati restore storage."
  }
}

Write-Step "Restore selesai."
exit 0

