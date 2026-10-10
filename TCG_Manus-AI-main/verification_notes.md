# Xác minh cài đặt Chyusen và Marketplace

Ngày xác minh: 13/08/2026

- `pnpm check`, `pnpm test` và `pnpm build` hoàn tất thành công; bộ kiểm thử có 56 ca, bao gồm hai ca cho thao tác kiểm tra nguồn tức thì ở trạng thái thành công và lỗi truy cập.
- Trang `/cai-dat` được xác minh ở desktop 1280×720: từng nguồn hiển thị trạng thái, thời điểm kiểm tra gần nhất, lỗi gần nhất nếu có, cùng các nút **Kiểm tra ngay**, **Lưu** và **Xóa**. Thẻ Marketplace hiển thị công tắc auto-sync, batch size và trạng thái lần chạy gần nhất.
- Trang `/cai-dat` được xác minh ở mobile 375×812: các trường, badge trạng thái và nút hành động xếp theo chiều dọc, vẫn giữ được khả năng thao tác.

## Ưu tiên Đồng bộ giá Marketplace

Ngày xác minh: 13/08/2026

- Thẻ **Đồng bộ giá Marketplace** hiện nằm ngay dưới tiêu đề Cài đặt, trước Nhắc hạn và danh sách Nguồn theo dõi, nên không bị đẩy xuống khi danh sách nguồn dài.
- Đã xác minh thứ tự mới ở desktop 1280×720 và mobile 375×812; các nút, công tắc và trường cấu hình vẫn hiển thị đầy đủ.
- `pnpm check` thành công và toàn bộ 62 Vitest tests đều đạt.

## Quản lý nguồn thu gọn, lọc lỗi và đồng bộ theo yêu cầu

Ngày xác minh: 13/08/2026

- Trang Cài đặt hiện có nút **Thu gọn/Mở rộng** danh sách nguồn theo dõi và bộ lọc **Nguồn lỗi**, kèm số lượng nguồn không truy cập được.
- Nút **Đồng bộ ngay** trên thẻ Marketplace sử dụng luồng đồng bộ thủ công hiện hữu, hiển thị trạng thái đang chạy và thông báo tổng hợp sau khi hoàn tất.
- Đã xác minh desktop 1280×720 và mobile 375×812; tất cả điều khiển mới hiển thị đầy đủ. Typecheck, 62 Vitest tests và production build thành công.

## Vùng chạm nút sidebar trên mobile

Ngày xác minh: 13/08/2026

- Nút mở sidebar ở góc trên bên trái được tăng lên 48×48 px, biểu tượng lớn hơn và có nền nhấn nhẹ để dễ nhận diện trên điện thoại.
- Đã xác minh ở viewport 375×812; nút không che tiêu đề trang hay chuông thông báo. Typecheck và 73 Vitest tests đều đạt.

## Vuốt mở và chuyển động sidebar

Ngày xác minh: 13/08/2026

- Sidebar mobile có thể mở bằng thao tác vuốt ngang từ trong dải 28 px ở mép trái, với khoảng vuốt tối thiểu 64 px; các thao tác cuộn dọc hoặc vuốt từ ngoài mép không kích hoạt sidebar.
- Hiệu ứng Sheet mở/đóng dùng thời lượng 250/200 ms, và tắt hiệu ứng khi thiết bị bật giảm chuyển động.
- Logic cử chỉ có 2 kiểm thử hồi quy; toàn bộ 75 Vitest tests, typecheck và production build đều thành công. Bố cục mobile 375×812 đã được xác minh.

## Nền xám than theo ảnh tham chiếu

Ngày xác minh: 13/08/2026

- Nền ứng dụng, thẻ, popover, input và viền đã chuyển sang bảng màu xám than đồng nhất theo ảnh tham chiếu; chữ chính/chữ phụ được đổi sang trắng-xám để giữ khả năng đọc.
- Đã xác minh desktop 1280×720 và mobile 375×812: logo, số liệu, nhãn đỏ/xanh và đường viền vẫn đủ tương phản trên nền mới.
- Typecheck và 76 Vitest tests đều đạt.

