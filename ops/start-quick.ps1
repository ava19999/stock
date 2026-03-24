param(
  [switch]$ForceClean,
  [switch]$SkipEnvWrite,
  [int]$WaitSeconds = 30
)

. "$PSScriptRoot\_common.ps1"

Enter-RepoRoot
Assert-Command "npx"
Assert-DockerReady
$cloudflaredPath = Assert-CloudflaredReady

$startArgs = @()
if ($ForceClean) {
  $startArgs += "-ForceClean"
}

Write-Step "Menjalankan server Supabase..."
& "$PSScriptRoot\start-server.ps1" @startArgs
if ($LASTEXITCODE -ne 0) {
  throw "Start server Supabase gagal."
}

$repoRoot = Get-RepoRoot
$runtimeDir = Get-RuntimeDir
$pidPath = Join-Path $runtimeDir "cloudflared-quick.pid"
$logPath = Join-Path $runtimeDir "cloudflared-quick.log"
$errPath = Join-Path $runtimeDir "cloudflared-quick.err.log"
$urlPath = Join-Path $runtimeDir "cloudflared-quick.url"

if (Test-Path $pidPath) {
  $oldPid = Get-Content $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($oldPid -and ($oldPid -match "^\d+$")) {
    $oldProcess = Get-Process -Id ([int]$oldPid) -ErrorAction SilentlyContinue
    if ($oldProcess) {
      Write-Warn "Quick tunnel lama terdeteksi (PID $oldPid), akan dihentikan dulu."
      Stop-Process -Id $oldProcess.Id -Force -ErrorAction SilentlyContinue
    }
  }
  Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
}

if (Test-Path $logPath) {
  Remove-Item $logPath -Force -ErrorAction SilentlyContinue
}
if (Test-Path $errPath) {
  Remove-Item $errPath -Force -ErrorAction SilentlyContinue
}
if (Test-Path $urlPath) {
  Remove-Item $urlPath -Force -ErrorAction SilentlyContinue
}

$argList = @("tunnel", "--no-autoupdate", "--url", "http://127.0.0.1:54321")
Write-Step "Menjalankan Cloudflare Quick Tunnel (trycloudflare)..."
$proc = Start-Process -FilePath $cloudflaredPath -ArgumentList $argList -PassThru -WindowStyle Hidden -RedirectStandardOutput $logPath -RedirectStandardError $errPath
Start-Sleep -Seconds 2

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
  throw "Quick Tunnel gagal start. Log:`n$tail"
}

$publicUrl = $null
$pattern = "https://[a-zA-Z0-9-]+\.trycloudflare\.com"
$deadline = (Get-Date).AddSeconds($WaitSeconds)
while ((Get-Date) -lt $deadline) {
  if ($proc.HasExited) {
    break
  }
  $sources = @($logPath, $errPath)
  foreach ($source in $sources) {
    if (Test-Path $source) {
      $raw = Get-Content $source -Raw -ErrorAction SilentlyContinue
      if ($raw) {
        $matches = [regex]::Matches($raw, $pattern)
        if ($matches.Count -gt 0) {
          $publicUrl = $matches[$matches.Count - 1].Value
          break
        }
      }
    }
  }
  if (-not [string]::IsNullOrWhiteSpace($publicUrl)) {
    break
  }
  Start-Sleep -Milliseconds 500
}

if ([string]::IsNullOrWhiteSpace($publicUrl)) {
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
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  throw "URL Quick Tunnel tidak ditemukan dalam $WaitSeconds detik. Log:`n$tail"
}

Set-Content -Path $pidPath -Value $proc.Id -Encoding ASCII
Set-Content -Path $urlPath -Value $publicUrl -Encoding ASCII

$statusLines = & cmd /c "npx supabase status -o env"
if ($LASTEXITCODE -ne 0) {
  throw "Gagal membaca Supabase status untuk ambil publishable key."
}

$publishableKey = $null
foreach ($line in $statusLines) {
  if ($line -match '^PUBLISHABLE_KEY=(.*)$') {
    $value = $Matches[1].Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $publishableKey = $value
    break
  }
}

if ([string]::IsNullOrWhiteSpace($publishableKey)) {
  throw "PUBLISHABLE_KEY tidak ditemukan dari output supabase status."
}

if (-not $SkipEnvWrite) {
  $envLocalPath = Join-Path $repoRoot ".env.local"
  $envLines = @(
    "VITE_SUPABASE_URL=""$publicUrl""",
    "VITE_SUPABASE_ANON_KEY=""$publishableKey"""
  )
  $envLines | Set-Content -Path $envLocalPath -Encoding ASCII
  Write-Step ".env.local diupdate ke Quick Tunnel."
}

Write-Step "Quick Tunnel aktif (PID $($proc.Id))."
Write-Step "URL publik (sementara): $publicUrl"
Write-Step "Kunci publishable: $publishableKey"
Write-Step "Cek status: npm run quick:status"
Write-Warn "URL quick akan berubah jika tunnel dimatikan/start ulang."
exit 0
