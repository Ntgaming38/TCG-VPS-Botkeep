# Pokémon Trading Manager - TODO

## Setup & Infrastructure
- [x] Database schema (products, cards, boxes, packs, inventory, purchases, sales, price_history, shops, images, activity_logs)
- [x] Global dark theme styling with Pokémon colors (yellow + dark blue)
- [x] Google Font setup for Pokémon-style text

## Authentication & Login
- [x] Custom login page with Pokémon artwork background
- [x] "POKÉMON" text in yellow Pokémon Go style
- [x] Login/Register flow with Manus OAuth

## Layout & Navigation
- [x] Custom DashboardLayout with dark sidebar
- [x] Sidebar menu items: Thống kê chi tiết, Card, Box, Pack, Kho Hàng, Mua Hàng, Bán Hàng, Marketplace, Báo Cáo
- [x] User avatar and dropdown logout in sidebar footer
- [x] Responsive mobile menu

## Thống kê chi tiết (Dashboard)
- [x] Summary cards: Tổng vốn, Giá trị hiện tại, Lợi nhuận, Tổng sản phẩm
- [x] Profit chart by month (BarChart)
- [x] Revenue chart by month (AreaChart)
- [x] Recent activities list

## Product Management (Card/Box/Pack)
- [x] Products listing page with search and filters
- [x] Add product form with type, series, set, quantity, prices
- [x] Card-specific fields (rarity, PSA grade, card number, condition, language)
- [x] Image upload for products (S3 upload via /api/upload-image)
- [x] Edit/Delete product inline (dropdown menu with edit dialog and delete confirm)

## Inventory (Kho Hàng)
- [x] Inventory listing with filters (type, status)
- [x] Auto-update on purchase/sale
- [x] Stock value calculation
- [x] Search and filter functionality

## Purchases (Mua Hàng)
- [x] Purchase list view
- [x] Add purchase form with autocomplete product name
- [x] Shop dropdown selection
- [x] Auto-fill price from previous purchases
- [x] Auto-update inventory on purchase

## Sales (Bán Hàng)
- [x] Sales list view
- [x] Create sale from inventory (select in-stock product)
- [x] Auto-calculate profit (sale price - buy price - fees)
- [x] Platform selection (SNKRDUNK, Mercari, Yahoo, etc.)
- [x] Fee calculation (platform fee, shipping, other)
- [x] Auto-update inventory on sale

## Marketplace (SNKRDUNK)
- [x] Product price tracking
- [x] Price comparison (buy vs market)
- [x] Manual price update with history

## Reports (Báo Cáo)
- [x] Overview report (total bought, sold, profit, ROI)
- [x] Monthly profit chart
- [x] Top profitable products
- [x] Export to CSV (client-side CSV export with BOM for Excel)

## Additional Features
- [x] Responsive design for mobile
- [x] Vitest tests (9 tests passing)
- [x] Product image display on cards
- [x] User profile in sidebar footer with logout
- [x] Hiệu ứng phát sáng cho chữ POKÉMON trên trang login
- [x] Hiệu ứng nhấp nháy nhẹ cho nút Bắt đầu
- [x] Hiệu ứng chuyển cảnh mượt mà khi bấm Bắt đầu
- [x] Điều chỉnh kích thước chữ POKÉMON to hơn và căn giữa hoàn hảo
- [x] Tạo skill tái sử dụng cho quy trình Pokemon login page
- [x] Thêm danh sách cửa hàng cố định: Geo, Joshin, Fruichi, Toysrus, Lawson, Seven Eleven, Family Mart, Khác
- [x] Fix lỗi Date object render trực tiếp trong Dashboard recentActivities
- [x] Thêm tính năng sắp xếp danh sách mua hàng theo ngày, giá, tên sản phẩm
- [x] Thêm tính năng sắp xếp danh sách bán hàng theo ngày, giá, tên sản phẩm
- [x] Đổi "Tổng sản phẩm" thành "Tổng sản phẩm trong kho" (chỉ đếm in_stock)
- [x] Thêm mục "Tổng sản phẩm đã bán" trên Dashboard
- [x] Sau khi bán, trừ số lượng tồn kho đúng
- [x] Thêm tổng kết cuối danh sách Mua Hàng (tổng tiền mua)
- [x] Thêm tổng kết cuối danh sách Bán Hàng (tổng tiền bán, tổng lợi nhuận)
- [x] Thêm trạng thái "damaged" (hỏng/rác) cho sản phẩm trong kho
- [x] Thêm tính năng chuyển số lượng từ bình thường sang hỏng/rác (tách sản phẩm)
- [x] Ghi chú lý do hỏng khi chuyển trạng thái
- [x] Cho phép bán sản phẩm hỏng riêng với giá thấp hơn
- [x] Hiển thị rõ ràng sản phẩm hỏng trong kho (badge/label khác biệt)
- [x] Fix bug: giá mua là tổng giá cho cả lô (2000 yên cho 10 pack = 200 yên/pack), không nhân thêm quantity
- [x] Cập nhật createSale để hỗ trợ bán từ damagedQuantity riêng (trừ damagedQuantity khi bán hàng hỏng)
- [x] Thêm UI trang Bán Hàng cho phép chọn bán hàng tốt hoặc hàng hỏng/rác

## Sửa/Xóa lịch sử mua hàng & bán hàng
- [x] Backend: updatePurchase (sửa giá, SL, shop, chi phí, ghi chú - hoàn trả kho cũ rồi trừ mới)
- [x] Backend: deletePurchase (chỉ xóa khi chưa có giao dịch bán, xóa product + cập nhật kho)
- [x] Backend: updateSale (hoàn trả SL cũ → trừ SL mới, tính lại profit)
- [x] Backend: deleteSale (hoàn trả SL về kho, xóa record)
- [x] UI Purchases: nút Sửa/Xóa cho mỗi giao dịch mua, dialog sửa, confirm xóa
- [x] UI Sales: nút Sửa/Xóa cho mỗi giao dịch bán, dialog sửa, confirm xóa
- [x] Đồng bộ toàn bộ: invalidate tRPC queries sau mỗi thao tác (Dashboard, Inventory, Reports)
- [x] FIX: Form bán hàng phải nhập TỔNG GIÁ BÁN (không phải giá/sp), giống logic mua hàng
- [x] FIX: Form bán hàng phải nhập TỔNG GIÁ BÁN (không phải giá/sp), giống logic mua hàng

## Sửa quy tắc tính giá (giá/SP thay vì tổng giá lô)
- [x] Backend createPurchase: price = giá mua/SP, tổng vốn = price × quantity
- [x] Backend createSale: salePrice = giá bán/SP, doanh thu = salePrice × quantity, lợi nhuận = doanh thu - (buyPrice × quantity) - phí
- [x] Backend updatePurchase: price = giá mua/SP
- [x] Backend updateSale: salePrice = giá bán/SP
- [x] Frontend Purchases form: label "Giá mua (¥/SP)", hiển thị tổng vốn = giá × SL
- [x] Frontend Sales form: label "Giá bán (¥/SP)", hiển thị doanh thu = giá × SL, vốn = buyPrice × SL, lợi nhuận
- [x] Dashboard/Reports: đảm bảo tính đúng theo quy tắc mới

## Sửa lại quy tắc tính giá (TỔNG GIÁ LÔ, không phải giá/SP)
- [x] Backend createPurchase: price = TỔNG GIÁ CẢ LÔ, unitPrice = price / quantity
- [x] Backend createSale: salePrice = TỔNG GIÁ BÁN CẢ LÔ, profit = salePrice - buyPrice*qty - fees
- [x] Backend updatePurchase: price = TỔNG GIÁ CẢ LÔ
- [x] Backend updateSale: salePrice = TỔNG GIÁ BÁN CẢ LÔ
- [x] Frontend Purchases form: label "Tổng giá mua (¥)" + hiển thị giá/SP tự tính
- [x] Frontend Sales form: label "Tổng giá bán (¥)" + hiển thị lợi nhuận = tổng bán - tổng mua - phí

## Sửa thống kê + Sửa/Xoá trong Kho Hàng
- [x] Thống kê Dashboard trừ đúng tổng SP khi bán hàng hoặc xoá sản phẩm
- [x] Thêm chức năng SỬA sản phẩm trong Kho Hàng (tên, SL, giá, series...)
- [x] Thêm chức năng XOÁ sản phẩm trong Kho Hàng (confirm dialog)
- [x] Tự động cập nhật thống kê Dashboard sau mỗi lần sửa/xoá trong Kho

## Fix hiển thị giá vốn trong Kho Hàng
- [x] Kho Hàng card: "Giá vốn" hiển thị = buyPrice × quantity (tổng giá vốn cả lô)
- [x] Form sửa: "Tổng giá vốn (¥)" nhập tổng giá lô, hệ thống tự chia ra giá/SP khi lưu

## Đổi giao diện Pokémon GO
- [x] Thay hình nền login bằng hình Red + Pikachu
- [x] Đổi theme bên trong: nửa xanh trời đậm + nửa đỏ (Pokémon GO style)
- [x] Thay nền content bằng hình Zoroark đen, chữ trắng, nút đỏ

## Giao diện Gaming Neon (giống genpkm.com/shop)
- [x] CSS theme: nền đen/xanh đậm, viền neon xanh lá, card phát sáng
- [x] Sidebar: neon style với viền phát sáng
- [x] Login page: phù hợp phong cách gaming neon

## Đổi tên TCG Trading Manager + nền trắng
- [x] Đổi "Thống kê chi tiết" heading → "TCG Trading Manager"
- [x] Đổi logo sidebar POKÉMON → "TCG Manager" màu vàng
- [x] Đổi login page text → "TCG Trading Manager" màu vàng
- [x] Đổi nền giao diện từ đen sang trắng

## Đồng bộ giá SNKRDUNK
- [x] Thêm snkrdunkUrl và snkrdunkLastSyncedAt vào products, tạo và áp dụng migration
- [x] Tạo adapter SNKRDUNK: validate URL sản phẩm, fetch HTML, parse giá công khai không giả lập
- [x] Thêm backend lưu URL, đồng bộ marketPrice, price_history và activity_logs
- [x] Thêm tRPC updateSnkrdunkUrl, syncSnkrdunkPrice và syncAllSnkrdunk
- [x] Cập nhật Marketplace UI: gắn URL, đồng bộ riêng/tất cả, mở link, trạng thái và lỗi rõ ràng
- [x] Viết test parser, URL danh mục/không hợp lệ và trường hợp không có giá
- [x] Chạy typecheck, test, build và xác minh luồng đồng bộ trước khi lưu checkpoint
- [x] Kiểm thử adapter với URL SNKRDUNK công khai: trang chỉ có USD bị từ chối, không ghi giá giả lập
- [x] Xác nhận bulk sync không có URL trả về skippedCount và không làm thay đổi dữ liệu hiện có

## Quy tắc lấy giá lựa chọn đầu tiên SNKRDUNK
- [x] Parser phải lấy đúng giá lựa chọn đầu tiên, ví dụ 1個 (99+) ¥13.300, không lấy giá lựa chọn 2, 3 hoặc giá thấp nhất khác
- [x] Thêm test HTML/JSON có nhiều lựa chọn để xác nhận luôn trả về lựa chọn đầu tiên
- [x] Chạy typecheck, test, build và lưu checkpoint sau khi sửa
- [x] Lưu checkpoint mới sau khi sửa quy tắc lấy giá lựa chọn đầu tiên SNKRDUNK

## Fix lỗi Marketplace không tìm thấy giá SNKRDUNK
- [x] Kiểm tra HTML/API công khai và xác định vì sao giá lựa chọn đầu tiên không được parser đọc
- [x] Sửa adapter để đọc đúng nguồn giá công khai, không dùng giá giả lập hoặc đổi USD thành JPY
- [x] Thêm test hồi quy cho cấu trúc HTML/API gây lỗi và chạy lại typecheck, test, build

## Nâng cấp giao diện Marketplace
- [x] Thêm khu vực tổng quan chỉ số: tổng sản phẩm, đã đồng bộ, chưa gắn link và cảnh báo lỗi
- [x] Thêm bộ lọc trạng thái và tìm kiếm sản phẩm
- [x] Chuyển danh sách sang bảng sản phẩm rõ hơn với giá mua, giá thị trường, chênh lệch và ROI
- [x] Hiển thị trạng thái đồng bộ, thời điểm cập nhật và lỗi theo sản phẩm
- [x] Thêm modal tiến trình đồng bộ hàng loạt nhưng giữ nguyên logic sync SNKRDUNK hiện tại
- [x] Kiểm tra responsive, test, build và lưu checkpoint
- [x] Hiển thị lỗi đồng bộ inline theo từng sản phẩm, không chỉ qua toast hoặc modal bulk
- [x] Kiểm tra Marketplace ở mobile/tablet và lưu checkpoint mới sau redesign
- [x] Thay bảng ngang bằng card Marketplace gọn trên mobile để không cắt cột và vẫn giữ đủ thao tác
- [x] Lưu checkpoint mới sau bản redesign Marketplace (inline error, card mobile/tablet, test và build)

## Đồng bộ giá Card theo hạng A SNKRDUNK
- [x] Giữ nguyên luồng đồng bộ hiện tại cho Marketplace và Box/Pack
- [x] Với sản phẩm Card, ưu tiên lấy giá hạng A (Aあり) của lựa chọn đầu tiên
- [x] Bổ sung test Card có nhiều hạng và xác nhận không lấy giá B/PSA hoặc hạng khác
- [x] Chạy typecheck, test, build và lưu checkpoint mới

