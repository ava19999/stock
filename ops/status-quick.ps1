. "$PSScriptRoot\_common.ps1"

Enter-RepoRoot

$runtimeDir = Get-RuntimeDir
$pidPath = Join-Path $runtimeDir "cloudflared-quick.pid"
$urlPath = Join-Path $runtimeDir "cloudflared-quick.url"
$logPath = Join-Path $runtimeDir "cloudflared-quick.log"
$errPath = Join-Path $runtimeDir "cloudflared-quick.err.log"

Write-Step "Status server Supabase:"
& "$PSScriptRoot\status-server.ps1"
$serverCode = $LASTEXITCODE

if (Test-Path $urlPath) {
  $publicUrl = Get-Content $urlPath -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not [string]::IsNullOrWhiteSpace($publicUrl)) {
    Write-Step "URL quick aktif: $publicUrl"
  }
}

if (Test-Path $pidPath) {
  $pidValue = Get-Content $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pidValue -and ($pidValue -match "^\d+$")) {
    $proc = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Step "Quick Tunnel aktif (PID $pidValue)."
    } else {
      Write-Warn "PID quick tunnel tercatat tapi proses sudah tidak ada."
    }
  }
} else {
  Write-Warn "Quick Tunnel belum aktif."
}

if (Test-Path $logPath) {
  Write-Step "Log quick tunnel terakhir:"
  Get-Content $logPath -Tail 20
}

if (Test-Path $errPath) {
  Write-Step "Error log quick tunnel terakhir:"
  Get-Content $errPath -Tail 20
}

exit $serverCode
