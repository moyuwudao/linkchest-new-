# LinkChest Deploy Script (PowerShell)
# Usage: Copy .env.deploy.example to .env.deploy and fill in config, then run:
#   .\deploy-server.ps1
# Or set env vars first:
#   $env:DEPLOY_SERVER_IP="your-ip"; $env:DEPLOY_SSH_USER="ubuntu"; $env:DEPLOY_SSH_PASSWORD="password"; .\deploy-server.ps1

$ErrorActionPreference = 'Continue'

# ========== Load Config ==========
$envFile = Join-Path $PSScriptRoot '.env.deploy'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#\s=]+)\s*=\s*(.*?)\s*$') {
            $name = $matches[1]
            $value = $matches[2]
            if (-not [Environment]::GetEnvironmentVariable($name)) {
                [Environment]::SetEnvironmentVariable($name, $value, 'Process')
            }
        }
    }
}

$serverIp = $env:DEPLOY_SERVER_IP
$sshUser  = $env:DEPLOY_SSH_USER
$sshPass  = $env:DEPLOY_SSH_PASSWORD
$sshKey   = $env:DEPLOY_SSH_KEY

# Defaults
if (-not $sshUser) { $sshUser = 'ubuntu' }
if (-not $sshKey)  { $sshKey = Join-Path $env:USERPROFILE '.ssh\id_rsa' }

# Check required config
$missing = @()
if (-not $serverIp) { $missing += 'DEPLOY_SERVER_IP' }
if (-not $sshPass -and -not (Test-Path $sshKey)) { $missing += 'DEPLOY_SSH_PASSWORD (or valid DEPLOY_SSH_KEY)' }
if ($missing.Count -gt 0) {
    Write-Host ('[ERROR] Missing config: ' + ($missing -join ', ')) -ForegroundColor Red
    Write-Host ''
    Write-Host 'Solution (pick one):' -ForegroundColor Yellow
    Write-Host '  1. Create .env.deploy file in project root:' -ForegroundColor Cyan
    Write-Host '     DEPLOY_SERVER_IP=your-server-ip'
    Write-Host '     DEPLOY_SSH_USER=ubuntu'
    Write-Host '     DEPLOY_SSH_PASSWORD=your-ssh-password'
    Write-Host ''
    Write-Host '  2. Set env vars in PowerShell then run:' -ForegroundColor Cyan
    Write-Host '     $env:DEPLOY_SERVER_IP="your-ip"'
    Write-Host '     $env:DEPLOY_SSH_USER="ubuntu"'
    Write-Host '     $env:DEPLOY_SSH_PASSWORD="your-password"'
    Write-Host '     .\deploy-server.ps1'
    Write-Host ''
    exit 1
}

$sep = '=' * 42
Write-Host $sep -ForegroundColor Cyan
Write-Host '  LinkChest Deploy' -ForegroundColor Cyan
Write-Host $sep -ForegroundColor Cyan
Write-Host ''
Write-Host 'Server : ' -NoNewline; Write-Host $serverIp
Write-Host 'User   : ' -NoNewline; Write-Host $sshUser
Write-Host ''

# SSH/SCP prefix
$sshPrefix = 'ssh'
$scpPrefix = 'scp'
if ($sshPass) {
    $sshpassCmd = Get-Command sshpass -ErrorAction SilentlyContinue
    if ($sshpassCmd) {
        $sshPrefix = 'sshpass -p ' + $sshPass + ' ssh'
        $scpPrefix = 'sshpass -p ' + $sshPass + ' scp'
    } else {
        Write-Host '[INFO] sshpass not found, will use interactive password input' -ForegroundColor Yellow
        Write-Host '       Tip: setup SSH key auth or set DEPLOY_SSH_KEY' -ForegroundColor Yellow
        Write-Host ''
    }
} elseif (Test-Path $sshKey) {
    $sshPrefix = 'ssh -i ' + $sshKey
    $scpPrefix = 'scp -i ' + $sshKey
}

Set-Location $PSScriptRoot