## Khắc phục phản hồi mặc định của Trợ lý AI
- [x] Sửa luồng trích xuất nội dung invokeLLM để AI suy luận theo câu hỏi thay vì trả về câu mặc định
- [x] Bổ sung kiểm thử hồi quy cho phản hồi AI và xác minh build trước khi lưu checkpoint

## System prompt phân tích sâu cho Trợ lý AI
- [x] Tách system prompt thành hằng số dễ bảo trì với quy trình phân tích Card 5 bước
- [x] Bổ sung kiểm thử prompt và xác minh build trước khi lưu checkpoint

## Cập nhật rarity Card
- [x] Thay tùy chọn rarity UR thành MUR trong form quản lý Card và xác minh hiển thị/lưu dữ liệu

## Badge rarity Card
- [x] Thêm badge rarity màu riêng, dễ đọc và dùng chung cho các vị trí hiển thị Card

## Thống kê và sắp xếp rarity Card
- [x] Bổ sung RR và R vào taxonomy rarity cùng thứ tự MUR → SAR → AR → RR → R
- [x] Thêm sắp xếp Card theo rarity, ROI và giá thị trường
- [x] Hiển thị tổng số lượng Card theo từng rarity trên Dashboard
- [x] Thêm kiểm thử số liệu/thứ tự và xác minh build trước khi lưu checkpoint

## Rarity One Piece
- [x] Thêm One Piece vào taxonomy rarity với badge phát sáng tương tự MUR, sắp xếp và thống kê

## Rarity theo series
- [x] Tách danh sách rarity riêng theo series Pokémon và One Piece trong form Card
- [x] Cập nhật màu AR xanh lá, giữ RR/R và One Piece theo bảng màu đã thống nhất
- [x] Thêm kiểm thử form, dữ liệu cũ, sắp xếp/Dashboard và xác minh build trước khi lưu checkpoint

## Sửa rarity Card
- [x] Thêm trường chỉnh sửa rarity theo series vào form sửa Card và kiểm thử lưu dữ liệu

## Khôi phục và mở rộng Chyusen
- [x] Rà soát PRD, kỹ năng và mã Chyusen hiện có; xác định phạm vi khôi phục an toàn
- [x] Khôi phục mục Sidebar, trang danh sách và quản lý trạng thái Chyusen cốt lõi
- [x] Mở rộng form/preview nhập link công khai với thông tin trích xuất có mức tin cậy và xác nhận người dùng
- [x] Thiết lập theo dõi tự động 6 giờ/lần, trạng thái kết quả, nhắc hạn/nhắc công bố và luồng chuyển Chyusen trúng sang Mua Hàng có xác nhận
- [x] Bổ sung kiểm thử, kiểm tra responsive và lưu checkpoint sau khi hoàn tất phạm vi đã xác nhận
- [x] Thêm kiểm thử hồi quy monitor, notification và luồng chuyển Chyusen trúng sang Mua Hàng

## Notification Center và theo dõi Chyusen nâng cao
- [x] Hoàn tất rà soát PRD Phần 8 và mô hình notification đa nguồn
- [x] Thêm Notification Center ở Header, trang tất cả thông báo, bộ lọc, đọc/xóa và đánh dấu tất cả đã đọc
- [x] Bổ sung nguồn theo dõi Chyusen có bật/tắt, kiểm tra URL và tần suất riêng 1/3/6/12/24 giờ
- [x] Hoàn thiện chống trùng Chyusen theo URL, product ID (nếu có), tên/shop và lịch đăng ký cho cả tạo/cập nhật/import
- [x] Hoàn thiện audit log nguồn theo từng source/entry và kiểm thử ghi history khi nội dung thay đổi
- [x] Mở rộng nhắc 7d/3d/24h/12h/3h/1h theo cấu hình người dùng
- [x] Thêm kiểm thử hồi quy và xác minh responsive cho Notification Center/Chyusen
- [x] Cập nhật lịch monitor nền sang mỗi giờ để hỗ trợ tần suất riêng từng nguồn, rồi lưu checkpoint bàn giao

## Sửa nguồn theo dõi Chyusen
- [x] Thêm nút Sửa và form cập nhật URL, nhãn, trạng thái/tần suất cho từng nguồn theo dõi
- [x] Kiểm thử cập nhật nguồn, xác minh build và lưu checkpoint

## Xóa nguồn theo dõi Chyusen
- [x] Thêm nút xóa và hộp xác nhận cho từng nguồn theo dõi
- [x] Kiểm thử quyền xóa, build và lưu checkpoint

## Đồng bộ giá Marketplace tự động
- [x] Hiển thị rõ trạng thái và tóm tắt lần chạy đồng bộ tự động trên Marketplace
- [x] Bổ sung kiểm thử ghi giá trực tiếp không ghi đè giá cũ khi nguồn lỗi, xác minh lịch 6 giờ và lưu checkpoint cuối

## Trang Cài đặt
- [x] Thêm mục Cài đặt vào sidebar và tạo route trang cài đặt riêng
- [x] Chuyển cài đặt nhắc hạn, nguồn theo dõi và tần suất Chyusen ra khỏi trang quản lý chính
- [x] Kiểm thử điều hướng, responsive và lưu checkpoint

## Hoàn thiện nguồn theo dõi trong Cài đặt
- [x] Thêm nút Lưu rõ ràng cho URL/tên/tần suất từng nguồn
- [x] Thêm nút Xóa với hộp xác nhận từ trang Cài đặt
- [x] Bổ sung kiểm thử payload Lưu, xác minh UI desktop/mobile và checkpoint sau bản sửa

## Cài đặt kiểm tra nguồn và Marketplace
- [x] Thêm nút Kiểm tra ngay cho từng nguồn Chyusen với trạng thái/lỗi lần chạy gần nhất
- [x] Thêm cấu hình auto-sync Marketplace vào trang Cài đặt, giữ lịch 6 giờ và nút thủ công
- [x] Kiểm thử thao tác, lỗi nguồn, desktop/mobile và lưu checkpoint

## Ưu tiên cấu hình Marketplace trong Cài đặt
- [x] Chuyển thẻ Đồng bộ giá Marketplace lên trước danh sách nguồn theo dõi và xác minh responsive

## Tối ưu quản lý nguồn và đồng bộ Marketplace
- [x] Thêm thu gọn/mở rộng danh sách nguồn theo dõi để giảm chiều dài trang Cài đặt
- [x] Thêm bộ lọc nhanh chỉ hiển thị nguồn Chyusen đang lỗi
- [x] Thêm nút Đồng bộ ngay Marketplace, tái sử dụng luồng đồng bộ thủ công hiện có và hiển thị kết quả
- [x] Kiểm thử API, giao diện desktop/mobile và lưu checkpoint

## Cải thiện điều hướng di động
- [x] Tăng kích thước biểu tượng và vùng chạm nút mở sidebar ở góc trên bên trái trên mobile
- [x] Xác minh mobile và lưu checkpoint

## Cử chỉ và chuyển động sidebar di động
- [x] Thêm vuốt từ mép trái để mở sidebar trên mobile, không cản trở thao tác cuộn nội dung
- [x] Thêm hiệu ứng mở/đóng sidebar mượt mà và tôn trọng tùy chọn giảm chuyển động
- [x] Kiểm thử cử chỉ, desktop/mobile và lưu checkpoint

## Nền xám than cho giao diện
- [x] Thay nền trắng bằng tông xám than theo ảnh tham chiếu và cập nhật màu surface/viền/chữ
- [x] Xác minh độ tương phản desktop/mobile, kiểm thử và lưu checkpoint

## Tinh gọn chú giải Lịch sử
- [x] Xóa dòng chú giải Màu chi tiết: Xóa / Sửa / Mua / Bán, giữ nhãn màu trên từng hoạt động
- [x] Kiểm thử giao diện và lưu checkpoint

## Bộ lọc Đồng Bộ Auto trong Lịch sử
- [x] Thêm mục Đồng Bộ Auto sau Tất cả và trước Kho hàng
- [x] Loại hoạt động đồng bộ giá SNKRDUNK khỏi Tất cả, chỉ hiển thị trong Đồng Bộ Auto
- [x] Kiểm thử lọc và lưu checkpoint

## Đổi nhãn bộ lọc đồng bộ
- [x] Đổi nhãn Đồng Bộ Auto thành Đồng Bộ, giữ nguyên điều kiện lọc SNKRDUNK
- [x] Xác minh và lưu checkpoint

## Hoàn thiện lưu Chyusen thủ công
- [x] Thêm toast lưu thủ công thành công và validation rõ ràng cho ngày hết hạn, ngày công bố
- [x] Bỏ ngày nhận hàng kết thúc; đổi ngày nhận hàng bắt đầu thành Ngày nhận hàng với lựa chọn ghi chú thời điểm linh hoạt
- [x] Bỏ dòng ảnh sản phẩm khỏi form thủ công
- [x] Thêm tải ảnh và AI trích xuất nội dung để gợi ý điền form Chyusen
- [x] Kiểm thử dữ liệu, UI desktop/mobile và lưu checkpoint

## Nhận diện dữ liệu AI điền trong Chyusen
- [x] Làm nổi bật các trường được AI tự điền và hiển thị trạng thái cần kiểm tra
- [x] Thêm thao tác chỉnh sửa nhanh cho trường AI điền
- [x] Kiểm thử desktop/mobile và lưu checkpoint

## Kiểm soát AI và tín hiệu Chyusen
- [x] Thêm chấp nhận tất cả và hoàn tác dữ liệu AI điền trong form
- [x] Hiển thị mức độ tin cậy theo từng trường AI
- [x] Đổi khối lưu ý nguồn/captcha sang cảnh báo đỏ nổi bật
- [x] Đổi Đã trúng từ tím sang vàng, sau thao tác chuyển sang đỏ
- [x] Kiểm thử desktop/mobile và lưu checkpoint

## Xác nhận trạng thái Đã trúng
- [x] Thêm hộp thoại xác nhận trước khi chuyển Chyusen sang Đã trúng
- [x] Kiểm thử thao tác desktop/mobile và lưu checkpoint

## Tương phản menu thao tác kho
- [x] Đổi biểu tượng ba chấm dọc sửa/xóa Card, Box, Pack sang màu trắng và giữ hover/focus rõ ràng
- [x] Kiểm thử desktop/mobile và lưu checkpoint

## Menu kho và form Chyusen gọn hơn
- [x] Tăng vùng chạm menu ba chấm lên 44 px trên mobile và thêm tooltip Tùy chọn
- [x] Thay xác nhận xóa sản phẩm bằng hộp thoại an toàn
- [x] Bỏ trường Tên chương trình trong form Chyusen và tự dùng tên sản phẩm làm tiêu đề
- [x] Thêm Bandai Premium, Pokémon Center, Rakuten vào danh sách cửa hàng Chyusen
- [x] Kiểm thử desktop/mobile và lưu checkpoint

## Sửa Trợ lý AI trên điện thoại và tiền tệ
- [x] Sửa modal Trợ lý AI responsive trên mobile, tránh tràn nội dung và giữ ô nhập luôn thao tác được
- [x] Chuẩn hóa system prompt và hiển thị phân tích AI sang ¥ (JPY), không dùng VNĐ
- [x] Kiểm thử mobile và lưu checkpoint

## Khung AI mobile và sao chép trả lời
- [x] Bảo đảm khung Trợ lý AI mobile không bị che khi phản hồi dài, chỉ vùng nội dung được cuộn
- [x] Thêm nút sao chép cho từng câu trả lời của trợ lý AI
- [x] Kiểm thử mobile với nội dung dài và lưu checkpoint

## Nơi bán mặc định
- [x] Thêm Người Dùng vào lựa chọn Nơi bán và đặt mặc định cho giao dịch bán mới
- [x] Kiểm thử form bán hàng và lưu checkpoint

## Chế độ hiển thị Card, Box và Pack
- [x] Thêm chuyển đổi giữa dạng thẻ ảnh và dạng danh sách cho sản phẩm
- [x] Giữ thao tác sửa, upload ảnh, xóa, lọc và sắp xếp trong hai chế độ
- [x] Kiểm thử desktop/mobile và lưu checkpoint

## Cá nhân hóa danh sách sản phẩm
- [x] Ghi nhớ chế độ Thẻ ảnh / Danh sách theo thiết bị
- [x] Thêm chọn cột hiển thị cho danh sách Card, Box và Pack
- [x] Xuất danh sách sản phẩm ra CSV theo dữ liệu và cột đang chọn
- [x] Kiểm thử desktop/mobile, tệp CSV và lưu checkpoint

## Tinh gọn thanh công cụ sản phẩm
- [x] Bỏ nút Xuất CSV, giữ chế độ hiển thị và chọn cột
- [x] Xác minh giao diện và lưu checkpoint

## Danh sách sản phẩm cô đọng
- [x] Bỏ ảnh và giảm chiều cao hàng trong chế độ Danh sách
- [x] Chỉ hiển thị tên, loại và các cột người dùng đang chọn
- [x] Kiểm thử desktop/mobile và lưu checkpoint

## Biểu tượng menu cột danh sách
- [x] Đổi nút chọn cột phía sau chế độ Danh sách thành ba chấm dọc
- [x] Xác minh giao diện và lưu checkpoint

