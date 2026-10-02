# Tóm tắt PRD Chyusen

Nguồn yêu cầu: tệp người dùng đính kèm `pasted_content_7.txt` (phần 7, 1.652 dòng).

## Mục tiêu chính

Xây một module quản lý chương trình 抽選/Chūsen cho TCG, hỗ trợ luồng **dán link → đọc thông tin → người dùng kiểm tra → lưu → theo dõi → nhắc hạn/kết quả → nếu trúng thì chuyển sang Mua Hàng**. Ứng dụng tuyệt đối không tự đăng ký Chyusen, đăng nhập website, vượt CAPTCHA hoặc tự đoán dữ liệu thiếu.

## Dữ liệu và an toàn

- Từng entry phải tách theo `userId`, bắt buộc giữ `source_url`, múi giờ mặc định Nhật Bản `Asia/Tokyo`.
- Thông tin lấy từ link gồm: tên, series, loại, shop, ảnh, giá, giới hạn, ngày đăng ký/hết hạn, ngày công bố, ngày nhận, điều kiện và mức tin cậy.
- Dữ liệu không chắc chắn phải trống hoặc ghi “Cần kiểm tra”; không tự suy luận năm, giờ, giá, ngày công bố hay kết quả.
- Mọi lần đọc lại link chỉ tạo preview/chênh lệch; chỉ cập nhật entry sau xác nhận rõ ràng của người dùng. Lưu lịch sử thay đổi.
- Website công khai nhưng bị chặn/redirect/CAPTCHA/đăng nhập phải báo lỗi minh bạch và để người dùng nhập thủ công.

## Trạng thái

- Thời gian: đang đăng ký, sắp hết hạn, đã hết hạn, chờ công bố, đã có kết quả.
- Trạng thái người dùng: chưa đăng ký, đã đăng ký, đã hủy, đã trúng, đã trượt, không tham gia.
- Countdown dùng Asia/Tokyo, tự cập nhật tại client.

## Giao diện

- Sidebar: bổ sung mục `抽選` giữa Marketplace và Báo Cáo.
- Desktop ưu tiên bảng, mobile ưu tiên Card.
- Có tìm kiếm, bộ lọc trạng thái, trang chi tiết, mở URL gốc, sửa/xóa có xác nhận, timeline/lịch sử.
- Dashboard có tóm tắt Chyusen và widget sắp hết hạn.
- Thông báo in-app: 72 giờ, 24 giờ và 3 giờ trước hạn; nhắc ngày công bố kết quả.

## Đọc link và theo dõi

- Chỉ đọc link công khai có cho phép truy cập, ưu tiên các publisher/shop chính thức.
- Tìm từ khóa Nhật như `抽選`, `抽選販売`, `応募期間`, `締切`, `当選発表`, `受取期間`.
- Nhận năm/tháng/ngày/giờ rõ ràng; nếu thiếu năm/giờ/múi giờ thì không điền tự động.
- Lựa chọn người dùng: theo dõi tự động link công khai mỗi 6 giờ. Quét định kỳ không gọi AI; AI chỉ chạy khi người dùng bấm `Đọc thông tin`.
- Khi nguồn thay đổi, tạo thông báo nhưng không ghi đè dữ liệu người dùng chưa xác nhận.

## Luồng trúng Chyusen

Khi người dùng đánh dấu `Đã trúng`, hiển thị `+ Thêm vào Mua Hàng`. Form Mua Hàng phải được điền sẵn tên, loại, series, shop, giá, số lượng, URL và ghi chú nguồn Chyusen; người dùng kiểm tra rồi lưu. Sau đó luồng mua hiện có cập nhật Kho.

## Phạm vi chưa cam kết ở đợt đầu

PWA/Web Push, lịch calendar chuyên dụng và trang Cài Đặt ngưỡng cảnh báo cần được xây sau khi lõi CRUD, preview link, nhắc hạn in-app và theo dõi tự động chạy ổn định.
