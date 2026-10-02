# TCG Manager - Tài liệu dự án chi tiết

---

## 1. Tổng quan dự án

**TCG Manager** là một ứng dụng web quản lý kinh doanh mua bán Trading Card Game (Pokémon, One Piece, Dragon Ball, v.v.). Ứng dụng hỗ trợ người dùng theo dõi toàn bộ quy trình từ nhập hàng, quản lý kho, bán hàng, đến thống kê lợi nhuận một cách tự động và chính xác.

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên ứng dụng** | TCG Manager |
| **Loại** | Web App (Progressive Web App) |
| **Ngôn ngữ giao diện** | Tiếng Việt |
| **Đơn vị tiền tệ** | JPY (¥) |
| **Đối tượng sử dụng** | Cá nhân kinh doanh TCG tại Nhật Bản |
| **Nền tảng** | PC + Mobile (Responsive) |
| **Domain** | poketrader-bylucifer.manus.space |

---

## 2. Công nghệ sử dụng

| Thành phần | Công nghệ |
|------------|-----------|
| **Frontend** | React 19, Tailwind CSS 4, shadcn/ui |
| **Backend** | Express 4, tRPC 11 |
| **Database** | MySQL (TiDB Serverless) |
| **ORM** | Drizzle ORM |
| **Auth** | Manus OAuth (Google login) |
| **File Storage** | AWS S3 |
| **Hosting** | Manus Autoscale (Serverless) |
| **State Management** | tRPC useQuery/useMutation |
| **Serialization** | Superjson (Date objects preserved) |

---

## 3. Giao diện (UI/UX)

### 3.1 Phong cách thiết kế

Giao diện được thiết kế theo phong cách **gaming neon** lấy cảm hứng từ genpkm.com/shop, kết hợp giữa nền tối (sidebar) và nền sáng (content area) tạo contrast mạnh mẽ.

