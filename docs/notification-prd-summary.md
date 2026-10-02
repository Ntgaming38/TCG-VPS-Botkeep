# TCG Manager — PRD Phần 8: Notification Center & Chyusen tự động

Nguồn yêu cầu: tệp người dùng đính kèm `/home/ubuntu/upload/pasted_content_8.txt` (PRD Phần 8, mục 137–192).

## Ràng buộc chức năng cần giữ

- Có Notification Center ở Header: badge chưa đọc, xem tất cả, lọc theo tất cả/chưa đọc/chức năng, sắp xếp mới/cũ, đánh dấu đọc/toàn bộ đã đọc và xóa notification mà không xóa dữ liệu gốc.
- Notification Chyusen gồm mới phát hiện, thay đổi nguồn, nhắc hạn, hết hạn, ngày công bố, trúng/trượt. Không được tự tuyên bố trúng nếu người dùng chưa xác nhận.
- Nguồn theo dõi có nhãn, URL, bật/tắt, lần kiểm tra, lần kiểm tra tiếp theo, trạng thái, lỗi, số phát hiện và tần suất 1/3/6/12/24 giờ.
- Lựa chọn của người dùng: tần suất riêng theo nguồn. Scheduler được chạy mỗi giờ nhưng chỉ kiểm tra nguồn đã đến hạn, áp dụng giới hạn request và retry có delay; không chạy trong trình duyệt.
- Chống trùng theo URL/product ID (nếu có)/tên/shop/ngày bắt đầu-kết thúc. Thay đổi chỉ tạo preview/notification, không tự ghi đè khi chưa xác nhận. Lịch sử thay đổi phải được lưu.
- Nhắc hạn mặc định/cấu hình: 7d, 3d, 24h, 12h, 3h, 1h; không nhắc đăng ký khi trạng thái đã đăng ký.
- Không tự đăng ký, đăng nhập, vượt CAPTCHA hay crawl quá mức. Chỉ đọc nguồn công khai được hỗ trợ; app-only dùng share link hoặc screenshot/OCR/AI rồi người dùng xác nhận.
- Bảo mật: mọi Chyusen, nguồn, notification và cài đặt phải giới hạn theo `userId`.

## Phạm vi hiện chưa đưa vào bản này

- Web Push/PWA/device token: cần hạ tầng service worker và luồng cấp quyền trình duyệt riêng; chỉ triển khai sau khi Notification Center in-app ổn định.
- Tự động tạo entry mới trực tiếp từ listing công khai: hiện ưu tiên thông báo + preview xác nhận để tránh suy đoán và tránh tạo Chyusen trùng.
