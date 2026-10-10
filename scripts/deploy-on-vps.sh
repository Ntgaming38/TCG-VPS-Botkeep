#!/usr/bin/env bash
# Chay TRUC TIEP tren VPS (da SSH vao root@vps-gen).
# Tu dong: pull code moi -> install -> sync DB an toan -> build -> restart pm2 -> cai cron auto-backup -> kiem tra.
set -u
APP_DIR="/root/apps/tcg-manager-fresh"
BRANCH="main"

echo "== [1/6] Vao thu muc app =="
cd "$APP_DIR" || { echo "KHONG thay $APP_DIR"; exit 1; }
pwd
git remote -v | head -2
git log --oneline -3

echo "== [2/6] Pull code moi tu GitHub =="
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
git log --oneline -3

echo "== [3/6] Cai dependencies + dong bo DB =="
pnpm install
if [ -f scripts/db-sync.cjs ]; then
  node scripts/db-sync.cjs --journal
else
  echo "Khong thay scripts/db-sync.cjs, chay pnpm db:push"
  pnpm db:push
fi

echo "== [4/6] Build + restart pm2 =="
pnpm build
pm2 list
if pm2 describe tcg >/dev/null 2>&1; then
  pm2 restart tcg
else
  echo "Chua co process 'tcg' -> start moi"
  pm2 start dist/index.js --name tcg
fi
pm2 save
pm2 status

echo "== [5/6] Kiem tra app =="
sleep 3
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 http://127.0.0.1:3000/ || echo "FAIL")
echo "HTTP 127.0.0.1:3000/ -> $CODE"

echo "== [6/6] Cai cron auto-backup (moi 30 phut) =="
SECRET=$(grep -E '^CRON_SECRET=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r' | xargs || true)
if [ -z "$SECRET" ] || [ "$SECRET" = "change-me-cron-secret" ]; then
  echo "CANH BAO: CRON_SECRET chua cau hinh trong .env - doi CRON_SECRET roi chay lai buoc 6."
else
  LINE="*/30 * * * * curl -s -X POST http://127.0.0.1:3000/api/scheduled/auto-backup -H \"x-cron-secret: $SECRET\" >> \$HOME/tcg-auto-backup.log 2>&1"
  (crontab -l 2>/dev/null | grep -v "api/scheduled/auto-backup" || true; echo "$LINE") | crontab -
  crontab -l | grep "api/scheduled/auto-backup"
  echo "Test endpoint cron ngay:"
  curl -s -X POST http://127.0.0.1:3000/api/scheduled/auto-backup -H "x-cron-secret: $SECRET"; echo
fi

echo ""
echo "XONG. Gui lai cho toi output cua: git log, pm2 status, ma HTTP, va ket qua test endpoint."
