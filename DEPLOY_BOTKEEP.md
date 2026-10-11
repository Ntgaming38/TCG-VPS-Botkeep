# TCG Manager self-host - Botkeep.cloud (PaaS, KHÔNG phải VPS truyền thống)

> ⚠️ **Lưu ý quan trọng:** Botkeep.cloud **không phải VPS** (không có SSH, root, nginx, pm2, cron).
> Nó là nền tảng **PaaS** giống Render/Heroku: bạn deploy từ **GitHub** hoặc **ZIP**, đặt một
> **start command**, và cấu hình **Environment Variables** trong web panel.
> Vì vậy các script `scripts/deploy-vps.ps1` / `scripts/deploy-on-vps.sh` (viết cho Oracle VPS)
> **KHÔNG áp dụng được** ở đây.

Đã kiểm tra thực tế (11/10/2026):
- `pnpm build` → OK (`dist/index.js` ~377KB + client `dist/public/`).
- `NODE_ENV=production node dist/index.js` → server bind port 3000, trả về **HTTP 200** với
  title "Pokémon Trading Manager". => **App CHẠY ĐƯỢC**, chỉ là mô hình deploy khác.

---

## 0. Hiểu nhanh về Botkeep (để khỏi mất công)
- **Không có port public / không có root.** Một process duy nhất, start command không tương tác.
- **Env/secrets** đặt trong panel (không commit `.env`).
- **Giới hạn tài nguyên free rất thấp (dùng chung 1 tài khoản):**
  - Founder Free: **2GB RAM, 1.5 vCore, 2GB storage** (chia sẻ giữa các workload).
  - Free thường: **1GB RAM, 1 vCore, 1GB storage**.
- App này khá nặng: `node_modules` ~**494MB**, dùng **sharp** (xử lý ảnh), React+tRPC+MySQL.
  => Free tier **rất dễ vượt giới hạn storage/RAM**. Nên cân nhắc **gói trả phí** hoặc deploy
  chỉ để *thử* (proof-of-concept).
- **Không có cron:** các job định kỳ (auto-backup, chyusen-monitor, marketplace-auto-sync,
  snkr-shop-auto-sync, trash-cleanup, activity-log-cleanup) sẽ **không tự chạy**. Muốn chạy thì
  gọi HTTP thủ công hoặc dùng cron bên ngoài (vd cron-job.org) gọi các endpoint `/api/scheduled/*`
  kèm header `x-cron-secret`.
- **Uploads/ảnh lưu trên đĩa local** (`STORAGE_DIR`). Trên PaaS đĩa có thể **bị xoá khi restart**
  trừ khi dùng persistent volume của Botkeep => ảnh upload có thể **không bền vững**.

---

## 1. Database (khuyến nghị: giữ nguyên DB đang chạy)
App **không tự migrate khi khởi động** — schema phải tồn tại sẵn trong DB.

- **Cách dễ nhất (khuyến nghị):** dùng lại **TiDB Cloud** đang chạy trong `.env` hiện tại
  (`mysql://...@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test`).
  Schema đã có sẵn → chỉ cần set `DATABASE_URL` trong panel, **không cần migrate gì**.
- Nếu muốn tạo **MySQL/MariaDB trên Botkeep** (chiếm 1 workload slot): phải nạp schema trước.
  Không có SSH/cron nên hãy chạy `pnpm db:push` **ở máy local** trỏ vào DB Botkeep (nếu Botkeep
  cho kết nối ngoài), hoặc import schema qua công cụ của Botkeep. Phức tạp hơn nhiều.


---

## 2. Chuẩn bị mã nguồn

### Vấn đề cần biết: pnpm vs npm
Repo dùng **pnpm** (có `pnpm-lock.yaml` + `patchedDependencies` cho `wouter`). Tài liệu Botkeep
chỉ nhắc **npm** (`npm start`, `package-lock.json`), repo **chưa có `package-lock.json`**.

- Patch `wouter` chỉ thêm `window.__WOUTER_ROUTES__` (debug) → **không ảnh hưởng** chức năng
  chính, mất patch vẫn chạy tốt.
- Dev dependencies (`vite`, `esbuild`, `typescript`...) làm phình `node_modules`. Nếu Botkeep cài
  cả dev deps thì càng dễ vượt ngưỡng storage. Tốt nhất là **deploy bản đã build sẵn** (Cách A).

### Cách A — ZIP có sẵn `dist/` (khuyên dùng, chắc chạy nhất)
Vì `dist/` đang bị `.gitignore`, build local rồi đóng gói tay:

