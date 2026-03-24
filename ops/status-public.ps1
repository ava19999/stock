param(
  [string]$EnvFile = ".env.public"
)

. "$PSScriptRoot\_common.ps1"

Enter-RepoRoot
$repoRoot = Get-RepoRoot
$envPath = Join-Path $repoRoot $EnvFile
$runtimeDir = Get-RuntimeDir
$pidPath = Join-Path $runtimeDir "cloudflared.pid"
$logPath = Join-Path $runtimeDir "cloudflared.log"
$errPath = Join-Path $runtimeDir "cloudflared.err.log"

Write-Step "Status server Supabase:"
& "$PSScriptRoot\status-server.ps1"
$serverCode = $LASTEXITCODE

$publicUrl = ""
if (Test-Path $envPath) {
  $map = Get-EnvMapFromFile -Path $envPath
  if ($map.ContainsKey("PUBLIC_SUPABASE_URL")) {
    $publicUrl = $map["PUBLIC_SUPABASE_URL"]
  }
}

if (-not [string]::IsNullOrWhiteSpace($publicUrl)) {
  Write-Step "URL publik terkonfigurasi: $publicUrl"
}

if (Test-Path $pidPath) {
  $pidValue = Get-Content $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pidValue -and ($pidValue -match "^\d+$")) {
    $proc = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Step "Tunnel aktif (PID $pidValue)."
    } else {
      Write-Warn "PID tunnel tercatat tapi proses tidak ada."
    }
  }
} else {
  Write-Warn "Tunnel belum aktif (PID file belum ada)."
}

if (Test-Path $logPath) {
  Write-Step "Log tunnel terakhir:"
  Get-Content $logPath -Tail 20
}

if (Test-Path $errPath) {
  Write-Step "Error log tunnel terakhir:"
  Get-Content $errPath -Tail 20
}

exit $serverCode