## Tổng quan trạng thái Chyusen
- [x] Bỏ ô Đang đăng ký khỏi Dashboard Chyusen
- [x] Gộp đã đăng ký vào Chờ kết quả và sắp xếp Chờ kết quả → Sắp hết hạn → Đã trúng → Đã trượt
- [x] Kiểm thử Dashboard desktop/mobile và lưu checkpoint

## Nhắc hạn Chyusen một ngày
- [x] Đếm Chyusen còn một ngày hoặc ít hơn trong ô Sắp hết hạn
- [x] Kiểm thử mốc thời gian và lưu checkpoint

## Đếm hạn Chyusen theo ngày Nhật Bản
- [x] Tính Sắp hết hạn theo ngày lịch JST để hạn ngày mai được đếm từ hôm nay
- [x] Kiểm thử mốc ngày 13 → hạn ngày 14 và lưu checkpoint

## Chỉ báo hạn ngày mai
- [x] Hiển thị Còn 1 ngày trong ô Sắp hết hạn khi có Chyusen hạn ngày mai
- [x] Kiểm thử Dashboard và lưu checkpoint

## Chỉ báo hạn chót hôm nay
- [x] Hiển thị Hôm nay là hạn cuối trong ô Sắp hết hạn khi có Chyusen hạn chót hôm nay
- [x] Kiểm thử Dashboard và lưu checkpoint

## Đồng bộ đếm hạn Chyusen
- [x] Sửa Dashboard để đếm Chyusen hiện Hôm nay là hạn cuối trong ô Sắp hết hạn
- [x] Kiểm thử mốc hạn hôm nay theo JST và lưu checkpoint

## Thao tác nhanh Dashboard Chyusen
- [x] Cho phép bấm các ô Chyusen trên Dashboard để mở danh sách đã lọc
- [x] Hiển thị chương trình có hạn đăng ký gần nhất trong ô Sắp hết hạn
- [x] Kiểm thử luồng lọc, giao diện và lưu checkpoint

## Cảnh báo Chyusen sắp hết hạn
- [x] Thêm nút Đăng ký ngay cho chương trình có hạn gần nhất trên Dashboard
- [x] Làm nổi bật ô Sắp hết hạn khi có Chyusen cần chú ý
- [x] Kiểm thử thao tác và lưu checkpoint

## Màu tổng quan Marketplace
- [x] Đổi bốn ô tổng quan Marketplace sang bảng màu tối phù hợp nền đen xám
- [x] Kiểm thử giao diện Marketplace và lưu checkpoint

## Tinh chỉnh màu tổng quan Marketplace
- [x] Đổi màu ô Tổng sản phẩm để phân biệt rõ hơn
- [x] Đổi ô Đã đồng bộ sang xanh lá rõ ràng
- [x] Kiểm thử giao diện Marketplace và lưu checkpoint

## Tương tác tổng quan Marketplace
- [x] Thêm hover và focus rõ ràng cho bốn ô thống kê Marketplace
- [x] Cho phép bấm ô để lọc danh sách Tổng sản phẩm, Đã đồng bộ, Chờ đồng bộ, Chưa gắn link
- [x] Kiểm thử bộ lọc và lưu checkpoint

## Lưu bộ lọc Marketplace
- [x] Thêm nút Xóa bộ lọc để trở về toàn bộ danh sách
- [x] Lưu và khôi phục bộ lọc Marketplace gần nhất theo thiết bị
- [x] Kiểm thử khôi phục bộ lọc và lưu checkpoint

## Trạng thái và phím tắt Marketplace
- [x] Hiển thị nhãn bộ lọc và từ khóa đang áp dụng
- [x] Thêm phím Esc để xóa nhanh bộ lọc Marketplace
- [x] Lưu và khôi phục từ khóa tìm kiếm Marketplace gần nhất
- [x] Kiểm thử thao tác và lưu checkpoint

## Kỹ năng Marketplace tương tác
- [x] Đóng gói quy trình giao diện Marketplace tối, tương tác và bộ lọc được ghi nhớ thành kỹ năng tái sử dụng
- [x] Xác thực kỹ năng và bàn giao tệp SKILL.md

## Rà soát kỹ năng Marketplace
- [x] Kiểm tra phạm vi kích hoạt, hướng dẫn và tính tái sử dụng của Interactive Marketplace Filters
- [x] Tối ưu kỹ năng nếu cần, xác thực và bàn giao lại

## Lịch sử biến động giá Marketplace
- [x] Rà soát dữ liệu price history hiện có và thiết kế API theo sản phẩm
- [x] Thêm biểu đồ lịch sử giá vào Marketplace
- [x] Kiểm thử dữ liệu, API, biểu đồ và lưu checkpoint

## Bộ lọc và biến động giá Marketplace
- [x] Thêm bộ lọc 7 ngày, 30 ngày và 90 ngày vào biểu đồ lịch sử giá
- [x] Hiển thị biến động 24 giờ bằng mũi tên xanh đỏ trong bảng Marketplace
- [x] Kiểm thử dữ liệu, giao diện và lưu checkpoint

## Nâng cấp Thùng rác
- [x] Hiển thị toast thành công khi khôi phục mục từ Thùng rác
- [x] Thêm tìm kiếm và lọc theo ngày xóa trong Thùng rác
- [x] Thêm Làm sạch thùng rác với xác nhận xóa vĩnh viễn
- [x] Kiểm thử luồng khôi phục, lọc và dọn sạch trước khi lưu checkpoint

## Thao tác hàng loạt Thùng rác
- [x] Thêm checkbox chọn nhiều mục và chọn tất cả mục đang hiển thị
- [x] Thêm khôi phục hàng loạt các mục đã chọn
- [x] Thêm xóa vĩnh viễn hàng loạt với xác nhận an toàn
- [x] Kiểm thử thao tác hàng loạt và lưu checkpoint

## Sửa giao diện di động Thùng rác và Marketplace
- [x] Thu gọn và sửa hiển thị ô lọc ngày Thùng rác trên điện thoại
- [x] Sửa hiển thị hộp thoại Lịch sử giá Marketplace trên điện thoại
- [x] Kiểm thử desktop/mobile và lưu checkpoint

## Chuẩn hóa nút đóng
- [x] Tạo kiểu nút đóng X đỏ dùng chung cho giao diện
- [x] Áp dụng nút đóng chuẩn cho các hộp thoại và bảng nổi phù hợp
- [x] Kiểm thử desktop/mobile và lưu checkpoint

## Vùng chạm nút đóng mobile
- [x] Tăng vùng chạm nút đóng X lên 44 px trên điện thoại
- [x] Kiểm thử hiển thị và lưu checkpoint

## Tinh chỉnh kích thước giao diện
- [x] Thu gọn ô ngày tháng Thùng rác bằng ô Tất cả dữ liệu
- [x] Đưa nút đóng X đỏ về kích thước mặc định
- [x] Kiểm thử mobile và lưu checkpoint

## Lọc thời gian Thùng rác
- [x] Hiển thị nhãn Ngày xóa khi chưa chọn ngày
- [x] Thêm lọc nhanh mục đã xóa trong tuần và tháng này
- [x] Kiểm thử giao diện và lưu checkpoint

## Hoàn thiện bộ lọc Thùng rác
- [x] Lưu và khôi phục bộ lọc Thùng rác gần nhất theo thiết bị
- [x] Thêm badge lọc nhanh theo loại dữ liệu
- [x] Hiển thị số lượng mục theo Tuần này và Tháng này
- [x] Kiểm thử desktop/mobile và lưu checkpoint

## Tự động dọn Thùng rác
- [x] Thêm cấu hình số ngày lưu giữ và bật/tắt tự động dọn theo tài khoản
- [x] Thêm tác vụ nền dọn dữ liệu quá hạn với kiểm soát quyền truy cập
- [x] Thêm giao diện cấu hình trong Cài đặt
- [x] Kiểm thử tác vụ, cấu hình và lưu checkpoint

## Nâng cấp AI Chyusen
- [x] Rà soát chất lượng đọc ảnh và liên kết Chyusen hiện tại
- [x] Nâng cấp trích xuất ngày tiếng Nhật, dữ liệu nguồn và độ tin cậy theo trường
- [x] Kiểm thử ảnh/liên kết và lưu checkpoint

## Bổ sung Series Dragon Ball
- [x] Thêm Dragon Ball vào danh sách Series dùng chung trên tất cả biểu mẫu
- [x] Kiểm thử hiển thị Series và lưu checkpoint

## Bổ sung Series Yu-Gi-Oh!
- [x] Thêm Yu-Gi-Oh! vào danh sách Series dùng chung trên tất cả biểu mẫu
- [x] Kiểm thử hiển thị Series và lưu checkpoint

## Bằng chứng và nhiều ảnh AI Chyusen
- [x] Hiển thị đoạn bằng chứng nguồn cho từng trường AI Chyusen
- [x] Thêm so sánh dữ liệu AI với dữ liệu đang nhập trước khi áp dụng
- [x] Hỗ trợ tải và hợp nhất nhiều ảnh thông báo Chyusen
- [x] Thêm hiệu ứng RGB tinh tế cho logo TCG Manager
- [x] Kiểm thử AI Chyusen, logo desktop/mobile và lưu checkpoint

## Sửa lỗi đọc ảnh AI Chyusen
- [x] Tái hiện lỗi với ảnh thông báo Chyusen rõ nét người dùng cung cấp
- [x] Sửa lỗi tải/đọc ảnh và thêm hồi quy cho ảnh rõ nét
- [x] Kiểm thử lại biểu mẫu Chyusen và lưu checkpoint

## Trạng thái AI và hoàn tác Đã trúng
- [x] Hiển thị AI đang thử lại khi luồng đọc ảnh thực hiện lần xử lý dự phòng
- [x] Thêm nút hoàn tác an toàn cho Chyusen đã trúng do bấm nhầm
- [x] Kiểm thử trạng thái AI và hoàn tác, sau đó lưu checkpoint

## Ràng buộc kết quả Chyusen và Tổng quan
- [x] Chặn đánh dấu Đã trúng trước ngày công bố kết quả ở UI và API
- [x] Làm mới chỉ số Tổng quan sau cập nhật, hoàn tác và xóa Chyusen
- [x] Kiểm thử ràng buộc ngày công bố và lưu checkpoint

## Nhắc ngày công bố Chyusen
- [x] Hiển thị nhắc nhở khi Chyusen đến ngày công bố kết quả
- [x] Kiểm thử nhận diện ngày công bố và lưu checkpoint

## Tự chuyển Chyusen hoàn tất vào Thùng rác
- [x] Chuyển Chyusen Đã trượt vào Thùng rác tự động
- [x] Chuyển Chyusen đã xác nhận mua vào Thùng rác tự động
- [x] Kiểm thử luồng, Thùng rác và thống kê rồi lưu checkpoint

## Tối ưu AI và QR Chyusen
- [x] Tối ưu luồng đọc ảnh AI để phản hồi nhanh hơn
- [x] Quét mã QR từ ảnh và hiển thị liên kết cần xác nhận
- [x] Kiểm thử tốc độ, QR và lưu checkpoint

## Cửa hàng QR và làm mới bằng vuốt
- [x] Tự nhận diện và điền cửa hàng từ URL QR Chyusen đáng tin cậy
- [x] Thêm vuốt xuống để làm mới dữ liệu trên toàn ứng dụng
- [x] Kiểm thử desktop/mobile và lưu checkpoint

## Xem trước QR Chyusen
- [x] Thêm xem trước nội dung QR, cửa hàng và liên kết trước khi áp dụng
- [x] Kiểm thử xem trước QR desktop/mobile và lưu checkpoint

## Lịch sử hoạt động Chyusen
- [x] Ghi các thao tác tạo, cập nhật trạng thái, hoàn tác và xóa Chyusen vào Lịch sử
- [x] Hiển thị/bộ lọc đúng các hoạt động Chyusen trong trang Lịch sử
- [x] Kiểm thử hồi quy và lưu checkpoint

## Vuốt làm mới biểu mẫu Chyusen
- [x] Tắt vuốt xuống làm mới khi màn hình Thêm/Sửa Chyusen đang mở
- [x] Kiểm thử thao tác biểu mẫu và lưu checkpoint

## Ẩn tạm thời sản phẩm hết hàng
- [x] Ẩn Card, Box và Pack có tồn kho bằng 0 khỏi danh sách sản phẩm chính
- [x] Tự hiển thị lại sản phẩm khi giao dịch Mua Hàng làm tồn kho lớn hơn 0
- [x] Giữ sản phẩm đã ẩn trong gợi ý khi tạo giao dịch Mua Hàng
- [x] Bổ sung kiểm thử hồi quy và xác minh giao diện desktop/mobile

## Bộ lọc sản phẩm đã ẩn trong Kho Hàng
- [x] Thêm lựa chọn Đã ẩn để xem sản phẩm hết hàng trong trang Kho Hàng
- [x] Hiển thị trạng thái và thông điệp trống phù hợp cho bộ lọc Đã ẩn
- [x] Bổ sung kiểm thử hồi quy, xác minh desktop/mobile và lưu checkpoint

## Nhãn và số lượng sản phẩm đã bán
- [x] Đổi toàn bộ nhãn Đã ẩn trong Kho Hàng thành Đã bán
- [x] Hiển thị số lượng sản phẩm hết hàng trong nhãn bộ lọc Đã bán
- [x] Bổ sung kiểm thử, xác minh giao diện và lưu checkpoint