# ========== Step 1: Git Commit ==========
Write-Host '[1/3] Git commit...' -ForegroundColor Yellow
$commitMsg = 'update: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm')
git add -A | Out-Null
$hasChanges = (git status --porcelain) -join ''
if ($hasChanges) {
    git commit -m $commitMsg | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host '      Committed' -ForegroundColor Green
    } else {
        Write-Host '      Commit failed' -ForegroundColor Red
    }
} else {
    Write-Host '      No changes' -ForegroundColor DarkGray
}
Write-Host ''

# ========== Step 2: Git Push ==========
Write-Host '[2/3] Git push...' -ForegroundColor Yellow
$pushResult = git push origin master 2>&1
$pushExit = $LASTEXITCODE
if ($pushExit -ne 0) {
    Write-Host '      Push failed, retrying...' -ForegroundColor Yellow
    $pushResult = git push origin master 2>&1
    $pushExit = $LASTEXITCODE
    if ($pushExit -ne 0) {
        Write-Host '      Push still failed, check network or SSH key' -ForegroundColor Red
        exit 1
    }
}
Write-Host '      Pushed OK' -ForegroundColor Green
Write-Host ''

# ========== Step 3: Remote Deploy ==========
Write-Host '[3/3] SSH deploy to server...' -ForegroundColor Yellow

# Step 3a: rsync local code to server
Write-Host '      Syncing code to server...' -ForegroundColor DarkGray
$sshTarget = $sshUser + '@' + $serverIp
$rsyncLocalPath = ($PSScriptRoot -replace '\\', '/') + '/'
$rsyncCmd = 'rsync -avzc --delete --exclude node_modules --exclude .next --exclude .git --exclude .env.deploy --exclude .env --exclude "apps/api/.env" --exclude "apps/web/.env.local" --exclude "apps/web/.env.production" "'
$rsyncCmd = $rsyncCmd + $rsyncLocalPath + '" "' + $sshTarget + ':/opt/linkchest/api/"'
Write-Host ('      CMD: ' + $rsyncCmd) -ForegroundColor DarkGray
$rsyncOutput = Invoke-Expression $rsyncCmd 2>&1
$rsyncExit = $LASTEXITCODE
$rsyncOutput | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
Write-Host ('      rsync exit code: ' + $rsyncExit) -ForegroundColor DarkGray
if ($rsyncExit -ne 0) {
    # Fallback to scp if rsync not available
    Write-Host '      rsync failed (exit ' + $rsyncExit + '), trying scp...' -ForegroundColor Yellow
    $scpCmd2 = $scpPrefix + ' -r "' + $PSScriptRoot + '/*" "' + $sshTarget + ':/opt/linkchest/api/"'
    $scpOutput = Invoke-Expression $scpCmd2 2>&1
    $scpExit = $LASTEXITCODE
    $scpOutput | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
    if ($scpExit -ne 0) {
        Write-Host '      scp also failed (exit ' + $scpExit + '), aborting deploy.' -ForegroundColor Red
        exit 1
    }
}

# Build remote script (use single-quoted here-string to avoid PowerShell parsing bash code)
$remoteScript = @'
#!/bin/bash
set -e

echo "[Remote] Cleaning old processes..."
sudo pkill -9 -u root -f 'pm2' 2>/dev/null || true
sudo rm -rf /root/.pm2 2>/dev/null || true
pm2 kill 2>/dev/null || true
sudo fuser -k 3001/tcp 2>/dev/null || true
sudo fuser -k 3003/tcp 2>/dev/null || true
sleep 2

echo "[Remote] Setting permissions..."
cd /opt/linkchest/api
sudo chown -R ubuntu:ubuntu /opt/linkchest/api

echo "[Remote] Git pull fallback..."
cd /opt/linkchest/api
if [ -d .git ]; then git stash; git pull origin master; fi

echo "[Remote] Installing deps..."
npm install

echo "[Remote] Building workspace packages..."
cd packages/i18n && npm run build && cd ../..

echo "[Remote] Generating Prisma Client..."
cd apps/api
npm run db:generate

echo "[Remote] Running database migration..."
npx prisma migrate deploy
echo "[Remote] Syncing schema (db push fallback)..."
npx prisma db push --skip-generate --accept-data-loss
cd ../..

