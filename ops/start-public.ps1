param(
  [string]$EnvFile = ".env.public",
  [switch]$ForceClean,
  [switch]$RefreshEnv
)

. "$PSScriptRoot\_common.ps1"

Enter-RepoRoot
Assert-Command "npx"
Assert-DockerReady
$cloudflaredPath = Assert-CloudflaredReady

$repoRoot = Get-RepoRoot
$envPath = Join-Path $repoRoot $EnvFile
$envMap = Get-EnvMapFromFile -Path $envPath

if (-not $envMap.ContainsKey("CLOUDFLARE_TUNNEL_TOKEN") -or [string]::IsNullOrWhiteSpace($envMap["CLOUDFLARE_TUNNEL_TOKEN"])) {
  throw "CLOUDFLARE_TUNNEL_TOKEN belum diisi di $EnvFile."
}
if (-not $envMap.ContainsKey("PUBLIC_SUPABASE_URL") -or [string]::IsNullOrWhiteSpace($envMap["PUBLIC_SUPABASE_URL"])) {
  throw "PUBLIC_SUPABASE_URL belum diisi di $EnvFile."
}

$startArgs = @()
if ($ForceClean) {
  $startArgs += "-ForceClean"
}

Write-Step "Menjalankan server Supabase..."
& "$PSScriptRoot\start-server.ps1" @startArgs
if ($LASTEXITCODE -ne 0) {
  throw "Start server Supabase gagal."
}

if ($RefreshEnv) {
  Write-Step "Sinkron .env.local ke URL publik..."
  & "$PSScriptRoot\use-public-env.ps1" -EnvFile $EnvFile
  if ($LASTEXITCODE -ne 0) {
    throw "Sinkron env publik gagal."
  }
}

$runtimeDir = Get-RuntimeDir
$pidPath = Join-Path $runtimeDir "cloudflared.pid"
$logPath = Join-Path $runtimeDir "cloudflared.log"
$errPath = Join-Path $runtimeDir "cloudflared.err.log"

if (Test-Path $pidPath) {
  $oldPid = Get-Content $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($oldPid -and ($oldPid -match "^\d+$")) {
    $oldProcess = Get-Process -Id ([int]$oldPid) -ErrorAction SilentlyContinue
    if ($oldProcess) {
      Write-Warn "Tunnel lama terdeteksi (PID $oldPid), akan dihentikan dulu."
      Stop-Process -Id $oldProcess.Id -Force -ErrorAction SilentlyContinue
    }
  }
}

if (Test-Path $logPath) {
  Remove-Item $logPath -Force -ErrorAction SilentlyContinue
}
if (Test-Path $errPath) {
  Remove-Item $errPath -Force -ErrorAction SilentlyContinue
}

$token = $envMap["CLOUDFLARE_TUNNEL_TOKEN"]
$argList = @("tunnel", "--no-autoupdate", "run", "--token", $token)

Write-Step "Menjalankan Cloudflare Tunnel..."
$proc = Start-Process -FilePath $cloudflaredPath -ArgumentList $argList -PassThru -WindowStyle Hidden -RedirectStandardOutput $logPath -RedirectStandardError $errPath
Start-Sleep -Seconds 3

if ($proc.HasExited) {
  $tail = ""
  if (Test-Path $logPath) {
    $tail = (Get-Content $logPath -Tail 30) -join "`n"
  }
  if (Test-Path $errPath) {
    $tailErr = (Get-Content $errPath -Tail 30) -join "`n"
    if (-not [string]::IsNullOrWhiteSpace($tailErr)) {
      if (-not [string]::IsNullOrWhiteSpace($tail)) {
        $tail = "$tail`n$tailErr"
      } else {
        $tail = $tailErr
      }
    }
  }
  throw "Cloudflare Tunnel gagal start. Log:`n$tail"
}

Set-Content -Path $pidPath -Value $proc.Id -Encoding ASCII
Write-Step "Tunnel aktif (PID $($proc.Id))."
Write-Step "URL publik Supabase: $($envMap["PUBLIC_SUPABASE_URL"])"
Write-Step "Cek status: npm run public:status"
exit 0
