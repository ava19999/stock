param(
  [switch]$StopSupabase
)

. "$PSScriptRoot\_common.ps1"

Enter-RepoRoot

$runtimeDir = Get-RuntimeDir
$pidPath = Join-Path $runtimeDir "cloudflared.pid"

if (Test-Path $pidPath) {
  $pidValue = Get-Content $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pidValue -and ($pidValue -match "^\d+$")) {
    $proc = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Step "Menghentikan tunnel Cloudflare (PID $pidValue)..."
      Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    } else {
      Write-Warn "PID tunnel tidak ditemukan (mungkin sudah berhenti)."
    }
  }
  Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
} else {
  Write-Warn "File PID tunnel tidak ditemukan. Lewati stop tunnel."
}

if ($StopSupabase) {
  Write-Step "Menghentikan Supabase server..."
  & "$PSScriptRoot\stop-server.ps1"
  exit $LASTEXITCODE
}

Write-Step "Stop tunnel selesai."
exit 0