echo "[Remote] Building Web..."
cd apps/web
if [ ! -f .env.production ]; then
    echo NEXT_PUBLIC_API_URL=/api > .env.production
    echo "Web .env.production created"
fi
# Fix: clean and reinstall node_modules to avoid module resolution issues
rm -rf node_modules
npm install
npm run build
cd /opt/linkchest/api

echo "[Remote] Re-installing deps to fix patched lockfile..."
npm install

echo "[Remote] Verifying .next build output..."
if [ ! -d apps/web/.next ]; then
    echo "ERROR: apps/web/.next directory not found after build!"
    exit 1
fi
echo "  .next exists: $(du -sh apps/web/.next | cut -f1)"

echo "[Remote] Updating Nginx..."
sudo cp deploy/nginx/linkchest.conf /etc/nginx/sites-enabled/linkchest
sudo nginx -t && sudo nginx -s reload

echo "[Remote] Fixing line endings..."
dos2unix deploy/start-api.sh deploy/start-web.sh 2>/dev/null || true
sed -i 's/\r$//' deploy/start-api.sh deploy/start-web.sh
chmod +x deploy/start-api.sh deploy/start-web.sh

echo "[Remote] Starting services (PM2)..."
pm2 delete linkchest-api linkchest-web 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save
sleep 5
pm2 status

echo "[Remote] Health check..."
sleep 3
API_HEALTH=$(curl -s http://localhost:3001/health || true)
echo "API: $API_HEALTH"
WEB_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003 || true)
echo "Web: HTTP $WEB_HTTP"

# 如果 Web 启动失败，打印日志以便诊断
if [ "$WEB_HTTP" != "200" ]; then
    echo "========================================"
    echo "[Remote] WEB STARTUP FAILED - Dumping logs:"
    echo "========================================"
    echo "--- PM2 error log ---"
    cat /home/ubuntu/.pm2/logs/linkchest-web-error.log 2>/dev/null | tail -50 || true
    echo "--- PM2 out log ---"
    cat /home/ubuntu/.pm2/logs/linkchest-web-out.log 2>/dev/null | tail -50 || true
    echo "========================================"
    exit 1
fi

echo "[Remote] Deploy done!"
'@

$tmpLocal = Join-Path $env:TEMP ('deploy-linkchest-' + (Get-Random) + '.sh')
$tmpRemote = '/tmp/deploy-linkchest-' + (Get-Random) + '.sh'
# Convert CRLF to LF for Linux compatibility
$fixedScript = $remoteScript -replace "`r`n", "`n"
[System.IO.File]::WriteAllText($tmpLocal, $fixedScript, (New-Object System.Text.UTF8Encoding $false))

# Upload script
Write-Host '      Uploading deploy script...' -ForegroundColor DarkGray
$scpTarget = $sshUser + '@' + $serverIp + ':' + $tmpRemote
$scpCmd = $scpPrefix + ' "' + $tmpLocal + '" "' + $scpTarget + '"'
Invoke-Expression $scpCmd 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host '      SCP upload failed, check SSH connection' -ForegroundColor Red
    Remove-Item $tmpLocal -ErrorAction SilentlyContinue
    exit 1
}

# Execute remote script
Write-Host '      Running remote deploy...' -ForegroundColor DarkGray
$sshTarget = $sshUser + '@' + $serverIp
$remoteCmd = 'chmod +x ' + $tmpRemote + ' && bash ' + $tmpRemote + '; rm -f ' + $tmpRemote
$sshCmd = $sshPrefix + ' -t ' + $sshTarget + ' "' + $remoteCmd + '"'
Invoke-Expression $sshCmd

# Cleanup
Remove-Item $tmpLocal -ErrorAction SilentlyContinue

Write-Host ''
Write-Host $sep -ForegroundColor Green
Write-Host '  Deploy Complete!' -ForegroundColor Green
Write-Host ('  API:  http://' + $serverIp + ':3001')
Write-Host ('  Web:  http://' + $serverIp + ':3003')
Write-Host '  Domain: https://linkchest.net (run setup-domain.sh first)'
Write-Host $sep -ForegroundColor Green
Write-Host ''