| Thành phần | Màu sắc |
|------------|---------|
| **Sidebar** | Xanh đậm (#0a0f1a) |
| **Logo "TCG Manager"** | Vàng (#FFCB05) với hiệu ứng glow |
| **Nền content** | Trắng |
| **Card/Viền** | Xanh lá neon nhẹ, glow khi hover |
| **Nút chính (Primary)** | Đỏ (#ef4444 → #dc2626) |
| **Nút đăng nhập** | Đỏ với hiệu ứng pulse |
| **Text chính** | Đen/xám đậm |
| **Sidebar text** | Trắng/xám nhạt |
| **Active menu** | Viền trái xanh lá + highlight |

### 3.2 Màn hình đăng nhập

Màn hình đăng nhập có hình nền full-screen (Red + Pikachu artwork), chữ **"TCG Manager"** màu vàng kiểu Pokémon GO với hiệu ứng phát sáng (glow animation), nút **"Bắt đầu"** màu đỏ với hiệu ứng nhấp nháy (pulse), và chuyển cảnh mượt mà khi bấm vào.

### 3.3 Layout chính (sau đăng nhập)

Sử dụng **DashboardLayout** với sidebar cố định bên trái (có thể thu gọn) và vùng content bên phải. Sidebar hiển thị logo, menu điều hướng, và thông tin user ở dưới cùng.

---

## 4. Cấu trúc menu (Sidebar)

| STT | Icon | Tên menu | Đường dẫn | Mô tả |
|-----|------|----------|-----------|-------|
| 1 | 📊 | TCG Manager | /thong-ke | Trang thống kê tổng quan |
| 2 | 💳 | Card | /san-pham/card | Quản lý card đơn lẻ |
| 3 | 📦 | Box | /san-pham/box | Quản lý box |
| 4 | 🎁 | Pack | /san-pham/pack | Quản lý pack |
| 5 | 🏪 | Kho Hàng | /kho-hang | Tổng quan kho hàng |
| 6 | 🛒 | Mua Hàng | /mua-hang | Lịch sử mua hàng |
| 7 | 💰 | Bán Hàng | /ban-hang | Lịch sử bán hàng |
| 8 | 📈 | Marketplace | /marketplace | Theo dõi giá thị trường |
| 9 | 📄 | Báo Cáo | /bao-cao | Báo cáo & xuất CSV |

---

## 5. Tính năng chi tiết

### 5.1 Trang TCG Manager (Thống kê tổng quan)

Trang chính hiển thị toàn bộ số liệu kinh doanh real-time:

**Các card thống kê:**

| Card | Ý nghĩa | Cách tính |
|------|----------|-----------|
| Tổng vốn | Tổng tiền đã bỏ ra mua hàng | SUM(purchases.totalPrice) |
| Giá trị hiện tại | Giá trị kho theo giá thị trường | SUM(product.marketPrice × quantity) cho SP in_stock |
| Lợi nhuận | Tổng lãi/lỗ | SUM(sales.profit) |
| Tổng SP trong kho | Số lượng SP còn trong kho | SUM(product.quantity) WHERE status = in_stock |
| Tổng SP đã bán | Số lượng SP đã bán | SUM(sales.quantity) |

**Biểu đồ:**
- Doanh thu theo tháng (Line chart)
- Lợi nhuận theo tháng (Bar chart)

**Hoạt động gần đây:** Hiển thị 10 hoạt động mới nhất (mua/bán/thêm SP).

---

### 5.2 Quản lý sản phẩm (Card / Box / Pack)

Mỗi loại sản phẩm có trang riêng với cùng cấu trúc:

**Thêm sản phẩm mới:**

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| Tên sản phẩm | ✅ | Tên card/box/pack |
| Series | ✅ | Pokemon, One Piece, Dragon Ball, v.v. |
| Set Name | ❌ | Tên bộ (VD: Stellar Miracle) |
| Số lượng | ✅ | Số lượng nhập |
| Giá mua | ✅ | Tổng giá mua cả lô |
| Giá thị trường | ❌ | Giá hiện tại trên marketplace |
| Mô tả | ❌ | Ghi chú thêm |
| Rarity | ❌ | Độ hiếm (cho Card) |
| PSA Grade | ❌ | Điểm PSA (cho Card) |
| Card Number | ❌ | Mã card (cho Card) |
| Ngôn ngữ | ❌ | Japanese/English/Korean |
| Tình trạng | ❌ | New/Used/Mint |

**Chức năng trên mỗi card sản phẩm (nút 3 chấm dọc ⋮):**
- Sửa thông tin sản phẩm
- Upload ảnh (lưu trên S3)
- Xóa sản phẩm

**Hiển thị trên card:**
- Badge loại (Card/Box/Pack)
- Badge trạng thái (Trong kho / Đã bán)
- Tên, Series
- SL, Giá mua, Giá TT, Lãi/Lỗ
- Hình ảnh (nếu có)

---

### 5.3 Kho Hàng

Trang tổng quan toàn bộ sản phẩm trong kho với các tính năng:

**Card thống kê đầu trang:**
- Tổng sản phẩm (trong kho)
- Giá trị kho (hàng tốt)
- Hàng hỏng/rác

**Bộ lọc:**
- Tìm kiếm theo tên
- Lọc theo loại (Card/Box/Pack/Tất cả)
- Lọc theo trạng thái (Trong kho/Đã bán)

**Chức năng trên mỗi sản phẩm:**
- **Sửa:** Tên, Series, Số lượng, Tổng giá vốn, Tổng giá TT
- **Xoá:** Xoá sản phẩm + toàn bộ lịch sử mua/bán liên quan
- **Đánh dấu hỏng:** Chuyển một phần SL sang "hàng hỏng" (để bán riêng)

**Hiển thị trên card kho:**
- Tên, Series, Loại
- Tổng SL, Giá vốn (tổng lô), Giá TT (tổng lô)
- Nút: Sửa | Xoá | Hỏng

---

### 5.4 Mua Hàng

Quản lý toàn bộ lịch sử nhập hàng:

**Form thêm giao dịch mua:**

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| Tên sản phẩm | ✅ | Autocomplete từ SP đã có hoặc nhập mới |
| Loại | ✅ | Card / Box / Pack |
| Số lượng | ✅ | Số lượng mua |
| Tổng giá mua (¥) | ✅ | Tổng giá cả lô (hệ thống tự chia ra giá/SP) |
| Cửa hàng | ✅ | Dropdown: Geo, Joshin, Fruichi, Toysrus, Lawson, Seven Eleven, Family Mart, Khác |
| Ghi chú | ❌ | Ghi chú thêm |

**Quy tắc tính giá:**

> Giá mua nhập vào form là **TỔNG GIÁ CẢ LÔ**. Hệ thống tự chia: unitPrice = totalPrice ÷ quantity.
>
> Ví dụ: Mua 10 pack nhập "2000" → unitPrice = 200¥/pack, totalCapital = 2.000¥

**Chức năng sửa giao dịch mua:**
- Cho phép sửa: Giá mua, Số lượng, Cửa hàng, Ghi chú
- Không cho sửa: Tên sản phẩm, Ngày mua
- Sau khi sửa: tự động cập nhật tồn kho, Dashboard, giá trị hàng tồn, tổng vốn

**Chức năng xoá giao dịch mua:**
- Chỉ cho xoá khi sản phẩm chưa phát sinh giao dịch bán
- Nếu đã có bán → hiện thông báo "Không thể xóa vì sản phẩm đã phát sinh giao dịch bán"
- Trước khi xoá: hiển thị hộp xác nhận
- Sau khi xoá: rollback tồn kho, cập nhật Dashboard

**Sắp xếp:** Theo ngày (mới→cũ / cũ→mới), Giá (cao→thấp / thấp→cao), Tên (A→Z / Z→A)

**Tổng kết cuối danh sách:** Tổng tiền mua, Tổng SL, Số giao dịch

---

### 5.5 Bán Hàng

Quản lý toàn bộ lịch sử bán hàng:

**Form thêm giao dịch bán:**

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| Sản phẩm | ✅ | Chọn từ danh sách SP trong kho |
| Số lượng bán | ✅ | Không vượt quá SL tồn kho |
| Tổng giá bán (¥) | ✅ | Tổng giá bán cả lô |
| Nền tảng | ✅ | SNKRDUNK, Mercari, Yahoo, Shop, Offline, Khác |
| Phí sàn (¥) | ❌ | Phí nền tảng |
| Phí ship (¥) | ❌ | Phí vận chuyển |
| Chi phí khác (¥) | ❌ | Chi phí phát sinh |
| Hàng hỏng? | ❌ | Toggle: bán từ kho hàng hỏng |
| Ghi chú | ❌ | Ghi chú thêm |

**Quy tắc tính lợi nhuận:**

> - Doanh thu = Tổng giá bán (cả lô)
> - Vốn = buyPrice (giá vốn/SP) × Số lượng bán
> - Tổng phí = Phí sàn + Phí ship + Chi phí khác
> - **Lợi nhuận = Doanh thu - Vốn - Tổng phí**
>
> Ví dụ: Mua 10 pack giá 2.000¥ (200¥/pack), bán 10 pack giá 10.000¥
> → Lợi nhuận = 10.000 - 2.000 - 0 = **8.000¥**

**Chức năng sửa giao dịch bán:**
- Cho phép sửa: Số lượng bán, Giá bán, Ghi chú
- Không cho sửa: Tên sản phẩm, Nền tảng, Ngày bán
- Khi sửa: hoàn lại SL cũ trước, rồi trừ SL mới (không trừ chênh lệch trực tiếp)
- Tính lại: Vốn, Doanh thu, Lợi nhuận

**Chức năng xoá giao dịch bán:**
- Hoàn lại đúng SL về sản phẩm trong kho
- Tính lại: Tổng doanh thu, Tổng lợi nhuận, Giá trị hàng tồn, Tổng tài sản
- Trước khi xoá: hiển thị hộp xác nhận

**Sắp xếp:** Theo ngày, Giá, Tên

**Tổng kết cuối danh sách:** Tổng doanh thu, Tổng lợi nhuận, Số giao dịch

---

### 5.6 Hàng hỏng (Damaged Products)

Hỗ trợ trường hợp sản phẩm bị hỏng trong kho:

- Từ trang Kho Hàng, bấm nút **"Hỏng"** → nhập số lượng hỏng + ghi chú
- Hệ thống chuyển SL từ "hàng tốt" sang "hàng hỏng" (damagedQuantity)
- Khi bán, toggle **"Hàng hỏng?"** để bán từ kho hàng hỏng (giá thấp hơn)
- Dashboard hiển thị riêng số lượng hàng hỏng

---

### 5.7 Marketplace

Theo dõi giá thị trường của sản phẩm:

- Hiển thị danh sách sản phẩm với giá mua vs giá thị trường
- Cho phép cập nhật giá thị trường thủ công
- Lưu lịch sử thay đổi giá (price_history table)
- So sánh giá mua vs giá TT để biết lãi/lỗ tiềm năng

---

### 5.8 Báo Cáo

Trang báo cáo tổng hợp với:

**Thống kê tổng quan:**
- Tổng vốn đầu tư
- Tổng doanh thu
- Tổng lợi nhuận
- ROI (%)
- Giá trị kho hiện tại

**Biểu đồ:**
- Lợi nhuận theo tháng
- Top sản phẩm lãi nhất

**Xuất dữ liệu:**
- Export CSV toàn bộ giao dịch mua/bán

---

## 6. Quy tắc nghiệp vụ bắt buộc

### 6.1 Quy tắc tính giá

| Thao tác | Input | Hệ thống tự tính |
|----------|-------|-------------------|
| Mua hàng | Tổng giá cả lô | unitPrice = totalPrice ÷ quantity |
| Bán hàng | Tổng giá bán cả lô | unitSalePrice = totalRevenue ÷ quantity |
| Lợi nhuận | — | revenue - (buyPrice × qtySold) - fees |

### 6.2 Quy tắc đồng bộ dữ liệu

Sau **BẤT KỲ** thao tác Thêm / Sửa / Xóa nào, hệ thống phải tự động cập nhật:

- Inventory (Kho Hàng)
- Stock History (Lịch sử tồn kho)
- Sales History (Lịch sử bán)
- Dashboard (Thống kê)
- Tổng vốn
- Tổng doanh thu
- Tổng lợi nhuận
- Giá trị hàng tồn
- Tổng tài sản
- ROI

> **Không được phép** xảy ra tình trạng dữ liệu ở một trang đã thay đổi nhưng Dashboard hoặc các trang thống kê vẫn hiển thị số liệu cũ.

### 6.3 Quy tắc sửa giao dịch bán

Khi sửa số lượng bán (VD: từ 5 → 8):

> Hệ thống phải **hoàn lại 5 trước**, sau đó mới **trừ 8**. Không được trừ trực tiếp chênh lệch 3.

### 6.4 Quy tắc xoá giao dịch mua

> Chỉ cho phép xoá khi sản phẩm **chưa phát sinh giao dịch bán**. Nếu đã có lịch sử bán → từ chối xoá.

---

## 7. Danh sách cửa hàng mặc định

| STT | Tên cửa hàng |
|-----|-------------|
| 1 | Geo |
| 2 | Joshin |
| 3 | Fruichi |
| 4 | Toysrus |
| 5 | Lawson |
| 6 | Seven Eleven |
| 7 | Family Mart |
| 8 | Khác |

---

## 8. Nền tảng bán hàng

| STT | Nền tảng | Mô tả |
|-----|----------|-------|
| 1 | SNKRDUNK | Sàn bán sneaker & TCG Nhật |
| 2 | Mercari | Chợ online Nhật |
| 3 | Yahoo | Yahoo Auction Japan |
| 4 | Shop | Bán tại cửa hàng |
| 5 | Offline | Bán trực tiếp |
| 6 | Other | Khác |

---

## 9. Database Schema

### 9.1 Bảng products

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | INT (PK) | ID tự tăng |
| userId | INT | ID người dùng sở hữu |
| name | VARCHAR(255) | Tên sản phẩm |
| series | VARCHAR(100) | Series (Pokemon, One Piece...) |
| type | ENUM | card / box / pack |
| image | TEXT | URL ảnh trên S3 |
| quantity | INT | Số lượng tồn kho |
| damagedQuantity | INT | Số lượng hỏng |
| buyPrice | DECIMAL(12,2) | Giá vốn trung bình/SP |
| marketPrice | DECIMAL(12,2) | Giá thị trường/SP |
| status | ENUM | in_stock / sold / reserved / traded / damaged |

### 9.2 Bảng purchases

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | INT (PK) | ID tự tăng |
| userId | INT | ID người dùng |
| productId | INT | FK → products.id |
| shop | VARCHAR(255) | Cửa hàng mua |
| quantity | INT | Số lượng mua |
| price | DECIMAL(12,2) | Giá/SP (unitPrice) |
| totalPrice | DECIMAL(12,2) | Tổng giá lô |
| note | TEXT | Ghi chú |
| purchaseDate | TIMESTAMP | Ngày mua |

### 9.3 Bảng sales

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | INT (PK) | ID tự tăng |
| userId | INT | ID người dùng |
| productId | INT | FK → products.id |
| quantity | INT | Số lượng bán |
| salePrice | DECIMAL(12,2) | Giá bán/SP |
| totalRevenue | DECIMAL(12,2) | Tổng doanh thu |
| platform | ENUM | Nền tảng bán |
| fee | DECIMAL(12,2) | Phí sàn |
| shippingFee | DECIMAL(12,2) | Phí ship |
| otherCost | DECIMAL(12,2) | Chi phí khác |
| profit | DECIMAL(12,2) | Lợi nhuận |
| note | TEXT | Ghi chú |
| saleDate | TIMESTAMP | Ngày bán |

### 9.4 Bảng price_history

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | INT (PK) | ID tự tăng |
| productId | INT | FK → products.id |
| oldPrice | DECIMAL(12,2) | Giá cũ |
| newPrice | DECIMAL(12,2) | Giá mới |
| source | VARCHAR(100) | Nguồn (manual/api) |
| createdAt | TIMESTAMP | Thời điểm cập nhật |

### 9.5 Bảng activity_logs

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | INT (PK) | ID tự tăng |
| userId | INT | ID người dùng |
| action | VARCHAR(100) | Loại hành động |
| description | TEXT | Mô tả chi tiết |
| entityType | VARCHAR(50) | Loại entity (product/purchase/sale) |
| entityId | INT | ID entity liên quan |
| createdAt | TIMESTAMP | Thời điểm |

---

## 10. Bảo mật & Phân quyền

- Mỗi user chỉ thấy và quản lý dữ liệu của chính mình (filter by userId)
- Xác thực qua Manus OAuth (Google login)
- Session cookie + JWT
- Tất cả API endpoints đều dùng `protectedProcedure` (yêu cầu đăng nhập)
- Role: admin / user (admin có thể mở rộng quyền sau này)

---

## 11. Responsive Design

| Thiết bị | Xử lý |
|----------|--------|
| **Desktop** | Sidebar mở rộng + content area đầy đủ |
| **Tablet** | Sidebar thu gọn (icon only) |
| **Mobile** | Sidebar ẩn, hiện qua hamburger menu, card grid 1 cột |

---

## 12. Hiệu ứng & Animation

| Hiệu ứng | Vị trí | Mô tả |
|-----------|--------|-------|
| Glow pulse | Logo "TCG Manager" | Chữ vàng phát sáng nhấp nháy |
| Red pulse | Nút "Bắt đầu" (login) | Nút đỏ nhấp nháy |
| Page transition | Login → Dashboard | Overlay mượt mà |
| Card hover glow | Tất cả card | Viền xanh lá sáng hơn khi hover |
| Slide animations | Login page elements | Các phần tử trượt vào |
| Scale on active | Buttons | Thu nhỏ 0.97 khi bấm |

---

## 13. Tóm tắt Flow nghiệp vụ

```
[Đăng nhập] → [TCG Manager Dashboard]
     ↓
[Thêm SP mới] → Card/Box/Pack (tên, loại, series)
     ↓
[Mua Hàng] → Chọn SP + SL + Tổng giá + Cửa hàng
     ↓                    ↓
     ↓         Hệ thống tự tính: unitPrice = total ÷ qty
     ↓         Cập nhật: product.quantity += qty, product.buyPrice = weighted avg
     ↓
[Kho Hàng] → Xem tồn kho, sửa, xoá, đánh dấu hỏng
     ↓
[Bán Hàng] → Chọn SP từ kho + SL bán + Tổng giá bán + Platform + Phí
     ↓                    ↓
     ↓         Hệ thống tự tính: profit = revenue - capital - fees
     ↓         Cập nhật: product.quantity -= qty, trạng thái nếu hết
     ↓
[Dashboard] → Tự động cập nhật: vốn, doanh thu, lãi, ROI, biểu đồ
     ↓
[Báo Cáo] → Xem thống kê, export CSV
```

---

## 14. Các lưu ý quan trọng

1. **KHÔNG** hiển thị "Dashboard" ở bất kỳ đâu — dùng "TCG Manager" thay thế
2. **KHÔNG** hiển thị "Học Viện Bảo Bối" hay "Pokémon Trading Manager" — chỉ dùng "TCG Manager"
3. Giá mua/bán nhập vào form luôn là **TỔNG GIÁ CẢ LÔ**, hệ thống tự chia ra giá/SP
4. **KHÔNG** được tính: `profit = revenue - buyPrice` (vì buyPrice chỉ là giá 1 SP)
5. Phải luôn tính: `profit = revenue - (buyPrice × quantitySold) - fees`
6. Mọi thao tác CRUD phải đồng bộ toàn bộ hệ thống ngay lập tức
7. Sửa SL bán phải "hoàn cũ trước, trừ mới sau" — không trừ chênh lệch
8. Xoá mua hàng bị chặn nếu SP đã có giao dịch bán

---

*Tài liệu này mô tả đầy đủ dự án TCG Manager tính đến phiên bản hiện tại (v92cc77f3). Mọi thay đổi trong tương lai cần được cập nhật vào tài liệu này.*


## 15. Đồng bộ giá SNKRDUNK tự động

Marketplace hiện hỗ trợ liên kết từng sản phẩm trong kho với **URL trang sản phẩm cụ thể** trên SNKRDUNK. Hệ thống chỉ chấp nhận URL HTTPS của SNKRDUNK và từ chối URL danh mục như `/categories/...`. Khi người dùng bấm đồng bộ, backend tải HTML công khai của đúng trang sản phẩm và đọc giá thực tế từ JSON-LD/JSON hoặc vùng giá của lựa chọn đầu tiên. Hệ thống không dùng `Math.random()`, giá mua, giá mặc định hay giá hardcode để thay thế.

| Chức năng | Mô tả |
|-----------|-------|
| Gắn link | Lưu URL SNKRDUNK cho từng Card/Box/Pack |
| Đồng bộ từng sản phẩm | Cập nhật giá công khai thật và thời điểm đồng bộ gần nhất |
| Đồng bộ tất cả | Đồng bộ toàn bộ sản phẩm đã gắn link, trả về số cập nhật và danh sách lỗi |
| Lịch sử giá | Ghi vào `price_history` với nguồn `snkrdunk_auto` khi giá thay đổi |
| Activity log | Ghi lại thao tác gắn link và đồng bộ giá |
| Không có giá | Báo lỗi và giữ nguyên `marketPrice` cũ |

Các trường mới trong `products` là `snkrdunkUrl` và `snkrdunkLastSyncedAt`. Marketplace vẫn giữ tùy chọn nhập giá thủ công cho trường hợp trang SNKRDUNK render giá bằng JavaScript, yêu cầu đăng nhập hoặc không cung cấp giá công khai trong HTML.
