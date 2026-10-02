# Điều tra lỗi JSON Shop SNKR

Thời điểm kiểm tra: 2026-09-02.

Trang `/shop-snkr` trên preview ban đầu hiển thị spinner và số lượng 0, sau khi chờ đã tải thành công 13 sản phẩm, 11 Box, 2 Card, 0 Pack và biểu đồ xu hướng 7 ngày. Các endpoint `/api/trpc/snkrShop.list`, `/api/trpc/snkrShop.trendHistory7d` và `/api/trpc/auth.me` trên preview trả về JSON với `content-type: application/json`; khi chưa có cookie, hai endpoint bảo vệ trả 401 JSON `Please login`, không trả HTML. Router server đang mount tại `/api/trpc` và client dùng `httpBatchLink({ url: "/api/trpc" })`.

Kết luận tạm thời: lỗi `Unexpected token '<'` không tái hiện trên server hiện tại; có khả năng xảy ra trong lúc máy chủ/proxy đang khởi động hoặc khi phiên preview cũ tải nhầm fallback HTML. Cần bổ sung xử lý phản hồi không phải JSON ở client để hiển thị lỗi rõ ràng và tự thử lại thay vì ném lỗi parse thô.
