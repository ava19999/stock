param(
  [switch]$StopSupabase
)

. "$PSScriptRoot\_common.ps1"

Enter-RepoRoot

$runtimeDir = Get-RuntimeDir
$pidPath = Join-Path $runtimeDir "cloudflared-quick.pid"
$urlPath = Join-Path $runtimeDir "cloudflared-quick.url"

if (Test-Path $pidPath) {
  $pidValue = Get-Content $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pidValue -and ($pidValue -match "^\d+$")) {
    $proc = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Step "Menghentikan Quick Tunnel (PID $pidValue)..."
      Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    } else {
      Write-Warn "PID quick tunnel tidak ditemukan (mungkin sudah berhenti)."
    }
  }
  Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
} else {
  Write-Warn "File PID quick tunnel tidak ditemukan."
}

if (Test-Path $urlPath) {
  Remove-Item $urlPath -Force -ErrorAction SilentlyContinue
}

if ($StopSupabase) {
  Write-Step "Menghentikan Supabase server..."
  & "$PSScriptRoot\stop-server.ps1"
  exit $LASTEXITCODE
}

Write-Step "Stop quick tunnel selesai."
exit 0
