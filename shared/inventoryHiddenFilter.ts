export const INVENTORY_HIDDEN_STATUS = "sold";

export function isInventoryHiddenFilter(status: string) {
  return status === INVENTORY_HIDDEN_STATUS;
}

export function getInventoryEmptyState(status: string) {
  if (isInventoryHiddenFilter(status)) {
    return {
      title: "Chưa có sản phẩm đã bán",
      description: "Sản phẩm đã bán hết sẽ xuất hiện ở đây. Khi nhập mua lại, sản phẩm sẽ tự hiện lại trong Card, Box, Pack hoặc Pack Rác.",
    };
  }
  return {
    title: "Kho trống",
    description: "Thêm sản phẩm hoặc tạo giao dịch mua để cập nhật kho",
  };
}
