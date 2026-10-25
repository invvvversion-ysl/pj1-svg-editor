param([string]$GhPath = 'gh')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskRepository = 'invvvversion-ysl/pj1-svg-editor'
$taskUrl = "https://github.com/$taskRepository.git"
$taskPreviousDirectory = Get-Location

function Invoke-TaskGit {
    param([string[]]$Arguments)
    $taskOutput = & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Git failed: $($Arguments[0])" }
    return $taskOutput
}

try {
    Set-Location -LiteralPath $taskRoot
    $taskGh = (Get-Command $GhPath -ErrorAction Stop).Source
    $taskAccount = & $taskGh api user --jq .login
    if ($LASTEXITCODE -ne 0) { throw 'GitHub authorization is unavailable. Run gh auth login in this terminal first.' }
    if ($taskAccount.Trim() -cne 'invvvversion-ysl') { throw "Unexpected GitHub account: $taskAccount" }
    if (Invoke-TaskGit -Arguments @('status', '--porcelain=v1', '--untracked-files=all')) { throw 'Commit project changes before publishing.' }
    $taskHead = (Invoke-TaskGit -Arguments @('rev-parse', 'HEAD')).Trim()
    if ((Invoke-TaskGit -Arguments @('rev-parse', 'final^{commit}')).Trim() -ne $taskHead) { throw 'The final tag must point to HEAD.' }
    if ((Invoke-TaskGit -Arguments @('branch', '--show-current')).Trim() -ne 'main') { throw 'Publish from the main branch.' }
    $taskRemotes = @(Invoke-TaskGit -Arguments @('remote'))
    if ($taskRemotes -contains 'origin') {
        $taskOrigin = (Invoke-TaskGit -Arguments @('remote', 'get-url', 'origin')).Trim()
        if ($taskOrigin.TrimEnd('/') -notin @($taskUrl, $taskUrl.Replace('.git',''))) { throw "Unexpected origin: $taskOrigin" }
    }
    $taskProbePreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $taskRepoJson = & $taskGh api "repos/$taskRepository" 2>$null
        $taskProbeExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $taskProbePreference }
    if ($taskProbeExit -ne 0) {
        & $taskGh repo create $taskRepository --private
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the private repository; no Git data was pushed.' }
        $taskRepoJson = & $taskGh api "repos/$taskRepository"
        if ($LASTEXITCODE -ne 0) { throw 'Could not verify the created repository.' }
    }
    $taskRepo = ($taskRepoJson -join "`n") | ConvertFrom-Json
    if (-not $taskRepo.private -or $taskRepo.full_name -cne $taskRepository) { throw 'Repository identity/privacy check failed.' }
    if ($taskRemotes -notcontains 'origin') { Invoke-TaskGit -Arguments @('remote', 'add', 'origin', $taskUrl) }
    $taskHelper = '!"' + $taskGh.Replace('\','/') + '" auth git-credential'
    Invoke-TaskGit -Arguments @('-c', 'credential.helper=', '-c', "credential.helper=$taskHelper", 'push', '--atomic', '-u', 'origin', 'main', 'refs/tags/final')
    $taskRefs = @(Invoke-TaskGit -Arguments @('-c', 'credential.helper=', '-c', "credential.helper=$taskHelper", 'ls-remote', 'origin', 'refs/heads/main', 'refs/tags/final^{}'))
    foreach ($taskRef in @('refs/heads/main', 'refs/tags/final^{}')) {
        if (-not ($taskRefs | Where-Object { $_ -eq "$taskHead`t$taskRef" })) { throw "Remote verification failed: $taskRef" }
    }
    Write-Output "Verified private repository: https://github.com/$taskRepository"
    Write-Output "Verified main and final: $taskHead"
} finally {
    Set-Location -LiteralPath $taskPreviousDirectory
}
