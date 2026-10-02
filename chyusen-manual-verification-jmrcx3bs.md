# Xác minh lưu Chyusen thủ công

Trang `/chyusen` được xác minh trực quan sau khi máy chủ khởi động lại và hiển thị ổn định với nút **Thêm 抽選** cùng khu vực quản lý hiện hữu. Hộp thoại nhập liệu được bảo vệ bằng kiểm thử đơn vị cho logic chuyển sang nhập thủ công khi đọc link thất bại, và kiểm thử router cho cả lưu không URL lẫn URL nguồn hợp lệ.

Kiểm tra kiểu và 81 kiểm thử Vitest đã hoàn tất thành công.

Xác minh tại viewport 375×812 với hộp thoại Thêm 抽選 đã mở trực tiếp đến phần ngày cho thấy năm và giờ không còn xuất hiện. Năm trường Bắt đầu đăng ký, Hết hạn đăng ký, Công bố kết quả, Nhận hàng bắt đầu và Nhận hàng kết thúc đều dùng placeholder `dd/mm`; chú thích xác nhận năm hiện tại theo giờ Nhật Bản được tự gán khi bấm Lưu.