## Hiệu ứng RGB chạy ngang cho logo
- [x] Cập nhật logo TCG Manager với gradient RGB chạy từ trái sang phải
- [x] Giữ khả năng đọc và tôn trọng chế độ giảm chuyển động
- [x] Kiểm thử giao diện desktop/mobile và lưu checkpoint

## Cài đặt và tiêu đề hiệu ứng RGB
- [x] Thêm tùy chọn bật/tắt hiệu ứng RGB trong trang Cài đặt và lưu theo thiết bị
- [x] Áp dụng hiệu ứng RGB có thể tắt cho logo TCG Manager và tiêu đề chính các trang
- [x] Kiểm thử cài đặt, desktop/mobile và lưu checkpoint

## Tốc độ hiệu ứng RGB
- [x] Thêm lựa chọn Chậm, Bình thường và Nhanh trong Cài đặt
- [x] Lưu tốc độ theo thiết bị và áp dụng ngay cho logo cùng tiêu đề
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Xem trước hiệu ứng RGB
- [x] Thêm khu vực xem trước RGB trong trang Cài đặt
- [x] Phản chiếu trạng thái bật/tắt và tốc độ RGB đang chọn trong bản xem trước
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Đặt lại mặc định hiệu ứng RGB
- [x] Thêm nút Đặt lại mặc định trong thẻ Hiệu ứng RGB
- [x] Khôi phục trạng thái bật và tốc độ Bình thường ngay lập tức
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Bảng màu gradient RGB
- [x] Thêm bộ chọn bảng màu gradient trong Cài đặt
- [x] Lưu bảng màu theo thiết bị và áp dụng cho logo, tiêu đề, bản xem trước
- [x] Mở rộng Đặt lại mặc định để khôi phục bảng màu mặc định
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Nền đăng nhập và logo màn hình chính
- [x] Dùng ảnh Pokémon người dùng cung cấp làm nền màn hình đăng nhập
- [x] Đổi chữ POKÉMON tại logo màn hình chính thành TCG Manager
- [x] Liên kết logo chính với bảng màu và tốc độ RGB đang chọn
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Bố cục và chuyển cảnh đăng nhập RGB
- [x] Đưa logo TCG Manager về phía trên ô TCG Manager v1.0
- [x] Thêm chuyển cảnh phát sáng theo bảng màu RGB khi bấm Bắt đầu
- [x] Tôn trọng chế độ giảm chuyển động và kiểm thử desktop/mobile
- [x] Lưu checkpoint sau khi xác minh

## Tinh chỉnh logo đăng nhập responsive
- [x] Nâng logo TCG Manager lên nhẹ phía trên ô phiên bản
- [x] Giữ logo TCG Manager một dòng trên điện thoại và máy tính
- [x] Kiểm thử desktop/mobile và lưu checkpoint

## Tương tác và nền đăng nhập tùy chỉnh
- [x] Thêm hiệu ứng hover phóng to/phát sáng cho logo TCG Manager ở đăng nhập
- [x] Cải thiện chỉ báo đang xử lý sau khi bấm nút Bắt đầu
- [x] Thêm tải ảnh nền đăng nhập tùy chỉnh từ trang Cài đặt
- [x] Lưu nền tùy chỉnh theo thiết bị và cho phép khôi phục nền mặc định
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Chỉnh nền và thu gọn Cài đặt
- [x] Thêm xem trước, cắt ảnh tỷ lệ nền và điều chỉnh độ tối trước khi tải nền
- [x] Lưu danh sách hình nền gần đây để chuyển đổi nhanh
- [x] Thu gọn/mở rộng riêng từng mục Cài đặt và lưu trạng thái theo thiết bị
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Cụm đăng nhập v1.1 và quản lý nền gần đây
- [x] Đổi logo đăng nhập thành TCG MANAGER và nâng cụm nội dung lên cao hơn
- [x] Bỏ ô TCG Manager v1.0, đưa nút Bắt đầu lên và hiển thị Phiên bản v1.1
- [x] Thêm nút xóa riêng cho từng nền gần đây và xử lý nền đang được chọn
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Xác nhận xóa nền gần đây
- [x] Thêm hộp thoại xác nhận trước khi xóa từng nền đăng nhập gần đây
- [x] Chỉ xóa nền khỏi danh sách sau khi người dùng xác nhận
- [x] Bổ sung kiểm thử và lưu checkpoint

## Khoảng cách đăng nhập và nền ngẫu nhiên hằng ngày
- [x] Tăng khoảng cách giữa logo TCG MANAGER và nút Bắt đầu khoảng 1 cm
- [x] Thêm tùy chọn đổi nền đăng nhập ngẫu nhiên theo ngày từ danh sách đã tải
- [x] Lưu tùy chọn theo thiết bị và xử lý khi chưa có nền tùy chỉnh
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Fade nền và vòng quay ảnh hằng ngày
- [x] Thêm hiệu ứng fade mượt khi nền đăng nhập được áp dụng
- [x] Cho phép chọn hoặc loại trừ từng nền khỏi vòng quay hằng ngày
- [x] Lưu lựa chọn ảnh theo thiết bị và có phương án dự phòng khi không còn ảnh hợp lệ
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Nhãn Mở/Thu gọn Cài đặt trên điện thoại
- [x] Đặt nhãn Mở/Thu gọn sát góc phải mỗi mục Cài đặt
- [x] Bảo đảm tiêu đề và mô tả không bị nhãn che trên màn hình hẹp
- [x] Bổ sung kiểm thử, xác minh mobile và lưu checkpoint

## Bộ lọc Kho Hàng và đọc ảnh Chyusen
- [x] Cho bộ lọc Tất cả trong Kho Hàng hiển thị cả sản phẩm đã bán
- [x] Giữ từng bộ lọc trạng thái chỉ hiển thị sản phẩm đúng trạng thái được chọn
- [x] Tách lựa chọn Đọc thông tin từ ảnh và Quét mã QR trong Chyusen
- [x] Bảo đảm Quét mã QR vẫn phân tích đầy đủ nội dung toàn bộ ảnh
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Quét QR từ camera Chyusen
- [x] Mở camera sau khi người dùng chủ động chọn Quét QR từ camera
- [x] Quét QR liên tục, hiển thị liên kết để người dùng xác nhận trước khi áp dụng
- [x] Thông báo rõ khi quyền camera bị từ chối hoặc thiết bị không hỗ trợ
- [x] Dừng camera an toàn khi đóng form hoặc dialog quét
- [x] Bổ sung kiểm thử, xác minh mobile và lưu checkpoint

## Tối ưu ảnh và vùng QR Chyusen
- [x] Nâng giới hạn lên 10 MB mỗi ảnh và điều chỉnh giới hạn tổng an toàn
- [x] Tối ưu nén ảnh thích ứng để gửi AI nhanh hơn trên điện thoại
- [x] Tự phát hiện, cắt vùng QR và gửi thêm vùng QR cho AI cùng ảnh đầy đủ
- [x] Bổ sung kiểm thử, xác minh mobile và lưu checkpoint

## Xem trước vùng QR cắt tự động
- [x] Hiển thị ảnh xem trước nhỏ của vùng QR nhận diện được
- [x] Giữ liên kết QR và ảnh đầy đủ trong luồng phân tích AI hiện tại
- [x] Bổ sung kiểm thử giao diện và lưu checkpoint

## Không tự bật bàn phím khi mở Thêm Chyusen
- [x] Bỏ autofocus khỏi ô nhập link khi mở form Thêm Chyusen
- [x] Giữ khả năng focus và nhập link khi người dùng chủ động chạm vào ô
- [x] Bổ sung kiểm thử mobile và lưu checkpoint

## Tự cuộn tới lỗi khi lưu Chyusen
- [x] Xác định trường lỗi đầu tiên sau khi xác thực biểu mẫu
- [x] Tự cuộn và focus vào trường lỗi đầu tiên sau khi bấm Lưu
- [x] Bổ sung kiểm thử mobile và lưu checkpoint

## Nhấn mạnh trường lỗi Chyusen
- [x] Thêm viền đỏ cho trường lỗi đầu tiên sau khi tự cuộn tới
- [x] Thêm hiệu ứng rung nhẹ và tôn trọng chế độ giảm chuyển động
- [x] Bổ sung kiểm thử giao diện và lưu checkpoint

## Tối ưu trang Chyusen và chỉ số Lợi nhuận
- [x] Bỏ thẻ Cài đặt Chyusen khỏi trang Chyusen, giữ cấu hình trong trang Cài đặt
- [x] Hiển thị Lợi nhuận dương màu xanh lá và Lợi nhuận âm màu đỏ trên Tổng quan
- [x] Giữ hiệu ứng RGB cho mức Lợi nhuận bằng 0
- [x] Bổ sung kiểm thử giao diện và lưu checkpoint

## Sắp xếp Chyusen theo hạn đăng ký
- [x] Đưa chương trình có hạn hôm nay lên đầu danh sách
- [x] Sắp xếp các hạn còn 1, 2 và nhiều ngày theo thứ tự tăng dần
- [x] Giữ thứ tự ổn định cho chương trình không có hạn hoặc đã có kết quả
- [x] Bổ sung kiểm thử và lưu checkpoint

## Giải thích chỉ số Tổng quan
- [x] Thêm biểu tượng i ở góc phải các khung chỉ số Tổng quan
- [x] Hiển thị công thức và các khoản cấu thành Tổng vốn, Giá trị hiện tại, Lợi nhuận và số lượng sản phẩm
- [x] Tăng nhẹ kích thước và đặt biểu tượng i sát góc phải từng khung
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Khắc phục API Chyusen trả HTML
- [x] Xác định nguyên nhân truy vấn Chyusen nhận HTML thay vì JSON
- [x] Khôi phục phản hồi JSON đúng chuẩn cho API Chyusen
- [x] Kiểm thử tải trang Chyusen và lưu checkpoint

## Xu hướng tháng trong Tổng quan
- [x] Tính phần trăm thay đổi có cơ sở dữ liệu so với tháng trước cho các chỉ số Tổng quan
- [x] Hiển thị chỉ báo tăng/giảm bên dưới từng số liệu, kèm trạng thái khi chưa đủ dữ liệu
- [x] Đưa biểu tượng i sát góc phải từng ô chỉ số Tổng quan
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Tinh gọn chỉ số Tổng quan
- [x] Giữ phần trăm thay đổi theo tháng dưới các chỉ số Tổng quan
- [x] Đưa biểu tượng i sát góc phải từng ô chỉ số
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và lưu checkpoint

## Nhãn menu Chyusen
- [x] Đổi nhãn menu bên trái thành 抽選 / Chūsen
- [x] Giữ nguyên các hiệu ứng và hành vi điều hướng hiện có
- [x] Bổ sung kiểm thử giao diện và lưu checkpoint

## Màu tóm tắt Chyusen
- [x] Đổi ô Chờ kết quả sang màu xanh lá
- [x] Đổi ô Sắp hết hạn sang màu vàng
- [x] Bổ sung kiểm thử giao diện và lưu checkpoint

## Hiệu ứng RGB cho rarity Card
- [x] Áp dụng hiệu ứng RGB đang chọn cho toàn bộ badge rarity trên Card
- [x] Giữ khả năng đọc và chế độ giảm chuyển động
- [x] Bổ sung kiểm thử giao diện và lưu checkpoint

## Độ rõ ô Đã trượt Chyusen
- [x] Đổi số liệu Đã trượt sang màu trắng trên nền tối
- [x] Bổ sung kiểm thử giao diện và lưu checkpoint

## Nền nguyên bản tóm tắt Chyusen
- [x] Giữ nền mặc định cho ô Chờ kết quả và Sắp hết hạn
- [x] Chỉ đổi màu số Chờ kết quả xanh lá, Sắp hết hạn vàng
- [x] Bổ sung kiểm thử giao diện và lưu checkpoint

## Chữ RGB cho nút hành động đỏ
- [x] Áp dụng hiệu ứng RGB cho chữ các nút hành động nền đỏ
- [x] Giữ nguyên nền đỏ, trạng thái hover và khả năng đọc nút
- [x] Bổ sung kiểm thử giao diện và lưu checkpoint

## Hiển thị Lợi nhuận theo trạng thái
- [x] Tô ký hiệu ¥-/¥+ đỏ khi âm và xanh lá khi dương
- [x] Áp dụng hiệu ứng RGB cho phần số tiền Lợi nhuận phía sau ký hiệu
- [x] Bổ sung kiểm thử giao diện và lưu checkpoint

## Hiệu ứng RGB cho tên người dùng
- [x] Áp dụng hiệu ứng RGB đang chọn cho tên người dùng trong thanh bên
- [x] Giữ email và thông tin phụ dễ đọc
- [x] Bổ sung kiểm thử giao diện và lưu checkpoint

## Màu rarity và số liệu Tổng quan
- [x] Đổi nền MUR vàng, SAR tím và AR trắng xám
- [x] Giữ hiệu ứng RGB cho chữ mọi rarity
- [x] Áp dụng hiệu ứng RGB cho Tổng vốn, Giá trị hiện tại và Tổng sản phẩm trong kho
- [x] Áp dụng số đỏ có animation cho Tổng sản phẩm đã bán
- [x] Bổ sung kiểm thử giao diện và lưu checkpoint

