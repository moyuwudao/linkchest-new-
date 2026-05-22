param (
    [string]$Target = "all"
)

$GLOBAL_SERVERS = @("linkchest-global")
$CHINA_SERVERS = @("linkchest-cn-app", "linkchest-cn-db")

function Test-Server {
    param([string[]]$Servers)
    foreach ($server in $Servers) {
        Write-Host "=====================================" -ForegroundColor Cyan
        Write-Host "正在检查服务器: $server" -ForegroundColor Yellow
        
        $sshArgs = @("-o", "BatchMode=yes", "-o", "ConnectTimeout=5", $server, "echo `"✅ 连接成功！当前用户：`$(whoami)`" && uptime -p")
        & ssh.exe $sshArgs
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ $server 连接失败或超时" -ForegroundColor Red
        }
        Write-Host "=====================================" -ForegroundColor Cyan
        Write-Host ""
    }
}

if ($Target -eq "global") {
    Write-Host "▶ 开始检查海外服务器..." -ForegroundColor Green
    Test-Server -Servers $GLOBAL_SERVERS
} elseif ($Target -eq "china") {
    Write-Host "▶ 开始检查国内服务器..." -ForegroundColor Green
    Test-Server -Servers $CHINA_SERVERS
} elseif ($Target -eq "all" -or $Target -eq "") {
    Write-Host "▶ 开始检查所有服务器..." -ForegroundColor Green
    Test-Server -Servers ($GLOBAL_SERVERS + $CHINA_SERVERS)
} else {
    Write-Host "未知参数: $Target" -ForegroundColor Red
    Write-Host "用法: .\deploy\check-servers.ps1 [global|china]"
}
