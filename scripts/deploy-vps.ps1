<#Requires -Version 5.1
<#
.SYNOPSIS
  Deploy TCG Manager len Oracle VPS qua SSH (chay tren may Windows local).

.DESCRIPTION
  1. Kiem tra git local sach + da push len origin/main.
  2. SSH vao VPS: git pull, pnpm install, dong bo DB an toan,
     build, restart pm2.
  3. Cai cron auto-backup (goi http://127.0.0.1:3000/api/scheduled/auto-backup
     moi 30 phut, dung CRON_SECRET doc tu .env tren VPS).
  4. Kiem tra suc khoe app sau deploy.

.EXAMPLE
  .\scripts\deploy-vps.ps1 -VpsHost 152.67.10.20
  .\scripts\deploy-vps.ps1 -VpsHost tcg.example.com -VpsUser ubuntu -KeyPath "$env:USERPROFILE\.ssh\oracle.key" -AppDir /home/ubuntu/tcg
  .\scripts\deploy-vps.ps1 -VpsHost 152.67.10.20 -SkipCron   # bo qua cai cron
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$VpsHost,
  [string]$VpsUser = "ubuntu",
  [string]$KeyPath = (Join-Path $env:USERPROFILE ".ssh\id_rsa"),
  [string]$AppDir = "/home/ubuntu/tcg",
  [string]$Branch = "main",
  [switch]$SkipDb,
  [switch]$SkipCron
)

$ErrorActionPreference = "Stop"

function Invoke-Ssh([string]$RemoteCommand) {
  $sshArgs = @("-i", $KeyPath, "-o", "StrictHostKeyChecking=accept-new", "-o", "BatchMode=yes", "$VpsUser@$VpsHost", $RemoteCommand)
  & ssh @sshArgs
  if ($LASTEXITCODE -ne 0) { throw "SSH len $VpsUser@$VpsHost that bai (exit $LASTEXITCODE)." }
}

Write-Host "== [1/5] Kiem tra git local ==" -ForegroundColor Cyan
$dirty = git status --porcelain
if ($dirty) { throw "Git local con thay doi chua commit:`n$dirty" }
git fetch origin $Branch 2>$null
$local = git rev-parse HEAD
$remote = git rev-parse "origin/$Branch"
if ($local -ne $remote) { throw "Local ($($local.Substring(0,7))) chua dong bo voi origin/$Branch ($($remote.Substring(0,7))). Hay push truoc." }
Write-Host "OK: local da push ($($local.Substring(0,7)))." -ForegroundColor Green

Write-Host "== [2/5] Kiem tra ket noi SSH ==" -ForegroundColor Cyan
Invoke-Ssh "echo connected; test -d $AppDir || (echo 'KHONG thay thu muc $AppDir' && exit 1)"
Write-Host "OK: SSH + thu muc app ton tai." -ForegroundColor Green

Write-Host "== [3/5] Pull code + install + build tren VPS ==" -ForegroundColor Cyan
$dbStep = if ($SkipDb) { "echo '[skip] dong bo DB';" } else { "node scripts/db-sync.cjs --journal" }
$remoteDeploy = @"
set -e
cd $AppDir
git fetch origin
git checkout $Branch
git pull --ff-only origin $Branch
pnpm install
$dbStep
pnpm build
if pm2 describe tcg >/dev/null 2>&1; then pm2 restart tcg; else pm2 start dist/index.js --name tcg; fi
pm2 save
"@
Invoke-Ssh $remoteDeploy
Write-Host "OK: build + pm2 restart xong." -ForegroundColor Green

if (-not $SkipCron) {
  Write-Host "== [4/5] Cai cron auto-backup tren VPS ==" -ForegroundColor Cyan
  $remoteCron = @'
set -e
cd __APPDIR__
SECRET=$(grep -E '^CRON_SECRET=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r' | xargs || true)
if [ -z "$SECRET" ] || [ "$SECRET" = "change-me-cron-secret" ]; then
  echo "CANH BAO: CRON_SECRET chua duoc cau hinh trong .env - bo qua cai cron."
  exit 0
fi
LINE="*/30 * * * * curl -s -X POST http://127.0.0.1:3000/api/scheduled/auto-backup -H \"x-cron-secret: $SECRET\" >> \$HOME/tcg-auto-backup.log 2>&1"
(crontab -l 2>/dev/null | grep -v "api/scheduled/auto-backup" || true; echo "$LINE") | crontab -
echo "OK: cron auto-backup moi 30 phut."
crontab -l | grep "api/scheduled/auto-backup"
'@.Replace("__APPDIR__", $AppDir)
  Invoke-Ssh $remoteCron
} else {
  Write-Host "== [4/5] Bo qua cai cron theo yeu cau ==" -ForegroundColor Yellow
}

Write-Host "== [5/5] Kiem tra suc khoe app ==" -ForegroundColor Cyan
Invoke-Ssh "CODE=\$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 http://127.0.0.1:3000/); echo \"HTTP: \$CODE\"; test \"\$CODE\" = '200'"
Write-Host ""
Write-Host "DEPLOY THANH CONG len $VpsUser@$VpsHost ($AppDir @ $Branch)." -ForegroundColor Green