## Định dạng tiền và vùng tài khoản
- [x] Chuẩn hóa khoảng cách sau ký hiệu ¥ trước số tiền trên toàn ứng dụng
- [x] Tăng vùng tài khoản thanh bên để tên người dùng không bị che
- [x] Bổ sung kiểm thử giao diện desktop/mobile và lưu checkpoint

## Định dạng ký hiệu Yên phía sau số tiền
- [x] Chuyển toàn bộ ký hiệu ¥ ra sau số tiền, có khoảng cách rõ ràng
- [x] Giữ dấu âm đứng trước số tiền, màu đỏ và animation cho số âm
- [x] Bổ sung kiểm thử giao diện desktop/mobile và lưu checkpoint

## Cài đặt tiền tệ và bộ lọc bán hàng
- [x] Thêm tùy chọn vị trí ký hiệu tiền tệ trong Cài đặt
- [x] Áp dụng lựa chọn định dạng tiền tệ thống nhất trên toàn ứng dụng
- [x] Thêm bộ lọc khoảng ngày bán nhỏ gọn trên trang Bán hàng
- [x] Hiển thị tổng hợp số giao dịch, số lượng, doanh thu và chi tiết từng sản phẩm trong khoảng lọc
- [x] Bổ sung kiểm thử giao diện desktop/mobile và lưu checkpoint

## Giá vốn trong tổng kết bán hàng
- [x] Bổ sung giá vốn đã mua vào tổng kết giao dịch trong khoảng lọc
- [x] Hiển thị giá vốn, doanh thu và lợi nhuận cho từng sản phẩm đã bán
- [x] Bổ sung kiểm thử công thức tổng kết và lưu checkpoint

## Tinh chỉnh bộ lọc ngày bán
- [x] Thu gọn và căn giữa hai ô chọn ngày trên điện thoại
- [x] Thêm gợi ý Chọn ngày và bỏ biểu tượng lịch thừa
- [x] Kiểm thử giao diện desktop/mobile và lưu checkpoint

## Bộ lọc nhanh ngày bán
- [x] Thêm nút Hôm nay, Tuần này và Tháng này cạnh bộ lọc ngày
- [x] Hiển thị rõ trạng thái nút lọc nhanh đang chọn
- [x] Kiểm thử giao diện desktop/mobile và lưu checkpoint

## Tự chọn loại khi thêm sản phẩm
- [x] Tự chọn Card, Box hoặc Pack trong biểu mẫu Thêm mới theo trang đang mở
- [x] Hiển thị rõ loại đã chọn tự động và cho phép xác nhận trước khi lưu
- [x] Giữ biểu mẫu Mua hàng cho người dùng tự chọn loại
- [x] Kiểm thử giao diện desktop/mobile và lưu checkpoint

## Chuẩn hóa độ hiếm Card
- [x] Chuẩn hóa danh sách và thứ tự MUR, SAR, SR, AR, RR, R, ONEPICE, Promo, Khác
- [x] Bỏ các lựa chọn độ hiếm không còn sử dụng khỏi biểu mẫu và sắp xếp
- [x] Thêm badge Promo nền cyan chữ trắng RGB và Khác nền trắng chữ RGB
- [x] Kiểm thử sắp xếp và giao diện rồi lưu checkpoint

## Rank Card và giá SNKRDUNK theo rank
- [x] Thay Condition bằng Rank Card A, B, C, D trong biểu mẫu Card
- [x] Chuẩn hóa dữ liệu rank hiện có về Rank A–D
- [x] Đồng bộ giá SNKRDUNK thủ công và tự động theo rank của từng Card
- [x] Kiểm thử chọn đúng giá Rank A–D và lưu checkpoint

## Badge màu Rank Card
- [x] Tạo Rank A nền vàng, Rank B nền đỏ, Rank C nền xanh và Rank D nền đen
- [x] Áp dụng chữ RGB cho toàn bộ badge Rank Card
- [x] Hiển thị badge Rank Card trên Card và Marketplace
- [x] Kiểm thử giao diện desktop/mobile và lưu checkpoint

## Tinh giản loại trong biểu mẫu Thêm mới
- [x] Bỏ nhãn Tự chọn theo trang nhưng giữ bộ chọn loại Card/Box/Pack
- [x] Giữ tự chọn sẵn loại theo trang Card, Box hoặc Pack
- [x] Kiểm thử biểu mẫu và lưu checkpoint

## Tooltip và vị trí Rank Card
- [x] Hiển thị tooltip Rank Card với giá thị trường tương ứng khi di chuột hoặc focus
- [x] Đưa badge Rank Card sát sau tên mỗi sản phẩm Card
- [x] Kiểm thử giao diện desktop/mobile và lưu checkpoint

## Khoảng cách badge Rank Card
- [x] Tăng khoảng cách giữa tên sản phẩm và badge Rank Card
- [x] Kiểm thử bố cục desktop/mobile và lưu checkpoint

## Cài đặt tài khoản người dùng
- [x] Sửa lỗi accountSettingsOpen không xác định trong DashboardLayoutContent
- [x] Thêm nickname và ảnh đại diện tùy chỉnh cho từng người dùng
- [x] Thêm giao diện quản lý tài khoản và đồng bộ nickname/ảnh đại diện trên thanh bên
- [x] Hiển thị hướng dẫn bảo mật hoặc đổi mật khẩu đúng theo phương thức đăng nhập OAuth
- [x] Kiểm thử luồng cập nhật tài khoản và lưu checkpoint

## Tùy chỉnh avatar và lịch sử đăng nhập
- [x] Thêm bộ chọn màu viền ảnh đại diện và áp dụng trên thanh bên
- [x] Thêm cắt/chỉnh khung ảnh đại diện trước khi tải lên
- [x] Lưu và hiển thị lịch sử các lần đăng nhập gần nhất của từng người dùng
- [x] Kiểm thử luồng cài đặt tài khoản và lưu checkpoint

## Bộ lọc Kho hàng mặc định
- [x] Đặt bộ lọc Kho hàng là Tất cả khi mở trang lần đầu
- [x] Chỉ áp dụng trạng thái lọc khác khi người dùng chủ động chọn
- [x] Sắp xếp Tất cả theo Trong kho, Đang giữ, Đã bán, Hỏng/Rác
- [x] Kiểm thử bộ lọc và lưu checkpoint

## Nút Đã xem Chyusen
- [x] Đổi nút Đã xem sang nền đỏ dễ thấy trên nền tối
- [x] Áp dụng hiệu ứng RGB cho chữ nút Đã xem
- [x] Kiểm thử giao diện thông báo và lưu checkpoint

## Trung tâm thông báo Chyusen
- [x] Thêm nút Đã xem tất cả cho toàn bộ thông báo Chyusen chưa đọc
- [x] Thêm bộ lọc thông báo theo hạn đăng ký hoặc kết quả
- [x] Thêm tùy chọn bật/tắt âm cảnh báo cho thông báo mới và khẩn cấp
- [x] Kiểm thử thao tác, bộ lọc và âm cảnh báo rồi lưu checkpoint

## Lịch sử thông báo Chyusen đã xem
- [x] Thêm tab Đã xem để xem lại thông báo Chyusen đã đọc
- [x] Giữ bộ lọc Hạn đăng ký/Kết quả cho lịch sử đã xem
- [x] Kiểm thử giao diện desktop/mobile và lưu checkpoint

## Sao lưu và Xuất dữ liệu
- [x] Tạo dữ liệu xuất riêng theo Kho hàng, Mua hàng, Bán hàng và Chyusen
- [x] Tạo sao lưu toàn bộ dữ liệu cá nhân ở định dạng JSON
- [x] Thêm khu vực Sao lưu & Xuất dữ liệu trong Cài đặt
- [x] Kiểm thử tệp xuất và giao diện rồi lưu checkpoint

## Khôi phục sao lưu và báo cáo PDF tháng
- [x] Kiểm tra và hiển thị bản xem trước tệp JSON sao lưu trước khi khôi phục
- [x] Khôi phục dữ liệu JSON có xác nhận, chỉ trong tài khoản hiện tại
- [x] Tạo báo cáo thống kê theo tháng và xuất PDF
- [x] Tích hợp thao tác trong Cài đặt, kiểm thử và lưu checkpoint

## Lịch sử khôi phục, thương hiệu PDF và sao lưu tự động
- [x] Lưu và hiển thị lịch sử các lần khôi phục dữ liệu gần nhất
- [x] Cho phép chọn màu và logo cá nhân cho báo cáo PDF
- [x] Tạo và quản lý lịch sao lưu tự động hàng tuần hoặc hàng tháng
- [x] Lưu bản sao tự động riêng theo tài khoản và hiển thị lần chạy gần nhất
- [x] Kiểm thử toàn bộ luồng và lưu checkpoint trước khi kích hoạt lịch

## Xác nhận thao tác dữ liệu nhạy cảm
- [x] Yêu cầu nhập xác nhận trước khi xóa vĩnh viễn dữ liệu
- [x] Yêu cầu nhập xác nhận trước khi khôi phục JSON sao lưu
- [x] Kiểm thử các thao tác nhạy cảm và lưu checkpoint

## Nhật ký hoạt động dữ liệu nhạy cảm
- [x] Lưu nhật ký xóa vĩnh viễn và khôi phục dữ liệu theo từng tài khoản
- [x] Hiển thị Nhật ký hoạt động trong Cài đặt với thời gian và chi tiết thao tác
- [x] Kiểm thử nhật ký hoạt động và lưu checkpoint

## Bộ lọc Chyusen mặc định
- [x] Đặt bộ lọc Chyusen là Tất cả trạng thái khi mở trang
- [x] Chỉ áp dụng trạng thái khác khi người dùng chủ động chọn
- [x] Kiểm thử bộ lọc Chyusen và lưu checkpoint

## Tự động dọn Nhật ký hoạt động
- [x] Thêm cấu hình dọn nhật ký nhạy cảm cũ hơn 30 ngày theo tài khoản
- [x] Tạo tác vụ định kỳ dọn nhật ký và lưu trạng thái lần chạy
- [x] Hiển thị cấu hình dọn nhật ký trong Cài đặt
- [x] Kiểm thử và lưu checkpoint trước khi kích hoạt lịch
- [x] Kích hoạt lịch dọn nhật ký sau khi phiên bản đã xuất bản

## Khắc phục lịch sao lưu tự động
- [x] Liên kết lại lịch auto-backup đã tồn tại thay vì tạo trùng
- [x] Kiểm thử bật sao lưu tự động và lưu checkpoint

## Khắc phục lưu giao dịch bán
- [x] Xác định nguyên nhân chèn bản ghi vào bảng sales thất bại
- [x] Sửa luồng tạo giao dịch bán và ràng buộc dữ liệu liên quan
- [x] Kiểm thử lưu giao dịch bán và lưu checkpoint

## Quản lý nơi bán
- [x] Thêm danh sách nơi bán tùy chỉnh theo từng tài khoản
- [x] Tạo/sửa/xóa nơi bán trong Cài đặt
- [x] Dùng danh sách nơi bán trong biểu mẫu Bán hàng
- [x] Kiểm thử quản lý nơi bán và lưu checkpoint

## Khắc phục liên kết bảo mật Google
- [x] Thay liên kết Google gây lỗi 403 trong Cài đặt tài khoản
- [x] Kiểm thử hướng dẫn quản lý mật khẩu Google và lưu checkpoint

## Cải thiện popup Cài đặt tài khoản
- [x] Hiển thị badge nhà cung cấp đăng nhập
- [x] Thêm nút sao chép nhanh email tài khoản
- [x] Thêm hướng dẫn đổi mật khẩu từng bước trong popup
- [x] Kiểm thử popup tài khoản và lưu checkpoint

## Thiết bị và phiên đăng nhập
- [x] Lưu và hiển thị thiết bị đăng nhập gần đây theo tài khoản
- [x] Thêm đăng xuất khỏi tất cả thiết bị với xác nhận an toàn
- [x] Kiểm thử quản lý phiên và lưu checkpoint

## Nhận diện thiết bị đăng nhập
- [x] Hiển thị nhãn Thiết bị hiện tại cho phiên đang dùng
- [x] Thêm biểu tượng hệ điều hành và trình duyệt cho từng phiên
- [x] Kiểm thử popup thiết bị và lưu checkpoint

## Tự động đăng ký khi lưu Chyusen
- [x] Đặt trạng thái Đã đăng ký ngay sau khi lưu chương trình Chyusen mới
- [x] Chuyển trực tiếp sang Chờ kết quả và bỏ thao tác đăng ký lặp lại
- [x] Kiểm thử luồng tạo, Tổng quan và lưu checkpoint

## Bộ lọc Chyusen chờ kết quả
- [x] Thêm lựa chọn Chờ kết quả vào bộ lọc trạng thái danh sách
- [x] Lọc đúng các Chyusen đã đăng ký và đang chờ công bố
- [x] Kiểm thử bộ lọc và lưu checkpoint

## Số lượng bộ lọc trạng thái Chyusen
- [x] Tính số lượng mục theo từng trạng thái bằng cùng quy tắc lọc hiện có
- [x] Hiển thị số lượng ngay bên cạnh từng lựa chọn bộ lọc
- [x] Kiểm thử số lượng, giao diện và lưu checkpoint

## Công bố kết quả Chyusen
- [x] Hiển thị huy hiệu Hôm nay cho mục có ngày công bố trùng ngày hiện tại
- [x] Thêm tùy chọn sắp xếp theo ngày công bố kết quả gần nhất
- [x] Kiểm thử ngày, thứ tự danh sách và lưu checkpoint