```powershell
# Trên máy Windows local, trong thư mục dự án:
$env:NODE_ENV="production"
pnpm build            # tạo dist/index.js + dist/public/

# Tạo ZIP sạch để upload (chỉ giữ phần cần cho runtime + dist đã build):
$tmp = "botkeep-upload"
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tmp | Out-Null
Copy-Item package.json, pnpm-lock.yaml, dist, server, shared, drizzle -Destination $tmp -Recurse
Compress-Archive -Path "$tmp\*" -DestinationPath tcg-botkeep.zip -Force
Remove-Item $tmp -Recurse -Force
```

- **KHÔNG** đưa vào ZIP: `.env`, `node_modules/`, `.git/`, `client/` (client đã build vào `dist/public/`).
- Trên panel Botkeep: chọn **ZIP**, runtime **Node.js**, **Start command**:
  ```
  node dist/index.js
  ```
- Botkeep sẽ tự `npm install` (lấy prod deps) rồi chạy start command.

### Cách B — Deploy từ GitHub
- Kết nối repo `Ntgaming38/TCG-Manager_VPS`, nhánh `main`.
- Vì `start` script là `node dist/index.js` (cần `dist/` đã build), phải đảm bảo Botkeep **có chạy
  bước build**. Nếu panel cho đặt **Build command**, đặt:
  ```
  pnpm install && pnpm build
  ```
  còn **Start command**: `node dist/index.js`. (Nếu panel chỉ có 1 start command → dùng Cách A.)
- Nếu Botkeep không hỗ trợ pnpm, tạo `package-lock.json` (`npm install --package-lock-only` ở local)
  để `npm install` chạy được; patch `wouter` sẽ mất (không sao).


---

## 3. Environment Variables (đặt trong Botkeep panel, KHÔNG commit)
Copy các key từ `.env` (thay giá trị thật của bạn):

```
NODE_ENV=production
DATABASE_URL=mysql://<user>:<pass>@<host>:4000/<db>?ssl=%7B%22rejectUnauthorized%22%3Atrue%7D
JWT_SECRET=<chuoi-ngau-nhien-dai>
ADMIN_EMAIL=admin@local
ADMIN_PASSWORD=<mat-khau-admin>
ADMIN_OPENID=local-admin
CRON_SECRET=<chuoi-bi-mat>
STORAGE_DIR=./dist/public/uploads
# Gmail SMTP (nếu cần gửi mail xác thực / khôi phục mật khẩu)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<gmail>
SMTP_PASS=<google-app-password>
SMTP_FROM="TCG Manager <no-reply@example.com>"
EMAIL_CODE_SECRET=<chuoi-ngau-nhien-dai>
# Google OAuth (nhớ đổi redirect URI sang domain Botkeep trong Google Cloud Console)
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
GOOGLE_REDIRECT_URI=https://<domain-botkeep>/api/auth/google/callback
```

- Server **tự đọc** env qua `dotenv/config`; trên Botkeep biến đến trực tiếp từ panel (không cần `.env`).
- **Google login:** redirect URI hiện tại trỏ tới Render (`tcg-manager-pnyu.onrender.com`). Nếu dùng
  domain Botkeep, **phải sửa** cả trong Google Cloud Console (Authorized redirect URIs) và trong
  panel, nếu không Google login sẽ lỗi. (Đăng nhập email+mật khẩu local vẫn chạy bình thường.)

---

## 4. Kiểm tra sau khi deploy
- Panel Botkeep → tab **Console**: phải thấy `Server running on http://localhost:3000/`.
- Mở domain Botkeep → phải thấy trang login, title "Pokémon Trading Manager".
- Đăng nhập bằng `ADMIN_EMAIL` / `ADMIN_PASSWORD` → app tự chuyển sang `/thong-ke`
  (trang Thống kê). Từ menu trái vào `/kho-hang` (Kho Hàng) và các mục khác.
- Nếu crash do thiếu RAM: tăng phân bổ RAM cho workload trong panel (bộ nhớ dùng chung).

---

## 5. Tóm tắt khác biệt so với Oracle VPS
| Hạng mục | Oracle VPS (cũ) | Botkeep.cloud |
|---|---|---|
| Truy cập | SSH + root | Chỉ web panel |
| Web server | nginx | Botkeep quản lý |
| Process | pm2 | 1 process, start command |
| Cron | crontab | Không có (gọi HTTP ngoài) |
| Storage ảnh | Đĩa VPS bền vững | Có thể mất khi restart |
| Ngưỡng free | ~1GB ARM | 1–2GB RAM, 1–2GB storage (rất thấp) |
| Script cũ | `deploy-vps.ps1` | **Không dùng được** — dùng ZIP/GitHub + panel |

**Kết luận:** App **chạy được** trên Botkeep, nhưng giới hạn free tier thấp (1–2GB storage/RAM,
app ~494MB node_modules + sharp) nên khả năng cao cần **gói trả phí** hoặc deploy để *thử*.
Nên **giữ DB TiDB Cloud sẵn có** để tránh phải migrate schema.
