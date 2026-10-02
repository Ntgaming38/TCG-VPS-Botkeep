# Xác minh phân trang Lịch Sử

Ngày 2026-08-13, trang `/lich-su` đã được kiểm tra trực quan sau khi triển khai phân trang cursor. Lần tải đầu hiển thị **25 hoạt động**, thay cho việc tải toàn bộ lịch sử, và các hoạt động được hiển thị theo bố cục hiện có với bộ lọc cùng nhãn màu thao tác.

Chỉ mục kết hợp `userId`, `createdAt`, `id` đã được áp dụng để hỗ trợ truy vấn trang lịch sử theo người dùng và thời gian. Kiểm tra kiểu cùng 77 kiểm thử Vitest đã hoàn tất thành công.

Lần xác minh sau khi bổ sung tổng số cho thấy trang vẫn tải đúng 25 hoạt động đầu tiên và hiển thị tiến độ ở phần đầu trang. Cần duy trì kiểm tra tổng số theo đúng tài khoản đang đăng nhập trong lần xác minh cuối trước khi bàn giao.

Nhãn tiến độ hiện chỉ thêm phần tổng số khi tổng này lớn hơn số hoạt động đã tải. Cách hiển thị này tránh kết luận sai rằng người dùng đã tải hết lịch sử nếu dữ liệu cache cũ chưa có tổng số đầy đủ.