## Theo dõi kiểm tra kết quả Chyusen
- [x] Cho phép đánh dấu và lưu thời điểm Đã kiểm tra kết quả cho từng mục
- [x] Hiển thị số ngày còn lại tới ngày công bố cho mục đang chờ
- [x] Kiểm thử dữ liệu, giao diện và lưu checkpoint

## Cảnh báo kiểm tra kết quả Chyusen
- [x] Làm nổi bật mục đã qua ngày công bố nhưng chưa được kiểm tra
- [x] Hiển thị thời điểm chi tiết kiểm tra kết quả gần nhất trên từng thẻ
- [x] Kiểm thử cảnh báo, định dạng thời gian và lưu checkpoint

## Cửa hàng Chyusen tùy chỉnh
- [x] Đổi lựa chọn Khác thành Thêm cửa hàng trong biểu mẫu Chyusen
- [x] Lưu tên cửa hàng tự nhập riêng theo từng tài khoản
- [x] Hiển thị cửa hàng đã lưu trong gợi ý khi thêm Chyusen lần sau
- [x] Bỏ Lawson và Seven Eleven khỏi danh sách gợi ý mặc định
- [x] Kiểm thử dữ liệu, giao diện và lưu checkpoint

## Quản lý gợi ý cửa hàng Chyusen
- [x] Cho phép sửa và xóa cửa hàng tự thêm theo từng tài khoản
- [x] Xếp hạng cửa hàng gợi ý theo tần suất sử dụng thực tế
- [x] Gợi ý tên cửa hàng khi URL công khai nhận diện được miền hỗ trợ
- [x] Kiểm thử API, giao diện và lưu checkpoint

## Ghim cửa hàng Chyusen yêu thích
- [x] Lưu trạng thái ghim riêng theo từng cửa hàng và tài khoản
- [x] Ưu tiên cửa hàng đã ghim trước tần suất sử dụng trong gợi ý
- [x] Thêm biểu tượng ghim để bật/tắt và kiểm thử luồng

## Thứ tự ghim và cửa hàng gần đây Chyusen
- [x] Lưu thứ tự tùy chỉnh của cửa hàng đã ghim theo từng tài khoản
- [x] Thêm kéo-thả để sắp xếp các cửa hàng đã ghim
- [x] Hiển thị và chọn nhanh danh sách cửa hàng dùng gần đây
- [x] Kiểm thử API, giao diện và lưu checkpoint

## Địa điểm giao dịch tùy chỉnh
- [x] Thay lựa chọn Khác bằng Thêm cửa hàng trong biểu mẫu Mua Hàng
- [x] Thay lựa chọn Khác bằng Thêm nơi bán trong biểu mẫu Bán Hàng
- [x] Lưu địa điểm tự nhập theo từng tài khoản và tái sử dụng trong gợi ý
- [x] Kiểm thử dữ liệu, giao diện và lưu checkpoint

## Quản lý nội tuyến địa điểm giao dịch
- [x] Cho phép sửa/xóa cửa hàng mua tự thêm ngay trong biểu mẫu
- [x] Cho phép sửa/xóa nơi bán tự thêm ngay trong biểu mẫu
- [x] Hiển thị ba địa điểm dùng gần đây để chọn nhanh ở Mua Hàng/Bán Hàng
- [x] Kiểm thử API, giao diện và lưu checkpoint

## Ghim và tần suất địa điểm giao dịch
- [x] Lưu trạng thái ghim riêng cho cửa hàng mua và nơi bán tùy chỉnh
- [x] Tính và hiển thị số lần giao dịch theo từng địa điểm gợi ý
- [x] Ưu tiên địa điểm đã ghim trong biểu mẫu Mua Hàng/Bán Hàng
- [x] Kiểm thử API, giao diện và lưu checkpoint

## Sửa Chyusen di động và dữ liệu nguồn
- [x] Tắt thu phóng trình duyệt trên giao diện web app di động
- [x] Chuẩn hóa sourceContentHash null trước khi gửi dữ liệu Chyusen vào API
- [x] Sửa tên sản phẩm/cảnh báo Chyusen không tràn ngang trên điện thoại
- [x] Kiểm thử lỗi, viewport và lưu checkpoint

## Tinh gọn trạng thái Chyusen
- [x] Bỏ dòng Đã kiểm tra kết quả khỏi thẻ Chyusen
- [x] Giữ dữ liệu kiểm tra nội bộ cho cảnh báo quá hạn
- [x] Thêm kiểm tra bố cục tự động cho tên tiếng Nhật dài trên điện thoại
- [x] Kiểm thử giao diện và lưu checkpoint

## Popup tên Chyusen đầy đủ
- [x] Mở popup tên sản phẩm đầy đủ khi chạm tiêu đề rút gọn trên điện thoại
- [x] Giữ tiêu đề gọn, không tràn và hỗ trợ đóng popup dễ dàng
- [x] Kiểm thử tương tác và lưu checkpoint

## Tinh gọn trang Chyusen
- [x] Bỏ khối Thông báo Chyusen khỏi trang danh sách
- [x] Giữ Trung tâm Thông báo và dữ liệu thông báo hoạt động riêng
- [x] Kiểm thử giao diện và lưu checkpoint

## Biểu mẫu Thêm Chyusen responsive
- [x] Giữ hộp Thêm Chyusen trong khung nhìn trên máy tính
- [x] Thêm vùng cuộn nội dung và hành động dễ tiếp cận trên điện thoại
- [x] Kiểm thử kích thước desktop/mobile và lưu checkpoint

## Hoàn thiện biểu mẫu Chyusen
- [x] Hiển thị thanh tiến trình phần thông tin đã điền
- [x] Thu gọn mặc định các khối AI và QR dài
- [x] Thêm nút quay lại trường lỗi đầu tiên sau khi lưu
- [x] Kiểm thử giao diện desktop/mobile và lưu checkpoint

## Khắc phục đồng bộ giá Rank Card
- [x] Xác định URL hoặc luồng Rank Card khiến đồng bộ hàng loạt dừng ở 88%
- [x] Bảo đảm lỗi hoặc hết thời gian chờ của một URL không chặn các mục còn lại
- [x] Hiển thị trạng thái hoàn tất và lỗi rõ ràng sau đồng bộ hàng loạt
- [x] Kiểm thử đồng bộ Rank Card và lưu checkpoint

## Theo dõi lỗi đồng bộ Marketplace
- [x] Hiển thị thời gian ước tính hoàn thành trong tiến trình đồng bộ
- [x] Thêm ô Lỗi đồng bộ sau Chưa gắn link và lọc danh sách theo ô này
- [x] Lưu và hiển thị lịch sử URL đồng bộ lỗi theo từng tài khoản
- [x] Kiểm thử dữ liệu, giao diện và lưu checkpoint

## Thử lại URL lỗi Marketplace
- [x] Thêm API thử lại đồng bộ an toàn cho một URL lỗi theo tài khoản
- [x] Thêm nút Thử lại đồng bộ và trạng thái đang xử lý trong bảng lịch sử
- [x] Làm mới lịch sử lỗi, giá và thống kê sau kết quả thử lại
- [x] Kiểm thử API, giao diện và lưu checkpoint

## Shop SNKR theo dõi giá độc lập
- [x] Tạo mục điều hướng Shop SNKR riêng, không dùng dữ liệu Kho Hàng
- [x] Lưu sản phẩm theo dõi Box/Card/Pack và URL SNKRDUNK theo tài khoản
- [x] Thêm tìm kiếm, thêm sản phẩm, gắn URL và cập nhật giá theo dõi
- [x] Hiển thị giá hiện tại cùng lịch sử biến động riêng của Shop SNKR
- [x] Bảo đảm dữ liệu Shop SNKR không cộng vào vốn, tồn kho, doanh thu hoặc lợi nhuận
- [x] Kiểm thử dữ liệu, giao diện và lưu checkpoint

## Đồng bộ tất cả và dữ liệu URL Shop SNKR
- [x] Thêm nút Đồng bộ tất cả với tiến trình, ETA và cô lập URL lỗi
- [x] Tự trích xuất và lưu hình đại diện cùng tên sản phẩm từ URL SNKRDUNK khi có dữ liệu công khai
- [x] Hiển thị thẻ sản phẩm Shop SNKR đầy đủ hình, tên, giá và trạng thái đồng bộ
- [x] Kiểm thử đồng bộ hàng loạt, dữ liệu URL và lưu checkpoint

## Chỉnh sửa và lọc Shop SNKR
- [x] Cho phép sửa trực tiếp tên và URL SNKRDUNK trên từng thẻ theo dõi
- [x] Đồng bộ lại metadata URL sau khi người dùng đổi liên kết
- [x] Thêm bộ lọc nhanh Tất cả, Box, Card và Pack cho Shop SNKR
- [x] Kiểm thử chỉnh sửa, lọc và lưu checkpoint

## Ảnh trực tiếp Shop SNKR
- [x] Ưu tiên trích xuất ảnh sản phẩm công khai trực tiếp từ trang SNKRDUNK
- [x] Hiển thị ảnh trực tiếp ổn định trên thẻ Shop SNKR cùng phương án dự phòng
- [x] Kiểm thử metadata ảnh và lưu checkpoint

## Luồng lưới và chi tiết Shop SNKR
- [x] Thiết kế trang chủ dạng lưới sản phẩm có ảnh, loại, tên và giá theo dõi
- [x] Mở trang chi tiết khi chọn sản phẩm, hiển thị ảnh lớn, giá và lịch sử riêng
- [x] Giữ thao tác đồng bộ, sửa và điều hướng dễ dùng trên desktop/mobile
- [x] Kiểm thử điều hướng lưới đến chi tiết và lưu checkpoint

## Khắc phục ảnh sản phẩm Shop SNKR
- [x] Xác định vì sao metadata ảnh đang rơi về ảnh bìa SNKRDUNK thay vì ảnh Box/Card/Pack thật
- [x] Trích xuất và lưu URL ảnh sản phẩm chính xác, không chấp nhận ảnh bìa marketplace
- [x] Làm mới metadata sản phẩm hiện có, kiểm thử mobile và lưu checkpoint

## Nhãn ảnh Shop SNKR
- [x] Áp dụng hiệu ứng RGB cho nhãn loại Box/Card/Pack ở góc ảnh
- [x] Hiển thị tên tùy chỉnh của người dùng ở góc phải ảnh sản phẩm
- [x] Kiểm thử giao diện desktop/mobile và lưu checkpoint

## Đồng bộ giá tự động mỗi giờ
- [x] Rà soát cấu hình tác vụ đồng bộ giá tự động hiện có
- [x] Đặt chu kỳ chạy tự động thành mỗi 1 giờ
- [x] Xác minh lịch chạy, kiểm thử và lưu checkpoint

## Thao tác thẻ Shop SNKR
- [x] Sắp xếp nút theo thứ tự Đồng bộ, Sửa và Xóa
- [x] Thêm nút Xóa màu đỏ với xác nhận an toàn
- [x] Kiểm thử thao tác và lưu checkpoint

## Sửa lỗi AlertDialog Shop SNKR
- [x] Bổ sung khai báo AlertDialog bị thiếu trong trang Shop SNKR
- [x] Kiểm thử hiển thị trang và xác nhận xóa, sau đó lưu checkpoint

## Bảng giá số lượng Shop SNKR
- [x] Lấy lựa chọn giá công khai theo số lượng từ SNKRDUNK cho Box, Pack và Card
- [x] Hiển thị bảng giá 1–10 đơn vị, giữ đúng Rank Card đã chọn
- [x] Thu gọn biểu đồ lịch sử giá và tối ưu giao diện chi tiết desktop/mobile
- [x] Kiểm thử dữ liệu, giao diện và lưu checkpoint

## Khôi phục máy chủ phát triển
- [x] Khởi động lại máy chủ phát triển và xác minh Shop SNKR phản hồi ổn định

## Ghim sản phẩm ưu tiên Shop SNKR
- [x] Lưu trạng thái ghim riêng cho từng sản phẩm theo dõi
- [x] Ưu tiên sản phẩm đã ghim lên đầu danh sách Shop SNKR
- [x] Thêm thao tác ghim/bỏ ghim trực quan trên thẻ và kiểm thử

## Lọc và sắp xếp ghim Shop SNKR
- [x] Thêm bộ lọc chỉ hiển thị sản phẩm đã ghim
- [x] Lưu thứ tự tùy chỉnh của các sản phẩm đã ghim
- [x] Hỗ trợ kéo-thả sắp xếp trên desktop và thao tác phù hợp mobile
- [x] Kiểm thử thứ tự, bộ lọc và lưu checkpoint

## Biến động 24 giờ và phản hồi ghim Shop SNKR
- [x] Tính biến động giá 24 giờ từ lịch sử giá riêng của sản phẩm đã ghim
- [x] Hiển thị chỉ báo tăng/giảm và chênh lệch trên thẻ đã ghim
- [x] Thêm hiệu ứng và thông báo góc màn hình khi ghim hoặc bỏ ghim
- [x] Kiểm thử giao diện, dữ liệu và lưu checkpoint

## Biểu đồ mini 7 ngày Shop SNKR
- [x] Lấy lịch sử giá 7 ngày của các sản phẩm đã ghim
- [x] Hiển thị biểu đồ mini xu hướng thật trực tiếp trên thẻ ghim
- [x] Tối ưu biểu đồ cho desktop/mobile, kiểm thử và lưu checkpoint

