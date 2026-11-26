# AGENTS.md — TCG Manager

Mục lục tra cứu nhanh cho AI agent (Cline, Muse, …) làm việc trong repo này.
Đọc file này TRƯỚC khi sửa code: nó chỉ đúng nơi chứa mọi thứ, quy tắc nghiệp vụ
bất biến và quy trình làm việc. Mọi đường dẫn đều tính từ thư mục gốc repo.

## 1. Tổng quan

- **TCG Manager**: PWA tiếng Việt quản lý mua bán thẻ TCG/Pokémon tại Nhật (JPY):
  kho hàng, mua/bán, lợi nhuận, đồng bộ giá SNKRDUNK, bốc thăm (chyusen), sao lưu.
- **Bản live duy nhất**: Botkeep — https://tcgmanagervn.bot-keep.xyz
  (bản MTD VPS đã nghỉ hưu 2026-11-02, đừng nhắc tới nữa).
- **Stack**: React 19 + Vite + Tailwind CSS 4 + Radix UI (shadcn, xem
  `components.json`) · tRPC 11 + Express · Drizzle ORM + MySQL (TiDB Cloud) ·
  Vitest · PWA (Web Push qua VAPID).
- **Thuật ngữ bắt buộc**: gọi là **"sản phẩm"**, KHÔNG BAO GIỜ gọi "lô hàng".

## 2. Lệnh chuẩn

| Việc | Lệnh |
|---|---|
| Chạy dev | `npm run dev` (tsx watch, server/_core/index.ts) |
| Kiểm tra type | `npm run check` (tsc --noEmit) |
| Test | `npm test` (vitest run — 160 file test trong server/, ~533 test) |
| Build | `npm run build` (vite build + esbuild server → dist/) |
| Chạy production | `npm start` |
| Sinh/áp migration | `npm run db:push` (drizzle-kit) |

**Quy tắc vàng**: sửa xong phải chạy FULL test + build; cả hai xanh mới được push.

## 3. Bản đồ thư mục

```
client/src/
  App.tsx            Router (wouter) + ThemeProvider + các provider toàn cục
  pages/             Màn hình theo route (xem bảng §4)
  components/        Component nghiệp vụ (xem §5)
  components/ui/     Bộ Radix/shadcn gốc — ưu tiên dùng lại, hạn chế sửa
  contexts/ hooks/ lib/   Theme, hook dùng chung, tRPC client, utils
server/
  routers.ts         Toàn bộ tRPC appRouter (xem §6)
  _core/             Bootstrap Express, env, auth/session, vite phục vụ client
  db.ts              Tầng truy cập Drizzle
  snkrdunk.ts        Cào giá + đồng bộ SNKRDUNK/Marketplace
  chyusen*.ts        Nghiệp vụ bốc thăm (db, monitor, source, utils)
  aiChat.ts          Trợ lý AI (đọc thêm §8)
  storage.ts         Lưu file — STORAGE_DIR (xem quy tắc ảnh §7)
  imageWhiten.ts     Tẩy nền trắng ảnh sản phẩm
  uploadImage.ts     Endpoint upload ảnh
  *.test.ts          Test đặt cạnh file nguồn — thêm tính năng thì thêm test
shared/              Logic thuần dùng chung client/server (chyusen*, dashboard*,
                     marketplace*, formatYen.ts, cardRank.ts, cardRarity.ts…)
drizzle/schema.ts    Toàn bộ bảng DB (xem §6)
drizzle/             Migration SQL đã sinh
scripts/             db-sync.cjs và script vận hành
docs/ notes/         Tài liệu phụ; DEPLOY_BOTKEEP.md = quy trình deploy chuẩn
```

## 4. Trang & route (client/src/App.tsx, wouter)

| Route | File | Nội dung |
|---|---|---|
| `/` , `/welcome` | Welcome.tsx | Trang chào sau đăng xuất (GIỮ NGUYÊN — chủ app đã chốt, đừng đề xuất đổi) |
| `/choose-franchise` , `/intro/:franchise` | ChooseFranchise.tsx, FranchiseIntro.tsx | Chọn/giới thiệu dòng thẻ |
| `/login` | Login.tsx | Đăng nhập (email OTP / Google / mật khẩu) |
| `/thong-ke` | Dashboard.tsx | Thống kê tổng quan, lãi, xu hướng tháng |
| `/san-pham` , `/san-pham/:type` | Products.tsx | Danh sách sản phẩm |
| `/mua-hang` | Purchases.tsx | Đơn mua |
| `/ban-hang` | Sales.tsx | Đơn bán |
| `/kho-hang` | Inventory.tsx | Tồn kho |
| `/marketplace` | Marketplace.tsx | Đồng bộ giá Marketplace/SNKRDUNK |
| `/shop-snkr` , `/shop-snkr/:id` | SnkrShop.tsx, SnkrShopDetail.tsx | Cửa hàng SNKR theo dõi riêng |
| `/chyusen` | Chyusen.tsx | Bốc thăm — danh sách đang theo dõi |
| `/lich-su-chyusen` | ChyusenHistory.tsx | Lịch sử bốc thăm |
| `/thong-bao` | Notifications.tsx | Thông báo |
| `/bao-cao` | Reports.tsx | Báo cáo tháng |
| `/lich-su` | ActivityHistory.tsx | Nhật ký hoạt động |
| `/thung-rac` | Trash.tsx | Thùng rác (tự dọn theo cài đặt) |
| `/cai-dat` | Settings.tsx | Cài đặt (gồm bật/tắt Trợ lý AI, push, sao lưu) |

