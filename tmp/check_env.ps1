$ErrorActionPreference = 'Continue'
$envFile = '/opt/linkchest/api/project/apps/api/.env'
$outFile = 'D:\trae_projects\linkchest\tmp\sandbox_pubkey_check.txt'

$cmd = "grep -n ALIPAY_SANDBOX `$envFile 2>/dev/null; echo '---DIVIDER---'; wc -l `$envFile 2>/dev/null"
$remoteOut = ssh ubuntu@43.157.240.68 $cmd 2>&1

$remoteOut | Out-File -FilePath $outFile -Encoding utf8

Write-Host "=== REMOTE OUTPUT (first 50 lines) ==="
$remoteOut | Select-Object -First 50 | ForEach-Object { Write-Host $_ }
Write-Host "=== END ==="
