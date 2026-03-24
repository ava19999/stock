Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $script:PSNativeCommandUseErrorActionPreference = $false
}

function Write-Step {
  param([string]$Message)
  Write-Host "[server] $Message" -ForegroundColor Cyan
}

function Write-Warn {
  param([string]$Message)
  Write-Host "[warning] $Message" -ForegroundColor Yellow
}

function Get-RepoRoot {
  return (Split-Path -Parent $PSScriptRoot)
}

function Enter-RepoRoot {
  Set-Location (Get-RepoRoot)
}

function Initialize-DockerConfig {
  param([string]$RepoRoot)
  if ($env:DOCKER_CONFIG -and $env:DOCKER_CONFIG.Trim().Length -gt 0) {
    return
  }

  $localDockerConfig = Join-Path $RepoRoot ".docker-config"
  if (-not (Test-Path $localDockerConfig)) {
    New-Item -ItemType Directory -Path $localDockerConfig -Force *> $null
  }
  $env:DOCKER_CONFIG = $localDockerConfig
}

function Get-ProjectId {
  param([string]$RepoRoot)
  $defaultId = Split-Path -Leaf $RepoRoot
  $configPath = Join-Path $RepoRoot "supabase\config.toml"
  if (-not (Test-Path $configPath)) {
    return $defaultId
  }

  $match = Select-String -Path $configPath -Pattern '^\s*project_id\s*=\s*"(.*)"' | Select-Object -First 1
  if ($match -and $match.Matches.Count -gt 0) {
    return $match.Matches[0].Groups[1].Value
  }

  return $defaultId
}

function Assert-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command '$Name' tidak ditemukan. Install dulu dependency yang dibutuhkan."
  }
}

function Get-CloudflaredPath {
  $cmd = Get-Command "cloudflared" -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $candidates = @(
    "C:\Program Files\cloudflared\cloudflared.exe",
    "C:\Program Files (x86)\cloudflared\cloudflared.exe",
    (Join-Path $env:LOCALAPPDATA "Programs\cloudflared\cloudflared.exe")
  )

  foreach ($path in $candidates) {
    if (Test-Path $path) {
      return $path
    }
  }

  return $null
}

function Assert-CloudflaredReady {
  $path = Get-CloudflaredPath
  if (-not $path) {
    throw "cloudflared belum terpasang atau belum ditemukan. Install dulu Cloudflare cloudflared."
  }
  return $path
}

function Assert-DockerReady {
  Assert-Command "docker"
  Initialize-DockerConfig -RepoRoot (Get-RepoRoot)
  & cmd /c "docker info >nul 2>nul"
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop belum jalan. Buka Docker Desktop lalu coba lagi."
  }
}

function Invoke-CmdCommand {
  param([string]$Command)
  & cmd /c $Command
  return $LASTEXITCODE
}

function Get-ProjectContainerIds {
  param([string]$ProjectId)
  $raw = & cmd /c "docker ps -aq --filter `"name=_$ProjectId`""
  if ($LASTEXITCODE -ne 0) {
    return @()
  }

  $ids = @($raw | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_.Trim() })
  return ,$ids
}

function Remove-ProjectContainers {
  param([string]$ProjectId)
  $ids = @(Get-ProjectContainerIds -ProjectId $ProjectId)
  foreach ($id in $ids) {
    & cmd /c "docker rm -f $id >nul 2>nul"
  }
  return (@($ids)).Count
}

function Remove-ProjectNetwork {
  param([string]$ProjectId)
  $networkName = "supabase_network_$ProjectId"
  & cmd /c "docker network rm $networkName >nul 2>nul"
}

function Get-RuntimeDir {
  $runtimeDir = Join-Path (Get-RepoRoot) ".runtime"
  if (-not (Test-Path $runtimeDir)) {
    New-Item -Path $runtimeDir -ItemType Directory -Force *> $null
  }
  return $runtimeDir
}

function Get-EnvMapFromFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    throw "File env tidak ditemukan: $Path"
  }

  $map = @{}
  $lines = Get-Content $Path
  foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }
    $trimmed = $line.Trim()
    if ($trimmed.StartsWith("#")) {
      continue
    }
    $eqIndex = $trimmed.IndexOf("=")
    if ($eqIndex -lt 1) {
      continue
    }
    $key = $trimmed.Substring(0, $eqIndex).Trim()
    $value = $trimmed.Substring($eqIndex + 1).Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $map[$key] = $value
  }

  return $map
}