## Nhật ký Đồng Bộ Shop SNKR
- [x] Đưa hoạt động đồng bộ tự động Shop SNKR vào bộ lọc Đồng Bộ của Lịch sử
- [x] Kiểm thử lọc Đồng Bộ và lưu checkpoint

## Chi tiết Lịch sử Đồng Bộ Shop SNKR
- [x] Phân biệt nhật ký đồng bộ thủ công và tự động bằng nhãn rõ ràng
- [x] Ghi tóm tắt số sản phẩm đồng bộ thành công/thất bại theo từng lượt chạy
- [x] Thêm liên kết nhanh từ nhật ký tới sản phẩm Shop SNKR tương ứng
- [x] Kiểm thử dữ liệu, giao diện và lưu checkpoint

## Ảnh SNKRDUNK cho Kho/Marketplace
- [x] Tự lấy ảnh công khai SNKRDUNK khi Card, Box hoặc Pack được gắn link
- [x] Làm mới ảnh khi đồng bộ giá và tránh ảnh bìa marketplace không đúng sản phẩm
- [x] Cập nhật sản phẩm có link hiện tại, kiểm thử hiển thị và lưu checkpoint

## URL trùng Shop SNKR
- [x] Trả về thông tin mục Shop SNKR đã theo dõi thay vì lỗi kỹ thuật khi URL trùng
- [x] Điều hướng người dùng đến mục hiện có hoặc mở thao tác cập nhật phù hợp
- [x] Kiểm thử luồng URL trùng và lưu checkpoint

## Thông tin thẻ Shop SNKR
- [x] Hiển thị ngày bắt đầu theo dõi trên từng thẻ sản phẩm
- [x] Thêm nút sao chép URL SNKRDUNK với phản hồi xác nhận
- [x] Kiểm thử giao diện và lưu checkpoint

## Sửa lỗi xóa tại Bán Hàng
- [x] Xác định thao tác nào đang cố xóa sản phẩm đã có giao dịch bán
- [x] Bảo toàn lịch sử bán và cho phép thao tác xóa hợp lệ không bị chặn nhầm
- [x] Kiểm thử hồi quy luồng Bán Hàng và lưu checkpoint
- [x] Cho phép xóa giao dịch mua 5 Pack Geo khi tồn kho còn đủ sau các giao dịch bán

## Project mới từ bản sao
- [x] Tạo workspace project mới từ gói sao lưu hiện có
- [x] Đăng ký repository riêng, mặc định private, cho project mới
- [x] Viết hướng dẫn sao lưu và khôi phục dữ liệu ứng dụng sang project mới
- [x] Kiểm thử build/test của bản sao và bàn giao đường dẫn

## Bản sao lưu và chuyển dữ liệu sang project mới
- [x] Chuẩn bị bản sao mã nguồn độc lập và repository riêng
- [x] Xác nhận các bước xuất JSON toàn bộ dữ liệu từ project cũ
- [x] Hướng dẫn đăng nhập đúng tài khoản đích và khôi phục JSON một lần
- [x] Kiểm tra số lượng bản ghi và ảnh sau khi khôi phục

## Thử checkpoint theo hướng dẫn hỗ trợ
- [x] Thử lưu checkpoint và xuất bản lại phiên bản mới nhất
- [x] Ghi nhận chính xác thời điểm và thông báo nếu merge conflict còn xuất hiện

## Kiểm tra lại sau phản hồi Manus Help
- [x] Đọc phản hồi hỗ trợ mới nhất về merge conflict
- [x] Thử checkpoint một lần theo hướng dẫn
- [x] Ghi nhận đã xuất bản hoặc vẫn bị chặn

## Hướng dẫn sử dụng bản sao project mới
- [x] Hướng dẫn người dùng tự tạo project mới từ repository private hoặc gói mã nguồn
- [x] Hướng dẫn sao lưu/khôi phục dữ liệu và xác minh ảnh sau khi chuyển

## Kiểm tra file bản sao project
- [x] Kiểm tra gói mã nguồn và tài liệu có tồn tại, đọc được và toàn vẹn
- [x] Tạo lại gói tải xuống nếu file cũ bị lỗi hoặc không còn truy cập
- [x] Cung cấp lại file và hướng dẫn mở trên máy tính

## Đối chiếu ảnh Shop SNKR còn nền đen
- [x] Kiểm kê các bản ghi Shop SNKR đang dùng URL CDN trực tiếp
- [x] Đối chiếu với bản xuất bản và bản xem trước để xác định nguồn khác nhau
- [x] Xác nhận cách xử lý lại ảnh cũ mà không thay đổi giá hoặc dữ liệu theo dõi

## Ảnh mẫu nền trắng Shop SNKR
- [x] Chọn một ảnh CDN Shop SNKR làm mẫu
- [x] Tạo ảnh nền trắng thật và lưu bản mẫu
- [x] Gửi ảnh mẫu để người dùng kiểm tra trước khi xử lý hàng loạt

## Xử lý hàng loạt ảnh nền trắng Shop SNKR
- [x] Lập danh sách và lưu bản đối chiếu 12 sản phẩm CDN còn ảnh nền đen
- [x] Tải ảnh nguồn và tạo 12 ảnh nền trắng theo ảnh mẫu đã duyệt
- [x] Kiểm tra chất lượng và đối chiếu đúng sản phẩm trước khi cập nhật
- [x] Cập nhật URL ảnh nền trắng cho 12 sản phẩm, giữ nguyên giá và dữ liệu theo dõi
- [x] Xác minh dữ liệu sau migration và hoàn tất báo cáo

## Hợp nhất Git và lưu checkpoint phiên bản mới nhất
- [x] Kiểm tra trạng thái Git, nhánh và vùng xung đột hiện tại
- [x] Commit thay đổi hiện có rồi hợp nhất origin/main mà không reset hoặc tạo project mới
- [x] Hợp nhất thủ công ActivityHistory.tsx và todo.md, giữ lại cả hai phía
- [x] Chạy test và kiểm tra TypeScript, chỉ sửa lỗi do merge
- [x] Commit kết quả và lưu checkpoint xuất bản phiên bản mới nhất

## Loading và trạng thái làm mới ảnh Shop SNKR
- [x] Xác định nút làm mới ảnh và mutation liên quan
- [x] Thêm trạng thái loading trực quan, khóa thao tác lặp và thông báo đang xử lý
- [x] Thêm thông báo thành công và lỗi rõ ràng sau khi làm mới ảnh
- [x] Bổ sung kiểm thử hồi quy và xác minh desktop/mobile
- [x] Lưu checkpoint phiên bản mới nhất

## Tiến trình xử lý ảnh AI
- [x] Rà soát luồng xử lý ảnh AI và trạng thái loading hiện có
- [x] Thêm tiến trình nhiều bước với phần trăm và mô tả bước hiện tại
- [x] Hiển thị trạng thái hoàn tất, lỗi và khả năng thử lại rõ ràng
- [x] Bổ sung kiểm thử hồi quy và xác minh desktop/mobile
- [x] Lưu checkpoint phiên bản mới nhất

## Shop SNKR: xu hướng 7 ngày, bỏ ghim và hủy xử lý ảnh AI
- [x] Rà soát dữ liệu lịch sử giá 7 ngày và điểm ghim đang dùng trong Shop SNKR
- [x] Hiển thị biểu đồ tăng/giảm 7 ngày cho toàn bộ sản phẩm Shop SNKR
- [x] Gỡ nút, bộ lọc và thao tác ghim khỏi Shop SNKR nhưng giữ dữ liệu giá an toàn
- [x] Thêm nút Hủy xử lý bên cạnh thanh tiến trình ảnh AI cùng trạng thái hủy rõ ràng
- [x] Bổ sung kiểm thử hồi quy, xác minh giao diện và lưu checkpoint phiên bản mới nhất

## Lưu cố định ảnh Shop SNKR
- [x] Kiểm tra luồng lấy ảnh và các bản ghi Shop SNKR đang thiếu ảnh storage
- [x] Lưu ảnh nguồn hợp lệ vào storage ngay khi thêm hoặc đồng bộ sản phẩm
- [x] Bảo toàn ảnh nền trắng và khôi phục ảnh cho các bản ghi cũ thiếu ảnh
- [x] Xác minh ảnh Box, Pack và Card hiển thị tức thì khi mở lại Shop SNKR
- [x] Bổ sung kiểm thử hồi quy và lưu checkpoint phiên bản mới nhất

## Ảnh fallback sản phẩm
- [x] Rà soát component ảnh sản phẩm và tài sản fallback hiện có
- [x] Tạo ảnh fallback thống nhất và lưu vào storage
- [x] Tích hợp fallback cho ảnh thiếu hoặc lỗi tải trong Shop SNKR, Kho Hàng và thẻ sản phẩm
- [x] Bổ sung kiểm thử lỗi tải ảnh và xác minh desktop/mobile
- [x] Lưu checkpoint phiên bản mới nhất

## Khung ảnh Shop SNKR nền trắng toàn phần
- [x] Rà soát layout khung ảnh trang chi tiết Shop SNKR
- [x] Đặt nền trắng cho toàn bộ ô ảnh, gồm viền trong và vùng đệm
- [x] Giữ fallback ảnh thống nhất khi ảnh sản phẩm thiếu hoặc lỗi tải
- [x] Kiểm thử responsive desktop/mobile và lưu checkpoint

## Biểu mẫu Chūsen — cửa hàng tùy chỉnh
- [x] Rà soát lựa chọn cửa hàng và luồng tự lưu cửa hàng hiện có
- [x] Đưa ô nhập tên cửa hàng xuống ngay dưới lựa chọn “Thêm cửa hàng”
- [x] Giữ tự động lưu cửa hàng mới vào danh sách gợi ý
- [x] Bổ sung kiểm thử giao diện và kiểm thử lưu cửa hàng
- [x] Lưu checkpoint phiên bản mới nhất

## Biểu mẫu Chūsen — ô nhập cửa hàng inline
- [x] Kiểm tra vị trí trường cửa hàng và cơ chế lưu gợi ý hiện tại
- [x] Đặt ô nhập tên cửa hàng ngay bên dưới lựa chọn “Thêm cửa hàng”
- [x] Bảo toàn tự lưu cửa hàng mới theo tài khoản
- [x] Bổ sung kiểm thử biểu mẫu và TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Chūsen — cửa hàng nhập trực tiếp
- [x] Rà soát dữ liệu cửa hàng tùy chỉnh và điểm hiển thị trên thẻ Chūsen
- [x] Đưa tên cửa hàng tự nhập vào cùng danh sách chọn với Geo/Joshin
- [x] Hiển thị tên cửa hàng tùy chỉnh thay cho “Khác” trên thẻ Chūsen
- [x] Bỏ giao diện ghim, cửa hàng đã lưu và ô tên cửa hàng riêng gây tốn diện tích
- [x] Bổ sung kiểm thử hồi quy, xác minh mobile và lưu checkpoint

## Ngày Tháng/Ngày và cửa hàng Chūsen
- [x] Kiểm kê nhãn, placeholder và hướng dẫn ngày còn ghi dd/mm
- [x] Đổi cách ghi ngày sang Tháng/Ngày nhất quán trên toàn ứng dụng
- [x] Khôi phục lựa chọn cửa hàng sẵn có, bổ sung COMG! và giữ ô Thêm cửa hàng mới
- [x] Bảo toàn tự lưu và hiển thị đúng tên cửa hàng tùy chỉnh
- [x] Bổ sung kiểm thử hồi quy, xác minh mobile và lưu checkpoint

## Tự nhận diện cửa hàng và nhãn Tháng/Ngày
- [x] Rà soát detector URL và sự kiện dán URL trong Chūsen
- [x] Tự động nhận diện và điền tên cửa hàng khi dán URL sản phẩm
- [x] Đổi mọi hướng dẫn và placeholder ngày sang chữ “Tháng/Ngày”
- [x] Bổ sung kiểm thử URL, cửa hàng và định dạng ngày
- [x] Lưu checkpoint phiên bản mới nhất

## Sửa lỗi API Shop SNKR trả HTML thay vì JSON
- [x] Kiểm tra log và request gây lỗi Unexpected token <
- [x] Xác định endpoint hoặc cấu hình API sai
- [x] Sửa đúng luồng gọi API và giữ nguyên chức năng Shop SNKR
- [x] Chạy test, TypeScript và xác minh request thực tế
- [x] Lưu checkpoint phiên bản sửa lỗi

## Chūsen — mặc định công bố gần nhất
- [x] Rà soát state và logic sắp xếp Chūsen
- [x] Đặt sắp xếp mặc định theo ngày công bố gần nhất
- [x] Kiểm thử thứ tự mặc định và các lựa chọn khác
- [x] Lưu checkpoint phiên bản mới nhất

## Sửa lỗi entityType trang Lịch sử
- [x] Rà soát bộ lọc Lịch sử và schema entityType hợp lệ
- [x] Sửa giá trị mặc định/chuyển đổi entityType ở client
- [x] Bổ sung kiểm thử hồi quy và xác minh trang Lịch sử
- [x] Lưu checkpoint phiên bản sửa lỗi

