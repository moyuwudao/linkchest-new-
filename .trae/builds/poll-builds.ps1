# APK Build Polling Monitor (ASCII only, no encoding issues)
# Checks both APK build logs, detects BUILD SUCCESS/FAILED/anomalies

$LogGlobal = "D:\trae_projects\linkchest\.trae\builds\wsl-global-retry.log"
$LogChina  = "D:\trae_projects\linkchest\.trae\builds\wsl-cn-build.log"
$LastGlobalStatus = "running"

function Read-TailStatus {
    param([string]$Path, [int]$N = 50)
    if (Test-Path $Path) {
        $lines = Get-Content $Path -Tail $N -ErrorAction SilentlyContinue
        $content = $lines -join "`n"
        if ($content -match "BUILD SUCCESSFUL") { return "SUCCESS" }
        if ($content -match "BUILD FAILED") { return "FAILED" }
        return "running"
    }
    return "no-log"
}

function Check-Errors {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return @() }
    $content = Get-Content $Path -Raw -ErrorAction SilentlyContinue
    $errors = @()
    if ($content -match "configure_fingerprint\.bin.*No such file") { $errors += "CMake parallel fingerprint lost" }
    if ($content -match "Java heap space|OutOfMemoryError") { $errors += "JVM heap OOM" }
    if ($content -match "ENOENT.*gradle-") { $errors += "Gradle dependency download failed" }
    if ($content -match "EBUSY|resource busy|locked") { $errors += "Windows file lock" }
    if ($content -match "Permission denied") { $errors += "Permission denied" }
    if ($content -match "Could not resolve|DependencyResolutionException") { $errors += "Dependency resolution failed" }
    return $errors
}

function Show-Notification {
    param([string]$Title, [string]$Message)
    try {
        [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
        $notify = New-Object System.Windows.Forms.NotifyIcon
        $notify.Icon = [System.Drawing.SystemIcons]::Information
        $notify.Visible = $true
        $notify.ShowBalloonTip(10000, $Title, $Message, [System.Windows.Forms.ToolTipIcon]::Warning)
    } catch {}
}

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Polling started. Global=$LogGlobal" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""

$pollCount = 0
$maxPolls = 60

while ($pollCount -lt $maxPolls) {
    $pollCount++
    $now = Get-Date -Format "HH:mm:ss"

    $gStatus = Read-TailStatus $LogGlobal
    $gSize = if (Test-Path $LogGlobal) { (Get-Item $LogGlobal).Length } else { 0 }
    $gErrors = Check-Errors $LogGlobal

    Write-Host "[$now] [GLOBAL] status=$gStatus size=$([math]::Round($gSize/1KB,1))KB errors=$($gErrors -join ',')"

    if ($gStatus -ne $LastGlobalStatus) {
        $LastGlobalStatus = $gStatus
        if ($gStatus -eq "SUCCESS") {
            Write-Host "[$now] GLOBAL BUILD SUCCESS" -ForegroundColor Green
            Show-Notification "Overseas APK build SUCCESS" "linkchest-global APK is ready"
        } elseif ($gStatus -eq "FAILED") {
            Write-Host "[$now] GLOBAL BUILD FAILED" -ForegroundColor Red
            Show-Notification "Overseas build FAILED" "Check log: $LogGlobal"
        }
    }

    if ($gErrors.Count -gt 0) {
        Write-Host "  WARN: Global errors: $($gErrors -join ', ')" -ForegroundColor Yellow
    }

    if ($gStatus -eq "SUCCESS" -or $gStatus -eq "FAILED") {
        Write-Host ""
        Write-Host "[$now] Global build finished." -ForegroundColor Cyan
        break
    }

    Start-Sleep -Seconds 30
}

if ($pollCount -ge $maxPolls) {
    Write-Host "[$now] Polling timeout (30 min)." -ForegroundColor Yellow
}
