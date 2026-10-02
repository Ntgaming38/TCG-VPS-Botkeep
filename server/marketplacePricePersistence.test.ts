import { describe, expect, it, vi } from "vitest";
import { persistMarketplacePriceIfValid } from "./marketplacePricePersistence";

describe("Marketplace price persistence", () => {
  it("không gọi ghi DB và giữ nguyên giá cũ khi SNKRDUNK không có giá hợp lệ", async () => {
    const writePrice = vi.fn();

    await expect(persistMarketplacePriceIfValid("4300", undefined, writePrice)).resolves.toEqual({ updated: false, marketPrice: "4300" });
    expect(writePrice).not.toHaveBeenCalled();
  });

  it("chỉ ghi DB khi nguồn trả giá JPY dương hợp lệ", async () => {
    const writePrice = vi.fn().mockResolvedValue(undefined);

    await expect(persistMarketplacePriceIfValid("4300", 5200, writePrice)).resolves.toEqual({ updated: true, marketPrice: "5200" });
    expect(writePrice).toHaveBeenCalledWith("5200");
  });
});
