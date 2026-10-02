import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("cửa hàng tùy chỉnh trong Chyusen", () => {
  it("nhập trực tiếp, gợi ý lại tên đã lưu và hiển thị tên hiệu lực", () => {
    const source = readFileSync(join(process.cwd(), "client/src/pages/Chyusen.tsx"), "utf8");

    expect(source).toContain("ADD_CUSTOM_CHYUSEN_SHOP_VALUE");
    expect(source).toContain("shopSuggestionDetails");
    expect(source).toContain('SelectItem value={ADD_CUSTOM_CHYUSEN_SHOP_VALUE}>Thêm cửa hàng mới</SelectItem>');
    expect(source).toContain("shopOptions.map");
    expect(source).toContain("Tên sẽ tự lưu và xuất hiện trong danh sách cửa hàng sau khi lưu Chūsen.");
    expect(source).toContain("displayChyusenShop(entry)");
    expect(source).toContain("Đã nhận diện từ URL");
    expect(source).toContain("onPaste={(event) =>");
    expect(source).toContain("const detectedShop = detectChyusenShopFromUrl(value)");
    expect(source).toContain('placeholder="Tháng/Ngày"');
    expect(source).toContain("Nhập ngày theo dạng <strong>Tháng/Ngày</strong>");
    expect(source).not.toContain("Cửa hàng bạn đã lưu");
    expect(source).not.toContain("Ghim cửa hàng yêu thích");
    expect(source).not.toContain("Cửa hàng dùng gần đây");
    expect(source).toContain("Thêm cửa hàng mới");
    expect(source).not.toContain("saveShopSuggestion.mutate");
    expect(source).not.toContain("setShopSuggestionPinned.mutate");
    expect(source).not.toContain("reorderPinnedShopSuggestions.mutate");
    expect(source).not.toContain("<Pin className");
    expect(source).not.toContain("GripVertical");
  });
});
