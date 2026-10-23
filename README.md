# TCG Manager

Ứng dụng web (PWA) quản lý kinh doanh mua bán thẻ bài TCG — Pokémon, One Piece,
Dragon Ball… — dành cho người bán tại Nhật Bản. Theo dõi toàn bộ quy trình:
nhập hàng → tồn kho → bán hàng → lợi nhuận, đồng bộ giá thị trường SNKRDUNK,
và quản lý đăng ký xổ số mua hàng (抽選 / Chyusen).

Giao diện tiếng Việt, đơn vị tiền tệ JPY (¥), dùng tốt trên cả PC và mobile
(cài lên màn hình chính như app nhờ PWA).

## Tính năng chính

- **Thống kê tổng quan** — tổng vốn, giá trị kho theo giá thị trường, lợi nhuận,
  biểu đồ doanh thu/lợi nhuận theo tháng, hoạt động gần đây
- **Quản lý sản phẩm** — Card / Box / Pack / Junk Pack: độ hiếm, PSA grade,
  số thẻ, ngôn ngữ, tình trạng, ảnh sản phẩm (upload, tẩy nền, chỉnh zoom)
- **Kho hàng** — lọc/tìm kiếm, đánh dấu hàng hỏng để bán riêng
- **Mua / Bán** — tính giá vốn đơn vị và lợi nhuận tự động
  (doanh thu − vốn − phí sàn − phí ship − chi phí khác)
- **Marketplace (SNKRDUNK)** — gắn link sản phẩm, đồng bộ giá thủ công/tự động,
  lịch sử biến động giá, ghi nhận và thử lại các lượt đồng bộ lỗi
- **Shop SNKR** — theo dõi danh sách sản phẩm SNKRDUNK riêng, lịch sử giá 7 ngày
- **Chyusen (抽選)** — quản lý lượt đăng ký xổ số mua hàng theo cửa hàng,
  hạn đăng ký/kết quả theo giờ Nhật, quét QR, phân tích ảnh bằng AI,
  thông báo nhắc hạn, lịch sử kết quả, thống kê theo cửa hàng
- **Báo cáo** — xuất báo cáo tháng, CSV/PDF, tuỳ chỉnh thương hiệu báo cáo
- **Thùng rác & sao lưu** — xoá mềm + khôi phục, tự dọn theo lịch,
  xuất/khôi phục toàn bộ dữ liệu, sao lưu tự động theo lịch
- **Tài khoản** — dữ liệu riêng theo từng người dùng; đăng nhập
  email + mật khẩu (hash scrypt), Google OAuth, quên mật khẩu bằng OTP
  qua Gmail, lịch sử đăng nhập, đăng xuất mọi thiết bị
- **Trợ lý AI** — chat hỗ trợ phân tích số liệu kinh doanh trong app

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui, wouter, TanStack Query |
| Backend | Express 4, tRPC 11, Zod, SuperJSON |
| Database | MySQL / TiDB Serverless qua Drizzle ORM |
| Auth | Session cookie (JWT), scrypt, Google OAuth, OTP email |
| Lưu file | Đĩa local khi self-host (`STORAGE_DIR`) hoặc S3-compatible qua Forge |
| Test | Vitest |
| Đóng gói | Vite + esbuild, Docker (`Dockerfile.selfhost`) |

## Chạy ở máy local

Yêu cầu: Node.js 20+, một database MySQL/TiDB.

```bash
npm ci
cp .env.example .env   # điền DATABASE_URL, JWT_SECRET, tài khoản admin…
npm run db:push        # tạo/cập nhật schema (chỉ khi DB mới)
npm run dev            # chạy server dev (tsx watch)
```

Các script chính:

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy môi trường phát triển |
| `npm run build` | Build client + server vào `dist/` |
| `npm start` | Build rồi chạy production (`node dist/index.js`) |
| `npm run check` | Kiểm tra TypeScript (`tsc --noEmit`) |
| `npm test` | Chạy test (Vitest) |
| `npm run db:push` | Generate + chạy migration Drizzle |
| `npm run db:sync` | Đồng bộ schema an toàn cho VPS (chỉ bổ sung, không xoá dữ liệu) |

Biến môi trường xem đầy đủ trong [`.env.example`](.env.example). Tuyệt đối
không commit file `.env` thật.

## Triển khai

- **Botkeep.cloud (PaaS):** xem [`DEPLOY_BOTKEEP.md`](DEPLOY_BOTKEEP.md)
- **Oracle VPS (self-host):** xem [`DEPLOY_ORACLE_VPS.md`](DEPLOY_ORACLE_VPS.md)
  hoặc dùng `Dockerfile.selfhost`
- Tài liệu dự án chi tiết: [`TCG_Manager_Project_Document.md`](TCG_Manager_Project_Document.md)

Lưu ý: app không tự chạy migration khi khởi động — DB phải có schema sẵn
(chạy `npm run db:push` từ máy local trỏ vào DB đích). Các job định kỳ
(auto-backup, đồng bộ giá, monitor Chyusen, dọn thùng rác/log) chạy qua
endpoint `/api/scheduled/*` với header `x-cron-secret: $CRON_SECRET`
(crontab trên VPS hoặc cron ngoài như cron-job.org trên PaaS).

## Cấu trúc thư mục

```
client/            # React app (pages, components, hooks)
server/            # Express + tRPC routers, logic nghiệp vụ, test
  _core/           # hạ tầng: auth, session, env, LLM, email OTP…
shared/            # logic thuần dùng chung client/server (có test)
drizzle/           # schema + migrations
scripts/           # script deploy VPS, đồng bộ DB, tạo icon
docs/              # tài liệu PRD/tính năng
```

## Bảo mật

- Mọi API tRPC nghiệp vụ đều yêu cầu đăng nhập và scope dữ liệu theo
  `userId` của người gọi.
- `POST /api/upload-image` yêu cầu session đăng nhập, chỉ nhận ảnh raster
  (PNG/JPEG/WebP/GIF, tối đa 10 MB) và kiểm tra nội dung file thực tế
  (magic bytes) — không tin đuôi file/Content-Type client khai báo.
- Mật khẩu lưu dạng hash scrypt + so sánh timing-safe; mã OTP đổi mật
  khẩu gửi qua Gmail.

Phát hiện lỗ hổng hoặc lỗi, vui lòng mở issue trong repo này.

## License

MIT — xem [`LICENSE`](LICENSE).