## Tinh gọn chú giải Lịch sử

Ngày xác minh: 13/08/2026

- Đã loại bỏ hoàn toàn dòng **Màu chi tiết: Xóa / Sửa / Mua / Bán** phía trên bộ lọc Lịch sử.
- Nhãn màu nằm ngay cạnh từng hoạt động được giữ nguyên, nên loại thao tác vẫn nhận biết trực tiếp mà không cần chú giải lặp lại.
- Đã xác minh desktop/mobile; typecheck và 76 Vitest tests đều đạt.

## Bộ lọc Đồng Bộ Auto trong Lịch sử

Ngày xác minh: 13/08/2026

- Bộ lọc **Đồng Bộ Auto** nằm ngay sau **Tất cả** và trước **Kho hàng** trên giao diện Lịch sử.
- Mặc định Tất cả loại trừ các hành động đồng bộ giá SNKRDUNK; nhóm Đồng Bộ Auto hiển thị riêng các hành động này.
- Đã xác minh vị trí trên mobile 375×812; sau khi hợp nhất phân trang, typecheck, 78 Vitest tests và production build đều đạt.

### Theo dõi sau khi hợp nhất phân trang

- Hai lần chụp preview sau khi khởi động lại hiển thị skeleton vì phiên preview không có đăng nhập. Kiểm tra trong trình duyệt riêng xác nhận trạng thái này dẫn tới màn hình Đăng nhập, không phải lỗi tải trang Lịch sử. API và giao diện đã được xác minh bằng hồi quy tự động.

## Nhãn Đồng Bộ

Ngày xác minh: 13/08/2026

- Nhãn hiển thị của bộ lọc đồng bộ được rút gọn từ **Đồng Bộ Auto** thành **Đồng Bộ**; giá trị lọc nội bộ và điều kiện tách lịch sử SNKRDUNK không thay đổi.
- Typecheck và 78 Vitest tests đều đạt.

## Hoàn thiện form Chyusen thủ công

Ngày xác minh: 13/08/2026

- Form đã có thông báo thành công khi lưu thủ công, validation rõ ràng cho tên chương trình, tên sản phẩm, ngày hết hạn và ngày công bố kết quả.
- Chỉ còn **Ngày nhận hàng** theo dạng `dd/mm`, kèm ghi chú linh hoạt như “Khoảng đầu tháng 9”; ngày nhận hàng kết thúc và dòng URL ảnh sản phẩm đã được bỏ.
- Người dùng có thể tải PNG/JPEG/WEBP tối đa 4 MB để AI đọc nội dung ảnh và gợi ý điền các trường, luôn yêu cầu kiểm tra trước khi lưu.
- Đã hợp nhất định dạng ngày dd/mm từ dự án chia sẻ, xác minh schema `pickupNote` trong DB, typecheck và 93 Vitest tests đều đạt; production build thành công.

## Nhận diện trường AI điền trong Chyusen

Ngày xác minh: 13/08/2026

- Khi AI đọc ảnh, từng trường có dữ liệu được điền sẽ nhận nền/viền xanh cùng nhãn **AI điền**; người dùng sửa một trường thì nhãn của chính trường đó tự mất.
- Khối tóm tắt cho biết số trường AI đã điền và nút **Chỉnh sửa nhanh** đưa focus tới trường AI đầu tiên.
- Đã thêm hồi quy cho logic nhận diện trường AI, đồng thời xác minh Chyusen trên desktop 1280×720 và mobile 375×812. Typecheck và 97 Vitest tests đều đạt.

## Kiểm soát dữ liệu AI và tín hiệu Chyusen

Ngày xác minh: 13/08/2026

- Sau khi AI đọc ảnh, người dùng có thể **Chấp nhận tất cả** hoặc **Hoàn tác AI** về trạng thái trước lúc trích xuất; từng trường hiển thị confidence **Cao/Trung bình/Thấp** với màu riêng.
- Khối lưu ý nguồn công khai/CAPTCHA đã đổi sang nền đỏ đậm, được xác minh trên desktop 1280×720 và mobile 375×812.
- Nút **Đã trúng** có màu vàng trước thao tác; sau cập nhật trạng thái, badge **Đã trúng** hiển thị đỏ. Typecheck, 97 Vitest tests và production build đều đạt.