## Căn tỉ lệ khung ảnh Card/Box/Pack
- [x] Rà soát khung ảnh và quy tắc fit hiện tại
- [x] Căn nền trắng và tỉ lệ ảnh khớp toàn bộ khung
- [x] Giữ ảnh sản phẩm không bị cắt hoặc méo theo từng loại
- [x] Kiểm thử danh sách và trang chi tiết trên desktop/mobile
- [x] Lưu checkpoint phiên bản mới nhất

## Phóng to ảnh sản phẩm toàn ứng dụng
- [x] Rà soát mọi component ảnh Card, Box và Pack
- [x] Tăng kích thước nội dung ảnh trong khung
- [x] Giữ nền trắng phủ kín toàn bộ khung, không méo hoặc cắt ảnh
- [x] Kiểm thử danh sách/trang chi tiết trên desktop và mobile
- [x] Lưu checkpoint phiên bản mới nhất

## Zoom ảnh và khung trắng full
- [x] Rà soát Cài đặt, các component ảnh và nguyên nhân khung chưa full
- [x] Thêm tùy chọn điều chỉnh mức zoom và lưu lựa chọn người dùng
- [x] Sửa khung ảnh để nền trắng phủ kín và ảnh cân đúng tỉ lệ
- [x] Áp dụng thiết lập nhất quán cho Card, Box và Pack toàn app
- [x] Bổ sung kiểm thử desktop/mobile và lưu checkpoint phiên bản mới

## Zoom riêng theo loại sản phẩm và căn ảnh tự động
- [x] Thêm mức zoom riêng cho ảnh Card dọc và Box/Pack ngang, lưu theo tài khoản trên thiết bị
- [x] Thêm nút “Khôi phục mặc định” cho từng nhóm zoom và trạng thái đặt lại rõ ràng
- [x] Thêm chuyển động mượt, tôn trọng prefers-reduced-motion khi thay đổi zoom
- [x] Tự động căn ảnh vào vùng nền trắng full khung, xử lý ảnh có viền đen hoặc tỷ lệ dư
- [x] Bổ sung kiểm thử UI/logic, kiểm tra desktop/mobile và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## GIF và zoom riêng từng ảnh sản phẩm
- [x] Rà soát tất cả component ảnh sản phẩm và cơ chế ảnh GIF hiện tại
- [x] Thiết kế lưu zoom riêng theo từng sản phẩm, tách biệt theo tài khoản
- [x] Thêm chế độ tự căn ảnh đầy khung cho GIF và ảnh tĩnh, có lựa chọn không méo/không cắt
- [x] Thêm điều khiển zoom riêng trên từng ảnh và đồng bộ giữa Kho hàng, Shop SNKR và trang chi tiết
- [x] Thêm khôi phục zoom từng ảnh và khôi phục hàng loạt về mặc định
- [x] Bổ sung kiểm thử responsive, kiểm thử dữ liệu cách ly và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Kéo thả vị trí ảnh và điều chỉnh trong biểu mẫu Sửa
- [x] Rà soát component ảnh, biểu mẫu sửa sản phẩm và mọi trang đang hiển thị ảnh
- [x] Thêm dữ liệu vị trí ảnh riêng theo từng sản phẩm và tài khoản
- [x] Thêm kéo thả ảnh sau khi zoom, hỗ trợ chuột và cảm ứng, không che ảnh khi xem bình thường
- [x] Chuyển thanh Zoom ảnh vào popup/biểu mẫu Sửa và bổ sung xem trước rõ ràng
- [x] Áp dụng vị trí và zoom riêng cho Card, Box, Pack, GIF và ảnh tĩnh trên toàn app
- [x] Bổ sung kiểm thử, responsive/mobile và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Tắt kéo thả và sửa loại sản phẩm
- [x] Tắt tương tác kéo thả trên tất cả ảnh nhưng giữ nguyên zoom, vị trí và GIF
- [x] Thêm trường chọn Loại sản phẩm vào biểu mẫu Sửa Kho hàng
- [x] Cập nhật backend để cho phép đổi loại Card/Box/Pack an toàn theo userId
- [x] Xử lý lại các trường phụ thuộc loại và kiểm tra dữ liệu giao dịch liên quan
- [x] Bổ sung kiểm thử hồi quy, responsive và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Nút khôi phục vị trí và độ thu phóng ảnh
- [x] Thêm nút “Đặt lại vị trí và độ thu phóng” trong vùng Sửa ảnh
- [x] Đưa zoom về mặc định và vị trí về trung tâm ngay khi bấm nút
- [x] Bảo đảm trạng thái khôi phục được gửi và lưu cùng nút Lưu
- [x] Bổ sung kiểm thử UI/logic và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Thumbnail sản phẩm trong Market
- [x] Rà soát trang Market, dữ liệu sản phẩm và ảnh SNKRDUNK đã lưu
- [x] Thay ô biểu tượng bằng thumbnail thật tương ứng với từng sản phẩm/liên kết
- [x] Dùng chung fallback, nền trắng và cách tải ảnh như Shop SNKR
- [x] Căn chỉnh thumbnail nhỏ trước tên trên desktop/mobile
- [x] Bổ sung kiểm thử UI và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Sửa lỗi zoom Cài đặt không cập nhật ảnh
- [x] Rà soát khóa localStorage, sự kiện zoom và hook đọc zoom hiện tại
- [x] Sửa để ảnh Card và Box/Pack cập nhật ngay sau khi đổi Cài đặt
- [x] Bảo đảm giá trị zoom được giữ sau khi tải lại và áp dụng cho Market/Shop SNKR/Kho hàng
- [x] Bổ sung kiểm thử hồi quy cho cả hai nhóm zoom
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Xem trước zoom trực tiếp trong Cài đặt
- [x] Rà soát khối Cài đặt zoom Card và Box/Pack hiện tại
- [x] Thêm khung xem trước ảnh Card cập nhật theo mức zoom đang chọn
- [x] Thêm khung xem trước ảnh Box/Pack cập nhật theo mức zoom đang chọn
- [x] Dùng ảnh mẫu/fallback rõ ràng, nền trắng và không ảnh hưởng dữ liệu sản phẩm
- [x] Bổ sung kiểm thử UI, responsive và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Hiển thị hạn mua hàng khi Đã trúng Chūsen
- [x] Rà soát trường hạn mua và điều kiện trạng thái Đã trúng
- [x] Hiển thị hạn mua hàng đã nhập trên thẻ Chūsen khi đã trúng
- [x] Giữ ẩn nội dung khi chưa nhập hạn mua hoặc chưa trúng
- [x] Bổ sung kiểm thử UI mobile/desktop và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Số ngày còn lại của hạn mua Chūsen
- [x] Rà soát helper tính số ngày và khối hạn mua khi Đã trúng
- [x] Hiển thị số ngày còn lại bên cạnh ngày hạn mua hàng
- [x] Phân biệt rõ hôm nay, sắp hết hạn và quá hạn
- [x] Bổ sung kiểm thử UI/logic và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Loại Pack Rác trong Mua Hàng
- [x] Rà soát enum loại sản phẩm, bộ lọc và luồng tạo Mua Hàng
- [x] Thêm Pack Rác thành loại sản phẩm riêng, không gộp với Pack
- [x] Hiển thị và lọc tồn kho Pack Rác tách biệt khỏi Pack thông thường
- [x] Bổ sung kiểm thử tách dữ liệu, UI và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Huy hiệu nhận diện Pack Rác
- [x] Rà soát các nơi hiển thị loại sản phẩm và nhãn Pack Rác
- [x] Tạo huy hiệu màu riêng, dễ phân biệt với Pack thông thường
- [x] Áp dụng huy hiệu ở Mua Hàng, Kho Hàng, danh sách sản phẩm và Tổng quan
- [x] Bổ sung kiểm thử UI, kiểm tra desktop/mobile và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Hiển thị Card Number và tổng Pack Rác
- [x] Rà soát các bề mặt hiển thị Card và chuẩn hóa Card Number phía sau tên sản phẩm
- [x] Thêm chỉ số Pack Rác hiện có nổi bật trên bảng điều khiển Tổng quan
- [x] Bổ sung kiểm thử hồi quy, xác minh desktop/mobile và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## FUR rarity và hiệu ứng Card Number
- [x] Đưa FUR lên đầu thứ tự rarity và hiển thị huy hiệu riêng đồng nhất
- [x] Áp dụng hiệu ứng RGB cho Card Number bên cạnh tên Card
- [x] Bổ sung kiểm thử hồi quy, xác minh desktop/mobile và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Gộp tồn kho theo giá mua
- [x] Đổi quy tắc Mua Hàng: chỉ gộp khi cùng tên, cùng loại và cùng giá mua/SP; khác giá phải tạo dòng tồn kho riêng
- [x] Bảo toàn quy tắc tách giá khi sao lưu/khôi phục dữ liệu và cho các loại Card/Box/Pack/Pack Rác
- [x] Làm rõ giá mua/SP trên thẻ sản phẩm và danh sách để nhận diện từng lô giá
- [x] Bổ sung kiểm thử hồi quy, xác minh desktop/mobile và chạy TypeScript
- [x] Lưu checkpoint và xuất bản phiên bản mới

## Gợi ý tên sản phẩm trong kho
- [x] Hiển thị gợi ý từ ký tự đầu tiên trong các biểu mẫu thêm sản phẩm
- [x] Hiển thị tên, loại, giá mua/SP và số lượng của kết quả để tránh nhập sai
- [x] Kiểm thử hồi quy, xác minh TypeScript/build và lưu checkpoint mới

## Tách riêng từng lô nhập hàng
- [x] Bỏ hoàn toàn gộp lô khi thêm trực tiếp Card/Box/Pack/Pack Rác hoặc tạo Mua Hàng
- [x] Đổi biểu mẫu Thêm sản phẩm sang nhập Tổng giá mua lô và tự lưu giá mua/SP chính xác
- [x] Hiển thị từng lô theo SL, giá mua/SP và tổng tiền lô; chỉ tổng hợp các lô ở Tổng quan
- [x] Sửa lô Pack Rác 30Th 20 Pack 13 × 480 ¥ theo dữ liệu người dùng đã xác nhận
- [x] Bổ sung kiểm thử hồi quy, TypeScript/build, checkpoint và xuất bản

## Gộp lô tồn kho cùng tên và giá
- [x] Khôi phục gộp khi tên, loại và giá mua/SP đều trùng cho Thêm sản phẩm và Mua Hàng
- [x] Giữ tách lô khi khác tên, loại hoặc giá mua/SP
- [x] Hợp nhất an toàn các lô trùng 30Th Dekki hiện có theo dữ liệu người dùng
- [x] Bổ sung kiểm thử hồi quy, TypeScript/build, checkpoint và xuất bản

## Gộp toàn bộ sản phẩm trùng thông tin
- [x] Rà soát toàn bộ kho hiện có của tài khoản theo tên, loại và giá mua/SP
- [x] Hợp nhất an toàn mọi nhóm trùng, giữ lịch sử Mua/Bán và dữ liệu hiển thị tốt nhất
- [x] Làm rõ gợi ý tên ở Mua Hàng ngay từ ký tự đầu tiên
- [x] Bổ sung kiểm thử hồi quy, TypeScript/build, checkpoint và xuất bản

## Thông báo gộp khi chọn sản phẩm Mua Hàng
- [x] Hiển thị nhãn “Sẽ gộp vào số lượng hiện có” sau khi chọn sản phẩm từ gợi ý
- [x] Hiển thị tên, số lượng hiện có, loại và giá mua/SP của sản phẩm được chọn
- [x] Xóa nhãn khi người dùng thay đổi tên, loại, số lượng hoặc giá; thêm kiểm thử hồi quy

## Cảnh báo giá không thể gộp trong Mua Hàng
- [x] So sánh giá mua/SP mới với giá hiện tại theo thời gian thực
- [x] Hiển thị cảnh báo đỏ “Không thể gộp” khi hai mức giá khác nhau
- [x] Giữ nhãn xanh khi giá trùng và kiểm thử hồi quy

## Hiển thị số lượng dự kiến sau khi gộp
- [x] Tính số lượng hiện có cộng số lượng giao dịch mới
- [x] Hiển thị tổng số lượng dự kiến ngay trên nhãn gộp thành công
- [x] Chỉ hiển thị dự kiến khi giá mua/SP khớp và thêm kiểm thử hồi quy

## Nút xác nhận Đã mua hàng cho Chūsen trúng
- [x] Thêm nút “Đã mua hàng” cạnh “Thêm vào Mua Hàng”
- [x] Gọi mutation hoàn tất, xóa khỏi danh sách đang theo dõi và cập nhật lại dữ liệu
- [x] Hiển thị trạng thái đang xử lý, toast thành công và kiểm thử hồi quy

## Sắp xếp sản phẩm theo lần mua/thêm gần nhất
- [x] Đặt mặc định Card, Box, Pack và Pack Rác theo updatedAt giảm dần
- [x] Áp dụng cùng thứ tự cho Kho Hàng khi bộ lọc là Tất cả
- [x] Giữ các lựa chọn sắp xếp Card thủ công và bổ sung kiểm thử hồi quy

## Sắp xếp sản phẩm theo lần mua/thêm gần nhất — hoàn tất
- [x] Đặt mặc định Card, Box, Pack và Pack Rác theo updatedAt giảm dần
- [x] Áp dụng cùng thứ tự cho Kho Hàng khi bộ lọc là Tất cả
- [x] Giữ các lựa chọn sắp xếp Card thủ công và bổ sung kiểm thử hồi quy
