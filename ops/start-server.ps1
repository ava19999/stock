param(
  [switch]$ForceClean
)

. "$PSScriptRoot\_common.ps1"

Enter-RepoRoot
Assert-Command "npx"
Assert-DockerReady

$repoRoot = Get-RepoRoot
$projectId = Get-ProjectId -RepoRoot $repoRoot

function Test-SupabaseRunning {
  & cmd /c "npx supabase status -o json >nul 2>nul"
  return ($LASTEXITCODE -eq 0)
}

function Cleanup-StaleResources {
  param([string]$ProjectId)
  Write-Step "Membersihkan resource stale untuk project '$ProjectId'..."
  $removedCount = Remove-ProjectContainers -ProjectId $ProjectId
  Remove-ProjectNetwork -ProjectId $ProjectId
  Write-Step "Container terhapus: $removedCount"
}

if ($ForceClean) {
  Cleanup-StaleResources -ProjectId $projectId
}

Write-Step "Menjalankan Supabase local..."
$startCode = Invoke-CmdCommand -Command "npx supabase start"
if ($startCode -eq 0 -or (Test-SupabaseRunning)) {
  Write-Step "Server berhasil start."
  exit 0
}

Write-Warn "Start pertama gagal. Menjalankan recovery sekali, lalu retry debug."
Cleanup-StaleResources -ProjectId $projectId
$retryCode = Invoke-CmdCommand -Command "npx supabase start --debug"
if ($retryCode -eq 0 -or (Test-SupabaseRunning)) {
  Write-Step "Server berhasil start setelah recovery."
  exit 0
}

throw "Gagal start Supabase setelah recovery. Cek log di atas."