## Xác nhận trạng thái Đã trúng

Ngày xác minh: 13/08/2026

- Bấm **Đã trúng** không còn đổi trạng thái ngay lập tức; hộp thoại nêu rõ tên chương trình và yêu cầu xác nhận lần cuối.
- Nút xác nhận hiển thị trạng thái đang cập nhật, nút hủy vẫn giữ nguyên trạng thái Chyusen.
- Đã xác minh bố cục mobile 375×812; typecheck và 97 Vitest tests đều đạt.

## Tương phản menu thao tác kho

Ngày xác minh: 13/08/2026

- Menu ba chấm dọc trên Card, Box và Pack dùng biểu tượng trắng cùng nền trắng bán trong suốt; hover và focus ring vẫn rõ trên nền tối.
- Đã xác minh trực quan Card trên mobile 375×812, nơi biểu tượng hiện dễ thấy ở góc phải thẻ. Typecheck và 97 Vitest tests đều đạt.

## Menu kho và form Chyusen gọn hơn

Ngày xác minh: 13/08/2026

- Menu ba chấm trên mobile có vùng chạm 44×44 px và tooltip **Tùy chọn**; xóa sản phẩm nay cần xác nhận qua hộp thoại riêng.
- Form Chyusen đã bỏ trường Tên chương trình, bắt đầu bằng Tên sản phẩm và tự dùng tên đó làm tiêu đề khi lưu. Danh sách cửa hàng bổ sung Bandai Premium, Pokémon Center và Rakuten.
- Đã xác minh mobile Card 375×812 và form Chyusen desktop 1280×720; typecheck và 97 Vitest tests đều đạt.

## Trợ lý AI mobile và tiền tệ JPY

Ngày xác minh: 13/08/2026

- Modal Trợ lý AI dùng chiều cao theo viewport trên điện thoại, vùng chat co giãn/có cuộn độc lập và ô nhập luôn nằm trong khung; nội dung Markdown, bảng và chuỗi dài được giới hạn để không tràn ngang.
- System prompt yêu cầu dùng ¥/JPY; phản hồi mới và lịch sử chat cũ có hậu tố VNĐ/VND được chuẩn hóa thành ¥ trước khi hiển thị.
- Đã xác minh trang mobile 375×812 sau khi ổn định dịch vụ, typecheck, 98 Vitest tests và production build đều đạt.

## Khung AI mobile và sao chép trả lời

Ngày xác minh: 13/08/2026

- Đã bỏ cơ chế tạo chiều cao tối thiểu cho câu trả lời cuối, nguyên nhân làm phản hồi dài chiếm và che vùng nhập trên mobile. Chỉ `ScrollArea` của nội dung được cuộn, trong khi header và ô nhập luôn là phần cố định.
- Mỗi câu trả lời AI có nút sao chép; sau khi sao chép biểu tượng chuyển thành dấu xác nhận trong 1,8 giây. Có fallback cho trình duyệt không hỗ trợ Clipboard API.
- Typecheck, 98 Vitest tests và production build đều đạt.

## Nơi bán mặc định Người Dùng

Ngày xác minh: 13/08/2026

- Lựa chọn **Người Dùng** đã được thêm vào danh sách Nơi bán và được chọn mặc định khi tạo giao dịch bán mới, cũng như sau khi lưu xong một giao dịch.
- Đã xác minh trang Bán Hàng trên mobile 375×812; typecheck và 98 Vitest tests đều đạt.

## Chế độ hiển thị Card, Box và Pack

Ngày xác minh: 13/08/2026

- Bộ chuyển đổi **Thẻ ảnh / Danh sách** xuất hiện cạnh bộ lọc trên trang Card, Box và Pack. Chế độ thẻ ảnh được giữ làm mặc định.
- Chế độ danh sách giữ thông tin tồn, giá mua, giá thị trường, lãi và menu Sửa/Upload ảnh/Xóa; các bộ lọc và sắp xếp được dùng chung cho cả hai chế độ.
- Đã xác minh Card desktop 1280×720 và mobile 375×812 với dữ liệu thực; typecheck và 98 Vitest tests đều đạt.

