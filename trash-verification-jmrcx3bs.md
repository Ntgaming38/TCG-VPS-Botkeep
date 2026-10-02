# Xác minh giao diện Thùng rác

Tại viewport 375×812, trang **Thùng rác** hiển thị tiêu đề, bộ lọc loại dữ liệu, mô tả khôi phục và số mục đã xóa. Khi chưa có bản ghi xóa trước thời điểm triển khai, giao diện báo `0 mục`, sau đó hiển thị trạng thái trống rõ ràng với biểu tượng xác nhận và hướng dẫn rằng mục đã xóa sẽ xuất hiện ở đây.

Mục điều hướng **Thùng rác** được đặt ngay dưới **Cài đặt** trong thanh bên. Kiểm tra kiểu đầy đủ bằng lệnh dự án đã thành công; trạng thái chẩn đoán của máy chủ phát triển cần làm mới sau khi bổ sung router tRPC mới.

Sau khi khởi động lại máy chủ, kiểm tra desktop xác nhận mục **Thùng rác** nằm ngay dưới **Cài đặt** trên thanh bên và trang hiển thị đúng trạng thái trống khi chưa có dữ liệu bị xóa mới.
