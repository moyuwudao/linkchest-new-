# LinkChest Deploy via PuTTY plink (non-interactive password)
$ErrorActionPreference = 'Continue'

$serverIp = '43.133.44.232'
$sshUser  = 'ubuntu'
$sshPass  = 'hu123456!'
$plink    = 'C:\Program Files\PuTTY\plink.exe'

$sep = '=' * 42
Write-Host $sep -ForegroundColor Cyan
Write-Host '  LinkChest Deploy (plink)' -ForegroundColor Cyan
Write-Host $sep -ForegroundColor Cyan
Write-Host ''

# ========== Step 1: Git Commit ==========
Write-Host '[1/3] Git commit...' -ForegroundColor Yellow
Set-Location $PSScriptRoot
git add -A | Out-Null
$hasChanges = (git status --porcelain) -join ''
if ($hasChanges) {
    $commitMsg = 'update: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm')
    git commit -m $commitMsg | Out-Null
    Write-Host '      Committed' -ForegroundColor Green
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
        Write-Host '      Push still failed' -ForegroundColor Red
        exit 1
    }
}
Write-Host '      Pushed OK' -ForegroundColor Green
Write-Host ''

# ========== Step 3: Remote Deploy ==========
Write-Host '[3/3] Remote deploy via plink...' -ForegroundColor Yellow

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

echo "[Remote] Git pull..."
cd /opt/linkchest/api
git stash
git pull origin master

echo "[Remote] Installing deps..."
npm install

echo "[Remote] Generating icons..."
node scripts/generate-icons.js
node scripts/sync-icons.js

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
npm run build
cd /opt/linkchest/api

echo "[Remote] Re-installing deps to fix patched lockfile..."
npm install

echo "[Remote] Verifying .next build output..."
if [ ! -d apps/web/.next ]; then
    echo "ERROR: apps/web/.next directory not found after build!"
    exit 1
fi
echo "  .next exists: `du -sh apps/web/.next | cut -f1`"

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
API_HEALTH=`curl -s http://localhost:3001/health || true`
echo "API: $API_HEALTH"
WEB_HTTP=`curl -s -o /dev/null -w "%{http_code}" http://localhost:3003 || true`
echo "Web: HTTP $WEB_HTTP"

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
[System.IO.File]::WriteAllText($tmpLocal, $remoteScript, (New-Object System.Text.UTF8Encoding $false))

Write-Host '      Uploading deploy script...' -ForegroundColor DarkGray
& $plink -scp -pw $sshPass $tmpLocal ($sshUser + '@' + $serverIp + ':/tmp/deploy-linkchest.sh') 2>&1 | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }

Write-Host '      Running remote deploy...' -ForegroundColor DarkGray
& $plink -ssh -pw $sshPass ($sshUser + '@' + $serverIp) 'bash /tmp/deploy-linkchest.sh; rm -f /tmp/deploy-linkchest.sh'

Remove-Item $tmpLocal -ErrorAction SilentlyContinue

Write-Host ''
Write-Host $sep -ForegroundColor Green
Write-Host '  Deploy Complete!' -ForegroundColor Green
Write-Host ('  API:  http://' + $serverIp + ':3001')
Write-Host ('  Web:  http://' + $serverIp + ':3003')
Write-Host $sep -ForegroundColor Green
Write-Host ''
