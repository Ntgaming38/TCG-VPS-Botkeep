export type ProductCatalogCandidate = {
  status: string | null;
  quantity: number | null;
};

/** Sản phẩm hết hàng chỉ được ẩn ở danh sách Card/Box/Pack chính, không bị xóa dữ liệu. */
export function shouldDisplayProductInCatalog(product: ProductCatalogCandidate) {
  return product.status !== "sold" && Number(product.quantity || 0) > 0;
}