Mọi route sau `/login` đều qua `ProtectedRoute`.

## 5. Component nghiệp vụ (client/src/components/)

- `DashboardLayout.tsx` — khung chính: sidebar kính nổi + nội dung; `DashboardLayoutSkeleton.tsx` + `PageSkeletons.tsx` — skeleton khi tải (bắt buộc dùng cho trang mới).
- `MobileTabBar.tsx` — thanh tab dưới trên mobile (quyết định UI cố định, đừng bỏ).
- `AIChatBox.tsx`, `SidebarAIAssistant.tsx` — giao diện Trợ lý AI.
- `ProductImageAdjuster.tsx`, `ProductImageEditControls.tsx` — chỉnh/tẩy nền ảnh sản phẩm.
- `ProductTypeBadge.tsx`, `RankBadge.tsx`, `RarityBadge.tsx` — huy hiệu loại/hạng/độ hiếm (màu RGB có test khóa riêng — đừng đổi màu tùy tiện).
- `ProductNameSuggestions.tsx` — gợi ý tên sản phẩm.
- `NotificationCenter.tsx`, `PushNotificationSettings.tsx` — thông báo + Web Push.
- `SalesReceipt.tsx` — hóa đơn bán.
- `OfflineSaleDrafts.tsx` — bản nháp bán khi mất mạng.
- `ConnectivityBanner.tsx`, `SyncErrorHistory.tsx`, `ErrorBoundary.tsx` — trạng thái mạng/lỗi.
- `AccountSettingsDialog.tsx`, `SupportDialog.tsx`, `SupportFloatingButton.tsx`, `ManusDialog.tsx`, `Map.tsx`.

## 6. Backend — tRPC routers (server/routers.ts) & bảng DB (drizzle/schema.ts)

Router: `auth` · `products` · `purchases` · `sales` · `dashboard` · `reports` ·
`snkrShop` · `chyusen` · `shops` · `saleLocations` · `activities` · `trash` ·
`backup` · `push` · `ai` · `reportBranding` · `loginBackground`.
(Không có router tên `marketplace` — nghiệp vụ Marketplace/SNKRDUNK nằm ở
server/snkrdunk.ts + các file *SyncBatch.ts, gọi qua products/snkrShop.)

Bảng chính: `users`, `auth_credentials`, `email_auth_challenges`, `login_events`,
`products`, `purchases`, `sales`, `price_history`, `shops`, `sale_locations`,
`marketplace_sync_config`, `marketplace_sync_errors`, `snkr_shop_items`,
`snkr_shop_sync_config`, `snkr_shop_price_history`, `chyusen_entries`,
`chyusen_history`, `chyusen_sources`, `chyusen_source_history`,
`chyusen_shop_suggestions`, `chyusen_notifications`,
`chyusen_notification_settings`, `chyusen_monitor_config`, `activity_logs`,
`trash_items`, `trash_auto_cleanup_settings`, `backup_archives`,
`auto_backup_settings`, `backup_restore_history`, `report_branding`
(+ bảng push subscription — xem schema.ts).

## 7. Quy tắc nghiệp vụ BẤT BIẾN

1. **Kế toán**: giá vốn của một lần mua = đơn giá × số lượng; tổng vốn = đơn giá ×
   số lượng; **lãi = doanh thu − tổng chi phí**. Sửa/xóa mua hoặc bán phải nhất
   quán ở MỌI view (sản phẩm, kho, thống kê, báo cáo) — đã có test khóa
   (purchaseLedgerConsistency.test.ts).
2. **Sắp xếp mặc định**: MỌI danh sách sản phẩm theo **ngày mua mới → cũ**
   (ngày mua = bản ghi purchases mới nhất chưa hủy; không có thì createdAt).
   Chyusen theo **resultDate DESC, null xuống cuối**. (shared/productRecentOrder.ts,
   shared/chyusenListOrder.ts, server/defaultOrdering.test.ts.)
