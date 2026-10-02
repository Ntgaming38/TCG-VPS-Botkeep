# Xác minh ảnh sản phẩm Shop SNKR

- URL `https://snkrdunk.com/apparels/864495?slide=right` trả về ảnh Open Graph chung `https://cdn.snkrdunk.com/images/ogp/og-image.png`; đây là ảnh bìa marketplace, không phải ảnh sản phẩm.
- Endpoint công khai `https://snkrdunk.com/en/v1/products/SW---864495` trả `product.thumbnailUrl` trỏ đến ảnh box thật: `https://cdn.snkrdunk.com/upload_bg_removed/067ebb9d-ffc2-49c7-9abc-3eb7eb863388.webp?size=s`.
- Ảnh thumbnail đã được kiểm tra trực quan: hiển thị box One Piece màu vàng, không phải banner SNKRDUNK.
- Dữ liệu theo dõi hiện có đã được làm mới sang URL ảnh box thật; adapter hiện bỏ qua banner OGP và ưu tiên thumbnail của endpoint chi tiết.

## Ghi chú bảng giá số lượng

- Endpoint công khai `https://snkrdunk.com/en/v1/products/SW---864495/sizes?currency=JPY` trả danh sách lựa chọn số lượng như `1 box`, `2 boxes` và số lượt đăng bán, nhưng định giá trả về bằng USD bất kể tham số JPY.
- Bảng giá trong ứng dụng chỉ được hiển thị khi adapter xác nhận được giá JPY công khai; ứng dụng không quy đổi USD sang JPY và không tạo dữ liệu giá giả.

## Xác minh giao diện chi tiết

- Trang chi tiết hiển thị đúng nhãn loại, Rank Card, giá một đơn vị và biểu đồ lịch sử nhỏ gọn.
- Với Card thử nghiệm đang chỉ có dữ liệu lựa chọn không phải JPY công khai, khu vực bảng giá hiển thị thông báo rõ ràng thay vì ước tính hay quy đổi giá; các mức giá JPY 1–10 đơn vị sẽ xuất hiện khi nguồn công khai cung cấp.
- Truy vấn lựa chọn số lượng được tách khỏi lần tải chi tiết đầu tiên để ảnh, thông tin sản phẩm và biểu đồ lịch sử không bị chờ phản hồi nguồn công khai chậm.
- Giao diện điện thoại xác nhận ảnh, bảng giá số lượng, nút đồng bộ và biểu đồ nhỏ xếp dọc không tràn chiều ngang; trạng thái đang đọc lựa chọn giá công khai được hiển thị riêng trong khung giá.
