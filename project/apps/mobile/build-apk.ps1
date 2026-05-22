# ============================================================
# APK 统一构建入口 — 双 WSL 架构
# 用法：
#   .\build-apk.ps1           # 构建两个版本（并行）
#   .\build-apk.ps1 global    # 只构建国际版
#   .\build-apk.ps1 china     # 只构建国内版
# ============================================================

param(
    [string]$Flavor = "all"
)

$ErrorActionPreference = "Stop"

$ScriptPath = "/mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh"

function Build-Flavor {
    param([string]$WslInstance, [string]$FlavorName)

    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  Starting $FlavorName build on $WslInstance" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan

    wsl -d $WslInstance -u mayn -- bash $ScriptPath $FlavorName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ $FlavorName build failed" -ForegroundColor Red
        return $false
    }
    Write-Host "✅ $FlavorName build succeeded" -ForegroundColor Green
    return $true
}

$globalOk = $true
$chinaOk = $true

if ($Flavor -eq "all") {
    # 并行构建两个版本
    Write-Host "🚀 Starting parallel build: global + china" -ForegroundColor Yellow

    $globalJob = Start-Job -ScriptBlock {
        param($ScriptPath)
        wsl -d linkchest-global -u mayn -- bash $ScriptPath global
    } -ArgumentList $ScriptPath

    $chinaJob = Start-Job -ScriptBlock {
        param($ScriptPath)
        wsl -d linkchest-cn -u mayn -- bash $ScriptPath china
    } -ArgumentList $ScriptPath

    # 等待两个构建完成
    Write-Host "Waiting for builds to complete..." -ForegroundColor Yellow

    $globalResult = Receive-Job -Job $globalJob -Wait
    $globalOk = ($globalJob.State -eq "Completed") -and ($globalJob.ChildJobs[0].JobStateInfo.Reason -eq $null)

    $chinaResult = Receive-Job -Job $chinaJob -Wait
    $chinaOk = ($chinaJob.State -eq "Completed") -and ($chinaJob.ChildJobs[0].JobStateInfo.Reason -eq $null)

    # 输出结果
    Write-Host ""
    Write-Host $globalResult
    Write-Host $chinaResult

    Remove-Job -Job $globalJob -Force
    Remove-Job -Job $chinaJob -Force
}
elseif ($Flavor -eq "global") {
    $globalOk = Build-Flavor -WslInstance "linkchest-global" -FlavorName "global"
}
elseif ($Flavor -eq "china") {
    $chinaOk = Build-Flavor -WslInstance "linkchest-cn" -FlavorName "china"
}
else {
    Write-Host "Unknown flavor: $Flavor. Use 'global', 'china', or 'all'" -ForegroundColor Red
    exit 1
}

# 汇总结果
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  BUILD SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($Flavor -ne "china") {
    Write-Host "  Global: $(if ($globalOk) { '✅ SUCCESS' } else { '❌ FAILED' })" -ForegroundColor $(if ($globalOk) { 'Green' } else { 'Red' })
}
if ($Flavor -ne "global") {
    Write-Host "  China:  $(if ($chinaOk) { '✅ SUCCESS' } else { '❌ FAILED' })" -ForegroundColor $(if ($chinaOk) { 'Green' } else { 'Red' })
}

if (-not $globalOk -or -not $chinaOk) {
    exit 1
}
