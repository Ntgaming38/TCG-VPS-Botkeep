# TCG Manager self-host - Oracle VPS Always Free
# Đã bóc Manus OAuth/Forge để chạy free, giữ nguyên JWT session.

## 1. Yêu cầu
- Oracle VPS Ubuntu 22.04 ARM (Ampere free), mở port 80/443/3000
- DB MySQL free: TiDB Serverless (khuyên dùng) hoặc MySQL trong VPS
- Node 20 + pnpm + pm2 + nginx + certbot

## 2. Cài trên VPS
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pnpm pm2

git clone <repo-da-boc> tcg && cd tcg
cp .env.example .env
# sửa .env: DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, CRON_SECRET
# Google OAuth (tùy chọn): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
# GOOGLE_REDIRECT_URI=https://<domain>/api/auth/google/callback
# Gmail SMTP (xác nhận email/reset mật khẩu): SMTP_USER, SMTP_PASS (Google App Password)
# SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_SECURE=true; SMTP_FROM mặc định là SMTP_USER
# EMAIL_CODE_SECRET tùy chọn; mặc định dùng JWT_SECRET
pnpm install
pnpm db:push
pnpm build
pm2 start dist/index.js --name tcg
pm2 save && pm2 startup

## 3. Nginx
server {
  listen 80;
  server_name <domain-hoac-ip>;
  client_max_body_size 50m;
  location /uploads/ { alias /home/ubuntu/tcg/dist/public/uploads/; }
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
sudo certbot --nginx -d <domain>

## 4. Truy cập Kho
Mở https://<domain>/login -> nhập ADMIN_EMAIL/ADMIN_PASSWORD
-> tự chuyển tới /kho-hang (Inventory.tsx).

## 5. Cron thay Manus (tùy chọn)
curl -X POST https://<domain>/api/scheduled/marketplace-auto-sync -H "x-cron-secret: $CRON_SECRET"
Thêm crontab mỗi giờ cho 3 job: chyusen-monitor, marketplace-auto-sync, snkr-shop-auto-sync.

## File đã sửa cho self-host
- server/_core/env.ts: thêm ADMIN_*, CRON_SECRET, STORAGE_DIR
- server/_core/localAuth.ts (mới): POST /api/auth/login
- server/_core/sdk.ts: bỏ sync OAuth khi không có OAUTH_SERVER_URL
- server/storage.ts: local disk /uploads khi không có Forge
- server/_core/index.ts: serve /uploads, cron bằng x-cron-secret
- client/src/const.ts: startLogin -> /login
- client/src/pages/Login.tsx (mới) + App.tsx route /login
- vite.config.ts: gỡ vite-plugin-manus-runtime

## 6. Đồng bộ DB an toàn khi VPS lỗi migration
Nếu `pnpm db:push` báo lỗi "duplicate index" / thiếu bảng / thiếu cột:
**KHÔNG dùng `npx drizzle-kit push`** — nó là interactive và có thể DROP/TRUNCATE dữ liệu.

Dùng script an toàn (chỉ BỔ SUNG, không xóa gì, chạy lại được nhiều lần):

```bash
node scripts/db-sync.cjs --check    # xem trước, không sửa gì
node scripts/db-sync.cjs --journal  # đồng bộ journal + tạo bảng/index/enum còn thiếu
pnpm db:push                        # từ lần sau chạy bình thường (migrations cũ đã được ghi nhận)
pnpm build && pm2 restart all
```

Lưu ý:
- Mật khẩu cũ trong `users.passwordHash` (nếu có) được sao chép sang `auth_credentials` trước khi bỏ qua.
- Unique constraint chỉ được tạo khi chắc chắn không có dữ liệu trùng lặp; nếu trùng → script báo `[FAIL]` và không đụng gì.
- Cột/bảng legacy (googleId, passwordHash, marketUrl, ai_chat_messages...) được GIỮ NGUYÊN — không ảnh hưởng app.