## Cá nhân hóa danh sách và xuất CSV

Ngày xác minh: 13/08/2026

- Lựa chọn Thẻ ảnh/Danh sách và tập hợp cột danh sách được lưu trong localStorage của thiết bị, nên được dùng lại ở lần mở sau.
- Chế độ danh sách cho phép bật/tắt Số lượng, Giá mua, Giá thị trường, Lợi nhuận, Series/Set, Độ hiếm và Trạng thái. CSV xuất đúng các cột đang chọn, có BOM để mở tiếng Nhật/CJK trong Excel.
- Đã thêm hồi quy CSV. Typecheck, 99 Vitest tests và production build đều đạt. Card mobile 375×812 hiển thị đầy đủ công tắc view và nút xuất CSV.

## Gỡ nút xuất CSV

Ngày xác minh: 13/08/2026

- Nút xuất CSV đã được loại bỏ khỏi thanh công cụ sản phẩm; chỉ còn công tắc Thẻ ảnh/Danh sách và tùy chỉnh cột khi đang ở chế độ danh sách.
- Đã xác minh Card mobile 375×812. Typecheck và 98 Vitest tests đều đạt.

## Danh sách sản phẩm cô đọng

Ngày xác minh: 13/08/2026

- Chế độ Danh sách không còn hiển thị ảnh sản phẩm. Mỗi hàng chỉ giữ tên, loại, các badge/cột do người dùng chọn và menu thao tác.
- Hàng được giảm padding và thay thông tin cố định bằng các cột đã chọn, giúp hiển thị nhiều loại Card, Box, Pack hơn trong cùng một màn hình.
- Typecheck và 98 Vitest tests đều đạt.

## Biểu tượng tùy chọn cột

Ngày xác minh: 13/08/2026

- Khi chọn chế độ Danh sách, điều khiển cột sau nút Danh sách nay là biểu tượng ba chấm dọc; có nhãn truy cập và tooltip “Tùy chọn cột”.
- Menu vẫn mở các checkbox chọn cột như trước. Typecheck và 98 Vitest tests đều đạt.

## Tổng quan trạng thái Chyusen

Ngày xác minh: 13/08/2026

- Dashboard chỉ còn bốn ô theo thứ tự **Chờ kết quả → Sắp hết hạn → Đã trúng → Đã trượt**; ô Đang đăng ký đã được bỏ.
- Một Chyusen có trạng thái Đã đăng ký được đếm vào Chờ kết quả ngay lập tức, kể cả khi đang ở mốc Sắp hết hạn; các trạng thái đã trúng/trượt được loại khỏi hai nhóm chưa có kết quả.
- Đã thêm hồi quy cho quy tắc đếm. Typecheck và 99 Vitest tests đều đạt.

## Nhắc hạn Chyusen một ngày

Ngày xác minh: 13/08/2026

- Ô **Sắp hết hạn** chỉ đếm Chyusen chưa đăng ký có thời hạn còn 24 giờ hoặc ít hơn, bao gồm mốc 3 giờ; các chương trình còn 24–72 giờ không xuất hiện trong ô này.
- Chyusen đã đăng ký vẫn được ưu tiên trong Chờ kết quả, không bị đếm trùng vào Sắp hết hạn. Typecheck và 99 Vitest tests đều đạt.

## Đếm hạn Chyusen theo ngày Nhật Bản

Ngày xác minh: 13/08/2026

- Phép đếm Sắp hết hạn giờ dùng ngày lịch JST. Ví dụ, ngày hiện tại 13 và hạn đăng ký ngày 14 cho kết quả còn **1 ngày**, nên chương trình được hiển thị trong ô ngay từ ngày 13.
- Hạn cách hai ngày lịch không xuất hiện; dữ liệu đã đăng ký vẫn được chuyển sang Chờ kết quả. Typecheck và 99 Vitest tests đều đạt.