3. **Ảnh sản phẩm — bài học đắt giá**: file ảnh local PHẢI nằm ở `STORAGE_DIR`
   (mặc định `./uploads`, NGOÀI `dist/`) vì mỗi lần build/khởi động `dist/` bị
   xóa sạch. Ảnh local mà file đã mất = coi như thay được: luồng gắn link /
   "Làm mới ảnh" / đồng bộ giá tự tải lại từ SNKRDUNK + tẩy nền + lưu lại.
   Ảnh upload tay không có link SNKRDUNK thì mất là mất hẳn.
4. **Chyusen**: mọi lượt bốc thăm hoàn tất phải xuất hiện trong danh sách
   Chyusen và được cập nhật trạng thái ngay khi có kết quả (trúng/trượt/mua hàng).
5. **Đồng bộ SNKRDUNK**: server/snkrdunk.ts + marketplaceManualSyncBatch.ts /
   marketplaceAutoSyncBatch.ts; lỗi đồng bộ ghi vào `marketplace_sync_errors`
   và hiện ở SyncErrorHistory — đừng nuốt lỗi im lặng.
6. **Theme**: sáng glass là mặc định + tối charcoal; toggle ở top bar; lựa chọn
   nhớ theo thiết bị. Thêm trang mới PHẢI kiểm cả hai theme, không để sót trang
   nào còn tông cũ.

## 8. Trợ lý AI (server/aiChat.ts)

- Chat trong app + toggle bật/tắt ở Settings. Trả lời từ dữ liệu THẬT (vốn, giá
  trị kho, lãi tháng, sản phẩm lãi/lỗ nhất, giao dịch gần đây, hạn chyusen) —
  chỉ đọc, không bịa số.
- Model: `gemini-3.5-flash-lite` qua endpoint OpenAI-compatible của Gemini.
  Key đọc từ biến môi trường **`AI_API_KEY`** (đặt trong Botkeep Environment,
  TUYỆT ĐỐI không ghi key vào code/chat/commit).
- Prompt hệ thống: server/tcgAssistantPrompt.ts; định dạng tiền: shared/aiCurrency.ts.

## 9. Biến môi trường (chỉ tên — giá trị nằm ở Botkeep Environment / .env local)

`DATABASE_URL` `JWT_SECRET` `PORT` `NODE_ENV` `ADMIN_EMAIL` `ADMIN_PASSWORD`
`ADMIN_OPENID` `CRON_SECRET` `STORAGE_DIR` `AI_API_KEY` `SMTP_HOST` `SMTP_PORT`
`SMTP_SECURE` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` `EMAIL_CODE_SECRET`
`GOOGLE_CLIENT_ID` `GOOGLE_CLIENT_SECRET` `GOOGLE_REDIRECT_URI`
(+ khóa VAPID cho Web Push — xem server/_core/env.ts và server/push.ts.)
Mẫu đầy đủ: `.env.example`. **Không commit .env thật.**

## 10. Quy trình làm việc & deploy

1. Sửa code ngay trong repo này; chạy `npm test` + `npm run build` tại chỗ.
2. Cả hai xanh → mới push GitHub (repo `Ntgaming38/TCG-VPS-Botkeep`).
   Khi chủ app đã ủy quyền "đẩy thẳng main" cho lần việc đó thì push thẳng main,
   không tách PR; chưa được ủy quyền thì branch + PR.
3. Deploy = Botkeep Sync bản mới nhất (tài khoản Botkeep #1 — tài khoản đăng
   nhập GitHub; ĐỪNG nhầm với tài khoản Bot-RAPTOR #2 hay Cinema #3).
4. Sau sync PHẢI kiểm chứng: app Running, trang live trả 200, và tính năng vừa
   sửa hoạt động thật. Riêng thay đổi liên quan lưu trữ/cài đặt: phải ĐỌC LẠI
   từ nơi lưu để chắc chắn đã ghi (bài học: báo "đã lưu" khi chưa lưu là lỗi
   bị bắt quả tang nhiều lần).
5. Đổi schema: sửa drizzle/schema.ts → `npm run db:push` → kiểm lại app chạy.

## 11. Cấm kỵ

- Không đổi hành vi đã chốt: logout về Welcome; sort mặc định §7.2; bottom tab
  bar mobile; màu RankBadge/RarityBadge.
- Không thêm thư viện native cần node-gyp (máy chủ app build khó).
- Không ghi secret vào bất kỳ file nào trong repo.
- Không tự ý đổi `STORAGE_DIR` về trong `dist/` dưới bất kỳ hình thức nào.
