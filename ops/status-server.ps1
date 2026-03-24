. "$PSScriptRoot\_common.ps1"

Enter-RepoRoot
Assert-Command "npx"
Assert-DockerReady

$projectId = Get-ProjectId -RepoRoot (Get-RepoRoot)

Write-Step "Status Supabase CLI:"
& cmd /c "npx supabase status"
$statusCode = $LASTEXITCODE

Write-Step "Status container Docker untuk project '$projectId':"
& docker ps --filter "name=_$projectId" --format "table {{.Names}}\t{{.Status}}"

if ($statusCode -ne 0) {
  exit $statusCode
}

exit 0

