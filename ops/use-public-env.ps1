param(
  [string]$EnvFile = ".env.public"
)

. "$PSScriptRoot\_common.ps1"

Enter-RepoRoot
$repoRoot = Get-RepoRoot
$envPath = Join-Path $repoRoot $EnvFile
$targetPath = Join-Path $repoRoot ".env.local"
$map = Get-EnvMapFromFile -Path $envPath

if (-not $map.ContainsKey("PUBLIC_SUPABASE_URL") -or [string]::IsNullOrWhiteSpace($map["PUBLIC_SUPABASE_URL"])) {
  throw "PUBLIC_SUPABASE_URL belum diisi di $EnvFile."
}
if (-not $map.ContainsKey("PUBLIC_SUPABASE_ANON_KEY") -or [string]::IsNullOrWhiteSpace($map["PUBLIC_SUPABASE_ANON_KEY"])) {
  throw "PUBLIC_SUPABASE_ANON_KEY belum diisi di $EnvFile."
}

$lines = @(
  "VITE_SUPABASE_URL=""$($map["PUBLIC_SUPABASE_URL"])""",
  "VITE_SUPABASE_ANON_KEY=""$($map["PUBLIC_SUPABASE_ANON_KEY"])"""
)
$lines | Set-Content -Path $targetPath -Encoding ASCII

Write-Step ".env.local berhasil diupdate ke mode publik."
Write-Step "Restart frontend (npm run dev) di setiap client agar pakai URL publik."
exit 0
