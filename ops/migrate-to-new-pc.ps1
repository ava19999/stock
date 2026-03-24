param(
  [ValidateSet("export", "import")]
  [string]$Mode = "export",
  [string]$Path = "",
  [switch]$IncludeStorage
)

. "$PSScriptRoot\_common.ps1"

Enter-RepoRoot

if ($Mode -eq "export") {
  Write-Step "Menjalankan backup migrasi dari PC lama..."
  $args = @()
  if ($IncludeStorage) {
    $args += "-IncludeStorage"
  }
  & "$PSScriptRoot\backup-server.ps1" @args
  exit $LASTEXITCODE
}

if ([string]::IsNullOrWhiteSpace($Path)) {
  throw "Untuk mode import, isi parameter -Path dengan folder backup atau file zip."
}

Write-Step "Menjalankan restore migrasi di PC baru..."
$restoreArgs = @("-BackupPath", $Path, "-ResetFirst")
if ($IncludeStorage) {
  $restoreArgs += "-RestoreStorage"
}
& "$PSScriptRoot\restore-server.ps1" @restoreArgs
exit $LASTEXITCODE

