param(
  [switch]$ForceClean
)

. "$PSScriptRoot\_common.ps1"

Enter-RepoRoot
Assert-Command "npx"
Assert-DockerReady

$projectId = Get-ProjectId -RepoRoot (Get-RepoRoot)

Write-Step "Menghentikan Supabase local..."
$stopCode = Invoke-CmdCommand -Command "npx supabase stop"

if ($stopCode -eq 0 -and -not $ForceClean) {
  Write-Step "Server berhasil stop."
  exit 0
}

Write-Warn "Stop standar tidak bersih sepenuhnya atau opsi ForceClean aktif. Menjalankan cleanup."
$removedCount = Remove-ProjectContainers -ProjectId $projectId
Remove-ProjectNetwork -ProjectId $projectId
Write-Step "Cleanup selesai. Container terhapus: $removedCount"

exit 0
