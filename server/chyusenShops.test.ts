import { describe, expect, it } from "vitest";
import { ADD_CUSTOM_CHYUSEN_SHOP_VALUE, customChyusenShopOptionValue, DEFAULT_CHYUSEN_SHOPS, parseCustomChyusenShopOptionValue } from "../shared/chyusenShops";

describe("cửa hàng Chyusen mặc định và tùy chỉnh", () => {
  it("không đưa Lawson hoặc Seven Eleven vào gợi ý mặc định", () => {
    expect(DEFAULT_CHYUSEN_SHOPS).not.toContain("Lawson");
    expect(DEFAULT_CHYUSEN_SHOPS).not.toContain("Seven Eleven");
    expect(DEFAULT_CHYUSEN_SHOPS).toContain("Bandai Premium");
  });

  it("mã hóa và đọc lại tên cửa hàng tùy chỉnh trong lựa chọn", () => {
    const option = customChyusenShopOptionValue("Cửa hàng TCG Tokyo");
    expect(parseCustomChyusenShopOptionValue(option)).toBe("Cửa hàng TCG Tokyo");
    expect(ADD_CUSTOM_CHYUSEN_SHOP_VALUE).toBe("Thêm cửa hàng");
  });
});
