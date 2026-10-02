export type ChyusenManualValidationInput = {
  title: string;
  productName: string;
  applicationEnd: string;
  resultDate: string;
  shop?: string;
  customShopName?: string;
};

export type ChyusenManualValidationErrors = Partial<Record<keyof ChyusenManualValidationInput, string>>;

export function validateChyusenManualDraft(input: ChyusenManualValidationInput): ChyusenManualValidationErrors {
  const errors: ChyusenManualValidationErrors = {};
  if (!input.title.trim()) errors.title = "Vui lòng nhập tên chương trình Chyusen.";
  if (!input.productName.trim()) errors.productName = "Vui lòng nhập tên sản phẩm.";
  if (!input.applicationEnd) errors.applicationEnd = "Vui lòng nhập ngày hết hạn đăng ký.";
  if (!input.resultDate) errors.resultDate = "Vui lòng nhập ngày công bố kết quả.";
  if (!input.shop?.trim()) errors.shop = "Vui lòng chọn hoặc nhập tên cửa hàng.";
  if (input.shop === ADD_CUSTOM_CHYUSEN_SHOP_VALUE && !input.customShopName?.trim()) errors.customShopName = "Vui lòng nhập tên cửa hàng mới.";
  return errors;
}
import { ADD_CUSTOM_CHYUSEN_SHOP_VALUE } from "./chyusenShops";
